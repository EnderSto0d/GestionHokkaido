import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { EvaluationTabsClient } from "@/components/shared/evaluation-tabs";

export const metadata: Metadata = {
  title: "Évaluation des élèves — GestionHokkaido",
  description: "Tableau de bord d'évaluation des élèves pour les professeurs.",
};

type UtilisateurRoleRow = { role: string };

type StudentRow = {
  id: string;
  pseudo: string;
  avatar_url: string | null;
  grade: string | null;
  grade_role: string | null;
};

type EscouadeRow = {
  id: string;
  nom: string;
  points: number;
  url_logo: string | null;
};

export default async function EvaluationPage() {
  const supabase = await createClient();

  // 1. Check session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 2. Check role
  const { data: _utilisateur } = await supabase
    .from("utilisateurs")
    .select("role")
    .eq("id", user.id)
    .single();

  const utilisateur = _utilisateur as UtilisateurRoleRow | null;

  const isProfOrAdmin = utilisateur?.role === "professeur" || utilisateur?.role === "admin";

  // Vérifier si l'utilisateur fait partie de la division Stratégie (multi-divisions)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: divStrategie } = await (supabase.from("utilisateur_divisions") as any)
    .select("id")
    .eq("utilisateur_id", user.id)
    .eq("division", "Strat\u00e9gie")
    .limit(1);

  const isStrategie = (divStrategie?.length ?? 0) > 0;

  if (!utilisateur || (!isProfOrAdmin && !isStrategie)) {
    redirect("/profil");
  }

  // 3. Fetch all students (for individual evaluation)
  const { data: _students } = await supabase
    .from("utilisateurs")
    .select("id, pseudo, avatar_url, grade, grade_role")
    .eq("role", "eleve")
    .order("pseudo");

  const students = (_students ?? []) as StudentRow[];

  // 3b. Fetch divisions for all students (multi-divisions)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: _allDivisions } = await (supabase.from("utilisateur_divisions") as any)
    .select("utilisateur_id, division, role_division");

  const allDivisions = (_allDivisions ?? []) as { utilisateur_id: string; division: string; role_division: string }[];

  // Build a map: userId → division names array
  const divisionsByUser = new Map<string, string[]>();
  for (const d of allDivisions) {
    if (!divisionsByUser.has(d.utilisateur_id)) {
      divisionsByUser.set(d.utilisateur_id, []);
    }
    divisionsByUser.get(d.utilisateur_id)!.push(d.division);
  }

  // Enrich students with divisions list
  const studentsWithDivisions = students.map((s) => ({
    ...s,
    divisions: divisionsByUser.get(s.id) ?? [],
  }));

  // 4. Fetch squads (for squad evaluation) — only those with 3+ members
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: _escouades } = await (supabase as any)
    .from("escouades")
    .select("id, nom, points, url_logo, membres_escouade(utilisateur_id)")
    .order("nom");

  const escouades = ((_escouades ?? []) as (EscouadeRow & { membres_escouade: { utilisateur_id: string }[] })[]).filter(
    (e) => (e.membres_escouade?.length ?? 0) >= 3
  ) as EscouadeRow[];

  return (
    <div className="relative min-h-screen bg-[#0a0505] overflow-hidden">
      {/* ── Ambient background glows ─────────────────────── */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 select-none"
      >
        <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-red-700/15 blur-[120px]" />
        <div className="absolute -bottom-40 -right-16 w-[520px] h-[520px] rounded-full bg-orange-600/10 blur-[140px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-red-900/10 blur-[100px]" />
      </div>

      {/* ── Noise texture ───────────────────────────────────── */}
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

      {/* ── Page content ─────────────────────────────────────── */}
      <div className="relative z-10 mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 animate-fade-in">
        {/* Header */}
        <header className="mb-10">
          <p className="text-xs text-white/25 uppercase tracking-widest mb-5 font-medium">
            École d&apos;Exorcisme de Hokkaido&nbsp;&nbsp;/&nbsp;&nbsp;Équipe Professorale&nbsp;&nbsp;/&nbsp;&nbsp;Évaluation
          </p>

          <div className="flex items-start gap-4">
            <div className="relative flex-shrink-0 mt-1">
              <div className="absolute inset-0 rounded-xl bg-red-500/20 blur-md" />
              <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-red-600/30 to-orange-700/20 ring-1 ring-white/10">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  className="w-6 h-6 text-red-300"
                >
                  <path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                </svg>
              </div>
            </div>

            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                Évaluation des{" "}
                <span className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                  Élèves &amp; Escouades
                </span>
              </h1>
              <p className="mt-2 text-sm text-white/40 max-w-lg">
                Évaluez individuellement les compétences d&apos;un élève ou attribuez des points à une escouade.
              </p>
            </div>
          </div>

          <div className="mt-8 h-px bg-gradient-to-r from-red-500/30 via-white/10 to-transparent" />
        </header>

        {/* Evaluation tabs (client component handles tab switching) */}
        <EvaluationTabsClient students={studentsWithDivisions} escouades={escouades} />
      </div>
    </div>
  );
}
