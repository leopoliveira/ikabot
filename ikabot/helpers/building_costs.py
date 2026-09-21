# -*- coding: utf-8 -*-
"""
Helper para cálculo e cache de requisitos de recursos para evolução de edifícios no Ikariam.
Utiliza a tabela de custos da Ikipedia interna e aplica os redutores de pesquisa (economia)
e edifícios de redução da cidade (Carpintaria, Ateliê do Arquiteto, Prensa, Ótico, Pirotecnia).
"""

import json
import logging
import math
import os
import re
from decimal import Decimal
from typing import Dict, List, Optional, Tuple

import hashlib
from functools import cache
import requests
from ikabot import config

logger = logging.getLogger("ikabot")


@cache
def checkhash(url: str) -> str:
    """Identifica o tipo de recurso a partir do hash MD5 do ícone CDN."""
    try:
        m = hashlib.md5()
        r = requests.get(url, timeout=5)
        for data in r.iter_content(8192):
            m.update(data)
            h = m.hexdigest()
            if h == config.material_img_hash[0]:
                return "wood"
            elif h == config.material_img_hash[1]:
                return "wine"
            elif h == config.material_img_hash[2]:
                return "marble"
            elif h == config.material_img_hash[3]:
                return "glass"
            elif h == config.material_img_hash[4]:
                return "sulfur"
    except Exception as e:
        logger.debug(f"Erro ao verificar hash de imagem {url}: {e}")
    return "wood"


def getCostsReducers(city: dict) -> List[int]:
    """Retorna os redutores de custos por nível dos edifícios da cidade [wood, wine, marble, crystal, sulfur]."""
    reducers = [0, 0, 0, 0, 0]
    for building in city.get("position", []):
        if building.get("name") == "empty":
            continue
        lv = int(building.get("level", 0) or 0)
        b_type = building.get("building", "")
        if b_type == "carpentering":
            reducers[0] = lv
        elif b_type == "vineyard":
            reducers[1] = lv
        elif b_type == "architect":
            reducers[2] = lv
        elif b_type == "optician":
            reducers[3] = lv
        elif b_type == "fireworker":
            reducers[4] = lv
    return reducers


# Cache persistente em arquivo e memória
_CACHE_FILE = os.path.join(os.path.dirname(__file__), "building_costs_cache.json")
_BUILDING_COSTS_CACHE: Dict[str, Dict[int, List[int]]] = {}

# Mapeamento de índices para nomes amigáveis
MATERIAL_KEYS = ["wood", "wine", "marble", "crystal", "sulfur"]
MATERIAL_ICONS = {
    "wood": "🪵",
    "wine": "🍷",
    "marble": "🏛️",
    "crystal": "💎",
    "sulfur": "🔥",
}
MATERIAL_LABELS = {
    "wood": "Material de Construção",
    "wine": "Vinho",
    "marble": "Mármore",
    "crystal": "Cristal",
    "sulfur": "Enxofre",
}


