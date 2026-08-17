import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ObservabilidadeTotalPorOrgao } from "../types";
import {
  ChartContainer,
  SERIES_COLORS,
  type ChartMode,
  type ChartRow,
  type FluxoBreakdownMode,
  type MetricScope,
  type StatusLayerMode,
  getDayChangeMarkers,
  tooltipStyle,
} from "./homeDashboardShared";

function getTimelineXAxisProps(periodKey: string) {
  if (periodKey === "48h" || periodKey === "72h") {
    return {
      interval: 0 as const,
      minTickGap: 0,
      tickMargin: 8,
    };
  }

  return {
    tickMargin: 8,
  };
}

function formatTooltipLabel(label: string | number, payload?: Array<{ payload?: ChartRow }>) {
  const chartLabel = payload?.[0]?.payload?.label;
  return typeof chartLabel === "string" ? chartLabel : label;
}

function buildFluxoStackOrder(data: ChartRow[], suffix: string) {
  const totals = new Map<string, number>();

  for (const item of data) {
    for (const [key, rawValue] of Object.entries(item)) {
      if (!key.endsWith(suffix)) {
        continue;
      }

      const value = typeof rawValue === "number" ? rawValue : Number(rawValue ?? 0);
      if (!Number.isFinite(value) || value <= 0) {
        continue;
      }

      const orgao = key.slice(0, -suffix.length);
      totals.set(orgao, (totals.get(orgao) ?? 0) + value);
    }
  }

  return [...totals.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0])).map(([orgao]) => orgao);
}

function buildFluxoColorMap(orgaos: string[]) {
  return new Map(orgaos.map((orgao, index) => [orgao, SERIES_COLORS[index % SERIES_COLORS.length]]));
}

function buildStackedBarRows(data: ChartRow[], suffix: string, colorMap: Map<string, string>) {
  const rows = data.map((item) => {
    const stackEntries = Object.entries(item)
      .filter(([key]) => key.endsWith(suffix))
      .map(([key, rawValue]) => ({
        orgao: key.slice(0, -suffix.length),
        value: typeof rawValue === "number" ? rawValue : Number(rawValue ?? 0),
      }))
      .filter((entry) => Number.isFinite(entry.value) && entry.value > 0)
      .sort((left, right) => right.value - left.value || left.orgao.localeCompare(right.orgao));

    const row = { ...item } as ChartRow & {
      stackItems?: Array<{ name: string; value: number; color: string }>;
    };
    row.stackItems = stackEntries
      .map((entry) => ({
        name: entry.orgao,
        value: entry.value,
        color: colorMap.get(entry.orgao) ?? "#5b8cff",
      }))
      .reverse();

    stackEntries.forEach((entry, index) => {
      row[`stack_slot_${index}`] = entry.value;
      row[`stack_slot_${index}_color`] = colorMap.get(entry.orgao) ?? "#5b8cff";
    });

    return row;
  });

  const maxSlots = rows.reduce((highest, row) => Math.max(highest, Array.isArray(row.stackItems) ? row.stackItems.length : 0), 0);
  return { rows, maxSlots };
}

function FluxoBarTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload?: ChartRow }>;
}) {
  if (!active) {
    return null;
  }

  const stackItems = Array.isArray(payload?.[0]?.payload?.stackItems)
    ? (payload?.[0]?.payload?.stackItems as Array<{ name: string; value: number; color: string }>)
    : [];

  if (!stackItems.length) {
    return null;
  }

  const total = stackItems.reduce((sum, item) => sum + item.value, 0);

  return (
    <div style={tooltipStyle}>
      <p className="mb-2 text-center text-base font-semibold text-slate-100">{total}</p>
      <div className="space-y-1.5">
        {stackItems.map((item) => (
          <p key={`${item.name}-${item.value}`} style={{ color: item.color }} className="text-sm font-medium">
            {item.name}: {item.value}
          </p>
        ))}
      </div>
    </div>
  );
}

