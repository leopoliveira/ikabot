# -*- coding: utf-8 -*-
"""Servidor Backend Web Local para o Ikabot com API REST em Português do Brasil."""

import collections
import datetime
import json
import logging
import os
import re
import sys
import threading
import time
from typing import Any, Dict, List, Optional

from flask import Flask, jsonify, render_template, request, send_from_directory

from decimal import Decimal

from ikabot import config
from ikabot.helpers.getJson import getCity
from ikabot.helpers.pedirInfo import getIdsOfCities
from ikabot.helpers.logging import getLogger
from ikabot.helpers.process import updateProcessList
from ikabot.helpers.sessionStorage import get_saved_users, get_users_dir
from ikabot.function.getStatus import parseCityProduction
from ikabot.ui.translations_pt import (
    translate_action,
    translate_building,
    translate_resource,
    get_resource_icon,
    LUXURY_TYPE_NAMES,
    ISLAND_RESOURCE_NAMES,
    BUILDING_TRANSLATIONS,
)

logger = getLogger(__name__)

# Buffer circular em memória para armazenar os últimos 200 logs da aplicação
log_buffer = collections.deque(maxlen=200)


class WebLogHandler(logging.Handler):
    """Handler de log para capturar mensagens e exibi-las no terminal da web."""

    def emit(self, record):
        try:
            timestamp = datetime.datetime.fromtimestamp(record.created).strftime("%H:%M:%S")
            msg = self.format(record)
            log_buffer.append({
                "timestamp": timestamp,
                "level": record.levelname,
                "message": msg,
            })
        except Exception:
            pass


# Configura handler de captura
web_log_handler = WebLogHandler()
web_log_handler.setFormatter(logging.Formatter("%(message)s"))
logging.getLogger("ikabot").addHandler(web_log_handler)

# Instância global da aplicação Flask
template_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "templates"))
static_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "static"))
app = Flask("ikabot_web", template_folder=template_dir, static_folder=static_dir)
app.config["TEMPLATES_AUTO_RELOAD"] = True
app.jinja_env.auto_reload = True
app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 0


@app.before_request
def clear_template_cache():
    """Garante que qualquer alteração nos templates HTML seja servida imediatamente."""
    if hasattr(app, "jinja_env") and app.jinja_env.cache is not None:
        app.jinja_env.cache.clear()


@app.after_request
def set_no_cache_headers(response):
    """Evita cache estático agressivo no navegador durante o desenvolvimento."""
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response

# Desativa logs barulhentos do Werkzeug
logging.getLogger("werkzeug").setLevel(logging.ERROR)

# Estado global da sessão
active_session = None
session_lock = threading.Lock()
cities_cache: Dict[str, Any] = {}
last_cities_fetch = 0


def log_web(message: str, level: str = "INFO"):
    """Registra uma mensagem no buffer visual da web."""
    timestamp = datetime.datetime.now().strftime("%H:%M:%S")
    log_buffer.append({
        "timestamp": timestamp,
        "level": level,
        "message": message,
    })


# Sessões pendentes aguardando seleção de servidor pelo usuário
pending_auth_sessions: Dict[str, Any] = {}


def get_or_create_session():
    """Retorna a sessão ativa se já estiver logada, sem bloquear o servidor."""
    global active_session
    with session_lock:
        if active_session is not None and getattr(active_session, "logged", False):
            return active_session
        return None


def try_auto_login():
    """Tenta conectar silenciosamente usando a última conta e mundo utilizados, sem bloquear o terminal."""
    global active_session
    with session_lock:
        if active_session is not None and getattr(active_session, "logged", False):
            return active_session

        from ikabot.helpers.sessionStorage import get_last_account, save_last_account
        from ikabot.helpers.taskManager import rehydrate_persistent_tasks
        from ikabot.web.session import Session

        last_acc = get_last_account()
        saved_users = get_saved_users()

        target_email = None
        target_server_index = None
        target_world = None

        if last_acc and last_acc.get("email"):
            target_email = last_acc["email"]
            target_server_index = last_acc.get("server_index")
            target_world = last_acc.get("world")
        elif saved_users:
            target_email = saved_users[0]

        if not target_email:
            log_web("Nenhuma conta salva. Conecte pelo painel web.", "INFO")
            return None

        log_web(f"Verificando sessão salva para: {target_email}...", "INFO")
        try:
            session = Session(mail=target_email, auto_login=False, interactive=False)
            accounts = session.fetch_lobby(target_email)

            chosen_index = None
            if target_server_index is not None and 0 <= target_server_index < len(accounts):
                if not target_world or accounts[target_server_index].get("world") == target_world:
                    chosen_index = target_server_index

            if chosen_index is None and target_world:
                for acc in accounts:
                    if acc.get("world") == target_world:
                        chosen_index = acc["index"]
                        break

            if chosen_index is None and len(accounts) == 1:
                chosen_index = 0

            if chosen_index is not None:
                session.complete_login(chosen_index)
                active_session = session
                save_last_account(session.mail, chosen_index, session.word, session.username)
                log_web(f"Conectado automaticamente como {session.username} ({session.word})!", "SUCCESS")
                rehydrated = rehydrate_persistent_tasks(session, log_web)
                if rehydrated > 0:
                    log_web(f"{rehydrated} tarefa(s) em segundo plano foram reativadas com sucesso!", "SUCCESS")
                return active_session
            elif len(accounts) > 1:
                log_web(f"Conta possui {len(accounts)} mundos disponíveis. Escolha seu mundo na interface web.", "INFO")
        except Exception as e:
            log_web(f"Reconexão automática em segundo plano: {str(e)}", "WARNING")

        return None


def fetch_all_cities_data(session, force: bool = False):
    """Obtém dados detalhados de todas as cidades com cache de 60 segundos."""
    global cities_cache, last_cities_fetch
    now = time.time()
    if not force and cities_cache and (now - last_cities_fetch < 60):
        return cities_cache

    try:
        cities_ids, cities_info = getIdsOfCities(session)
    except Exception as e:
        logger.error(f"Erro ao obter IDs das cidades: {e}")
        return cities_cache or {}

    result = {}
    for city_id in cities_ids:
        try:
            cid_str = str(city_id)
            html = session.get(config.city_url + cid_str)
            city_data = getCity(html)

            # Obter tradegood correto (1=vinho, 2=mármore, 3=cristal, 4=enxofre)
            trade_good_type = None

            # 1. Informação estruturada do relatedCityData (retornado por getIdsOfCities)
            cinfo = (cities_info.get(cid_str) or cities_info.get(city_id)) if cities_info else {}
            if cinfo and "tradegood" in cinfo and cinfo["tradegood"] is not None:
                try:
                    trade_good_type = int(cinfo["tradegood"])
                except (ValueError, TypeError):
                    pass

            # 2. Extraído diretamente do HTML por getCity
            if not trade_good_type or trade_good_type not in (1, 2, 3, 4):
                tg = city_data.get("tradegood")
                if tg is not None:
                    try:
                        trade_good_type = int(tg)
                    except (ValueError, TypeError):
                        pass

            # 3. Via regex no link da mina de luxo no HTML da cidade
            if not trade_good_type or trade_good_type not in (1, 2, 3, 4):
                match = re.search(r'tradegood(?:&amp;|&)type=(\d+)', html)
                if match:
                    try:
                        trade_good_type = int(match.group(1))
                    except (ValueError, TypeError):
                        pass

            # 4. Via producedTradegood no HTML
            if not trade_good_type or trade_good_type not in (1, 2, 3, 4):
                match = re.search(r'producedTradegood:\s*["\']?(\d+)["\']?', html)
                if match:
                    try:
                        trade_good_type = int(match.group(1))
                    except (ValueError, TypeError):
                        pass

            # 5. Se ainda não encontrado, consulta a ilha da cidade
            if not trade_good_type or trade_good_type not in (1, 2, 3, 4):
                island_id = city_data.get("islandId")
                if island_id:
                    try:
                        from ikabot.helpers.getJson import getIsland
                        isla_html = session.get(config.island_url + str(island_id))
                        island_data = getIsland(isla_html)
                        trade_good_type = int(island_data.get("tradegood", 1))
                    except Exception:
                        pass

            if not trade_good_type or trade_good_type not in (1, 2, 3, 4):
                trade_good_type = 1

            city_data["tradegood"] = trade_good_type

            wood_prod, luxury_prod = parseCityProduction(html, int(trade_good_type))
            city_data["woodProduction"] = wood_prod if wood_prod is not None else 0
            city_data["luxuryProduction"] = luxury_prod if luxury_prod is not None else 0
            result[cid_str] = city_data
        except Exception as e:
            logger.error(f"Erro ao obter dados da cidade {city_id}: {e}")

    if result:
        cities_cache = result
        last_cities_fetch = time.time()
    return cities_cache or result


# ==========================================
# ROTAS DA INTERFACE WEB
# ==========================================

@app.route("/")
def index():
    """Renderiza a Single Page Application em Português."""
    return render_template("index.html")


@app.route("/favicon.ico")
def favicon():
    """Retorna o favicon SVG do painel web."""
    img_dir = os.path.join(app.static_folder, "img")
    return send_from_directory(img_dir, "favicon.svg", mimetype="image/svg+xml")


@app.route("/api/status", methods=["GET"])
def api_status():
    """Retorna o status geral de conexão e da conta do jogador (ouro real, navios e balanço horário)."""
    session = get_or_create_session()
    if not session or not getattr(session, "logged", False):
        saved = get_saved_users()
        return jsonify({
            "connected": False,
            "saved_accounts": saved,
            "message": "Nenhuma sessão ativa. Conecte-se para começar.",
        })

    gold = 0
    gold_income = 0
    free_ships = 0
    total_ships = 0

    try:
        data = session.get("view=updateGlobalData&ajax=1", noIndex=True)
        resp_json = json.loads(data, strict=False)
        header_data = resp_json[0][1]["headerData"]
        gold_raw = header_data.get("gold", 0)
        gold = int(Decimal(str(gold_raw)))
        gold_income = int(
            Decimal(str(
                header_data.get("income", 0)
                + header_data.get("godGoldResult", 0)
                + header_data.get("badTaxAccountant", 0)
                + header_data.get("upkeep", 0)
                + header_data.get("scientistsUpkeep", 0)
            ))
        )
        free_ships = int(header_data.get("freeTransporters", 0))
        total_ships = int(header_data.get("maxTransporters", 0))
    except Exception as e:
        logger.warning(f"Erro ao obter dados globais via updateGlobalData: {e}")
        try:
            from ikabot.helpers.naval import getAvailableShips, getTotalShips
            free_ships = getAvailableShips(session)
            total_ships = getTotalShips(session)
        except Exception:
            pass

    return jsonify({
        "connected": True,
        "player_name": getattr(session, "username", "Jogador"),
        "server": getattr(session, "servidor", getattr(session, "host", "Ikariam")),
        "world": getattr(session, "word", getattr(session, "servidor", "Ikariam")),
        "email": getattr(session, "mail", ""),
        "gold": gold,
        "gold_income": gold_income,
        "free_transports": free_ships,
        "total_transports": total_ships,
        "last_update": datetime.datetime.now().strftime("%H:%M:%S"),
    })


@app.route("/api/auth/saved_accounts", methods=["GET"])
def api_auth_saved_accounts():
    """Retorna a lista de contas salvas no disco e o status atual."""
    saved = get_saved_users()
    session = get_or_create_session()
    return jsonify({
        "saved_accounts": saved,
        "connected": session is not None and getattr(session, "logged", False),
    })


