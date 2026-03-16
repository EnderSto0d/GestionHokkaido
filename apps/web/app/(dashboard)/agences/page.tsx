import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAgences, getMonAgence, getMonStage } from "./actions";
import { AgencesClient } from "./agences-client";

export const metadata: Metadata = {
  title: "Agences — GestionHokkaido",
  description: "Liste de toutes les agences d'exorcistes de l'École de Hokkaido.",
};

export default async function AgencesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/agences");
  }

  const { data: _utilisateur } = await supabase
    .from("utilisateurs")
    .select("id, role, grade_role, grade_secondaire")
    .eq("id", user.id)
    .single();

  const utilisateur = _utilisateur as {
    id: string;
    role: string;
    grade_role: string | null;
    grade_secondaire: string | null;
  } | null;

  const EXO_PRO_PLUS_ROLES = [
    "Exorciste Pro",
    "Professeur",
    "Professeur Principal",
    "Co-Directeur",
    "Directeur",
  ];

  const isExoProPlus = EXO_PRO_PLUS_ROLES.includes(utilisateur?.grade_role ?? "");
  const isAdmin = utilisateur?.role === "admin";
  const isTerminal = utilisateur?.grade_secondaire === "Terminal";

  const [{ agences, error }, monAgence, monStage] = await Promise.all([
    getAgences(),
    getMonAgence(),
    getMonStage(),
  ]);

  const dejaMembreAgence = !!monAgence;

  return (
    <div className="relative min-h-screen bg-[#050a18] overflow-hidden">
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 select-none">
        <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-violet-700/15 blur-[120px]" />
        <div className="absolute -bottom-40 -right-16 w-[520px] h-[520px] rounded-full bg-indigo-600/10 blur-[140px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-violet-900/10 blur-[100px]" />
      </div>

      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundRepeat: "repeat",
          backgroundSize: "160px",
        }}
      />

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 animate-fade-in">
        <header className="mb-10">
          <p className="text-xs text-white/25 uppercase tracking-widest mb-5 font-medium">
            École d&apos;Exorcisme de Hokkaido&nbsp;&nbsp;/&nbsp;&nbsp;Agences
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="relative flex-shrink-0 mt-1">
                <div className="absolute inset-0 rounded-xl bg-violet-500/20 blur-md" />
                <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600/30 to-indigo-700/20 ring-1 ring-white/10">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-6 h-6 text-violet-300">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                  </svg>
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">
                  <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">Agences</span>{" "}
                  d&apos;Exorcistes
                </h1>
                <p className="mt-1.5 text-sm text-white/40">
                  {agences.length} agence{agences.length !== 1 ? "s" : ""} disponible{agences.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </div>
          <div className="mt-8 h-px bg-gradient-to-r from-violet-500/30 via-white/10 to-transparent" />
        </header>

        <AgencesClient
          agences={agences}
          error={error}
          userId={user.id}
          dejaMembreAgence={dejaMembreAgence}
          monAgence={monAgence}
          monStage={monStage}
          isExoProPlus={isExoProPlus}
          isAdmin={isAdmin}
          isTerminal={isTerminal}
        />
      </div>
    </div>
  );
}
