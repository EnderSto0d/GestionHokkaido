import Link from "next/link";

export default function HomePage() {
  return (
    <main className="relative min-h-screen bg-[#070307] overflow-hidden text-white flex flex-col">
      {/* ── Fond sombre subtil ──────────────────────────────────────────── */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 select-none">
        {/* Lueur centrale très discrète */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] rounded-full bg-red-950/25 blur-[180px]" />
        {/* Vignette sur les bords */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
      </div>

      {/* Texture de bruit très subtile */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundRepeat: "repeat",
          backgroundSize: "160px",
        }}
      />

      {/* ── Barre supérieure ────────────────────────────────────────────── */}
      <header className="relative z-10 border-b border-white/[0.06]">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white/[0.06] ring-1 ring-white/[0.08] flex items-center justify-center">
              <ExorcistCrest />
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-semibold text-white/50 uppercase tracking-[0.2em] leading-none">
                École d&apos;Exorcisme
              </p>
              <p className="text-[10px] text-white/20 uppercase tracking-widest mt-0.5">
                Hokkaido — Intranet
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-white/15 uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500/60 animate-pulse" />
            Système actif
          </div>
        </div>
      </header>

      {/* ── Contenu principal ───────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-md text-center space-y-10">

          {/* Emblème */}
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-red-500/8 blur-2xl scale-150" />
              <div className="relative w-20 h-20 rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.08] flex items-center justify-center">
                <ExorcistCrestLarge />
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white/90">
                Portail Intranet
              </h1>
              <p className="text-sm text-white/30 leading-relaxed max-w-sm mx-auto">
                Plateforme de gestion interne de l&apos;École d&apos;Exorcisme de Hokkaido.
                <br />
                Accès réservé aux membres du serveur.
              </p>
            </div>
          </div>

          {/* Séparateur discret */}
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-white/[0.06]" />
            <div className="w-1 h-1 rounded-full bg-white/10" />
            <div className="h-px flex-1 bg-white/[0.06]" />
          </div>

          {/* Bouton connexion */}
          <div className="space-y-4">
            <Link
              href="/login"
              className="group relative w-full inline-flex items-center justify-center gap-3 px-8 py-3.5 rounded-xl font-semibold text-sm bg-white/[0.05] text-white/80 ring-1 ring-white/[0.1] hover:bg-white/[0.08] hover:text-white hover:ring-white/[0.15] transition-all duration-200"
            >
              <DiscordIcon />
              Se connecter avec Discord
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white/30 group-hover:text-white/50 group-hover:translate-x-0.5 transition-all">
                <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
              </svg>
            </Link>
            <p className="text-[11px] text-white/15">
              Authentification sécurisée via Discord OAuth2
            </p>
          </div>
        </div>
      </div>

      {/* ── Pied de page ────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/[0.04] py-4">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between">
          <p className="text-[10px] text-white/10 uppercase tracking-widest">
            Accès confidentiel — Usage interne uniquement
          </p>
          <p className="text-[10px] text-white/10 uppercase tracking-widest">
            HJH v1.0
          </p>
        </div>
      </footer>
    </main>
  );
}

// ─── Icônes ───────────────────────────────────────────────────────────────────

function ExorcistCrest() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-white/40">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386-1.591 1.591M21 12h-2.25m-.386 6.364-1.591-1.591M12 18.75V21m-4.773-4.227-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" />
    </svg>
  );
}

function ExorcistCrestLarge() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="w-10 h-10 text-white/25">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5a17.92 17.92 0 0 1-8.716-2.247m0 0A8.966 8.966 0 0 1 3 12c0-1.264.26-2.467.73-3.56" />
    </svg>
  );
}

function DiscordIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white/40 group-hover:text-white/60 transition-colors">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03Z" />
    </svg>
  );
}

