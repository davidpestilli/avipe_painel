from __future__ import annotations

from configparser import ConfigParser

_PREFIXO = "kv:"


class SegredoError(Exception):
    """Falha ao resolver segredos do Key Vault."""


def resolver_segredos(config: ConfigParser) -> int:
    vault_url = ""
    if config.has_section("azure"):
        vault_url = config.get("azure", "key_vault_url", fallback="").strip()

    referencias: list[tuple[str, str, str]] = []
    for section in config.sections():
        for option, value in config.items(section, raw=True):
            valor = (value or "").strip()
            if valor.startswith(_PREFIXO):
                referencias.append((section, option, valor[len(_PREFIXO):].strip()))

    if not referencias:
        return 0
    if not vault_url:
        raise SegredoError(
            "Ha campos 'kv:...' no config, mas [azure] key_vault_url nao esta definido."
        )

    client = _criar_client(vault_url)
    cache: dict[str, str] = {}
    for section, option, nome in referencias:
        if not nome:
            raise SegredoError(f"[{section}] {option}: referencia 'kv:' sem nome de segredo.")
        if nome not in cache:
            try:
                cache[nome] = client.get_secret(nome).value
            except Exception as exc:  # pragma: no cover
                raise SegredoError(
                    f"Falha ao obter o segredo '{nome}' do Key Vault {vault_url}: {exc}"
                ) from exc
        config.set(section, option, cache[nome])

    return len(referencias)


def _criar_client(vault_url: str):
    try:
        from azure.identity import DefaultAzureCredential
        from azure.keyvault.secrets import SecretClient
    except ImportError as exc:  # pragma: no cover
        raise SegredoError(
            "Pacotes do Azure nao instalados. Rode: "
            "pip install azure-identity azure-keyvault-secrets"
        ) from exc
    return SecretClient(vault_url=vault_url, credential=DefaultAzureCredential())
