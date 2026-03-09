"use client";

import { useState, useTransition } from "react";
import {
  lancerElectionChef,
  voterChef,
  cloturerElectionChef,
} from "@/app/(dashboard)/conseil/conseil-actions";
import type { ChiefElectionInfo, ChiefElectionCandidat } from "@/app/(dashboard)/conseil/conseil-actions";
import type { ConseilMembre } from "@/app/(dashboard)/conseil/actions";

// ─── Types ────────────────────────────────────────────────────────────────────

type ChiefElectionProps = {
  election: ChiefElectionInfo | null;
  results: ChiefElectionCandidat[];
  membres: ConseilMembre[];
  myVote: string | null;
  canStart: boolean;
  cantStartReason?: string;
  isCouncilMember: boolean;
  memberCount: number;
  hasChief: boolean;
};

// ─── Avatar ───────────────────────────────────────────────────────────────────

function SmallAvatar({ url, pseudo }: { url: string | null; pseudo: string }) {
  return (
    <div className="w-8 h-8 rounded-full overflow-hidden bg-red-500/20 ring-1 ring-red-500/30 flex items-center justify-center flex-shrink-0">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={pseudo} className="object-cover w-full h-full" />
      ) : (
        <span className="text-xs font-bold text-red-300 uppercase">
          {pseudo.charAt(0)}
        </span>
      )}
    </div>
  );
}

// ─── Chief Election Component ─────────────────────────────────────────────────

export function ChiefElection({
  election,
  results,
  membres,
  myVote,
  canStart,
  cantStartReason,
  isCouncilMember,
  memberCount,
  hasChief,
}: ChiefElectionProps) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ msg: string; error: boolean } | null>(null);

  function showFeedback(msg: string, error: boolean) {
    setFeedback({ msg, error });
    setTimeout(() => setFeedback(null), 4000);
  }

  function handleStartElection() {
    startTransition(async () => {
      const res = await lancerElectionChef();
      showFeedback(
        res.success ? "Élection du Chef lancée !" : res.error,
        !res.success
      );
    });
  }

  function handleVote(candidatId: string) {
    if (!election) return;
    startTransition(async () => {
      const res = await voterChef(election.id, candidatId);
      showFeedback(
        res.success ? "Vote enregistré !" : res.error,
        !res.success
      );
    });
  }

  function handleCloturer() {
    if (!election) return;
    startTransition(async () => {
      const res = await cloturerElectionChef(election.id);
      showFeedback(
        res.success ? "Chef élu avec succès !" : res.error,
        !res.success
      );
    });
  }

  return (
    <section className="rounded-2xl bg-white/[0.02] ring-1 ring-amber-500/15 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-amber-500/[0.08] to-transparent border-b border-amber-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4 text-amber-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">
                Élection du Chef du Conseil
              </h3>
              <p className="text-[10px] text-white/30 mt-0.5">
                {hasChief ? "Chef en poste" : "Aucun chef — siège vacant"}
                {" • "}
                {memberCount} membre{memberCount !== 1 ? "s" : ""} actif{memberCount !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* Status indicator */}
          {election ? (
            <span className="px-3 py-1 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20 animate-pulse">
              Vote en cours
            </span>
          ) : (
            <span className="px-3 py-1 rounded-full text-[10px] font-medium bg-white/[0.05] text-white/30 ring-1 ring-white/10">
              Aucune élection
            </span>
          )}
        </div>
      </div>

      <div className="px-6 py-5 space-y-4">
        {/* Feedback */}
        {feedback && (
          <div
            className={`p-3 rounded-xl text-xs animate-fade-in ${
              feedback.error
                ? "bg-red-500/10 ring-1 ring-red-500/30 text-red-300"
                : "bg-emerald-500/10 ring-1 ring-emerald-500/30 text-emerald-300"
            }`}
          >
            {feedback.msg}
          </div>
        )}

        {/* No election in progress */}
        {!election && isCouncilMember && (
          <div className="space-y-3">
            {canStart ? (
              <button
                onClick={handleStartElection}
                disabled={pending}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 text-sm font-medium ring-1 ring-amber-500/20 transition-all disabled:opacity-50"
              >
                {pending ? "Lancement..." : "Lancer une élection du Chef"}
              </button>
            ) : (
              <div className="p-4 rounded-xl bg-white/[0.02] ring-1 ring-white/5">
                <p className="text-xs text-white/40">
                  <span className="text-amber-400/60">⚠</span>{" "}
                  {cantStartReason}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Election in progress */}
        {election && (
          <>
            {/* Results */}
            {results.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2">
                  Résultats en temps réel
                </p>
                {results.map((c, idx) => {
                  const isMyVote = myVote === c.utilisateur_id;
                  return (
                    <div
                      key={c.utilisateur_id}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                        isMyVote
                          ? "bg-amber-500/10 ring-1 ring-amber-500/25"
                          : "bg-white/[0.02] ring-1 ring-white/5"
                      }`}
                    >
                      <span className="text-xs font-mono text-white/20 w-4">
                        {idx + 1}.
                      </span>
                      <SmallAvatar url={c.avatar_url} pseudo={c.pseudo} />
                      <span className="text-sm text-white/70 flex-1 truncate">
                        {c.prenom_rp && c.nom_rp
                          ? `${c.prenom_rp} ${c.nom_rp}`
                          : c.pseudo}
                      </span>
                      <span className="text-sm font-bold text-amber-400">
                        {c.nb_votes}
                        <span className="text-[10px] ml-0.5 text-amber-400/50">
                          vote{c.nb_votes !== 1 ? "s" : ""}
                        </span>
                      </span>
                      {isMyVote && (
                        <span className="text-[9px] text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full">
                          Mon vote
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Voting interface — council members only */}
            {isCouncilMember && (
              <div className="space-y-2 mt-4">
                <p className="text-[10px] text-white/30 uppercase tracking-widest">
                  Voter pour un candidat
                </p>
                <div className="grid gap-1.5 max-h-48 overflow-y-auto">
                  {membres.map((m) => {
                    const isSelected = myVote === m.utilisateur_id;
                    return (
                      <button
                        key={m.utilisateur_id}
                        onClick={() => handleVote(m.utilisateur_id)}
                        disabled={pending}
                        className={`flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all disabled:opacity-50 ${
                          isSelected
                            ? "bg-amber-500/15 ring-1 ring-amber-500/30"
                            : "bg-white/[0.02] hover:bg-amber-500/5 ring-1 ring-white/5 hover:ring-amber-500/15"
                        }`}
                      >
                        <SmallAvatar url={m.avatar_url} pseudo={m.pseudo} />
                        <span className="text-sm text-white/70 truncate flex-1">
                          {m.prenom_rp && m.nom_rp ? `${m.prenom_rp} ${m.nom_rp}` : m.pseudo}
                        </span>
                        {isSelected ? (
                          <span className="text-[9px] text-amber-300 font-medium">Voté ✓</span>
                        ) : (
                          <span className="text-[9px] text-white/20">Voter</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Conclude election */}
                <button
                  onClick={handleCloturer}
                  disabled={pending || results.length === 0}
                  className="w-full mt-3 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-medium ring-1 ring-emerald-500/20 transition-all disabled:opacity-50"
                >
                  Clôturer et élire le Chef
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
