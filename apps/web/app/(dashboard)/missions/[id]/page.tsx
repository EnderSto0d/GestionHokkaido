import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  getMission,
  getMissionParticipants,
  isParticipant,
  canCreateMission,
} from "../actions";
import { getPingLabel } from "../mission-utils";
import type { PingCible } from "../mission-utils";
import { JoinMissionButton, CreatorControls, DeleteMissionButton } from "@/components/shared/mission-controls";
import MissionParticipants from "@/components/shared/mission-participants";

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const mission = await getMission(id);
  return {
    title: mission ? `${mission.titre} — Missions` : "Mission introuvable",
  };
}

// ─── Status pill ─────────────────────────────────────────────────────────────

function StatusPill({ statut }: { statut: "active" | "terminee" | "annulee" }) {
  const cfg = {
    active: {
      label: "Active",
      cls: "bg-green-500/15 text-green-400 ring-green-500/30",
      dot: "bg-green-400",
    },
    terminee: {
      label: "Terminée",
      cls: "bg-white/5 text-white/40 ring-white/10",
      dot: "bg-white/30",
    },
    annulee: {
      label: "Annulée",
      cls: "bg-red-500/10 text-red-400/70 ring-red-500/20",
      dot: "bg-red-400/60",
    },
  }[statut];

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ring-1 ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ─── Client-side eligibility check (simplified, server still validates) ────

async function checkEligibilityFromDB(
  userId: string,
  pingCible: PingCible,
  supabaseClient: Awaited<ReturnType<typeof createClient>>
): Promise<boolean> {
  // No restriction → always eligible
  if (!pingCible.restreindre) return true;
  // @everyone → eligible
  if (pingCible.everyone) return true;

  // Check grade_role for eleve_exorciste
  if (pingCible.eleve_exorciste || pingCible.gradeRoles?.length || pingCible.grades?.length || pingCible.gradeSecondaires?.length) {
    const { data: u } = await supabaseClient
      .from("utilisateurs")
      .select("grade_role, grade, grade_secondaire")
      .eq("id", userId)
      .single();
    const userData = u as { grade_role: string | null; grade: string | null; grade_secondaire: string | null } | null;
    if (userData) {
      if (pingCible.eleve_exorciste && userData.grade_role === "Élève Exorciste") return true;
      if (pingCible.gradeRoles?.some((gr) => gr === userData.grade_role)) return true;
      if (pingCible.grades?.some((g) => g === userData.grade)) return true;
      if (pingCible.gradeSecondaires?.some((gs) => gs === userData.grade_secondaire)) return true;
    }
  }

  // Check squad membership
  if (pingCible.escouadeIds?.length) {
    const { data: membre } = await supabaseClient
      .from("membres_escouade")
      .select("escouade_id")
      .eq("utilisateur_id", userId)
      .maybeSingle();
    const escouadeId = (membre as { escouade_id: string } | null)?.escouade_id;
    if (escouadeId && pingCible.escouadeIds.includes(escouadeId)) return true;
  }

  // Clans require Discord API (can't check from DB) — default to eligible
  // The server action will validate the real check
  if (pingCible.clans?.length) return true;

  // If none of the above criteria matched and there are active criteria → not eligible
  const hasCriteria =
    pingCible.eleve_exorciste ||
    (pingCible.escouadeIds?.length ?? 0) > 0 ||
    (pingCible.grades?.length ?? 0) > 0 ||
    (pingCible.gradeRoles?.length ?? 0) > 0 ||
    (pingCible.gradeSecondaires?.length ?? 0) > 0 ||
    (pingCible.clans?.length ?? 0) > 0;

  return !hasCriteria;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function MissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [mission, { bySquad, solo, totalCount }, supabase] = await Promise.all([
    getMission(id),
    getMissionParticipants(id),
    createClient(),
  ]);

  if (!mission) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [registered, canManage] = await Promise.all([
    user ? isParticipant(id) : Promise.resolve(false),
    user ? canCreateMission() : Promise.resolve(false),
  ]);

  const isRestricted = !!mission.ping_cible.restreindre;
  const isEligible = user
    ? await checkEligibilityFromDB(user.id, mission.ping_cible, supabase)
    : false;

  const isCreator = user?.id === mission.createur_id;
  const isActive = mission.statut === "active";
  const canDelete = isCreator || canManage;

  const isFull =
    mission.capacite !== null && totalCount >= mission.capacite;

  const displayDate = mission.date_heure
    ? new Date(mission.date_heure).toLocaleString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const spotsLabel =
    mission.capacite === null
      ? "Illimité"
      : `${totalCount} / ${mission.capacite}`;

  const pingLabel = getPingLabel(mission.ping_cible);

  return (
    <div className="relative min-h-screen bg-[#0a0505]">
      {/* Ambient glows */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-red-700/15 blur-[120px]" />
        <div className="absolute -bottom-40 -right-16 w-[520px] h-[520px] rounded-full bg-orange-600/10 blur-[140px]" />
      </div>

      {/* Noise */}
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

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Back link */}
        <Link
          href="/missions"
          className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition mb-6"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Retour aux missions
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left column: mission info + join ─────────────────── */}
          <div className="lg:col-span-1 space-y-4">
            {/* Mission card */}
            <div className="rounded-2xl bg-white/[0.025] ring-1 ring-white/10 overflow-hidden animate-slide-up">
              {/* Color accent */}
              <div className={`h-1 w-full ${isActive ? "bg-gradient-to-r from-red-600 via-orange-400 to-red-600" : "bg-white/5"}`} />

              <div className="px-5 py-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <h1 className="text-xl font-bold text-white leading-tight">
                    {mission.titre}
                  </h1>
                  <StatusPill statut={mission.statut} />
                </div>

                {mission.synopsis && (
                  <p className="text-sm text-white/50 leading-relaxed">
                    {mission.synopsis}
                  </p>
                )}

                {/* Stats */}
                <div className="space-y-2.5 pt-1">
                  {displayDate && (
                    <div className="flex items-center gap-2.5 text-sm">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-red-400 shrink-0">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                      </svg>
                      <span className="text-white/70">{displayDate}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2.5 text-sm">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-red-400 shrink-0">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                    </svg>
                    <span className="text-white/70">
                      Participants :&nbsp;
                      <strong className="text-white">{spotsLabel}</strong>
                      {mission.capacite !== null && isFull && (
                        <span className="ml-2 text-xs text-red-400">(complet)</span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 text-sm">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-amber-400 shrink-0">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.563.563 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
                    </svg>
                    <span className="text-white/70">
                      Points :&nbsp;
                      <strong className="text-amber-300">{mission.points_recompense} pts</strong>
                      <span className="text-white/40"> / participant</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 text-sm">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-red-400 shrink-0">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                    </svg>
                    <span className="text-white/70">Ping : <strong className="text-white">{pingLabel}</strong></span>
                  </div>

                  {isRestricted && (
                    <div className="flex items-center gap-2.5 text-sm">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-amber-400 shrink-0">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                      </svg>
                      <span className="text-amber-300/80 font-medium">Inscription restreinte</span>
                    </div>
                  )}
                </div>

                <div className="pt-1 border-t border-white/[0.06]" />

                {/* Join / Leave */}
                {user ? (
                  <JoinMissionButton
                    missionId={id}
                    isRegistered={registered}
                    isFull={isFull}
                    isActive={isActive}
                    isRestricted={isRestricted}
                    isEligible={isEligible}
                    pingLabel={isRestricted ? pingLabel : undefined}
                  />
                ) : (
                  isActive && (
                    <p className="text-sm text-white/40 text-center py-2">
                      Connectez-vous pour vous inscrire.
                    </p>
                  )
                )}

                {/* Status message for non-active missions */}
                {!isActive && (
                  <div className={`rounded-lg px-3 py-2 text-xs text-center ring-1 ${
                    mission.statut === "terminee"
                      ? "bg-white/[0.03] ring-white/10 text-white/40"
                      : "bg-red-500/8 ring-red-500/20 text-red-400/70"
                  }`}>
                    {mission.statut === "terminee"
                      ? "Cette mission est terminée. Les récompenses ont été distribuées."
                      : "Cette mission a été annulée."}
                  </div>
                )}
              </div>
            </div>

            {/* Multiplier reminder card */}
            <div className="rounded-xl bg-red-950/30 ring-1 ring-red-500/20 px-4 py-3 animate-slide-up" style={{ animationDelay: '80ms' }}>
              <p className="text-xs font-semibold text-red-300 mb-2">Bonus escouade</p>
              <p className="text-[11px] text-red-200/50 mb-2">
                Chaque participant gagne {mission.points_recompense} pts personnels. Si plusieurs membres d&apos;une escouade participent, un bonus s&apos;ajoute en pts escouade :
              </p>
              <div className="space-y-1.5 text-xs text-red-200/60">
                <div className="flex items-center justify-between gap-2">
                  <span>3+ membres (ou 2+ si escouade de 3)</span>
                  <span className="font-bold text-red-300 shrink-0">+50%</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>Escouade complète</span>
                  <span className="font-bold text-purple-300 shrink-0">+100%</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>5+ membres</span>
                  <span className="font-bold text-amber-300 shrink-0">+125%</span>
                </div>
              </div>
            </div>

            {/* Creator controls (only shown to creator on active missions) */}
            {isCreator && isActive && (
              <div className="rounded-xl bg-white/[0.02] ring-1 ring-white/10 px-4 py-4 space-y-2">
                <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
                  Contrôles créateur
                </p>
                <CreatorControls missionId={id} />
              </div>
            )}

            {/* Delete button for past missions */}
            {!isActive && canDelete && (
              <div className="rounded-xl bg-white/[0.02] ring-1 ring-white/10 px-4 py-4 space-y-2">
                <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
                  Gestion
                </p>
                <DeleteMissionButton missionId={id} />
              </div>
            )}
          </div>

          {/* ── Right column: participant dashboard ──────────────── */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl bg-white/[0.02] ring-1 ring-white/10 px-5 py-5 animate-slide-up" style={{ animationDelay: '120ms' }}>
              <MissionParticipants
                bySquad={bySquad}
                solo={solo}
                totalCount={totalCount}
                basePoints={mission.points_recompense}
                isCreator={isCreator}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
