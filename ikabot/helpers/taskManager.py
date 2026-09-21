#! /usr/bin/env python3
# -*- coding: utf-8 -*-
"""Gerenciador de tarefas e filas persistentes entre reinicializações do Ikabot."""

import logging
import multiprocessing
import os
import time
import uuid
from typing import Any, Dict, List, Optional

import psutil

from ikabot.helpers.sessionStorage import get_ikabot_dir, read_json_file, write_json_file

logger = logging.getLogger(__name__)


def get_persistent_tasks_path() -> str:
    """Retorna o caminho do arquivo JSON que persiste todas as tarefas."""
    return os.path.join(get_ikabot_dir(), "persistent_tasks.json")


def _read_tasks_file() -> Dict[str, Any]:
    return read_json_file(get_persistent_tasks_path(), default={"tasks": {}})


def _write_tasks_file(data: Dict[str, Any]) -> None:
    write_json_file(get_persistent_tasks_path(), data)


def create_task(
    task_type: str,
    details: Dict[str, Any],
    email: str,
    world: str,
    pid: Optional[int] = None,
    status: str = "running",
) -> Dict[str, Any]:
    """
    Registra uma nova tarefa persistente em disco.
    """
    task_id = str(uuid.uuid4())[:8]
    data = _read_tasks_file()
    if "tasks" not in data or not isinstance(data["tasks"], dict):
        data["tasks"] = {}

    task_record = {
        "id": task_id,
        "type": task_type,
        "email": email,
        "world": world,
        "pid": pid,
        "status": status,
        "details": details,
        "created_at": time.time(),
        "updated_at": time.time(),
    }
    data["tasks"][task_id] = task_record
    _write_tasks_file(data)
    logger.info(f"Tarefa persistente criada [{task_id}]: {task_type} ({status})")
    return task_record


def update_task(task_id: str, **kwargs) -> Optional[Dict[str, Any]]:
    """Atualiza campos de uma tarefa persistente existente."""
    data = _read_tasks_file()
    tasks = data.get("tasks", {})
    if task_id not in tasks:
        return None

    tasks[task_id].update(kwargs)
    tasks[task_id]["updated_at"] = time.time()
    _write_tasks_file(data)
    return tasks[task_id]


def get_task(task_id: str) -> Optional[Dict[str, Any]]:
    """Obtém uma tarefa específica pelo ID."""
    data = _read_tasks_file()
    return data.get("tasks", {}).get(task_id)


def get_tasks_for_account(
    email: str,
    world: str,
    status_filter: Optional[List[str]] = None,
) -> List[Dict[str, Any]]:
    """Retorna tarefas filtradas pela conta/mundo e status."""
    data = _read_tasks_file()
    tasks = data.get("tasks", {})
    result = []

    for t in tasks.values():
        if t.get("email") == email and t.get("world") == world:
            if status_filter is None or t.get("status") in status_filter:
                result.append(t)

    # Ordena por data de criação descrescente
    result.sort(key=lambda x: x.get("created_at", 0), reverse=True)
    return result


def cancel_task(task_id: str) -> bool:
    """Cancela uma tarefa persistente e encerra seu processo no SO se ainda estiver rodando."""
    data = _read_tasks_file()
    tasks = data.get("tasks", {})
    if task_id not in tasks:
        return False

    task = tasks[task_id]
    pid = task.get("pid")
    if pid:
        try:
            p = psutil.Process(pid)
            p.terminate()
            time.sleep(0.1)
            if p.is_running():
                p.kill()
        except Exception:
            pass

    task["status"] = "cancelled"
    task["updated_at"] = time.time()
    _write_tasks_file(data)
    logger.info(f"Tarefa persistente [{task_id}] cancelada com sucesso.")
    return True


def complete_task(task_id: str, message: str = "") -> bool:
    """Marca uma tarefa como concluída."""
    data = _read_tasks_file()
    tasks = data.get("tasks", {})
    if task_id not in tasks:
        return False

    tasks[task_id]["status"] = "completed"
    if message:
        tasks[task_id]["details"]["final_message"] = message
    tasks[task_id]["updated_at"] = time.time()
    _write_tasks_file(data)
    logger.info(f"Tarefa persistente [{task_id}] concluída.")
    return True


