import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { InvitationActionCard } from "@/components/shared/invitation-action-card";
import { ProfileEditForm } from "@/components/shared/profile-edit-form";
import { RadarChart } from "@/components/shared/radar-chart";
import { SyncDiscordButton } from "@/components/shared/sync-discord-button";
import { PointsHistoryModal } from "@/components/shared/points-history-modal";


export const metadata: Metadata = {
  title: "Mon Profil — GestionHokkaido",
  description: "Consultez et modifiez votre profil unique — École d'Exorcisme de Hokkaido.",
};

type UtilisateurRow = {
  id: string;
  discord_id: string;
  pseudo: string;
  avatar_url: string | null;
  email: string | null;
  role: string;
  grade: string | null;
  grade_role: string | null;
  grade_secondaire: string | null;
  prenom_rp: string | null;
  nom_rp: string | null;
  sort_inne: string | null;
  specialite: string | null;
  art_martial: string | null;
  reliques: string | null;
  sub_jutsu: string | null;
  style_combat: string | null;
  logistics_points: number;
  points_personnels: number;
};

type UserDivisionRow = {
  division: string;
  role_division: string;
};

type MembreEscouadeRow = {
  role_escouade: string;
  escouades: {
    id: string;
    nom: string;
    url_logo: string | null;
    points: number;
  } | null;
};

type InvitationRow = {
  id: string;
  statut: string;
  cree_le: string;
  escouades: {
    id: string;
    nom: string;
    url_logo: string | null;
  } | null;
};

type EvaluationRow = {
  maitrise_energie_occulte: number;
  sang_froid: number;
  discipline: number;
  intelligence_tactique: number;
  travail_equipe: number;
  premiers_soin: number;
  combat: number;
  initiative: number;
  connaissance_theorique: number;
  pedagogie: number;
};

const RADAR_LABELS = [
  "Maîtrise Énergie Occulte",
  "Sang Froid",
  "Discipline",
  "Intelligence Tactique",
  "Travail d'équipe",
  "Premiers Soins",
  "Combat",
  "Initiative",
  "Connaissance Théorique",
  "Pédagogie",
];

const COMPETENCE_KEYS = [
  "maitrise_energie_occulte",
  "sang_froid",
  "discipline",
  "intelligence_tactique",
  "travail_equipe",
  "premiers_soin",
  "combat",
  "initiative",
  "connaissance_theorique",
  "pedagogie",
] as const;

