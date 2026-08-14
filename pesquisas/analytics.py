from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

from .services import abrir_conexao

_UTC = ZoneInfo("UTC")
_SAO_PAULO = ZoneInfo("America/Sao_Paulo")

PERIOD_CONFIG = {
    "today": {"label": "Hoje", "kind": "calendar", "hours": 24, "bucket_hours": 1},
    "24h": {"label": "Ultimas 24h", "kind": "rolling", "hours": 24, "bucket_hours": 2},
    "48h": {"label": "Ultimas 48h", "kind": "rolling", "hours": 48, "bucket_hours": 8},
    "72h": {"label": "Ultimas 72h", "kind": "rolling", "hours": 72, "bucket_hours": 18},
    "week": {"label": "Esta semana", "kind": "calendar_week", "bucket_hours": 24},
    "7d": {"label": "Ultimos 7 dias", "kind": "rolling", "hours": 24 * 7, "bucket_hours": 24},
    "month": {"label": "Este mes", "kind": "calendar_month", "bucket_hours": 24},
    "30d": {"label": "Ultimos 30 dias", "kind": "rolling", "hours": 24 * 30, "bucket_hours": 24},
    "all": {"label": "Todo periodo", "kind": "all", "bucket_hours": 24},
}


@dataclass(slots=True)
class PeriodWindow:
    key: str
    label: str
    kind: str
    start_local: datetime | None
    end_local: datetime
    bucket_hours: int


def _agora_local() -> datetime:
    return datetime.now(_SAO_PAULO).replace(microsecond=0)


def _inicio_semana_domingo(base: datetime) -> datetime:
    dias_desde_domingo = (base.weekday() + 1) % 7
    return (base - timedelta(days=dias_desde_domingo)).replace(hour=0, minute=0, second=0, microsecond=0)


def construir_periodo(period_key: str) -> PeriodWindow:
    config = PERIOD_CONFIG.get(period_key, PERIOD_CONFIG["today"])
    agora = _agora_local()
    kind = config["kind"]

    if kind == "calendar":
        inicio = agora.replace(hour=0, minute=0, second=0, microsecond=0)
    elif kind == "rolling":
        inicio = agora - timedelta(hours=int(config["hours"]))
    elif kind == "calendar_week":
        inicio = _inicio_semana_domingo(agora)
    elif kind == "calendar_month":
        inicio = agora.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        inicio = None

    return PeriodWindow(
        key=period_key if period_key in PERIOD_CONFIG else "today",
        label=str(config["label"]),
        kind=str(kind),
        start_local=inicio,
        end_local=agora,
        bucket_hours=int(config["bucket_hours"]),
    )


def _normalizar_data_utc(valor: datetime | None) -> datetime | None:
    if valor is None:
        return None
    base = valor.replace(tzinfo=_UTC) if valor.tzinfo is None else valor
    return base.astimezone(_SAO_PAULO)


def _parse_data_localizador(valor: str | None) -> datetime | None:
    if not valor:
        return None
    try:
        return datetime.strptime(valor, "%d/%m/%Y %H:%M:%S").replace(tzinfo=_SAO_PAULO)
    except ValueError:
        return None