@app.route("/api/auth/lobby", methods=["POST"])
def api_auth_lobby():
    """Autentica no Lobby Gameforge via interface web e retorna servidores disponíveis."""
    global active_session
    data = request.get_json() or {}
    email = data.get("email", "").strip()
    password = data.get("password", "").strip()

    if not email:
        return jsonify({"error": "Por favor, informe o e-mail da conta Gameforge."}), 400

    try:
        from ikabot.web.session import Session
        import uuid

        log_web(f"Autenticando no Lobby Gameforge para {email}...", "INFO")
        session = Session(mail=email, password=password, auto_login=False, interactive=False)
        accounts = session.fetch_lobby(email, password)

        if not accounts:
            return jsonify({"error": "Nenhuma conta ou mundo de Ikariam ativo foi encontrado neste e-mail."}), 400

        # Se houver apenas 1 servidor/conta disponível, conecta diretamente!
        if len(accounts) == 1:
            session.complete_login(0)
            with session_lock:
                active_session = session
                cities_cache.clear()
            from ikabot.helpers.sessionStorage import save_last_account
            from ikabot.helpers.taskManager import rehydrate_persistent_tasks
            save_last_account(session.mail, 0, session.word, session.username)
            rehydrate_persistent_tasks(session, log_web)
            log_web(f"Conectado com sucesso como {session.username} no mundo {session.word}!", "SUCCESS")
            return jsonify({
                "status": "connected",
                "message": f"Conectado com sucesso como {session.username} no mundo {session.word}!",
                "player": session.username,
                "world": session.word,
                "server": session.servidor,
            })

        # Se houver mais de 1 conta, armazena para a etapa de seleção pelo usuário
        auth_id = str(uuid.uuid4())
        pending_auth_sessions[auth_id] = session

        formatted_accounts = [
            {
                "index": acc["index"],
                "name": acc["name"],
                "world": acc["world"],
                "server_lang": acc["server_lang"],
                "number": acc["number"],
                "last_login": acc["last_login"],
            }
            for acc in accounts
        ]

        log_web(f"Encontrados {len(accounts)} mundos para {email}. Selecione o mundo na tela.", "INFO")
        return jsonify({
            "status": "needs_selection",
            "auth_id": auth_id,
            "accounts": formatted_accounts,
            "message": "Selecione o servidor/mundo para entrar:",
        })

    except Exception as e:
        logger.error(f"Erro na autenticação do lobby: {e}", exc_info=True)
        log_web(f"Erro ao conectar no lobby: {str(e)}", "ERROR")
        return jsonify({"error": str(e)}), 400


@app.route("/api/auth/select_server", methods=["POST"])
def api_auth_select_server():
    """Completa o login no servidor/mundo escolhido pelo usuário na interface web."""
    global active_session
    data = request.get_json() or {}
    auth_id = data.get("auth_id", "")
    server_index = data.get("server_index")

    if server_index is None:
        return jsonify({"error": "Índice do servidor não informado."}), 400

    try:
        server_index = int(server_index)
    except ValueError:
        return jsonify({"error": "Índice do servidor inválido."}), 400

    session = pending_auth_sessions.get(auth_id)
    if not session:
        return jsonify({"error": "Sessão de autenticação expirada ou não encontrada. Por favor, tente novamente."}), 400

    try:
        log_web(f"Conectando ao mundo selecionado (índice {server_index})...", "INFO")
        session.complete_login(server_index)
        with session_lock:
            active_session = session
            cities_cache.clear()
        pending_auth_sessions.pop(auth_id, None)

        from ikabot.helpers.sessionStorage import save_last_account
        from ikabot.helpers.taskManager import rehydrate_persistent_tasks
        save_last_account(session.mail, server_index, session.word, session.username)
        rehydrate_persistent_tasks(session, log_web)

        log_web(f"Conectado com sucesso como {session.username} no mundo {session.word}!", "SUCCESS")
        return jsonify({
            "status": "connected",
            "message": f"Conectado com sucesso como {session.username} no mundo {session.word}!",
            "player": session.username,
            "world": session.word,
            "server": session.servidor,
        })
    except Exception as e:
        logger.error(f"Erro ao conectar ao mundo selecionado: {e}", exc_info=True)
        log_web(f"Erro ao entrar no mundo: {str(e)}", "ERROR")
        return jsonify({"error": str(e)}), 400


@app.route("/api/auth/logout", methods=["POST"])
def api_auth_logout():
    """Desconecta a sessão ativa atual."""
    global active_session
    with session_lock:
        active_session = None
        cities_cache.clear()
    log_web("Sessão desconectada.", "INFO")
    return jsonify({"success": True, "message": "Desconectado com sucesso."})


@app.route("/api/cities", methods=["GET"])
def api_cities():
    """Retorna todas as cidades com recursos traduzidos e porcentagem de armazenamento."""
    session = get_or_create_session()
    if not session:
        return jsonify({"error": "Não conectado", "cities": []}), 401

    force = request.args.get("force", "0") in ("1", "true", "True")
    cities_dict = fetch_all_cities_data(session, force=force)
    formatted_cities = []

    for cid, city in cities_dict.items():
        # Recursos: 0=Madeira, 1=Vinho, 2=Mármore, 3=Cristal, 4=Enxofre
        avail = city.get("availableResources", [0, 0, 0, 0, 0])
        storage = city.get("storageCapacity", 1000)
        total_stored = sum(avail)
        usage_pct = min(100.0, round((total_stored / max(1, storage * 5)) * 100, 1))

        # Tipo de recurso de luxo da ilha
        trade_good_type = city.get("tradegood", 1)
        luxury_name = LUXURY_TYPE_NAMES.get(trade_good_type, "Desconhecido")
        luxury_icon = get_resource_icon(trade_good_type)

        # Produção horária e edifícios
        wood_prod = city.get("woodProduction", 0)
        luxury_prod = city.get("luxuryProduction", 0)
        has_academy = any(p.get("building") == "academy" for p in city.get("position", []))
        has_tavern = any(p.get("building") == "tavern" for p in city.get("position", []))

        formatted_cities.append({
            "id": str(cid),
            "name": city.get("name", f"Cidade {cid}"),
            "x": city.get("x", 0),
            "y": city.get("y", 0),
            "island_name": city.get("islandName", ""),
            "luxury_type": trade_good_type,
            "luxury_name": luxury_name,
            "luxury_icon": luxury_icon,
            "storage_capacity": storage,
            "usage_pct": usage_pct,
            "free_citizens": city.get("freeCitizens", 0),
            "wine_consumption": city.get("wineConsumptionPerHour", 0),
            "wood_production": wood_prod,
            "luxury_production": luxury_prod,
            "has_academy": has_academy,
            "has_tavern": has_tavern,
            "is_capital": city.get("isCapital", False),
            "resources": {
                "wood": {"amount": int(avail[0]), "name": "Material de Construção", "icon": "🪵"},
                "wine": {"amount": int(avail[1]), "name": "Vinho", "icon": "🍷"},
                "marble": {"amount": int(avail[2]), "name": "Mármore", "icon": "🏛️"},
                "crystal": {"amount": int(avail[3]), "name": "Cristal", "icon": "💎"},
                "sulfur": {"amount": int(avail[4]), "name": "Enxofre", "icon": "🔥"},
            },
        })

    return jsonify({"cities": formatted_cities})


@app.route("/api/city/<city_id>/buildings", methods=["GET"])
def api_city_buildings(city_id):
    """Lista todos os edifícios e níveis atuais da cidade com tradução pt-BR."""
    session = get_or_create_session()
    if not session:
        return jsonify({"error": "Não conectado"}), 401

    cities_dict = fetch_all_cities_data(session)
    city = cities_dict.get(str(city_id))

    if not city:
        try:
            html = session.get(config.city_url + str(city_id))
            city = getCity(html)
        except Exception as e:
            return jsonify({"error": f"Cidade não encontrada: {e}"}), 404

    buildings_list = []
    for pos in city.get("position", []):
        building_id = pos.get("building", "empty")
        building_name_pt = translate_building(building_id)
        level = pos.get("level", 0)

        buildings_list.append({
            "position": pos.get("position", 0),
            "building_id": building_id,
            "name_pt": building_name_pt,
            "level": level if level is not None else 0,
            "is_busy": pos.get("isBusy", False),
            "can_upgrade": pos.get("canUpgrade", True),
            "is_empty": building_id in ["empty", "buildingGround"],
        })

    return jsonify({"city_id": city_id, "buildings": buildings_list})


@app.route("/api/city/<city_id>/queue", methods=["GET"])
def api_city_queue(city_id):
    """Retorna as filas de construção ativas do Ikabot e obras nativas no jogo para a cidade selecionada."""
    session = get_or_create_session()
    if not session:
        return jsonify({"success": False, "error": "Sessão não conectada"}), 401

    city_id_str = str(city_id)
    bot_queue = []
    in_game_construction = None

    # 1. Tarefas em background do Ikabot para esta cidade
    try:
        raw_tasks = updateProcessList(session)
        seen_keys = set()
        for t in raw_tasks:
            if t.get("action") == "constructionList" and str(t.get("city_id", "")) == city_id_str:
                date_str = ""
                if "date" in t and t["date"]:
                    try:
                        date_str = datetime.datetime.fromtimestamp(t["date"]).strftime("%d/%m %H:%M:%S")
                    except Exception:
                        date_str = str(t["date"])

                seen_keys.add(f"{t.get('building_pos')}_{t.get('target_level')}")
                bot_queue.append({
                    "task_id": t.get("task_id"),
                    "pid": t.get("pid"),
                    "building_name": t.get("building_name", "Edifício"),
                    "building_pos": t.get("building_pos"),
                    "current_level": t.get("current_level"),
                    "target_level": t.get("target_level"),
                    "status": t.get("status", "Em execução"),
                    "date": date_str,
                })

        # Inclui também tarefas persistentes do taskManager
        from ikabot.helpers.taskManager import get_tasks_for_account
        persistent_tasks = get_tasks_for_account(session.mail, session.word, status_filter=["running", "pending"])
        for pt in persistent_tasks:
            if pt.get("type") == "constructionList":
                det = pt.get("details", {})
                if str(det.get("city_id", "")) == city_id_str:
                    key = f"{det.get('position')}_{det.get('target_level')}"
                    if key not in seen_keys:
                        seen_keys.add(key)
                        d_str = ""
                        if pt.get("created_at"):
                            try:
                                d_str = datetime.datetime.fromtimestamp(pt["created_at"]).strftime("%d/%m %H:%M:%S")
                            except Exception:
                                d_str = str(pt.get("created_at"))

                        bot_queue.append({
                            "task_id": pt["id"],
                            "pid": pt.get("pid"),
                            "building_name": det.get("building_name", "Edifício"),
                            "building_pos": det.get("position"),
                            "current_level": det.get("current_level"),
                            "target_level": det.get("target_level"),
                            "status": pt.get("current_status") or ("Em execução" if pt.get("status") == "running" else "Pendente"),
                            "date": d_str,
                        })
    except Exception as e:
        logger.warning(f"Erro ao verificar tarefas de construção para cidade {city_id_str}: {e}")

    # 2. Obras nativas em andamento na cidade no jogo
    try:
        html = session.get(config.city_url + city_id_str)
        city = getCity(html)
        for b in city.get("position", []):
            if "completed" in b or b.get("isBusy", False):
                b_name_raw = b.get("building", "")
                b_name_pt = translate_building(b_name_raw)
                current_lvl = int(b.get("level", 0))
                completed_ts = b.get("completed")
                
                end_time_str = ""
                remaining_secs = 0
                if completed_ts:
                    try:
                        completed_int = int(completed_ts)
                        remaining_secs = max(0, completed_int - int(time.time()))
                        end_time_str = datetime.datetime.fromtimestamp(completed_int).strftime("%H:%M:%S")
                    except Exception:
                        end_time_str = str(completed_ts)

                in_game_construction = {
                    "building_name": b_name_pt,
                    "building_raw": b_name_raw,
                    "position": b.get("position"),
                    "current_level": current_lvl,
                    "next_level": current_lvl + 1,
                    "end_time": end_time_str,
                    "remaining_seconds": remaining_secs,
                }
                break
    except Exception as e:
        logger.warning(f"Erro ao verificar construção em andamento no jogo para cidade {city_id_str}: {e}")

    return jsonify({
        "success": True,
        "city_id": city_id_str,
        "bot_queue": bot_queue,
        "in_game_construction": in_game_construction,
    })


