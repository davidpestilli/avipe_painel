import { useMemo, useState } from "react";
import type {
  ObservabilidadeDivergenciaItem,
  ObservabilidadeDivergenciaResumo,
  ObservabilidadeResponse,
} from "../types";
import { buildQueryString, navigateTo } from "../utils/appHelpers";
import {
  ChartCard,
  HOME_TABS,
  InsightModal,
  MetricCard,
  MiniToggle,
  PeriodPicker,
  type ChartMode,
  type FluxoBreakdownMode,
  type HomeChartTab,
  type MetricScope,
  type StatusLayerMode,
} from "./homeDashboardShared";

type HomeDashboardHeaderProps = {
  observabilidade: ObservabilidadeResponse | null;
  loadingHome: boolean;
  periodo: string;
  onPeriodoChange: (value: string) => void;
  activeHomeTab: HomeChartTab;
  onActiveHomeTabChange: (value: HomeChartTab) => void;
  activeChartMode: ChartMode;
  onChartModeChange: (value: ChartMode) => void;
  metricScope: MetricScope;
  onMetricScopeChange: (value: MetricScope) => void;
  statusLayerMode: StatusLayerMode;
  onStatusLayerModeChange: (value: StatusLayerMode) => void;
  fluxoBreakdownMode: FluxoBreakdownMode;
  onFluxoBreakdownModeChange: (value: FluxoBreakdownMode) => void;
  chartChildren: React.ReactNode;
};

type ModalKind = "processados" | "juntados";

