import { FormEvent, ReactElement, ReactNode, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fetchDashboard, fetchDetalhe, fetchLista, fetchObservabilidade } from "./api";
import type { DashboardData, DetalheResponse, ListaResponse, ObservabilidadeResponse, PesquisaRegistro } from "./types";

type RouteView = "home" | "lista" | "detalhe";
type ChartMode = "line" | "bar";
type MetricScope = "registros" | "processos";
type StatusLayerMode = "both" | "processados" | "juntados";
type HomeChartTab = "localizador" | "fluxo" | "status";

const FILTER_KEYS = ["nuprocesso", "cpf", "sig_orgao", "usuario_logado", "data_insercao", "processado", "juntado"] as const;
const PERIOD_OPTIONS = [
  { value: "today", label: "Hoje" },
  { value: "24h", label: "24h" },
  { value: "48h", label: "48h" },
  { value: "72h", label: "72h" },
  { value: "week", label: "Semana" },
  { value: "7d", label: "7 dias" },
  { value: "month", label: "Mês" },
  { value: "30d", label: "30 dias" },
  { value: "all", label: "Todo período" },
] as const;
const HOME_TABS = [
  { id: "localizador", label: "Localizador" },
  { id: "fluxo", label: "Fluxo" },
  { id: "status", label: "Status por órgão" },
] satisfies Array<{ id: HomeChartTab; label: string }>;
const SERIES_COLORS = ["#5b8cff", "#18c29c", "#f59e0b", "#ef5da8", "#8b5cf6", "#22d3ee", "#f97316", "#94a3b8", "#fb7185", "#2dd4bf"];

type FilterKey = (typeof FILTER_KEYS)[number];
type FilterState = Record<FilterKey, string>;

