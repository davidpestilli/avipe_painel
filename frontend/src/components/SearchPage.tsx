import type { FormEvent } from "react";
import { countDistinctProcesses } from "../utils/appHelpers";
import type { ListaResponse } from "../types";
import { AnalysisSelect, BinarySelect, DateFilterGroup, Field, SelectField, ToggleField } from "./FormFields";
import type { AnalisesPorRegistro } from "../features/analises/types";
import { SearchTable, type PesquisaViewMode } from "./SearchTable";

type FilterState = {
  nuprocesso: string;
  cpf: string;
  sig_orgao: string;
  usuario_logado: string;
  data_insercao_status: string;
  data_insercao_inicio: string;
  data_insercao_fim: string;
  data_processamento_status: string;
  data_processamento_inicio: string;
  data_processamento_fim: string;
  processado: string;
  juntado: string;
  analise: string;
};

type SearchPageProps = {
  lista: ListaResponse | null;
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  loadingList: boolean;
  loadingExport: boolean;
  showPeriodFilters: boolean;
  setShowPeriodFilters: React.Dispatch<React.SetStateAction<boolean>>;
  pesquisaViewMode: PesquisaViewMode;
  setPesquisaViewMode: React.Dispatch<React.SetStateAction<PesquisaViewMode>>;
  expandedProcesses: string[];
  setExpandedProcesses: React.Dispatch<React.SetStateAction<string[]>>;
  onSubmit: (event: FormEvent) => Promise<void>;
  onExport: () => void;
  onOpenDetail: (id: number | string) => Promise<void>;
  onPreviousPage: () => Promise<void>;
  onNextPage: () => Promise<void>;
  formatText: (value: unknown) => string;
  formatDate: (value: unknown) => string;
  formatBoolean: (value: unknown) => string;
  analises: AnalisesPorRegistro;
  savingAnalysisIds: number[];
  onToggleAnalysis: (registroId: number, analisado: boolean) => Promise<void>;
};

