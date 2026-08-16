from __future__ import annotations

from datetime import datetime
from pathlib import Path
from urllib.parse import urlencode
from typing import Any
from zoneinfo import ZoneInfo

from django.http import JsonResponse
from django.http import HttpRequest, HttpResponse
from django.shortcuts import render
from django.conf import settings

from .analytics import buscar_observabilidade
from .services import (
    buscar_metricas,
    buscar_registro_detalhe,
    consultar_registros,
    listar_siglas_orgaos,
    listar_usuarios_logados,
    listar_ultimos_registros,
    obter_info_banco,
)

_UTC = ZoneInfo("UTC")
_SAO_PAULO = ZoneInfo("America/Sao_Paulo")


def _contexto_base() -> dict[str, Any]:
    app_js = Path(settings.BASE_DIR) / "frontend" / "dist" / "assets" / "app.js"
    app_css = Path(settings.BASE_DIR) / "frontend" / "dist" / "assets" / "app.css"
    asset_version = "dev"
    if app_js.exists():
        asset_version = str(int(app_js.stat().st_mtime))
    elif app_css.exists():
        asset_version = str(int(app_css.stat().st_mtime))

    return {
        "titulo_app": "Watcher AVIPE",
        "asset_version": asset_version,
    }


def react_app(request: HttpRequest) -> HttpResponse:
    return render(request, "pesquisas/react_app.html", _contexto_base())


def health(request: HttpRequest) -> JsonResponse:
    return JsonResponse({"status": "ok"})


def _ajustar_datas_para_fuso_local(valor: Any) -> Any:
    if isinstance(valor, datetime):
        base = valor.replace(tzinfo=_UTC) if valor.tzinfo is None else valor
        return base.astimezone(_SAO_PAULO)
    return valor


def _normalizar_registro_datas(registro: dict[str, Any]) -> dict[str, Any]:
    return {
        chave: _ajustar_datas_para_fuso_local(valor)
        for chave, valor in registro.items()
    }


def _serializar_registro(registro: dict[str, Any]) -> dict[str, Any]:
    normalizado = _normalizar_registro_datas(registro)
    serializado: dict[str, Any] = {}
    for chave, valor in normalizado.items():
        if isinstance(valor, datetime):
            serializado[chave] = valor.isoformat()
        else:
            serializado[chave] = valor
    return serializado


def api_dashboard(request: HttpRequest) -> JsonResponse:
    try:
        return JsonResponse(
            {
                "metricas": buscar_metricas(),
                "info_banco": obter_info_banco(),
                "ultimos_registros": [
                    _serializar_registro(item)
                    for item in listar_ultimos_registros()
                ],
                "siglas_orgaos": listar_siglas_orgaos(),
            }
        )
    except Exception as exc:  # pragma: no cover
        return JsonResponse({"erro": str(exc)}, status=500)


def api_observabilidade(request: HttpRequest) -> JsonResponse:
    periodo = request.GET.get("periodo", "today")
    try:
        return JsonResponse(buscar_observabilidade(periodo))
    except Exception as exc:  # pragma: no cover
        return JsonResponse({"erro": str(exc)}, status=500)


def api_lista_pesquisas(request: HttpRequest) -> JsonResponse:
    filtros = {
        "nuprocesso": request.GET.get("nuprocesso", ""),
        "cpf": request.GET.get("cpf", ""),
        "sig_orgao": request.GET.get("sig_orgao", ""),
        "usuario_logado": request.GET.get("usuario_logado", ""),
        "data_insercao_status": request.GET.get("data_insercao_status", ""),
        "data_insercao_inicio": request.GET.get("data_insercao_inicio", ""),
        "data_insercao_fim": request.GET.get("data_insercao_fim", ""),
        "data_processamento_status": request.GET.get("data_processamento_status", ""),
        "data_processamento_inicio": request.GET.get("data_processamento_inicio", ""),
        "data_processamento_fim": request.GET.get("data_processamento_fim", ""),
        "processado": request.GET.get("processado", ""),
        "juntado": request.GET.get("juntado", ""),
    }
    pagina = max(1, int(request.GET.get("pagina", "1") or "1"))
    try:
        paginacao = _normalizar_paginacao(
            consultar_registros(filtros=filtros, pagina=pagina)
        )
        query_base = {chave: valor for chave, valor in filtros.items() if valor}
        return JsonResponse(
            {
                "filtros": filtros,
                "siglas_orgaos": listar_siglas_orgaos(),
                "usuarios_logados": listar_usuarios_logados(),
                "paginacao": {
                    "itens": [_serializar_registro(item) for item in paginacao.itens],
                    "pagina": paginacao.pagina,
                    "por_pagina": paginacao.por_pagina,
                    "total": paginacao.total,
                    "total_processos": paginacao.total_processos,
                    "total_paginas": paginacao.total_paginas,
                    "tem_anterior": paginacao.tem_anterior,
                    "tem_proxima": paginacao.tem_proxima,
                    "anterior_url": f"/api/pesquisas/?{urlencode({**query_base, 'pagina': paginacao.pagina - 1})}" if paginacao.tem_anterior else "",
                    "proxima_url": f"/api/pesquisas/?{urlencode({**query_base, 'pagina': paginacao.pagina + 1})}" if paginacao.tem_proxima else "",
                },
            }
        )
    except Exception as exc:  # pragma: no cover
        return JsonResponse({"erro": str(exc)}, status=500)


def api_detalhe_pesquisa(request: HttpRequest) -> JsonResponse:
    registro_id = request.GET.get("id", "")
    if not registro_id:
        return JsonResponse({"erro": "Informe o id do registro para abrir o detalhe."}, status=400)

    try:
        registro = buscar_registro_detalhe(int(registro_id))
    except Exception as exc:  # pragma: no cover
        return JsonResponse({"erro": str(exc)}, status=500)

    if not registro:
        return JsonResponse({"erro": "Registro nao encontrado com os parametros informados."}, status=404)

    return JsonResponse({"registro": _serializar_registro(registro)})


def _normalizar_paginacao(paginacao):
    paginacao.itens = [_normalizar_registro_datas(item) for item in paginacao.itens]
    return paginacao