@app.route("/api/tasks", methods=["GET"])
def api_tasks():
    """Lista tarefas ativas em segundo plano no Ikabot e tarefas persistentes."""
    session = get_or_create_session()
    tasks = []
    seen_ids = set()

    if session:
        try:
            tasks = updateProcessList(session)
            for t in tasks:
                if t.get("pid"):
                    seen_ids.add(str(t.get("pid")))
        except Exception as e:
            logger.error(f"Erro ao listar processos: {e}")

        try:
            from ikabot.helpers.taskManager import get_tasks_for_account
            persistent = get_tasks_for_account(session.mail, session.word, status_filter=["running", "pending"])
            for pt in persistent:
                pid_str = str(pt.get("pid", ""))
                if pid_str and pid_str in seen_ids:
                    continue
                tasks.append({
                    "pid": pt.get("pid"),
                    "task_id": pt["id"],
                    "action": pt.get("type"),
                    "date": pt.get("created_at"),
                    "status": pt.get("current_status") or pt.get("status"),
                })
        except Exception as e:
            logger.error(f"Erro ao agregar tarefas persistentes: {e}")

    return jsonify({"tasks": tasks})


@app.route("/api/tasks/kill", methods=["POST"])
def api_kill_task():
    """Encerra um processo ou cancela uma tarefa persistente pelo PID ou task_id."""
    session = get_or_create_session()
    data = request.json or {}
    pid = data.get("pid")
    task_id = data.get("task_id")

    from ikabot.helpers.taskManager import cancel_task
    if task_id:
        cancel_task(task_id)
        if session:
            updateProcessList(session)
        log_web(f"Tarefa [{task_id}] cancelada pelo usuário.", "INFO")
        return jsonify({"success": True, "message": f"Tarefa [{task_id}] cancelada com sucesso!"})

    if not pid:
        return jsonify({"success": False, "error": "PID ou task_id não especificado"}), 400

    try:
        import psutil
        proc = psutil.Process(int(pid))
        proc.terminate()
        log_web(f"Processo PID {pid} cancelado pelo usuário.", "INFO")
        if session:
            updateProcessList(session)
        return jsonify({"success": True, "message": f"Tarefa PID {pid} encerrada com sucesso!"})
    except Exception as e:
        # Tenta fallback no Windows
        if config.isWindows:
            os.system(f"taskkill /F /PID {pid} >nul 2>&1")
            log_web(f"Processo PID {pid} encerrado via taskkill.", "INFO")
            return jsonify({"success": True, "message": f"Tarefa PID {pid} encerrada."})
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/action/construction", methods=["POST"])
def api_action_construction():
    """Enfileira a evolução de um edifício com persistência garantida."""
    session = get_or_create_session()
    if not session:
        return jsonify({"success": False, "error": "Sessão não conectada"}), 401

    data = request.json or {}
    city_id = data.get("city_id")
    building_pos = data.get("position")
    target_level = data.get("target_level")

    if not city_id or building_pos is None or not target_level:
        return jsonify({"success": False, "error": "Parâmetros incompletos"}), 400

    try:
        import multiprocessing
        from ikabot.function.constructionList import web_construction_worker
        from ikabot.helpers.taskManager import create_task, update_task

        city_id_str = str(city_id)
        pos_int = int(building_pos)
        target_lvl_int = int(target_level)

        # Obtém o nome legível do edifício para os metadados da tarefa
        html = session.get(config.city_url + city_id_str)
        city = getCity(html)
        target_b = city["position"][pos_int]
        b_name_raw = target_b.get("building", "")
        b_name_pt = translate_building(b_name_raw)
        curr_lvl = int(target_b.get("level", 0))

        # Registra no gerenciador de tarefas persistentes
        task = create_task(
            task_type="constructionList",
            details={
                "city_id": city_id_str,
                "city_name": city.get("cityName", f"Cidade {city_id_str}"),
                "building_name": b_name_pt,
                "position": pos_int,
                "current_level": curr_lvl,
                "target_level": target_lvl_int,
            },
            email=session.mail,
            world=session.word,
            status="running"
        )
        task_id = task["id"]

        # Inicia o worker autônomo headless em segundo plano
        process = multiprocessing.Process(
            target=web_construction_worker,
            args=(session, city_id_str, pos_int, target_lvl_int, task_id),
            name=f"construction_{task_id}",
        )
        process.start()
        update_task(task_id, pid=process.pid)

        updateProcessList(session, programprocesslist=[{
            "pid": process.pid,
            "task_id": task_id,
            "action": "constructionList",
            "city_id": city_id_str,
            "city_name": city.get("cityName", f"Cidade {city_id_str}"),
            "building_name": b_name_pt,
            "building_pos": pos_int,
            "current_level": curr_lvl,
            "target_level": target_lvl_int,
            "date": time.time(),
            "status": f"Fila iniciada: {b_name_pt} nv {curr_lvl}➔{target_lvl_int}",
        }])

        log_web(f"Fila de construção iniciada na cidade {city_id} para {b_name_pt} (PID {process.pid})!", "SUCCESS")
        return jsonify({"success": True, "pid": process.pid, "task_id": task_id, "message": "Construção agendada com sucesso!"})
    except Exception as e:
        logger.error(f"Erro ao agendar construção: {e}", exc_info=True)
        log_web(f"Erro ao agendar construção: {str(e)}", "ERROR")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/city/<city_id>/production", methods=["GET"])
