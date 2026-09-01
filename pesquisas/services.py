from __future__ import annotations

import configparser
import getpass
import math
import os
import socket
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import mysql.connector
from django.conf import settings
from django.http import HttpRequest

from .preferences import ORGAO_SUPORTE, orgao_suporte_visivel
from .secrets import SegredoError, resolver_segredos

AMBIENTE_PADRAO = "app"
AMBIENTES_CONHECIDOS = ("app", "hml", "prd")


class PainelConfigError(Exception):
    """Erro de leitura da configuracao compartilhada com o AVIPE."""


@dataclass(slots=True)
class Paginacao:
    itens: list[dict[str, Any]]
    pagina: int
    por_pagina: int
    total: int
    total_processos: int
    total_paginas: int

    @property
    def tem_anterior(self) -> bool:
        return self.pagina > 1

    @property
    def tem_proxima(self) -> bool:
        return self.pagina < self.total_paginas


def _normalizar_processo(valor: Any) -> str:
    texto = str(valor or "").strip()
    return texto or "Sem processo"


def _anexar_exclusao_orgao_suporte(where_sql: str, params: list[Any]) -> tuple[str, list[Any]]:
    if orgao_suporte_visivel():
        return where_sql, params

    clausula = "sig_orgao <> %s"
    if where_sql:
        return f"{where_sql} AND {clausula}", [*params, ORGAO_SUPORTE]
    return f"WHERE {clausula}", [ORGAO_SUPORTE]


def _anexar_filtro_registros(
    where_sql: str,
    params: list[Any],
    registro_ids: list[int] | None,
    excluir_registro_ids: list[int] | None,
) -> tuple[str, list[Any]]:
    """Aplica os IDs calculados pelo modulo de analises sem acoplar os bancos."""
    ids = registro_ids if registro_ids is not None else excluir_registro_ids
    if ids is None:
        return where_sql, params
    if not ids:
        if registro_ids is None:
            return where_sql, params
        clausula = "1 = 0"
        return (f"{where_sql} AND {clausula}" if where_sql else f"WHERE {clausula}"), params

    marcadores = ", ".join(["%s"] * len(ids))
    operador = "IN" if registro_ids is not None else "NOT IN"
    clausula = f"id {operador} ({marcadores})"
    return (f"{where_sql} AND {clausula}" if where_sql else f"WHERE {clausula}"), [*params, *ids]


def sanitizar_filtro_orgao_suporte(filtros: dict[str, str]) -> dict[str, str]:
    if orgao_suporte_visivel():
        return filtros
    if filtros.get("sig_orgao", "").strip().upper() == ORGAO_SUPORTE:
        return {**filtros, "sig_orgao": ""}
    return filtros


def registro_orgao_suporte_oculto(registro: dict[str, Any] | None) -> bool:
    if not registro or orgao_suporte_visivel():
        return False
    return (registro.get("sig_orgao") or "").strip().upper() == ORGAO_SUPORTE


def _construir_filtros_where(filtros: dict[str, str]) -> tuple[str, list[Any]]:
    where = []
    params: list[Any] = []

    if filtros.get("nuprocesso"):
        where.append("nuprocesso LIKE %s")
        params.append(f"%{filtros['nuprocesso'].strip()}%")
    if filtros.get("cpf"):
        where.append("cpf LIKE %s")
        params.append(f"%{filtros['cpf'].strip()}%")
    if filtros.get("sig_orgao"):
        where.append("sig_orgao = %s")
        params.append(filtros["sig_orgao"].strip())
    if filtros.get("usuario_logado"):
        where.append("usuario_logado = %s")
        params.append(filtros["usuario_logado"].strip())
    data_insercao_status = filtros.get("data_insercao_status", "").strip()
    data_insercao_inicio = filtros.get("data_insercao_inicio", "").strip()
    data_insercao_fim = filtros.get("data_insercao_fim", "").strip() or data_insercao_inicio
    if data_insercao_status == "filled" and data_insercao_inicio:
        where.append("DATE(data_insercao) >= %s")
        params.append(data_insercao_inicio)
        where.append("DATE(data_insercao) <= %s")
        params.append(data_insercao_fim)
    if filtros.get("processado") in {"0", "1"}:
        where.append("processado = %s")
        params.append(int(filtros["processado"]))
    data_processamento_status = filtros.get("data_processamento_status", "").strip()
    data_processamento_inicio = filtros.get("data_processamento_inicio", "").strip()
    data_processamento_fim = filtros.get("data_processamento_fim", "").strip() or data_processamento_inicio
    if data_processamento_status == "null":
        where.append("data_processamento IS NULL")
    else:
        if data_processamento_status == "filled":
            where.append("data_processamento IS NOT NULL")
        if data_processamento_inicio:
            where.append("DATE(data_processamento) >= %s")
            params.append(data_processamento_inicio)
            where.append("DATE(data_processamento) <= %s")
            params.append(data_processamento_fim)
    if filtros.get("juntado") == "pending":
        where.append("(juntado = 0 OR juntado IS NULL)")
    elif filtros.get("juntado") in {"0", "1"}:
        where.append("juntado = %s")
        params.append(int(filtros["juntado"]))
    elif filtros.get("juntado") == "null":
        where.append("juntado IS NULL")

    where_sql = f"WHERE {' AND '.join(where)}" if where else ""
    return _anexar_exclusao_orgao_suporte(where_sql, params)


