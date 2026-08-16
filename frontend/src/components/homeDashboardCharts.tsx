import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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
  FilteredChartTooltip,
  SERIES_COLORS,
  type FluxoBreakdownMode,
  type MetricScope,
  type StatusLayerMode,
  type ChartMode,
  type ChartRow,
  getDayChangeMarkers,
  tooltipStyle,
} from "./homeDashboardShared";

export function OrgTotalsChart({
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

export function OrgTimelineChart({
  data,
  metricScope,
  periodKey,
}: {
  data: ChartRow[];
  metricScope: MetricScope;
  periodKey: string;
}) {
  const suffix = metricScope === "registros" ? "__registros" : "__processos";
  const keys = Array.from(new Set(data.flatMap((item) => Object.keys(item).filter((key) => key.endsWith(suffix)))));
  const chartData = data.map((item) => {
    const enriched: ChartRow = { ...item };
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

  if (mode === "bar") {
    const inclusoesSuffix = metricScope === "registros" ? "__inclusoes_registros" : "__inclusoes_processos";
    const processamentosSuffix = metricScope === "registros" ? "__processamentos_registros" : "__processamentos_processos";
    const stackedSuffix = breakdownMode === "entrada" ? inclusoesSuffix : processamentosSuffix;
    const stackedOrgans = Array.from(
      new Set(
        data.flatMap((item) =>
          Object.keys(item)
            .filter((key) => key.endsWith(stackedSuffix) && typeof item[key] === "number" && Number(item[key]) > 0)
            .map((key) => key.slice(0, -stackedSuffix.length)),
        ),
      ),
    );

    return (
      <ChartContainer>
        <BarChart data={data}>
          <CartesianGrid stroke="#243145" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" stroke="#8ea3c3" tick={{ fill: "#8ea3c3", fontSize: 12 }} />
          <YAxis stroke="#8ea3c3" tick={{ fill: "#8ea3c3", fontSize: 12 }} />
          <Tooltip content={<FilteredChartTooltip hideZeroValues />} />
          <Legend wrapperStyle={{ color: "#cbd5e1" }} />
          {breakdownMode === "entrada"
            ? stackedOrgans.map((orgao, index) => (
                <Bar
                  key={orgao}
                  dataKey={`${orgao}${inclusoesSuffix}`}
                  name={`${orgao} · Entrada`}
                  stackId="inclusoes"
                  fill={SERIES_COLORS[index % SERIES_COLORS.length]}
                  radius={index === stackedOrgans.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
                />
              ))
            : null}
          {breakdownMode === "entrada"
            ? null
            : stackedOrgans.map((orgao, index) => (
                <Bar
                  key={orgao}
                  dataKey={`${orgao}${processamentosSuffix}`}
                  name={`${orgao} · Processados`}
                  stackId="processamentos"
                  fill={SERIES_COLORS[index % SERIES_COLORS.length]}
                  radius={index === stackedOrgans.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
                />
              ))}
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

export function OrganSelector({
  rankedOrgans,
  selectedOrgans,
  onChange,
}: {
  rankedOrgans: string[];
  selectedOrgans: string[];
  onChange: (items: string[]) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [draftSelectedOrgans, setDraftSelectedOrgans] = useState<string[]>(selectedOrgans);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const orderedSelectedOrgans = useMemo(
    () => rankedOrgans.filter((orgao) => selectedOrgans.includes(orgao)),
    [rankedOrgans, selectedOrgans],
  );
  const orderedDraftOrgans = useMemo(
    () => rankedOrgans.filter((orgao) => draftSelectedOrgans.includes(orgao)),
    [rankedOrgans, draftSelectedOrgans],
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
    setDraftSelectedOrgans(rankedOrgans);
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
            className="inline-flex min-w-[200px] items-center justify-between gap-3 rounded-full border border-slate-700/90 bg-slate-950/35 px-4 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-cyan-400/35 hover:bg-slate-950/55 hover:text-white"
            type="button"
            onClick={handleToggleOpen}
          >
            <span>Selecionar órgãos</span>
            <span className={`text-[10px] text-slate-400 transition ${isOpen ? "rotate-180" : ""}`}>▼</span>
          </button>
          {isOpen ? (
            <div className="absolute left-0 top-[calc(100%+0.6rem)] z-20 w-[290px] rounded-2xl border border-slate-700 bg-slate-950/95 p-3 shadow-2xl shadow-slate-950/60 backdrop-blur">
              <div className="mb-2 flex items-center justify-between px-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                <span>Órgãos do período</span>
                <span>{draftSelectedOrgans.length} selecionados</span>
              </div>
              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {rankedOrgans.map((orgao) => {
                  const checked = draftSelectedOrgans.includes(orgao);
                  return (
                    <label
                      key={orgao}
                      className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-800/80 bg-slate-900/55 px-3 py-2 text-xs text-slate-200 transition hover:border-cyan-400/25 hover:bg-slate-900/80"
                    >
                      <input
                        checked={checked}
                        className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-cyan-400 focus:ring-cyan-400"
                        type="checkbox"
                        onChange={() => toggleDraftOrgan(orgao)}
                      />
                      <span className="truncate">{orgao}</span>
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
        <Legend wrapperStyle={{ color: "#cbd5e1" }} />
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