const SEARCH_FILTER_KEYS = [
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

function formatReferenceDate(value: string): string {
  if (!value || value === "Sem data") {
    return "Sem data";
  }

  const [year, month, day] = value.split("-");
  if (!year || !month || !day) {
    return value;
  }

  return `${day}/${month}/${year}`;
}

function openSearchFromDivergence(kind: ModalKind, item: ObservabilidadeDivergenciaItem) {
  const filters = {
    nuprocesso: "",
    cpf: "",
    sig_orgao: item.orgao,
    usuario_logado: "",
    data_insercao_status: kind === "processados" ? "filled" : "",
    data_insercao_inicio: kind === "processados" ? item.data_referencia : "",
    data_insercao_fim: kind === "processados" ? item.data_referencia : "",
    data_processamento_status: kind === "juntados" ? "filled" : "",
    data_processamento_inicio: kind === "juntados" ? item.data_referencia : "",
    data_processamento_fim: kind === "juntados" ? item.data_referencia : "",
    processado: kind === "juntados" ? "1" : "0",
    juntado: kind === "juntados" ? "pending" : "",
  };

  const queryString = buildQueryString(filters, SEARCH_FILTER_KEYS);
  navigateTo("/pesquisas/", queryString);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function DivergenceSection({
  title,
  summary,
  emptyText,
  kind,
}: {
  title: string;
  summary: ObservabilidadeDivergenciaResumo;
  emptyText: string;
  kind: ModalKind;
}) {
  const dateColumnLabel = kind === "processados" ? "Entrada no localizador" : "Data do processamento";

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-950/35 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300">{title}</h4>
          <p className="mt-1 text-sm text-slate-400">
            {summary.registros} registros divergentes · {summary.processos} processos envolvidos
          </p>
        </div>
      </div>

      {summary.itens.length ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-800">
          <table className="min-w-full divide-y divide-slate-800 text-sm">
            <thead className="bg-slate-950/65 text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Unidade</th>
                <th className="px-4 py-3 text-center font-semibold">{dateColumnLabel}</th>
                <th className="px-4 py-3 text-center font-semibold">Registros</th>
                <th className="px-4 py-3 text-center font-semibold">Processos</th>
                <th className="px-4 py-3 text-center font-semibold">Pesquisa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-950/25 text-slate-100">
              {summary.itens.map((item) => (
                <tr key={`${title}-${item.orgao}-${item.data_referencia}`}>
                  <td className="px-4 py-3">{item.orgao}</td>
                  <td className="px-4 py-3 text-center">{formatReferenceDate(item.data_referencia)}</td>
                  <td className="px-4 py-3 text-center">{item.registros}</td>
                  <td className="px-4 py-3 text-center">{item.processos}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      className="inline-flex min-w-[64px] items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition hover:border-cyan-300/60 hover:bg-cyan-400/18"
                      type="button"
                      onClick={() => openSearchFromDivergence(kind, item)}
                    >
                      Ir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 text-sm text-slate-500">{emptyText}</p>
      )}
    </section>
  );
}

function DivergenceModalContent({
  general,
  period,
  periodLabel,
  emptyText,
  kind,
}: {
  general: ObservabilidadeDivergenciaResumo;
  period: ObservabilidadeDivergenciaResumo;
  periodLabel: string;
  emptyText: string;
  kind: ModalKind;
}) {
  return (
    <div className="space-y-4">
      <DivergenceSection title="Visão geral" summary={general} emptyText={emptyText} kind={kind} />
      <DivergenceSection title={`Recorte do período: ${periodLabel}`} summary={period} emptyText={emptyText} kind={kind} />
    </div>
  );
}

export function HomeDashboardHeader({
  observabilidade,
  loadingHome,
  periodo,
  onPeriodoChange,
  activeHomeTab,
  onActiveHomeTabChange,
  activeChartMode,
  onChartModeChange,
  metricScope,
  onMetricScopeChange,
  statusLayerMode,
  onStatusLayerModeChange,
  fluxoBreakdownMode,
  onFluxoBreakdownModeChange,
  chartChildren,
}: HomeDashboardHeaderProps) {
  const [activeModal, setActiveModal] = useState<ModalKind | null>(null);
  const [showKpis, setShowKpis] = useState(false);

  const periodLabel = observabilidade?.periodo.rotulo ?? "Período selecionado";
  const statusTotals = observabilidade?.status_por_orgao.totais_por_orgao ?? [];

  const activeTitle = activeHomeTab === "fluxo" ? "Inclusão no localizador x processamento" : "Processamento x Juntada por Unidade";
  const displayTitle = activeHomeTab === "fluxo" ? "Entrada x processamento" : activeTitle;
  const activeBadge =
    activeHomeTab === "fluxo"
      ? `${metricScope === "registros"
          ? observabilidade?.inclusao_vs_processamento.resumo.inclusoes_registros ?? 0
          : observabilidade?.inclusao_vs_processamento.resumo.inclusoes_processos ?? 0} ${metricScope}`
      : `${statusTotals.length} órgãos com atividade`;
  const activeSummary =
    activeHomeTab === "fluxo"
      ? `Comparativo temporal entre entradas no localizador e processamentos concluídos em ${metricScope}, dentro de ${periodLabel.toLowerCase()}.`
      : `Comparativo por unidade entre processados e juntados em ${metricScope}, dentro de ${periodLabel.toLowerCase()}.`;

  const activeExtraControls =
    activeHomeTab === "status" ? (
      <div className="flex gap-2 whitespace-nowrap">
        <MiniToggle label="Sobrepostos" active={statusLayerMode === "both"} onClick={() => onStatusLayerModeChange("both")} />
        <MiniToggle label="Só processados" active={statusLayerMode === "processados"} onClick={() => onStatusLayerModeChange("processados")} />
        <MiniToggle label="Só juntados" active={statusLayerMode === "juntados"} onClick={() => onStatusLayerModeChange("juntados")} />
      </div>
    ) : activeChartMode === "bar" ? (
      <div className="flex gap-2 whitespace-nowrap">
        <MiniToggle label="Entrada" active={fluxoBreakdownMode === "entrada"} onClick={() => onFluxoBreakdownModeChange("entrada")} />
        <MiniToggle
          label="Processamento"
          active={fluxoBreakdownMode === "processamento"}
          onClick={() => onFluxoBreakdownModeChange("processamento")}
        />
      </div>
    ) : null;

  const hasProcessadosGap = useMemo(() => {
    if (!observabilidade) {
      return false;
    }

    return (
      observabilidade.divergencias.processados.geral.registros > 0 ||
      observabilidade.divergencias.processados.periodo.registros > 0
    );
  }, [observabilidade]);

  const hasJuntadosGap = useMemo(() => {
    if (!observabilidade) {
      return false;
    }

    return (
      observabilidade.divergencias.juntados.geral.registros > 0 ||
      observabilidade.divergencias.juntados.periodo.registros > 0
    );
  }, [observabilidade]);

  const metricCards = [
    {
      label: "Registros",
      generalLabel: "Total geral",
      generalValue: observabilidade?.metricas.registros.geral ?? 0,
      periodValue: observabilidade?.metricas.registros.periodo ?? 0,
      accent: "cyan" as const,
      helper: "Leitura total da base e do recorte temporal selecionado.",
    },
    {
      label: "Processos",
      generalLabel: "Total geral",
      generalValue: observabilidade?.metricas.processos.geral ?? 0,
      periodValue: observabilidade?.metricas.processos.periodo ?? 0,
      accent: "violet" as const,
      helper: "Processos distintos no acervo completo e no período em foco.",
    },
    {
      label: "Processados",
      generalLabel: "Total geral",
      generalValue: observabilidade?.metricas.processados.geral ?? 0,
      periodValue: observabilidade?.metricas.processados.periodo ?? 0,
      accent: "emerald" as const,
      helper: hasProcessadosGap
        ? "Clique para investigar registros ainda não processados."
        : "Sem pendências relevantes entre entradas e processamentos.",
      clickable: hasProcessadosGap,
      alertLabel: hasProcessadosGap ? "Há pendências" : undefined,
      onClick: hasProcessadosGap ? () => setActiveModal("processados") : undefined,
    },
    {
      label: "Juntados",
      generalLabel: "Total geral",
      generalValue: observabilidade?.metricas.juntados.geral ?? 0,
      periodValue: observabilidade?.metricas.juntados.periodo ?? 0,
      accent: "amber" as const,
      helper: hasJuntadosGap
        ? "Clique para investigar o que foi processado e ainda não virou juntada."
        : "Juntadas alinhadas com os processamentos observados.",
      clickable: hasJuntadosGap,
      alertLabel: hasJuntadosGap ? "Há diferença" : undefined,
      onClick: hasJuntadosGap ? () => setActiveModal("juntados") : undefined,
    },
  ];

  return (
    <>
      <section className="rounded-[28px] border border-slate-800 bg-[linear-gradient(180deg,rgba(20,29,50,0.55)_0%,rgba(10,16,29,0.78)_100%)] p-4 shadow-xl shadow-slate-950/20">
        <button
          className="flex w-full items-center justify-between gap-4 text-left"
          type="button"
          onClick={() => setShowKpis((current) => !current)}
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-200/80">KPIs operacionais</p>
            <p className="mt-1 text-sm text-slate-400">
              {showKpis ? "Ocultar visão resumida da base e do período." : "Exibir visão resumida da base e do período."}
            </p>
          </div>

          <span className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/55 px-3 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-200">
            {showKpis ? "Ocultar" : "Expandir"}
            <svg
              className={`h-3.5 w-3.5 transition ${showKpis ? "rotate-180" : ""}`}
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <path d="M3.5 6 8 10.5 12.5 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>

        {showKpis ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-4">
            {metricCards.map((card) => (
              <MetricCard
                key={card.label}
                label={card.label}
                generalLabel={card.generalLabel}
                generalValue={card.generalValue}
                periodValue={card.periodValue}
                periodLabel={periodLabel}
                accent={card.accent}
                helper={card.helper}
                clickable={card.clickable}
                alertLabel={card.alertLabel}
                onClick={card.onClick}
              />
            ))}
          </div>
        ) : null}
      </section>

      <ChartCard
        sectionLabel="Observabilidade"
        title={displayTitle}
        badge={activeBadge}
        summary={activeSummary}
        tabs={HOME_TABS}
        activeTab={activeHomeTab}
        onTabChange={(value) => onActiveHomeTabChange(value as HomeChartTab)}
        periodControl={<PeriodPicker value={periodo} onChange={onPeriodoChange} />}
        rightControls={
          <>
            <div className="flex gap-2 whitespace-nowrap">
              <MiniToggle label="Linhas" active={activeChartMode === "line"} onClick={() => onChartModeChange("line")} />
              <MiniToggle label="Barras" active={activeChartMode === "bar"} onClick={() => onChartModeChange("bar")} />
            </div>
            <div className="flex gap-2 whitespace-nowrap">
              <MiniToggle label="Registros" active={metricScope === "registros"} onClick={() => onMetricScopeChange("registros")} />
              <MiniToggle label="Processos" active={metricScope === "processos"} onClick={() => onMetricScopeChange("processos")} />
            </div>
            {activeExtraControls}
          </>
        }
      >
        <div className="relative min-h-[340px]">
          {chartChildren}
          {loadingHome ? (
            <div className="absolute inset-0 flex items-center justify-center rounded-[24px] bg-slate-950/38 backdrop-blur-[1px]">
              <div className="flex flex-col items-center gap-3">
                <div className="h-14 w-14 animate-spin rounded-full border-2 border-cyan-300/20 border-t-cyan-300 border-r-fuchsia-400/70" />
                <p className="text-sm text-slate-300">Atualizando a observabilidade do Watcher AVIPE...</p>
              </div>
            </div>
          ) : null}
          {!chartChildren && !loadingHome ? (
            <div className="flex min-h-[340px] items-center justify-center text-sm text-slate-400">
              Nenhum dado de observabilidade disponivel para exibir.
            </div>
          ) : null}
        </div>
      </ChartCard>

      <InsightModal
        open={activeModal === "processados"}
        title="Diferenças entre entrada e processamento"
        onClose={() => setActiveModal(null)}
      >
        <DivergenceModalContent
          general={observabilidade?.divergencias.processados.geral ?? { registros: 0, processos: 0, itens: [] }}
          period={observabilidade?.divergencias.processados.periodo ?? { registros: 0, processos: 0, itens: [] }}
          periodLabel={periodLabel}
          emptyText="Nenhuma diferença identificada entre entradas e processamentos."
          kind="processados"
        />
      </InsightModal>

      <InsightModal
        open={activeModal === "juntados"}
        title="Diferenças entre processamento e juntada"
        onClose={() => setActiveModal(null)}
      >
        <DivergenceModalContent
          general={observabilidade?.divergencias.juntados.geral ?? { registros: 0, processos: 0, itens: [] }}
          period={observabilidade?.divergencias.juntados.periodo ?? { registros: 0, processos: 0, itens: [] }}
          periodLabel={periodLabel}
          emptyText="Nenhuma diferença identificada entre processamentos e juntadas."
          kind="juntados"
        />
      </InsightModal>
    </>
  );
}