export function SearchPage({
  lista,
  filters,
  setFilters,
  loadingList,
  loadingExport,
  showPeriodFilters,
  setShowPeriodFilters,
  pesquisaViewMode,
  setPesquisaViewMode,
  expandedProcesses,
  setExpandedProcesses,
  onSubmit,
  onExport,
  onOpenDetail,
  onPreviousPage,
  onNextPage,
  formatText,
  formatDate,
  formatBoolean,
  analises,
  savingAnalysisIds,
  onToggleAnalysis,
}: SearchPageProps) {
  const records = lista?.paginacao.itens ?? [];
  const pageProcessCount = countDistinctProcesses(records, (item) => item.nuprocesso);
  const totalProcessCount = lista?.paginacao.total_processos ?? 0;
  const isGroupedView = pesquisaViewMode === "agrupada";
  const title = isGroupedView ? `${totalProcessCount} processo(s)` : `${lista?.paginacao.total ?? 0} registro(s)`;
  const subtitle = lista
    ? isGroupedView
      ? `Página ${lista.paginacao.pagina} de ${lista.paginacao.total_paginas} · ${pageProcessCount} processo(s) nesta página`
      : `Página ${lista.paginacao.pagina} de ${lista.paginacao.total_paginas} · ${records.length} registro(s) nesta página`
    : undefined;

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/85 shadow-2xl shadow-slate-950/40">
        <form className="space-y-4 p-5" onSubmit={(event) => void onSubmit(event)}>
          <div className="grid gap-4 xl:grid-cols-[1.2fr_1.2fr_1.05fr_0.95fr_0.95fr_0.75fr_0.75fr_auto]">
            <ToggleField
              className="min-w-0"
              label="Visualização"
              value={pesquisaViewMode}
              options={[
                { value: "agrupada", label: "Processos" },
                { value: "linhas", label: "Registros" },
              ]}
              onChange={(value) => setPesquisaViewMode(value as PesquisaViewMode)}
            />
            <Field className="min-w-0" label="Processo" value={filters.nuprocesso} onChange={(value) => setFilters((current) => ({ ...current, nuprocesso: value }))} />
            <Field className="min-w-0" label="CPF" value={filters.cpf} onChange={(value) => setFilters((current) => ({ ...current, cpf: value }))} />
            <SelectField className="min-w-0" label="Órgão" value={filters.sig_orgao} options={lista?.siglas_orgaos ?? []} onChange={(value) => setFilters((current) => ({ ...current, sig_orgao: value }))} />
            <SelectField className="min-w-0" label="Usuário" value={filters.usuario_logado} options={lista?.usuarios_logados ?? []} onChange={(value) => setFilters((current) => ({ ...current, usuario_logado: value }))} />
            <BinarySelect className="min-w-0" label="Processado" value={filters.processado} onChange={(value) => setFilters((current) => ({ ...current, processado: value }))} />
            <BinarySelect className="min-w-0" label="Juntado" value={filters.juntado} includeNullOption onChange={(value) => setFilters((current) => ({ ...current, juntado: value }))} />
            <div className="flex items-end justify-end gap-2">
              <button
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-950/60 text-slate-200 transition hover:border-cyan-400/35 hover:text-white"
                type="button"
                aria-label={showPeriodFilters ? "Ocultar filtros de período" : "Expandir filtros de período"}
                onClick={() => setShowPeriodFilters((current) => !current)}
              >
                <svg className={`h-4 w-4 transition ${showPeriodFilters ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M4 7l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button className="inline-flex h-11 min-w-[96px] items-center justify-center rounded-xl bg-cyan-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400" type="submit">
                {loadingList ? "Filtrando..." : "Filtrar"}
              </button>
              <button
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-400/35 bg-emerald-500/15 text-emerald-200 transition hover:bg-emerald-400 hover:text-slate-950 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-900/60 disabled:text-slate-500"
                type="button"
                aria-label="Exportar tabela para Excel"
                title="Exportar tabela para Excel"
                disabled={loadingExport}
                onClick={onExport}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M14 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M8 9l4 6" strokeLinecap="round" />
                  <path d="M12 9l-4 6" strokeLinecap="round" />
                  <path d="M14 7h4" strokeLinecap="round" />
                  <path d="M14 12h4" strokeLinecap="round" />
                  <path d="M14 17h4" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>

          {showPeriodFilters ? (
            <div className="grid gap-4 xl:grid-cols-3">
              <DateFilterGroup
                label="Inserido em"
                statusValue={filters.data_insercao_status}
                startValue={filters.data_insercao_inicio}
                endValue={filters.data_insercao_fim}
                onStatusChange={(value) => setFilters((current) => ({ ...current, data_insercao_status: value }))}
                onStartChange={(value) => setFilters((current) => ({ ...current, data_insercao_inicio: value }))}
                onEndChange={(value) => setFilters((current) => ({ ...current, data_insercao_fim: value }))}
              />
              <DateFilterGroup
                label="Processado em"
                statusValue={filters.data_processamento_status}
                startValue={filters.data_processamento_inicio}
                endValue={filters.data_processamento_fim}
                includeNullOption
                onStatusChange={(value) => setFilters((current) => ({ ...current, data_processamento_status: value }))}
                onStartChange={(value) => setFilters((current) => ({ ...current, data_processamento_inicio: value }))}
                onEndChange={(value) => setFilters((current) => ({ ...current, data_processamento_fim: value }))}
              />
              <div className="rounded-2xl border border-slate-800 bg-slate-950/35 p-3">
                <AnalysisSelect
                  label="Análise"
                  value={filters.analise}
                  onChange={(value) => setFilters((current) => ({ ...current, analise: value }))}
                />
              </div>
            </div>
          ) : null}
        </form>
      </section>

      <SearchTable
        title={title}
        subtitle={subtitle}
        records={records}
        viewMode={pesquisaViewMode}
        expandedProcesses={expandedProcesses}
        onToggleProcess={(processo) =>
          setExpandedProcesses((current) => (current.includes(processo) ? current.filter((item) => item !== processo) : [...current, processo]))
        }
        showAction
        striped
        onOpenDetail={onOpenDetail}
        formatText={formatText}
        formatDate={formatDate}
        formatBoolean={formatBoolean}
        analises={analises}
        savingAnalysisIds={savingAnalysisIds}
        onToggleAnalysis={onToggleAnalysis}
      />

      {lista ? (
        <div className="flex items-center justify-between">
          <div>
            {lista.paginacao.tem_anterior ? (
              <button
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-900/85 px-4 text-sm font-semibold text-slate-200 transition hover:border-cyan-400/35 hover:text-white"
                type="button"
                disabled={loadingList}
                onClick={() => void onPreviousPage()}
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
                onClick={() => void onNextPage()}
              >
                Próxima página
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
