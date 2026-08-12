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

from .secrets import SegredoError, resolver_segredos


class PainelConfigError(Exception):
    """Erro de leitura da configuracao compartilhada com o AVIPE."""


@dataclass(slots=True)
class Paginacao:
    itens: list[dict[str, Any]]
    pagina: int
    por_pagina: int
    total: int
    total_paginas: int

    @property
    def tem_anterior(self) -> bool:
        return self.pagina > 1

    @property
    def tem_proxima(self) -> bool:
        return self.pagina < self.total_paginas


def carregar_config_avipe() -> configparser.ConfigParser:
    base_dir = Path(settings.BASE_DIR)
    config_path = _resolver_config_path(base_dir)
    override_path = Path(settings.BASE_DIR) / "config.local.ini"

    config = configparser.ConfigParser(interpolation=None)
    config.read(config_path, encoding="utf-8")
    if override_path.exists():
        config.read(override_path, encoding="utf-8")

    if not config.has_section("mysql_avipe"):
        raise PainelConfigError("Secao [mysql_avipe] nao encontrada no config.ini do AVIPE.")

    _aplicar_overrides_de_ambiente(config)

    try:
        resolver_segredos(config)
    except SegredoError as exc:
        valor_senha = config.get("mysql_avipe", "password", fallback="").strip()
        if valor_senha.startswith("kv:"):
            raise PainelConfigError(
                "Nao foi possivel obter a senha do banco no Azure Key Vault. "
                "Para uso local, crie o arquivo 'avipe_painel/config.local.ini' "
                "com a secao [mysql_avipe] e um campo 'password' literal, ou defina "
                "a variavel de ambiente AVIPE_PAINEL_MYSQL_AVIPE_PASSWORD."
            ) from exc
        raise PainelConfigError(str(exc)) from exc

    return config


def _resolver_config_path(base_dir: Path) -> Path:
    local_config = base_dir / "config.ini"
    parent_config = base_dir.parent / "config.ini"

    if local_config.exists():
        return local_config
    if parent_config.exists():
        return parent_config

    raise PainelConfigError(
        "Arquivo de configuracao nao encontrado. "
        "Crie 'config.ini' dentro do avipe_painel ou mantenha '../config.ini' na pasta pai."
    )


def _aplicar_overrides_de_ambiente(config: configparser.ConfigParser) -> None:
    senha = os.getenv("AVIPE_PAINEL_MYSQL_AVIPE_PASSWORD", "").strip()
    if senha:
        config.set("mysql_avipe", "password", senha)


def abrir_conexao():
    config = carregar_config_avipe()
    return mysql.connector.connect(
        host=config.get("mysql_avipe", "host"),
        port=config.getint("mysql_avipe", "port"),
        database=config.get("mysql_avipe", "database"),
        user=config.get("mysql_avipe", "user"),
        password=config.get("mysql_avipe", "password"),
        charset="utf8mb4",
    )


def obter_identidade_execucao() -> dict[str, str]:
    return {
        "ip_cliente": socket.gethostbyname(socket.gethostname()),
        "usuario_logado": getpass.getuser(),
    }


def obter_info_banco() -> dict[str, Any]:
    config = carregar_config_avipe()
    identidade = obter_identidade_execucao()
    return {
        "host": config.get("mysql_avipe", "host"),
        "porta": config.getint("mysql_avipe", "port"),
        "database": config.get("mysql_avipe", "database"),
        "usuario_banco": config.get("mysql_avipe", "user"),
        "ip_cliente": identidade["ip_cliente"],
        "usuario_logado": identidade["usuario_logado"],
    }