def rehydrate_persistent_tasks(session, log_callback=None) -> int:
    """
    Restaura e re-executa tarefas pendentes ou em execução que tiveram seus processos
    interrompidos pelo fechamento do bot.
    """
    if not session or not getattr(session, "logged", False):
        return 0

    from ikabot.function.constructionList import web_construction_worker
    from ikabot.function.research import web_research_worker

    email = getattr(session, "mail", "")
    world = getattr(session, "word", "")
    active_tasks = get_tasks_for_account(email, world, status_filter=["running", "pending"])
    resumed_count = 0

    for task in active_tasks:
        task_id = task["id"]
        pid = task.get("pid")
        is_alive = False

        if pid:
            try:
                proc = psutil.Process(pid)
                is_alive = proc.is_running() and proc.status() != psutil.STATUS_ZOMBIE
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                is_alive = False

        if not is_alive:
            task_type = task.get("type")
            details = task.get("details", {})

            try:
                if task_type == "constructionList":
                    city_id = details.get("city_id")
                    position = details.get("position")
                    target_level = details.get("target_level")
                    b_name = details.get("building_name", "Edifício")
                    c_name = details.get("city_name", f"Cidade {city_id}")

                    if city_id is not None and position is not None and target_level is not None:
                        process = multiprocessing.Process(
                            target=web_construction_worker,
                            args=(session, city_id, position, target_level, task_id),
                            name=f"construction_{task_id}",
                        )
                        process.start()
                        update_task(task_id, pid=process.pid, status="running")
                        resumed_count += 1
                        msg = f"Reativando fila de construção: {b_name} nv {target_level} em {c_name} (Novo PID {process.pid})"
                        logger.info(msg)
                        if log_callback:
                            log_callback(msg, "INFO")

                elif task_type == "researchQueue":
                    study_index = details.get("study_index")
                    research_name = details.get("research_name", "Pesquisa")
                    required_points = details.get("required_points", 0)

                    if study_index is not None:
                        process = multiprocessing.Process(
                            target=web_research_worker,
                            args=(session, study_index, research_name, required_points, task_id),
                            name=f"research_{task_id}",
                        )
                        process.start()
                        update_task(task_id, pid=process.pid, status="running")
                        resumed_count += 1
                        msg = f"Reativando agendamento de pesquisa: {research_name} (Novo PID {process.pid})"
                        logger.info(msg)
                        if log_callback:
                            log_callback(msg, "INFO")

                elif task_type == "searchIslandSpaces":
                    from ikabot.helpers.webWorkers import web_island_spaces_worker
                    island_ids = details.get("island_ids", [])
                    if island_ids:
                        process = multiprocessing.Process(
                            target=web_island_spaces_worker,
                            args=(session, island_ids, task_id),
                            name=f"spaces_{task_id}",
                        )
                        process.start()
                        update_task(task_id, pid=process.pid, status="running")
                        resumed_count += 1
                        msg = f"Reativando monitor de vagas em {len(island_ids)} ilha(s) (Novo PID {process.pid})"
                        logger.info(msg)
                        if log_callback:
                            log_callback(msg, "INFO")

                elif task_type == "distributeResources":
                    from ikabot.helpers.webWorkers import web_distribute_worker
                    r_type = details.get("resource_type", 0)
                    evenly = details.get("evenly", True)
                    city_ids = details.get("city_ids", [])
                    use_freighters = details.get("use_freighters", False)
                    process = multiprocessing.Process(
                        target=web_distribute_worker,
                        args=(session, r_type, evenly, city_ids, use_freighters, task_id),
                        name=f"distribute_{task_id}",
                    )
                    process.start()
                    update_task(task_id, pid=process.pid, status="running")
                    resumed_count += 1
                    msg = f"Reativando distribuição de recursos (Novo PID {process.pid})"
                    logger.info(msg)
                    if log_callback:
                        log_callback(msg, "INFO")

                elif task_type == "consolidateResources":
                    from ikabot.helpers.webWorkers import web_consolidate_worker
                    r_type = details.get("resource_type", 0)
                    src_ids = details.get("source_city_ids", [])
                    dest_id = details.get("destination_id")
                    if dest_id and src_ids:
                        process = multiprocessing.Process(
                            target=web_consolidate_worker,
                            args=(session, r_type, src_ids, dest_id, task_id),
                            name=f"consolidate_{task_id}",
                        )
                        process.start()
                        update_task(task_id, pid=process.pid, status="running")
                        resumed_count += 1
                        msg = f"Reativando consolidação de recursos (Novo PID {process.pid})"
                        logger.info(msg)
                        if log_callback:
                            log_callback(msg, "INFO")

            except Exception as e:
                logger.error(f"Erro ao reativar tarefa persistente {task_id}: {e}", exc_info=True)

    return resumed_count
