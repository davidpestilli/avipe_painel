import { useEffect, useRef, useState } from "react";
import type { PesquisaRegistro } from "../../types";
import { ANALISE_PADRAO, type AnaliseRegistro, type AnalisesPorRegistro } from "./types";

export function analiseDoRegistro(analises: AnalisesPorRegistro, registroId: number | undefined): AnaliseRegistro {
  return registroId === undefined ? ANALISE_PADRAO : analises[String(registroId)] ?? ANALISE_PADRAO;
}

export function AnalysisCheckbox({ checked, saving, onChange }: { checked: boolean; saving?: boolean; onChange: (checked: boolean) => void }) {
  return (
    <input
      className="h-4 w-4 cursor-pointer accent-cyan-400 disabled:cursor-wait"
      type="checkbox"
      checked={checked}
      disabled={saving}
      onChange={(event) => onChange(event.target.checked)}
      aria-label={checked ? "Registro analisado" : "Marcar registro como analisado"}
    />
  );
}

export function AnalysisStatusLight({ records, analises }: { records: PesquisaRegistro[]; analises: AnalisesPorRegistro }) {
  const todosAnalisados = records.length > 0 && records.every((record) => analiseDoRegistro(analises, record.id).analisado);
  const pendentes = records.filter((record) => !analiseDoRegistro(analises, record.id).analisado).length;
  const title = todosAnalisados ? "Todos os registros deste processo foram analisados" : `${pendentes} registro(s) ainda sem analise`;

  return (
    <span className="inline-flex items-center justify-center" title={title} aria-label={title}>
      <span className={`h-3 w-3 rounded-full ring-4 ${todosAnalisados ? "bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.85)] ring-emerald-400/15" : "bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.8)] ring-rose-500/15"}`} />
    </span>
  );
}

export function AnalysisNoteEditor({ value, saving, onSave }: { value: string; saving: boolean; onSave: (value: string) => Promise<void> }) {
  const [draft, setDraft] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [draft]);

  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold uppercase tracking-wide text-slate-400">Anotacao da analise</span>
      <textarea
        ref={textareaRef}
        className="min-h-[360px] w-full resize-y overflow-y-hidden rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm leading-6 text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/15"
        value={draft}
        placeholder="Escreva observacoes sobre este registro..."
        onChange={(event) => setDraft(event.target.value)}
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-slate-400">Use Salvar tambem para apagar uma anotacao.</span>
        <button
          className="inline-flex h-10 min-w-24 items-center justify-center rounded-xl bg-cyan-500 px-4 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-wait disabled:bg-slate-700 disabled:text-slate-300"
          type="button"
          disabled={saving}
          onClick={() => void onSave(draft).catch(() => undefined)}
        >
          {saving ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </label>
  );
}
