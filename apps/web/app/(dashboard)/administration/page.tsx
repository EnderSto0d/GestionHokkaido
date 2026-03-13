import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { AdminPanel } from "@/components/shared/admin-panel";
import { isConseilMember } from "@/app/(dashboard)/conseil/conseil-actions";

// ─── Métadonnées ──────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Administration — GestionHokkaido",
  description: "Panneau d'administration : gestion des élèves et des escouades.",
};

// ─── Types locaux ─────────────────────────────────────────────────────────────

type UtilisateurRoleRow = { role: string; grade_role: string | null };

type StudentRow = {
  id: string;
  pseudo: string;
  avatar_url: string | null;
  grade: string | null;
  grade_role: string | null;
  grade_secondaire: string | null;
  sort_inne: string | null;
  specialite: string | null;
  art_martial: string | null;
  prenom_rp: string | null;
  nom_rp: string | null;
  reliques: string | null;
  sub_jutsu: string | null;
  style_combat: string | null;
  discord_id: string;
  clan: string | null;
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdministrationPage() {
  const supabase = await createClient();

  // ── 1. Vérifier la session ────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // ── 2. Vérifier le rôle de l'utilisateur ─────────────────────────────
  const { data: _utilisateur } = await supabase
    .from("utilisateurs")
    .select("role, grade_role")
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

  // Vérifier si l'utilisateur est membre du conseil
  const isConseil = await isConseilMember(user.id);

  if (!utilisateur || (!isProfOrAdmin && !isStrategie && !isConseil)) {
    redirect("/");
  }

  // Stratégie/Conseil users can view but not manage levels or see eval details
  const canManageLevels = isProfOrAdmin;
  const isDirector = utilisateur?.grade_role === "Directeur" || utilisateur?.grade_role === "Co-Directeur";

  // ── 3. Récupérer tous les élèves ─────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: _students } = await (supabase.from("utilisateurs") as any)
    .select("id, pseudo, avatar_url, grade, grade_role, grade_secondaire, sort_inne, specialite, art_martial, prenom_rp, nom_rp, reliques, sub_jutsu, style_combat, discord_id, clan")
    .order("pseudo");

  const students = (_students ?? []) as StudentRow[];

  // 3b. Fetch all divisions (multi-divisions)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: _allDivisions } = await (supabase.from("utilisateur_divisions") as any)
    .select("utilisateur_id, division, role_division");

  const allDivisions = (_allDivisions ?? []) as { utilisateur_id: string; division: string; role_division: string }[];

  // Build map: userId → divisions array
  const divisionsByUser = new Map<string, string[]>();
  for (const d of allDivisions) {
    if (!divisionsByUser.has(d.utilisateur_id)) {
      divisionsByUser.set(d.utilisateur_id, []);
    }
    const divName = divisionsByUser.get(d.utilisateur_id)!;
    if (!divName.includes(d.division)) {
      divName.push(d.division);
    }
  }

  // Enrich students with divisions
  const studentsWithDivisions = students.map((s) => ({
    ...s,
    divisions: divisionsByUser.get(s.id) ?? [],
  }));

  // ─────────────────────────────────────────────────────────────────────
  return (
    <div className="relative min-h-screen bg-[#0a0505] overflow-hidden">
      {/* ── Ambient background glows ───────────────────────────── */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 select-none"
      >
        <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-red-700/15 blur-[120px]" />
        <div className="absolute -bottom-40 -right-16 w-[520px] h-[520px] rounded-full bg-orange-600/10 blur-[140px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-red-900/10 blur-[100px]" />
      </div>

      {/* ── Noise texture overlay ───────────────────────────────────────── */}
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

      {/* ── Contenu principal ───────────────────────────────────────────── */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">

        {/* ── En-tête ─────────────────────────────────────────────────── */}
        <header className="mb-10">
          <p className="text-xs text-white/25 uppercase tracking-widest mb-5 font-medium">
            École d&apos;Exorcisme de Hokkaido&nbsp;&nbsp;/&nbsp;&nbsp;Administration
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
                  <path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4" />
                  <path d="M19 7H8a1 1 0 0 0-1 1v13" />
                  <path d="M15 7V3" />
                </svg>
              </div>
            </div>

            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                Panneau d&apos;
                <span className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                  Administration
                </span>
              </h1>
              <p className="mt-1.5 text-sm text-white/50">
                Gérez les élèves et leurs niveaux académiques.
              </p>
            </div>
          </div>

          <div className="mt-8 h-px bg-gradient-to-r from-red-500/30 via-white/10 to-transparent" />
        </header>

        {/* ── Panneau d'administration interactif ─────────────────────── */}
        <AdminPanel students={studentsWithDivisions} canManageLevels={canManageLevels} canViewAll={isConseil || isProfOrAdmin} isDirector={isDirector} currentUserRole={utilisateur?.role ?? "eleve"} currentUserGradeRole={utilisateur?.grade_role ?? null} />
      </div>
    </div>
  );
}
