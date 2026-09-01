import { useState, type ReactNode } from "react";
import type { PesquisaRegistro } from "../types";
import { AnalysisCheckbox, AnalysisStatusLight, analiseDoRegistro } from "../features/analises/components";
import type { AnalisesPorRegistro } from "../features/analises/types";

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
  analises: AnalisesPorRegistro;
  savingAnalysisIds: number[];
  onToggleAnalysis: (registroId: number, analisado: boolean) => Promise<void>;
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
  analises,
  savingAnalysisIds,
  onToggleAnalysis,
}: SearchTableProps) {
  const [copiedProcess, setCopiedProcess] = useState<string | null>(null);

  const groupedRecords = Array.from(
    records.reduce((map, item) => {
      const processo = String(item.nuprocesso ?? "Sem processo");
      const current = map.get(processo) ?? [];
      current.push(item);
      map.set(processo, current);
      return map;
    }, new Map<string, PesquisaRegistro[]>()),
  );

  const columnCount = showAction ? 10 : 9;

  async function handleCopyProcess(processo: string) {
    if (!processo || processo === "Sem processo") {
      return;
    }

    try {
      await navigator.clipboard.writeText(processo);
      setCopiedProcess(processo);
      window.setTimeout(() => {
        setCopiedProcess((current) => (current === processo ? null : current));
      }, 1800);
    } catch (error) {
      console.error("Nao foi possivel copiar o numero do processo.", error);
    }
  }

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
            <col className="w-[90px]" />
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
              <HeaderCell centered>Análise</HeaderCell>
              {showAction ? <HeaderCell centered /> : null}
            </tr>
          </thead>
          <tbody>
            {records.length ? (
              viewMode === "linhas"
                ? records.map((item, index) => (
                    <tr key={`${item.id}-${item.nuprocesso}-${index}`} className={striped ? PROCESS_ROW_CLASSES[index % PROCESS_ROW_CLASSES.length] : "bg-slate-900/10"}>
                      <BodyCell className="border-t border-slate-600/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                        <div className="inline-flex items-center gap-2">
                          <span>{formatText(item.nuprocesso)}</span>
                          <CopyProcessButton
                            copied={copiedProcess === String(item.nuprocesso ?? "")}
                            disabled={!item.nuprocesso}
                            onClick={() => void handleCopyProcess(String(item.nuprocesso ?? ""))}
                          />
                        </div>
                      </BodyCell>
                      <BodyCell className="border-t border-slate-600/90">{formatText(item.cpf)}</BodyCell>
                      <BodyCell className="border-t border-slate-600/90">{formatText(item.sig_orgao)}</BodyCell>
                      <BodyCell className="border-t border-slate-600/90">{formatText(item.usuario_logado)}</BodyCell>
                      <BodyCell centered className="border-t border-slate-600/90">{formatDate(item.data_inclusao_localizador)}</BodyCell>
                      <BodyCell centered className="border-t border-slate-600/90">{formatDate(item.data_processamento)}</BodyCell>
                      <BodyCell centered className="border-t border-slate-600/90">{formatBoolean(item.processado)}</BodyCell>
                      <BodyCell centered className="border-t border-slate-600/90">{formatBoolean(item.juntado)}</BodyCell>
                      <BodyCell centered className="border-t border-slate-600/90">
                        {typeof item.id === "number" ? (
                          <AnalysisCheckbox
                            checked={analiseDoRegistro(analises, item.id).analisado}
                            saving={savingAnalysisIds.includes(item.id)}
                            onChange={(analisado) => void onToggleAnalysis(item.id!, analisado)}
                          />
                        ) : null}
                      </BodyCell>
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
                          <div className="inline-flex items-center gap-2">
                            <button
                              className="inline-flex items-center gap-2 text-left text-cyan-100 transition hover:text-white"
                              type="button"
                              onClick={() => onToggleProcess(processo)}
                            >
                              <span className={`inline-block text-xs transition ${expanded ? "rotate-90" : ""}`}>▶</span>
                              <span>{processo}</span>
                            </button>
                            <CopyProcessButton copied={copiedProcess === processo} disabled={!processo || processo === "Sem processo"} onClick={() => void handleCopyProcess(processo)} />
                            <span className="rounded-full border border-slate-600 px-2 py-0.5 text-[11px] font-medium text-slate-200">
                              {items.length} registro(s)
                            </span>
                          </div>
                        </BodyCell>
                        <BodyCell className="border-t border-slate-600/90 text-slate-500" />
                        <BodyCell className="border-t border-slate-600/90">{formatText(first.sig_orgao)}</BodyCell>
                        <BodyCell className="border-t border-slate-600/90">{formatText(first.usuario_logado)}</BodyCell>
                        <BodyCell centered className="border-t border-slate-600/90">{formatDate(first.data_inclusao_localizador)}</BodyCell>
                        <BodyCell centered className="border-t border-slate-600/90">{formatDate(first.data_processamento)}</BodyCell>
                        <BodyCell centered className="border-t border-slate-600/90">{formatBoolean(first.processado)}</BodyCell>
                        <BodyCell centered className="border-t border-slate-600/90">{formatBoolean(first.juntado)}</BodyCell>
                        <BodyCell centered className="border-t border-slate-600/90"><AnalysisStatusLight records={items} analises={analises} /></BodyCell>
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
                              <BodyCell centered className="border-t border-slate-700/80">
                                {typeof item.id === "number" ? (
                                  <AnalysisCheckbox
                                    checked={analiseDoRegistro(analises, item.id).analisado}
                                    saving={savingAnalysisIds.includes(item.id)}
                                    onChange={(analisado) => void onToggleAnalysis(item.id!, analisado)}
                                  />
                                ) : null}
                              </BodyCell>
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

function CopyProcessButton({ copied, disabled, onClick }: { copied: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button
      className={`inline-flex h-7 w-7 items-center justify-center rounded-md border transition ${
        disabled
          ? "cursor-not-allowed border-slate-700/60 bg-slate-900/40 text-slate-500"
          : copied
            ? "border-emerald-400/60 bg-emerald-400/15 text-emerald-200"
            : "border-cyan-400/35 bg-slate-950/25 text-cyan-200 hover:bg-cyan-400 hover:text-slate-950"
      }`}
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={copied ? "Processo copiado" : "Copiar numero do processo"}
      aria-label={copied ? "Processo copiado" : "Copiar numero do processo"}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="1.8">
        <rect x="9" y="9" width="10" height="10" rx="2" />
        <path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" />
      </svg>
    </button>
  );
}
