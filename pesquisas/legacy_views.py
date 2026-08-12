from __future__ import annotations

from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

from django.http import HttpRequest, HttpResponse
from django.shortcuts import render

from .services import (
    buscar_metricas,
    buscar_registro_detalhe,
    consultar_registros,
    listar_siglas_orgaos,
    listar_ultimos_registros,
    obter_info_banco,
)

_UTC = ZoneInfo("UTC")
_SAO_PAULO = ZoneInfo("America/Sao_Paulo")


def _contexto_base() -> dict[str, Any]:
    return {"titulo_app": "AVIPE Painel Legado"}


def _ajustar_datas_para_fuso_local(valor: Any) -> Any:
    if isinstance(valor, datetime):
        base = valor.replace(tzinfo=_UTC) if valor.tzinfo is None else valor
        return base.astimezone(_SAO_PAULO)
    return valor


def _normalizar_registro_datas(registro: dict[str, Any]) -> dict[str, Any]:
    return {chave: _ajustar_datas_para_fuso_local(valor) for chave, valor in registro.items()}


def _normalizar_paginacao(paginacao):
    paginacao.itens = [_normalizar_registro_datas(item) for item in paginacao.itens]
    return paginacao


def dashboard(request: HttpRequest) -> HttpResponse:
    contexto = _contexto_base()
    try:
        contexto.update(
            {
                "metricas": buscar_metricas(),
                "info_banco": obter_info_banco(),
                "ultimos_registros": [_normalizar_registro_datas(item) for item in listar_ultimos_registros()],
            }
        )
        return render(request, "pesquisas/dashboard.html", contexto)
    except Exception as exc:  # pragma: no cover
        contexto["erro"] = str(exc)
        return render(request, "pesquisas/erro.html", contexto, status=500)


def lista_pesquisas(request: HttpRequest) -> HttpResponse:
    filtros = {
        "nuprocesso": request.GET.get("nuprocesso", ""),
        "cpf": request.GET.get("cpf", ""),
        "sig_orgao": request.GET.get("sig_orgao", ""),
        "usuario_logado": request.GET.get("usuario_logado", ""),
        "data_insercao": request.GET.get("data_insercao", ""),
        "processado": request.GET.get("processado", ""),
        "juntado": request.GET.get("juntado", ""),
    }
    pagina = max(1, int(request.GET.get("pagina", "1") or "1"))
    contexto = _contexto_base()
    try:
        contexto.update(
            {
                "filtros": filtros,
                "paginacao": _normalizar_paginacao(consultar_registros(filtros=filtros, pagina=pagina)),
                "siglas_orgaos": listar_siglas_orgaos(),
            }
        )
        return render(request, "pesquisas/lista.html", contexto)
    except Exception as exc:  # pragma: no cover
        contexto["erro"] = str(exc)
        return render(request, "pesquisas/erro.html", contexto, status=500)


def detalhe_pesquisa(request: HttpRequest) -> HttpResponse:
    registro_id = request.GET.get("id", "")
    voltar_para = request.GET.get("next", "")
    contexto = _contexto_base()

    if not registro_id:
        contexto["erro"] = "Informe o id do registro para abrir o detalhe."
        return render(request, "pesquisas/erro.html", contexto, status=400)

    try:
        registro = buscar_registro_detalhe(int(registro_id))
    except Exception as exc:  # pragma: no cover
        contexto["erro"] = str(exc)
        return render(request, "pesquisas/erro.html", contexto, status=500)

    if not registro:
        contexto["erro"] = "Registro nao encontrado com os parametros informados."
        return render(request, "pesquisas/erro.html", contexto, status=404)

    contexto["registro"] = _normalizar_registro_datas(registro)
    contexto["voltar_para"] = voltar_para
    return render(request, "pesquisas/detalhe.html", contexto)
