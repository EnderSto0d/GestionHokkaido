"use client";

import { useState, useTransition } from "react";
import {
  nommerMembreBureau,
  revoquerMembreBureau,
  designerChefBureau,
  lancerElectionBureau,
  voterBureau,
  cloturerElectionBureau,
  annulerElectionBureau,
} from "@/app/(dashboard)/bureau/actions";
import type {
  BureauMembre,
  BureauElection,
  BureauCandidatVotes,
} from "@/app/(dashboard)/bureau/actions";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BureauClientProps {
  membres: BureauMembre[];
  election: BureauElection | null;
  electionResults: BureauCandidatVotes[];
  myVote: string | null;
  candidats: { id: string; pseudo: string; avatar_url: string | null }[];
  isDirector: boolean;
  isBureauMember: boolean;
  userId: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Avatar({
  avatarUrl,
  pseudo,
  size = "md",
}: {
  avatarUrl: string | null;
  pseudo: string;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-12 h-12 text-base",
  };
  return (
    <div
      className={`relative flex-shrink-0 rounded-full overflow-hidden bg-violet-500/20 ring-2 ring-violet-500/30 flex items-center justify-center ${sizeClasses[size]}`}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt={pseudo} className="object-cover w-full h-full" />
      ) : (
        <span className="font-bold text-violet-300 uppercase">
          {pseudo.charAt(0)}
        </span>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin w-4 h-4 text-white/40"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

// ─── Seat Card ────────────────────────────────────────────────────────────────

function FilledSeatCard({
  membre,
  isDirector,
  onRevoke,
  onDesignateChef,
  isRevoking,
  isDesignating,
  confirmRevoke,
  setConfirmRevoke,
}: {
  membre: BureauMembre;
  isDirector: boolean;
  onRevoke: (id: string) => void;
  onDesignateChef: (id: string) => void;
  isRevoking: boolean;
  isDesignating: boolean;
  confirmRevoke: string | null;
  setConfirmRevoke: (id: string | null) => void;
}) {
  const isElu = membre.type_siege === "elu";

  return (
    <div
      className={`relative rounded-2xl bg-white/[0.03] ring-1 transition-all duration-200 p-5 ${
        isElu
          ? "ring-amber-500/20 hover:ring-amber-500/30"
          : "ring-white/10 hover:ring-violet-500/30"
      }`}
    >
      {/* Top border */}
      <div
        className={`h-px w-full mb-4 bg-gradient-to-r ${
          isElu
            ? "from-amber-500/0 via-amber-500/50 to-amber-500/0"
            : "from-violet-500/0 via-violet-500/40 to-violet-500/0"
        }`}
      />

      {/* Member info */}
      <div className="flex items-start gap-3">
        <Avatar avatarUrl={membre.avatar_url} pseudo={membre.pseudo} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-white truncate">
              {membre.pseudo}
            </p>
            {membre.est_chef && (
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-400/20 text-amber-300 ring-1 ring-amber-400/30">
                Chef du Conseil des 5
              </span>
            )}
          </div>
          {membre.grade_role && (
            <p className="text-[11px] text-white/35 mt-0.5">{membre.grade_role}</p>
          )}
          <div className="flex items-center gap-1.5 mt-1.5">
            <span
              className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ring-1 ${
                isElu
                  ? "bg-amber-500/15 text-amber-300 ring-amber-500/25"
                  : "bg-violet-500/15 text-violet-300 ring-violet-500/25"
              }`}
            >
              {isElu ? "Élu" : "Nommé"}
            </span>
          </div>
        </div>
      </div>

      {/* Director actions */}
      {isDirector && (
        <div className="mt-4 pt-3 border-t border-white/[0.05] flex items-center gap-2 flex-wrap">
          {/* Designate as chief (only if not already chief) */}
          {!membre.est_chef && (
            <button
              onClick={() => onDesignateChef(membre.id)}
              disabled={isDesignating}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20 hover:bg-amber-500/15 hover:ring-amber-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDesignating ? <Spinner /> : (
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                  <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" clipRule="evenodd" />
                </svg>
              )}
              Désigner Chef
            </button>
          )}
          {/* Revoke — two-click confirm */}
          {confirmRevoke === membre.id ? (
            <button
              onClick={() => onRevoke(membre.id)}
              disabled={isRevoking}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 text-red-300 ring-1 ring-red-500/30 hover:bg-red-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRevoking ? <Spinner /> : null}
              Confirmer la révocation ?
            </button>
          ) : (
            <button
              onClick={() => {
                setConfirmRevoke(membre.id);
                setTimeout(() => setConfirmRevoke(null), 4000);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.04] text-white/40 ring-1 ring-white/10 hover:bg-red-500/10 hover:text-red-400 hover:ring-red-500/20 transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
              </svg>
              Révoquer
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function EmptySeatCard({ isElu }: { isElu?: boolean }) {
  return (
    <div
      className={`rounded-2xl border-2 border-dashed p-5 flex flex-col items-center justify-center min-h-[140px] gap-2 ${
        isElu ? "border-amber-500/15" : "border-white/[0.07]"
      }`}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isElu ? "bg-amber-500/10" : "bg-white/[0.03]"}`}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 ${isElu ? "text-amber-500/30" : "text-white/15"}`}>
          <path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 0 0-13.074.003Z" />
        </svg>
      </div>
      <p className={`text-xs font-medium ${isElu ? "text-amber-500/30" : "text-white/20"}`}>
        {isElu ? "Siège élu vacant" : "Siège vacant"}
      </p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function BureauClient({
  membres,
  election,
  electionResults,
  myVote,
  candidats,
  isDirector,
  isBureauMember: _isBureauMember,
  userId: _userId,
}: BureauClientProps) {
  // ── State ──────────────────────────────────────────────────────────────
  const [isPending, startTransition] = useTransition();

  // Director panel state
  const [showNominate, setShowNominate] = useState(false);
  const [nominateSearch, setNominateSearch] = useState("");
  const [nominateFeedback, setNominateFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Revoke confirm state
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);
  const [revokeFeedback, setRevokeFeedback] = useState<{
    id: string;
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Chef designation state
  const [designatePending, setDesignatePending] = useState<string | null>(null);
  const [designateFeedback, setDesignateFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Election state
  const [launchElectionPending, setLaunchElectionPending] = useState(false);
  const [launchElectionFeedback, setLaunchElectionFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [confirmCancelElection, setConfirmCancelElection] = useState(false);
  const [electionActionFeedback, setElectionActionFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Vote state
  const [votePending, setVotePending] = useState<string | null>(null);
  const [voteFeedback, setVoteFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // ── Computed ───────────────────────────────────────────────────────────
  const nommeMembers = membres.filter((m) => m.type_siege === "nomme");
  const eluMember = membres.find((m) => m.type_siege === "elu") ?? null;
  const nommeSlotsFilled = nommeMembers.length;
  const nommeSlotsFree = 4 - nommeSlotsFilled;
  const hasActiveElection = election !== null && election.statut === "en_cours";
  const canLaunchElection = isDirector && !hasActiveElection && eluMember === null;

  const filteredCandidats = nominateSearch.trim()
    ? candidats.filter((c) =>
        c.pseudo.toLowerCase().includes(nominateSearch.toLowerCase())
      )
    : candidats.slice(0, 8);

  const totalVotes = electionResults.reduce((acc, c) => acc + c.nb_votes, 0);

  // ── Handlers ───────────────────────────────────────────────────────────

  function handleNominate(userId: string) {
    startTransition(async () => {
      setNominateFeedback(null);
      const result = await nommerMembreBureau(userId);
      if (result.success) {
        setNominateFeedback({
          type: "success",
          message: "Membre nommé avec succès.",
        });
        setShowNominate(false);
        setNominateSearch("");
      } else {
        setNominateFeedback({
          type: "error",
          message: result.error,
        });
      }
    });
  }

  function handleRevoke(membreId: string) {
    startTransition(async () => {
      setRevokeFeedback(null);
      const result = await revoquerMembreBureau(membreId);
      setConfirmRevoke(null);
      if (result.success) {
        setRevokeFeedback({
          id: membreId,
          type: "success",
          message: "Membre révoqué avec succès.",
        });
      } else {
        setRevokeFeedback({
          id: membreId,
          type: "error",
          message: result.error,
        });
      }
    });
  }

  function handleDesignateChef(membreId: string) {
    setDesignatePending(membreId);
    startTransition(async () => {
      setDesignateFeedback(null);
      const result = await designerChefBureau(membreId);
      setDesignatePending(null);
      if (result.success) {
        setDesignateFeedback({
          type: "success",
          message: "Chef du Conseil des 5 désigné avec succès.",
        });
      } else {
        setDesignateFeedback({
          type: "error",
          message: result.error,
        });
      }
    });
  }

  function handleLaunchElection() {
    setLaunchElectionPending(true);
    startTransition(async () => {
      setLaunchElectionFeedback(null);
      const result = await lancerElectionBureau();
      setLaunchElectionPending(false);
      if (result.success) {
        setLaunchElectionFeedback({
          type: "success",
          message: "Élection lancée avec succès.",
        });
      } else {
        setLaunchElectionFeedback({
          type: "error",
          message: result.error,
        });
      }
    });
  }

  function handleCloseElection() {
    if (!election) return;
    startTransition(async () => {
      setElectionActionFeedback(null);
      const result = await cloturerElectionBureau(election.id);
      if (result.success) {
        setElectionActionFeedback({
          type: "success",
          message: "Élection clôturée. Le gagnant a été ajouté au Conseil des 5.",
        });
      } else {
        setElectionActionFeedback({
          type: "error",
          message: result.error,
        });
      }
    });
  }

  function handleCancelElection() {
    if (!election) return;
    if (!confirmCancelElection) {
      setConfirmCancelElection(true);
      setTimeout(() => setConfirmCancelElection(false), 4000);
      return;
    }
    setConfirmCancelElection(false);
    startTransition(async () => {
      setElectionActionFeedback(null);
      const result = await annulerElectionBureau(election.id);
      if (result.success) {
        setElectionActionFeedback({
          type: "success",
          message: "Élection annulée.",
        });
      } else {
        setElectionActionFeedback({
          type: "error",
          message: result.error,
        });
      }
    });
  }

  function handleVote(candidatId: string) {
    if (!election || myVote !== null) return;
    setVotePending(candidatId);
    startTransition(async () => {
      setVoteFeedback(null);
      const result = await voterBureau(election.id, candidatId);
      setVotePending(null);
      if (result.success) {
        setVoteFeedback({
          type: "success",
          message: "Votre vote a été enregistré.",
        });
      } else {
        setVoteFeedback({
          type: "error",
          message: result.error,
        });
      }
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* ── Section 1: Supervision banner ─────────────────────────────── */}
      <div className="rounded-2xl bg-white/[0.02] ring-1 ring-white/[0.06] px-5 py-3.5 flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600/20 to-indigo-700/15 ring-1 ring-white/10 flex-shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-violet-400/70">
            <path fillRule="evenodd" d="M9.661 2.237a.531.531 0 0 1 .678 0 11.947 11.947 0 0 0 7.078 2.749.5.5 0 0 1 .479.425c.069.52.104 1.05.104 1.589 0 5.162-3.26 9.563-7.834 11.256a.48.48 0 0 1-.332 0C5.26 16.564 2 12.163 2 7c0-.538.035-1.069.104-1.589a.5.5 0 0 1 .48-.425 11.947 11.947 0 0 0 7.077-2.749Z" clipRule="evenodd" />
          </svg>
        </div>
        <p className="text-xs text-white/40 leading-relaxed">
          Sous la supervision du{" "}
          <span className="text-violet-400/70 font-medium">Directeur</span>
          {" "}et du{" "}
          <span className="text-violet-400/70 font-medium">Co-Directeur</span>
          {" "}— qui n&apos;en sont pas membres mais en sont les têtes tutélaires.
        </p>
      </div>

      {/* ── Section 2: Les 5 Sièges ───────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white/80">Les 5 Sièges du Conseil des 5</h2>
          <div className="flex items-center gap-3 text-xs text-white/30">
            <span>
              <span className="text-violet-400/70 font-medium">{nommeSlotsFilled}</span>/4 nommés
            </span>
            <span>
              <span className="text-amber-400/70 font-medium">{eluMember ? 1 : 0}</span>/1 élu
            </span>
          </div>
        </div>

        {/* Global feedback for revoke / designate */}
        {revokeFeedback && (
          <div
            className={`px-4 py-2.5 rounded-xl text-xs font-medium ring-1 ${
              revokeFeedback.type === "success"
                ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20"
                : "bg-red-500/10 text-red-300 ring-red-500/20"
            }`}
          >
            {revokeFeedback.message}
          </div>
        )}
        {designateFeedback && (
          <div
            className={`px-4 py-2.5 rounded-xl text-xs font-medium ring-1 ${
              designateFeedback.type === "success"
                ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20"
                : "bg-red-500/10 text-red-300 ring-red-500/20"
            }`}
          >
            {designateFeedback.message}
          </div>
        )}

        {/* 4 Nominated seats */}
        <div>
          <p className="text-[10px] text-white/25 uppercase tracking-widest mb-3 font-medium">
            Sièges Nommés
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {nommeMembers.map((m) => (
              <FilledSeatCard
                key={m.id}
                membre={m}
                isDirector={isDirector}
                onRevoke={handleRevoke}
                onDesignateChef={handleDesignateChef}
                isRevoking={isPending && confirmRevoke === m.id}
                isDesignating={isPending && designatePending === m.id}
                confirmRevoke={confirmRevoke}
                setConfirmRevoke={setConfirmRevoke}
              />
            ))}
            {Array.from({ length: nommeSlotsFree }).map((_, i) => (
              <EmptySeatCard key={`empty-nomme-${i}`} isElu={false} />
            ))}
          </div>
        </div>

        {/* 1 Elected seat */}
        <div>
          <p className="text-[10px] text-amber-500/40 uppercase tracking-widest mb-3 font-medium">
            Siège Élu
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {eluMember ? (
              <FilledSeatCard
                membre={eluMember}
                isDirector={isDirector}
                onRevoke={handleRevoke}
                onDesignateChef={handleDesignateChef}
                isRevoking={isPending && confirmRevoke === eluMember.id}
                isDesignating={isPending && designatePending === eluMember.id}
                confirmRevoke={confirmRevoke}
                setConfirmRevoke={setConfirmRevoke}
              />
            ) : (
              <EmptySeatCard isElu />
            )}
          </div>
        </div>
      </div>

      {/* ── Section 3: Director Panel ─────────────────────────────────── */}
      {isDirector && (
        <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 overflow-hidden">
          <div className="h-px w-full bg-gradient-to-r from-violet-500/0 via-violet-500/60 to-violet-500/0" />
          <div className="p-5">
            <div className="flex items-center gap-3 mb-5">
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 rounded-xl bg-violet-500/20 blur-md" />
                <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600/30 to-indigo-700/20 ring-1 ring-white/10">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-violet-400">
                    <path fillRule="evenodd" d="M9.661 2.237a.531.531 0 0 1 .678 0 11.947 11.947 0 0 0 7.078 2.749.5.5 0 0 1 .479.425c.069.52.104 1.05.104 1.589 0 5.162-3.26 9.563-7.834 11.256a.48.48 0 0 1-.332 0C5.26 16.564 2 12.163 2 7c0-.538.035-1.069.104-1.589a.5.5 0 0 1 .48-.425 11.947 11.947 0 0 0 7.077-2.749Z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Gestion du Conseil des 5</h3>
                <p className="text-xs text-white/35">Actions réservées au Directeur et Co-Directeur</p>
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-violet-500/30 via-white/10 to-transparent mb-5" />

            <div className="space-y-4">
              {/* Nominate section */}
              {nommeSlotsFilled < 4 && (
                <div>
                  <button
                    onClick={() => {
                      setShowNominate((v) => !v);
                      setNominateFeedback(null);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-violet-600/15 text-violet-300 ring-1 ring-violet-500/25 hover:bg-violet-600/20 hover:ring-violet-500/35 transition-all"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                    </svg>
                    Nommer un membre ({4 - nommeSlotsFilled} siège{4 - nommeSlotsFilled > 1 ? "s" : ""} disponible{4 - nommeSlotsFilled > 1 ? "s" : ""})
                  </button>

                  {showNominate && (
                    <div className="mt-3 rounded-xl bg-white/[0.03] ring-1 ring-white/[0.06] p-4">
                      <p className="text-xs text-white/40 mb-3">
                        Recherchez un utilisateur à nommer au Conseil des 5 :
                      </p>
                      <div className="relative mb-3">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white/25">
                            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <input
                          type="text"
                          placeholder="Nom d'utilisateur..."
                          value={nominateSearch}
                          onChange={(e) => setNominateSearch(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 bg-white/[0.04] ring-1 ring-white/[0.08] rounded-xl text-sm text-white/80 placeholder:text-white/25 focus:outline-none focus:ring-violet-500/30 transition-all"
                        />
                      </div>

                      {nominateFeedback && (
                        <div
                          className={`mb-3 px-3 py-2 rounded-lg text-xs font-medium ring-1 ${
                            nominateFeedback.type === "success"
                              ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20"
                              : "bg-red-500/10 text-red-300 ring-red-500/20"
                          }`}
                        >
                          {nominateFeedback.message}
                        </div>
                      )}

                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {filteredCandidats.length === 0 ? (
                          <p className="text-xs text-white/25 text-center py-4">
                            {nominateSearch
                              ? "Aucun utilisateur trouvé."
                              : "Tous les utilisateurs sont déjà membres du Conseil des 5."}
                          </p>
                        ) : (
                          filteredCandidats.map((c) => (
                            <button
                              key={c.id}
                              onClick={() => handleNominate(c.id)}
                              disabled={isPending}
                              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/[0.05] transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed group"
                            >
                              <Avatar
                                avatarUrl={c.avatar_url}
                                pseudo={c.pseudo}
                                size="sm"
                              />
                              <span className="text-sm text-white/60 group-hover:text-white/80 transition-colors truncate">
                                {c.pseudo}
                              </span>
                              {isPending ? (
                                <Spinner />
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white/20 group-hover:text-violet-400 transition-colors ml-auto flex-shrink-0">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.25a.75.75 0 0 0-1.5 0v2.5h-2.5a.75.75 0 0 0 0 1.5h2.5v2.5a.75.75 0 0 0 1.5 0v-2.5h2.5a.75.75 0 0 0 0-1.5h-2.5v-2.5Z" clipRule="evenodd" />
                                </svg>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Launch election */}
              {canLaunchElection && (
                <div>
                  <button
                    onClick={handleLaunchElection}
                    disabled={launchElectionPending || isPending}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/20 hover:bg-amber-500/15 hover:ring-amber-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {launchElectionPending ? <Spinner /> : (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-11.25a.75.75 0 0 0-1.5 0v2.5h-2.5a.75.75 0 0 0 0 1.5h2.5v2.5a.75.75 0 0 0 1.5 0v-2.5h2.5a.75.75 0 0 0 0-1.5h-2.5v-2.5Z" clipRule="evenodd" />
                      </svg>
                    )}
                    Lancer une élection populaire
                  </button>
                  {launchElectionFeedback && (
                    <div
                      className={`mt-2 px-3 py-2 rounded-lg text-xs font-medium ring-1 ${
                        launchElectionFeedback.type === "success"
                          ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20"
                          : "bg-red-500/10 text-red-300 ring-red-500/20"
                      }`}
                    >
                      {launchElectionFeedback.message}
                    </div>
                  )}
                </div>
              )}

              {/* Election controls if active */}
              {hasActiveElection && election && (
                <div className="space-y-3">
                  <div className="h-px bg-gradient-to-r from-amber-500/20 via-white/[0.05] to-transparent" />
                  <p className="text-xs text-amber-400/60 font-medium uppercase tracking-wider">
                    Contrôles de l&apos;élection en cours
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={handleCloseElection}
                      disabled={isPending}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20 hover:bg-emerald-500/15 hover:ring-emerald-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isPending ? <Spinner /> : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                        </svg>
                      )}
                      Clôturer l&apos;élection
                    </button>

                    {confirmCancelElection ? (
                      <button
                        onClick={handleCancelElection}
                        disabled={isPending}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-red-500/20 text-red-300 ring-1 ring-red-500/30 hover:bg-red-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isPending ? <Spinner /> : null}
                        Confirmer l&apos;annulation ?
                      </button>
                    ) : (
                      <button
                        onClick={handleCancelElection}
                        disabled={isPending}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-white/[0.04] text-white/40 ring-1 ring-white/10 hover:bg-red-500/10 hover:text-red-400 hover:ring-red-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Annuler l&apos;élection
                      </button>
                    )}
                  </div>
                  {electionActionFeedback && (
                    <div
                      className={`px-3 py-2 rounded-lg text-xs font-medium ring-1 ${
                        electionActionFeedback.type === "success"
                          ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20"
                          : "bg-red-500/10 text-red-300 ring-red-500/20"
                      }`}
                    >
                      {electionActionFeedback.message}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Section 4: Election en cours ──────────────────────────────── */}
      {hasActiveElection && election && (
        <div className="rounded-2xl bg-white/[0.03] ring-1 ring-amber-500/20 overflow-hidden">
          <div className="h-px w-full bg-gradient-to-r from-amber-500/0 via-amber-500/50 to-amber-500/0" />
          <div className="p-5">
            {/* Header */}
            <div className="flex items-start gap-3 mb-5">
              <div className="relative flex-shrink-0 mt-0.5">
                <div className="absolute inset-0 rounded-xl bg-amber-500/20 blur-md" />
                <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-600/10 ring-1 ring-amber-500/20">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-amber-400">
                    <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Élection en cours — Siège du Peuple
                </h3>
                <p className="text-xs text-white/40 mt-0.5">
                  Votez pour le membre de votre choix. Un seul vote autorisé.
                </p>
                {myVote !== null && (
                  <p className="text-xs text-amber-400/80 mt-1.5 font-medium">
                    Vous avez voté pour{" "}
                    <span className="text-amber-300">
                      {electionResults.find((c) => c.utilisateur_id === myVote)?.pseudo ?? "un candidat"}
                    </span>
                    .
                  </p>
                )}
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-amber-500/20 via-white/[0.05] to-transparent mb-5" />

            {/* Vote feedback */}
            {voteFeedback && (
              <div
                className={`mb-4 px-3 py-2 rounded-lg text-xs font-medium ring-1 ${
                  voteFeedback.type === "success"
                    ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20"
                    : "bg-red-500/10 text-red-300 ring-red-500/20"
                }`}
              >
                {voteFeedback.message}
              </div>
            )}

            {/* Total votes */}
            <p className="text-xs text-white/30 mb-4">
              <span className="text-white/50 font-medium">{totalVotes}</span>{" "}
              vote{totalVotes !== 1 ? "s" : ""} exprimé{totalVotes !== 1 ? "s" : ""}
            </p>

            {/* Candidates */}
            {electionResults.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-white/25">Aucun vote enregistré pour le moment.</p>
                <p className="text-xs text-white/15 mt-1">Soyez le premier à voter !</p>
              </div>
            ) : (
              <div className="space-y-3">
                {electionResults.map((candidat, idx) => {
                  const pct = totalVotes > 0 ? (candidat.nb_votes / totalVotes) * 100 : 0;
                  const isMyVoteCandidat = myVote === candidat.utilisateur_id;
                  const isVoting = votePending === candidat.utilisateur_id;

                  return (
                    <div
                      key={candidat.utilisateur_id}
                      className={`rounded-xl p-4 ring-1 transition-all ${
                        isMyVoteCandidat
                          ? "bg-amber-500/[0.07] ring-amber-500/25"
                          : "bg-white/[0.02] ring-white/[0.06]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* Rank */}
                        <span
                          className={`text-base font-black w-6 text-center flex-shrink-0 ${
                            idx === 0
                              ? "text-amber-400"
                              : idx === 1
                              ? "text-gray-400"
                              : idx === 2
                              ? "text-orange-400"
                              : "text-white/20"
                          }`}
                        >
                          {idx + 1}
                        </span>

                        {/* Avatar */}
                        <Avatar
                          avatarUrl={candidat.avatar_url}
                          pseudo={candidat.pseudo}
                          size="sm"
                        />

                        {/* Name */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-white/80 truncate">
                              {candidat.pseudo}
                            </p>
                            {isMyVoteCandidat && (
                              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-amber-400/20 text-amber-300 ring-1 ring-amber-400/30 flex-shrink-0">
                                Votre vote
                              </span>
                            )}
                          </div>
                          {/* Vote bar */}
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-700 ${
                                  idx === 0
                                    ? "bg-amber-400/60"
                                    : "bg-violet-500/40"
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-[11px] text-white/30 flex-shrink-0 w-12 text-right">
                              {candidat.nb_votes} vote{candidat.nb_votes !== 1 ? "s" : ""} ({Math.round(pct)}%)
                            </span>
                          </div>
                        </div>

                        {/* Vote button */}
                        {myVote === null && (
                          <button
                            onClick={() => handleVote(candidat.utilisateur_id)}
                            disabled={isPending || isVoting}
                            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-600/15 text-violet-300 ring-1 ring-violet-500/25 hover:bg-violet-600/20 hover:ring-violet-500/35 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isVoting ? <Spinner /> : (
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                              </svg>
                            )}
                            Voter
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Note */}
            <p className="mt-4 text-[11px] text-white/20 text-center">
              Tout membre authentifié peut voter. L&apos;élection est clôturée par le Directeur.
            </p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {membres.length === 0 && !hasActiveElection && (
        <div className="rounded-2xl bg-white/[0.02] ring-1 ring-white/[0.06] p-10 text-center">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-violet-500/10 ring-1 ring-violet-500/15 mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-6 h-6 text-violet-400/50">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0M12 12.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <p className="text-sm text-white/30 font-medium">Aucun membre au Conseil des 5</p>
          <p className="text-xs text-white/20 mt-1">
            Le Directeur peut nommer jusqu&apos;à 4 membres et lancer une élection populaire.
          </p>
        </div>
      )}
    </div>
  );
}
