import { FormEvent, useEffect, useState } from "react";
import { fetchConfiguracoes, fetchDashboard, fetchDetalhe, fetchLista, fetchObservabilidade } from "./api";
import { CompactHeader, LoadingOverlay } from "./components/AppShell";
import { DetailPage } from "./components/DetailPage";
import {
  HomeView,
  type ChartMode,
  type FluxoBreakdownMode,
  type HomeChartTab,
  type MetricScope,
  type StatusLayerMode,
} from "./components/HomeDashboard";
import { SearchPage } from "./components/SearchPage";
import { SettingsPage } from "./components/SettingsPage";
import { PesquisaViewMode } from "./components/SearchTable";
import { computeHighlightedOrgans } from "./components/homeDashboardShared";
import type {
  AmbienteDisponivel,
  ConfiguracoesResponse,
  DashboardData,
  DetalheResponse,
  ListaResponse,
  ObservabilidadeResponse,
} from "./types";
import {
  applyFiltersFromParams,
  buildQueryString,
  formatBoolean,
  formatDate,
  formatText,
  getViewFromPath,
  navigateTo,
  type RouteView,
} from "./utils/appHelpers";

const FILTER_KEYS = [
  "nuprocesso",
  "cpf",
  "sig_orgao",
  "usuario_logado",
  "data_insercao_status",
  "data_insercao_inicio",
  "data_insercao_fim",
  "data_processamento_status",
  "data_processamento_inicio",
  "data_processamento_fim",
  "processado",
  "juntado",
] as const;

type FilterKey = (typeof FILTER_KEYS)[number];
type FilterState = Record<FilterKey, string>;

const EMPTY_FILTERS: FilterState = {
  nuprocesso: "",
  cpf: "",
  sig_orgao: "",
  usuario_logado: "",
  data_insercao_status: "",
  data_insercao_inicio: "",
  data_insercao_fim: "",
  data_processamento_status: "",
  data_processamento_inicio: "",
  data_processamento_fim: "",
  processado: "",
  juntado: "",
};

const STORAGE_KEY = "avipe_painel_ambiente";

