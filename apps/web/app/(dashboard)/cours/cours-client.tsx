"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CoursCreationForm from "@/components/shared/cours-creation-form";
import type { CoursRow, EscouadeOption } from "@/app/(dashboard)/cours/actions";
import { getPingLabel } from "@/app/(dashboard)/missions/mission-utils";

// ─── Types ──────────────────────────────────────────────────────────────

type Props = {
  cours: CoursRow[];
  canCreate: boolean;
  escouades: EscouadeOption[];
};

// ─── Status badge ───────────────────────────────────────────────────────

function StatusBadge({ statut }: { statut: CoursRow["statut"] }) {
  const config = {
    active: {
      label: "Actif",
      cls: "bg-purple-500/15 text-purple-400 ring-purple-500/30",
      dot: "bg-purple-400",
    },
    termine: {
      label: "Terminé",
      cls: "bg-white/5 text-white/40 ring-white/10",
      dot: "bg-white/30",
    },
    annule: {
      label: "Annulé",
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

// ─── Cours card ─────────────────────────────────────────────────────────

function CoursCard({ cours }: { cours: CoursRow }) {
  const router = useRouter();
  const displayDate = cours.date_heure
    ? new Date(cours.date_heure).toLocaleString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const spotsLabel =
    cours.capacite === null ? "Illimité" : `${cours.capacite} place${cours.capacite > 1 ? "s" : ""}`;

  const pingLabel = getPingLabel(cours.ping_cible);

  return (
    <button
      onClick={() => router.push(`/cours/${cours.id}`)}
      className={`group w-full text-left rounded-2xl ring-1 overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.995] ${
        cours.statut === "active"
          ? "bg-white/[0.025] ring-white/10 hover:ring-purple-500/30 hover:bg-white/[0.04]"
          : "bg-white/[0.015] ring-white/[0.05] opacity-60 hover:opacity-80"
      }`}
    >
      {cours.statut === "active" && (
        <div className="h-0.5 w-full bg-gradient-to-r from-purple-600 via-violet-400 to-purple-600" />
      )}

      <div className="px-5 py-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-bold text-white leading-snug group-hover:text-purple-200 transition truncate">
            {cours.titre}
          </h3>
          <StatusBadge statut={cours.statut} />
        </div>

        {cours.description && (
          <p className="text-xs text-white/50 leading-relaxed line-clamp-2">
            {cours.description}
          </p>
        )}

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
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a23.837 23.837 0 0 0-1.579-6.397l4.94-1.1 1.57 4.262a3.5 3.5 0 0 0 6.564 0L17.32 2.65l4.94 1.1a23.84 23.84 0 0 0-1.579 6.397m-15.482 0a23.837 23.837 0 0 0-.491 3.854m16.464-3.854a23.837 23.837 0 0 1 .491 3.854" />
            </svg>
            5 pts / élève · 15 pts / enseignant
          </span>
          <span className="flex items-center gap-1.5">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
            </svg>
            {pingLabel}
          </span>
        </div>
      </div>
    </button>
  );
}

// ─── Main page component ────────────────────────────────────────────────

export default function CoursPageClient({
  cours,
  canCreate,
  escouades,
}: Props) {
  const [showForm, setShowForm] = useState(false);
  const router = useRouter();

  const activeCours = cours.filter((c) => c.statut === "active");
  const pastCours = cours.filter((c) => c.statut !== "active");

  function handleCoursCreated(coursId: string) {
    setShowForm(false);
    router.push(`/cours/${coursId}`);
  }

  return (
    <>
        <div className="relative min-h-screen bg-[#0a0505] overflow-hidden">
        {/* Ambient glows */}
        <div aria-hidden className="pointer-events-none fixed inset-0 z-0 select-none">
          <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-purple-700/15 blur-[120px]" />
          <div className="absolute -bottom-40 -right-16 w-[520px] h-[520px] rounded-full bg-violet-600/10 blur-[140px]" />
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
                <span className="bg-gradient-to-r from-purple-400 to-violet-300 bg-clip-text text-transparent">
                  Cours
                </span>
              </h1>
              <p className="text-sm text-white/40 mt-1">
                {activeCours.length} cours actif{activeCours.length !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {canCreate && (
                <button
                  onClick={() => setShowForm(true)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-sm font-semibold text-white transition shadow-lg shadow-purple-900/30"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Nouveau cours
                </button>
              )}
            </div>
          </div>

          {/* Active cours */}
          {activeCours.length > 0 ? (
            <section className="space-y-3 stagger-children">
              {activeCours.map((c) => (
                <CoursCard key={c.id} cours={c} />
              ))}
            </section>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="relative mx-auto mb-6">
                <div className="absolute inset-0 rounded-2xl bg-purple-500/10 blur-2xl scale-150" />
                <div className="relative w-16 h-16 rounded-2xl bg-white/[0.03] ring-1 ring-white/10 flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="w-8 h-8 text-purple-400/60">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a23.837 23.837 0 0 0-1.579-6.397l4.94-1.1 1.57 4.262a3.5 3.5 0 0 0 6.564 0L17.32 2.65l4.94 1.1a23.84 23.84 0 0 0-1.579 6.397m-15.482 0a23.837 23.837 0 0 0-.491 3.854m16.464-3.854a23.837 23.837 0 0 1 .491 3.854" />
                  </svg>
                </div>
              </div>
              <p className="text-white/50 text-sm">Aucun cours actif pour le moment.</p>
              {canCreate && (
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-4 text-sm text-purple-400 hover:text-purple-300 transition underline underline-offset-4"
                >
                  Créer le premier cours
                </button>
              )}
            </div>
          )}

          {/* Past cours */}
          {pastCours.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-white/40 uppercase tracking-wider animate-slide-up">
                Cours passés
              </h2>
              <div className="space-y-3 stagger-children">
                {pastCours.map((c) => (
                  <CoursCard key={c.id} cours={c} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Creation modal */}
      {showForm && (
        <CoursCreationForm
          escouades={escouades}
          onClose={() => setShowForm(false)}
          onSuccess={handleCoursCreated}
        />
      )}
    </>
  );
}