def api_city_production(city_id):
    """Retorna os trabalhadores atuais, capacidades máximas e sobrecarga de Serraria, Jazida e Academia com multi-fontes de verdade."""
    session = get_or_create_session()
    if not session:
        return jsonify({"success": False, "error": "Sessão não conectada"}), 401

    try:
        city_id_str = str(city_id)
        cities_dict = fetch_all_cities_data(session)
        city = cities_dict.get(city_id_str)
        raw_html = None
        if not city:
            raw_html = session.get(config.city_url + city_id_str)
            city = getCity(raw_html)
        island_id = city["islandId"]

        # 0. Garante que a sessão do Ikariam está contextualizada nesta cidade
        try:
            session.post(params={
                'action': 'header', 'function': 'changeCurrentCity',
                'actionRequest': config.actionRequest, 'cityId': city_id_str,
                'oldView': 'city', 'backgroundView': 'city',
                'currentCityId': city_id_str, 'ajax': '1'
            })
        except Exception as e:
            logger.debug(f"Aviso ao trocar cidade ativa para {city_id_str}: {e}")

        # Se raw_html ainda não foi obtido, baixa a página da cidade para verificar produção horária e cidadãos
        if raw_html is None:
            try:
                raw_html = session.get(config.city_url + city_id_str)
                fresh_city = getCity(raw_html)
                if fresh_city.get("freeCitizens") is not None:
                    city["freeCitizens"] = fresh_city["freeCitizens"]
            except Exception as e:
                logger.debug(f"Aviso ao obter html da cidade {city_id_str}: {e}")

        # Identifica tipo do recurso de luxo
        trade_good_type = city.get("tradegood")
        if not trade_good_type or trade_good_type not in (1, 2, 3, 4):
            if raw_html:
                match = re.search(r'tradegood(?:&amp;|&)type=(\d+)', raw_html)
                trade_good_type = int(match.group(1)) if match else 1
            else:
                trade_good_type = 1
            city["tradegood"] = trade_good_type

        # Produção horária direta (se o jogo produz madeira/luxo por hora, há trabalhadores alocados)
        wood_prod_hourly = 0
        lux_prod_hourly = 0
        if raw_html:
            m_w = re.search(r'id=["\']js_GlobalMenu_resourceProduction["\'][^>]*>\s*([0-9.,\s+-]+)\s*<', raw_html)
            if m_w:
                cw = re.sub(r'[^\d]', '', m_w.group(1))
                if cw:
                    wood_prod_hourly = int(cw)

            lux_ids = {
                1: "js_GlobalMenu_production_wine",
                2: "js_GlobalMenu_production_marble",
                3: "js_GlobalMenu_production_crystal",
                4: "js_GlobalMenu_production_sulfur",
            }
            target_id = lux_ids.get(int(trade_good_type))
            if target_id:
                m_l = re.search(rf'id=["\']{target_id}["\'][^>]*>\s*([0-9.,\s+-]+)\s*<', raw_html)
                if m_l:
                    cl = re.sub(r'[^\d]', '', m_l.group(1))
                    if cl:
                        lux_prod_hourly = int(cl)

            if wood_prod_hourly == 0 or lux_prod_hourly == 0:
                try:
                    w_prod, l_prod = parseCityProduction(raw_html, int(trade_good_type))
                    if w_prod is not None and wood_prod_hourly == 0:
                        wood_prod_hourly = int(w_prod)
                    if l_prod is not None and lux_prod_hourly == 0:
                        lux_prod_hourly = int(l_prod)
                except Exception:
                    pass

        # Helper para extrair HTML concatenado de qualquer estrutura JSON do Ikariam
        def extract_html_snippets(json_obj, raw_str):
            snippets = []
            if isinstance(json_obj, list):
                for item in json_obj:
                    if isinstance(item, list) and len(item) > 1:
                        if isinstance(item[1], str):
                            snippets.append(item[1])
                        elif isinstance(item[1], dict):
                            for v in item[1].values():
                                if isinstance(v, str):
                                    snippets.append(v)
            return " ".join(snippets) + " " + str(raw_str)

        # 1. Serraria (view=resource)
        wood_workers = 0
        wood_max = 0
        wood_overcharge = 0
        slider_wood = {}
        try:
            url_wood = (
                f"view=resource&type=resource&islandId={island_id}&cityId={city_id_str}"
                f"&backgroundView=island&currentIslandId={island_id}&actionRequest={config.actionRequest}&ajax=1"
            )
            resp_wood = session.post(url_wood)
            wood_json = json.loads(resp_wood, strict=False)

            # Busca slider em qualquer elemento do JSON
            for item in wood_json:
                if isinstance(item, list) and len(item) > 1 and isinstance(item[1], dict):
                    if "js_ResourceSlider" in item[1] and "slider" in item[1]["js_ResourceSlider"]:
                        slider_wood = item[1]["js_ResourceSlider"]["slider"]
                        break

            if slider_wood:
                wood_max = int(slider_wood.get("max_value", 0))
                wood_overcharge = int(slider_wood.get("overcharge", 0))
                for k in ["ini_value", "iniValue", "startvalue", "startValue", "value", "val", "start_value", "workers", "current_value", "rw"]:
                    if k in slider_wood and slider_wood[k] is not None:
                        val = int(slider_wood[k])
                        if val > 0:
                            wood_workers = val
                            break

            # Fallback A: Procura input name="rw" ou textfield_resource no HTML
            html_wood = extract_html_snippets(wood_json, resp_wood)
            m_rw = (
                re.search(r'name=\\?["\']rw\\?["\'][^>]*value=\\?["\']?(\d+)', html_wood)
                or re.search(r'value=\\?["\']?(\d+)\\?["\']?[^>]*name=\\?["\']rw\\?["\']', html_wood)
                or re.search(r'id=\\?["\']textfield_resource\\?["\'][^>]*value=\\?["\']?(\d+)', html_wood)
                or re.search(r'value=\\?["\']?(\d+)\\?["\']?[^>]*id=\\?["\']textfield_resource\\?["\']', html_wood)
                or re.search(r'id=\\?["\']value_resource\\?["\'][^>]*value=\\?["\']?(\d+)', html_wood)
            )
            if m_rw:
                val = int(m_rw.group(1))
                if val > 0 or wood_workers == 0:
                    wood_workers = val

            # Fallback B: Se ainda 0 mas há produção horária positiva, deduz trabalhadores da produção
            if wood_workers == 0 and wood_prod_hourly > 0:
                wood_workers = wood_prod_hourly
        except Exception as e:
            logger.warning(f"Não foi possível obter dados da serraria da cidade {city_id_str}: {e}")

        # 2. Jazida de Luxo (view=tradegood)
        trade_workers = 0
        trade_max = 0
        trade_overcharge = 0
        slider_trade = {}
        luxury_name = ISLAND_RESOURCE_NAMES.get(trade_good_type, "Jazida de Recursos de Luxo")
        luxury_icon = get_resource_icon(trade_good_type)
        try:
            url_trade = (
                f"view=tradegood&type={trade_good_type}&islandId={island_id}&cityId={city_id_str}"
                f"&backgroundView=island&currentIslandId={island_id}&actionRequest={config.actionRequest}&ajax=1"
            )
            resp_trade = session.post(url_trade)
            trade_json = json.loads(resp_trade, strict=False)

            for item in trade_json:
                if isinstance(item, list) and len(item) > 1 and isinstance(item[1], dict):
                    if "js_ResourceSlider" in item[1] and "slider" in item[1]["js_ResourceSlider"]:
                        slider_trade = item[1]["js_ResourceSlider"]["slider"]
                        break

            if slider_trade:
                trade_max = int(slider_trade.get("max_value", 0))
                trade_overcharge = int(slider_trade.get("overcharge", 0))
                for k in ["ini_value", "iniValue", "startvalue", "startValue", "value", "val", "start_value", "workers", "current_value", "tw"]:
                    if k in slider_trade and slider_trade[k] is not None:
                        val = int(slider_trade[k])
                        if val > 0:
                            trade_workers = val
                            break

            # Fallback A: Procura input name="tw" ou textfield_tradegood no HTML
            html_trade = extract_html_snippets(trade_json, resp_trade)
            m_tw = (
                re.search(r'name=\\?["\']tw\\?["\'][^>]*value=\\?["\']?(\d+)', html_trade)
                or re.search(r'value=\\?["\']?(\d+)\\?["\']?[^>]*name=\\?["\']tw\\?["\']', html_trade)
                or re.search(r'id=\\?["\']textfield_tradegood\\?["\'][^>]*value=\\?["\']?(\d+)', html_trade)
                or re.search(r'value=\\?["\']?(\d+)\\?["\']?[^>]*id=\\?["\']textfield_tradegood\\?["\']', html_trade)
                or re.search(r'id=\\?["\']value_tradegood\\?["\'][^>]*value=\\?["\']?(\d+)', html_trade)
            )
            if m_tw:
                val = int(m_tw.group(1))
                if val > 0 or trade_workers == 0:
                    trade_workers = val

            # Fallback B: Se ainda 0 mas há produção de luxo positiva
            if trade_workers == 0 and lux_prod_hourly > 0:
                trade_workers = lux_prod_hourly
        except Exception as e:
            logger.warning(f"Não foi possível obter dados da mina de luxo da cidade {city_id_str}: {e}")

        # 3. Cientistas na Academia (view=academy)
        academy_slot = next(
            (slot for slot in city.get("position", []) if slot.get("building") == "academy"),
            None
        )
        scientists = 0
        scientists_max = 0
        slider_acad = {}
        has_academy = academy_slot is not None
        if has_academy:
            try:
                pos = academy_slot["position"]
                url_acad = (
                    f"view=academy&cityId={city_id_str}&position={pos}"
                    f"&backgroundView=city&currentCityId={city_id_str}&actionRequest={config.actionRequest}&ajax=1"
                )
                resp_acad = session.post(url_acad)
                acad_json = json.loads(resp_acad, strict=False)

                for item in acad_json:
                    if isinstance(item, list) and len(item) > 1 and isinstance(item[1], dict):
                        if "js_AcademySlider" in item[1] and "slider" in item[1]["js_AcademySlider"]:
                            slider_acad = item[1]["js_AcademySlider"]["slider"]
                            break

                if slider_acad:
                    scientists_max = int(slider_acad.get("max_value", 0))
                    for k in ["ini_value", "iniValue", "startvalue", "startValue", "value", "val", "start_value", "workers", "current_value", "scientists", "s"]:
                        if k in slider_acad and slider_acad[k] is not None:
                            val = int(slider_acad[k])
                            if val > 0:
                                scientists = val
                                break

                # Fallback A: Procura input name="s" ou textfield_scientists no HTML
                html_acad = extract_html_snippets(acad_json, resp_acad)
                m_s = (
                    re.search(r'name=\\?["\']s\\?["\'][^>]*value=\\?["\']?(\d+)', html_acad)
                    or re.search(r'value=\\?["\']?(\d+)\\?["\']?[^>]*name=\\?["\']s\\?["\']', html_acad)
                    or re.search(r'id=\\?["\']textfield_scientists\\?["\'][^>]*value=\\?["\']?(\d+)', html_acad)
                    or re.search(r'id=\\?["\']input_scientists\\?["\'][^>]*value=\\?["\']?(\d+)', html_acad)
                    or re.search(r'value=\\?["\']?(\d+)\\?["\']?[^>]*id=\\?["\']textfield_scientists\\?["\']', html_acad)
                )
                if m_s:
                    val = int(m_s.group(1))
                    if val > 0 or scientists == 0:
                        scientists = val
            except Exception as e:
                logger.warning(f"Não foi possível obter dados da academia da cidade {city_id_str}: {e}")

        # 4. Fallback Geral via Câmara Municipal (view=townHall) caso algum trabalhador continue zerado
        if wood_workers == 0 or trade_workers == 0 or (has_academy and scientists == 0):
            try:
                th_url = (
                    f"view=townHall&cityId={city_id_str}&position=0"
                    f"&backgroundView=city&currentCityId={city_id_str}&actionRequest={config.actionRequest}&ajax=1"
                )
                th_resp = session.post(th_url)
                th_json = json.loads(th_resp, strict=False)
                html_th = extract_html_snippets(th_json, th_resp)

                # Trabalhadores de madeira na câmara
                if wood_workers == 0:
                    th_wood = (
                        re.search(r'id=\\?["\']js_TownHallResourceWorkers\\?["\'][^>]*>([0-9.,\s]+)<', html_th)
                        or re.search(r'class=\\?["\'][^"\']*woodWorkers[^"\']*\\?["\'][^>]*>([0-9.,\s]+)<', html_th)
                        or re.search(r'class=\\?["\'][^"\']*wood[^"\']*\\?["\'][^>]*>([0-9.,\s]+)<', html_th)
                    )
                    if th_wood:
                        cw = re.sub(r'[^\d]', '', th_wood.group(1))
                        if cw:
                            wood_workers = int(cw)

                # Trabalhadores de luxo na câmara
                if trade_workers == 0:
                    th_trade = (
                        re.search(r'id=\\?["\']js_TownHallTradegoodWorkers\\?["\'][^>]*>([0-9.,\s]+)<', html_th)
                        or re.search(r'class=\\?["\'][^"\']*tradegoodWorkers[^"\']*\\?["\'][^>]*>([0-9.,\s]+)<', html_th)
                    )
                    if th_trade:
                        ct = re.sub(r'[^\d]', '', th_trade.group(1))
                        if ct:
                            trade_workers = int(ct)

                # Cientistas na câmara
                if has_academy and scientists == 0:
                    th_sci = (
                        re.search(r'id=\\?["\']js_TownHallScientists\\?["\'][^>]*>([0-9.,\s]+)<', html_th)
                        or re.search(r'class=\\?["\'][^"\']*scientists[^"\']*\\?["\'][^>]*>([0-9.,\s]+)<', html_th)
                    )
                    if th_sci:
                        cs = re.sub(r'[^\d]', '', th_sci.group(1))
                        if cs:
                            scientists = int(cs)
            except Exception as e:
                logger.debug(f"Aviso ao consultar câmara municipal: {e}")

        logger.info(
            f"[DEBUG WORKERS] Cidade {city.get('name')}: "
            f"Madeira={wood_workers}/{wood_max} (ini={slider_wood.get('ini_value')}), "
            f"Luxo={trade_workers}/{trade_max} (ini={slider_trade.get('ini_value')}), "
            f"Cientistas={scientists}/{scientists_max} (ini={slider_acad.get('ini_value')}), "
            f"Livres={city.get('freeCitizens', 0)}, "
            f"ProdHoraria(M={wood_prod_hourly}, L={lux_prod_hourly})"
        )

        return jsonify({
            "success": True,
            "city_id": city_id_str,
            "city_name": city.get("name"),
            "free_citizens": city.get("freeCitizens", 0),
            "wood": {
                "name": "Serraria (Material de Construção)",
                "icon": "🪵",
                "workers": wood_workers,
                "max": wood_max,
                "overcharge": wood_overcharge,
                "total_max": wood_max + wood_overcharge,
            },
            "luxury": {
                "type": trade_good_type,
                "name": luxury_name,
                "icon": luxury_icon,
                "workers": trade_workers,
                "max": trade_max,
                "overcharge": trade_overcharge,
                "total_max": trade_max + trade_overcharge,
            },
            "scientists": {
                "has_academy": has_academy,
                "workers": scientists,
                "max": scientists_max,
            }
        })
    except Exception as e:
        logger.error(f"Erro ao obter produção da cidade {city_id}: {e}", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/action/workers", methods=["POST"])
def api_action_workers():
    """Ajusta trabalhadores na Serraria, Mina ou Academia de uma cidade com o fluxo nativo do Ikariam."""
    session = get_or_create_session()
    if not session:
        return jsonify({"success": False, "error": "Sessão não conectada"}), 401

    data = request.json or {}
    city_id = data.get("city_id")
    wood_workers = data.get("wood_workers")
    luxury_workers = data.get("luxury_workers")
    scientists = data.get("scientists")

    if not city_id:
        return jsonify({"success": False, "error": "Cidade não informada"}), 400

    try:
        city_id_str = str(city_id)
        cities_dict = fetch_all_cities_data(session)
        city = cities_dict.get(city_id_str)
        if not city:
            html = session.get(config.city_url + city_id_str)
            city = getCity(html)
        island_id = str(city.get("islandId"))

        # 0. Sincroniza o contexto da sessão para esta cidade
        session.post(params={
            'action': 'header', 'function': 'changeCurrentCity',
            'actionRequest': config.actionRequest, 'cityId': city_id_str,
            'oldView': 'city', 'backgroundView': 'city',
            'currentCityId': city_id_str, 'ajax': '1'
        })

        # 1. Ajuste Serraria (visita view=resource e depois envia workerPlan)
        if wood_workers is not None:
            url_wood_view = (
                f"view=resource&type=resource&islandId={island_id}&cityId={city_id_str}"
                f"&backgroundView=island&currentIslandId={island_id}&actionRequest={config.actionRequest}&ajax=1"
            )
            session.post(url_wood_view)
            session.post(params={
                "islandId": island_id,
                "cityId": city_id_str,
                "type": "resource",
                "screen": "resource",
                "action": "IslandScreen",
                "function": "workerPlan",
                "rw": int(wood_workers),
                "templateView": "resource",
                "actionRequest": config.actionRequest,
                "ajax": "1"
            })
            time.sleep(0.2)

        # 2. Ajuste Mina de Luxo (visita view=tradegood e depois envia workerPlan)
        if luxury_workers is not None:
            trade_good_type = city.get("tradegood")
            if not trade_good_type or trade_good_type not in (1, 2, 3, 4):
                try:
                    from ikabot.helpers.getJson import getIsland
                    isla_html = session.get(config.island_url + str(island_id))
                    island_data = getIsland(isla_html)
                    trade_good_type = int(island_data.get("tradegood", 1))
                except Exception:
                    trade_good_type = 1

            url_trade_view = (
                f"view=tradegood&type=tradegood&islandId={island_id}&cityId={city_id_str}"
                f"&backgroundView=island&currentIslandId={island_id}&actionRequest={config.actionRequest}&ajax=1"
            )
            session.post(url_trade_view)
            session.post(params={
                "islandId": island_id,
                "cityId": city_id_str,
                "type": "tradegood",
                "screen": "tradegood",
                "action": "IslandScreen",
                "function": "workerPlan",
                "tw": int(luxury_workers),
                "templateView": "tradegood",
                "actionRequest": config.actionRequest,
                "ajax": "1"
            })
            time.sleep(0.2)

        # 3. Ajuste Cientistas na Academia (visita view=academy e depois envia workerPlan)
        if scientists is not None:
            academy_slot = next(
                (slot for slot in city.get("position", []) if slot.get("building") == "academy"),
                None
            )
            if academy_slot:
                pos = academy_slot["position"]
                url_acad_view = (
                    f"view=academy&cityId={city_id_str}&position={pos}"
                    f"&backgroundView=city&currentCityId={city_id_str}&actionRequest={config.actionRequest}&ajax=1"
                )
                session.post(url_acad_view)
                session.post(params={
                    "action": "IslandScreen",
                    "function": "workerPlan",
                    "screen": "academy",
                    "position": pos,
                    "cityId": city_id_str,
                    "s": int(scientists),
                    "backgroundView": "city",
                    "currentCityId": city_id_str,
                    "templateView": "academy",
                    "actionRequest": config.actionRequest,
                    "ajax": "1"
                })

        # Invalida cache local para que a próxima listagem venha atualizada do servidor
        global last_cities_fetch
        last_cities_fetch = 0

        log_web(f"Trabalhadores e cientistas de {city.get('name', city_id_str)} atualizados com sucesso!", "SUCCESS")
        return jsonify({"success": True, "message": "Trabalhadores atualizados com sucesso!"})
    except Exception as e:
        logger.error(f"Erro ao ajustar trabalhadores: {e}", exc_info=True)
        log_web(f"Erro ao ajustar trabalhadores: {str(e)}", "ERROR")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/research/status", methods=["GET"])
def api_research_status():
    """Retorna pesquisas disponíveis na Academia e progresso."""
    session = get_or_create_session()
    if not session:
        return jsonify({"success": False, "error": "Sessão não conectada"}), 401

    try:
        from ikabot.function.research import get_studies
        studies = get_studies(session)
        keys = list(studies.keys())
        num_studies = len([k for k in keys if "js_researchAdvisorChangeResearchTypeTxt" in k])
        available = []

        branch_icons = {
            "seafaring": "⛵",
            "economy": "🪙",
            "knowledge": "🔬",
            "military": "⚔️",
            "mythology": "⚡",
        }

        for num_study in range(num_studies):
            if f"js_researchAdvisorProgressTxt{num_study}" in studies or f"js_researchAdvisorNextResearchName{num_study}" in studies:
                name = studies.get(f"js_researchAdvisorNextResearchName{num_study}", f"Pesquisa {num_study + 1}")

                # Tratar progresso (pode ser dict {'text': 'Disponibilidade'} ou string)
                progress_raw = studies.get(f"js_researchAdvisorProgressTxt{num_study}", "")
                if isinstance(progress_raw, dict):
                    progress = progress_raw.get("text", "")
                else:
                    progress = str(progress_raw)

                # Tratar custo (pode ser dict {'text': '24'} ou string)
                cost_raw = studies.get(f"js_researchAdvisorNextResearchCost{num_study}", "")
                if isinstance(cost_raw, dict):
                    cost = cost_raw.get("text", "")
                else:
                    cost = str(cost_raw)

                # Descrição detalhada do efeito
                desc = studies.get(f"js_researchAdvisorNextResearchTooltipShortDesc{num_study}", "")

                # Ramo da pesquisa (Navegação Marítima, Economia, Ciência, Militar, Mitologia)
                branch = studies.get(f"js_researchAdvisorChangeResearchTypeTxt{num_study}", "")

                # Verificar se está atualmente selecionada em estudo
                type_info = studies.get(f"js_researchAdvisorChangeResearchType{num_study}", {})
                type_class = studies.get(f"js_researchAdvisorTypeActiveClass{num_study}", {})
                active_str = ""
                if isinstance(type_info, dict):
                    active_str += type_info.get("class", "")
                if isinstance(type_class, dict):
                    active_str += " " + type_class.get("class", "")
                is_active = "active" in active_str

                # Ícone do ramo
                ajax_req = type_info.get("ajaxrequest", "") if isinstance(type_info, dict) else ""
                branch_key = ajax_req.split("=")[-1] if "=" in ajax_req else ""
                icon = branch_icons.get(branch_key, "🔬")

                available.append({
                    "index": num_study,
                    "name": name,
                    "branch": branch,
                    "icon": icon,
                    "cost": cost,
                    "description": desc,
                    "progress": progress,
                    "is_active": is_active,
                })

        # Resumo global de pontos e cientistas do império
        raw_scientists = studies.get("js_researchAdvisorScientists", "0")
        raw_points = studies.get("js_researchAdvisorPoints", "0")
        raw_time = studies.get("js_researchAdvisorTime", "")

        scientists_count = 0
        try:
            cleaned_sci = re.sub(r'[^\d]', '', str(raw_scientists))
            if cleaned_sci:
                scientists_count = int(cleaned_sci)
        except Exception:
            pass

        points_count = 0
        try:
            cleaned_pts = re.sub(r'[^\d]', '', str(raw_points))
            if cleaned_pts:
                points_count = int(cleaned_pts)
        except Exception:
            pass

        # No Ikariam, cada cientista empregado gera 1 ponto de pesquisa por hora base
        prod_count = scientists_count
        for k in studies:
            if any(term in k.lower() for term in ["pointsperhour", "researchproduction", "points_per_hour"]):
                try:
                    c = re.sub(r'[^\d]', '', str(studies[k]))
                    if c:
                        prod_count = int(c)
                        break
                except Exception:
                    pass

        time_remaining = str(raw_time).strip() if raw_time and str(raw_time).strip() != "-" else ""
        curr_focus = str(studies.get("js_researchAdvisorCurrResearchType", ""))

        # Obter pesquisas agendadas persistentes
        scheduled_researches = []
        try:
            from ikabot.helpers.taskManager import get_tasks_for_account
            all_persistent = get_tasks_for_account(session.mail, session.word, status_filter=["running", "pending"])
            for pt in all_persistent:
                if pt.get("type") == "researchQueue":
                    det = pt.get("details", {})
                    d_str = ""
                    if pt.get("created_at"):
                        try:
                            d_str = datetime.datetime.fromtimestamp(pt["created_at"]).strftime("%d/%m %H:%M:%S")
                        except Exception:
                            d_str = str(pt.get("created_at"))

                    scheduled_researches.append({
                        "task_id": pt["id"],
                        "pid": pt.get("pid"),
                        "study_index": det.get("study_index"),
                        "name": det.get("research_name", "Pesquisa"),
                        "required_points": det.get("required_points", 0),
                        "status": pt.get("current_status") or "Aguardando pontos...",
                        "date": d_str,
                    })
        except Exception as e:
            logger.warning(f"Erro ao buscar pesquisas agendadas: {e}")

        return jsonify({
            "success": True,
            "researches": available,
            "scheduled_researches": scheduled_researches,
            "summary": {
                "scientists": scientists_count,
                "points": points_count,
                "production_per_hour": prod_count,
                "time_remaining": time_remaining,
                "current_focus": curr_focus,
            }
        })
    except Exception as e:
        logger.error(f"Erro ao obter pesquisas: {e}", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/action/research", methods=["POST"])
def api_action_research():
    """Inicia o estudo imediato de uma pesquisa após validação de pontos."""
    session = get_or_create_session()
    if not session:
        return jsonify({"success": False, "error": "Sessão não conectada"}), 401

    data = request.json or {}
    study_index = data.get("study_index")
    if study_index is None:
        return jsonify({"success": False, "error": "Índice da pesquisa não informado"}), 400

    try:
        from ikabot.function.research import get_studies, study
        studies = get_studies(session)
        num_study = int(study_index)

        # Validação de pontos disponíveis vs custo da pesquisa
        points_raw = studies.get("js_researchAdvisorPoints", 0)
        try:
            current_points = int(str(points_raw).replace(".", "").replace(",", "").strip())
        except Exception:
            current_points = 0

        cost_raw = studies.get(f"js_researchAdvisorNextResearchCost{num_study}", 0)
        if isinstance(cost_raw, dict):
            cost_str = cost_raw.get("text", "0")
        else:
            cost_str = str(cost_raw)
        try:
            cost = int(re.sub(r'[^0-9]', '', cost_str) or "0")
        except Exception:
            cost = 0

        research_name = studies.get(f"js_researchAdvisorNextResearchName{num_study}", f"Pesquisa {num_study + 1}")

        if cost > 0 and current_points < cost:
            diff = cost - current_points
            return jsonify({
                "success": False,
                "can_schedule": True,
                "required_points": cost,
                "current_points": current_points,
                "points_diff": diff,
                "research_name": research_name,
                "study_index": num_study,
                "error": f"Pontos insuficientes: você possui {current_points} de {cost} pontos (faltam {diff} pts). Deseja agendar a pesquisa?",
            }), 400

        study(session, studies, num_study)
        log_web(f"Pesquisa '{research_name}' iniciada com sucesso na Academia!", "SUCCESS")
        return jsonify({"success": True, "message": f"Pesquisa '{research_name}' iniciada com sucesso!"})
    except Exception as e:
        logger.error(f"Erro ao iniciar pesquisa: {e}", exc_info=True)
        log_web(f"Erro ao iniciar pesquisa: {str(e)}", "ERROR")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/action/research/schedule", methods=["POST"])
def api_action_research_schedule():
    """Agenda uma pesquisa para ser executada assim que houver pontos suficientes."""
    session = get_or_create_session()
    if not session:
        return jsonify({"success": False, "error": "Sessão não conectada"}), 401

    data = request.json or {}
    study_index = data.get("study_index")
    research_name = data.get("research_name", "Pesquisa")
    required_points = data.get("required_points", 0)

    if study_index is None:
        return jsonify({"success": False, "error": "Índice da pesquisa não informado"}), 400

    try:
        import multiprocessing
        from ikabot.function.research import web_research_worker
        from ikabot.helpers.taskManager import create_task, update_task

        num_study = int(study_index)
        cost = int(required_points)

        task = create_task(
            task_type="researchQueue",
            details={
                "study_index": num_study,
                "research_name": research_name,
                "required_points": cost,
            },
            email=session.mail,
            world=session.word,
            status="running"
        )
        task_id = task["id"]

        process = multiprocessing.Process(
            target=web_research_worker,
            args=(session, num_study, research_name, cost, task_id),
            name=f"research_{task_id}",
        )
        process.start()
        update_task(task_id, pid=process.pid)

        updateProcessList(session, programprocesslist=[{
            "pid": process.pid,
            "task_id": task_id,
            "action": "researchQueue",
            "research_name": research_name,
            "target_cost": cost,
            "date": time.time(),
            "status": f"Pesquisa agendada: {research_name} ({cost} pts)",
        }])

        log_web(f"Pesquisa '{research_name}' agendada com sucesso (PID {process.pid})!", "SUCCESS")
        return jsonify({
            "success": True,
            "task_id": task_id,
            "pid": process.pid,
            "message": f"Pesquisa '{research_name}' agendada com sucesso! O bot realizará o estudo assim que os pontos forem acumulados."
        })
    except Exception as e:
        logger.error(f"Erro ao agendar pesquisa: {e}", exc_info=True)
        log_web(f"Erro ao agendar pesquisa: {str(e)}", "ERROR")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/island/donation/<city_id>", methods=["GET"])
def api_island_donation(city_id):
    """Retorna dados de doação para Serraria e Jazida de Recursos da ilha da cidade."""
    session = get_or_create_session()
    if not session:
        return jsonify({"success": False, "error": "Sessão não conectada"}), 401

    try:
        html = session.get(config.city_url + str(city_id))
        city = getCity(html)
        island_id = city["islandId"]
        wood_available = city["availableResources"][0]

        # Serraria
        url_res = f"view=resource&type=resource&islandId={island_id}&backgroundView=island&currentIslandId={island_id}&actionRequest={config.actionRequest}&ajax=1"
        resp_res = session.post(url_res)
        json_res = json.loads(resp_res, strict=False)
        bg_data = json_res[0][1]["backgroundData"]
        wood_lvl = bg_data.get("resourceLevel", 1)
        wood_upgrading = int(bg_data.get("resourceEndUpgradeTime", 0)) > 0

        html_res = json_res[1][1][1]
        res_matches = re.findall(r'<li class="wood">(.*?)</li>', html_res)
        wood_needed = 0
        wood_donated = 0
        if len(res_matches) >= 2:
            wood_needed = int(re.sub(r'[^0-9]', '', res_matches[0]))
            wood_donated = int(re.sub(r'[^0-9]', '', res_matches[1]))

        # Jazida de Luxo
        cities_dict = fetch_all_cities_data(session)
        cached_city = cities_dict.get(str(city_id))
        island_type = (cached_city.get("tradegood") if cached_city else None) or city.get("tradegood")
        if not island_type or island_type not in (1, 2, 3, 4):
            match = re.search(r'tradegood(?:&amp;|&)type=(\d+)', html)
            island_type = int(match.group(1)) if match else 1

        url_trade = f"view=tradegood&type={island_type}&islandId={island_id}&backgroundView=island&currentIslandId={island_id}&actionRequest={config.actionRequest}&ajax=1"
        resp_trade = session.post(url_trade)
        json_trade = json.loads(resp_trade, strict=False)
        trade_lvl = bg_data.get("tradegoodLevel", 1)
        trade_upgrading = int(bg_data.get("tradegoodEndUpgradeTime", 0)) > 0

        html_trade = json_trade[1][1][1]
        trade_matches = re.findall(r'<li class="wood">(.*?)</li>', html_trade)
        trade_needed = 0
        trade_donated = 0
        if len(trade_matches) >= 2:
            trade_needed = int(re.sub(r'[^0-9]', '', trade_matches[0]))
            trade_donated = int(re.sub(r'[^0-9]', '', trade_matches[1]))

        luxury_name = ISLAND_RESOURCE_NAMES.get(island_type, "Jazida de Recursos de Luxo")

        return jsonify({
            "success": True,
            "city_name": city["name"],
            "wood_available": wood_available,
            "sawmill": {
                "level": wood_lvl,
                "upgrading": wood_upgrading,
                "donated": wood_donated,
                "needed": wood_needed,
                "pct": round((wood_donated / max(1, wood_needed)) * 100, 1) if wood_needed else 0,
            },
            "luxury": {
                "type": island_type,
                "name": luxury_name,
                "icon": get_resource_icon(island_type),
                "level": trade_lvl,
                "upgrading": trade_upgrading,
                "donated": trade_donated,
                "needed": trade_needed,
                "pct": round((trade_donated / max(1, trade_needed)) * 100, 1) if trade_needed else 0,
            }
        })
    except Exception as e:
        logger.error(f"Erro ao obter doações da ilha: {e}", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/action/donate", methods=["POST"])
def api_action_donate():
    """Realiza uma doação em Madeira para a Serraria ou Jazida de Luxo."""
    session = get_or_create_session()
    if not session:
        return jsonify({"success": False, "error": "Sessão não conectada"}), 401

    data = request.json or {}
    city_id = data.get("city_id")
    target = data.get("target")  # "resource" ou "tradegood"
    amount = int(data.get("amount", 0))

    if not city_id or not target or amount <= 0:
        return jsonify({"success": False, "error": "Parâmetros inválidos para doação"}), 400

    try:
        html = session.get(config.city_url + str(city_id))
        city = getCity(html)
        island_id = city["islandId"]

        session.post(params={
            "islandId": island_id,
            "type": target,
            "action": "IslandScreen",
            "function": "donate",
            "donation": amount,
            "backgroundView": "island",
            "templateView": "resource" if target == "resource" else "tradegood",
            "actionRequest": config.actionRequest,
            "ajax": "1",
        })

        target_name = "Serraria" if target == "resource" else "Jazida de Recursos"
        log_web(f"Doação de {amount} Madeira para {target_name} efetuada na ilha de {city['name']}!", "SUCCESS")
        return jsonify({"success": True, "message": f"Doação de {amount} Madeira enviada com sucesso!"})
    except Exception as e:
        log_web(f"Erro ao efetuar doação: {str(e)}", "ERROR")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/action/pirate", methods=["POST"])
def api_action_pirate():
    """Inicia o bot de Auto-Pirataria em segundo plano."""
    session = get_or_create_session()
    if not session:
        return jsonify({"success": False, "error": "Sessão não conectada"}), 401

    data = request.json or {}
    mission_choice = int(data.get("mission", 1))

    try:
        import multiprocessing
        from ikabot.function.autoPirate import autoPirate

        event = multiprocessing.Event()
        config.predetermined_input = [mission_choice, 1]  # missão e auto-conversão
        proc = multiprocessing.Process(
            target=autoPirate,
            args=(session, event, sys.stdin.fileno(), config.predetermined_input),
            name="autoPirate",
        )
        proc.start()

        updateProcessList(session, programprocesslist=[{
            "pid": proc.pid,
            "action": "autoPirate",
            "date": time.time(),
            "status": f"Auto-Pirataria ativa (Missão {mission_choice})",
        }])

        log_web(f"Bot de Auto-Pirataria iniciado (PID {proc.pid})!", "SUCCESS")
        return jsonify({"success": True, "pid": proc.pid, "message": "Bot de Pirataria iniciado com sucesso!"})
    except Exception as e:
        log_web(f"Erro ao iniciar auto-pirataria: {str(e)}", "ERROR")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/action/alerts", methods=["POST"])
def api_action_alerts():
    """Ativa alertas em segundo plano para ataques iminentes ou escassez de vinho."""
    session = get_or_create_session()
    if not session:
        return jsonify({"success": False, "error": "Sessão não conectada"}), 401

    data = request.json or {}
    alert_type = data.get("type", "attacks")

    try:
        import multiprocessing
        from ikabot.function.alertAttacks import alertAttacks
        from ikabot.function.alertLowWine import alertLowWine

        event = multiprocessing.Event()
        target_func = alertAttacks if alert_type == "attacks" else alertLowWine
        action_name = "alertAttacks" if alert_type == "attacks" else "alertLowWine"
        label_status = "Monitorando ataques em tempo real" if alert_type == "attacks" else "Monitorando estoque de vinho"

        proc = multiprocessing.Process(
            target=target_func,
            args=(session, event, sys.stdin.fileno(), []),
            name=action_name,
        )
        proc.start()

        updateProcessList(session, programprocesslist=[{
            "pid": proc.pid,
            "action": action_name,
            "date": time.time(),
            "status": label_status,
        }])

        log_web(f"Alerta ({action_name}) ativado com sucesso (PID {proc.pid})!", "SUCCESS")
        return jsonify({"success": True, "pid": proc.pid, "message": f"Alerta ({action_name}) ativado!"})
    except Exception as e:
        log_web(f"Erro ao ativar alerta: {str(e)}", "ERROR")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/action/send_resources", methods=["POST"])
def api_action_send_resources():
    """Envia recursos entre colônias."""
    session = get_or_create_session()
    if not session:
        return jsonify({"success": False, "error": "Sessão não conectada"}), 401

    data = request.json or {}
    origin_id = data.get("origin_id")
    dest_id = data.get("dest_id")
    wood = int(data.get("wood", 0))
    wine = int(data.get("wine", 0))
    marble = int(data.get("marble", 0))
    crystal = int(data.get("crystal", 0))
    sulfur = int(data.get("sulfur", 0))

    if not origin_id or not dest_id:
        return jsonify({"success": False, "error": "Cidades de origem e destino obrigatórias"}), 400

    try:
        send_url = (
            f"action=transportOperations&function=loadTransportersWithResource"
            f"&destinationCityId={dest_id}&islandId={origin_id}&oldView=&deliveryDescription="
            f"&cargo_resource={wood}&cargo_tradegood1={wine}&cargo_tradegood2={marble}"
            f"&cargo_tradegood3={crystal}&cargo_tradegood4={sulfur}"
            f"&actionRequest={config.actionRequest}&ajax=1"
        )
        resp = session.post(send_url)
        log_web(f"Transporte de recursos despachado da cidade {origin_id} para {dest_id}!", "SUCCESS")
        return jsonify({"success": True, "message": "Barcos despachados com sucesso!"})
    except Exception as e:
        log_web(f"Erro ao enviar recursos: {str(e)}", "ERROR")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/action/barbarians", methods=["POST"])
def api_action_barbarians():
    """Dispara ação contra bárbaros."""
    session = get_or_create_session()
    if not session:
        return jsonify({"success": False, "error": "Sessão não conectada"}), 401

    data = request.json or {}
    city_id = data.get("city_id")

    try:
        import multiprocessing
        from ikabot.function.attackBarbarians import attackBarbarians

        event = multiprocessing.Event()
        config.predetermined_input = [int(city_id)] if city_id else []
        proc = multiprocessing.Process(
            target=attackBarbarians,
            args=(session, event, sys.stdin.fileno(), config.predetermined_input),
            name="attackBarbarians",
        )
        proc.start()

        updateProcessList(session, programprocesslist=[{
            "pid": proc.pid,
            "action": "attackBarbarians",
            "date": time.time(),
            "status": "Atacando aldeia bárbara",
        }])

        log_web(f"Ataque aos bárbaros iniciado (PID {proc.pid})!", "SUCCESS")
        return jsonify({"success": True, "message": "Ataque aos bárbaros iniciado!"})
    except Exception as e:
        log_web(f"Erro ao atacar bárbaros: {str(e)}", "ERROR")
        return jsonify({"success": False, "error": str(e)}), 500


# =========================================================================
# NOVOS MÓDULOS EXPANDIDOS (PARIDADE TOTAL COM CLI)
# =========================================================================

# 1. MÓDULO MILITAR & FROTAS
@app.route("/api/military/army", methods=["GET"])
def api_military_army():
    """Retorna unidades e frotas de todas as cidades (viewArmy)."""
    session = get_or_create_session()
    if not session:
        return jsonify({"success": False, "error": "Sessão não conectada"}), 401

    try:
        from ikabot.function.viewArmy import getCityMilitaryData, parseUnits
        ids, cities = getIdsOfCities(session)
        result_cities = []
        total_ground = {}
        total_ships = {}

        for cid in ids:
            c_name = cities[cid]["name"]
            c_coords = cities[cid].get("coords", "")
            try:
                html = getCityMilitaryData(session, cid)
                ground, ships = parseUnits(html)
                result_cities.append({
                    "id": cid,
                    "name": c_name,
                    "coords": c_coords,
                    "ground": ground,
                    "ships": ships,
                })
                for u_name, count in ground.items():
                    total_ground[u_name] = total_ground.get(u_name, 0) + count
                for s_name, count in ships.items():
                    total_ships[s_name] = total_ships.get(s_name, 0) + count
            except Exception as ex:
                logger.warning(f"Erro ao buscar guarnições de {c_name}: {ex}")
                result_cities.append({
                    "id": cid,
                    "name": c_name,
                    "coords": c_coords,
                    "ground": {},
                    "ships": {},
                })

        return jsonify({
            "success": True,
            "cities": result_cities,
            "totals": {
                "ground": total_ground,
                "ships": total_ships,
            }
        })
    except Exception as e:
        logger.error(f"Erro ao listar forças militares: {e}", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/military/movements", methods=["GET"])
def api_military_movements():
    """Retorna frotas e exércitos em trânsito com tempo de chegada (shipMovements)."""
    session = get_or_create_session()
    if not session:
        return jsonify({"success": False, "error": "Sessão não conectada"}), 401

    try:
        from ikabot.helpers.varios import getCurrentCityId, daysHoursMinutes
        cid = None
        try:
            cid = getCurrentCityId(session)
        except Exception:
            cities_dict = fetch_all_cities_data(session)
            if cities_dict:
                cid = list(cities_dict.keys())[0]

        if not cid:
            return jsonify({"success": True, "movements": []})

        url = (
            f"view=militaryAdvisor&oldView=city&oldBackgroundView=city&backgroundView=city"
            f"&currentCityId={cid}&actionRequest={config.actionRequest}&ajax=1"
        )
        resp = session.post(url)
        resp_json = json.loads(resp, strict=False)

        movements = []
        time_now = int(time.time())

        if isinstance(resp_json, list):
            for item in resp_json:
                if isinstance(item, list) and len(item) > 1 and isinstance(item[1], dict) and "time" in item[1]:
                    try:
                        time_now = int(item[1]["time"])
                        break
                    except Exception:
                        pass

            for item in resp_json:
                if not isinstance(item, list) or len(item) < 2:
                    continue
                target = item[1]
                if isinstance(target, list) and len(target) > 2 and isinstance(target[2], dict):
                    vsp = target[2].get("viewScriptParams", {})
                    if "militaryAndFleetMovements" in vsp:
                        movements = vsp["militaryAndFleetMovements"]
                        break
                elif isinstance(target, dict):
                    vsp = target.get("viewScriptParams", {})
                    if "militaryAndFleetMovements" in vsp:
                        movements = vsp["militaryAndFleetMovements"]
                        break

        parsed = []
        for mov in (movements or []):
            try:
                event_time = int(mov.get("eventTime", time_now))
                time_left = max(0, event_time - time_now)
                orig_data = mov.get("origin", {}) or {}
                targ_data = mov.get("target", {}) or {}
                orig_name = orig_data.get("name", "Desconhecido")
                orig_player = orig_data.get("avatarName", "")
                targ_name = targ_data.get("name", "Desconhecido")
                targ_player = targ_data.get("avatarName", "")

                origin_str = f"{orig_name}" + (f" ({orig_player})" if orig_player else "")
                target_str = f"{targ_name}" + (f" ({targ_player})" if targ_player else "")

                ev = mov.get("event", {}) or {}
                returning = bool(ev.get("isFleetReturning", False))
                mission = ev.get("missionText") or ("Retornando" if returning else "Em missão")

                parsed.append({
                    "id": mov.get("id"),
                    "origin": origin_str,
                    "target": target_str,
                    "mission": mission,
                    "returning": returning,
                    "time_left": time_left,
                    "time_left_str": daysHoursMinutes(time_left),
                    "is_hostile": bool(mov.get("isHostile")),
                    "is_own": bool(mov.get("isOwnArmyOrFleet")),
                    "is_alliance": bool(mov.get("isSameAlliance")),
                    "units": mov.get("units", {}),
                    "ships": mov.get("ships", 0),
                })
            except Exception as ex_m:
                logger.warning(f"Erro ao processar item de movimento: {ex_m}")

        return jsonify({"success": True, "movements": parsed})
    except Exception as e:
        logger.error(f"Erro ao buscar movimentos militares: {e}", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/military/units_available/<city_id>", methods=["GET"])
def api_military_units_available(city_id):
    """Retorna disponibilidade de quartel e estaleiro na cidade."""
    session = get_or_create_session()
    if not session:
        return jsonify({"success": False, "error": "Sessão não conectada"}), 401

    try:
        html = session.get(config.city_url + str(city_id))
        city = getCity(html)
        barracks = next((p for p in city.get("position", []) if p.get("building") == "barracks"), None)
        shipyard = next((p for p in city.get("position", []) if p.get("building") == "shipyard"), None)

        return jsonify({
            "success": True,
            "city_name": city.get("name"),
            "free_citizens": city.get("freeCitizens", 0),
            "has_barracks": barracks is not None,
            "barracks_pos": barracks.get("position") if barracks else None,
            "barracks_level": barracks.get("level") if barracks else 0,
            "has_shipyard": shipyard is not None,
            "shipyard_pos": shipyard.get("position") if shipyard else None,
            "shipyard_level": shipyard.get("level") if shipyard else 0,
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/action/military/train", methods=["POST"])
def api_action_military_train():
    """Recruta unidades de infantaria ou navios de guerra (trainArmy)."""
    session = get_or_create_session()
    if not session:
        return jsonify({"success": False, "error": "Sessão não conectada"}), 401

    data = request.json or {}
    city_id = data.get("city_id")
    train_type = data.get("train_type", "barracks")
    trainings = data.get("trainings", {})

    if not city_id or not trainings:
        return jsonify({"success": False, "error": "Parâmetros de recrutamento incompletos"}), 400

    try:
        html = session.get(config.city_url + str(city_id))
        city = getCity(html)
        pos = next((p["position"] for p in city.get("position", []) if p.get("building") == train_type), None)
        if pos is None:
            return jsonify({"success": False, "error": f"A cidade não possui {train_type} construído"}), 400

        is_troops = (train_type == "barracks")
        function = "buildUnits" if is_troops else "buildShips"
        payload = {
            "action": "CityScreen",
            "function": function,
            "actionRequest": config.actionRequest,
            "cityId": city_id,
            "position": pos,
            "backgroundView": "city",
            "currentCityId": city_id,
            "templateView": train_type,
            "ajax": "1",
        }
        for u_id, amt in trainings.items():
            if int(amt) > 0:
                payload[str(u_id)] = int(amt)

        session.post(params=payload)
        log_web(f"Ordem de recrutamento ({train_type}) despachada para {city.get('name')}!", "SUCCESS")
        return jsonify({"success": True, "message": "Ordem de recrutamento enviada com sucesso!"})
    except Exception as e:
        logger.error(f"Erro ao recrutar tropas: {e}", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/action/military/station", methods=["POST"])
def api_action_military_station():
    """Desloca guarnições ou frotas entre cidades (stationArmy)."""
    session = get_or_create_session()
    if not session:
        return jsonify({"success": False, "error": "Sessão não conectada"}), 401

    data = request.json or {}
    origin_id = data.get("origin_id")
    destination_id = data.get("destination_id")
    deployment_type = data.get("deployment_type", "army")
    units = data.get("units", {})

    if not origin_id or not destination_id:
        return jsonify({"success": False, "error": "Origem e destino são obrigatórios"}), 400

    try:
        payload = {
            "action": "transportOperations",
            "function": "deployUnits",
            "actionRequest": config.actionRequest,
            "originCityId": origin_id,
            "destinationCityId": destination_id,
            "deploymentType": deployment_type,
            "backgroundView": "city",
            "currentCityId": origin_id,
            "ajax": 1,
        }
        for u_code, amt in units.items():
            if int(amt) > 0:
                prefix = "cargo_army_" if deployment_type == "army" else "cargo_fleet_"
                payload[f"{prefix}{u_code}"] = int(amt)

        session.post(params=payload)
        log_web(f"Deslocamento de forças militares ({deployment_type}) despachado com sucesso!", "SUCCESS")
        return jsonify({"success": True, "message": "Deslocamento despachado com sucesso!"})
    except Exception as e:
        logger.error(f"Erro ao deslocar exército: {e}", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500


# 2. MÓDULO MERCADO & ENTREPOSTO COMERCIAL
@app.route("/api/market/offers/<city_id>", methods=["GET"])
def api_market_offers(city_id):
    """Consulta ofertas no Entreposto Comercial (buyResources)."""
    session = get_or_create_session()
    if not session:
        return jsonify({"success": False, "error": "Sessão não conectada"}), 401

    try:
        from ikabot.function.buyResources import getOffers
        res_idx = request.args.get("resource", "0")
        resource = "resource" if res_idx == "0" else str(res_idx)

        html = session.get(config.city_url + str(city_id))
        city = getCity(html)
        pos = next((p["position"] for p in city.get("position", []) if p.get("building") == "branchOffice"), None)
        if pos is None:
            return jsonify({"success": False, "error": "Esta cidade não possui Entreposto Comercial."}), 400

        city["pos"] = pos
        city["rango"] = 5

        data_post = {
            "cityId": city_id,
            "position": pos,
            "view": "branchOffice",
            "activeTab": "bargain",
            "type": 444,
            "searchResource": resource,
            "range": city["rango"],
            "backgroundView": "city",
            "currentCityId": city_id,
            "templateView": "branchOffice",
            "currentTab": "bargain",
            "actionRequest": config.actionRequest,
            "ajax": 1,
        }
        session.post(params=data_post)
        offers = getOffers(session, city)

        return jsonify({"success": True, "offers": offers})
    except Exception as e:
        logger.error(f"Erro ao buscar ofertas de mercado: {e}", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/action/market/buy", methods=["POST"])
def api_action_market_buy():
    """Executa compra direta no mercado e despacha barcos mercantes."""
    session = get_or_create_session()
    if not session:
        return jsonify({"success": False, "error": "Sessão não conectada"}), 401

    data = request.json or {}
    city_id = data.get("city_id")
    offer = data.get("offer")
    amount = int(data.get("amount", 0))

    if not city_id or not offer or amount <= 0:
        return jsonify({"success": False, "error": "Parâmetros de compra inválidos"}), 400

    try:
        from ikabot.function.buyResources import buy
        from ikabot.helpers.pedirInfo import getShipCapacity
        from ikabot.helpers.naval import getAvailableShips

        html = session.get(config.city_url + str(city_id))
        city = getCity(html)
        pos = next((p["position"] for p in city.get("position", []) if p.get("building") == "branchOffice"), None)
        city["pos"] = pos

        ship_cap, __ = getShipCapacity(session)
        free_ships = getAvailableShips(session)

        buy(session, city, offer, amount, free_ships, ship_cap)
        log_web(f"Compra de {amount} unidades realizada no Entreposto!", "SUCCESS")
        return jsonify({"success": True, "message": "Compra executada com sucesso!"})
    except Exception as e:
        logger.error(f"Erro ao comprar mercadorias: {e}", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/action/market/sell", methods=["POST"])
def api_action_market_sell():
    """Publica oferta de venda de recursos no Entreposto Comercial (sellResources)."""
    session = get_or_create_session()
    if not session:
        return jsonify({"success": False, "error": "Sessão não conectada"}), 401

    data = request.json or {}
    city_id = data.get("city_id")
    resource_type = int(data.get("resource_type", 0))
    amount = int(data.get("amount", 0))
    price = int(data.get("price", 10))

    try:
        html = session.get(config.city_url + str(city_id))
        city = getCity(html)
        pos = next((p["position"] for p in city.get("position", []) if p.get("building") == "branchOffice"), None)
        if pos is None:
            return jsonify({"success": False, "error": "A cidade não possui Entreposto Comercial."}), 400

        payload = {
            "cityId": city_id,
            "position": pos,
            "action": "CityScreen",
            "function": "updateOffers",
            "actionRequest": config.actionRequest,
            "ajax": 1,
        }
        res_key = "resource" if resource_type == 0 else f"tradegood{resource_type}"
        payload[f"{res_key}TradeType"] = "444"
        payload[f"{res_key}"] = str(amount)
        payload[f"{res_key}Price"] = str(price)

        session.post(params=payload)
        log_web(f"Oferta de venda de {amount} unidades publicada no mercado!", "SUCCESS")
        return jsonify({"success": True, "message": "Oferta publicada no Entreposto com sucesso!"})
    except Exception as e:
        logger.error(f"Erro ao publicar venda: {e}", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500


# 3. MÓDULO LOGÍSTICA AVANÇADA
@app.route("/api/action/logistics/distribute", methods=["POST"])
def api_action_logistics_distribute():
    """Dispara distribuição equilibrada de recursos entre cidades (distributeResources)."""
    session = get_or_create_session()
    if not session:
        return jsonify({"success": False, "error": "Sessão não conectada"}), 401

    data = request.json or {}
    resource_type = int(data.get("resource_type", 0))
    evenly = bool(data.get("evenly", True))
    city_ids = data.get("city_ids", [])
    use_freighters = bool(data.get("use_freighters", False))

    try:
        import multiprocessing
        from ikabot.helpers.taskManager import create_task, update_task
        from ikabot.helpers.webWorkers import web_distribute_worker
        from ikabot.helpers.resources import materials_names

        res_name = materials_names[resource_type] if 0 <= resource_type < len(materials_names) else "Recurso"
        task = create_task(
            task_type="distributeResources",
            details={
                "resource_type": resource_type,
                "evenly": evenly,
                "city_ids": city_ids,
                "use_freighters": use_freighters,
            },
            email=session.mail,
            world=session.word,
            status="running"
        )
        task_id = task["id"]

        proc = multiprocessing.Process(
            target=web_distribute_worker,
            args=(session, resource_type, evenly, city_ids, use_freighters, task_id),
            name=f"distribute_{task_id}",
        )
        proc.start()
        update_task(task_id, pid=proc.pid)

        updateProcessList(session, programprocesslist=[{
            "pid": proc.pid,
            "task_id": task_id,
            "action": "distributeResources",
            "date": time.time(),
            "status": f"Distribuindo {res_name}",
        }])

        log_web(f"Distribuição de {res_name} iniciada em segundo plano (PID {proc.pid})!", "SUCCESS")
        return jsonify({"success": True, "task_id": task_id, "message": f"Distribuição de {res_name} agendada!"})
    except Exception as e:
        logger.error(f"Erro ao disparar distribuição: {e}", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/action/logistics/consolidate", methods=["POST"])
def api_action_logistics_consolidate():
    """Consolida recursos de múltiplas cidades em uma única cidade destino (consolidateResources)."""
    session = get_or_create_session()
    if not session:
        return jsonify({"success": False, "error": "Sessão não conectada"}), 401

    data = request.json or {}
    resource_type = int(data.get("resource_type", 0))
    source_city_ids = data.get("source_city_ids", [])
    destination_id = data.get("destination_id")

    if not destination_id or not source_city_ids:
        return jsonify({"success": False, "error": "Cidades de origem e destino obrigatórias"}), 400

    try:
        import multiprocessing
        from ikabot.helpers.taskManager import create_task, update_task
        from ikabot.helpers.webWorkers import web_consolidate_worker
        from ikabot.helpers.resources import materials_names

        res_name = materials_names[resource_type] if 0 <= resource_type < len(materials_names) else "Recurso"
        task = create_task(
            task_type="consolidateResources",
            details={
                "resource_type": resource_type,
                "source_city_ids": source_city_ids,
                "destination_id": destination_id,
            },
            email=session.mail,
            world=session.word,
            status="running"
        )
        task_id = task["id"]

        proc = multiprocessing.Process(
            target=web_consolidate_worker,
            args=(session, resource_type, source_city_ids, destination_id, task_id),
            name=f"consolidate_{task_id}",
        )
        proc.start()
        update_task(task_id, pid=proc.pid)

        updateProcessList(session, programprocesslist=[{
            "pid": proc.pid,
            "task_id": task_id,
            "action": "consolidateResources",
            "date": time.time(),
            "status": f"Consolidando {res_name}",
        }])

        log_web(f"Consolidação de {res_name} iniciada (PID {proc.pid})!", "SUCCESS")
        return jsonify({"success": True, "task_id": task_id, "message": f"Consolidação de {res_name} iniciada!"})
    except Exception as e:
        logger.error(f"Erro ao consolidar recursos: {e}", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500


# 4. MÓDULO TEMPLO & MILAGRES
@app.route("/api/miracles/status", methods=["GET"])
def api_miracles_status():
    """Retorna maravilhas e milagres disponíveis nas ilhas do jogador (activateMiracle)."""
    session = get_or_create_session()
    if not session:
        return jsonify({"success": False, "error": "Sessão não conectada"}), 401

    try:
        from ikabot.function.activateMiracle import obtainMiraclesAvailable
        islands = obtainMiraclesAvailable(session)
        miracles = []
        for isl in islands:
            miracles.append({
                "island_id": isl.get("id"),
                "island_name": isl.get("name"),
                "wonder_id": isl.get("wonder"),
                "wonder_name": isl.get("wonderName"),
                "level": isl.get("wonderActivationLevel", 0),
                "available": bool(isl.get("available")),
                "available_in_seconds": isl.get("available_in", 0),
                "city_id": isl.get("ciudad", {}).get("id"),
                "city_name": isl.get("ciudad", {}).get("name"),
                "pos": isl.get("ciudad", {}).get("pos"),
            })
        return jsonify({"success": True, "miracles": miracles})
    except Exception as e:
        logger.error(f"Erro ao listar milagres: {e}", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/action/miracles/activate", methods=["POST"])
def api_action_miracles_activate():
    """Ativa a bênção da maravilha da ilha."""
    session = get_or_create_session()
    if not session:
        return jsonify({"success": False, "error": "Sessão não conectada"}), 401

    data = request.json or {}
    city_id = data.get("city_id")
    pos = data.get("pos")

    try:
        from ikabot.function.activateMiracle import activateMiracleHttpCall
        fake_island = {
            "ciudad": {
                "id": str(city_id),
                "pos": str(pos),
            }
        }
        activateMiracleHttpCall(session, fake_island)
        log_web("Milagre da ilha ativado com sucesso!", "SUCCESS")
        return jsonify({"success": True, "message": "Bênção da maravilha ativada com sucesso!"})
    except Exception as e:
        logger.error(f"Erro ao ativar milagre: {e}", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/action/shrine/activate", methods=["POST"])
def api_action_shrine_activate():
    """Ativa bênção no Santuário do Olimpo (activateShrine)."""
    session = get_or_create_session()
    if not session:
        return jsonify({"success": False, "error": "Sessão não conectada"}), 401

    data = request.json or {}
    god_id = int(data.get("god_id", 1))

    try:
        from ikabot.function.activateShrine import findShrine, do_it
        shrine_city, shrine_pos = findShrine(session)
        if not shrine_city:
            return jsonify({"success": False, "error": "Nenhum Santuário do Olimpo encontrado nas suas cidades."}), 400

        do_it(session, [god_id], mode=1, times=1)
        log_web("Bênção do Santuário do Olimpo ativada!", "SUCCESS")
        return jsonify({"success": True, "message": "Bênção do Santuário ativada com sucesso!"})
    except Exception as e:
        logger.error(f"Erro ao ativar Santuário: {e}", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500


# 5. MÓDULO MUNDO & EXPANSÃO
@app.route("/api/action/world/search_spaces", methods=["POST"])
def api_action_world_search_spaces():
    """Inicia vigia contínuo de vagas livres para colonização em ilhas (searchForIslandSpaces)."""
    session = get_or_create_session()
    if not session:
        return jsonify({"success": False, "error": "Sessão não conectada"}), 401

    data = request.json or {}
    coords = data.get("coords", [])

    try:
        import multiprocessing
        from ikabot.helpers.getJson import getIsland
        from ikabot.helpers.taskManager import create_task, update_task
        from ikabot.helpers.webWorkers import web_island_spaces_worker

        island_ids = []
        if coords:
            for c in coords:
                if ":" in c:
                    x, y = c.split(":", 1)
                    html = session.get(f"view=island&xcoord={x.strip()}&ycoord={y.strip()}")
                    isl = getIsland(html)
                    if isl and isl.get("id"):
                        island_ids.append(isl["id"])
        else:
            from ikabot.helpers.pedirInfo import getIslandsIds
            island_ids = getIslandsIds(session)

        task = create_task(
            task_type="searchIslandSpaces",
            details={"island_ids": island_ids},
            email=session.mail,
            world=session.word,
            status="running"
        )
        task_id = task["id"]

        proc = multiprocessing.Process(
            target=web_island_spaces_worker,
            args=(session, island_ids, task_id),
            name=f"spaces_{task_id}",
        )
        proc.start()
        update_task(task_id, pid=proc.pid)

        updateProcessList(session, programprocesslist=[{
            "pid": proc.pid,
            "task_id": task_id,
            "action": "searchIslandSpaces",
            "date": time.time(),
            "status": f"Vigiando vagas em {len(island_ids)} ilhas",
        }])

        log_web(f"Vigia de vagas para colonização ativado (PID {proc.pid})!", "SUCCESS")
        return jsonify({"success": True, "task_id": task_id, "message": f"Monitorando vagas em {len(island_ids)} ilhas!"})
    except Exception as e:
        logger.error(f"Erro ao vigiar vagas de ilhas: {e}", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500


# 6. MÓDULO CONFIGURAÇÕES & SISTEMA
@app.route("/api/action/account/vacation", methods=["POST"])
def api_action_account_vacation():
    """Ativa o Modo de Férias da conta (vacationMode)."""
    session = get_or_create_session()
    if not session:
        return jsonify({"success": False, "error": "Sessão não conectada"}), 401

    try:
        from ikabot.function.vacationMode import activateVacationMode
        activateVacationMode(session)
        log_web("MODO DE FÉRIAS ATIVADO COM SUCESSO!", "WARNING")
        return jsonify({"success": True, "message": "Modo de Férias ativado com sucesso!"})
    except Exception as e:
        logger.error(f"Erro ao ativar modo férias: {e}", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/action/account/login_daily", methods=["POST"])
def api_action_account_login_daily():
    """Coleta bônus diários de vinho, cineteatro e favor (loginDaily)."""
    session = get_or_create_session()
    if not session:
        return jsonify({"success": False, "error": "Sessão não conectada"}), 401

    data = request.json or {}
    city_id = data.get("city_id")

    try:
        from ikabot.helpers.webWorkers import web_daily_login_worker
        result = web_daily_login_worker(session, wine_city_id=city_id, wood_city_id=city_id, luxury_city_id=city_id, is_child_process=False)
        if isinstance(result, dict) and not result.get("success", True):
            return jsonify({"success": False, "error": result.get("error", "Erro ao coletar recompensas.")}), 500
        msg = result.get("message", "Recompensas diárias coletadas com sucesso!") if isinstance(result, dict) else "Recompensas diárias coletadas com sucesso!"
        log_web(msg, "SUCCESS")
        return jsonify({"success": True, "message": msg})
    except Exception as e:
        logger.error(f"Erro na coleta diária: {e}", exc_info=True)
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/settings/config", methods=["GET", "POST"])
def api_settings_config():
    """Consulta ou atualiza configurações de Telegram, Discord e Proxy."""
    session = get_or_create_session()
    if not session:
        return jsonify({"success": False, "error": "Sessão não conectada"}), 401

    if request.method == "GET":
        s_data = session.getSessionData()
        shared = s_data.get("shared", {})
        return jsonify({
            "success": True,
            "discord": shared.get("discord", {}),
            "telegram": shared.get("telegram", {}),
            "proxy": shared.get("proxy", {}),
        })

    data = request.json or {}
    try:
        s_data = session.getSessionData()
        if "shared" not in s_data:
            s_data["shared"] = {}

        if "discord" in data:
            s_data["shared"]["discord"] = data["discord"]
        if "telegram" in data:
            s_data["shared"]["telegram"] = data["telegram"]
        if "proxy" in data:
            s_data["shared"]["proxy"] = data["proxy"]

        session.setSessionData(s_data)
        log_web("Configurações do sistema salvas com sucesso!", "SUCCESS")
        return jsonify({"success": True, "message": "Configurações atualizadas com sucesso!"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route("/api/logs", methods=["GET"])
def api_logs():
    """Retorna os logs recentes para o terminal na página web."""
    return jsonify({"logs": list(log_buffer)})


def start_server(port: int = 8080):
    """Inicia o servidor web Flask."""
    log_web(f"Servidor Web Local do Ikabot iniciado na porta {port}.", "INFO")
    app.run(host="127.0.0.1", port=port, debug=False, threaded=True, use_reloader=False)