def _bucket_inicio(valor: datetime, horas_por_bucket: int) -> datetime:
    base = valor.replace(minute=0, second=0, microsecond=0)
    if horas_por_bucket <= 1:
        return base
    hora_bucket = (base.hour // horas_por_bucket) * horas_por_bucket
    return base.replace(hour=hora_bucket)


def _bucket_rolling_fim(valor: datetime, periodo: PeriodWindow) -> datetime:
    if periodo.start_local is None:
        return periodo.end_local

    delta = periodo.end_local - valor
    bucket_span = timedelta(hours=periodo.bucket_hours)
    indice = int(delta.total_seconds() // bucket_span.total_seconds())
    bucket_fim = periodo.end_local - (bucket_span * indice)

    if bucket_fim < valor:
        bucket_fim += bucket_span
    if bucket_fim > periodo.end_local:
        bucket_fim = periodo.end_local
    return bucket_fim


def _iterar_buckets_periodo(periodo: PeriodWindow, buckets_existentes: set[datetime]) -> list[datetime]:
    if periodo.kind != "rolling" or periodo.start_local is None:
        return sorted(buckets_existentes)

    bucket_span = timedelta(hours=periodo.bucket_hours)
    atual = periodo.start_local + bucket_span
    buckets: list[datetime] = []
    while atual < periodo.end_local:
        buckets.append(atual)
        atual += bucket_span
    buckets.append(periodo.end_local)
    return buckets


def _formatar_bucket(valor: datetime, horas_por_bucket: int) -> str:
    if horas_por_bucket >= 24:
        return valor.strftime("%d/%m")
    if horas_por_bucket in {8, 18}:
        return valor.strftime("%d/%m %Hh")
    if valor.minute or valor.second:
        return valor.strftime("%Hh")
    if horas_por_bucket == 1:
        return valor.strftime("%Hh")
    fim = valor + timedelta(hours=horas_por_bucket)
    return f"{valor.strftime('%d/%m %Hh')} - {fim.strftime('%Hh')}"


def _esta_no_periodo(valor: datetime | None, periodo: PeriodWindow) -> bool:
    if valor is None:
        return False
    if periodo.start_local is None:
        return valor <= periodo.end_local
    return periodo.start_local <= valor <= periodo.end_local


def _ordenar_orgaos(mapa: dict[str, int]) -> list[str]:
    return [orgao for orgao, _ in sorted(mapa.items(), key=lambda item: (-item[1], item[0]))]


def _incrementar_set(
    mapa: dict[Any, set[str]],
    chave: Any,
    processo: str | None,
) -> None:
    if processo:
        mapa[chave].add(processo)


def buscar_observabilidade(period_key: str) -> dict[str, Any]:
    periodo = construir_periodo(period_key)
    sql = """
        SELECT nuprocesso, sig_orgao, data_inclusao_localizador, data_processamento, processado, juntado
        FROM avipe_pesquisa_endereco
    """

    with abrir_conexao() as conn:
        with conn.cursor(dictionary=True) as cursor:
            cursor.execute(sql)
            linhas = list(cursor.fetchall())

    inclusoes_registros_por_orgao: dict[str, int] = defaultdict(int)
    inclusoes_processos_por_orgao: dict[str, set[str]] = defaultdict(set)
    inclusoes_timeline_registros: dict[datetime, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    inclusoes_timeline_processos: dict[datetime, dict[str, set[str]]] = defaultdict(lambda: defaultdict(set))

    throughput_timeline_registros: dict[datetime, dict[str, int]] = defaultdict(
        lambda: {"inclusoes": 0, "processamentos": 0}
    )
    throughput_timeline_processos: dict[datetime, dict[str, set[str]]] = defaultdict(
        lambda: {"inclusoes": set(), "processamentos": set()}
    )

    processados_por_orgao: dict[str, dict[str, int]] = defaultdict(lambda: {"processados": 0, "juntados": 0})
    processados_processos_por_orgao: dict[str, dict[str, set[str]]] = defaultdict(
        lambda: {"processados": set(), "juntados": set()}
    )
    processados_timeline: dict[datetime, dict[str, dict[str, int]]] = defaultdict(
        lambda: defaultdict(lambda: {"processados": 0, "juntados": 0})
    )
    processados_timeline_processos: dict[datetime, dict[str, dict[str, set[str]]]] = defaultdict(
        lambda: defaultdict(lambda: {"processados": set(), "juntados": set()})
    )

    for linha in linhas:
        processo = (linha.get("nuprocesso") or "").strip() or None
        orgao = (linha.get("sig_orgao") or "Sem orgao").strip() or "Sem orgao"
        inclusao_localizador = _parse_data_localizador(linha.get("data_inclusao_localizador"))
        data_processamento = _normalizar_data_utc(linha.get("data_processamento"))
        processado = int(linha.get("processado") or 0)
        juntado = int(linha.get("juntado") or 0)

        if _esta_no_periodo(inclusao_localizador, periodo):
            inclusoes_registros_por_orgao[orgao] += 1
            _incrementar_set(inclusoes_processos_por_orgao, orgao, processo)

            bucket = (
                _bucket_rolling_fim(inclusao_localizador, periodo)
                if periodo.kind == "rolling"
                else _bucket_inicio(inclusao_localizador, periodo.bucket_hours)
            )
            inclusoes_timeline_registros[bucket][orgao] += 1
            if processo:
                inclusoes_timeline_processos[bucket][orgao].add(processo)
            throughput_timeline_registros[bucket]["inclusoes"] += 1
            if processo:
                throughput_timeline_processos[bucket]["inclusoes"].add(processo)

        if _esta_no_periodo(data_processamento, periodo):
            bucket = (
                _bucket_rolling_fim(data_processamento, periodo)
                if periodo.kind == "rolling"
                else _bucket_inicio(data_processamento, periodo.bucket_hours)
            )
            throughput_timeline_registros[bucket]["processamentos"] += 1
            if processo:
                throughput_timeline_processos[bucket]["processamentos"].add(processo)
            if processado:
                processados_por_orgao[orgao]["processados"] += 1
                processados_timeline[bucket][orgao]["processados"] += 1
                if processo:
                    processados_processos_por_orgao[orgao]["processados"].add(processo)
                    processados_timeline_processos[bucket][orgao]["processados"].add(processo)
            if juntado:
                processados_por_orgao[orgao]["juntados"] += 1
                processados_timeline[bucket][orgao]["juntados"] += 1
                if processo:
                    processados_processos_por_orgao[orgao]["juntados"].add(processo)
                    processados_timeline_processos[bucket][orgao]["juntados"].add(processo)

    orgaos_ordenados = _ordenar_orgaos(
        inclusoes_registros_por_orgao
        or {orgao: dados["processados"] for orgao, dados in processados_por_orgao.items()}
    )
    if not orgaos_ordenados:
        orgaos_ordenados = _ordenar_orgaos(
            {
                orgao: dados["processados"] + dados["juntados"]
                for orgao, dados in processados_por_orgao.items()
            }
        )

    timeline_inclusoes = []
    for bucket in _iterar_buckets_periodo(
        periodo,
        set(inclusoes_timeline_registros) | set(inclusoes_timeline_processos),
    ):
        por_orgao_registros = inclusoes_timeline_registros.get(bucket, {})
        por_orgao_processos = inclusoes_timeline_processos.get(bucket, {})
        registro: dict[str, Any] = {
            "bucket": bucket.isoformat(),
            "label": _formatar_bucket(bucket, periodo.bucket_hours),
            "total": sum(por_orgao_registros.values()),
            "registros": sum(por_orgao_registros.values()),
            "processos": sum(len(processos) for processos in por_orgao_processos.values()),
        }
        for orgao, total in por_orgao_registros.items():
            registro[f"{orgao}__registros"] = total
        for orgao, processos in por_orgao_processos.items():
            registro[f"{orgao}__processos"] = len(processos)
        timeline_inclusoes.append(registro)

    timeline_throughput = []
    for bucket in _iterar_buckets_periodo(
        periodo,
        set(throughput_timeline_registros) | set(throughput_timeline_processos),
    ):
        totais_registros = throughput_timeline_registros.get(bucket, {"inclusoes": 0, "processamentos": 0})
        totais_processos = throughput_timeline_processos.get(
            bucket,
            {"inclusoes": set(), "processamentos": set()},
        )
        timeline_throughput.append(
            {
                "bucket": bucket.isoformat(),
                "label": _formatar_bucket(bucket, periodo.bucket_hours),
                "inclusoes": totais_registros["inclusoes"],
                "processamentos": totais_registros["processamentos"],
                "inclusoes_registros": totais_registros["inclusoes"],
                "inclusoes_processos": len(totais_processos["inclusoes"]),
                "processamentos_registros": totais_registros["processamentos"],
                "processamentos_processos": len(totais_processos["processamentos"]),
            }
        )

    timeline_status = []
    for bucket in _iterar_buckets_periodo(
        periodo,
        set(processados_timeline) | set(processados_timeline_processos),
    ):
        registro = {
            "bucket": bucket.isoformat(),
            "label": _formatar_bucket(bucket, periodo.bucket_hours),
        }
        for orgao, dados in processados_timeline.get(bucket, {}).items():
            registro[f"{orgao}__processados"] = dados["processados"]
            registro[f"{orgao}__juntados"] = dados["juntados"]
            registro[f"{orgao}__processados_registros"] = dados["processados"]
            registro[f"{orgao}__juntados_registros"] = dados["juntados"]
        for orgao, dados in processados_timeline_processos.get(bucket, {}).items():
            registro[f"{orgao}__processados_processos"] = len(dados["processados"])
            registro[f"{orgao}__juntados_processos"] = len(dados["juntados"])
        timeline_status.append(registro)

    return {
        "periodo": {
            "selecionado": periodo.key,
            "rotulo": periodo.label,
            "inicio": periodo.start_local.isoformat() if periodo.start_local else None,
            "fim": periodo.end_local.isoformat(),
            "granularidade_horas": periodo.bucket_hours,
        },
        "orgaos_disponiveis": orgaos_ordenados,
        "entrada_localizador_por_orgao": {
            "resumo": {
                "total": sum(inclusoes_registros_por_orgao.values()),
                "registros": sum(inclusoes_registros_por_orgao.values()),
                "processos": sum(len(processos) for processos in inclusoes_processos_por_orgao.values()),
                "orgaos_ativos": sum(1 for total in inclusoes_registros_por_orgao.values() if total > 0),
            },
            "totais_por_orgao": [
                {
                    "orgao": orgao,
                    "total": inclusoes_registros_por_orgao.get(orgao, 0),
                    "registros": inclusoes_registros_por_orgao.get(orgao, 0),
                    "processos": len(inclusoes_processos_por_orgao.get(orgao, set())),
                }
                for orgao in orgaos_ordenados
                if inclusoes_registros_por_orgao.get(orgao, 0) > 0
            ],
            "evolucao": timeline_inclusoes,
        },
        "inclusao_vs_processamento": {
            "resumo": {
                "inclusoes": sum(item["inclusoes"] for item in timeline_throughput),
                "processamentos": sum(item["processamentos"] for item in timeline_throughput),
                "inclusoes_registros": sum(item["inclusoes_registros"] for item in timeline_throughput),
                "inclusoes_processos": sum(item["inclusoes_processos"] for item in timeline_throughput),
                "processamentos_registros": sum(item["processamentos_registros"] for item in timeline_throughput),
                "processamentos_processos": sum(item["processamentos_processos"] for item in timeline_throughput),
            },
            "evolucao": timeline_throughput,
        },
        "status_por_orgao": {
            "resumo": {
                "processados": sum(item["processados"] for item in processados_por_orgao.values()),
                "juntados": sum(item["juntados"] for item in processados_por_orgao.values()),
                "processados_registros": sum(item["processados"] for item in processados_por_orgao.values()),
                "processados_processos": sum(
                    len(item["processados"]) for item in processados_processos_por_orgao.values()
                ),
                "juntados_registros": sum(item["juntados"] for item in processados_por_orgao.values()),
                "juntados_processos": sum(
                    len(item["juntados"]) for item in processados_processos_por_orgao.values()
                ),
            },
            "totais_por_orgao": [
                {
                    "orgao": orgao,
                    "processados": processados_por_orgao.get(orgao, {}).get("processados", 0),
                    "juntados": processados_por_orgao.get(orgao, {}).get("juntados", 0),
                    "processados_registros": processados_por_orgao.get(orgao, {}).get("processados", 0),
                    "processados_processos": len(
                        processados_processos_por_orgao.get(orgao, {}).get("processados", set())
                    ),
                    "juntados_registros": processados_por_orgao.get(orgao, {}).get("juntados", 0),
                    "juntados_processos": len(
                        processados_processos_por_orgao.get(orgao, {}).get("juntados", set())
                    ),
                }
                for orgao in _ordenar_orgaos(
                    {
                        orgao: dados["processados"] + dados["juntados"]
                        for orgao, dados in processados_por_orgao.items()
                    }
                )
            ],
            "evolucao": timeline_status,
        },
    }
