import { FormEvent, useEffect, useState } from "react";
import { fetchDashboard, fetchDetalhe, fetchLista, fetchObservabilidade } from "./api";
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
import { PesquisaViewMode } from "./components/SearchTable";
import type { DashboardData, DetalheResponse, ListaResponse, ObservabilidadeResponse } from "./types";
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

function getDefaultStatusOrgans(payload: ObservabilidadeResponse | null): string[] {
  if (!payload) {
    return [];
  }

  const ranked = payload.status_por_orgao?.totais_por_orgao?.map((item) => item.orgao).filter(Boolean) ?? [];
  const fallback = payload.orgaos_disponiveis ?? [];
  return (ranked.length > 0 ? ranked : fallback).slice(0, 3);
}

function App() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [observabilidade, setObservabilidade] = useState<ObservabilidadeResponse | null>(null);
  const [lista, setLista] = useState<ListaResponse | null>(null);
  const [detalhe, setDetalhe] = useState<DetalheResponse | null>(null);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [currentView, setCurrentView] = useState<RouteView>("home");
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
      void loadObservabilidade(periodo);
    }
  }, [periodo, currentView]);

  useEffect(() => {
    if (currentView !== "home" || activeHomeTab !== "status") {
      setSelectedOrgans(getDefaultStatusOrgans(observabilidade));
    }
  }, [observabilidade, activeHomeTab, currentView]);

  async function bootstrap() {
    setLoading(true);
    try {
      await Promise.all([loadDashboard(), syncFromLocation(false)]);
    } finally {
      setLoading(false);
    }
  }

  async function loadDashboard() {
    const payload = await fetchDashboard();
    setDashboard(payload);
  }

  async function loadObservabilidade(nextPeriodo: string) {
    setLoadingHome(true);
    try {
      const payload = await fetchObservabilidade(nextPeriodo);
      setObservabilidade(payload);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Falha ao carregar os gráficos da Home.");
    } finally {
      setLoadingHome(false);
    }
  }

  async function syncFromLocation(updateHistory: boolean) {
    const currentUrl = new URL(window.location.href);
    const view = getViewFromPath(currentUrl.pathname);

    setCurrentView(view);
    setError("");

    if (view === "home") {
      setDetalhe(null);
      return;
    }

    if (view === "lista") {
      const nextFilters = applyFiltersFromParams(currentUrl.searchParams, FILTER_KEYS, EMPTY_FILTERS);
      setFilters(nextFilters);
      await loadLista(currentUrl.searchParams.toString(), updateHistory ? currentUrl.pathname : undefined);
      return;
    }

    const id = currentUrl.searchParams.get("id") ?? "";
    setReturnQuery(currentUrl.searchParams.get("next") ?? "");

    if (id) {
      await loadDetalhe(id);
      return;
    }

    setDetalhe({ erro: "Informe o id do registro para abrir o detalhe." });
  }

  async function loadLista(queryString = "", pathOverride?: string) {
    setLoadingList(true);
    try {
      const payload = await fetchLista(queryString);
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

  async function loadDetalhe(id: string) {
    setLoadingDetail(true);
    try {
      const payload = await fetchDetalhe(id);
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

  async function handleGoToLista(page = 1, overrideFilters?: FilterState) {
    const nextFilters = overrideFilters ?? filters;
    const queryString = buildQueryString(nextFilters, FILTER_KEYS, page);

    navigateTo("/pesquisas/", queryString);
    setCurrentView("lista");
    setFilters(nextFilters);
    await loadLista(queryString);
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
    await loadDetalhe(String(id));
  }

  async function handleFilterSubmit(event: FormEvent) {
    event.preventDefault();
    await handleGoToLista(1);
  }

  async function handleRefreshCurrentView() {
    setError("");
    setLoading(true);
    try {
      await Promise.all([loadDashboard(), syncFromLocation(false)]);
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
            onBackToSearch={() => handleGoToLista(1, applyFiltersFromParams(new URLSearchParams(returnQuery), FILTER_KEYS, EMPTY_FILTERS))}
            onBackToHome={handleGoToHome}
            formatText={formatText}
            formatDate={formatDate}
            formatBoolean={formatBoolean}
          />
        ) : null}
        </div>
      </div>
    </div>
  );
}

export default App;
