#! /usr/bin/env python3
# -*- coding: utf-8 -*-

import time
import math
import traceback
from decimal import Decimal

from ikabot.config import *
from ikabot.helpers.logging import getLogger
from ikabot.helpers.botComm import sendToBot
from ikabot.helpers.getJson import getCity, getIsland
from ikabot.helpers.pedirInfo import getIdsOfCities, getShipCapacity
from ikabot.helpers.planRoutes import executeRoutes
from ikabot.helpers.process import set_child_mode
from ikabot.helpers.resources import materials_names
from ikabot.helpers.varios import wait, addThousandSeparator, getDateTime
from ikabot.helpers.taskManager import update_task, complete_task

logger = getLogger(__name__)


def web_distribute_worker(session, resource_type, evenly, city_ids, use_freighters=False, task_id=None):
    """Worker headless para distribuir recursos entre cidades."""
    set_child_mode(session)
    res_name = materials_names[resource_type] if 0 <= resource_type < len(materials_names) else "Recursos"
    
    if task_id:
        update_task(task_id, status="running", current_status=f"Calculando rotas de distribuição de {res_name}...")
    
    try:
        from ikabot.function.distributeResources import distribute_evenly, distribute_unevenly
        
        ids, cities = getIdsOfCities(session)
        # Filtra apenas as cidades selecionadas se especificadas
        target_ids = [str(cid) for cid in city_ids] if city_ids else ids
        
        if evenly:
            routes = distribute_evenly(session, resource_type, target_ids, cities)
        else:
            routes = distribute_unevenly(session, resource_type, target_ids, cities)
            
        if not routes:
            msg = f"Distribuição de {res_name}: Nenhuma rota necessária (cidades já equilibradas)."
            logger.info(msg)
            if task_id:
                complete_task(task_id, message=msg)
            return

        total_routes = len(routes)
        status_msg = f"Executando {total_routes} rotas de transporte para distribuir {res_name}..."
        session.setStatus(status_msg)
        if task_id:
            update_task(task_id, current_status=status_msg)

        executeRoutes(session, routes, useFreighters=use_freighters)
        
        final_msg = f"Distribuição de {res_name} concluída com sucesso ({total_routes} rotas entregues)!"
        session.setStatus(final_msg)
        logger.info(final_msg)
        sendToBot(session, final_msg)
        if task_id:
            complete_task(task_id, message=final_msg)

    except Exception as e:
        err_msg = f"Erro na distribuição de {res_name}: {e}"
        logger.error(err_msg, exc_info=True)
        session.setStatus(err_msg)
        sendToBot(session, f"Erro no Ikabot:\n{err_msg}\n{traceback.format_exc()}")
        if task_id:
            update_task(task_id, status="error", current_status=err_msg)
    finally:
        session.logout()


def web_consolidate_worker(session, resource_type, source_city_ids, destination_id, task_id=None):
    """Worker headless para consolidar recursos de várias cidades em uma única colônia."""
    set_child_mode(session)
    res_name = materials_names[resource_type] if 0 <= resource_type < len(materials_names) else "Recursos"

    if task_id:
        update_task(task_id, status="running", current_status=f"Calculando rotas para consolidar {res_name}...")

    try:
        routes = []
        dest_html = session.get(city_url + str(destination_id))
        dest_city = getCity(dest_html)
        dest_island_id = dest_city["islandId"]

        for s_id in source_city_ids:
            if str(s_id) == str(destination_id):
                continue
            s_html = session.get(city_url + str(s_id))
            s_city = getCity(s_html)
            avail = s_city["availableResources"][resource_type]
            if avail > 0:
                # route: (originCity, destinationCity, islandId, wood, wine, marble, crystal, sulfur)
                cargo = [0, 0, 0, 0, 0]
                cargo[resource_type] = avail
                routes.append((s_city, dest_city, dest_island_id, *cargo))

        if not routes:
            msg = f"Consolidação de {res_name}: Nenhuma cidade de origem possui saldo para transferir."
            logger.info(msg)
            if task_id:
                complete_task(task_id, message=msg)
            return

        status_msg = f"Consolidando {res_name} em {dest_city['name']} ({len(routes)} cidades de origem)..."
        session.setStatus(status_msg)
        if task_id:
            update_task(task_id, current_status=status_msg)

        executeRoutes(session, routes, useFreighters=False)

        final_msg = f"Consolidação de {res_name} na cidade {dest_city['name']} concluída!"
        session.setStatus(final_msg)
        logger.info(final_msg)
        sendToBot(session, final_msg)
        if task_id:
            complete_task(task_id, message=final_msg)

    except Exception as e:
        err_msg = f"Erro ao consolidar {res_name}: {e}"
        logger.error(err_msg, exc_info=True)
        session.setStatus(err_msg)
        if task_id:
            update_task(task_id, status="error", current_status=err_msg)
    finally:
        session.logout()