def normalizar_ambiente(ambiente: str | None) -> str:
    valor = (ambiente or AMBIENTE_PADRAO).strip().lower()
    return valor or AMBIENTE_PADRAO


def resolver_ambiente_request(request: HttpRequest) -> str:
    return normalizar_ambiente(request.GET.get("ambiente"))


def carregar_config_avipe(ambiente: str = AMBIENTE_PADRAO) -> configparser.ConfigParser:
    config = _carregar_config_base()
    ambiente_normalizado = normalizar_ambiente(ambiente)
    secao_mysql = _resolver_secao_mysql(config, ambiente_normalizado)

    if not secao_mysql:
        raise PainelConfigError(
            f"Configuracao do ambiente '{ambiente_normalizado}' nao encontrada. "
            "Defina a secao correspondente no config.ini."
        )

    config_ambiente = _extrair_config_ambiente(config, ambiente_normalizado, secao_mysql)
    _aplicar_overrides_de_ambiente(config_ambiente, ambiente_normalizado)

    try:
        resolver_segredos(config_ambiente)
    except SegredoError as exc:
        valor_senha = config_ambiente.get("mysql_avipe", "password", fallback="").strip()
        if valor_senha.startswith("kv:"):
            raise PainelConfigError(
                "Nao foi possivel obter a senha do banco no Azure Key Vault. "
                "Para uso local, crie o arquivo 'avipe_painel/config.local.ini' "
                "com a secao [mysql_avipe] e um campo 'password' literal, ou defina "
                "a variavel de ambiente AVIPE_PAINEL_MYSQL_AVIPE_PASSWORD."
            ) from exc
        raise PainelConfigError(str(exc)) from exc

    return config_ambiente


def listar_ambientes_disponiveis() -> list[dict[str, str]]:
    config = _carregar_config_base()
    ambientes: list[dict[str, str]] = []

    for ambiente in AMBIENTES_CONHECIDOS:
        secao_mysql = _resolver_secao_mysql(config, ambiente)
        if not secao_mysql:
            continue
        secao_azure = _resolver_secao_azure(config, ambiente)
        ambientes.append(
            {
                "id": ambiente,
                "rotulo": ambiente.upper(),
                "mysql_section": secao_mysql,
                "azure_section": secao_azure or "",
                "key_vault_url": config.get(secao_azure, "key_vault_url", fallback="").strip() if secao_azure else "",
            }
        )

    if ambientes:
        return ambientes

    return [
        {
            "id": AMBIENTE_PADRAO,
            "rotulo": AMBIENTE_PADRAO.upper(),
            "mysql_section": "mysql_avipe",
            "azure_section": "azure",
            "key_vault_url": "",
        }
    ]


def _carregar_config_base() -> configparser.ConfigParser:
    base_dir = Path(settings.BASE_DIR)
    config_path = _resolver_config_path(base_dir)
    override_path = Path(settings.BASE_DIR) / "config.local.ini"

    config = configparser.ConfigParser(interpolation=None)
    config.read(config_path, encoding="utf-8")
    if override_path.exists():
        config.read(override_path, encoding="utf-8")
    return config


def _resolver_config_path(base_dir: Path) -> Path:
    local_config = base_dir / "config.ini"

    if local_config.exists():
        return local_config

    raise PainelConfigError(
        "Arquivo de configuracao nao encontrado. "
        "Crie 'config.ini' na raiz do projeto."
    )