function StatusTimelineTooltip({
  active,
  payload,
  layerMode,
  series,
  metricScope,
}: {
  active?: boolean;
  payload?: Array<{ payload?: ChartRow }>;
  layerMode: StatusLayerMode;
  series: Array<{ orgao: string; color: string }>;
  metricScope: MetricScope;
}) {
  if (!active) {
    return null;
  }

  const row = payload?.[0]?.payload;
  if (!row) {
    return null;
  }

  const processadosSuffix = metricScope === "registros" ? "__processados_registros" : "__processados_processos";
  const juntadosSuffix = metricScope === "registros" ? "__juntados_registros" : "__juntados_processos";

  const items = series
    .map((serie) => {
      const processadosRaw = row[`${serie.orgao}${processadosSuffix}`];
      const juntadosRaw = row[`${serie.orgao}${juntadosSuffix}`];
      const processados = typeof processadosRaw === "number" ? processadosRaw : Number(processadosRaw ?? 0);
      const juntados = typeof juntadosRaw === "number" ? juntadosRaw : Number(juntadosRaw ?? 0);

      return {
        orgao: serie.orgao,
        color: serie.color,
        processados: Number.isFinite(processados) ? processados : 0,
        juntados: Number.isFinite(juntados) ? juntados : 0,
      };
    })
    .filter((item) => {
      if (layerMode === "processados") {
        return item.processados > 0;
      }
      if (layerMode === "juntados") {
        return item.juntados > 0;
      }
      return item.processados > 0 || item.juntados > 0;
    })
    .sort((left, right) => {
      const leftValue = layerMode === "processados" ? left.processados : layerMode === "juntados" ? left.juntados : Math.max(left.processados, left.juntados);
      const rightValue = layerMode === "processados" ? right.processados : layerMode === "juntados" ? right.juntados : Math.max(right.processados, right.juntados);
      return rightValue - leftValue || left.orgao.localeCompare(right.orgao);
    });

  if (!items.length) {
    return null;
  }

  const totalProcessados = items.reduce((sum, item) => sum + item.processados, 0);
  const totalJuntados = items.reduce((sum, item) => sum + item.juntados, 0);

  return (
    <div style={tooltipStyle}>
      <div className="mb-3 space-y-1 text-center">
        {layerMode !== "juntados" ? <p className="text-sm font-semibold text-slate-100">Processados: {totalProcessados}</p> : null}
        {layerMode !== "processados" ? <p className="text-sm font-semibold text-slate-100">Juntados: {totalJuntados}</p> : null}
      </div>
      <div className="space-y-1.5">
        {items.map((item) => (
          <div key={item.orgao} className="space-y-1">
            {layerMode !== "juntados" ? (
              <p style={{ color: item.color }} className="text-sm font-medium">
                {item.orgao}: {item.processados}
              </p>
            ) : null}
            {layerMode !== "processados" ? (
              <p style={{ color: item.color }} className="text-sm font-medium">
                {item.orgao}: {item.juntados}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export function FluxoTimelineChart({
  data,
  mode,
  metricScope,
  periodKey,
  breakdownMode,
}: {
  data: ChartRow[];
  mode: ChartMode;
  metricScope: MetricScope;
  periodKey: string;
  breakdownMode: FluxoBreakdownMode;
}) {
  const inclusoesKey = metricScope === "registros" ? "inclusoes_registros" : "inclusoes_processos";
  const processamentosKey = metricScope === "registros" ? "processamentos_registros" : "processamentos_processos";
  const inclusoesLabel = "Entrada";
  const processamentosLabel = metricScope === "registros" ? "Registros processados" : "Autos processados";
  const dayChangeMarkers = getDayChangeMarkers(data, periodKey);
  const xAxisProps = getTimelineXAxisProps(periodKey);

  if (mode === "bar") {
    const inclusoesSuffix = metricScope === "registros" ? "__inclusoes_registros" : "__inclusoes_processos";
    const processamentosSuffix = metricScope === "registros" ? "__processamentos_registros" : "__processamentos_processos";
    const stackedSuffix = breakdownMode === "entrada" ? inclusoesSuffix : processamentosSuffix;
    const stackedOrgans = buildFluxoStackOrder(data, stackedSuffix);
    const colorMap = buildFluxoColorMap(stackedOrgans);
    const { rows, maxSlots } = buildStackedBarRows(data, stackedSuffix, colorMap);

    return (
      <ChartContainer>
        <BarChart data={rows}>
          <CartesianGrid stroke="#243145" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="bucket"
            tickFormatter={(_, index) => {
              const value = rows[index]?.label;
              return typeof value === "string" ? value : "";
            }}
            stroke="#8ea3c3"
            tick={{ fill: "#8ea3c3", fontSize: 12 }}
            {...xAxisProps}
          />
          <YAxis stroke="#8ea3c3" tick={{ fill: "#8ea3c3", fontSize: 12 }} />
          <Tooltip content={<FluxoBarTooltip />} labelFormatter={formatTooltipLabel} />
          {dayChangeMarkers.map((bucket) => (
            <ReferenceLine key={`day-${bucket}`} x={bucket} stroke="#6d5efc" strokeDasharray="5 5" strokeOpacity={0.9} />
          ))}
          {Array.from({ length: maxSlots }, (_, index) => (
            <Bar key={`stack-slot-${index}`} dataKey={`stack_slot_${index}`} stackId="fluxo" radius={index === maxSlots - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}>
              {rows.map((row, rowIndex) => (
                <Cell key={`stack-slot-${index}-${rowIndex}`} fill={String(row[`stack_slot_${index}_color`] ?? "#5b8cff")} />
              ))}
            </Bar>
          ))}
        </BarChart>
      </ChartContainer>
    );
  }

  return (
    <ChartContainer>
      <LineChart data={data}>
        <CartesianGrid stroke="#243145" strokeDasharray="3 3" />
        <XAxis
          dataKey="bucket"
          tickFormatter={(_, index) => {
            const value = data[index]?.label;
            return typeof value === "string" ? value : "";
          }}
          stroke="#8ea3c3"
          tick={{ fill: "#8ea3c3", fontSize: 12 }}
          {...xAxisProps}
        />
        <YAxis stroke="#8ea3c3" tick={{ fill: "#8ea3c3", fontSize: 12 }} />
        <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "#e2e8f0" }} labelFormatter={formatTooltipLabel} />
        {dayChangeMarkers.map((bucket) => (
          <ReferenceLine key={`day-${bucket}`} x={bucket} stroke="#6d5efc" strokeDasharray="5 5" strokeOpacity={0.9} />
        ))}
        <Line dataKey={inclusoesKey} name={inclusoesLabel} type="monotone" stroke="#5b8cff" strokeWidth={2.5} dot={false} />
        <Line dataKey={processamentosKey} name={processamentosLabel} type="monotone" stroke="#18c29c" strokeWidth={2.5} dot={false} />
      </LineChart>
    </ChartContainer>
  );
}

export function OrganSelector({
  rankedOrgans,
  selectedOrgans,
  onChange,
  layerMode,
  metricScope,
}: {
  rankedOrgans: ObservabilidadeTotalPorOrgao[];
  selectedOrgans: string[];
  onChange: (items: string[]) => void;
  layerMode: StatusLayerMode;
  metricScope: MetricScope;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [draftSelectedOrgans, setDraftSelectedOrgans] = useState<string[]>(selectedOrgans);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const processadosKey = metricScope === "registros" ? "processados_registros" : "processados_processos";
  const juntadosKey = metricScope === "registros" ? "juntados_registros" : "juntados_processos";
  const rankedOrgansByName = useMemo(() => rankedOrgans.map((item) => item.orgao), [rankedOrgans]);
  const orgaoStats = useMemo(
    () =>
      new Map(
        rankedOrgans.map((item) => [
          item.orgao,
          {
            processados: Number(item[processadosKey] ?? 0),
            juntados: Number(item[juntadosKey] ?? 0),
          },
        ]),
      ),
    [juntadosKey, processadosKey, rankedOrgans],
  );
  const orderedSelectedOrgans = useMemo(
    () => rankedOrgansByName.filter((orgao) => selectedOrgans.includes(orgao)),
    [rankedOrgansByName, selectedOrgans],
  );
  const orderedDraftOrgans = useMemo(
    () => rankedOrgansByName.filter((orgao) => draftSelectedOrgans.includes(orgao)),
    [draftSelectedOrgans, rankedOrgansByName],
  );

  useEffect(() => {
    setDraftSelectedOrgans(selectedOrgans);
  }, [selectedOrgans]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function toggleSelectedChip(orgao: string) {
    onChange(selectedOrgans.filter((item) => item !== orgao));
  }

  function toggleDraftOrgan(orgao: string) {
    if (draftSelectedOrgans.includes(orgao)) {
      setDraftSelectedOrgans(draftSelectedOrgans.filter((item) => item !== orgao));
      return;
    }
    setDraftSelectedOrgans([...draftSelectedOrgans, orgao]);
  }

  function selectAllDraft() {
    setDraftSelectedOrgans(rankedOrgansByName);
  }

  function clearAllDraft() {
    setDraftSelectedOrgans([]);
  }

  function handleToggleOpen() {
    if (!isOpen) {
      setDraftSelectedOrgans(selectedOrgans);
    }
    setIsOpen((current) => !current);
  }

  function applySelection() {
    onChange(orderedDraftOrgans);
    setIsOpen(false);
  }

  const itemColumnsClass = layerMode === "both" ? "grid-cols-[auto_minmax(0,1fr)_auto_auto]" : "grid-cols-[auto_minmax(0,1fr)_auto]";

  return (
    <div ref={containerRef} className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Órgãos destacados</p>
      </div>
      <div className="flex flex-wrap items-start gap-3">
        {orderedSelectedOrgans.map((orgao) => (
          <button
            key={orgao}
            className="inline-flex items-center gap-2 rounded-full border border-cyan-300/70 bg-[linear-gradient(135deg,rgba(34,211,238,0.28),rgba(59,130,246,0.18))] px-3 py-1.5 text-xs font-semibold text-white shadow-[0_0_0_1px_rgba(103,232,249,0.18),0_10px_30px_rgba(34,211,238,0.12)] transition"
            type="button"
            aria-pressed
            onClick={() => toggleSelectedChip(orgao)}
          >
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-200 shadow-[0_0_12px_rgba(165,243,252,0.95)]" />
            {orgao}
          </button>
        ))}
        <div className="relative">
          <button
            className="inline-flex min-w-[220px] items-center justify-between gap-3 rounded-full border border-slate-700/90 bg-slate-950/35 px-4 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-cyan-400/35 hover:bg-slate-950/55 hover:text-white"
            type="button"
            onClick={handleToggleOpen}
          >
            <span>Selecionar órgãos</span>
            <span className={`text-[10px] text-slate-400 transition ${isOpen ? "rotate-180" : ""}`}>▼</span>
          </button>
          {isOpen ? (
            <div className="absolute left-0 top-[calc(100%+0.6rem)] z-20 w-[384px] rounded-2xl border border-slate-700 bg-slate-950/95 p-3 shadow-2xl shadow-slate-950/60 backdrop-blur">
              <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-1 px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                <span>Órgãos</span>
                <div className="flex items-center justify-end gap-4">
                  {layerMode !== "juntados" ? <span className="whitespace-nowrap text-right">Proc.</span> : null}
                  {layerMode !== "processados" ? <span className="whitespace-nowrap text-right">Junt.</span> : null}
                </div>
                <span className="whitespace-nowrap">{draftSelectedOrgans.length} selecionados</span>
                <span />
              </div>
              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {rankedOrgansByName.map((orgao) => {
                  const checked = draftSelectedOrgans.includes(orgao);
                  const stats = orgaoStats.get(orgao) ?? { processados: 0, juntados: 0 };
                  return (
                    <label
                      key={orgao}
                      className={`grid cursor-pointer items-center gap-3 rounded-xl border border-slate-800/80 bg-slate-900/55 px-3 py-2 text-xs text-slate-200 transition hover:border-cyan-400/25 hover:bg-slate-900/80 ${itemColumnsClass}`}
                    >
                      <input
                        checked={checked}
                        className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-cyan-400 focus:ring-cyan-400"
                        type="checkbox"
                        onChange={() => toggleDraftOrgan(orgao)}
                      />
                      <span className="truncate">{orgao}</span>
                      {layerMode !== "juntados" ? <span className="whitespace-nowrap text-right text-slate-300">{stats.processados}</span> : null}
                      {layerMode !== "processados" ? <span className="whitespace-nowrap text-right text-slate-300">{stats.juntados}</span> : null}
                    </label>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="flex gap-2">
                  <button
                    className="inline-flex rounded-full border border-amber-300/35 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-100 transition hover:border-amber-200/60 hover:bg-amber-400/16"
                    type="button"
                    onClick={selectAllDraft}
                  >
                    Todos
                  </button>
                  <button
                    className="inline-flex rounded-full border border-slate-600 bg-slate-900/65 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-500 hover:bg-slate-800/80"
                    type="button"
                    onClick={clearAllDraft}
                  >
                    Nenhum
                  </button>
                </div>
                <button
                  className="inline-flex rounded-full border border-cyan-300/45 bg-cyan-400/15 px-4 py-1.5 text-xs font-semibold text-cyan-100 transition hover:border-cyan-200/70 hover:bg-cyan-400/22"
                  type="button"
                  onClick={applySelection}
                >
                  Aplicar
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function StatusTotalsChart({
  data,
  layerMode,
  metricScope,
}: {
  data: ObservabilidadeTotalPorOrgao[];
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
        {layerMode !== "juntados" ? <Bar dataKey={processadosKey} name="Processados" fill="#5b8cff" radius={[6, 6, 0, 0]} /> : null}
        {layerMode !== "processados" ? <Bar dataKey={juntadosKey} name="Juntados" fill="#18c29c" radius={[6, 6, 0, 0]} /> : null}
      </BarChart>
    </ChartContainer>
  );
}

export function StatusTimelineChart({
  data,
  series,
  layerMode,
  metricScope,
  periodKey,
}: {
  data: ChartRow[];
  series: Array<{ orgao: string; color: string }>;
  layerMode: StatusLayerMode;
  metricScope: MetricScope;
  periodKey: string;
}) {
  const processadosSuffix = metricScope === "registros" ? "__processados_registros" : "__processados_processos";
  const juntadosSuffix = metricScope === "registros" ? "__juntados_registros" : "__juntados_processos";
  const chartData = data.map((item) => {
    const enriched: ChartRow = { ...item };
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
  const xAxisProps = getTimelineXAxisProps(periodKey);

  return (
    <ChartContainer>
      <LineChart data={chartData}>
        <CartesianGrid stroke="#243145" strokeDasharray="3 3" />
        <XAxis
          dataKey="bucket"
          tickFormatter={(_, index) => {
            const value = chartData[index]?.label;
            return typeof value === "string" ? value : "";
          }}
          stroke="#8ea3c3"
          tick={{ fill: "#8ea3c3", fontSize: 12 }}
          {...xAxisProps}
        />
        <YAxis stroke="#8ea3c3" tick={{ fill: "#8ea3c3", fontSize: 12 }} />
        <Tooltip content={<StatusTimelineTooltip layerMode={layerMode} series={series} metricScope={metricScope} />} />
        {dayChangeMarkers.map((bucket) => (
          <ReferenceLine key={`day-${bucket}`} x={bucket} stroke="#6d5efc" strokeDasharray="5 5" strokeOpacity={0.9} />
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
