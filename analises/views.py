from __future__ import annotations

import json

from django.http import HttpRequest, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from .client import AnalisesError, listar_analises, salvar_analise


@require_GET
def api_lista_analises(request: HttpRequest) -> JsonResponse:
    ambiente = request.GET.get("ambiente", "app").strip().lower() or "app"
    try:
        registro_ids = _extrair_ids(request.GET.get("ids", ""))
        analises = listar_analises(ambiente, registro_ids)
        return JsonResponse({"analises": {str(registro_id): analise for registro_id, analise in analises.items()}})
    except (ValueError, AnalisesError) as exc:
        return JsonResponse({"erro": str(exc)}, status=400)


@csrf_exempt
@require_POST
def api_salvar_analise(request: HttpRequest, registro_id: int) -> JsonResponse:
    try:
        payload = json.loads(request.body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        return JsonResponse({"erro": "JSON invalido."}, status=400)

    ambiente = str(payload.get("ambiente", "app")).strip().lower() or "app"
    analisado = payload.get("analisado") if "analisado" in payload else None
    anotacao = payload.get("anotacao") if "anotacao" in payload else None
    if analisado is not None and not isinstance(analisado, bool):
        return JsonResponse({"erro": "analisado deve ser booleano."}, status=400)
    if anotacao is not None and not isinstance(anotacao, str):
        return JsonResponse({"erro": "anotacao deve ser texto."}, status=400)
    if anotacao is not None and len(anotacao) > 10_000:
        return JsonResponse({"erro": "A anotacao pode ter no maximo 10.000 caracteres."}, status=400)
    if analisado is None and anotacao is None:
        return JsonResponse({"erro": "Informe analisado ou anotacao."}, status=400)

    try:
        analise = salvar_analise(ambiente, registro_id, analisado=analisado, anotacao=anotacao)
        return JsonResponse({"analise": analise})
    except AnalisesError as exc:
        return JsonResponse({"erro": str(exc)}, status=502)


def _extrair_ids(valor: str) -> list[int]:
    if not valor:
        return []
    ids = [int(item) for item in valor.split(",") if item.strip()]
    if len(ids) > 200:
        raise ValueError("Consulte no maximo 200 registros por vez.")
    if any(registro_id < 1 for registro_id in ids):
        raise ValueError("Os IDs devem ser positivos.")
    return ids
