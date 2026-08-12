import { FormEvent, useEffect, useState } from "react";
import { fetchDashboard, fetchDetalhe, fetchLista } from "./api";
import type { DashboardData, DetalheResponse, ListaResponse, PesquisaRegistro } from "./types";

type RouteView = "dashboard" | "lista" | "detalhe";

const FILTER_KEYS = [
  "nuprocesso",
  "cpf",
  "sig_orgao",
  "usuario_logado",
  "data_insercao",
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
  data_insercao: "",
  processado: "",
  juntado: "",
};

function App() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [lista, setLista] = useState<ListaResponse | null>(null);
  const [detalhe, setDetalhe] = useState<DetalheResponse | null>(null);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [currentView, setCurrentView] = useState<RouteView>("dashboard");
  const [loading, setLoading] = useState(true);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState("");
  const [returnQuery, setReturnQuery] = useState("");

  useEffect(() => {
    void bootstrap();

    const handlePopState = () => {
      void syncFromLocation(false);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

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

  function getViewFromPath(pathname: string): RouteView {
    if (pathname.startsWith("/pesquisas/detalhe/")) {
      return "detalhe";
    }
    if (pathname.startsWith("/pesquisas/")) {
      return "lista";
    }
    return "dashboard";
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

    if (view === "dashboard") {
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
      setError(fetchError instanceof Error ? fetchError.message : "Falha ao carregar a lista.");
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

  async function handleGoToDashboard() {
    navigateTo("/");
    setCurrentView("dashboard");
    setDetalhe(null);
    setError("");
    if (!dashboard) {
      await loadDashboard();
    }
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
      return value ? "Sim" : "Nao";
    }
    if (value === 1 || value === "1") {
      return "Sim";
    }
    if (value === 0 || value === "0") {
      return "Nao";
    }
    return formatText(value);
  }

  function formatText(value: unknown) {
    if (value === null || value === undefined || value === "") {
      return "-";
    }
    return String(value);
  }

  const records = currentView === "dashboard" ? dashboard?.ultimos_registros ?? [] : lista?.paginacao.itens ?? [];
  const detalhesRegistro = detalhe?.registro ? Object.entries(detalhe.registro) : [];

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-slate-800">
      <div className="mx-auto max-w-[1680px] px-4 py-6 sm:px-6 lg:px-8">
        {error ? (
          <section className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </section>
        ) : null}

        {loading ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm text-slate-600">Carregando painel AVIPE...</p>
          </section>
        ) : null}

        {!loading && currentView === "dashboard" && dashboard ? (
          <div className="space-y-6">
            <section className="flex flex-col gap-4 rounded-2xl bg-gradient-to-r from-[#183153] to-[#2f6690] px-6 py-6 text-white shadow-sm md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-semibold">Resumo do banco AVIPE</h1>
                <p className="mt-2 max-w-3xl text-sm text-slate-100">
                  Leitura do banco <code className="rounded bg-white/10 px-1 py-0.5 text-white">{dashboard.info_banco.database}</code> em{" "}
                  <code className="rounded bg-white/10 px-1 py-0.5 text-white">
                    {dashboard.info_banco.host}:{dashboard.info_banco.porta}
                  </code>
                  , sem alterar o fluxo do robo.
                </p>
                <p className="mt-1 text-sm text-slate-100">
                  Contexto local desta execucao: usuario{" "}
                  <code className="rounded bg-white/10 px-1 py-0.5 text-white">{dashboard.info_banco.usuario_logado}</code> e IP{" "}
                  <code className="rounded bg-white/10 px-1 py-0.5 text-white">{dashboard.info_banco.ip_cliente}</code>.
                </p>
              </div>
              <button
                className="inline-flex h-11 items-center justify-center rounded-lg bg-white px-5 text-sm font-semibold text-[#183153] transition hover:bg-slate-100"
                type="button"
                onClick={() => void handleGoToLista()}
              >
                Abrir consultas
              </button>
            </section>

            <MetricSection title="Totais globais do banco" metrics={dashboard.metricas.globais} />
            <MetricSection title="Totais desta maquina e deste usuario" metrics={dashboard.metricas.maquina_usuario} />

            <SimpleTableCard
              title="Ultimos registros"
              records={records}
              showAction={false}
              onOpenDetail={handleOpenDetail}
              formatText={formatText}
              formatDate={formatDate}
              formatBoolean={formatBoolean}
            />
          </div>
        ) : null}

        {!loading && currentView === "lista" ? (
          <div className="space-y-6">
            <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-semibold">Consulta da tabela avipe_pesquisa_endereco</h1>
                <p className="mt-1 text-sm text-slate-500">Filtro local, paginacao e acesso ao detalhe de cada linha.</p>
              </div>
              <button
                className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                type="button"
                onClick={() => void handleGoToDashboard()}
              >
                Voltar ao resumo
              </button>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <form className="grid gap-4 p-5 md:grid-cols-[repeat(14,minmax(0,1fr))]" onSubmit={(event) => void handleFilterSubmit(event)}>
                <Field className="md:col-span-3" label="Processo" value={filters.nuprocesso} onChange={(value) => setFilters((current) => ({ ...current, nuprocesso: value }))} />
                <Field className="md:col-span-2" label="CPF" value={filters.cpf} onChange={(value) => setFilters((current) => ({ ...current, cpf: value }))} />
                <SelectField
                  className="md:col-span-2"
                  label="Orgao"
                  value={filters.sig_orgao}
                  options={lista?.siglas_orgaos ?? []}
                  onChange={(value) => setFilters((current) => ({ ...current, sig_orgao: value }))}
                />
                <Field className="md:col-span-2" label="Usuario" value={filters.usuario_logado} onChange={(value) => setFilters((current) => ({ ...current, usuario_logado: value }))} />
                <DateField className="md:col-span-2" label="Inserido em" value={filters.data_insercao} onChange={(value) => setFilters((current) => ({ ...current, data_insercao: value }))} />
                <BinarySelect className="md:col-span-1" label="Processado" value={filters.processado} onChange={(value) => setFilters((current) => ({ ...current, processado: value }))} />
                <BinarySelect className="md:col-span-1" label="Juntado" value={filters.juntado} onChange={(value) => setFilters((current) => ({ ...current, juntado: value }))} />
                <div className="md:col-span-1 md:flex md:items-end">
                  <button
                    className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-[#0d6efd] px-4 text-sm font-semibold text-white transition hover:bg-[#0b5ed7]"
                    type="submit"
                  >
                    {loadingList ? "Filtrando..." : "Filtrar"}
                  </button>
                </div>
              </form>
            </section>

            <SimpleTableCard
              title={`${lista?.paginacao.total ?? 0} registro(s)`}
              subtitle={lista ? `Pagina ${lista.paginacao.pagina} de ${lista.paginacao.total_paginas}` : undefined}
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
                      className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      type="button"
                      disabled={loadingList}
                      onClick={() => void handleGoToLista(lista.paginacao.pagina - 1)}
                    >
                      Pagina anterior
                    </button>
                  ) : null}
                </div>
                <div>
                  {lista.paginacao.tem_proxima ? (
                    <button
                      className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      type="button"
                      disabled={loadingList}
                      onClick={() => void handleGoToLista(lista.paginacao.pagina + 1)}
                    >
                      Proxima pagina
                    </button>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {!loading && currentView === "detalhe" ? (
          <div className="space-y-6">
            <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-semibold">Detalhe do registro</h1>
                <p className="mt-1 text-sm text-slate-500">Visualizacao completa da linha selecionada no banco AVIPE.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  type="button"
                  onClick={() => void handleGoToLista(1, applyFiltersFromParams(new URLSearchParams(returnQuery)))}
                >
                  Voltar para consultas
                </button>
                <button
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  type="button"
                  onClick={() => void handleGoToDashboard()}
                >
                  Voltar ao resumo
                </button>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              {loadingDetail ? (
                <p className="text-sm text-slate-500">Carregando detalhe...</p>
              ) : detalhe?.erro ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{detalhe.erro}</div>
              ) : (
                <dl className="grid gap-y-3 md:grid-cols-[220px_minmax(0,1fr)] md:gap-x-6">
                  {detalhesRegistro.map(([key, value]) => (
                    <>
                      <dt key={`${key}-dt`} className="text-sm font-semibold text-slate-500">
                        {key}
                      </dt>
                      <dd key={`${key}-dd`} className="break-all text-sm text-slate-800">
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

function MetricSection({ title, metrics }: { title: string; metrics: DashboardData["metricas"]["globais"] }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total de registros" value={metrics.total} />
        <MetricCard label="Pendentes" value={metrics.pendentes} />
        <MetricCard label="Processados" value={metrics.processados} />
        <MetricCard label="Juntados" value={metrics.juntados} />
      </div>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-4xl font-semibold text-slate-800">{value}</div>
    </article>
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
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-2 border-b border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <strong className="text-base text-slate-800">{title}</strong>
        {subtitle ? <span className="text-sm text-slate-500">{subtitle}</span> : null}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[1450px] w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <HeaderCell>Processo</HeaderCell>
              <HeaderCell>CPF</HeaderCell>
              <HeaderCell>Orgao</HeaderCell>
              <HeaderCell>Usuario</HeaderCell>
              <HeaderCell>IP</HeaderCell>
              <HeaderCell centered>Incluido no localizador em</HeaderCell>
              <HeaderCell centered>Processado em</HeaderCell>
              <HeaderCell centered>Processado</HeaderCell>
              <HeaderCell centered>Juntado</HeaderCell>
              {showAction ? <HeaderCell /> : null}
            </tr>
          </thead>
          <tbody>
            {records.length ? (
              records.map((item, index) => (
                <tr key={`${item.id}-${item.nuprocesso}-${index}`} className={striped && index % 2 === 0 ? "bg-slate-50/70" : "bg-white"}>
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
                        className="inline-flex min-w-[88px] items-center justify-center rounded-md border border-[#0d6efd] px-3 py-1.5 text-xs font-semibold text-[#0d6efd] transition hover:bg-[#0d6efd] hover:text-white"
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
                <td colSpan={showAction ? 10 : 9} className="px-4 py-8 text-center text-sm text-slate-500">
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

function HeaderCell({ children, centered = false }: { children?: React.ReactNode; centered?: boolean }) {
  return (
    <th className={`whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600 ${centered ? "text-center" : ""}`}>
      {children}
    </th>
  );
}

function BodyCell({
  children,
  centered = false,
  className = "",
}: {
  children: React.ReactNode;
  centered?: boolean;
  className?: string;
}) {
  return <td className={`whitespace-nowrap border-t border-slate-200 px-4 py-3 text-slate-800 ${centered ? "text-center" : ""} ${className}`}>{children}</td>;
}

function Field({
  label,
  value,
  onChange,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <input
        className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[#0d6efd] focus:ring-2 focus:ring-[#0d6efd]/15"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function DateField({
  label,
  value,
  onChange,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <input
        className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[#0d6efd] focus:ring-2 focus:ring-[#0d6efd]/15"
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
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
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <select
        className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[#0d6efd] focus:ring-2 focus:ring-[#0d6efd]/15"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
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

function BinarySelect({
  label,
  value,
  onChange,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-sm font-medium text-slate-700">{label}</span>
      <select
        className="h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-[#0d6efd] focus:ring-2 focus:ring-[#0d6efd]/15"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Todos</option>
        <option value="1">Sim</option>
        <option value="0">Nao</option>
      </select>
    </label>
  );
}

export default App;