def _executar_metricas(where_sql: str = "", params: tuple[Any, ...] = ()) -> dict[str, Any]:
    sql = """
        SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN processado = 0 THEN 1 ELSE 0 END) AS pendentes,
            SUM(CASE WHEN processado = 1 THEN 1 ELSE 0 END) AS processados,
            SUM(CASE WHEN juntado = 1 THEN 1 ELSE 0 END) AS juntados,
            MAX(data_insercao) AS ultima_insercao
        FROM avipe_pesquisa_endereco
    """ + where_sql
    with abrir_conexao() as conn:
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


def buscar_metricas() -> dict[str, Any]:
    identidade = obter_identidade_execucao()
    return {
        "globais": _executar_metricas(),
        "maquina_usuario": _executar_metricas(
            " WHERE ip_cliente = %s AND usuario_logado = %s",
            (identidade["ip_cliente"], identidade["usuario_logado"]),
        ),
    }


def listar_ultimos_registros(limite: int = 10) -> list[dict[str, Any]]:
    sql = """
        SELECT id, nuprocesso, cpf, sig_orgao, ip_cliente, usuario_logado, processado, juntado,
               data_insercao, data_processamento, data_inclusao_localizador
        FROM avipe_pesquisa_endereco
        ORDER BY data_insercao DESC
        LIMIT %s
    """
    with abrir_conexao() as conn:
        with conn.cursor(dictionary=True) as cursor:
            cursor.execute(sql, (limite,))
            return list(cursor.fetchall())


def listar_siglas_orgaos() -> list[str]:
    sql = """
        SELECT DISTINCT sig_orgao
        FROM avipe_pesquisa_endereco
        WHERE sig_orgao IS NOT NULL AND sig_orgao <> ''
        ORDER BY sig_orgao
    """
    with abrir_conexao() as conn:
        with conn.cursor() as cursor:
            cursor.execute(sql)
            return [linha[0] for linha in cursor.fetchall()]


def consultar_registros(
    filtros: dict[str, str],
    pagina: int = 1,
    por_pagina: int = 25,
) -> Paginacao:
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
        where.append("usuario_logado LIKE %s")
        params.append(f"%{filtros['usuario_logado'].strip()}%")
    if filtros.get("data_insercao"):
        where.append("DATE(data_insercao) = %s")
        params.append(filtros["data_insercao"].strip())
    if filtros.get("processado") in {"0", "1"}:
        where.append("processado = %s")
        params.append(int(filtros["processado"]))
    if filtros.get("juntado") in {"0", "1"}:
        where.append("juntado = %s")
        params.append(int(filtros["juntado"]))

    where_sql = f"WHERE {' AND '.join(where)}" if where else ""
    offset = (pagina - 1) * por_pagina

    sql_total = f"SELECT COUNT(*) AS total FROM avipe_pesquisa_endereco {where_sql}"
    sql_registros = f"""
        SELECT id, nuprocesso, cpf, sig_orgao, ip_cliente, usuario_logado,
               data_insercao, data_processamento, data_inclusao_localizador,
               processado, juntado, localizado
        FROM avipe_pesquisa_endereco
        {where_sql}
        ORDER BY data_insercao DESC
        LIMIT %s OFFSET %s
    """

    with abrir_conexao() as conn:
        with conn.cursor(dictionary=True) as cursor:
            cursor.execute(sql_total, params)
            total = cursor.fetchone()["total"]
            cursor.execute(sql_registros, [*params, por_pagina, offset])
            itens = list(cursor.fetchall())

    total_paginas = max(1, math.ceil(total / por_pagina)) if total else 1
    return Paginacao(
        itens=itens,
        pagina=pagina,
        por_pagina=por_pagina,
        total=total,
        total_paginas=total_paginas,
    )


def buscar_registro_detalhe(registro_id: int) -> dict[str, Any] | None:
    sql = """
        SELECT *
        FROM avipe_pesquisa_endereco
        WHERE id = %s
        LIMIT 1
    """
    with abrir_conexao() as conn:
        with conn.cursor(dictionary=True) as cursor:
            cursor.execute(sql, (registro_id,))
            return cursor.fetchone()
