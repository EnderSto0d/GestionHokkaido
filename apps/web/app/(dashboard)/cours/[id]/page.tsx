import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  getCoursById,
  getCoursParticipants,
  isCoursParticipant,
  canCreateCours,
} from "../actions";
import { getPingLabel } from "@/app/(dashboard)/missions/mission-utils";
import { CoursJoinButton, CoursCreatorControls, CoursDeleteButton, EditCoursButton } from "./cours-controls";
import CoursAttendance from "./cours-attendance";

// ─── Metadata ─────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const cours = await getCoursById(id);
  return {
    title: cours ? `${cours.titre} — Cours` : "Cours introuvable",
  };
}

// ─── Status pill ──────────────────────────────────────────────────────────────

function StatusPill({ statut }: { statut: "active" | "termine" | "annule" }) {
  const cfg = {
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
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ring-1 ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CoursDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [cours, participants, supabase] = await Promise.all([
    getCoursById(id),
    getCoursParticipants(id),
    createClient(),
  ]);

  if (!cours) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [registered, canManage] = await Promise.all([
    user ? isCoursParticipant(id) : Promise.resolve(false),
    user ? canCreateCours() : Promise.resolve(false),
  ]);

  const isCreator = user?.id === cours.createur_id;
  const isActive = cours.statut === "active";
  const canDelete = isCreator || canManage;
  const isFull = cours.capacite !== null && participants.length >= cours.capacite;

  const presentCount = participants.filter((p) => p.present).length;

  const displayDate = cours.date_heure
    ? new Date(cours.date_heure).toLocaleString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  const spotsLabel =
    cours.capacite === null
      ? "Illimité"
      : `${participants.length} / ${cours.capacite}`;

  const pingLabel = getPingLabel(cours.ping_cible);

  // Vérifier si le user est admin/prof
  let isAdminOrProf = false;
  if (user) {
    const { data: caller } = await supabase
      .from("utilisateurs")
      .select("role")
      .eq("id", user.id)
      .single();
    const callerRole = (caller as { role: string } | null)?.role;
    isAdminOrProf = callerRole === "admin" || callerRole === "professeur";
  }
  const canDoAppel = isCreator || isAdminOrProf;

  return (
    <div className="relative min-h-screen bg-[#0a0505]">
      {/* Ambient glows */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-purple-700/15 blur-[120px]" />
        <div className="absolute -bottom-40 -right-16 w-[520px] h-[520px] rounded-full bg-violet-600/10 blur-[140px]" />
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
          href="/cours"
          className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition mb-6"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Retour aux cours
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left column: cours info + join ──────────────────── */}
          <div className="lg:col-span-1 space-y-4">
            <div className="rounded-2xl bg-white/[0.025] ring-1 ring-white/10 overflow-hidden animate-slide-up">
              <div className={`h-1 w-full ${isActive ? "bg-gradient-to-r from-purple-600 via-violet-400 to-purple-600" : "bg-white/5"}`} />

              <div className="px-5 py-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <h1 className="text-xl font-bold text-white leading-tight">
                    {cours.titre}
                  </h1>
                  <StatusPill statut={cours.statut} />
                </div>

                {cours.description && (
                  <p className="text-sm text-white/50 leading-relaxed">
                    {cours.description}
                  </p>
                )}

                <div className="space-y-2.5 pt-1">
                  {displayDate && (
                    <div className="flex items-center gap-2.5 text-sm">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-purple-400 shrink-0">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                      </svg>
                      <span className="text-white/70">{displayDate}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2.5 text-sm">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-purple-400 shrink-0">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
                    </svg>
                    <span className="text-white/70">
                      Inscrits :&nbsp;
                      <strong className="text-white">{spotsLabel}</strong>
                      {isFull && (
                        <span className="ml-2 text-xs text-red-400">(complet)</span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 text-sm">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-violet-400 shrink-0">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a23.837 23.837 0 0 0-1.579-6.397l4.94-1.1 1.57 4.262a3.5 3.5 0 0 0 6.564 0L17.32 2.65l4.94 1.1a23.84 23.84 0 0 0-1.579 6.397m-15.482 0a23.837 23.837 0 0 0-.491 3.854m16.464-3.854a23.837 23.837 0 0 1 .491 3.854" />
                    </svg>
                    <span className="text-white/70">
                      Élèves : <strong className="text-violet-300">5 pts</strong>
                      <span className="text-white/30 mx-1">·</span>
                      Enseignant : <strong className="text-violet-300">15 pts</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5 text-sm">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-purple-400 shrink-0">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
                    </svg>
                    <span className="text-white/70">Ping : <strong className="text-white">{pingLabel}</strong></span>
                  </div>

                  <div className="flex items-center gap-2.5 text-sm">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-amber-400 shrink-0">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                    <span className="text-amber-300/80 text-xs">Min. 5 présents pour valider</span>
                  </div>
                </div>

                <div className="pt-1 border-t border-white/[0.06]" />

                {/* Join / Leave */}
                {user ? (
                  <CoursJoinButton
                    coursId={id}
                    isRegistered={registered}
                    isFull={isFull}
                    isActive={isActive}
                  />
                ) : (
                  isActive && (
                    <p className="text-sm text-white/40 text-center py-2">
                      Connectez-vous pour vous inscrire.
                    </p>
                  )
                )}

                {!isActive && (
                  <div className={`rounded-lg px-3 py-2 text-xs text-center ring-1 ${
                    cours.statut === "termine"
                      ? "bg-white/[0.03] ring-white/10 text-white/40"
                      : "bg-red-500/8 ring-red-500/20 text-red-400/70"
                  }`}>
                    {cours.statut === "termine"
                      ? "Ce cours est terminé. Les points ont été distribués."
                      : "Ce cours a été annulé."}
                  </div>
                )}
              </div>
            </div>

            {/* Info card */}
            <div className="rounded-xl bg-purple-950/30 ring-1 ring-purple-500/20 px-4 py-3 animate-slide-up" style={{ animationDelay: "80ms" }}>
              <p className="text-xs font-semibold text-purple-300 mb-2">Comment ça marche ?</p>
              <div className="space-y-1.5 text-xs text-purple-200/60">
                <p>1. Inscrivez-vous au cours</p>
                <p>2. L&apos;enseignant fait l&apos;appel des présents</p>
                <p>3. Minimum <strong className="text-purple-300">5 présents</strong> pour valider</p>
                <p>4. Chaque présent reçoit <strong className="text-purple-300">5 pts perso</strong></p>
                <p>5. L&apos;enseignant reçoit <strong className="text-purple-300">15 pts perso</strong></p>
                <p className="text-purple-400/50 italic">Aucun bonus d&apos;escouade ne s&apos;applique.</p>
              </div>
            </div>

            {/* Creator controls */}
            {(isCreator || isAdminOrProf) && isActive && (
              <div className="rounded-xl bg-white/[0.02] ring-1 ring-white/10 px-4 py-4 space-y-2">
                <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
                  Contrôles enseignant
                </p>
                <EditCoursButton cours={cours} />
                <CoursCreatorControls coursId={id} presentCount={presentCount} />
              </div>
            )}

            {/* Delete button */}
            {!isActive && canDelete && (
              <div className="rounded-xl bg-white/[0.02] ring-1 ring-white/10 px-4 py-4 space-y-2">
                <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-3">
                  Gestion
                </p>
                <CoursDeleteButton coursId={id} />
              </div>
            )}
          </div>

          {/* ── Right column: attendance dashboard ──────────────── */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl bg-white/[0.02] ring-1 ring-white/10 px-5 py-5 animate-slide-up" style={{ animationDelay: "120ms" }}>
              <CoursAttendance
                coursId={id}
                participants={participants}
                canDoAppel={canDoAppel}
                isActive={isActive}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