def _resolver_secao_mysql(config: configparser.ConfigParser, ambiente: str) -> str | None:
    candidatos = [f"mysql_avipe_{ambiente}"]
    if ambiente == AMBIENTE_PADRAO:
        candidatos.append("mysql_avipe")

    for secao in candidatos:
        if config.has_section(secao):
            return secao
    return None


def _resolver_secao_azure(config: configparser.ConfigParser, ambiente: str) -> str | None:
    candidatos = [f"azure_{ambiente}"]
    if ambiente == AMBIENTE_PADRAO:
        candidatos.append("azure")

    for secao in candidatos:
        if config.has_section(secao):
            return secao
    return None


def _extrair_config_ambiente(
    config: configparser.ConfigParser,
    ambiente: str,
    secao_mysql: str,
) -> configparser.ConfigParser:
    config_ambiente = configparser.ConfigParser(interpolation=None)
    config_ambiente["mysql_avipe"] = dict(config.items(secao_mysql, raw=True))

    secao_azure = _resolver_secao_azure(config, ambiente)
    if secao_azure:
        config_ambiente["azure"] = dict(config.items(secao_azure, raw=True))

    return config_ambiente


def _aplicar_overrides_de_ambiente(config: configparser.ConfigParser, ambiente: str) -> None:
    chaves = [
        f"AVIPE_PAINEL_MYSQL_AVIPE_PASSWORD_{ambiente.upper()}",
        "AVIPE_PAINEL_MYSQL_AVIPE_PASSWORD",
    ]
    senha = ""
    for chave in chaves:
        senha = os.getenv(chave, "").strip()
        if senha:
            break
    if senha:
        config.set("mysql_avipe", "password", senha)


def abrir_conexao(ambiente: str = AMBIENTE_PADRAO):
    config = carregar_config_avipe(ambiente)
    conn_kwargs: dict[str, Any] = {
        "host": config.get("mysql_avipe", "host"),
        "port": config.getint("mysql_avipe", "port"),
        "database": config.get("mysql_avipe", "database"),
        "user": config.get("mysql_avipe", "user"),
        "password": config.get("mysql_avipe", "password"),
        "charset": "utf8mb4",
    }

    ssl_ca = config.get("mysql_avipe", "ssl_ca", fallback="").strip()
    ssl_cert = config.get("mysql_avipe", "ssl_cert", fallback="").strip()
    ssl_key = config.get("mysql_avipe", "ssl_key", fallback="").strip()
    ssl_verify_cert = config.get("mysql_avipe", "ssl_verify_cert", fallback="").strip().lower()
    ssl_verify_identity = config.get("mysql_avipe", "ssl_verify_identity", fallback="").strip().lower()

    if ssl_ca:
        conn_kwargs["ssl_ca"] = ssl_ca
    if ssl_cert:
        conn_kwargs["ssl_cert"] = ssl_cert
    if ssl_key:
        conn_kwargs["ssl_key"] = ssl_key
    if ssl_verify_cert in {"1", "true", "yes", "on"}:
        conn_kwargs["ssl_verify_cert"] = True
    if ssl_verify_identity in {"1", "true", "yes", "on"}:
        conn_kwargs["ssl_verify_identity"] = True

    return mysql.connector.connect(
        **conn_kwargs,
    )


def obter_identidade_execucao() -> dict[str, str]:
    return {
        "ip_cliente": socket.gethostbyname(socket.gethostname()),
        "usuario_logado": getpass.getuser(),
    }


def obter_info_banco(ambiente: str = AMBIENTE_PADRAO) -> dict[str, Any]:
    config = carregar_config_avipe(ambiente)
    identidade = obter_identidade_execucao()
    return {
        "ambiente": normalizar_ambiente(ambiente),
        "host": config.get("mysql_avipe", "host"),
        "porta": config.getint("mysql_avipe", "port"),
        "database": config.get("mysql_avipe", "database"),
        "usuario_banco": config.get("mysql_avipe", "user"),
        "key_vault_url": config.get("azure", "key_vault_url", fallback="").strip(),
        "ip_cliente": identidade["ip_cliente"],
        "usuario_logado": identidade["usuario_logado"],
    }


