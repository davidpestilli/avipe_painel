from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from django.conf import settings

ORGAO_SUPORTE = "SUPORTE"
PREFERENCES_FILENAME = "painel_preferences.json"
DEFAULT_PREFERENCES: dict[str, Any] = {
    "exibir_orgao_suporte": False,
}


def _preferences_path() -> Path:
    return Path(settings.BASE_DIR) / PREFERENCES_FILENAME


def _normalizar_preferencias(payload: dict[str, Any] | None) -> dict[str, Any]:
    base = dict(DEFAULT_PREFERENCES)
    if not payload:
        return base
    if "exibir_orgao_suporte" in payload:
        base["exibir_orgao_suporte"] = bool(payload["exibir_orgao_suporte"])
    return base


def obter_preferencias() -> dict[str, Any]:
    path = _preferences_path()
    if not path.exists():
        return dict(DEFAULT_PREFERENCES)

    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return dict(DEFAULT_PREFERENCES)

    if not isinstance(payload, dict):
        return dict(DEFAULT_PREFERENCES)
    return _normalizar_preferencias(payload)


def orgao_suporte_visivel() -> bool:
    return bool(obter_preferencias()["exibir_orgao_suporte"])


def definir_exibir_orgao_suporte(valor: bool) -> dict[str, Any]:
    preferencias = _normalizar_preferencias({"exibir_orgao_suporte": valor})
    path = _preferences_path()
    path.write_text(json.dumps(preferencias, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return preferencias