const EMPTY_FILTERS: FilterState = {
  nuprocesso: "",
  cpf: "",
  sig_orgao: "",
  usuario_logado: "",
  data_insercao: "",
  processado: "",
  juntado: "",
};

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
  const [periodo, setPeriodo] = useState<string>("today");
  const [orgaoChartMode, setOrgaoChartMode] = useState<ChartMode>("bar");
  const [fluxoChartMode, setFluxoChartMode] = useState<ChartMode>("line");
  const [statusChartMode, setStatusChartMode] = useState<ChartMode>("bar");
  const [metricScope, setMetricScope] = useState<MetricScope>("registros");
  const [statusLayerMode, setStatusLayerMode] = useState<StatusLayerMode>("both");
  const [showLocalMetrics, setShowLocalMetrics] = useState(false);
  const [selectedOrgans, setSelectedOrgans] = useState<string[]>([]);
  const [activeHomeTab, setActiveHomeTab] = useState<HomeChartTab>("localizador");

  useEffect(() => {
    void bootstrap();

    const handlePopState = () => {
      void syncFromLocation(false);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (currentView !== "home") {
      return;
    }
    void loadObservabilidade(periodo);
  }, [periodo, currentView]);

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
      setSelectedOrgans((current) => {
        if (current.length) {
          return current.filter((item) => payload.orgaos_disponiveis.includes(item)).slice(0, 5);
        }
        return payload.orgaos_disponiveis.slice(0, 5);
      });
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Falha ao carregar os gráficos da Home.");
    } finally {
      setLoadingHome(false);
    }
  }

  function getViewFromPath(pathname: string): RouteView {
    if (pathname.startsWith("/pesquisas/detalhe/")) {
      return "detalhe";
    }
    if (pathname.startsWith("/pesquisas/")) {
      return "lista";
    }
    return "home";
  }

  function applyFiltersFromParams(params: URLSearchParams): FilterState {
    const next = { ...EMPTY_FILTERS };
    for (const key of FILTER_KEYS) {
      next[key] = params.get(key) ?? "";
    }
    return next;
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
      const nextFilters = applyFiltersFromParams(currentUrl.searchParams);
      setFilters(nextFilters);
      await loadLista(currentUrl.searchParams.toString(), updateHistory ? currentUrl.pathname : undefined);
      return;
    }

    const id = currentUrl.searchParams.get("id") ?? "";
    setReturnQuery(currentUrl.searchParams.get("next") ?? "");
    if (id) {
      await loadDetalhe(id);
    } else {
      setDetalhe({ erro: "Informe o id do registro para abrir o detalhe." });
    }
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

  function buildQueryString(state: FilterState, page?: number) {
    const params = new URLSearchParams();
    for (const key of FILTER_KEYS) {
      const value = state[key].trim();
      if (value) {
        params.set(key, value);
      }
    }
    if (page && page > 1) {
      params.set("pagina", String(page));
    }
    return params.toString();
  }

  function navigateTo(pathname: string, queryString = "") {
    const target = `${pathname}${queryString ? `?${queryString}` : ""}`;
    window.history.pushState({}, "", target);
  }

  async function handleGoToHome() {
    navigateTo("/home/");
    setCurrentView("home");
    setDetalhe(null);
    setError("");
  }

  async function handleGoToLista(page = 1, overrideFilters?: FilterState) {
    const baseFilters = overrideFilters ?? filters;
    const queryString = buildQueryString(baseFilters, page);
    navigateTo("/pesquisas/", queryString);
    setCurrentView("lista");
    setFilters(baseFilters);
    await loadLista(queryString);
  }

  async function handleOpenDetail(id: number | string) {
    const query = buildQueryString(filters, lista?.paginacao.pagina ?? 1);
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

  function formatDate(value: unknown) {
    if (!value || typeof value !== "string") {
      return "-";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString("pt-BR");
  }

  function formatBoolean(value: unknown) {
    if (typeof value === "boolean") {
      return value ? "Sim" : "Não";
    }
    if (value === 1 || value === "1") {
      return "Sim";
    }
    if (value === 0 || value === "0") {
      return "Não";
    }
    return formatText(value);
  }

  function formatText(value: unknown) {
    if (value === null || value === undefined || value === "") {
      return "-";
    }
    return String(value);
  }

  const records = lista?.paginacao.itens ?? [];
  const detalhesRegistro = detalhe?.registro ? Object.entries(detalhe.registro) : [];

  return (
    <div className="min-h-screen bg-[#0b1220] text-slate-100">
      <div className="mx-auto max-w-[1700px] px-4 py-5 sm:px-6 lg:px-8">
        <CompactHeader currentView={currentView} onNavigateHome={handleGoToHome} onNavigatePesquisa={() => void handleGoToLista()} />

        {error ? (
          <section className="mb-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</section>
        ) : null}

        {loading ? (
          <section className="rounded-3xl border border-slate-800 bg-slate-900/85 p-8 shadow-2xl shadow-slate-950/40">
            <p className="text-sm text-slate-300">Carregando o Watcher AVIPE...</p>
          </section>
        ) : null}

        {!loading && currentView === "home" && dashboard ? (
          <HomeView
            dashboard={dashboard}
            observabilidade={observabilidade}
            loadingHome={loadingHome}
            periodo={periodo}
            onPeriodoChange={setPeriodo}
            activeHomeTab={activeHomeTab}
            onActiveHomeTabChange={setActiveHomeTab}
            orgaoChartMode={orgaoChartMode}
            onOrgaoChartModeChange={setOrgaoChartMode}
            fluxoChartMode={fluxoChartMode}
            onFluxoChartModeChange={setFluxoChartMode}
            statusChartMode={statusChartMode}
            onStatusChartModeChange={setStatusChartMode}
            metricScope={metricScope}
            onMetricScopeChange={setMetricScope}
            statusLayerMode={statusLayerMode}
            onStatusLayerModeChange={setStatusLayerMode}
            selectedOrgans={selectedOrgans}
            onSelectedOrgansChange={setSelectedOrgans}
            showLocalMetrics={showLocalMetrics}
            onToggleLocalMetrics={() => setShowLocalMetrics((current) => !current)}
          />
        ) : null}

        {!loading && currentView === "lista" ? (
          <div className="space-y-6">
            <section className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/85 px-6 py-6 shadow-2xl shadow-slate-950/40 md:flex-row md:items-end md:justify-between">
              <div>
                <span className="inline-flex rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">
                  Pesquisa
                </span>
                <h1 className="mt-3 text-3xl font-semibold text-white">Consulta operacional da base AVIPE</h1>
                <p className="mt-2 max-w-3xl text-sm text-slate-300">Use filtros para localizar registros, navegar por páginas e abrir o detalhe completo de cada linha.</p>
              </div>
              <button
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-950/60 px-5 text-sm font-semibold text-slate-200 transition hover:border-cyan-400/35 hover:text-white"
                type="button"
                onClick={() => void handleGoToHome()}
              >
                Voltar para Home
              </button>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900/85 shadow-2xl shadow-slate-950/40">
              <form className="grid gap-4 p-5 md:grid-cols-[repeat(14,minmax(0,1fr))]" onSubmit={(event) => void handleFilterSubmit(event)}>
                <Field className="md:col-span-3" label="Processo" value={filters.nuprocesso} onChange={(value) => setFilters((current) => ({ ...current, nuprocesso: value }))} />
                <Field className="md:col-span-2" label="CPF" value={filters.cpf} onChange={(value) => setFilters((current) => ({ ...current, cpf: value }))} />
                <SelectField className="md:col-span-2" label="Órgão" value={filters.sig_orgao} options={lista?.siglas_orgaos ?? []} onChange={(value) => setFilters((current) => ({ ...current, sig_orgao: value }))} />
                <Field className="md:col-span-2" label="Usuário" value={filters.usuario_logado} onChange={(value) => setFilters((current) => ({ ...current, usuario_logado: value }))} />
                <DateField className="md:col-span-2" label="Inserido em" value={filters.data_insercao} onChange={(value) => setFilters((current) => ({ ...current, data_insercao: value }))} />
                <BinarySelect className="md:col-span-1" label="Processado" value={filters.processado} onChange={(value) => setFilters((current) => ({ ...current, processado: value }))} />
                <BinarySelect className="md:col-span-1" label="Juntado" value={filters.juntado} onChange={(value) => setFilters((current) => ({ ...current, juntado: value }))} />
                <div className="md:col-span-1 md:flex md:items-end">
                  <button className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-cyan-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400" type="submit">
                    {loadingList ? "Filtrando..." : "Filtrar"}
                  </button>
                </div>
              </form>
            </section>

            <SimpleTableCard
              title={`${lista?.paginacao.total ?? 0} registro(s)`}
              subtitle={lista ? `Página ${lista.paginacao.pagina} de ${lista.paginacao.total_paginas}` : undefined}
              records={records}
              showAction
              striped
              onOpenDetail={handleOpenDetail}
              formatText={formatText}
              formatDate={formatDate}
              formatBoolean={formatBoolean}
            />

            {lista ? (
              <div className="flex items-center justify-between">
                <div>
                  {lista.paginacao.tem_anterior ? (
                    <button
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-900/85 px-4 text-sm font-semibold text-slate-200 transition hover:border-cyan-400/35 hover:text-white"
                      type="button"
                      disabled={loadingList}
                      onClick={() => void handleGoToLista(lista.paginacao.pagina - 1)}
                    >
                      Página anterior
                    </button>
                  ) : null}
                </div>
                <div>
                  {lista.paginacao.tem_proxima ? (
                    <button
                      className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-900/85 px-4 text-sm font-semibold text-slate-200 transition hover:border-cyan-400/35 hover:text-white"
                      type="button"
                      disabled={loadingList}
                      onClick={() => void handleGoToLista(lista.paginacao.pagina + 1)}
                    >
                      Próxima página
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {!loading && currentView === "detalhe" ? (
          <div className="space-y-6">
            <section className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/85 px-6 py-6 shadow-2xl shadow-slate-950/40 md:flex-row md:items-center md:justify-between">
              <div>
                <span className="inline-flex rounded-full border border-fuchsia-400/25 bg-fuchsia-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-fuchsia-200">
                  Detalhe
                </span>
                <h1 className="mt-3 text-3xl font-semibold text-white">Registro completo</h1>
                <p className="mt-2 text-sm text-slate-300">Visualização integral da linha selecionada no banco AVIPE.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-950/60 px-5 text-sm font-semibold text-slate-200 transition hover:border-cyan-400/35 hover:text-white"
                  type="button"
                  onClick={() => void handleGoToLista(1, applyFiltersFromParams(new URLSearchParams(returnQuery)))}
                >
                  Voltar para Pesquisa
                </button>
                <button
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-950/60 px-5 text-sm font-semibold text-slate-200 transition hover:border-cyan-400/35 hover:text-white"
                  type="button"
                  onClick={() => void handleGoToHome()}
                >
                  Voltar para Home
                </button>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900/85 p-5 shadow-2xl shadow-slate-950/40">
              {loadingDetail ? (
                <p className="text-sm text-slate-300">Carregando detalhe...</p>
              ) : detalhe?.erro ? (
                <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{detalhe.erro}</div>
              ) : (
                <dl className="grid gap-y-3 md:grid-cols-[240px_minmax(0,1fr)] md:gap-x-6">
                  {detalhesRegistro.map(([key, value]) => (
                    <>
                      <dt key={`${key}-dt`} className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                        {key}
                      </dt>
                      <dd key={`${key}-dd`} className="break-all text-sm text-slate-100">
                        {key.includes("data")
                          ? formatDate(value)
                          : typeof value === "boolean" || value === 0 || value === 1
                            ? formatBoolean(value)
                            : formatText(value)}
                      </dd>
                    </>
                  ))}
                </dl>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CompactHeader({
  currentView,
  onNavigateHome,
  onNavigatePesquisa,
}: {
  currentView: RouteView;
  onNavigateHome: () => Promise<void>;
  onNavigatePesquisa: () => void;
}) {
  return (
    <header className="mb-6 rounded-[24px] border border-slate-800 bg-[linear-gradient(180deg,rgba(25,34,56,0.94)_0%,rgba(18,25,43,0.97)_100%)] px-5 py-4 shadow-2xl shadow-slate-950/45">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-2xl font-semibold text-white">Watcher AVIPE</div>
          <p className="mt-1 text-sm text-slate-400">Monitoramento operacional do fluxo de pesquisas e do processamento.</p>
        </div>
        <nav className="flex flex-wrap gap-2 rounded-2xl border border-slate-800 bg-slate-950/55 p-1.5">
          <NavButton label="Home" active={currentView === "home"} onClick={() => void onNavigateHome()} />
          <NavButton label="Pesquisa" active={currentView === "lista" || currentView === "detalhe"} onClick={onNavigatePesquisa} />
        </nav>
      </div>
    </header>
  );
}

function NavButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      className={`inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold transition ${
        active
          ? "bg-[linear-gradient(135deg,#6d5efc_0%,#4cc7ff_100%)] text-white shadow-lg shadow-cyan-500/20"
          : "border border-transparent bg-transparent text-slate-300 hover:border-slate-700 hover:bg-slate-900/80 hover:text-white"
      }`}
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function HomeView({
  dashboard,
  observabilidade,
  loadingHome,
  periodo,
  onPeriodoChange,
  activeHomeTab,
  onActiveHomeTabChange,
  orgaoChartMode,
  onOrgaoChartModeChange,
  fluxoChartMode,
  onFluxoChartModeChange,
  statusChartMode,
  onStatusChartModeChange,
  metricScope,
  onMetricScopeChange,
  statusLayerMode,
  onStatusLayerModeChange,
  selectedOrgans,
  onSelectedOrgansChange,
  showLocalMetrics,
  onToggleLocalMetrics,
}: {
  dashboard: DashboardData;
  observabilidade: ObservabilidadeResponse | null;
  loadingHome: boolean;
  periodo: string;
  onPeriodoChange: (value: string) => void;
  activeHomeTab: HomeChartTab;
  onActiveHomeTabChange: (value: HomeChartTab) => void;
  orgaoChartMode: ChartMode;
  onOrgaoChartModeChange: (value: ChartMode) => void;
  fluxoChartMode: ChartMode;
  onFluxoChartModeChange: (value: ChartMode) => void;
  statusChartMode: ChartMode;
  onStatusChartModeChange: (value: ChartMode) => void;
  metricScope: MetricScope;
  onMetricScopeChange: (value: MetricScope) => void;
  statusLayerMode: StatusLayerMode;
  onStatusLayerModeChange: (value: StatusLayerMode) => void;
  selectedOrgans: string[];
  onSelectedOrgansChange: (items: string[]) => void;
  showLocalMetrics: boolean;
  onToggleLocalMetrics: () => void;
}) {
  const organRanking = observabilidade?.entrada_localizador_por_orgao.totais_por_orgao ?? [];
  const throughputData = observabilidade?.inclusao_vs_processamento.evolucao ?? [];
  const statusTotals = observabilidade?.status_por_orgao.totais_por_orgao ?? [];
  const statusTimeline = observabilidade?.status_por_orgao.evolucao ?? [];
  const scopeLabel = metricScope === "registros" ? "registros" : "processos";
  const statusSeries = useMemo(
    () =>
      selectedOrgans.map((orgao, index) => ({
        orgao,
        color: SERIES_COLORS[index % SERIES_COLORS.length],
      })),
    [selectedOrgans],
  );

  const activeChartMode = activeHomeTab === "localizador" ? orgaoChartMode : activeHomeTab === "fluxo" ? fluxoChartMode : statusChartMode;
  const setActiveChartMode = (value: ChartMode) => {
    if (activeHomeTab === "localizador") {
      onOrgaoChartModeChange(value);
      return;
    }
    if (activeHomeTab === "fluxo") {
      onFluxoChartModeChange(value);
      return;
    }
    onStatusChartModeChange(value);
  };

  const activeTitle =
    activeHomeTab === "localizador"
      ? "Órgãos com envios ao localizador"
      : activeHomeTab === "fluxo"
        ? "Inclusão no localizador x processamento"
        : "Processados e juntados por órgão";

  const activeBadge =
    activeHomeTab === "localizador"
      ? `${observabilidade?.entrada_localizador_por_orgao.resumo.orgaos_ativos ?? 0} órgãos ativos`
      : activeHomeTab === "fluxo"
        ? `${metricScope === "registros"
            ? observabilidade?.inclusao_vs_processamento.resumo.inclusoes_registros ?? 0
            : observabilidade?.inclusao_vs_processamento.resumo.inclusoes_processos ?? 0} ${scopeLabel}`
        : `${statusTotals.length} órgãos com atividade`;

  const activeSummary =
    activeHomeTab === "localizador"
      ? `No período ${observabilidade?.periodo.rotulo.toLowerCase() ?? ""}, houve ${
          metricScope === "registros"
            ? observabilidade?.entrada_localizador_por_orgao.resumo.registros ?? 0
            : observabilidade?.entrada_localizador_por_orgao.resumo.processos ?? 0
        } ${scopeLabel} com inclusão no localizador.`
      : activeHomeTab === "fluxo"
        ? `Comparativo temporal entre entradas no localizador e processamentos concluídos em ${scopeLabel}, dentro de ${observabilidade?.periodo.rotulo.toLowerCase() ?? ""}.`
        : `Camadas independentes para processados e juntados, com leitura combinada ou isolada em ${scopeLabel}.`;

  const activeExtraControls =
    activeHomeTab === "status" ? (
      <div className="flex gap-2 whitespace-nowrap">
        <MiniToggle label="Sobrepostos" active={statusLayerMode === "both"} onClick={() => onStatusLayerModeChange("both")} />
        <MiniToggle label="Só processados" active={statusLayerMode === "processados"} onClick={() => onStatusLayerModeChange("processados")} />
        <MiniToggle label="Só juntados" active={statusLayerMode === "juntados"} onClick={() => onStatusLayerModeChange("juntados")} />
      </div>
    ) : null;

  return (
    <div className="space-y-6">
      <section className="grid gap-3 xl:grid-cols-5">
        <MetricCard label="Total de registros" value={dashboard.metricas.globais.total} accent="cyan" helper="Volume acumulado na base" />
        <MetricCard
          label="Processos no período"
          value={observabilidade?.entrada_localizador_por_orgao.resumo.processos ?? 0}
          accent="violet"
          helper={`Processos distintos em ${observabilidade?.periodo.rotulo.toLowerCase() ?? "hoje"}`}
        />
        <MetricCard label="Pendentes" value={dashboard.metricas.globais.pendentes} accent="amber" helper="Ainda não processados" />
        <MetricCard label="Processados" value={dashboard.metricas.globais.processados} accent="emerald" helper="Fluxo concluído no processamento" />
        <MetricCard label="Juntados" value={dashboard.metricas.globais.juntados} accent="cyan" helper="Registros com juntada concluída" />
      </section>

      <section className="rounded-3xl border border-slate-800 bg-[linear-gradient(180deg,rgba(20,29,50,0.95)_0%,rgba(12,18,31,0.96)_100%)] shadow-2xl shadow-slate-950/40">
        <button className="flex w-full items-center justify-between px-5 py-4 text-left" type="button" onClick={onToggleLocalMetrics}>
          <div>
            <strong className="text-base text-white">Visão local da máquina e do usuário</strong>
            <p className="mt-1 text-sm text-slate-400">
              {dashboard.info_banco.usuario_logado} em {dashboard.info_banco.ip_cliente}
            </p>
          </div>
          <span className="rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
            {showLocalMetrics ? "Ocultar" : "Expandir"}
          </span>
        </button>
        {showLocalMetrics ? (
          <div className="grid gap-4 border-t border-slate-800 px-5 py-5 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Locais totais" value={dashboard.metricas.maquina_usuario.total} accent="cyan" helper="Base restrita a esta execução" />
            <MetricCard label="Locais pendentes" value={dashboard.metricas.maquina_usuario.pendentes} accent="amber" helper="Ainda não concluído aqui" />
            <MetricCard label="Locais processados" value={dashboard.metricas.maquina_usuario.processados} accent="emerald" helper="Finalizado nesta máquina" />
            <MetricCard label="Locais juntados" value={dashboard.metricas.maquina_usuario.juntados} accent="violet" helper="Juntado neste contexto local" />
          </div>
        ) : null}
      </section>

      <section className="rounded-[30px] border border-slate-800 bg-[linear-gradient(180deg,rgba(31,41,64,0.92)_0%,rgba(17,24,39,0.97)_100%)] p-4 shadow-2xl shadow-slate-950/40">
        <div className="flex flex-col gap-4 border-b border-slate-800 pb-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-800 bg-slate-950/55 p-1.5">
            {HOME_TABS.map((tab) => (
              <button
                key={tab.id}
                className={`inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold transition ${
                  activeHomeTab === tab.id
                    ? "bg-[linear-gradient(135deg,#5b8cff_0%,#7c3aed_100%)] text-white shadow-lg shadow-indigo-500/20"
                    : "text-slate-300 hover:bg-slate-900/80 hover:text-white"
                }`}
                type="button"
                onClick={() => onActiveHomeTabChange(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <PeriodPicker value={periodo} onChange={onPeriodoChange} compact />
        </div>

        {loadingHome ? (
          <div className="px-2 py-8">
            <p className="text-sm text-slate-300">Carregando observações do período selecionado...</p>
          </div>
        ) : null}

        {!loadingHome && observabilidade ? (
          <ChartCard
            title={activeTitle}
            badge={activeBadge}
            summary={activeSummary}
            chartMode={activeChartMode}
            onChartModeChange={setActiveChartMode}
            metricScope={metricScope}
            onMetricScopeChange={onMetricScopeChange}
            extraControls={activeExtraControls}
          >
            {activeHomeTab === "localizador" ? (
              activeChartMode === "bar" ? (
                <OrgTotalsChart data={organRanking} metricScope={metricScope} />
              ) : (
                <OrgTimelineChart data={observabilidade.entrada_localizador_por_orgao.evolucao} metricScope={metricScope} periodKey={observabilidade.periodo.selecionado} />
              )
            ) : null}

            {activeHomeTab === "fluxo" ? <FluxoTimelineChart data={throughputData} mode={activeChartMode} metricScope={metricScope} periodKey={observabilidade.periodo.selecionado} /> : null}

            {activeHomeTab === "status" ? (
              <div className="space-y-4">
                <OrganSelector availableOrgans={observabilidade.orgaos_disponiveis} selectedOrgans={selectedOrgans} onChange={onSelectedOrgansChange} />
                {activeChartMode === "bar" ? (
                  <StatusTotalsChart data={statusTotals} layerMode={statusLayerMode} metricScope={metricScope} />
                ) : (
                  <StatusTimelineChart data={statusTimeline} series={statusSeries} layerMode={statusLayerMode} metricScope={metricScope} periodKey={observabilidade.periodo.selecionado} />
                )}
              </div>
            ) : null}
          </ChartCard>
        ) : null}
      </section>
    </div>
  );
}

function PeriodPicker({ value, onChange, compact = false }: { value: string; onChange: (value: string) => void; compact?: boolean }) {
  return (
    <div className={`${compact ? "rounded-2xl border border-slate-800 bg-slate-950/55 p-1.5" : "rounded-[26px] border border-slate-800 bg-slate-950/65 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]"}`}>
      {!compact ? (
        <div className="mb-3 flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Período</span>
          <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-2.5 py-1 text-[11px] font-medium text-violet-200">Observação temporal</span>
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {PERIOD_OPTIONS.map((option) => (
          <button
            key={option.value}
            className={`inline-flex h-10 items-center justify-center rounded-xl px-4 text-sm font-semibold transition ${
              value === option.value
                ? "bg-[linear-gradient(135deg,#6d5efc_0%,#4cc7ff_100%)] text-white shadow-lg shadow-violet-500/20"
                : "border border-slate-700 bg-slate-950/40 text-slate-200 hover:border-cyan-400/35 hover:text-white"
            }`}
            type="button"
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  accent,
  helper,
}: {
  label: string;
  value: number;
  accent: "cyan" | "amber" | "emerald" | "violet";
  helper: string;
}) {
  const accentStyles = {
    cyan: "from-cyan-400/25 via-cyan-500/8 to-slate-950 text-cyan-200 border-cyan-400/15",
    amber: "from-amber-400/25 via-amber-500/8 to-slate-950 text-amber-200 border-amber-400/15",
    emerald: "from-emerald-400/25 via-emerald-500/8 to-slate-950 text-emerald-200 border-emerald-400/15",
    violet: "from-violet-400/25 via-violet-500/8 to-slate-950 text-violet-200 border-violet-400/15",
  }[accent];

  return (
    <article className={`min-w-0 rounded-[24px] border bg-gradient-to-br ${accentStyles} p-4 shadow-2xl shadow-slate-950/30`}>
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm leading-5 text-slate-300">{label}</div>
        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-300">KPI</span>
      </div>
      <div className="mt-2 text-3xl font-semibold text-white xl:text-[2rem]">{value}</div>
      <div className="mt-1 text-xs leading-5 text-slate-400">{helper}</div>
    </article>
  );
}

function ChartCard({
  title,
  badge,
  summary,
  chartMode,
  onChartModeChange,
  metricScope,
  onMetricScopeChange,
  extraControls,
  children,
}: {
  title: string;
  badge: string;
  summary: string;
  chartMode: ChartMode;
  onChartModeChange: (value: ChartMode) => void;
  metricScope: MetricScope;
  onMetricScopeChange: (value: MetricScope) => void;
  extraControls?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="pt-5">
      <div className="flex flex-col gap-4 border-b border-slate-800 pb-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">Observabilidade</div>
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xl font-semibold text-white">{title}</h3>
            <span className="rounded-full border border-fuchsia-400/25 bg-fuchsia-400/10 px-3 py-1 text-xs font-semibold text-fuchsia-200">{badge}</span>
          </div>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">{summary}</p>
        </div>
        <div className="xl:max-w-full">
          <div className="flex flex-nowrap items-center gap-3 overflow-x-auto rounded-2xl border border-slate-700 bg-slate-950/45 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <div className="flex gap-2 rounded-xl border border-slate-700/80 bg-slate-900/85 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <MiniToggle label="Linhas" active={chartMode === "line"} onClick={() => onChartModeChange("line")} />
              <MiniToggle label="Barras" active={chartMode === "bar"} onClick={() => onChartModeChange("bar")} />
            </div>
            <div className="h-8 w-px bg-slate-700" />
            <div className="flex gap-2 rounded-xl border border-slate-700/80 bg-slate-900/85 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <MiniToggle label="Registros" active={metricScope === "registros"} onClick={() => onMetricScopeChange("registros")} />
              <MiniToggle label="Processos" active={metricScope === "processos"} onClick={() => onMetricScopeChange("processos")} />
            </div>
            {extraControls ? <div className="h-8 w-px bg-slate-700" /> : null}
            {extraControls ? (
              <div className="flex gap-2 whitespace-nowrap rounded-xl border border-slate-700/80 bg-slate-900/85 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                {extraControls}
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="pt-5">{children}</div>
    </section>
  );
}

function MiniToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      className={`inline-flex h-9 items-center justify-center rounded-lg px-3 text-xs font-semibold uppercase tracking-[0.18em] transition ${
        active
          ? "bg-[linear-gradient(135deg,#5b8cff_0%,#7c3aed_100%)] text-white shadow-lg shadow-indigo-500/20"
          : "border border-transparent bg-slate-950/20 text-slate-300 hover:border-slate-700 hover:bg-slate-900/80 hover:text-white"
      }`}
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function getDayChangeMarkers(data: Array<Record<string, string | number>>, periodKey: string): string[] {
  const periodsWithDayMarkers = new Set(["today", "24h", "48h", "72h", "week", "7d"]);
  if (!periodsWithDayMarkers.has(periodKey)) {
    return [];
  }

  const markers: string[] = [];
  let previousDay: string | null = null;

  for (const item of data) {
    const bucket = item.bucket;
    const label = item.label;
    if (typeof bucket !== "string" || typeof label !== "string") {
      continue;
    }
    const currentDay = bucket.slice(0, 10);
    if (previousDay && currentDay !== previousDay) {
      markers.push(label);
    }
    previousDay = currentDay;
  }

  return markers;
}

function OrgTotalsChart({
  data,
  metricScope,
}: {
  data: Array<{ orgao: string; total?: number; registros?: number; processos?: number }>;
  metricScope: MetricScope;
}) {
  const dataKey = metricScope === "registros" ? "registros" : "processos";
  const label = metricScope === "registros" ? "Registros" : "Processos";

  return (
    <ChartContainer>
      <BarChart data={data}>
        <CartesianGrid stroke="#243145" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="orgao" stroke="#8ea3c3" tick={{ fill: "#8ea3c3", fontSize: 12 }} angle={-20} height={60} textAnchor="end" />
        <YAxis stroke="#8ea3c3" tick={{ fill: "#8ea3c3", fontSize: 12 }} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#e2e8f0" }} />
        <Bar dataKey={dataKey} name={label} fill="#5b8cff" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

function OrgTimelineChart({
  data,
  metricScope,
  periodKey,
}: {
  data: Array<Record<string, string | number>>;
  metricScope: MetricScope;
  periodKey: string;
}) {
  const suffix = metricScope === "registros" ? "__registros" : "__processos";
  const keys = Array.from(
    new Set(
      data.flatMap((item) => Object.keys(item).filter((key) => key.endsWith(suffix))),
    ),
  );
  const chartData = data.map((item) => {
    const enriched: Record<string, string | number> = { ...item };
    for (const key of keys) {
      if (typeof enriched[key] !== "number") {
        enriched[key] = 0;
      }
    }
    return enriched;
  });
  const showDots = chartData.length <= 8;
  const dayChangeMarkers = getDayChangeMarkers(chartData, periodKey);

  return (
    <ChartContainer>
      <LineChart data={chartData}>
        <CartesianGrid stroke="#243145" strokeDasharray="3 3" />
        <XAxis dataKey="label" stroke="#8ea3c3" tick={{ fill: "#8ea3c3", fontSize: 12 }} />
        <YAxis stroke="#8ea3c3" tick={{ fill: "#8ea3c3", fontSize: 12 }} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#e2e8f0" }} />
        <Legend wrapperStyle={{ color: "#cbd5e1" }} />
        {dayChangeMarkers.map((label) => (
          <ReferenceLine key={`day-${label}`} x={label} stroke="#6d5efc" strokeDasharray="5 5" strokeOpacity={0.9} />
        ))}
        {keys.slice(0, 5).map((key, index) => (
          <Line
            key={key}
            dataKey={key}
            name={key.replace(suffix, "")}
            type="monotone"
            stroke={SERIES_COLORS[index % SERIES_COLORS.length]}
            strokeWidth={2}
            dot={showDots ? { r: 4, strokeWidth: 0, fill: SERIES_COLORS[index % SERIES_COLORS.length] } : false}
            activeDot={{ r: 6 }}
          />
        ))}
      </LineChart>
    </ChartContainer>
  );
}

function FluxoTimelineChart({
  data,
  mode,
  metricScope,
  periodKey,
}: {
  data: Array<Record<string, string | number>>;
  mode: ChartMode;
  metricScope: MetricScope;
  periodKey: string;
}) {
  const inclusoesKey = metricScope === "registros" ? "inclusoes_registros" : "inclusoes_processos";
  const processamentosKey = metricScope === "registros" ? "processamentos_registros" : "processamentos_processos";
  const inclusoesLabel = metricScope === "registros" ? "Inclusões por registro" : "Inclusões por processo";
  const processamentosLabel = metricScope === "registros" ? "Processamentos por registro" : "Processamentos por processo";
  const dayChangeMarkers = getDayChangeMarkers(data, periodKey);

  if (mode === "bar") {
    return (
      <ChartContainer>
        <BarChart data={data}>
          <CartesianGrid stroke="#243145" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" stroke="#8ea3c3" tick={{ fill: "#8ea3c3", fontSize: 12 }} />
          <YAxis stroke="#8ea3c3" tick={{ fill: "#8ea3c3", fontSize: 12 }} />
          <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#e2e8f0" }} />
          <Legend wrapperStyle={{ color: "#cbd5e1" }} />
          <Bar dataKey={inclusoesKey} name={inclusoesLabel} fill="#5b8cff" radius={[6, 6, 0, 0]} />
          <Bar dataKey={processamentosKey} name={processamentosLabel} fill="#18c29c" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ChartContainer>
    );
  }

  return (
    <ChartContainer>
      <LineChart data={data}>
        <CartesianGrid stroke="#243145" strokeDasharray="3 3" />
        <XAxis dataKey="label" stroke="#8ea3c3" tick={{ fill: "#8ea3c3", fontSize: 12 }} />
        <YAxis stroke="#8ea3c3" tick={{ fill: "#8ea3c3", fontSize: 12 }} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#e2e8f0" }} />
        <Legend wrapperStyle={{ color: "#cbd5e1" }} />
        {dayChangeMarkers.map((label) => (
          <ReferenceLine key={`day-${label}`} x={label} stroke="#6d5efc" strokeDasharray="5 5" strokeOpacity={0.9} />
        ))}
        <Line dataKey={inclusoesKey} name={inclusoesLabel} type="monotone" stroke="#5b8cff" strokeWidth={2.5} dot={false} />
        <Line dataKey={processamentosKey} name={processamentosLabel} type="monotone" stroke="#18c29c" strokeWidth={2.5} dot={false} />
      </LineChart>
    </ChartContainer>
  );
}

function OrganSelector({
  availableOrgans,
  selectedOrgans,
  onChange,
}: {
  availableOrgans: string[];
  selectedOrgans: string[];
  onChange: (items: string[]) => void;
}) {
  function toggleOrgan(orgao: string) {
    if (selectedOrgans.includes(orgao)) {
      onChange(selectedOrgans.filter((item) => item !== orgao));
      return;
    }
    if (selectedOrgans.length >= 5) {
      onChange([...selectedOrgans.slice(1), orgao]);
      return;
    }
    onChange([...selectedOrgans, orgao]);
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Órgãos destacados</p>
        <span className="text-xs text-slate-500">Até 5 séries visíveis</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {availableOrgans.map((orgao) => {
          const active = selectedOrgans.includes(orgao);
          return (
            <button
              key={orgao}
              className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                active ? "border-cyan-400/30 bg-cyan-400/12 text-cyan-100" : "border-slate-700 bg-slate-950/50 text-slate-300 hover:border-cyan-400/25 hover:text-white"
              }`}
              type="button"
              onClick={() => toggleOrgan(orgao)}
            >
              {orgao}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StatusTotalsChart({
  data,
  layerMode,
  metricScope,
}: {
  data: Array<{
    orgao: string;
    processados?: number;
    juntados?: number;
    processados_registros?: number;
    processados_processos?: number;
    juntados_registros?: number;
    juntados_processos?: number;
  }>;
  layerMode: StatusLayerMode;
  metricScope: MetricScope;
}) {
  const processadosKey = metricScope === "registros" ? "processados_registros" : "processados_processos";
  const juntadosKey = metricScope === "registros" ? "juntados_registros" : "juntados_processos";

  return (
    <ChartContainer>
      <BarChart data={data}>
        <CartesianGrid stroke="#243145" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="orgao" stroke="#8ea3c3" tick={{ fill: "#8ea3c3", fontSize: 12 }} angle={-20} height={60} textAnchor="end" />
        <YAxis stroke="#8ea3c3" tick={{ fill: "#8ea3c3", fontSize: 12 }} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#e2e8f0" }} />
        <Legend wrapperStyle={{ color: "#cbd5e1" }} />
        {layerMode !== "juntados" ? <Bar dataKey={processadosKey} name="Processados" fill="#5b8cff" radius={[6, 6, 0, 0]} /> : null}
        {layerMode !== "processados" ? <Bar dataKey={juntadosKey} name="Juntados" fill="#18c29c" radius={[6, 6, 0, 0]} /> : null}
      </BarChart>
    </ChartContainer>
  );
}

function StatusTimelineChart({
  data,
  series,
  layerMode,
  metricScope,
  periodKey,
}: {
  data: Array<Record<string, string | number>>;
  series: Array<{ orgao: string; color: string }>;
  layerMode: StatusLayerMode;
  metricScope: MetricScope;
  periodKey: string;
}) {
  const processadosSuffix = metricScope === "registros" ? "__processados_registros" : "__processados_processos";
  const juntadosSuffix = metricScope === "registros" ? "__juntados_registros" : "__juntados_processos";
  const chartData = data.map((item) => {
    const enriched: Record<string, string | number> = { ...item };
    for (const serie of series) {
      if (typeof enriched[`${serie.orgao}${processadosSuffix}`] !== "number") {
        enriched[`${serie.orgao}${processadosSuffix}`] = 0;
      }
      if (typeof enriched[`${serie.orgao}${juntadosSuffix}`] !== "number") {
        enriched[`${serie.orgao}${juntadosSuffix}`] = 0;
      }
    }
    return enriched;
  });
  const showDots = chartData.length <= 8;
  const dayChangeMarkers = getDayChangeMarkers(chartData, periodKey);

  return (
    <ChartContainer>
      <LineChart data={chartData}>
        <CartesianGrid stroke="#243145" strokeDasharray="3 3" />
        <XAxis dataKey="label" stroke="#8ea3c3" tick={{ fill: "#8ea3c3", fontSize: 12 }} />
        <YAxis stroke="#8ea3c3" tick={{ fill: "#8ea3c3", fontSize: 12 }} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#e2e8f0" }} />
        <Legend wrapperStyle={{ color: "#cbd5e1" }} />
        {dayChangeMarkers.map((label) => (
          <ReferenceLine key={`day-${label}`} x={label} stroke="#6d5efc" strokeDasharray="5 5" strokeOpacity={0.9} />
        ))}
        {series.map((item) =>
          layerMode !== "juntados" ? (
            <Line
              key={`${item.orgao}-processados`}
              dataKey={`${item.orgao}${processadosSuffix}`}
              name={`${item.orgao} · Processados`}
              type="monotone"
              stroke={item.color}
              strokeWidth={2.5}
              dot={showDots ? { r: 4, strokeWidth: 0, fill: item.color } : false}
              activeDot={{ r: 6 }}
            />
          ) : null,
        )}
        {series.map((item) =>
          layerMode !== "processados" ? (
            <Line
              key={`${item.orgao}-juntados`}
              dataKey={`${item.orgao}${juntadosSuffix}`}
              name={`${item.orgao} · Juntados`}
              type="monotone"
              stroke={item.color}
              strokeWidth={1.8}
              strokeDasharray="5 4"
              dot={showDots ? { r: 4, strokeWidth: 0, fill: item.color } : false}
              activeDot={{ r: 6 }}
            />
          ) : null,
        )}
      </LineChart>
    </ChartContainer>
  );
}

function ChartContainer({ children }: { children: ReactElement }) {
  return (
    <div className="h-[420px] rounded-[24px] border border-slate-800 bg-[linear-gradient(180deg,#1a253d_0%,#111a2d_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

function SimpleTableCard({
  title,
  subtitle,
  records,
  showAction,
  striped = false,
  onOpenDetail,
  formatText,
  formatDate,
  formatBoolean,
}: {
  title: string;
  subtitle?: string;
  records: PesquisaRegistro[];
  showAction: boolean;
  striped?: boolean;
  onOpenDetail: (id: number | string) => Promise<void>;
  formatText: (value: unknown) => string;
  formatDate: (value: unknown) => string;
  formatBoolean: (value: unknown) => string;
}) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/85 shadow-2xl shadow-slate-950/40">
      <div className="flex flex-col gap-2 border-b border-slate-800 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <strong className="text-base text-white">{title}</strong>
        {subtitle ? <span className="text-sm text-slate-400">{subtitle}</span> : null}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[1450px] w-full text-sm">
          <thead className="bg-slate-950/60">
            <tr>
              <HeaderCell>Processo</HeaderCell>
              <HeaderCell>CPF</HeaderCell>
              <HeaderCell>Órgão</HeaderCell>
              <HeaderCell>Usuário</HeaderCell>
              <HeaderCell>IP</HeaderCell>
              <HeaderCell centered>Incluído no localizador em</HeaderCell>
              <HeaderCell centered>Processado em</HeaderCell>
              <HeaderCell centered>Processado</HeaderCell>
              <HeaderCell centered>Juntado</HeaderCell>
              {showAction ? <HeaderCell /> : null}
            </tr>
          </thead>
          <tbody>
            {records.length ? (
              records.map((item, index) => (
                <tr key={`${item.id}-${item.nuprocesso}-${index}`} className={striped && index % 2 === 0 ? "bg-slate-900/50" : "bg-slate-900/10"}>
                  <BodyCell>{formatText(item.nuprocesso)}</BodyCell>
                  <BodyCell>{formatText(item.cpf)}</BodyCell>
                  <BodyCell>{formatText(item.sig_orgao)}</BodyCell>
                  <BodyCell>{formatText(item.usuario_logado)}</BodyCell>
                  <BodyCell>{formatText(item.ip_cliente)}</BodyCell>
                  <BodyCell centered>{formatDate(item.data_inclusao_localizador)}</BodyCell>
                  <BodyCell centered>{formatDate(item.data_processamento)}</BodyCell>
                  <BodyCell centered>{formatBoolean(item.processado)}</BodyCell>
                  <BodyCell centered>{formatBoolean(item.juntado)}</BodyCell>
                  {showAction ? (
                    <BodyCell className="text-right">
                      <button
                        className="inline-flex min-w-[88px] items-center justify-center rounded-md border border-cyan-400/40 px-3 py-1.5 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400 hover:text-slate-950"
                        type="button"
                        onClick={() => void onOpenDetail(item.id ?? "")}
                      >
                        Detalhe
                      </button>
                    </BodyCell>
                  ) : null}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={showAction ? 10 : 9} className="px-4 py-8 text-center text-sm text-slate-400">
                  Nenhum registro encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function HeaderCell({ children, centered = false }: { children?: ReactNode; centered?: boolean }) {
  return <th className={`whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-400 ${centered ? "text-center" : ""}`}>{children}</th>;
}

function BodyCell({ children, centered = false, className = "" }: { children: ReactNode; centered?: boolean; className?: string }) {
  return <td className={`whitespace-nowrap border-t border-slate-800 px-4 py-3 text-slate-100 ${centered ? "text-center" : ""} ${className}`}>{children}</td>;
}

function Field({ label, value, onChange, className = "" }: { label: string; value: string; onChange: (value: string) => void; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-medium text-slate-300">{label}</span>
      <input className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/15" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function DateField({ label, value, onChange, className = "" }: { label: string; value: string; onChange: (value: string) => void; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-medium text-slate-300">{label}</span>
      <input className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/15" type="date" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange,
  className = "",
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-medium text-slate-300">{label}</span>
      <select className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/15" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Todos</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function BinarySelect({ label, value, onChange, className = "" }: { label: string; value: string; onChange: (value: string) => void; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-medium text-slate-300">{label}</span>
      <select className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3 text-sm text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/15" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Todos</option>
        <option value="1">Sim</option>
        <option value="0">Não</option>
      </select>
    </label>
  );
}

const tooltipStyle = {
  backgroundColor: "#0f172a",
  border: "1px solid rgba(148, 163, 184, 0.2)",
  borderRadius: "12px",
  color: "#e2e8f0",
};

export default App;