def web_island_spaces_worker(session, island_ids, task_id=None):
    """Worker headless para monitorar vagas livres em ilhas colonizáveis."""
    set_child_mode(session)
    logger.info(f"Iniciando monitoramento de vagas em {len(island_ids)} ilhas...")

    if task_id:
        update_task(task_id, status="running", current_status=f"Vigiando vagas livres em {len(island_ids)} ilha(s)...")

    found_spaces = []
    try:
        while True:
            for island_id in island_ids:
                try:
                    html = session.get(island_url + str(island_id))
                    island = getIsland(html)
                    island_name = island.get("name", f"Ilha {island_id}")
                    coords = f"[{island.get('x', '?')}:{island.get('y', '?')}]"

                    spaces = [c for c in island.get("cities", []) if c.get("type") == "space"]
                    if spaces:
                        count = len(spaces)
                        alert = f"🏛️ VAGA ENCONTRADA! A ilha {island_name} {coords} possui {count} vaga(s) livre(s) para colonização!"
                        logger.warning(alert)
                        session.setStatus(alert)
                        sendToBot(session, alert)
                        if task_id:
                            update_task(task_id, current_status=alert)
                    else:
                        logger.info(f"Ilha {island_name} {coords}: Nenhuma vaga livre no momento.")
                except Exception as ex:
                    logger.warning(f"Erro ao verificar ilha {island_id}: {ex}")

            # Aguarda 10 minutos entre verificações
            time.sleep(600)

    except Exception as e:
        logger.error(f"Erro no monitor de vagas: {e}", exc_info=True)
        if task_id:
            update_task(task_id, status="error", current_status=str(e))
    finally:
        session.logout()


def web_daily_login_worker(session, wine_city_id=None, wood_city_id=None, luxury_city_id=None, collect_ambrosia=True, collect_favor=True, task_id=None, is_child_process=False):
    """Worker para coletar recompensas diárias do Ikariam."""
    if is_child_process:
        set_child_mode(session)
    logger.info("Iniciando rotina de coleta diária de bônus...")

    # Se não foi informada cidade, resolve cidade ativa ou primeira cidade
    if not wine_city_id:
        try:
            from ikabot.helpers.varios import getCurrentCityId
            wine_city_id = getCurrentCityId(session)
        except Exception:
            pass
    if not wood_city_id:
        wood_city_id = wine_city_id
    if not luxury_city_id:
        luxury_city_id = wine_city_id

    claims_done = []

    try:
        # 1. Bônus de Login de Vinho
        if wine_city_id:
            try:
                session.post(params={
                    "action": "loginBonus",
                    "function": "claimLoginBonus",
                    "cityId": wine_city_id,
                    "actionRequest": actionRequest,
                    "ajax": 1
                })
                claims_done.append("Bônus de Vinho")
                logger.info(f"Bônus diário de vinho coletado para a cidade {wine_city_id}.")
            except Exception as e:
                logger.warning(f"Não foi possível coletar bônus de vinho: {e}")

        # 2. Cineteatro (madeira e luxo)
        if wood_city_id:
            try:
                session.post(params={
                    "action": "CinemaScreen",
                    "function": "claimBonus",
                    "cityId": wood_city_id,
                    "reward": "wood",
                    "actionRequest": actionRequest,
                    "ajax": 1
                })
                claims_done.append("Cineteatro (Madeira)")
            except Exception:
                pass

        if luxury_city_id:
            try:
                session.post(params={
                    "action": "CinemaScreen",
                    "function": "claimBonus",
                    "cityId": luxury_city_id,
                    "reward": "tradegood",
                    "actionRequest": actionRequest,
                    "ajax": 1
                })
                claims_done.append("Cineteatro (Luxo)")
            except Exception:
                pass

        # 3. Ambrósia / Imaginação Divina
        if collect_ambrosia:
            try:
                session.post(params={
                    "action": "DailyTasksScreen",
                    "function": "claimAmbrosiaBonus",
                    "actionRequest": actionRequest,
                    "ajax": 1
                })
                claims_done.append("Bônus de Ambrósia")
            except Exception:
                pass

        # 4. Tarefas Diárias de Favor
        if collect_favor:
            try:
                session.post(params={
                    "action": "DailyTasksScreen",
                    "function": "claimFavor",
                    "actionRequest": actionRequest,
                    "ajax": 1
                })
                claims_done.append("Favor dos Deuses")
            except Exception:
                pass

        msg = "Rotina diária concluída! Coletas processadas: " + (", ".join(claims_done) if claims_done else "Nenhum bônus pendente hoje.")
        logger.info(msg)
        if hasattr(session, "setStatus"):
            session.setStatus(msg)
        sendToBot(session, msg)
        if task_id:
            complete_task(task_id, message=msg)
        return {"success": True, "message": msg, "claims": claims_done}

    except Exception as e:
        logger.error(f"Erro ao coletar bônus diários: {e}", exc_info=True)
        if task_id:
            update_task(task_id, status="error", current_status=str(e))
        return {"success": False, "error": str(e)}
    finally:
        if is_child_process:
            session.logout()

