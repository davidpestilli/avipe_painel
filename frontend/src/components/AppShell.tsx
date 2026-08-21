import type { ReactNode } from "react";

export function CompactHeader({
  currentView,
  onNavigateHome,
  onNavigatePesquisa,
  onNavigateConfiguracoes,
  onRefresh,
}: {
  currentView: "home" | "lista" | "detalhe" | "configuracoes";
  onNavigateHome: () => Promise<void>;
  onNavigatePesquisa: () => void;
  onNavigateConfiguracoes: () => void;
  onRefresh: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 mb-6">
      <div className="rounded-[28px] border border-slate-800/90 bg-[linear-gradient(135deg,rgba(20,30,52,0.95)_0%,rgba(16,24,42,0.98)_52%,rgba(13,21,38,0.99)_100%)] px-5 py-4 shadow-2xl shadow-slate-950/60 backdrop-blur-xl">
        <div className="pointer-events-none absolute inset-0 rounded-[28px] bg-[radial-gradient(circle_at_top_left,rgba(76,199,255,0.12),transparent_34%),radial-gradient(circle_at_70%_20%,rgba(109,94,252,0.12),transparent_30%)]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h1 className="title-shimmer mb-1 text-3xl font-semibold uppercase tracking-[0.08em] sm:text-[2.15rem]">
              WATCHER AVIPE
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-300">
              Monitoramento operacional do fluxo de pesquisas e do processamento.
            </p>
          </div>
          <nav className="relative flex flex-wrap items-center gap-2 rounded-2xl border border-slate-700/80 bg-slate-950/55 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <NavButton label="Home" active={currentView === "home"} onClick={() => void onNavigateHome()} />
            <NavButton label="Pesquisa" active={currentView === "lista" || currentView === "detalhe"} onClick={onNavigatePesquisa} />
            <NavButton label="Configuracoes" active={currentView === "configuracoes"} onClick={onNavigateConfiguracoes} />
            <IconButton label="Recarregar" onClick={onRefresh}>
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M16.5 10a6.5 6.5 0 1 1-1.4-4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M16.5 3.5v4h-4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </IconButton>
          </nav>
        </div>
      </div>
    </header>
  );
}

function NavButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      className={`inline-flex h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold transition ${
        active
          ? "bg-[linear-gradient(135deg,#6d5efc_0%,#4cc7ff_100%)] text-white shadow-lg shadow-cyan-500/20"
          : "border border-transparent bg-transparent text-slate-300 hover:border-slate-700 hover:bg-slate-900/80 hover:text-white"
      }`}
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-transparent bg-transparent text-slate-300 transition hover:border-slate-700 hover:bg-slate-900/80 hover:text-white"
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function LoadingOverlay() {
  return (
    <section className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-5">
        <div className="relative flex h-20 w-20 items-center justify-center">
          <span className="absolute h-20 w-20 animate-ping rounded-full border border-cyan-400/20 bg-cyan-400/5" />
          <span className="h-16 w-16 animate-spin rounded-full border-2 border-cyan-300/25 border-t-cyan-300 border-r-sky-400" />
          <span className="absolute h-7 w-7 rounded-full bg-[linear-gradient(135deg,#6d5efc_0%,#4cc7ff_100%)] shadow-[0_0_24px_rgba(76,199,255,0.45)]" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold tracking-[0.2em] text-cyan-200">WATCHER AVIPE</p>
          <p className="mt-2 text-sm text-slate-400">Carregando dados e reorganizando a leitura.</p>
        </div>
      </div>
    </section>
  );
}
