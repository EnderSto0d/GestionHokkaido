"use client";

import { useState, useTransition, useEffect } from "react";
import {
  creerProposition,
  creerPropositionDerank,
  voterProposition,
  leverBanRankup,
  executerPropositionsEnAttente,
} from "@/app/(dashboard)/conseil/conseil-actions";
import type { Proposition, PropositionVote, RankupBan } from "@/app/(dashboard)/conseil/conseil-actions";

// ─── Types ────────────────────────────────────────────────────────────────────

type VotingSystemProps = {
  propositions: Proposition[];
  historique: Proposition[];
  bansActifs: RankupBan[];
  isCouncilMember: boolean;
  isDirector: boolean;
  userId: string;
  candidats: { id: string; pseudo: string }[];
};

// ─── Vote Bar ─────────────────────────────────────────────────────────────────

function VoteBar({
  pour,
  contre,
  neutre,
  total,
}: {
  pour: number;
  contre: number;
  neutre: number;
  total: number;
}) {
  const pct = (n: number) => (total > 0 ? (n / total) * 100 : 0);
  return (
    <div className="space-y-1.5">
      <div className="flex h-2 rounded-full overflow-hidden bg-white/5">
        {pour > 0 && (
          <div
            className="bg-emerald-500/60 transition-all duration-500"
            style={{ width: `${pct(pour)}%` }}
          />
        )}
        {neutre > 0 && (
          <div
            className="bg-white/20 transition-all duration-500"
            style={{ width: `${pct(neutre)}%` }}
          />
        )}
        {contre > 0 && (
          <div
            className="bg-red-500/60 transition-all duration-500"
            style={{ width: `${pct(contre)}%` }}
          />
        )}
      </div>
      <div className="flex justify-between text-[10px]">
        <span className="text-emerald-400">Pour {pour}</span>
        <span className="text-white/30">Neutre {neutre}</span>
        <span className="text-red-400">Contre {contre}</span>
      </div>
    </div>
  );
}

// ─── Countdown Timer ──────────────────────────────────────────────────────────

function CountdownTimer({ targetDate }: { targetDate: string }) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    function update() {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) {
        setRemaining("Exécution imminente…");
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setRemaining(`${mins}m ${secs < 10 ? "0" : ""}${secs}s`);
    }
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return (
    <span className="font-mono text-amber-300 text-xs">{remaining}</span>
  );
}

// ─── Proposition Card ─────────────────────────────────────────────────────────

