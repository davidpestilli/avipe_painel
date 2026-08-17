import type { ReactElement, ReactNode } from "react";
import { ResponsiveContainer } from "recharts";
import type { ObservabilidadeResponse, ObservabilidadeTotalPorOrgao } from "../types";

export type ChartMode = "line" | "bar";
export type MetricScope = "registros" | "processos";
export type StatusLayerMode = "both" | "processados" | "juntados";
export type HomeChartTab = "fluxo" | "status";
export type FluxoBreakdownMode = "entrada" | "processamento";
export type ChartRow = Record<string, string | number>;

export const PERIOD_OPTIONS = [
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

export const HOME_TABS = [
  { id: "fluxo", label: "Entrada x Processamento" },
  { id: "status", label: "Processamento x Juntada" },
] satisfies Array<{ id: HomeChartTab; label: string }>;

export const SERIES_COLORS = ["#5b8cff", "#18c29c", "#f59e0b", "#ef5da8", "#8b5cf6", "#22d3ee", "#f97316", "#94a3b8", "#fb7185", "#2dd4bf"];

function getOrgaoProcessamentoJuntadaCounts(item: ObservabilidadeTotalPorOrgao, metricScope: MetricScope) {
  const processadosKey = metricScope === "registros" ? "processados_registros" : "processados_processos";
  const juntadosKey = metricScope === "registros" ? "juntados_registros" : "juntados_processos";
  const processados = Number(item[processadosKey] ?? 0);
  const juntados = Number(item[juntadosKey] ?? 0);

  return {
    processados: Number.isFinite(processados) ? processados : 0,
    juntados: Number.isFinite(juntados) ? juntados : 0,
  };
}

export function getOrgaoProcessamentoJuntadaGap(item: ObservabilidadeTotalPorOrgao, metricScope: MetricScope) {
  const { processados, juntados } = getOrgaoProcessamentoJuntadaCounts(item, metricScope);
  if (processados === juntados) {
    return 0;
  }
  return Math.abs(processados - juntados);
}

function getOrgaoActivity(item: ObservabilidadeTotalPorOrgao, metricScope: MetricScope) {
  const { processados, juntados } = getOrgaoProcessamentoJuntadaCounts(item, metricScope);
  return processados + juntados;
}

function compareOrgansByGapThenName(
  left: ObservabilidadeTotalPorOrgao,
  right: ObservabilidadeTotalPorOrgao,
  metricScope: MetricScope,
) {
  const gapDiff = getOrgaoProcessamentoJuntadaGap(right, metricScope) - getOrgaoProcessamentoJuntadaGap(left, metricScope);
  if (gapDiff !== 0) {
    return gapDiff;
  }
  return left.orgao.localeCompare(right.orgao);
}

export function computeHighlightedOrgans(payload: ObservabilidadeResponse | null, metricScope: MetricScope): string[] {
  if (!payload) {
    return [];
  }

  const totais = payload.status_por_orgao?.totais_por_orgao ?? [];
  const fallbackNames = payload.orgaos_disponiveis ?? [];

  if (!totais.length) {
    return fallbackNames.slice(0, 3);
  }

  const withGap = totais
    .filter((item) => getOrgaoProcessamentoJuntadaGap(item, metricScope) > 0)
    .sort((left, right) => compareOrgansByGapThenName(left, right, metricScope));
  const withoutGap = totais
    .filter((item) => getOrgaoProcessamentoJuntadaGap(item, metricScope) === 0)
    .sort((left, right) => getOrgaoActivity(right, metricScope) - getOrgaoActivity(left, metricScope) || left.orgao.localeCompare(right.orgao));

  const deficitOrgans = withGap.map((item) => item.orgao);

  if (deficitOrgans.length >= 3) {
    return deficitOrgans;
  }

  const fillCount = Math.max(0, 3 - deficitOrgans.length);
  const fillOrgans = withoutGap
    .filter((item) => !deficitOrgans.includes(item.orgao))
    .slice(0, fillCount)
    .map((item) => item.orgao);

  return [...deficitOrgans, ...fillOrgans];
}

export function orderOrgansForHighlight(
  organs: string[],
  rankedOrgans: ObservabilidadeTotalPorOrgao[],
  metricScope: MetricScope,
): string[] {
  const statsByName = new Map(rankedOrgans.map((item) => [item.orgao, item]));
  const rankedOrder = rankedOrgans.map((item) => item.orgao);
  const withGap = organs
    .filter((orgao) => getOrgaoProcessamentoJuntadaGap(statsByName.get(orgao) ?? { orgao }, metricScope) > 0)
    .sort((left, right) =>
      compareOrgansByGapThenName(statsByName.get(left) ?? { orgao: left }, statsByName.get(right) ?? { orgao: right }, metricScope),
    );
  const withoutGap = organs
    .filter((orgao) => getOrgaoProcessamentoJuntadaGap(statsByName.get(orgao) ?? { orgao }, metricScope) === 0)
    .sort((left, right) => rankedOrder.indexOf(left) - rankedOrder.indexOf(right));

  return [...withGap, ...withoutGap];
}

export function orderOrgansForSelectorList(rankedOrgans: ObservabilidadeTotalPorOrgao[], metricScope: MetricScope): string[] {
  return orderOrgansForHighlight(
    rankedOrgans.map((item) => item.orgao),
    rankedOrgans,
    metricScope,
  );
}

export function PeriodPicker({ value, onChange, compact = false }: { value: string; onChange: (value: string) => void; compact?: boolean }) {
  return (
    <div
      className={
        compact
          ? "rounded-2xl border border-slate-800 bg-slate-950/55 p-1.5"
          : "rounded-[26px] border border-slate-800 bg-slate-950/65 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]"
      }
    >
      {!compact ? (
        <div className="mb-3 flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Período</span>
          <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-2.5 py-1 text-[11px] font-medium text-violet-200">
            Observação temporal
          </span>
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

export function MetricCard({
  label,
  generalLabel,
  generalValue,
  periodLabel,
  periodValue,
  accent,
  helper,
  clickable = false,
  alertLabel,
  onClick,
}: {
  label: string;
  generalLabel: string;
  generalValue: number;
  periodLabel: string;
  periodValue: number;
  accent: "cyan" | "amber" | "emerald" | "violet";
  helper: string;
  clickable?: boolean;
  alertLabel?: string;
  onClick?: () => void;
}) {
  const accentStyles = {
    cyan: "from-cyan-400/25 via-cyan-500/8 to-slate-950 text-cyan-200 border-cyan-400/15",
    amber: "from-amber-400/25 via-amber-500/8 to-slate-950 text-amber-200 border-amber-400/15",
    emerald: "from-emerald-400/25 via-emerald-500/8 to-slate-950 text-emerald-200 border-emerald-400/15",
    violet: "from-violet-400/25 via-violet-500/8 to-slate-950 text-violet-200 border-violet-400/15",
  }[accent];

  const Container = clickable ? "button" : "article";

  return (
    <Container
      className={`min-w-0 rounded-[24px] border bg-gradient-to-br ${accentStyles} p-4 text-left shadow-2xl shadow-slate-950/30 transition ${
        clickable ? "hover:-translate-y-0.5 hover:border-cyan-300/35 hover:shadow-cyan-950/20" : ""
      }`}
      type={clickable ? "button" : undefined}
      onClick={clickable ? onClick : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm leading-5 text-slate-300">{label}</div>
        <div className="flex flex-col items-end gap-2">
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-300">
            KPI
          </span>
          {alertLabel ? (
            <span className="rounded-full border border-amber-300/35 bg-amber-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-100">
              {alertLabel}
            </span>
          ) : null}
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{generalLabel}</div>
          <div className="mt-2 text-3xl font-semibold text-white xl:text-[2rem]">{generalValue}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{periodLabel}</div>
          <div className="mt-2 text-3xl font-semibold text-white xl:text-[2rem]">{periodValue}</div>
        </div>
      </div>
      <div className="mt-3 text-xs leading-5 text-slate-400">{helper}</div>
    </Container>
  );
}

export function InsightModal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-5xl overflow-hidden rounded-[28px] border border-slate-700 bg-[linear-gradient(180deg,#131d31_0%,#0c1423_100%)] shadow-2xl shadow-slate-950/70"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-700 bg-slate-900/75 text-slate-300 transition hover:border-slate-500 hover:text-white"
            type="button"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="max-h-[calc(85vh-72px)] overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export function ChartCard({
  sectionLabel = "Observabilidade",
  title,
  badge,
  summary,
  summaryNoWrap = false,
  compactBadge = false,
  tabs,
  activeTab,
  onTabChange,
  periodControl,
  rightControls,
  children,
}: {
  sectionLabel?: string;
  title: string;
  badge: string;
  summary?: string;
  summaryNoWrap?: boolean;
  compactBadge?: boolean;
  tabs?: Array<{ id: string; label: string }>;
  activeTab?: string;
  onTabChange?: (value: string) => void;
  periodControl?: ReactNode;
  rightControls?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="pt-5">
      <div className="flex flex-col gap-4 border-b border-slate-800 pb-4">
        {(tabs?.length || periodControl || rightControls) ? (
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            {tabs?.length ? (
              <div className="flex flex-wrap gap-3">
                {tabs.map((tab) => (
                  <MiniToggle
                    key={tab.id}
                    label={tab.label}
                    active={activeTab === tab.id}
                    onClick={() => onTabChange?.(tab.id)}
                  />
                ))}
              </div>
            ) : (
              <div />
            )}

            <div className="flex flex-col gap-3 xl:items-end">
              {periodControl}
              {rightControls ? (
                <div className="flex flex-nowrap items-center gap-3 overflow-x-auto rounded-2xl border border-slate-700 bg-slate-950/45 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                  {rightControls}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="max-w-3xl">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">{sectionLabel}</div>
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-xl font-semibold text-white">{title}</h3>
            <span
              className={`rounded-full border border-fuchsia-400/25 bg-fuchsia-400/10 text-fuchsia-200 ${
                compactBadge ? "px-2.5 py-0.5 text-[11px] font-semibold" : "px-3 py-1 text-xs font-semibold"
              }`}
            >
              {badge}
            </span>
          </div>
          {summary ? (
            <p className={`mt-2 max-w-3xl text-sm text-slate-400 ${summaryNoWrap ? "whitespace-nowrap" : ""}`}>{summary}</p>
          ) : null}
        </div>
      </div>
      <div className="pt-5">{children}</div>
    </section>
  );
}

export function MiniToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
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

export function ChartContainer({ children }: { children: ReactElement }) {
  return (
    <div className="h-[420px] rounded-[24px] border border-slate-800 bg-[linear-gradient(180deg,#1a253d_0%,#111a2d_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

export function FilteredChartTooltip({
  active,
  payload,
  label,
  hideZeroValues = false,
  sortNames,
}: {
  active?: boolean;
  payload?: Array<{ color?: string; name?: string; value?: number | string }>;
  label?: string | number;
  hideZeroValues?: boolean;
  sortNames?: string[];
}) {
  if (!active || !payload?.length) {
    return null;
  }

  let visibleItems = payload.filter((item) => {
    if (!hideZeroValues) {
      return true;
    }
    const numericValue = typeof item.value === "number" ? item.value : Number(item.value ?? 0);
    return Number.isFinite(numericValue) && numericValue > 0;
  });

  if (sortNames?.length) {
    const positions = new Map(sortNames.map((name, index) => [name, index]));
    visibleItems = [...visibleItems].sort((left, right) => {
      const leftIndex = positions.get(left.name ?? "") ?? Number.MAX_SAFE_INTEGER;
      const rightIndex = positions.get(right.name ?? "") ?? Number.MAX_SAFE_INTEGER;
      return leftIndex - rightIndex;
    });
  }

  if (!visibleItems.length) {
    return null;
  }

  return (
    <div style={tooltipStyle}>
      <p className="mb-2 text-base font-semibold text-slate-100">{label}</p>
      <div className="space-y-1.5">
        {visibleItems.map((item) => (
          <p key={`${item.name}-${item.value}`} style={{ color: item.color ?? "#e2e8f0" }} className="text-sm font-medium">
            {item.name}: {item.value}
          </p>
        ))}
      </div>
    </div>
  );
}

export function getDayChangeMarkers(data: ChartRow[], periodKey: string): string[] {
  const periodsWithDayMarkers = new Set(["today", "24h", "48h", "72h", "week", "7d"]);
  if (!periodsWithDayMarkers.has(periodKey)) {
    return [];
  }

  const markers: string[] = [];
  let previousDay: string | null = null;

  for (const item of data) {
    const bucket = item.bucket;
    if (typeof bucket !== "string") {
      continue;
    }
    const currentDay = bucket.slice(0, 10);
    if (previousDay && currentDay !== previousDay) {
      markers.push(bucket);
    }
    previousDay = currentDay;
  }

  return markers;
}

export const tooltipStyle = {
  backgroundColor: "#0f172a",
  border: "1px solid rgba(148, 163, 184, 0.2)",
  borderRadius: "12px",
  color: "#e2e8f0",
  padding: "12px 14px",
};