export default async function ProfilPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/profil");
  }

  // Récupérer l'utilisateur (tous les champs fusionnés)
  const { data: _utilisateur } = await supabase
    .from("utilisateurs")
    .select("id, discord_id, pseudo, avatar_url, email, role, grade, grade_role, grade_secondaire, prenom_rp, nom_rp, sort_inne, specialite, art_martial, reliques, sub_jutsu, style_combat, logistics_points, points_personnels")
    .eq("id", user.id)
    .single();
  const utilisateur = _utilisateur as UtilisateurRow | null;

  // Récupérer les divisions de l'utilisateur (multi-divisions)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: _userDivisions } = await (supabase.from("utilisateur_divisions") as any)
    .select("division, role_division")
    .eq("utilisateur_id", user.id)
    .order("division");
  const userDivisions = (_userDivisions ?? []) as UserDivisionRow[];

  // Récupérer l'escouade (max 1 par utilisateur)
  const { data: _membre } = await supabase
    .from("membres_escouade")
    .select(`
      role_escouade,
      escouades (
        id,
        nom,
        url_logo,
        points
      )
    `)
    .eq("utilisateur_id", user.id)
    .maybeSingle();
  const escouadeMembre = _membre as MembreEscouadeRow | null;

  // Récupérer les invitations en attente (liées directement à l'utilisateur)
  const { data: _invitations } = await supabase
    .from("invitations_escouade")
    .select(`
      id,
      statut,
      cree_le,
      escouades (
        id,
        nom,
        url_logo
      )
    `)
    .eq("utilisateur_id", user.id)
    .eq("statut", "en_attente")
    .order("cree_le", { ascending: false });
  const invitations = (_invitations ?? []) as InvitationRow[];

  // Récupérer l'historique des points personnels
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: _histPoints } = await (supabase.from("historique_points_personnels") as any)
    .select("id, points, justification, source, cree_le, attribue_par")
    .eq("utilisateur_id", user.id)
    .order("cree_le", { ascending: false })
    .limit(100);

  // Récupérer les pseudos des attributeurs en une seule requête
  const attribueParIds = [...new Set(
    ((_histPoints ?? []) as { attribue_par: string | null }[])
      .map((h) => h.attribue_par)
      .filter(Boolean)
  )] as string[];

  let pseudoMap: Record<string, string> = {};
  if (attribueParIds.length > 0) {
    const { data: _pseudos } = await supabase
      .from("utilisateurs")
      .select("id, pseudo")
      .in("id", attribueParIds);
    for (const p of (_pseudos ?? []) as { id: string; pseudo: string }[]) {
      pseudoMap[p.id] = p.pseudo;
    }
  }

  const pointsHistory = ((_histPoints ?? []) as { id: string; points: number; justification: string; source: string; cree_le: string; attribue_par: string | null }[]).map((h) => ({
    id: h.id,
    points: h.points,
    justification: h.justification ?? "",
    source: h.source,
    cree_le: h.cree_le,
    attribue_par_pseudo: h.attribue_par ? (pseudoMap[h.attribue_par] ?? null) : null,
  }));

  // Récupérer les évaluations (moyenne de tous les évaluateurs)
  const { data: _evaluations } = await supabase
    .from("evaluations")
    .select("maitrise_energie_occulte, sang_froid, discipline, intelligence_tactique, travail_equipe, premiers_soin, combat, initiative, connaissance_theorique, pedagogie")
    .eq("utilisateur_id", user.id);
  const evaluations = (_evaluations ?? []) as EvaluationRow[];

  // Récupérer les évaluations individuelles (par compétence, /100)
  const { data: _evalIndividuelles } = await supabase
    .from("evaluations_individuelles")
    .select("competence, note")
    .eq("utilisateur_id", user.id);
  const evalIndividuelles = (_evalIndividuelles ?? []) as { competence: string; note: number }[];

  // Calculer la moyenne par compétence pour les évaluations individuelles
  const indivTotals: Record<string, { sum: number; count: number }> = {};
  for (const ev of evalIndividuelles) {
    if (!indivTotals[ev.competence]) indivTotals[ev.competence] = { sum: 0, count: 0 };
    indivTotals[ev.competence].sum += ev.note;
    indivTotals[ev.competence].count += 1;
  }
  const indivAverages: Record<string, number> = {};
  for (const key of Object.keys(indivTotals)) {
    indivAverages[key] = Math.round(indivTotals[key].sum / indivTotals[key].count);
  }

  // Calculer la moyenne des évaluations radar
  const neverEvaluated = evaluations.length === 0;
  let radarValues: number[];
  if (!neverEvaluated) {
    const sum = evaluations.reduce(
      (acc, ev) => ({
        maitrise_energie_occulte: acc.maitrise_energie_occulte + ev.maitrise_energie_occulte,
        sang_froid: acc.sang_froid + ev.sang_froid,
        discipline: acc.discipline + ev.discipline,
        intelligence_tactique: acc.intelligence_tactique + ev.intelligence_tactique,
        travail_equipe: acc.travail_equipe + ev.travail_equipe,
        premiers_soin: acc.premiers_soin + ev.premiers_soin,
        combat: acc.combat + ev.combat,
        initiative: acc.initiative + ev.initiative,
        connaissance_theorique: acc.connaissance_theorique + ev.connaissance_theorique,
        pedagogie: acc.pedagogie + ev.pedagogie,
      }),
      { maitrise_energie_occulte: 0, sang_froid: 0, discipline: 0, intelligence_tactique: 0, travail_equipe: 0, premiers_soin: 0, combat: 0, initiative: 0, connaissance_theorique: 0, pedagogie: 0 }
    );
    const n = evaluations.length;
    radarValues = [
      Math.round(sum.maitrise_energie_occulte / n),
      Math.round(sum.sang_froid / n),
      Math.round(sum.discipline / n),
      Math.round(sum.intelligence_tactique / n),
      Math.round(sum.travail_equipe / n),
      Math.round(sum.premiers_soin / n),
      Math.round(sum.combat / n),
      Math.round(sum.initiative / n),
      Math.round(sum.connaissance_theorique / n),
      Math.round(sum.pedagogie / n),
    ];
  } else {
    radarValues = Array(10).fill(0) as number[];
  }

  const roleBadge =
    utilisateur?.role === "admin"
      ? { label: utilisateur?.grade_role === "Co-Directeur" ? "Co-Directeur" : utilisateur?.grade_role === "Directeur" ? "Directeur" : "Administrateur", cls: "bg-red-500/15 text-red-400 ring-red-500/20" }
      : utilisateur?.role === "professeur"
      ? { label: utilisateur?.grade_role === "Professeur Principal" ? "Professeur Principal" : "Professeur", cls: "bg-amber-500/15 text-amber-300 ring-amber-400/20" }
      : { label: "Élève", cls: "bg-red-500/15 text-red-300 ring-red-400/20" };

  const displayName = [utilisateur?.prenom_rp, utilisateur?.nom_rp].filter(Boolean).join(" ") || utilisateur?.pseudo || "Utilisateur";

  return (
    <div className="relative min-h-screen bg-[#0a0505] overflow-hidden">
      {/* Fond décoratif */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 select-none">
        <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-red-700/15 blur-[120px]" />
        <div className="absolute -bottom-40 -right-16 w-[520px] h-[520px] rounded-full bg-orange-600/10 blur-[140px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-red-900/10 blur-[100px]" />
      </div>

      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 opacity-[0.025]"
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundRepeat: "repeat",
          backgroundSize: "160px",
        }}
      />

      <div className="relative z-10 mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8 space-y-10 animate-fade-in">

        {/* Breadcrumb */}
        <p className="text-xs text-white/25 uppercase tracking-widest font-medium">
          École d&apos;Exorcisme de Hokkaido&nbsp;&nbsp;/&nbsp;&nbsp;Mon Profil
        </p>

        {/* ── Header profil ─────────────────────────────────────────────── */}
        <header className="flex flex-col sm:flex-row items-start gap-6">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 rounded-full bg-red-500/25 blur-xl" />
            <div className="relative w-20 h-20 rounded-full overflow-hidden ring-2 ring-red-500/40 bg-white/5 flex items-center justify-center shadow-lg">
              {utilisateur?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={utilisateur.avatar_url} alt="Avatar" className="object-cover w-full h-full" />
              ) : (
                <span className="text-3xl font-bold text-red-300">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>

          {/* Infos */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h1 className="text-3xl font-bold text-white tracking-tight">
                {displayName}
              </h1>
              <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ring-1 ${roleBadge.cls}`}>
                {roleBadge.label}
              </span>
            </div>
            <p className="text-sm text-white/40">
              {escouadeMembre?.escouades ? "1 escouade" : "Aucune escouade"}
              {invitations.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-semibold">
                  {invitations.length} invitation{invitations.length > 1 ? "s" : ""}
                </span>
              )}
            </p>

            {/* Bouton sync Discord */}
            <div className="mt-3">
              <SyncDiscordButton />
            </div>

            {/* Badges grade, divisions, rôle hiérarchique */}
            {(utilisateur?.grade || utilisateur?.grade_role || userDivisions.length > 0 || utilisateur?.grade_secondaire) && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {utilisateur?.grade && (
                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-red-500/10 text-red-300 ring-1 ring-red-400/15">
                    {utilisateur.grade}
                  </span>
                )}
                {utilisateur?.grade_role && (
                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-purple-500/10 text-purple-300 ring-1 ring-purple-400/15">
                    {utilisateur.grade_role}
                  </span>
                )}
                {utilisateur?.grade_secondaire && (
                  <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-amber-500/10 text-amber-300 ring-1 ring-amber-400/15">
                    {utilisateur.grade_secondaire}
                  </span>
                )}
                {userDivisions.map((ud) => (
                  <span
                    key={`${ud.division}-${ud.role_division}`}
                    className={`px-2 py-0.5 text-[10px] font-semibold rounded-md ring-1 ${
                      ud.role_division === "superviseur"
                        ? "bg-orange-500/10 text-orange-300 ring-orange-400/15"
                        : "bg-emerald-500/10 text-emerald-300 ring-emerald-400/15"
                    }`}
                  >
                    {ud.role_division === "superviseur" ? "Sup." : "Div."} {ud.division}
                  </span>
                ))}
              </div>
            )}
          </div>
        </header>

        {/* ── Points Personnels & Logistique ─────────────────────────────── */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 via-white/[0.03] to-transparent border border-amber-500/15 px-6 py-5">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -translate-y-8 translate-x-8 blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-md bg-amber-500/20 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-3.5 h-3.5 text-amber-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
                  </svg>
                </div>
                <p className="text-[11px] font-semibold text-amber-300/70 uppercase tracking-widest">
                  Points Personnels
                </p>
              </div>
              <p className="text-3xl font-bold text-amber-400">
                {(utilisateur?.points_personnels ?? 0).toLocaleString("fr-FR")}
              </p>
              <p className="mt-1 text-xs text-white/30">
                Vos points personnels ne diminuent jamais
              </p>
              <PointsHistoryModal history={pointsHistory} />
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 via-white/[0.03] to-transparent border border-emerald-500/15 px-6 py-5">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -translate-y-8 translate-x-8 blur-2xl" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-md bg-emerald-500/20 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-3.5 h-3.5 text-emerald-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                  </svg>
                </div>
                <p className="text-[11px] font-semibold text-emerald-300/70 uppercase tracking-widest">
                  Points Logistique
                </p>
              </div>
              <p className="text-3xl font-bold text-white">
                {(utilisateur?.logistics_points ?? 0).toLocaleString("fr-FR")}
              </p>
              <p className="mt-1 text-xs text-white/30">
                Total cumulé de vos contributions (bonus inclus dans pts personnels)
              </p>
            </div>
          </div>
        </section>

        <div className="h-px bg-gradient-to-r from-red-500/30 via-white/10 to-transparent" />

        {/* ── Invitations en attente ────────────────────────────────────── */}
        {invitations.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 rounded-lg bg-amber-500/20 blur-sm" />
                <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/10 ring-1 ring-amber-400/20">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4 text-amber-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                  </svg>
                </div>
              </div>
              <h2 className="text-sm font-semibold text-amber-300/80 uppercase tracking-widest">
                Invitations en attente ({invitations.length})
              </h2>
            </div>
            <div className="space-y-3">
              {invitations.map((inv) => (
                <InvitationActionCard
                  key={inv.id}
                  invitationId={inv.id}
                  escouadeNom={inv.escouades?.nom ?? "Escouade inconnue"}
                  escouadeLogo={inv.escouades?.url_logo ?? null}
                  personnageNom={displayName}
                />
              ))}
            </div>
          </section>
        )}

        {/* ── Formulaire d'édition du profil ─────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-5">
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 rounded-lg bg-red-500/20 blur-sm" />
              <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/10 ring-1 ring-red-400/20">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4 text-red-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                </svg>
              </div>
            </div>
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest">
              Modifier mon personnage
            </h2>
          </div>

          <div className="rounded-2xl bg-white/[0.02] ring-1 ring-white/8 p-6">
            <ProfileEditForm
              profile={{
                pseudo: utilisateur?.pseudo ?? "",
                prenom_rp: utilisateur?.prenom_rp ?? null,
                nom_rp: utilisateur?.nom_rp ?? null,
                sort_inne: (utilisateur?.sort_inne as import("@/types/database").SortsInnes) ?? null,
                specialite: (utilisateur?.specialite as import("@/types/database").Specialites) ?? null,
                art_martial: (utilisateur?.art_martial as import("@/types/database").ArtsMartiaux) ?? null,
                reliques: utilisateur?.reliques ?? null,
                sub_jutsu: utilisateur?.sub_jutsu ?? null,
                style_combat: utilisateur?.style_combat ?? null,
              }}
            />
          </div>
        </section>

        {/* ── Radar Chart — Évaluation ──────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-5">
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 rounded-lg bg-orange-500/20 blur-sm" />
              <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-orange-500/10 ring-1 ring-orange-400/20">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4 text-orange-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                </svg>
              </div>
            </div>
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest">
              Évaluation de compétences
            </h2>
          </div>

          <div className="rounded-2xl bg-white/[0.02] ring-1 ring-white/8 p-6 space-y-5">
            <RadarChart labels={RADAR_LABELS} values={radarValues} />
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 sm:gap-2">
              {RADAR_LABELS.map((label, i) => (
                <div key={label} className="text-center p-1.5 sm:p-2 rounded-lg bg-white/[0.02] ring-1 ring-white/5">
                  <p className="text-[8px] sm:text-[9px] text-white/30 truncate mb-0.5">{label}</p>
                  {neverEvaluated ? (
                    <p className="text-[10px] font-medium text-white/20">Non Évaluée</p>
                  ) : (
                    <p className="text-sm font-bold text-red-300">{radarValues[i]}<span className="text-[10px] text-white/30">/20</span></p>
                  )}
                </div>
              ))}
            </div>
            <p className="text-[10px] text-white/20 text-center">
              {neverEvaluated
                ? "Aucune évaluation reçue — le radar sera mis à jour dès qu'un professeur vous évalue."
                : "Évaluation attribuée par l'équipe professorale. Seuls les professeurs et administrateurs peuvent modifier ces notes."}
            </p>
          </div>
        </section>

        {/* ── Évaluations Individuelles ─────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-5">
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 rounded-lg bg-emerald-500/20 blur-sm" />
              <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 ring-1 ring-emerald-400/20">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4 text-emerald-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
                </svg>
              </div>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest">
                Notes individuelles
              </h2>
              {evalIndividuelles.length > 0 && (
                <p className="text-[10px] text-white/25 mt-0.5">{evalIndividuelles.length} notation{evalIndividuelles.length > 1 ? "s" : ""} reçue{evalIndividuelles.length > 1 ? "s" : ""}</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-white/[0.02] ring-1 ring-white/8 p-6">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 sm:gap-3">
              {COMPETENCE_KEYS.map((key, i) => {
                const avg = indivAverages[key] ?? null;
                return (
                  <div key={key} className="text-center p-2 sm:p-3 rounded-xl bg-white/[0.02] ring-1 ring-white/5">
                    <p className="text-[8px] sm:text-[9px] text-white/30 truncate mb-1">{RADAR_LABELS[i]}</p>
                    {avg === null ? (
                      <p className="text-[10px] font-medium text-white/20">Non Évaluée</p>
                    ) : (
                      <p className="text-base font-bold text-emerald-300">{avg}<span className="text-[10px] text-white/30">/100</span></p>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-white/20 text-center mt-4">
              Notes attribuées compétence par compétence par l&apos;équipe professorale. La note affichée est la moyenne de toutes les évaluations reçues.
            </p>
          </div>
        </section>

        {/* ── Mon escouade ──────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 rounded-lg bg-red-500/20 blur-sm" />
                <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-red-500/10 ring-1 ring-orange-400/20">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4 text-orange-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c-4.5 1.8-8 3-8 9 0 5.4 4.8 9 8 9s8-3.6 8-9c0-6-3.5-7.2-8-9Z" />
                  </svg>
                </div>
              </div>
              <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest">
                Mon escouade
              </h2>
            </div>
            <Link href="/escouades" className="text-xs text-red-400 hover:text-red-300 transition-colors">
              Voir toutes →
            </Link>
          </div>

          {!escouadeMembre?.escouades ? (
            <div className="flex flex-col items-center justify-center py-12 rounded-xl bg-white/[0.02] ring-1 ring-white/5 text-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-6 h-6 text-orange-400/50">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c-4.5 1.8-8 3-8 9 0 5.4 4.8 9 8 9s8-3.6 8-9c0-6-3.5-7.2-8-9Z" />
                </svg>
              </div>
              <p className="text-white/30 text-sm">Vous n&apos;êtes membre d&apos;aucune escouade.</p>
              <Link href="/escouades" className="text-xs text-red-400 hover:text-red-300 underline underline-offset-2">
                Explorer les escouades →
              </Link>
            </div>
          ) : (
            <Link
              href={`/escouades/${escouadeMembre.escouades.id}`}
              className="group overflow-hidden flex items-center gap-3 p-4 rounded-xl bg-white/[0.02] ring-1 ring-white/8 hover:bg-white/[0.055] hover:ring-red-500/20 transition-all"
            >
              <div className="w-11 h-11 rounded-lg bg-red-500/10 ring-1 ring-red-400/20 flex items-center justify-center text-sm font-bold text-red-300 flex-shrink-0 uppercase overflow-hidden">
                {escouadeMembre.escouades.url_logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={escouadeMembre.escouades.url_logo} alt={escouadeMembre.escouades.nom} className="object-cover w-full h-full" />
                ) : (
                  escouadeMembre.escouades.nom.charAt(0)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white truncate group-hover:text-red-300 transition-colors">
                  {escouadeMembre.escouades.nom}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ring-1 ${escouadeMembre.role_escouade === "chef" ? "bg-amber-500/10 text-amber-300 ring-amber-400/15" : "bg-white/5 text-white/40 ring-white/10"}`}>
                    {escouadeMembre.role_escouade === "chef" ? "Chef" : "Membre"}
                  </span>
                  <span className="text-xs text-white/30 font-mono">
                    {escouadeMembre.escouades.points.toLocaleString("fr-FR")} pts d&apos;escouade
                  </span>
                </div>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white/20 group-hover:text-red-400/50 transition-colors flex-shrink-0">
                <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
              </svg>
            </Link>
          )}
        </section>

      </div>
    </div>
  );
}
