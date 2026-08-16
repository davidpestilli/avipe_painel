import type { ReactNode } from "react";
import type { PesquisaRegistro } from "../types";

export type PesquisaViewMode = "agrupada" | "linhas";

const PROCESS_ROW_CLASSES = [
  "bg-[linear-gradient(90deg,rgba(29,46,76,0.98)_0%,rgba(21,32,54,0.96)_100%)]",
  "bg-[linear-gradient(90deg,rgba(21,37,63,0.98)_0%,rgba(16,25,44,0.95)_100%)]",
];

const RECORD_ROW_CLASSES = [
  "bg-[linear-gradient(90deg,rgba(22,36,58,0.74)_0%,rgba(14,23,39,0.68)_100%)]",
  "bg-[linear-gradient(90deg,rgba(26,34,55,0.74)_0%,rgba(16,24,40,0.68)_100%)]",
];

type SearchTableProps = {
  title: string;
  subtitle?: string;
  records: PesquisaRegistro[];
  viewMode: PesquisaViewMode;
  expandedProcesses: string[];
  onToggleProcess: (processo: string) => void;
  showAction: boolean;
  striped?: boolean;
  onOpenDetail: (id: number | string) => Promise<void>;
  formatText: (value: unknown) => string;
  formatDate: (value: unknown) => string;
  formatBoolean: (value: unknown) => string;
};

