"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MissionCreationForm from "@/components/shared/mission-creation-form";
import type { MissionRow, EscouadeOption } from "@/app/(dashboard)/missions/actions";
import { getPingLabel } from "@/app/(dashboard)/missions/mission-utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  missions: MissionRow[];
  canCreate: boolean;
  canViewHistory: boolean;
  escouades: EscouadeOption[];
};

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ statut }: { statut: MissionRow["statut"] }) {
  const config = {
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
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ${config.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

// ─── Mission card ─────────────────────────────────────────────────────────────

function MissionCard({ mission }: { mission: MissionRow }) {
  const router = useRouter();
  const displayDate = mission.date_heure
    ? new Date(mission.date_heure).toLocaleString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const spotsLabel =
    mission.capacite === null ? "Illimité" : `${mission.capacite} place${mission.capacite > 1 ? "s" : ""}`;

  const pingLabel = getPingLabel(mission.ping_cible);

  return (
    <button
      onClick={() => router.push(`/missions/${mission.id}`)}
      className={`group w-full text-left rounded-2xl ring-1 overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.995] ${
        mission.statut === "active"
          ? "bg-white/[0.025] ring-white/10 hover:ring-red-500/30 hover:bg-white/[0.04]"
          : "bg-white/[0.015] ring-white/[0.05] opacity-60 hover:opacity-80"
      }`}
    >
      {/* Top accent bar for active missions */}
      {mission.statut === "active" && (
        <div className="h-0.5 w-full bg-gradient-to-r from-red-600 via-orange-400 to-red-600" />
      )}

      <div className="px-5 py-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-bold text-white leading-snug group-hover:text-red-200 transition truncate">
            {mission.titre}
          </h3>
          <StatusBadge statut={mission.statut} />
        </div>

        {/* Synopsis */}
        {mission.synopsis && (
          <p className="text-xs text-white/50 leading-relaxed line-clamp-2">
            {mission.synopsis}
          </p>
        )}

        {/* Stats row */}
        <div className="flex flex-wrap gap-3 text-xs text-white/50">
          {displayDate && (
            <span className="flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
              {displayDate}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
            </svg>
            {spotsLabel}
          </span>
          <span className="flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.563.563 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
            </svg>
            {mission.points_recompense} pts / pers.
          </span>
          <span className="flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
            </svg>
            {pingLabel}
          </span>
          {mission.ping_cible.restreindre && (
            <span className="flex items-center gap-1 text-amber-400/70">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3 h-3 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
              </svg>
              Restreinte
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── Main page component ──────────────────────────────────────────────────────

export default function MissionsPageClient({
  missions,
  canCreate,
  canViewHistory,
  escouades,
}: Props) {
  const [showForm, setShowForm] = useState(false);
  const router = useRouter();

  const activeMissions = missions.filter((m) => m.statut === "active");
  const pastMissions = missions.filter((m) => m.statut !== "active");

  function handleMissionCreated(missionId: string) {
    setShowForm(false);
    router.push(`/missions/${missionId}`);
  }

  return (
    <>
      <div className="relative min-h-screen bg-[#0a0505] overflow-hidden">
        {/* Ambient glows */}
        <div aria-hidden className="pointer-events-none fixed inset-0 z-0 select-none">
          <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-red-700/15 blur-[120px]" />
          <div className="absolute -bottom-40 -right-16 w-[520px] h-[520px] rounded-full bg-orange-600/10 blur-[140px]" />
        </div>

        {/* Noise texture */}
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

        {/* Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
          {/* Header */}
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">
                <span className="bg-gradient-to-r from-red-400 to-orange-300 bg-clip-text text-transparent">
                  Missions
                </span>
              </h1>
              <p className="text-sm text-white/40 mt-1">
                {activeMissions.length} mission{activeMissions.length !== 1 ? "s" : ""} active{activeMissions.length !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {canViewHistory && (
                <Link
                  href="/missions/historique"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] ring-1 ring-white/10 text-sm font-semibold text-white/70 hover:text-white transition"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  Historique
                </Link>
              )}
              {canCreate && (
                <button
                  onClick={() => setShowForm(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-sm font-semibold text-white transition shadow-lg shadow-red-900/30"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Nouvelle mission
                </button>
              )}
            </div>
          </div>

          {/* Active missions */}
          {activeMissions.length > 0 ? (
            <section className="space-y-3 stagger-children">
              {activeMissions.map((m) => (
                <MissionCard key={m.id} mission={m} />
              ))}
            </section>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="relative mx-auto mb-6">
                <div className="absolute inset-0 rounded-2xl bg-red-500/10 blur-2xl scale-150" />
                <div className="relative w-16 h-16 rounded-2xl bg-white/[0.03] ring-1 ring-white/10 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="w-8 h-8 text-red-400/60">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17 17.25 21A2.652 2.652 0 0 0 21 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 1 1-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 0 0 4.486-6.336l-3.276 3.277a3.004 3.004 0 0 1-2.25-2.25l3.276-3.276a4.5 4.5 0 0 0-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437 1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008Z" />
                  </svg>
                </div>
              </div>
              <p className="text-white/50 text-sm">Aucune mission active pour le moment.</p>
              {canCreate && (
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-4 text-sm text-red-400 hover:text-red-300 transition underline underline-offset-4"
                >
                  Créer la première mission
                </button>
              )}
            </div>
          )}

          {/* Past missions */}
          {pastMissions.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-white/40 uppercase tracking-wider animate-slide-up">
                Missions passées
              </h2>
              <div className="space-y-3 stagger-children">
                {pastMissions.map((m) => (
                  <MissionCard key={m.id} mission={m} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Creation modal */}
      {showForm && (
        <MissionCreationForm
          escouades={escouades}
          onClose={() => setShowForm(false)}
          onSuccess={handleMissionCreated}
        />
      )}
    </>
  );
}
