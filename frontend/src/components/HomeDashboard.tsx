import { useMemo } from "react";
import type { ObservabilidadeResponse, ObservabilidadeTotalPorOrgao } from "../types";
import { HomeDashboardHeader } from "./HomeDashboardHeader";
import {
  type FluxoBreakdownMode,
  type HomeChartTab,
  SERIES_COLORS,
  type MetricScope,
  type StatusLayerMode,
  type ChartMode,
} from "./homeDashboardShared";
import { FluxoTimelineChart, OrganSelector, StatusTimelineChart, StatusTotalsChart } from "./homeDashboardCharts";

export type { ChartMode, FluxoBreakdownMode, HomeChartTab, MetricScope, StatusLayerMode } from "./homeDashboardShared";

type HomeViewProps = {
  observabilidade: ObservabilidadeResponse | null;
  loadingHome: boolean;
  periodo: string;
  onPeriodoChange: (value: string) => void;
  activeHomeTab: HomeChartTab;
  onActiveHomeTabChange: (value: HomeChartTab) => void;
  fluxoChartMode: ChartMode;
  onFluxoChartModeChange: (value: ChartMode) => void;
  statusChartMode: ChartMode;
  onStatusChartModeChange: (value: ChartMode) => void;
  metricScope: MetricScope;
  onMetricScopeChange: (value: MetricScope) => void;
  statusLayerMode: StatusLayerMode;
  onStatusLayerModeChange: (value: StatusLayerMode) => void;
  fluxoBreakdownMode: FluxoBreakdownMode;
  onFluxoBreakdownModeChange: (value: FluxoBreakdownMode) => void;
  selectedOrgans: string[];
  onSelectedOrgansChange: (items: string[]) => void;
};

export function HomeView({
  observabilidade,
  loadingHome,
  periodo,
  onPeriodoChange,
  activeHomeTab,
  onActiveHomeTabChange,
  fluxoChartMode,
  onFluxoChartModeChange,
  statusChartMode,
  onStatusChartModeChange,
  metricScope,
  onMetricScopeChange,
  statusLayerMode,
  onStatusLayerModeChange,
  fluxoBreakdownMode,
  onFluxoBreakdownModeChange,
  selectedOrgans,
  onSelectedOrgansChange,
}: HomeViewProps) {
  const statusTotals = observabilidade?.status_por_orgao.totais_por_orgao ?? [];

  const rankedStatusOrgans = useMemo(() => {
    const processadosKey = metricScope === "registros" ? "processados_registros" : "processados_processos";
    const juntadosKey = metricScope === "registros" ? "juntados_registros" : "juntados_processos";

    return [...statusTotals].sort((left, right) => {
      const leftProcessados = Number(left[processadosKey as keyof ObservabilidadeTotalPorOrgao] ?? 0);
      const rightProcessados = Number(right[processadosKey as keyof ObservabilidadeTotalPorOrgao] ?? 0);
      const leftJuntados = Number(left[juntadosKey as keyof ObservabilidadeTotalPorOrgao] ?? 0);
      const rightJuntados = Number(right[juntadosKey as keyof ObservabilidadeTotalPorOrgao] ?? 0);
      const leftMetric = statusLayerMode === "processados" ? leftProcessados : statusLayerMode === "juntados" ? leftJuntados : leftProcessados + leftJuntados;
      const rightMetric = statusLayerMode === "processados" ? rightProcessados : statusLayerMode === "juntados" ? rightJuntados : rightProcessados + rightJuntados;

      return rightMetric - leftMetric || left.orgao.localeCompare(right.orgao);
    });
  }, [metricScope, statusLayerMode, statusTotals]);

  const statusSeries = useMemo(
    () =>
      selectedOrgans.map((orgao, index) => ({
        orgao,
        color: SERIES_COLORS[index % SERIES_COLORS.length],
      })),
    [selectedOrgans],
  );

  const activeChartMode = activeHomeTab === "fluxo" ? fluxoChartMode : statusChartMode;

  const setActiveChartMode = (value: ChartMode) => {
    if (activeHomeTab === "fluxo") {
      onFluxoChartModeChange(value);
      return;
    }
    onStatusChartModeChange(value);
  };

  const chartChildren =
    !observabilidade ? null : activeHomeTab === "fluxo" ? (
      <FluxoTimelineChart
        data={observabilidade.inclusao_vs_processamento.evolucao ?? []}
        mode={activeChartMode}
        metricScope={metricScope}
        periodKey={observabilidade.periodo.selecionado}
        breakdownMode={fluxoBreakdownMode}
      />
    ) : (
      <div className="space-y-4">
        {activeChartMode === "line" ? (
          <OrganSelector
            rankedOrgans={rankedStatusOrgans}
            selectedOrgans={selectedOrgans}
            onChange={onSelectedOrgansChange}
            layerMode={statusLayerMode}
            metricScope={metricScope}
          />
        ) : null}
        {activeChartMode === "bar" ? (
          <StatusTotalsChart data={statusTotals} layerMode={statusLayerMode} metricScope={metricScope} />
        ) : (
          <StatusTimelineChart
            data={observabilidade.status_por_orgao.evolucao ?? []}
            series={statusSeries}
            layerMode={statusLayerMode}
            metricScope={metricScope}
            periodKey={observabilidade.periodo.selecionado}
          />
        )}
      </div>
    );

  return (
    <div className="space-y-6">
      <HomeDashboardHeader
        observabilidade={observabilidade}
        loadingHome={loadingHome}
        periodo={periodo}
        onPeriodoChange={onPeriodoChange}
        activeHomeTab={activeHomeTab}
        onActiveHomeTabChange={onActiveHomeTabChange}
        activeChartMode={activeChartMode}
        onChartModeChange={setActiveChartMode}
        metricScope={metricScope}
        onMetricScopeChange={onMetricScopeChange}
        statusLayerMode={statusLayerMode}
        onStatusLayerModeChange={onStatusLayerModeChange}
        fluxoBreakdownMode={fluxoBreakdownMode}
        onFluxoBreakdownModeChange={onFluxoBreakdownModeChange}
        chartChildren={chartChildren}
      />
    </div>
  );
}
