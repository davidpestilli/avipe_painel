import json
from datetime import datetime
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import MagicMock, patch
from zoneinfo import ZoneInfo

from django.test import SimpleTestCase, override_settings

from pesquisas.analytics import buscar_observabilidade
from pesquisas.preferences import (
    ORGAO_SUPORTE,
    DEFAULT_PREFERENCES,
    definir_exibir_orgao_suporte,
    obter_preferencias,
    orgao_suporte_visivel,
)
from pesquisas.services import (
    _anexar_exclusao_orgao_suporte,
    registro_orgao_suporte_oculto,
    sanitizar_filtro_orgao_suporte,
)


class PreferenciasPainelTests(SimpleTestCase):
    def test_preferencias_padrao_quando_arquivo_nao_existe(self):
        with TemporaryDirectory() as temp_dir:
            with override_settings(BASE_DIR=Path(temp_dir)):
                self.assertEqual(obter_preferencias(), DEFAULT_PREFERENCES)
                self.assertFalse(orgao_suporte_visivel())

    def test_salvar_e_ler_preferencia_compartilhada(self):
        with TemporaryDirectory() as temp_dir:
            with override_settings(BASE_DIR=Path(temp_dir)):
                preferencias = definir_exibir_orgao_suporte(True)
                self.assertTrue(preferencias["exibir_orgao_suporte"])
                self.assertTrue(orgao_suporte_visivel())

                arquivo = Path(temp_dir) / "painel_preferences.json"
                payload = json.loads(arquivo.read_text(encoding="utf-8"))
                self.assertTrue(payload["exibir_orgao_suporte"])


class ExclusaoOrgaoSuporteTests(SimpleTestCase):
    @patch("pesquisas.services.orgao_suporte_visivel", return_value=False)
    def test_anexar_exclusao_cria_where_quando_necessario(self, _mock_visivel):
        where_sql, params = _anexar_exclusao_orgao_suporte("", [])
        self.assertEqual(where_sql, "WHERE sig_orgao <> %s")
        self.assertEqual(params, [ORGAO_SUPORTE])

    @patch("pesquisas.services.orgao_suporte_visivel", return_value=False)
    def test_anexar_exclusao_concatena_clausula_existente(self, _mock_visivel):
        where_sql, params = _anexar_exclusao_orgao_suporte("WHERE processado = %s", [1])
        self.assertEqual(where_sql, "WHERE processado = %s AND sig_orgao <> %s")
        self.assertEqual(params, [1, ORGAO_SUPORTE])

    @patch("pesquisas.services.orgao_suporte_visivel", return_value=True)
    def test_anexar_exclusao_nao_altera_quando_visivel(self, _mock_visivel):
        where_sql, params = _anexar_exclusao_orgao_suporte("WHERE processado = %s", [1])
        self.assertEqual(where_sql, "WHERE processado = %s")
        self.assertEqual(params, [1])

    @patch("pesquisas.services.orgao_suporte_visivel", return_value=False)
    def test_sanitizar_filtro_remove_sig_orgao_suporte(self, _mock_visivel):
        filtros = {"sig_orgao": "SUPORTE", "cpf": "123"}
        sanitizado = sanitizar_filtro_orgao_suporte(filtros)
        self.assertEqual(sanitizado["sig_orgao"], "")
        self.assertEqual(sanitizado["cpf"], "123")

    @patch("pesquisas.services.orgao_suporte_visivel", return_value=False)
    def test_registro_suporte_fica_oculto(self, _mock_visivel):
        self.assertTrue(registro_orgao_suporte_oculto({"sig_orgao": "SUPORTE"}))
        self.assertFalse(registro_orgao_suporte_oculto({"sig_orgao": "TRF3"}))


class ObservabilidadeEntradaPorOrgaoTests(SimpleTestCase):
    @patch("pesquisas.analytics._agora_local", return_value=datetime(2026, 9, 3, 10, 30, tzinfo=ZoneInfo("America/Sao_Paulo")))
    @patch("pesquisas.analytics._anexar_exclusao_orgao_suporte", return_value=("", []))
    @patch("pesquisas.analytics.abrir_conexao")
    def test_separa_processos_distintos_dos_registros_no_tooltip(self, mock_abrir_conexao, _mock_exclusao, _mock_agora):
        cursor = MagicMock()
        cursor.fetchall.return_value = [
            {
                "nuprocesso": "0001",
                "sig_orgao": "CENTRAL",
                "data_inclusao_localizador": "03/09/2026 10:00:00",
                "data_processamento": None,
                "processado": 0,
                "juntado": 0,
            },
            {
                "nuprocesso": "0001",
                "sig_orgao": "CENTRAL",
                "data_inclusao_localizador": "03/09/2026 10:15:00",
                "data_processamento": None,
                "processado": 0,
                "juntado": 0,
            },
        ]
        connection = MagicMock()
        connection.cursor.return_value.__enter__.return_value = cursor
        mock_abrir_conexao.return_value.__enter__.return_value = connection

        resposta = buscar_observabilidade("today")
        ponto = resposta["inclusao_vs_processamento"]["evolucao"][0]

        self.assertEqual(ponto["orgaos_entrada_registros"], [{"orgao": "CENTRAL", "quantidade": 2}])
        self.assertEqual(ponto["orgaos_entrada_processos"], [{"orgao": "CENTRAL", "quantidade": 1}])