function App() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [observabilidade, setObservabilidade] = useState<ObservabilidadeResponse | null>(null);
  const [lista, setLista] = useState<ListaResponse | null>(null);
  const [detalhe, setDetalhe] = useState<DetalheResponse | null>(null);
  const [configuracoes, setConfiguracoes] = useState<ConfiguracoesResponse | null>(null);
  const [ambientes, setAmbientes] = useState<AmbienteDisponivel[]>([]);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [currentView, setCurrentView] = useState<RouteView>("home");
  const [selectedAmbiente, setSelectedAmbiente] = useState("app");
  const [loading, setLoading] = useState(true);
  const [loadingHome, setLoadingHome] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState("");
  const [returnQuery, setReturnQuery] = useState("");
  const [periodo, setPeriodo] = useState("today");
  const [fluxoChartMode, setFluxoChartMode] = useState<ChartMode>("line");
  const [statusChartMode, setStatusChartMode] = useState<ChartMode>("bar");
  const [metricScope, setMetricScope] = useState<MetricScope>("registros");
  const [statusLayerMode, setStatusLayerMode] = useState<StatusLayerMode>("both");
  const [fluxoBreakdownMode, setFluxoBreakdownMode] = useState<FluxoBreakdownMode>("processamento");
  const [selectedOrgans, setSelectedOrgans] = useState<string[]>([]);
  const [activeHomeTab, setActiveHomeTab] = useState<HomeChartTab>("fluxo");
  const [showPeriodFilters, setShowPeriodFilters] = useState(false);
  const [pesquisaViewMode, setPesquisaViewMode] = useState<PesquisaViewMode>("agrupada");
  const [expandedProcesses, setExpandedProcesses] = useState<string[]>([]);

  useEffect(() => {
    void bootstrap();

    const handlePopState = () => {
      void syncFromLocation(false);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (currentView === "home") {
      void loadObservabilidade(periodo, selectedAmbiente);
    }
  }, [periodo, currentView, selectedAmbiente]);

  useEffect(() => {
    if (currentView !== "home" || !observabilidade) {
      return;
    }
    setSelectedOrgans(computeHighlightedOrgans(observabilidade, metricScope));
  }, [observabilidade, metricScope, currentView]);

  async function bootstrap() {
    setLoading(true);
    try {
      const ambienteInicial = localStorage.getItem(STORAGE_KEY) || "app";
      setSelectedAmbiente(ambienteInicial);
      await Promise.all([loadConfiguracoes(ambienteInicial), loadDashboard(ambienteInicial), syncFromLocation(false, ambienteInicial)]);
    } finally {
      setLoading(false);
    }
  }

  async function loadConfiguracoes(ambiente: string) {
    const payload = await fetchConfiguracoes(ambiente);
    setConfiguracoes(payload);
    setAmbientes(payload.ambientes);
  }

  async function loadDashboard(ambiente: string) {
    const payload = await fetchDashboard(ambiente);
    setDashboard(payload);
  }

  async function loadObservabilidade(nextPeriodo: string, ambiente: string) {
    setLoadingHome(true);
    try {
      const payload = await fetchObservabilidade(nextPeriodo, ambiente);
      setObservabilidade(payload);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Falha ao carregar os graficos da Home.");
    } finally {
      setLoadingHome(false);
    }
  }

  async function syncFromLocation(updateHistory: boolean, ambiente = selectedAmbiente) {
    const currentUrl = new URL(window.location.href);
    const view = getViewFromPath(currentUrl.pathname);

    setCurrentView(view);
    setError("");

    if (view === "home" || view === "configuracoes") {
      setDetalhe(null);
      return;
    }

    if (view === "lista") {
      const nextFilters = applyFiltersFromParams(currentUrl.searchParams, FILTER_KEYS, EMPTY_FILTERS);
      setFilters(nextFilters);
      await loadLista(currentUrl.searchParams.toString(), ambiente, updateHistory ? currentUrl.pathname : undefined);
      return;
    }

    const id = currentUrl.searchParams.get("id") ?? "";
    setReturnQuery(currentUrl.searchParams.get("next") ?? "");

    if (id) {
      await loadDetalhe(id, ambiente);
      return;
    }

    setDetalhe({ erro: "Informe o id do registro para abrir o detalhe." });
  }

  async function loadLista(queryString = "", ambiente: string, pathOverride?: string) {
    setLoadingList(true);
    try {
      const payload = await fetchLista(queryString, ambiente);
      setLista(payload);
      setDetalhe(null);

      if (pathOverride) {
        window.history.replaceState({}, "", `${pathOverride}${queryString ? `?${queryString}` : ""}`);
      }
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Falha ao carregar a pesquisa.");
    } finally {
      setLoadingList(false);
    }
  }

  async function loadDetalhe(id: string, ambiente: string) {
    setLoadingDetail(true);
    try {
      const payload = await fetchDetalhe(id, ambiente);
      setDetalhe(payload);
    } catch (fetchError) {
      setDetalhe({ erro: fetchError instanceof Error ? fetchError.message : "Falha ao carregar o detalhe." });
    } finally {
      setLoadingDetail(false);
    }
  }

  async function handleGoToHome() {
    navigateTo("/home/");
    setCurrentView("home");
    setDetalhe(null);
    setError("");
  }

  async function handleGoToLista(page = 1, overrideFilters?: FilterState, ambiente = selectedAmbiente) {
    const nextFilters = overrideFilters ?? filters;
    const queryString = buildQueryString(nextFilters, FILTER_KEYS, page);

    navigateTo("/pesquisas/", queryString);
    setCurrentView("lista");
    setFilters(nextFilters);
    await loadLista(queryString, ambiente);
  }

  function handleGoToConfiguracoes() {
    navigateTo("/configuracoes/");
    setCurrentView("configuracoes");
    setDetalhe(null);
    setError("");
  }

  async function handleOpenDetail(id: number | string) {
    const query = buildQueryString(filters, FILTER_KEYS, lista?.paginacao.pagina ?? 1);
    const detailQuery = new URLSearchParams({ id: String(id) });

    if (query) {
      detailQuery.set("next", query);
    }

    navigateTo("/pesquisas/detalhe/", detailQuery.toString());
    setCurrentView("detalhe");
    setReturnQuery(query);
    await loadDetalhe(String(id), selectedAmbiente);
  }

  async function handleFilterSubmit(event: FormEvent) {
    event.preventDefault();
    await handleGoToLista(1);
  }

  async function handleRefreshCurrentView() {
    setError("");
    setLoading(true);
    try {
      await Promise.all([loadConfiguracoes(selectedAmbiente), loadDashboard(selectedAmbiente), syncFromLocation(false, selectedAmbiente)]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAmbienteChange(ambiente: string) {
    setSelectedAmbiente(ambiente);
    localStorage.setItem(STORAGE_KEY, ambiente);
    setObservabilidade(null);
    setLista(null);
    setDetalhe(null);
    setError("");
    setLoading(true);
    try {
      await Promise.all([loadConfiguracoes(ambiente), loadDashboard(ambiente), syncFromLocation(false, ambiente)]);
    } finally {
      setLoading(false);
    }
  }

  const detalhesRegistro = detalhe?.registro ? Object.entries(detalhe.registro) : [];

  return (
    <div className="min-h-screen bg-[#0b1220] text-slate-100">
      <div className="mx-auto max-w-[1700px] px-4 py-5 sm:px-6 lg:px-8">
        <CompactHeader
          currentView={currentView}
          onNavigateHome={handleGoToHome}
          onNavigatePesquisa={() => void handleGoToLista()}
          onNavigateConfiguracoes={handleGoToConfiguracoes}
          onRefresh={() => void handleRefreshCurrentView()}
        />

        <div className="space-y-0 pt-1">
          {error ? (
            <section className="mb-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</section>
          ) : null}

          {loading ? <LoadingOverlay /> : null}

          {!loading && currentView === "home" && dashboard ? (
            <HomeView
              observabilidade={observabilidade}
              loadingHome={loadingHome}
              periodo={periodo}
              onPeriodoChange={setPeriodo}
              activeHomeTab={activeHomeTab}
              onActiveHomeTabChange={setActiveHomeTab}
              fluxoChartMode={fluxoChartMode}
              onFluxoChartModeChange={setFluxoChartMode}
              statusChartMode={statusChartMode}
              onStatusChartModeChange={setStatusChartMode}
              metricScope={metricScope}
              onMetricScopeChange={setMetricScope}
              statusLayerMode={statusLayerMode}
              onStatusLayerModeChange={setStatusLayerMode}
              fluxoBreakdownMode={fluxoBreakdownMode}
              onFluxoBreakdownModeChange={setFluxoBreakdownMode}
              selectedOrgans={selectedOrgans}
              onSelectedOrgansChange={setSelectedOrgans}
            />
          ) : null}

          {!loading && currentView === "lista" ? (
            <SearchPage
              lista={lista}
              filters={filters}
              setFilters={setFilters}
              loadingList={loadingList}
              showPeriodFilters={showPeriodFilters}
              setShowPeriodFilters={setShowPeriodFilters}
              pesquisaViewMode={pesquisaViewMode}
              setPesquisaViewMode={setPesquisaViewMode}
              expandedProcesses={expandedProcesses}
              setExpandedProcesses={setExpandedProcesses}
              onSubmit={handleFilterSubmit}
              onOpenDetail={handleOpenDetail}
              onPreviousPage={() => handleGoToLista((lista?.paginacao.pagina ?? 2) - 1)}
              onNextPage={() => handleGoToLista((lista?.paginacao.pagina ?? 0) + 1)}
              formatText={formatText}
              formatDate={formatDate}
              formatBoolean={formatBoolean}
            />
          ) : null}

          {!loading && currentView === "detalhe" ? (
            <DetailPage
              detalhe={detalhe}
              detalhesRegistro={detalhesRegistro}
              loadingDetail={loadingDetail}
              onBackToSearch={() =>
                handleGoToLista(1, applyFiltersFromParams(new URLSearchParams(returnQuery), FILTER_KEYS, EMPTY_FILTERS))
              }
              onBackToHome={handleGoToHome}
              formatText={formatText}
              formatDate={formatDate}
              formatBoolean={formatBoolean}
            />
          ) : null}

          {!loading && currentView === "configuracoes" ? (
            <SettingsPage
              ambientes={ambientes}
              ambienteAtivo={selectedAmbiente}
              infoBanco={configuracoes?.info_banco ?? dashboard?.info_banco ?? null}
              onAmbienteChange={(value) => void handleAmbienteChange(value)}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default App;