def _load_cache_from_disk():
    global _BUILDING_COSTS_CACHE
    if not _BUILDING_COSTS_CACHE and os.path.exists(_CACHE_FILE):
        try:
            with open(_CACHE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                # Converte chaves de nível para int
                for b_type, levels_dict in data.items():
                    _BUILDING_COSTS_CACHE[b_type] = {
                        int(lvl): costs for lvl, costs in levels_dict.items()
                    }
        except Exception as e:
            logger.warning(f"Não foi possível carregar cache de custos do disco: {e}")


def _save_cache_to_disk():
    try:
        with open(_CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(_BUILDING_COSTS_CACHE, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.warning(f"Não foi possível salvar cache de custos no disco: {e}")


def get_research_reduction(session, city_id: str) -> float:
    """Retorna o multiplicador de redução de pesquisa da conta (ex: 0.14 = 14%)."""
    if not session:
        return 0.14
    sessionData = session.getSessionData() if hasattr(session, "getSessionData") else {}
    if sessionData.get("reduccion_inv_max") is True:
        return 0.14
    if "research_costs_reduction" in sessionData:
        return float(sessionData["research_costs_reduction"])

    try:
        url = (
            f"view=noViewChange&researchType=economy&backgroundView=city"
            f"&currentCityId={city_id}&templateView=researchAdvisor"
            f"&actionRequest={config.actionRequest}&ajax=1"
        )
        rta = session.post(url)
        rta_json = json.loads(rta, strict=False)
        studies = rta_json[2][1]["new_js_params"]
        studies = json.loads(studies, strict=False)
        curr_studies = studies.get("currResearchType", {})

        reduction_pct = 0
        for study in curr_studies:
            if curr_studies[study].get("liClass") != "explored":
                continue
            link = curr_studies[study].get("aHref", "")
            if "2020" in link:
                reduction_pct += 2
            elif "2060" in link:
                reduction_pct += 4
            elif "2100" in link:
                reduction_pct += 8

        if reduction_pct == 14:
            sessionData["reduccion_inv_max"] = True
        dec_val = reduction_pct / 100.0
        sessionData["research_costs_reduction"] = dec_val
        session.setSessionData(sessionData)
        return dec_val
    except Exception as e:
        logger.warning(f"Erro ao verificar pesquisas de economia: {e}. Usando 14% como padrão.")
        return 0.14


def fetch_building_cost_table(session, city_id: str, building_type: str) -> Dict[int, List[int]]:
    """
    Busca na Ikipedia interna do Ikariam a tabela completa de custos de todos os níveis
    para um determinado edifício e armazena em cache.
    Retorna: { nivel (int): [wood, wine, marble, glass, sulfur] }
    """
    _load_cache_from_disk()

    if building_type in _BUILDING_COSTS_CACHE:
        return _BUILDING_COSTS_CACHE[building_type]

    try:
        # 1. Abre a página inicial de ajuda/Ikipedia de edifícios
        building_detail_url = (
            f"view=buildingDetail&buildingId=0&helpId=1&backgroundView=city"
            f"&currentCityId={city_id}&templateView=ikipedia"
            f"&actionRequest={config.actionRequest}&ajax=1"
        )
        resp = session.post(building_detail_url)
        resp_json = json.loads(resp, strict=False)
        building_html = resp_json[1][1][1]

        # 2. Localiza o link específico do edifício
        regex_building = (
            r'<div class="(?:selected)? button_building '
            + re.escape(building_type)
            + r'"\s*onmouseover="\$\(this\)\.addClass\(\'hover\'\);" onmouseout="\$\(this\)\.removeClass\(\'hover\'\);"\s*onclick="ajaxHandlerCall\(\'\?(.*?)\'\);'
        )
        match = re.search(regex_building, building_html)
        if not match:
            logger.warning(f"Edifício '{building_type}' não encontrado no menu da Ikipedia.")
            return {}

        building_costs_url = match.group(1)
        building_costs_url += (
            f"backgroundView=city&currentCityId={city_id}&templateView=buildingDetail"
            f"&actionRequest={config.actionRequest}&ajax=1"
        )
        costs_resp = session.post(building_costs_url)
        costs_json = json.loads(costs_resp, strict=False)
        html_costs = costs_json[1][1][1]

        # 3. Mapeia os tipos de recursos das colunas do cabeçalho da tabela
        resources_types_raw = re.findall(
            r'<th class="costs"><img src="(.*?)\.png"/></th>', html_costs
        )[:-1]

        res_indexes = []
        for r_url in resources_types_raw:
            low = r_url.lower()
            if "wood" in low or "holz" in low:
                res_indexes.append(0)
            elif "wine" in low or "wein" in low:
                res_indexes.append(1)
            elif "marble" in low or "marmor" in low:
                res_indexes.append(2)
            elif "glass" in low or "kristall" in low or "crystal" in low:
                res_indexes.append(3)
            elif "sulfur" in low or "schwefel" in low:
                res_indexes.append(4)
            else:
                try:
                    name_tec = checkhash("https:" + r_url + ".png")
                    idx = config.materials_names_tec.index(name_tec) if name_tec in config.materials_names_tec else 0
                    res_indexes.append(idx)
                except Exception:
                    res_indexes.append(0)

        # 4. Extrai os custos por linha de nível
        matches = re.findall(
            r'<td class="level">\d+</td>(?:\s+<td class="costs">.*?</td>)+', html_costs
        )

        costs_by_level: Dict[int, List[int]] = {}
        for row in matches:
            lv_match = re.search(r'"level">(\d+)</td>', row)
            if not lv_match:
                continue
            lvl = int(lv_match.group(1))

            costs_cols = re.findall(
                r'<td class="costs"><div.*?>([\d,\.\s\xa0]*)</div></div></td>', row
            )
            costs_cols = [c.replace("\xa0", "").replace(" ", "").replace(",", "").replace(".", "") for c in costs_cols]

            level_costs = [0, 0, 0, 0, 0]
            for col_i, cost_val in enumerate(costs_cols):
                if col_i < len(res_indexes):
                    r_idx = res_indexes[col_i]
                    level_costs[r_idx] = int(cost_val) if cost_val.isdigit() else 0

            costs_by_level[lvl] = level_costs

        if costs_by_level:
            _BUILDING_COSTS_CACHE[building_type] = costs_by_level
            _save_cache_to_disk()

        return costs_by_level

    except Exception as e:
        logger.error(f"Erro ao buscar custos da Ikipedia para {building_type}: {e}")
        return {}


def calculate_building_upgrade_cost(
    session,
    city: dict,
    building: dict,
    current_level: int,
    target_level: int,
) -> dict:
    """
    Calcula a soma de recursos necessários para evoluir um edifício de current_level até target_level,
    aplicando os descontos de pesquisa da conta e os edifícios de redução da cidade.
    Retorna o comparativo completo com os recursos em armazém da cidade.
    """
    city_id = str(city.get("id", ""))
    building_type = building.get("building", "")
    position = int(building.get("position", 0))

    if current_level >= target_level:
        target_level = current_level + 1

    # Obtém tabela base da Ikipedia
    cost_table = fetch_building_cost_table(session, city_id, building_type)
    if not cost_table:
        # Se não conseguir a tabela, retorna custos zerados com indicação
        return {
            "success": False,
            "error": f"Tabela de custos não disponível para {building_type}",
            "building_id": building_type,
            "position": position,
            "current_level": current_level,
            "target_level": target_level,
            "costs": {k: 0 for k in MATERIAL_KEYS},
            "available": {k: 0 for k in MATERIAL_KEYS},
            "missing": {k: 0 for k in MATERIAL_KEYS},
            "has_enough": False,
            "can_upgrade": building.get("canUpgrade", False),
        }

    # Redução de pesquisas
    research_reduction = get_research_reduction(session, city_id)
    # Redutores da cidade: [wood, wine, marble, crystal, sulfur]
    city_reducers = list(getCostsReducers(city))

    total_costs = [0, 0, 0, 0, 0]

    for lvl in range(current_level + 1, target_level + 1):
        if lvl not in cost_table:
            break

        base_costs = cost_table[lvl]

        for r_idx in range(5):
            cost_val = base_costs[r_idx]
            if cost_val <= 0:
                continue

            inv_mult = Decimal(str(1 - research_reduction))
            if inv_mult <= Decimal(0):
                inv_mult = Decimal("0.86")

            b_red = Decimal(city_reducers[r_idx]) / Decimal(100)
            final_mult = max(Decimal(0), inv_mult - b_red)

            real_cost = Decimal(cost_val) * (final_mult / inv_mult)
            total_costs[r_idx] += math.ceil(real_cost)

        # Se for um edifício redutor, ele próprio aumenta o desconto para o próximo nível
        if building_type == "carpentering":
            city_reducers[0] = min(50, city_reducers[0] + 1)
        elif building_type == "vineyard":
            city_reducers[1] = min(50, city_reducers[1] + 1)
        elif building_type == "architect":
            city_reducers[2] = min(50, city_reducers[2] + 1)
        elif building_type == "optician":
            city_reducers[3] = min(50, city_reducers[3] + 1)
        elif building_type == "fireworker":
            city_reducers[4] = min(50, city_reducers[4] + 1)

    # Recursos disponíveis na cidade
    avail_raw = city.get("availableResources", [0, 0, 0, 0, 0])
    avail_list = [int(avail_raw[i]) if i < len(avail_raw) else 0 for i in range(5)]

    missing_list = [max(0, total_costs[i] - avail_list[i]) for i in range(5)]
    has_enough = all(missing_list[i] == 0 for i in range(5))

    costs_dict = {MATERIAL_KEYS[i]: total_costs[i] for i in range(5)}
    avail_dict = {MATERIAL_KEYS[i]: avail_list[i] for i in range(5)}
    missing_dict = {MATERIAL_KEYS[i]: missing_list[i] for i in range(5)}

    # Materiais relevantes (apenas os que têm custo > 0)
    relevant_materials = [
        {
            "key": MATERIAL_KEYS[i],
            "name": MATERIAL_LABELS[MATERIAL_KEYS[i]],
            "icon": MATERIAL_ICONS[MATERIAL_KEYS[i]],
            "cost": total_costs[i],
            "available": avail_list[i],
            "missing": missing_list[i],
            "sufficient": missing_list[i] == 0,
        }
        for i in range(5)
        if total_costs[i] > 0
    ]

    return {
        "success": True,
        "building_id": building_type,
        "position": position,
        "current_level": current_level,
        "target_level": target_level,
        "costs": costs_dict,
        "available": avail_dict,
        "missing": missing_dict,
        "relevant_materials": relevant_materials,
        "has_enough": has_enough,
        "can_upgrade": building.get("canUpgrade", False) if current_level + 1 == target_level else has_enough,
    }
