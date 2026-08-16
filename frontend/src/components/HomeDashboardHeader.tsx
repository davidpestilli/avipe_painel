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

function formatarDataReferencia(valor: string): string {
  if (!valor || valor === "Sem data") {
    return "Sem data";
  }

  const [ano, mes, dia] = valor.split("-");
  if (!ano || !mes || !dia) {
    return valor;
  }

  return `${dia}/${mes}/${ano}`;
}

function abrirPesquisaPorDivergencia(kind: ModalKind, item: ObservabilidadeDivergenciaItem) {
  const filtros = {
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

  const queryString = buildQueryString(filtros, SEARCH_FILTER_KEYS);
  navigateTo("/pesquisas/", queryString);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function DivergenceSection({
  title,
  resumo,
  emptyText,
  kind,
}: {
  title: string;
  resumo: ObservabilidadeDivergenciaResumo;
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
            {resumo.registros} registros divergentes · {resumo.processos} processos envolvidos
          </p>
        </div>
      </div>

      {resumo.itens.length ? (
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
              {resumo.itens.map((item) => (
                <tr key={`${title}-${item.orgao}-${item.data_referencia}`}>
                  <td className="px-4 py-3">{item.orgao}</td>
                  <td className="px-4 py-3 text-center">{formatarDataReferencia(item.data_referencia)}</td>
                  <td className="px-4 py-3 text-center">{item.registros}</td>
                  <td className="px-4 py-3 text-center">{item.processos}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      className="inline-flex min-w-[64px] items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition hover:border-cyan-300/60 hover:bg-cyan-400/18"
                      type="button"
                      onClick={() => abrirPesquisaPorDivergencia(kind, item)}
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
  geral,
  periodo,
  periodoLabel,
  emptyText,
  kind,
}: {
  geral: ObservabilidadeDivergenciaResumo;
  periodo: ObservabilidadeDivergenciaResumo;
  periodoLabel: string;
  emptyText: string;
  kind: ModalKind;
}) {
  return (
    <div className="space-y-4">
      <DivergenceSection title="Visão geral" resumo={geral} emptyText={emptyText} kind={kind} />
      <DivergenceSection title={`Recorte do período: ${periodoLabel}`} resumo={periodo} emptyText={emptyText} kind={kind} />
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

  const activeTitle =
    activeHomeTab === "localizador"
      ? "Órgãos com envios ao localizador"
      : activeHomeTab === "fluxo"
        ? "Inclusão no localizador x processamento"
        : "Processamento x Juntada por Unidade";

  const displayTitle =
    activeHomeTab === "localizador"
      ? "Inclusões por unidade"
      : activeHomeTab === "fluxo"
        ? "Entrada x processamento"
        : activeTitle;

  const activeBadge =
    activeHomeTab === "localizador"
      ? `${observabilidade?.entrada_localizador_por_orgao.resumo.orgaos_ativos ?? 0} órgãos ativos`
      : activeHomeTab === "fluxo"
        ? `${metricScope === "registros"
            ? observabilidade?.inclusao_vs_processamento.resumo.inclusoes_registros ?? 0
            : observabilidade?.inclusao_vs_processamento.resumo.inclusoes_processos ?? 0} ${metricScope}`
        : `${statusTotals.length} órgãos com atividade`;

  const activeSummary =
    activeHomeTab === "localizador"
      ? `Escopo: por unidade. No período ${periodLabel.toLowerCase()}, houve ${
          metricScope === "registros"
            ? observabilidade?.entrada_localizador_por_orgao.resumo.registros ?? 0
            : observabilidade?.entrada_localizador_por_orgao.resumo.processos ?? 0
        } ${metricScope} com inclusão no localizador.`
      : activeHomeTab === "fluxo"
        ? `Escopo: visão global. Comparativo temporal entre entradas no localizador e processamentos concluídos em ${metricScope}, dentro de ${periodLabel.toLowerCase()}.`
        : "";

  const activeExtraControls =
    activeHomeTab === "status" ? (
      <div className="flex gap-2 whitespace-nowrap">
        <MiniToggle label="Sobrepostos" active={statusLayerMode === "both"} onClick={() => onStatusLayerModeChange("both")} />
        <MiniToggle label="Só processados" active={statusLayerMode === "processados"} onClick={() => onStatusLayerModeChange("processados")} />
        <MiniToggle label="Só juntados" active={statusLayerMode === "juntados"} onClick={() => onStatusLayerModeChange("juntados")} />
      </div>
    ) : activeHomeTab === "fluxo" && activeChartMode === "bar" ? (
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
      generalValue: observabilidade?.metricas.registros.geral ?? 0,
      periodValue: observabilidade?.metricas.registros.periodo ?? 0,
      accent: "cyan" as const,
      helper: "Leitura total da base e do recorte temporal selecionado.",
    },
    {
      label: "Processos",
      generalValue: observabilidade?.metricas.processos.geral ?? 0,
      periodValue: observabilidade?.metricas.processos.periodo ?? 0,
      accent: "violet" as const,
      helper: "Processos distintos no acervo completo e no período em foco.",
    },
    {
      label: "Processados",
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
          <div className="mt-4 grid gap-3 xl:grid-cols-4">
            {metricCards.map((card) => (
              <MetricCard
                key={card.label}
                label={card.label}
                generalLabel="Total geral"
                generalValue={card.generalValue}
                periodLabel={periodLabel}
                periodValue={card.periodValue}
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
            title={displayTitle}
            badge={activeBadge}
            summary={activeSummary}
            chartMode={activeChartMode}
            onChartModeChange={onChartModeChange}
            metricScope={metricScope}
            onMetricScopeChange={onMetricScopeChange}
            extraControls={activeExtraControls}
          >
            {chartChildren}
          </ChartCard>
        ) : null}
      </section>

      {observabilidade ? (
        <>
          <InsightModal open={activeModal === "processados"} title="Pendências de processamento" onClose={() => setActiveModal(null)}>
            <DivergenceModalContent
              geral={observabilidade.divergencias.processados.geral}
              periodo={observabilidade.divergencias.processados.periodo}
              periodoLabel={periodLabel}
              emptyText="Nenhuma pendência de processamento encontrada."
              kind="processados"
            />
          </InsightModal>

          <InsightModal open={activeModal === "juntados"} title="Diferenças entre processamento e juntada" onClose={() => setActiveModal(null)}>
            <DivergenceModalContent
              geral={observabilidade.divergencias.juntados.geral}
              periodo={observabilidade.divergencias.juntados.periodo}
              periodoLabel={periodLabel}
              emptyText="Nenhuma diferença entre processados e juntados foi encontrada."
              kind="juntados"
            />
          </InsightModal>
        </>
      ) : null}
    </>
  );
}