function PropositionCard({
  prop,
  isCouncilMember,
  userId,
  onVote,
  pending,
}: {
  prop: Proposition;
  isCouncilMember: boolean;
  userId: string;
  onVote: (propId: string, vote: "pour" | "contre" | "neutre") => void;
  pending: boolean;
}) {
  const myVote = prop.votes.find((v: PropositionVote) => v.votant_id === userId)?.vote;
  const isResolved = prop.statut === "validee" || prop.statut === "refusee";
  const totalVotes = prop.total_pour + prop.total_contre + prop.total_neutre;

  const statusConfig: Record<string, { label: string; color: string }> = {
    en_cours: { label: "En cours", color: "bg-red-500/15 text-red-300 ring-red-500/20" },
    validee: { label: "Validée", color: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/20" },
    refusee: { label: "Refusée", color: "bg-red-500/15 text-red-300 ring-red-500/20" },
    executee: { label: "Exécutée", color: "bg-purple-500/15 text-purple-300 ring-purple-500/20" },
    rejetee: { label: "Rejetée", color: "bg-gray-500/15 text-gray-300 ring-gray-500/20" },
    annulee: { label: "Annulée", color: "bg-gray-500/15 text-gray-400 ring-gray-500/20" },
  };

  const status = statusConfig[prop.statut] ?? statusConfig.en_cours;

  return (
    <div className="rounded-2xl bg-white/[0.02] ring-1 ring-white/[0.06] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {prop.type === "derank" && (
                <span className="text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 ring-1 ring-red-500/20 font-medium">
                  Déclassement
                </span>
              )}
              <span className={`text-[9px] uppercase tracking-widest px-2 py-0.5 rounded-full ring-1 font-medium ${status.color}`}>
                {status.label}
              </span>
            </div>
            <h4 className="font-semibold text-white/90 text-sm truncate">
              {prop.titre}
            </h4>
            {prop.description && (
              <p className="text-xs text-white/40 mt-1 line-clamp-2">
                {prop.description}
              </p>
            )}
            <p className="text-[10px] text-white/20 mt-1.5">
              Proposé par{" "}
              <span className="text-white/40">{prop.proposeur_pseudo}</span>
              {prop.cible_pseudo && (
                <>
                  {" "}• Cible:{" "}
                  <span className="text-red-400/60">{prop.cible_pseudo}</span>
                </>
              )}
              {prop.duree_ban_heures && (
                <span className="text-white/20">
                  {" "}• Ban: {prop.duree_ban_heures}h
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Vote progress */}
      <div className="px-5 py-3">
        <VoteBar
          pour={prop.total_pour}
          contre={prop.total_contre}
          neutre={prop.total_neutre}
          total={totalVotes}
        />
      </div>

      {/* Execution countdown */}
      {isResolved && prop.execute_apres && (
        <div className="px-5 py-3 bg-amber-500/[0.04] border-t border-amber-500/10">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-white/30 uppercase tracking-widest">
              Exécution dans
            </span>
            <CountdownTimer targetDate={prop.execute_apres} />
          </div>
          {isCouncilMember && (
            <p className="text-[10px] text-white/20 mt-1">
              Vous pouvez encore changer votre vote pendant ce délai.
            </p>
          )}
        </div>
      )}

      {/* Individual votes display (public) */}
      {prop.votes.length > 0 && (
        <div className="px-5 py-3 border-t border-white/5">
          <p className="text-[10px] text-white/20 uppercase tracking-widest mb-2">
            Votes ({totalVotes})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {prop.votes.map((v: PropositionVote) => {
              const voteColor =
                v.vote === "pour"
                  ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
                  : v.vote === "contre"
                  ? "bg-red-500/10 text-red-400 ring-red-500/20"
                  : "bg-white/5 text-white/30 ring-white/10";
              return (
                <span
                  key={v.votant_id}
                  className={`text-[10px] px-2 py-0.5 rounded-full ring-1 ${voteColor}`}
                >
                  {v.pseudo}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Voting interface — council members only */}
      {isCouncilMember && (prop.statut === "en_cours" || isResolved) && (
        <div className="px-5 py-3 border-t border-white/5">
          <div className="flex gap-2">
            {(["pour", "contre", "neutre"] as const).map((v) => {
              const isActive = myVote === v;
              const btnStyles = {
                pour: isActive
                  ? "bg-emerald-500/20 text-emerald-300 ring-emerald-500/30"
                  : "bg-white/[0.03] text-white/40 ring-white/10 hover:bg-emerald-500/10 hover:text-emerald-400 hover:ring-emerald-500/20",
                contre: isActive
                  ? "bg-red-500/20 text-red-300 ring-red-500/30"
                  : "bg-white/[0.03] text-white/40 ring-white/10 hover:bg-red-500/10 hover:text-red-400 hover:ring-red-500/20",
                neutre: isActive
                  ? "bg-white/10 text-white/60 ring-white/20"
                  : "bg-white/[0.03] text-white/40 ring-white/10 hover:bg-white/[0.06] hover:text-white/50",
              };
              const labels = { pour: "Pour", contre: "Contre", neutre: "Neutre" };
              const icons = { pour: "✓", contre: "✗", neutre: "−" };
              return (
                <button
                  key={v}
                  onClick={() => onVote(prop.id, v)}
                  disabled={pending}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium ring-1 transition-all disabled:opacity-50 ${btnStyles[v]}`}
                >
                  {icons[v]} {labels[v]}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── New Proposal Form ────────────────────────────────────────────────────────

function NewProposalForm({
  candidats,
  onClose,
}: {
  candidats: { id: string; pseudo: string }[];
  onClose: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [type, setType] = useState<"general" | "derank">("general");
  const [titre, setTitre] = useState("");
  const [description, setDescription] = useState("");
  const [cibleId, setCibleId] = useState("");
  const [banHeures, setBanHeures] = useState(24);
  const [searchTerm, setSearchTerm] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const filteredCandidats = candidats.filter(
    (c) => c.pseudo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  function handleSubmit() {
    startTransition(async () => {
      let res;
      if (type === "derank") {
        if (!cibleId) {
          setFeedback("Sélectionnez un utilisateur cible.");
          return;
        }
        res = await creerPropositionDerank(cibleId, banHeures, description);
      } else {
        res = await creerProposition(titre, description);
      }

      if (res.success) {
        onClose();
      } else {
        setFeedback(res.error);
      }
    });
  }

  return (
    <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 overflow-hidden">
      <div className="px-5 py-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-white text-sm">Nouvelle proposition</h4>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white/60 transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {feedback && (
          <div className="p-3 rounded-xl bg-red-500/10 ring-1 ring-red-500/30 text-red-300 text-xs">
            {feedback}
          </div>
        )}

        {/* Type selector */}
        <div className="flex gap-2">
          <button
            onClick={() => setType("general")}
            className={`flex-1 py-2 rounded-xl text-xs font-medium ring-1 transition-all ${
              type === "general"
                ? "bg-red-500/15 text-red-300 ring-red-500/25"
                : "bg-white/[0.03] text-white/30 ring-white/10"
            }`}
          >
            Décision générale
          </button>
          <button
            onClick={() => setType("derank")}
            className={`flex-1 py-2 rounded-xl text-xs font-medium ring-1 transition-all ${
              type === "derank"
                ? "bg-red-500/15 text-red-300 ring-red-500/25"
                : "bg-white/[0.03] text-white/30 ring-white/10"
            }`}
          >
            Déclassement
          </button>
        </div>

        {/* General proposal fields */}
        {type === "general" && (
          <input
            type="text"
            placeholder="Titre de la proposition…"
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 ring-1 ring-white/10 text-white/80 text-sm placeholder:text-white/20 focus:ring-red-500/30 focus:outline-none transition-all"
          />
        )}

        {/* Derank fields */}
        {type === "derank" && (
          <>
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-widest mb-2">
                Utilisateur ciblé
              </p>
              <input
                type="text"
                placeholder="Rechercher…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-white/5 ring-1 ring-white/10 text-white/80 text-sm placeholder:text-white/20 focus:ring-red-500/30 focus:outline-none transition-all mb-2"
              />
              <div className="max-h-32 overflow-y-auto space-y-1">
                {filteredCandidats.slice(0, 15).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCibleId(c.id)}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-all ${
                      cibleId === c.id
                        ? "bg-red-500/15 text-red-300 ring-1 ring-red-500/25"
                        : "text-white/50 hover:bg-white/5"
                    }`}
                  >
                    {c.pseudo}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-widest mb-2">
                Durée du ban de rank-up ({banHeures}h)
              </p>
              <input
                type="range"
                min={1}
                max={168}
                value={banHeures}
                onChange={(e) => setBanHeures(Number(e.target.value))}
                className="w-full accent-red-500"
              />
              <div className="flex justify-between text-[10px] text-white/20 mt-1">
                <span>1h</span>
                <span>1 jour</span>
                <span>3 jours</span>
                <span>1 semaine</span>
              </div>
            </div>
          </>
        )}

        {/* Description */}
        <textarea
          placeholder="Description / justification (optionnel)…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-4 py-2.5 rounded-xl bg-white/5 ring-1 ring-white/10 text-white/80 text-sm placeholder:text-white/20 focus:ring-red-500/30 focus:outline-none transition-all resize-none"
        />

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={pending || (type === "general" && !titre.trim()) || (type === "derank" && !cibleId)}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-red-500/20 to-purple-500/20 hover:from-red-500/30 hover:to-purple-500/30 text-white/80 text-sm font-medium ring-1 ring-red-500/20 transition-all disabled:opacity-50"
        >
          {pending ? "Création…" : "Soumettre la proposition"}
        </button>
      </div>
    </div>
  );
}

// ─── Rank-Up Bans Panel ───────────────────────────────────────────────────────

function BansPanel({
  bans,
  isDirector,
}: {
  bans: RankupBan[];
  isDirector: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  function handleLever(banId: string) {
    startTransition(async () => {
      const res = await leverBanRankup(banId);
      if (!res.success) setFeedback(res.error);
      setTimeout(() => setFeedback(null), 4000);
    });
  }

  if (bans.length === 0) return null;

  return (
    <div className="rounded-2xl bg-red-500/[0.04] ring-1 ring-red-500/15 overflow-hidden">
      <div className="px-5 py-3 border-b border-red-500/10">
        <h4 className="text-xs font-semibold text-red-400/80 uppercase tracking-widest">
          Bans de Rank-Up actifs ({bans.length})
        </h4>
      </div>
      <div className="px-5 py-3 space-y-2">
        {feedback && (
          <div className="p-2 rounded-lg bg-red-500/10 text-red-300 text-xs">
            {feedback}
          </div>
        )}
        {bans.map((ban) => (
          <div
            key={ban.id}
            className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.02] ring-1 ring-red-500/10"
          >
            <div>
              <p className="text-sm text-white/70">{ban.pseudo}</p>
              <p className="text-[10px] text-white/30">
                Expire le{" "}
                {new Date(ban.interdit_jusqua).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            {isDirector && (
              <button
                onClick={() => handleLever(ban.id)}
                disabled={pending}
                className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 text-xs ring-1 ring-amber-500/20 transition-all disabled:opacity-50"
              >
                Lever le ban
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Voting System Component ─────────────────────────────────────────────

export function VotingSystem({
  propositions,
  historique,
  bansActifs,
  isCouncilMember,
  isDirector,
  userId,
  candidats,
}: VotingSystemProps) {
  const [pending, startTransition] = useTransition();
  const [showNewForm, setShowNewForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  function handleVote(propId: string, vote: "pour" | "contre" | "neutre") {
    startTransition(async () => {
      await voterProposition(propId, vote);
      // Also trigger execution check
      await executerPropositionsEnAttente();
    });
  }

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4 text-red-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">Propositions & Votes</h3>
            <p className="text-[10px] text-white/30">
              {isCouncilMember
                ? "Votez sur les propositions du conseil"
                : "Consultation publique des votes en cours"}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {isCouncilMember && (
            <button
              onClick={() => setShowNewForm(!showNewForm)}
              className="px-4 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 text-xs font-medium ring-1 ring-red-500/20 transition-all"
            >
              {showNewForm ? "Annuler" : "+ Proposition"}
            </button>
          )}
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/40 text-xs font-medium ring-1 ring-white/10 transition-all"
          >
            {showHistory ? "Masquer" : "Historique"}
          </button>
        </div>
      </div>

      {/* New proposal form */}
      {showNewForm && isCouncilMember && (
        <NewProposalForm
          candidats={candidats}
          onClose={() => setShowNewForm(false)}
        />
      )}

      {/* Active rank-up bans */}
      <BansPanel bans={bansActifs} isDirector={isDirector} />

      {/* Active propositions */}
      {propositions.length > 0 ? (
        <div className="space-y-4">
          {propositions.map((prop) => (
            <PropositionCard
              key={prop.id}
              prop={prop}
              isCouncilMember={isCouncilMember}
              userId={userId}
              onVote={handleVote}
              pending={pending}
            />
          ))}
        </div>
      ) : (
        <div className="py-12 text-center">
          <p className="text-sm text-white/20">Aucune proposition en cours.</p>
        </div>
      )}

      {/* History */}
      {showHistory && historique.length > 0 && (
        <div className="space-y-4">
          <p className="text-[10px] text-white/20 uppercase tracking-widest">
            Historique des propositions
          </p>
          {historique.map((prop) => (
            <PropositionCard
              key={prop.id}
              prop={prop}
              isCouncilMember={false}
              userId={userId}
              onVote={() => {}}
              pending={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}
