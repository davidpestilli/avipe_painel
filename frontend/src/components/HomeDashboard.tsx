import { useMemo } from "react";
import type { ObservabilidadeResponse } from "../types";
import { HomeDashboardHeader } from "./HomeDashboardHeader";
import {
  type FluxoBreakdownMode,
  type HomeChartTab,
  SERIES_COLORS,
  type MetricScope,
  type StatusLayerMode,
  type ChartMode,
} from "./homeDashboardShared";
import {
  FluxoTimelineChart,
  OrganSelector,
  OrgTimelineChart,
  OrgTotalsChart,
  StatusTimelineChart,
  StatusTotalsChart,
} from "./homeDashboardCharts";

export type { ChartMode, FluxoBreakdownMode, HomeChartTab, MetricScope, StatusLayerMode } from "./homeDashboardShared";

type HomeViewProps = {
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
  fluxoBreakdownMode,
  onFluxoBreakdownModeChange,
  selectedOrgans,
  onSelectedOrgansChange,
}: HomeViewProps) {
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

  const chartContent =
    !observabilidade ? null : activeHomeTab === "localizador" ? (
      activeChartMode === "bar" ? (
        <OrgTotalsChart data={observabilidade.entrada_localizador_por_orgao.totais_por_orgao ?? []} metricScope={metricScope} />
      ) : (
        <OrgTimelineChart
          data={observabilidade.entrada_localizador_por_orgao.evolucao}
          metricScope={metricScope}
          periodKey={observabilidade.periodo.selecionado}
        />
      )
    ) : activeHomeTab === "fluxo" ? (
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
            rankedOrgans={(observabilidade.status_por_orgao.totais_por_orgao ?? []).map((item) => item.orgao)}
            selectedOrgans={selectedOrgans}
            onChange={onSelectedOrgansChange}
          />
        ) : null}
        {activeChartMode === "bar" ? (
          <StatusTotalsChart data={observabilidade.status_por_orgao.totais_por_orgao ?? []} layerMode={statusLayerMode} metricScope={metricScope} />
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
        chartChildren={chartContent}
      />
    </div>
  );
}