export function SearchTable({
  title,
  subtitle,
  records,
  viewMode,
  expandedProcesses,
  onToggleProcess,
  showAction,
  striped = false,
  onOpenDetail,
  formatText,
  formatDate,
  formatBoolean,
}: SearchTableProps) {
  const groupedRecords = Array.from(
    records.reduce((map, item) => {
      const processo = String(item.nuprocesso ?? "Sem processo");
      const current = map.get(processo) ?? [];
      current.push(item);
      map.set(processo, current);
      return map;
    }, new Map<string, PesquisaRegistro[]>()),
  );

  const columnCount = showAction ? 9 : 8;

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/85 shadow-2xl shadow-slate-950/40">
      <div className="flex flex-col gap-2 border-b border-slate-800 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <strong className="text-base text-white">{title}</strong>
        {subtitle ? <span className="text-sm text-slate-400">{subtitle}</span> : null}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-[1320px] w-full text-sm">
          <colgroup>
            <col className="w-[320px]" />
            <col className="w-[170px]" />
            <col className="w-[170px]" />
            <col className="w-[190px]" />
            <col className="w-[220px]" />
            <col className="w-[180px]" />
            <col className="w-[120px]" />
            <col className="w-[120px]" />
            {showAction ? <col className="w-[120px]" /> : null}
          </colgroup>
          <thead className="bg-slate-950/60">
            <tr>
              <HeaderCell>Processo</HeaderCell>
              <HeaderCell>CPF/CNPJ</HeaderCell>
              <HeaderCell>Órgão</HeaderCell>
              <HeaderCell>Usuário</HeaderCell>
              <HeaderCell centered>Incluído no localizador em</HeaderCell>
              <HeaderCell centered>Processado em</HeaderCell>
              <HeaderCell centered>Processado</HeaderCell>
              <HeaderCell centered>Juntado</HeaderCell>
              {showAction ? <HeaderCell centered /> : null}
            </tr>
          </thead>
          <tbody>
            {records.length ? (
              viewMode === "linhas"
                ? records.map((item, index) => (
                    <tr key={`${item.id}-${item.nuprocesso}-${index}`} className={striped ? PROCESS_ROW_CLASSES[index % PROCESS_ROW_CLASSES.length] : "bg-slate-900/10"}>
                      <BodyCell className="border-t border-slate-600/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">{formatText(item.nuprocesso)}</BodyCell>
                      <BodyCell className="border-t border-slate-600/90">{formatText(item.cpf)}</BodyCell>
                      <BodyCell className="border-t border-slate-600/90">{formatText(item.sig_orgao)}</BodyCell>
                      <BodyCell className="border-t border-slate-600/90">{formatText(item.usuario_logado)}</BodyCell>
                      <BodyCell centered className="border-t border-slate-600/90">{formatDate(item.data_inclusao_localizador)}</BodyCell>
                      <BodyCell centered className="border-t border-slate-600/90">{formatDate(item.data_processamento)}</BodyCell>
                      <BodyCell centered className="border-t border-slate-600/90">{formatBoolean(item.processado)}</BodyCell>
                      <BodyCell centered className="border-t border-slate-600/90">{formatBoolean(item.juntado)}</BodyCell>
                      {showAction ? (
                        <BodyCell centered className="border-t border-slate-600/90">
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
                : groupedRecords.flatMap(([processo, items], groupIndex) => {
                    const expanded = expandedProcesses.includes(processo);
                    const first = items[0];
                    const processRowClass = PROCESS_ROW_CLASSES[groupIndex % PROCESS_ROW_CLASSES.length];
                    const recordRowClass = RECORD_ROW_CLASSES[groupIndex % RECORD_ROW_CLASSES.length];

                    return [
                      <tr key={`group-${processo}`} className={processRowClass}>
                        <BodyCell className="border-t border-slate-600/90 font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                          <button
                            className="inline-flex items-center gap-2 text-left text-cyan-100 transition hover:text-white"
                            type="button"
                            onClick={() => onToggleProcess(processo)}
                          >
                            <span className={`inline-block text-xs transition ${expanded ? "rotate-90" : ""}`}>▶</span>
                            <span>{processo}</span>
                            <span className="rounded-full border border-slate-600 px-2 py-0.5 text-[11px] font-medium text-slate-200">
                              {items.length} registro(s)
                            </span>
                          </button>
                        </BodyCell>
                        <BodyCell className="border-t border-slate-600/90 text-slate-500" />
                        <BodyCell className="border-t border-slate-600/90">{formatText(first.sig_orgao)}</BodyCell>
                        <BodyCell className="border-t border-slate-600/90">{formatText(first.usuario_logado)}</BodyCell>
                        <BodyCell centered className="border-t border-slate-600/90">{formatDate(first.data_inclusao_localizador)}</BodyCell>
                        <BodyCell centered className="border-t border-slate-600/90">{formatDate(first.data_processamento)}</BodyCell>
                        <BodyCell centered className="border-t border-slate-600/90">{formatBoolean(first.processado)}</BodyCell>
                        <BodyCell centered className="border-t border-slate-600/90">{formatBoolean(first.juntado)}</BodyCell>
                        {showAction ? (
                          <BodyCell centered className="border-t border-slate-600/90">
                            <button
                              className="inline-flex min-w-[88px] items-center justify-center rounded-md border border-cyan-400/40 px-3 py-1.5 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400 hover:text-slate-950"
                              type="button"
                              onClick={() => void onOpenDetail(first.id ?? "")}
                            >
                              Detalhe
                            </button>
                          </BodyCell>
                        ) : null}
                      </tr>,
                      ...(expanded
                        ? items.map((item, index) => (
                            <tr key={`${item.id}-${processo}-${index}`} className={recordRowClass}>
                              <BodyCell className="border-t border-slate-700/80 pl-12 text-slate-600" />
                              <BodyCell className="border-t border-slate-700/80 text-slate-100">{formatText(item.cpf)}</BodyCell>
                              <BodyCell className="border-t border-slate-700/80 text-slate-300">{formatText(item.sig_orgao)}</BodyCell>
                              <BodyCell className="border-t border-slate-700/80 text-slate-300">{formatText(item.usuario_logado)}</BodyCell>
                              <BodyCell centered className="border-t border-slate-700/80 text-slate-300">{formatDate(item.data_inclusao_localizador)}</BodyCell>
                              <BodyCell centered className="border-t border-slate-700/80 text-slate-300">{formatDate(item.data_processamento)}</BodyCell>
                              <BodyCell centered className="border-t border-slate-700/80 text-slate-100">{formatBoolean(item.processado)}</BodyCell>
                              <BodyCell centered className="border-t border-slate-700/80 text-slate-100">{formatBoolean(item.juntado)}</BodyCell>
                              {showAction ? (
                                <BodyCell centered className="border-t border-slate-700/80">
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
                        : []),
                    ];
                  })
            ) : (
              <tr>
                <td colSpan={columnCount} className="px-4 py-8 text-center text-sm text-slate-400">
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
  return <th className={`whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400 ${centered ? "text-center" : "text-left"}`}>{children}</th>;
}

function BodyCell({ children, centered = false, className = "" }: { children?: ReactNode; centered?: boolean; className?: string }) {
  return <td className={`whitespace-nowrap border-t border-slate-800 px-4 py-3 text-slate-100 ${centered ? "text-center" : "text-left"} ${className}`}>{children}</td>;
}
