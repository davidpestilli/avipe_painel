import type { AmbienteDisponivel, DashboardData } from "../types";

type SettingsPageProps = {
  ambientes: AmbienteDisponivel[];
  ambienteAtivo: string;
  infoBanco: DashboardData["info_banco"] | null;
  exibirOrgaoSuporte: boolean;
  savingOrgaoSuporte: boolean;
  onAmbienteChange: (value: string) => void;
  onExibirOrgaoSuporteChange: (value: boolean) => void;
};

export function SettingsPage({
  ambientes,
  ambienteAtivo,
  infoBanco,
  exibirOrgaoSuporte,
  savingOrgaoSuporte,
  onAmbienteChange,
  onExibirOrgaoSuporteChange,
}: SettingsPageProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/85 p-6 shadow-2xl shadow-slate-950/40">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_1fr]">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">Configuracoes</p>
            <h2 className="text-2xl font-semibold text-white">Ambiente exibido no painel</h2>
            <p className="text-sm text-slate-300">
              Escolha qual base o Watcher AVIPE deve consultar. A troca vale para Home, Pesquisa e Detalhe.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="ambiente-ativo">
              Ambiente ativo
            </label>
            <select
              id="ambiente-ativo"
              className="h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm text-white outline-none transition focus:border-cyan-400/60"
              value={ambienteAtivo}
              onChange={(event) => onAmbienteChange(event.target.value)}
            >
              {ambientes.map((ambiente) => (
                <option key={ambiente.id} value={ambiente.id}>
                  {ambiente.rotulo}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/85 p-6 shadow-2xl shadow-slate-950/40">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_1fr]">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">Orgao de teste</p>
            <h2 className="text-2xl font-semibold text-white">Exibir SUPORTE no painel</h2>
            <p className="text-sm text-slate-300">
              O orgao SUPORTE e usado apenas para testes. Quando desativado, ele deixa de aparecer na Home, na Pesquisa,
              nas metricas e nas exportacoes para todos os usuarios deste servidor.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <label className="flex items-start gap-4">
              <input
                type="checkbox"
                className="mt-1 h-5 w-5 rounded border-slate-600 bg-slate-900 text-cyan-400 focus:ring-cyan-400/40"
                checked={exibirOrgaoSuporte}
                disabled={savingOrgaoSuporte}
                onChange={(event) => onExibirOrgaoSuporteChange(event.target.checked)}
              />
              <span className="space-y-1">
                <span className="block text-sm font-medium text-slate-200">Mostrar orgao SUPORTE</span>
                <span className="block text-sm text-slate-400">
                  {exibirOrgaoSuporte
                    ? "Visivel em graficos, filtros, totais e exportacoes."
                    : "Oculto por padrao em todo o frontend compartilhado."}
                </span>
              </span>
            </label>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        {ambientes.map((ambiente) => {
          const ativo = ambiente.id === ambienteAtivo;
          return (
            <article
              key={ambiente.id}
              className={`rounded-3xl border p-5 shadow-xl transition ${
                ativo
                  ? "border-cyan-400/40 bg-cyan-500/10 shadow-cyan-950/20"
                  : "border-slate-800 bg-slate-900/85 shadow-slate-950/30"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-white">{ambiente.rotulo}</h3>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                    ativo ? "bg-cyan-300 text-slate-950" : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {ativo ? "Ativo" : "Disponivel"}
                </span>
              </div>
              <dl className="mt-4 space-y-3 text-sm text-slate-300">
                <div>
                  <dt className="text-slate-500">Secao MySQL</dt>
                  <dd className="font-mono text-slate-100">{ambiente.mysql_section}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Secao Azure</dt>
                  <dd className="font-mono text-slate-100">{ambiente.azure_section || "-"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Key Vault</dt>
                  <dd className="break-all font-mono text-slate-100">{ambiente.key_vault_url || "-"}</dd>
                </div>
              </dl>
            </article>
          );
        })}
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/85 p-6 shadow-2xl shadow-slate-950/40">
        <h3 className="text-lg font-semibold text-white">Leitura atual</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <InfoCard label="Host do banco" value={infoBanco?.host ?? "-"} />
          <InfoCard label="Porta" value={infoBanco ? String(infoBanco.porta) : "-"} />
          <InfoCard label="Base" value={infoBanco?.database ?? "-"} />
          <InfoCard label="Usuario do banco" value={infoBanco?.usuario_banco ?? "-"} />
          <InfoCard label="Key Vault ativo" value={infoBanco?.key_vault_url ?? "-"} />
          <InfoCard label="Usuario local" value={infoBanco?.usuario_logado ?? "-"} />
        </div>
      </section>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 break-all text-sm text-slate-100">{value}</p>
    </article>
  );
}
