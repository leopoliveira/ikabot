#! /usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import traceback

from requests import get, post
from requests.exceptions import ConnectTimeout, ReadTimeout

from ikabot.config import *
from ikabot.helpers.dns import getAddress
from ikabot.helpers.logging import getLogger

logger = getLogger(__name__)


def getNewBlackBoxToken(session):
    """This function returns a newly generated blackbox token from the API
    with automatic fallbacks in case a custom or DNS-resolved endpoint is unreachable.
    Parameters
    ----------
    session : ikabot.web.session.Session
        Session object

    Returns
    -------
    token : str
        blackbox token
    """
    user_agent = getattr(session, "api_user_agent", None) or session.user_agent
    params = {
        "user_agent": user_agent,
        "locale": session.locale,
        "timezone_id": session.timezone_id,
    }
    # Build prioritized candidate base endpoints:
    candidate_bases = []
    custom_addr = os.getenv("CUSTOM_API_ADDRESS")
    if custom_addr:
        candidate_bases.append((custom_addr.rstrip("/"), True))

    try:
        dns_addr = getAddress(publicAPIServerDomain)
        if dns_addr and not any(c[0] == dns_addr.rstrip("/") for c in candidate_bases):
            candidate_bases.append((dns_addr.rstrip("/"), False))
    except Exception as e:
        logger.warning(f"Não foi possível obter endereço da API pública via DNS: {e}")

    # Fallback to direct known official public server mirror
    direct_mirror = "http://ikabot.damirhadzagic.com:2082"
    if not any(c[0] == direct_mirror for c in candidate_bases):
        candidate_bases.append((direct_mirror, False))

    last_exc = None
    for base_url, is_custom in candidate_bases:
        address = base_url + "/v1/token"
        req_timeout = 10 if is_custom else blackboxTokenTimeout
        try:
            response = get(
                address, params=params, verify=do_ssl_verify, timeout=req_timeout
            )
            if response.status_code in [400, 422]:
                fallback_params = {"user_agent": user_agent}
                response = get(
                    address, params=fallback_params, verify=do_ssl_verify, timeout=req_timeout
                )
            if response.status_code != 200:
                err_msg = f"API response code is not OK: {response.status_code}\n{response.text}"
                logger.warning(f"Endpoint {address} retornou status {response.status_code}. Tentando próximo...")
                last_exc = Exception(err_msg)
                continue

            res_json = response.json()
            if isinstance(res_json, dict):
                if res_json.get("status") == "error":
                    raise Exception(res_json.get("message", "Erro retornado pela API"))
                raise Exception("Unexpected API response: " + str(res_json))

            return "tra:" + res_json.replace("tra:", "")
        except ConnectTimeout as exc:
            last_exc = exc
            timeout_val = req_timeout[0] if isinstance(req_timeout, (list, tuple)) else req_timeout
            logger.warning(f"Conexão com a API de token em '{address}' expirou após {timeout_val}s. Tentando próximo...")
            continue
        except ReadTimeout as exc:
            last_exc = exc
            timeout_val = req_timeout[1] if isinstance(req_timeout, (list, tuple)) else req_timeout
            logger.warning(f"API de token em '{address}' não respondeu em {timeout_val}s. Tentando próximo...")
            continue
        except Exception as e:
            last_exc = e
            if is_custom:
                logger.warning(f"Servidor customizado '{base_url}' inacessível ({e}). Alternando para o servidor oficial...")
            else:
                logger.warning(f"Falha ao conectar em '{address}': {e}. Tentando fallback...")
            continue

    if last_exc:
        raise last_exc
    raise Exception("Nenhum servidor de autenticação blackbox respondeu com sucesso.")


def getPiratesCaptchaSolution(session, image):
    """This function returns the solution of the pirates captcha
    Parameters
    ----------
    session : ikabot.web.session.Session
        Session object
    image : bytes
        the image to be solved

    Returns
    -------
    solution : str
        solution of the captcha
    """
    address = getAddress(publicAPIServerDomain) + "/v1/decaptcha/pirate"
    files = {"image": image}
    response = post(address, files=files, verify=do_ssl_verify, timeout=900)
    assert response.status_code == 200, (
        "API response code is not OK: "
        + str(response.status_code)
        + "\n"
        + response.text
    )
    response = response.json()
    if "status" in response and response["status"] == "error":
        raise Exception(response["message"])
    return response
