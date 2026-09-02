import { Fragment } from "react";
import type { DetalheResponse } from "../types";
import { AnalysisNoteEditor } from "../features/analises/components";
import type { AnaliseRegistro } from "../features/analises/types";

type DetailPageProps = {
  detalhe: DetalheResponse | null;
  detalhesRegistro: Array<[string, unknown]>;
  loadingDetail: boolean;
  onBackToSearch: () => Promise<void>;
  onBackToHome: () => Promise<void>;
  formatDate: (value: unknown) => string;
  formatBoolean: (value: unknown) => string;
  formatText: (value: unknown) => string;
  analise: AnaliseRegistro;
  savingAnalysis: boolean;
  onSaveAnnotation: (value: string) => Promise<void>;
};

export function DetailPage({
  detalhe,
  detalhesRegistro,
  loadingDetail,
  onBackToSearch,
  onBackToHome,
  formatDate,
  formatBoolean,
  formatText,
  analise,
  savingAnalysis,
  onSaveAnnotation,
}: DetailPageProps) {
  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/85 px-6 py-6 shadow-2xl shadow-slate-950/40 md:flex-row md:items-center md:justify-between">
        <div>
          <span className="inline-flex rounded-full border border-fuchsia-400/25 bg-fuchsia-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-fuchsia-200">
            Detalhe
          </span>
          <h1 className="mt-3 text-3xl font-semibold text-white">Registro completo</h1>
          <p className="mt-2 text-sm text-slate-300">Visualização integral da linha selecionada no banco AVIPE.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-950/60 px-5 text-sm font-semibold text-slate-200 transition hover:border-cyan-400/35 hover:text-white"
            type="button"
            onClick={() => void onBackToSearch()}
          >
            Voltar para Pesquisa
          </button>
          <button
            className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-950/60 px-5 text-sm font-semibold text-slate-200 transition hover:border-cyan-400/35 hover:text-white"
            type="button"
            onClick={() => void onBackToHome()}
          >
            Voltar para Home
          </button>
        </div>
      </section>

      <section className="grid gap-5 rounded-3xl border border-slate-800 bg-slate-900/85 p-5 shadow-2xl shadow-slate-950/40 xl:grid-cols-[minmax(520px,1fr)_minmax(0,0.8fr)]">
        {loadingDetail ? (
          <p className="text-sm text-slate-300">Carregando detalhe...</p>
        ) : detalhe?.erro ? (
          <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{detalhe.erro}</div>
        ) : (
          <>
            <dl className="grid gap-y-3 md:grid-cols-[240px_minmax(0,1fr)] md:gap-x-6">
              {detalhesRegistro.map(([key, value]) => (
                <Fragment key={key}>
                  <dt className="text-sm font-semibold uppercase tracking-wide text-slate-400">{key}</dt>
                  <dd className="break-all text-sm text-slate-100">
                    {key.includes("data")
                      ? formatDate(value)
                      : typeof value === "boolean" || value === 0 || value === 1
                        ? formatBoolean(value)
                        : formatText(value)}
                  </dd>
                </Fragment>
              ))}
            </dl>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/35 p-5">
              <AnalysisNoteEditor value={analise.anotacao} saving={savingAnalysis} onSave={onSaveAnnotation} />
            </div>
          </>
        )}
      </section>
    </div>
  );
}