def _executar_metricas(
    where_sql: str = "",
    params: tuple[Any, ...] = (),
    ambiente: str = AMBIENTE_PADRAO,
) -> dict[str, Any]:
    sql = """
        SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN processado = 0 THEN 1 ELSE 0 END) AS pendentes,
            SUM(CASE WHEN processado = 1 THEN 1 ELSE 0 END) AS processados,
            SUM(CASE WHEN juntado = 1 THEN 1 ELSE 0 END) AS juntados,
            MAX(data_insercao) AS ultima_insercao
        FROM avipe_pesquisa_endereco
    """ + where_sql
    with abrir_conexao(ambiente) as conn:
        with conn.cursor(dictionary=True) as cursor:
            cursor.execute(sql, params)
            dados = cursor.fetchone() or {}
    return {
        "total": dados.get("total") or 0,
        "pendentes": dados.get("pendentes") or 0,
        "processados": dados.get("processados") or 0,
        "juntados": dados.get("juntados") or 0,
        "ultima_insercao": dados.get("ultima_insercao"),
    }


def buscar_metricas(ambiente: str = AMBIENTE_PADRAO) -> dict[str, Any]:
    identidade = obter_identidade_execucao()
    where_globais, params_globais = _anexar_exclusao_orgao_suporte("", [])
    where_maquina, params_maquina = _anexar_exclusao_orgao_suporte(
        "WHERE ip_cliente = %s AND usuario_logado = %s",
        [identidade["ip_cliente"], identidade["usuario_logado"]],
    )
    return {
        "globais": _executar_metricas(where_globais, tuple(params_globais), ambiente=ambiente),
        "maquina_usuario": _executar_metricas(where_maquina, tuple(params_maquina), ambiente=ambiente),
    }


def listar_ultimos_registros(limite: int = 10, ambiente: str = AMBIENTE_PADRAO) -> list[dict[str, Any]]:
    where_sql, params = _anexar_exclusao_orgao_suporte("", [])
    sql = f"""
        SELECT id, nuprocesso, cpf, sig_orgao, ip_cliente, usuario_logado, processado, juntado,
               data_insercao, data_processamento, data_inclusao_localizador
        FROM avipe_pesquisa_endereco
        {where_sql}
        ORDER BY data_insercao DESC
        LIMIT %s
    """
    with abrir_conexao(ambiente) as conn:
        with conn.cursor(dictionary=True) as cursor:
            cursor.execute(sql, [*params, limite])
            return list(cursor.fetchall())


def listar_siglas_orgaos(ambiente: str = AMBIENTE_PADRAO) -> list[str]:
    where_sql, params = _anexar_exclusao_orgao_suporte(
        "WHERE sig_orgao IS NOT NULL AND sig_orgao <> ''",
        [],
    )
    sql = f"""
        SELECT DISTINCT sig_orgao
        FROM avipe_pesquisa_endereco
        {where_sql}
        ORDER BY sig_orgao
    """
    with abrir_conexao(ambiente) as conn:
        with conn.cursor() as cursor:
            cursor.execute(sql, params)
            return [linha[0] for linha in cursor.fetchall()]


def listar_usuarios_logados(ambiente: str = AMBIENTE_PADRAO) -> list[str]:
    sql = """
        SELECT DISTINCT usuario_logado
        FROM avipe_pesquisa_endereco
        WHERE usuario_logado IS NOT NULL AND usuario_logado <> ''
        ORDER BY usuario_logado
    """
    with abrir_conexao(ambiente) as conn:
        with conn.cursor() as cursor:
            cursor.execute(sql)
            return [linha[0] for linha in cursor.fetchall()]


def consultar_registros(
    filtros: dict[str, str],
    pagina: int = 1,
    por_pagina: int = 25,
    ambiente: str = AMBIENTE_PADRAO,
    registro_ids: list[int] | None = None,
    excluir_registro_ids: list[int] | None = None,
) -> Paginacao:
    where_sql, params = _construir_filtros_where(filtros)
    where_sql, params = _anexar_filtro_registros(where_sql, params, registro_ids, excluir_registro_ids)
    offset = (pagina - 1) * por_pagina

    sql_total = f"SELECT COUNT(*) AS total FROM avipe_pesquisa_endereco {where_sql}"
    sql_total_processos = f"""
        SELECT COUNT(DISTINCT COALESCE(NULLIF(TRIM(nuprocesso), ''), '__SEM_PROCESSO__')) AS total_processos
        FROM avipe_pesquisa_endereco
        {where_sql}
    """
    sql_registros = f"""
        SELECT id, nuprocesso, cpf, sig_orgao, ip_cliente, usuario_logado,
               data_insercao, data_processamento, data_inclusao_localizador,
               processado, juntado, localizado
        FROM avipe_pesquisa_endereco
        {where_sql}
        ORDER BY data_insercao DESC
        LIMIT %s OFFSET %s
    """

    with abrir_conexao(ambiente) as conn:
        with conn.cursor(dictionary=True) as cursor:
            cursor.execute(sql_total, params)
            total = cursor.fetchone()["total"]
            cursor.execute(sql_total_processos, params)
            total_processos = cursor.fetchone()["total_processos"]
            cursor.execute(sql_registros, [*params, por_pagina, offset])
            itens = list(cursor.fetchall())

    total_paginas = max(1, math.ceil(total / por_pagina)) if total else 1
    return Paginacao(
        itens=itens,
        pagina=pagina,
        por_pagina=por_pagina,
        total=total,
        total_processos=total_processos,
        total_paginas=total_paginas,
    )


