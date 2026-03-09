import Link from "next/link";
import { DiscordLoginForm } from "@/components/shared/discord-login-form";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
    error?: string;
  }>;
};

function CursedEnergyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
    </svg>
  );
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = params.next ?? "/profil";
  const errorCode = params.error;

  return (
    <main className="relative min-h-screen bg-[#0a0505] flex items-center justify-center p-6 overflow-hidden">
      {/* Ambiance blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[600px] w-[600px] rounded-full bg-red-600/10 blur-3xl animate-cursed-glow" />
        <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-orange-900/8 blur-3xl" />
        <div className="absolute bottom-1/4 right-0 h-64 w-64 rounded-full bg-red-900/8 blur-3xl" />
      </div>
      {/* Noise texture */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm animate-fade-in">
        {/* Top accent */}
        <div className="h-px rounded-t-2xl bg-gradient-to-r from-red-500/0 via-red-500/60 to-red-500/0" />
        <div className="rounded-b-2xl rounded-tr-2xl bg-white/[0.03] ring-1 ring-white/10 p-8 backdrop-blur-sm">
          {/* Logo + branding */}
          <div className="flex flex-col items-center gap-3 mb-7 text-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-red-500/25 blur-xl" />
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-600 to-orange-500 text-white shadow-lg shadow-red-500/25">
                <CursedEnergyIcon />
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-red-400">
                HJH
              </p>
              <h1 className="mt-0.5 text-xl font-bold bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                École d&apos;Exorcisme de Hokkaido
              </h1>
            </div>
          </div>

          {/* Divider */}
          <div className="mb-7 h-px bg-white/8" />

          {/* Text */}
          <p className="mb-6 text-center text-sm text-white/50 leading-relaxed">
            Connectez-vous avec votre compte Discord pour rejoindre la plateforme et gérer votre personnage.
          </p>

          {/* Discord login button */}
          <DiscordLoginForm nextPath={nextPath} errorCode={errorCode} />

          {/* Back to landing */}
          <p className="mt-6 text-center text-xs text-white/25">
            <Link href="/" className="hover:text-white/50 transition-colors">
              ← Retour à l&apos;accueil
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}