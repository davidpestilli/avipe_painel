from __future__ import annotations

import configparser
import json
import os
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from django.conf import settings


class AnalisesError(Exception):
    """Falha de configuracao ou comunicacao com o Supabase."""


def listar_analises(ambiente: str, registro_ids: list[int]) -> dict[int, dict[str, Any]]:
    if not registro_ids:
        return {}

    unique_ids = sorted(set(registro_ids))
    query = urlencode(
        {
            "select": "registro_id,analisado,anotacao,updated_at",
            "ambiente": f"eq.{ambiente}",
            "registro_id": f"in.({','.join(str(registro_id) for registro_id in unique_ids)})",
        }
    )
    response = _request("GET", f"/rest/v1/watcher_analises?{query}")
    return {
        int(item["registro_id"]): {
            "analisado": bool(item.get("analisado", False)),
            "anotacao": item.get("anotacao") or "",
            "updated_at": item.get("updated_at"),
        }
        for item in response
    }


def salvar_analise(
    ambiente: str,
    registro_id: int,
    *,
    analisado: bool | None = None,
    anotacao: str | None = None,
) -> dict[str, Any]:
    atual = listar_analises(ambiente, [registro_id]).get(registro_id, _analise_padrao())
    payload = {
        "ambiente": ambiente,
        "registro_id": registro_id,
        "analisado": atual["analisado"] if analisado is None else analisado,
        "anotacao": atual["anotacao"] if anotacao is None else anotacao,
    }
    response = _request(
        "POST",
        "/rest/v1/watcher_analises?on_conflict=ambiente,registro_id",
        payload,
        {"Prefer": "resolution=merge-duplicates,return=representation"},
    )
    if not response:
        raise AnalisesError("O Supabase nao retornou a analise salva.")
    item = response[0]
    return {
        "analisado": bool(item.get("analisado", False)),
        "anotacao": item.get("anotacao") or "",
        "updated_at": item.get("updated_at"),
    }


def listar_ids_analisados(ambiente: str) -> list[int]:
    """Retorna os IDs marcados, paginando para ultrapassar o limite do PostgREST."""
    ids: list[int] = []
    inicio = 0
    tamanho_pagina = 1_000
    while True:
        query = urlencode({"select": "registro_id", "ambiente": f"eq.{ambiente}", "analisado": "is.true", "order": "registro_id.asc"})
        itens = _request("GET", f"/rest/v1/watcher_analises?{query}", extra_headers={"Range": f"{inicio}-{inicio + tamanho_pagina - 1}"})
        ids.extend(int(item["registro_id"]) for item in itens)
        if len(itens) < tamanho_pagina:
            return ids
        inicio += tamanho_pagina


def _analise_padrao() -> dict[str, Any]:
    return {"analisado": False, "anotacao": "", "updated_at": None}


def _request(method: str, path: str, payload: dict[str, Any] | None = None, extra_headers: dict[str, str] | None = None) -> list[dict[str, Any]]:
    url, service_role_key = _configurar_supabase()
    headers = {
        "apikey": service_role_key,
        "Authorization": f"Bearer {service_role_key}",
        "Content-Type": "application/json",
    }
    if extra_headers:
        headers.update(extra_headers)
    body = json.dumps(payload).encode("utf-8") if payload is not None else None
    request = Request(f"{url.rstrip('/')}{path}", data=body, headers=headers, method=method)
    try:
        with urlopen(request, timeout=10) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise AnalisesError(f"Supabase retornou HTTP {exc.code}: {detail}") from exc
    except URLError as exc:
        raise AnalisesError(f"Nao foi possivel conectar ao Supabase: {exc.reason}") from exc


def _configurar_supabase() -> tuple[str, str]:
    url = os.getenv("WATCHER_SUPABASE_URL", "").strip()
    service_role_key = os.getenv("WATCHER_SUPABASE_SERVICE_ROLE_KEY", "").strip()
    if url and service_role_key:
        return url, service_role_key

    # O processo Django pode ter sido iniciado antes das variaveis serem
    # registradas no Windows. Esta leitura mantem o modulo funcional ate
    # o proximo reinicio, sem adicionar segredos ao repositorio.
    url, service_role_key = _ler_ambiente_do_usuario_windows()
    if url and service_role_key:
        return url, service_role_key

    config = configparser.ConfigParser(interpolation=None)
    config.read(Path(settings.BASE_DIR) / "config.local.ini", encoding="utf-8")
    url = config.get("supabase_watcher", "url", fallback="").strip()
    service_role_key = config.get("supabase_watcher", "service_role_key", fallback="").strip()
    if url and service_role_key:
        return url, service_role_key
    raise AnalisesError(
        "Configure WATCHER_SUPABASE_URL e WATCHER_SUPABASE_SERVICE_ROLE_KEY, "
        "ou a secao [supabase_watcher] em config.local.ini."
    )


def _ler_ambiente_do_usuario_windows() -> tuple[str, str]:
    if os.name != "nt":
        return "", ""
    try:
        import winreg

        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, "Environment") as key:
            url = str(winreg.QueryValueEx(key, "WATCHER_SUPABASE_URL")[0]).strip()
            service_role_key = str(winreg.QueryValueEx(key, "WATCHER_SUPABASE_SERVICE_ROLE_KEY")[0]).strip()
            return url, service_role_key
    except (FileNotFoundError, OSError):
        return "", ""