def exportar_registros(
    filtros: dict[str, str],
    limite: int = 1000,
    ambiente: str = AMBIENTE_PADRAO,
    registro_ids: list[int] | None = None,
    excluir_registro_ids: list[int] | None = None,
) -> list[dict[str, Any]]:
    where_sql, params = _construir_filtros_where(filtros)
    where_sql, params = _anexar_filtro_registros(where_sql, params, registro_ids, excluir_registro_ids)
    sql = f"""
        SELECT id, nuprocesso, cpf, sig_orgao, ip_cliente, usuario_logado,
               data_insercao, data_processamento, data_inclusao_localizador,
               processado, juntado, localizado
        FROM avipe_pesquisa_endereco
        {where_sql}
        ORDER BY data_insercao DESC, id DESC
        LIMIT %s
    """
    with abrir_conexao(ambiente) as conn:
        with conn.cursor(dictionary=True) as cursor:
            cursor.execute(sql, [*params, limite])
            return list(cursor.fetchall())


def exportar_processos(
    filtros: dict[str, str],
    limite: int = 1000,
    ambiente: str = AMBIENTE_PADRAO,
    registro_ids: list[int] | None = None,
    excluir_registro_ids: list[int] | None = None,
) -> list[dict[str, Any]]:
    where_sql, params = _construir_filtros_where(filtros)
    where_sql, params = _anexar_filtro_registros(where_sql, params, registro_ids, excluir_registro_ids)
    processo_expr = "COALESCE(NULLIF(TRIM(nuprocesso), ''), 'Sem processo')"
    sql = f"""
        SELECT
            grupos.processo AS nuprocesso,
            grupos.total_registros,
            grupos.ultima_insercao AS data_insercao,
            grupos.ultima_inclusao_localizador AS data_inclusao_localizador,
            grupos.ultima_data_processamento AS data_processamento,
            ultimo.sig_orgao,
            ultimo.usuario_logado,
            ultimo.processado,
            ultimo.juntado
        FROM (
            SELECT
                {processo_expr} AS processo,
                COUNT(*) AS total_registros,
                MAX(data_insercao) AS ultima_insercao,
                MAX(data_inclusao_localizador) AS ultima_inclusao_localizador,
                MAX(data_processamento) AS ultima_data_processamento,
                MAX(id) AS maior_id
            FROM avipe_pesquisa_endereco
            {where_sql}
            GROUP BY {processo_expr}
            ORDER BY ultima_insercao DESC, maior_id DESC
            LIMIT %s
        ) AS grupos
        JOIN avipe_pesquisa_endereco AS ultimo
          ON ultimo.id = (
              SELECT sub.id
              FROM avipe_pesquisa_endereco AS sub
              WHERE COALESCE(NULLIF(TRIM(sub.nuprocesso), ''), 'Sem processo') = grupos.processo
              {"AND " + where_sql[6:] if where_sql else ""}
              ORDER BY sub.data_insercao DESC, sub.id DESC
              LIMIT 1
          )
        ORDER BY grupos.ultima_insercao DESC, ultimo.id DESC
    """
    with abrir_conexao(ambiente) as conn:
        with conn.cursor(dictionary=True) as cursor:
            cursor.execute(sql, [*params, limite, *params])
            itens = list(cursor.fetchall())

    for item in itens:
        item["nuprocesso"] = _normalizar_processo(item.get("nuprocesso"))
    return itens


def buscar_registro_detalhe(registro_id: int, ambiente: str = AMBIENTE_PADRAO) -> dict[str, Any] | None:
    sql = """
        SELECT *
        FROM avipe_pesquisa_endereco
        WHERE id = %s
        LIMIT 1
    """
    with abrir_conexao(ambiente) as conn:
        with conn.cursor(dictionary=True) as cursor:
            cursor.execute(sql, (registro_id,))
            return cursor.fetchone()
