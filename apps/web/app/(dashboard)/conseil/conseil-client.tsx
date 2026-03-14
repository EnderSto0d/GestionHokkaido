"use client";

import { useState, useTransition } from "react";
import {
  voterEleve,
  voterStaff,
  lancerElection,
  cloturerElection,
  voterAnnulationElection,
  retirerVoteAnnulation,
  forceAnnulerElection,
  forceAnnulerElectionPP,
  retirerVoteAnnulationPP,
  revoquerMembreConseil,
  nommerMembreConseil,
  annulerMonVote,
} from "./actions";
import type {
  ConseilMembre,
  ElectionInfo,
  CandidatVotes,
  VoteAnnulationInfo,
} from "./actions";
import type {
  ChiefElectionInfo,
  ChiefElectionCandidat,
  Proposition,
  RankupBan,
} from "./conseil-actions";

import { ConseilSemicircle } from "@/components/shared/conseil-semicircle";
import { ChiefElection } from "@/components/shared/chief-election";
import { VotingSystem } from "@/components/shared/conseil-voting";

// ─── Types ────────────────────────────────────────────────────────────────────

type Candidat = {
  id: string;
  pseudo: string;
  avatar_url: string | null;
  prenom_rp: string | null;
  nom_rp: string | null;
};

type ConseilClientProps = {
  membres: ConseilMembre[];
  elections: ElectionInfo[];
  resultatsEleve: CandidatVotes[];
  resultatsStaff: CandidatVotes[];
  candidats: Candidat[];
  candidatsJoker: Candidat[];
  mesVotesEleve: string[];
  mesVotesStaff: string[];
  // Blocked votes (cancelled definitively)
  mesVotesBloquesEleve: string[];
  mesVotesBloquesStaff: string[];
  peutVoterEleveInfo: { canVote: boolean; reason?: string; votesRestants?: number } | null;
  isProfOrAdmin: boolean;
  isDirector: boolean;
  isCouncilMember: boolean;
  userId: string;
  // Chief election
  chiefElection: ChiefElectionInfo | null;
  chiefResults: ChiefElectionCandidat[];
  myChiefVote: string | null;
  canStartChief: boolean;
  cantStartChiefReason?: string;
  memberCount: number;
  hasChief: boolean;
  // Voting system
  propositions: Proposition[];
  historique: Proposition[];
  bansActifs: RankupBan[];
  // Cancel vote info
  votesAnnulationEleve: VoteAnnulationInfo | null;
  votesAnnulationStaff: VoteAnnulationInfo | null;
};

// ─── Avatar helper ────────────────────────────────────────────────────────────

function Avatar({ url, pseudo, size = "md" }: { url: string | null; pseudo: string; size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: "w-8 h-8 text-xs",
    md: "w-12 h-12 text-sm",
    lg: "w-16 h-16 text-base",
  };
  return (
    <div className={`${sizes[size]} rounded-full overflow-hidden bg-red-500/20 ring-2 ring-red-500/30 flex items-center justify-center flex-shrink-0`}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={pseudo} className="object-cover w-full h-full" />
      ) : (
        <span className="font-bold text-red-300 uppercase">
          {pseudo.charAt(0)}
        </span>
      )}
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function ConseilClient({
  membres,
  elections,
  resultatsEleve,
  resultatsStaff,
  candidats,
  candidatsJoker,
  mesVotesEleve,
  mesVotesStaff,
  mesVotesBloquesEleve,
  mesVotesBloquesStaff,
  peutVoterEleveInfo,
  isProfOrAdmin,
  isDirector,
  isCouncilMember,
  userId,
  chiefElection,
  chiefResults,
  myChiefVote,
  canStartChief,
  cantStartChiefReason,
  memberCount,
  hasChief,
  propositions,
  historique,
  bansActifs,
  votesAnnulationEleve,
  votesAnnulationStaff,
}: ConseilClientProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [nommerSearchTerm, setNommerSearchTerm] = useState("");
  const [nommerType, setNommerType] = useState<"elu_eleve" | "elu_joker">("elu_joker");
  const [activeTab, setActiveTab] = useState<"overview" | "votes" | "elections" | "admin">("overview");

  const [confirmCancelVote, setConfirmCancelVote] = useState<{
    electionId: string;
    candidatId: string;
    candidatName: string;
  } | null>(null);

  function handleConfirmCancelVote() {
    if (!confirmCancelVote) return;
    const { electionId, candidatId } = confirmCancelVote;
    setConfirmCancelVote(null);
    startTransition(async () => {
      const res = await annulerMonVote(electionId, candidatId);
      showFeedback(
        res.success ? "Vote annulé. Vous ne pourrez plus voter pour ce candidat." : res.error,
        !res.success
      );
    });
  }

  const electionEleve = elections.find((e) => e.type === "elu_eleve");
  const electionStaff = elections.find((e) => e.type === "elu_joker");
  const siegesJokerOccupes = membres.filter((m) => m.type_siege === "elu_joker").length;
  const maxVotesStaff = (electionStaff?.nb_sieges ?? 3) - siegesJokerOccupes;

  function showFeedback(msg: string, isError: boolean) {
    if (isError) {
      setError(msg);
      setSuccess(null);
    } else {
      setSuccess(msg);
      setError(null);
    }
    setTimeout(() => { setError(null); setSuccess(null); }, 4000);
  }

  function handleVoteEleve(candidatId: string) {
    if (!electionEleve) return;
    startTransition(async () => {
      const res = await voterEleve(electionEleve.id, candidatId);
      showFeedback(res.success ? "Vote enregistré !" : res.error, !res.success);
    });
  }

  function handleVoteStaff(candidatId: string) {
    if (!electionStaff) return;
    startTransition(async () => {
      const res = await voterStaff(electionStaff.id, candidatId);
      showFeedback(res.success ? "Vote enregistré !" : res.error, !res.success);
    });
  }

  function handleLancerElection(type: "elu_eleve" | "elu_joker") {
    startTransition(async () => {
      const res = await lancerElection(type);
      showFeedback(res.success ? "Élection lancée !" : res.error, !res.success);
    });
  }

  function handleCloturer(electionId: string) {
    startTransition(async () => {
      const res = await cloturerElection(electionId);
      showFeedback(res.success ? "Élection clôturée !" : res.error, !res.success);
    });
  }

  function handleAnnuler(electionId: string) {
    startTransition(async () => {
      const res = await voterAnnulationElection(electionId);
      if (res.success && res.annulee) {
        showFeedback("Seuil atteint — élection annulée.", false);
      } else if (res.success) {
        showFeedback("Vote d'annulation enregistré.", false);
      } else {
        showFeedback(res.error, true);
      }
    });
  }

  function handleForceAnnuler(electionId: string) {
    startTransition(async () => {
      const res = await forceAnnulerElection(electionId);
      showFeedback(res.success ? "Élection annulée." : res.error, !res.success);
    });
  }

  function handleRetirerAnnulation(electionId: string) {
    startTransition(async () => {
      const res = await retirerVoteAnnulation(electionId);
      showFeedback(res.success ? "Vote d'annulation retiré." : res.error, !res.success);
    });
  }

  function handleForceAnnulerPP(electionId: string) {
    startTransition(async () => {
      const res = await forceAnnulerElectionPP(electionId);
      if (res.success && res.annulee) {
        showFeedback("Unanimité PP — élection annulée.", false);
      } else if (res.success) {
        showFeedback("Confirmation PP enregistrée.", false);
      } else {
        showFeedback(res.error, true);
      }
    });
  }

  function handleRetirerAnnulationPP(electionId: string) {
    startTransition(async () => {
      const res = await retirerVoteAnnulationPP(electionId);
      showFeedback(res.success ? "Confirmation PP retirée." : res.error, !res.success);
    });
  }

  function handleRevoquer(membreId: string) {
    startTransition(async () => {
      const res = await revoquerMembreConseil(membreId);
      showFeedback(res.success ? "Membre révoqué." : res.error, !res.success);
    });
  }

  function handleNommer(utilisateurId: string) {
    startTransition(async () => {
      const res = await nommerMembreConseil(utilisateurId, nommerType);
      showFeedback(res.success ? "Membre nommé !" : res.error, !res.success);
    });
  }

  const filteredCandidats = candidats.filter(
    (c) =>
      c.pseudo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.prenom_rp && c.prenom_rp.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.nom_rp && c.nom_rp.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredCandidatsJoker = candidatsJoker.filter(
    (c) =>
      c.pseudo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.prenom_rp && c.prenom_rp.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.nom_rp && c.nom_rp.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredNommerCandidats = (nommerType === "elu_joker" ? candidatsJoker : candidats).filter(
    (c) =>
      c.pseudo.toLowerCase().includes(nommerSearchTerm.toLowerCase()) ||
      (c.prenom_rp && c.prenom_rp.toLowerCase().includes(nommerSearchTerm.toLowerCase())) ||
      (c.nom_rp && c.nom_rp.toLowerCase().includes(nommerSearchTerm.toLowerCase()))
  );

  // ── Tab definitions ──────────────────────────────────────────────────

  const tabs = [
    { key: "overview" as const, label: "Conseil", icon: "◎" },
    { key: "votes" as const, label: "Propositions", icon: "⬡" },
    { key: "elections" as const, label: "Élections", icon: "★" },
    ...(isProfOrAdmin ? [{ key: "admin" as const, label: "Gestion", icon: "⚙" }] : []),
  ];

  return (
    <div className="space-y-8">
      {/* Feedback */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 ring-1 ring-red-500/30 text-red-300 text-sm animate-fade-in">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/30 text-emerald-300 text-sm animate-fade-in">
          {success}
        </div>
      )}

      {/* Confirmation popup — annulation de vote */}
      {confirmCancelVote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="mx-4 max-w-md w-full rounded-2xl bg-[#1a0a0a] ring-1 ring-red-500/30 p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white">Annuler votre vote ?</h3>
            <p className="text-sm text-white/60">
              Vous allez annuler votre vote pour <span className="font-semibold text-white/90">{confirmCancelVote.candidatName}</span>.
            </p>
            <div className="p-3 rounded-xl bg-red-500/10 ring-1 ring-red-500/20">
              <p className="text-xs text-red-300/80">
                <span className="font-bold text-red-400">Attention :</span> cette action est définitive. Vous ne pourrez plus jamais voter pour ce candidat dans cette élection.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setConfirmCancelVote(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 text-sm font-medium ring-1 ring-white/10 transition-all"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmCancelVote}
                disabled={pending}
                className="flex-1 py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm font-bold ring-1 ring-red-500/30 transition-all disabled:opacity-50"
              >
                Confirmer l&apos;annulation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab navigation */}
      <div className="flex gap-1 p-1 rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06]">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === tab.key
                ? "bg-white/[0.08] text-white ring-1 ring-white/10 shadow-sm"
                : "text-white/30 hover:text-white/50 hover:bg-white/[0.02]"
            }`}
          >
            <span className="text-sm">{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ═══ TAB: Overview — Semi-circle + Member list ═══ */}
      {activeTab === "overview" && (
        <div className="space-y-8">
          {/* Semi-circle layout */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">
                  Conseil des Élèves
                  <span className="ml-2 text-sm font-normal text-white/30">
                    ({membres.length}/7)
                  </span>
                </h2>
                <p className="text-xs text-white/30">
                  3 élus par les escouades • 3 jokers nommés par l'équipe professorale
                </p>
              </div>
              {isCouncilMember && (
                <span className="px-3 py-1 rounded-full text-[10px] font-medium bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/20">
                  Membre du Conseil
                </span>
              )}
            </div>

            {/* Semi-circle visualization */}
            <div className="rounded-2xl bg-white/[0.015] ring-1 ring-white/[0.06] p-6 overflow-x-auto">
              <ConseilSemicircle membres={membres} />
            </div>
          </section>

          {/* Member list with details */}
          <section>
            <h3 className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-3">
              Liste des membres
            </h3>
            <div className="space-y-2">
              {membres.map((m) => (
                <div
                  key={m.id}
                  className={`flex items-center gap-4 p-4 rounded-xl transition-all ${
                    m.est_chef
                      ? "bg-amber-500/[0.06] ring-1 ring-amber-500/20"
                      : "bg-white/[0.02] ring-1 ring-white/[0.06] hover:bg-white/[0.04]"
                  }`}
                >
                  <Avatar url={m.avatar_url} pseudo={m.pseudo} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white/90 text-sm truncate">
                        {m.prenom_rp && m.nom_rp ? `${m.prenom_rp} ${m.nom_rp}` : m.pseudo}
                      </p>
                      {m.est_chef && (
                        <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-medium">
                          Chef
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-white/30">
                      {m.grade_role ?? "Élève"} {m.grade ? `• ${m.grade}` : ""}
                    </p>
                  </div>
                  <div className={`text-[10px] uppercase tracking-wide ${
                    m.type_siege === "elu_eleve" ? "text-amber-400/50" : m.type_siege === "classement_perso" ? "text-red-400/50" : "text-purple-400/50"
                  }`}>
                    {m.type_siege === "elu_eleve" ? "Élu" : m.type_siege === "classement_perso" ? "Classement" : "Joker"}
                  </div>
                  {isProfOrAdmin && (
                    <button
                      onClick={() => handleRevoquer(m.id)}
                      disabled={pending}
                      className="ml-2 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs ring-1 ring-red-500/20 transition-all disabled:opacity-50"
                    >
                      Révoquer
                    </button>
                  )}
                </div>
              ))}
              {membres.length === 0 && (
                <div className="py-12 text-center text-white/20 text-sm">
                  Aucun membre au conseil actuellement.
                </div>
              )}
            </div>
          </section>

          {/* ── Élections actives : voter directement depuis l'onglet Conseil ── */}

          {/* Élection Élève — vote des top 3 escouades */}
          {electionEleve && (
            <section className="rounded-2xl bg-white/[0.02] ring-1 ring-amber-500/15 overflow-hidden animate-fade-in">
              <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-amber-500/[0.08] to-transparent border-b border-amber-500/10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-white text-sm flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                      Élection Élève en cours
                    </h3>
                    <p className="text-[10px] text-white/30 mt-0.5">
                      3 sièges — vote ouvert aux membres du top 3 escouades
                    </p>
                  </div>
                  {isProfOrAdmin && (
                    <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
                      <button onClick={() => handleCloturer(electionEleve.id)} disabled={pending} className="px-4 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-medium ring-1 ring-emerald-500/20 transition-all disabled:opacity-50">
                        Clôturer
                      </button>
                      {/* Vote d'annulation (75 %) */}
                      {votesAnnulationEleve?.aVote ? (
                        <button onClick={() => handleRetirerAnnulation(electionEleve.id)} disabled={pending} className="px-4 py-2 rounded-lg bg-red-500/20 text-red-300 text-xs font-medium ring-1 ring-red-500/30 transition-all disabled:opacity-50">
                          Annuler ({votesAnnulationEleve.votants.length}/{votesAnnulationEleve.seuilRequis}) ✓
                        </button>
                      ) : (
                        <button onClick={() => handleAnnuler(electionEleve.id)} disabled={pending} className="px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium ring-1 ring-red-500/20 transition-all disabled:opacity-50" title="75 % des profs/admins requis">
                          Annuler ({votesAnnulationEleve?.votants.length ?? 0}/{votesAnnulationEleve?.seuilRequis ?? '?'})
                        </button>
                      )}
                      {/* Annulation immédiate — Directeur / Co-Directeur / Admin */}
                      {votesAnnulationEleve?.peutAnnulerDirectement && (
                        <button onClick={() => handleForceAnnuler(electionEleve.id)} disabled={pending} className="px-4 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-300 text-xs font-bold ring-1 ring-red-600/40 transition-all disabled:opacity-50" title="Annulation immédiate (Directeur / Co-Dir / Admin)">
                          ✕ Forcer
                        </button>
                      )}
                      {/* Unanimité PP */}
                      {votesAnnulationEleve?.estProfPrincipal && (
                        votesAnnulationEleve.aVotePP ? (
                          <button onClick={() => handleRetirerAnnulationPP(electionEleve.id)} disabled={pending} className="px-4 py-2 rounded-lg bg-orange-500/20 text-orange-300 text-xs font-bold ring-1 ring-orange-500/30 transition-all disabled:opacity-50" title="Retirer ma confirmation PP">
                            PP ({votesAnnulationEleve.nbVotesPP}/{votesAnnulationEleve.totalPP}) ✓
                          </button>
                        ) : (
                          <button onClick={() => handleForceAnnulerPP(electionEleve.id)} disabled={pending} className="px-4 py-2 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 text-xs font-bold ring-1 ring-orange-500/20 transition-all disabled:opacity-50" title="Unanimité des Profs Principaux requise">
                            PP ({votesAnnulationEleve.nbVotesPP}/{votesAnnulationEleve.totalPP})
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
                {isProfOrAdmin && votesAnnulationEleve && votesAnnulationEleve.votants.length > 0 && (
                  <div className="px-6 py-2 bg-red-500/[0.04] border-b border-red-500/10">
                    <p className="text-[10px] text-red-400/60">
                      Votes d&apos;annulation : {votesAnnulationEleve.votants.map(v => v.pseudo).join(', ')} ({votesAnnulationEleve.votants.length}/{votesAnnulationEleve.seuilRequis} — 75 % requis{votesAnnulationEleve.tousProfsPrincipauxOntVote ? ' · unanimité PP atteinte' : ''})
                    </p>
                  </div>
                )}
              </div>
              <div className="px-6 py-5 space-y-4">
                {/* Résultats actuels */}
                {resultatsEleve.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2">Résultats actuels</p>
                    {resultatsEleve.map((c, idx) => (
                      <div key={c.utilisateur_id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02]">
                        <span className="text-xs font-mono text-white/25 w-5">{idx + 1}.</span>
                        <Avatar url={c.avatar_url} pseudo={c.pseudo} size="sm" />
                        <span className="text-sm text-white/70 flex-1 truncate">
                          {c.prenom_rp && c.nom_rp ? `${c.prenom_rp} ${c.nom_rp}` : c.pseudo}
                        </span>
                        <span className="text-sm font-bold text-amber-400">
                          {c.nb_votes}
                          <span className="text-[10px] ml-0.5 text-amber-400/50">
                            vote{c.nb_votes !== 1 ? "s" : ""}
                          </span>
                        </span>
                        {mesVotesEleve.includes(c.utilisateur_id) && (
                          <button
                            onClick={() => setConfirmCancelVote({
                              electionId: electionEleve.id,
                              candidatId: c.utilisateur_id,
                              candidatName: c.prenom_rp && c.nom_rp ? `${c.prenom_rp} ${c.nom_rp}` : c.pseudo,
                            })}
                            disabled={pending}
                            className="px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-medium ring-1 ring-red-500/20 transition-all disabled:opacity-50"
                          >
                            Retirer
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Interface de vote */}
                {peutVoterEleveInfo?.canVote && (
                  <div>
                    <p className="text-xs text-emerald-400/70 mb-3">
                      {peutVoterEleveInfo.votesRestants} vote{(peutVoterEleveInfo.votesRestants ?? 0) > 1 ? "s" : ""} restant{(peutVoterEleveInfo.votesRestants ?? 0) > 1 ? "s" : ""}
                    </p>
                    <input
                      type="text"
                      placeholder="Rechercher un candidat…"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 ring-1 ring-white/10 text-white/80 text-sm placeholder:text-white/20 focus:ring-amber-500/30 focus:outline-none mb-3 transition-all"
                    />
                    <div className="max-h-60 overflow-y-auto space-y-1">
                      {filteredCandidats
                        .filter((c) => c.id !== userId && !mesVotesEleve.includes(c.id) && !mesVotesBloquesEleve.includes(c.id))
                        .slice(0, 20)
                        .map((c) => (
                          <button
                            key={c.id}
                            onClick={() => handleVoteEleve(c.id)}
                            disabled={pending}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] hover:bg-amber-500/10 ring-1 ring-white/5 hover:ring-amber-500/20 text-left transition-all disabled:opacity-50"
                          >
                            <Avatar url={c.avatar_url} pseudo={c.pseudo} size="sm" />
                            <span className="text-sm text-white/70 truncate flex-1">
                              {c.prenom_rp && c.nom_rp ? `${c.prenom_rp} ${c.nom_rp}` : c.pseudo}
                            </span>
                            <span className="text-[10px] text-amber-400/60 uppercase">Voter</span>
                          </button>
                        ))}
                    </div>
                  </div>
                )}
                {peutVoterEleveInfo && !peutVoterEleveInfo.canVote && peutVoterEleveInfo.reason && (
                  <p className="text-xs text-white/30 italic">{peutVoterEleveInfo.reason}</p>
                )}
              </div>
            </section>
          )}

          {/* Élection Joker — vote des professeurs */}
          {electionStaff && isProfOrAdmin && (
            <section className="rounded-2xl bg-white/[0.02] ring-1 ring-red-500/15 overflow-hidden animate-fade-in">
              <div className="px-4 sm:px-6 py-4 bg-gradient-to-r from-red-500/[0.08] to-transparent border-b border-red-500/10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-white text-sm flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                      Élection Joker en cours
                    </h3>
                    <p className="text-[10px] text-white/30 mt-0.5">
                      {electionStaff.nb_sieges} sièges ({electionStaff.nb_sieges - siegesJokerOccupes} restant{electionStaff.nb_sieges - siegesJokerOccupes > 1 ? "s" : ""}) — vote réservé aux professeurs
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
                    <button onClick={() => handleCloturer(electionStaff.id)} disabled={pending} className="px-4 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-medium ring-1 ring-emerald-500/20 transition-all disabled:opacity-50">
                      Clôturer
                    </button>
                    {/* Vote d'annulation (75 %) */}
                    {votesAnnulationStaff?.aVote ? (
                      <button onClick={() => handleRetirerAnnulation(electionStaff.id)} disabled={pending} className="px-4 py-2 rounded-lg bg-red-500/20 text-red-300 text-xs font-medium ring-1 ring-red-500/30 transition-all disabled:opacity-50">
                        Annuler ({votesAnnulationStaff.votants.length}/{votesAnnulationStaff.seuilRequis}) ✓
                      </button>
                    ) : (
                      <button onClick={() => handleAnnuler(electionStaff.id)} disabled={pending} className="px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium ring-1 ring-red-500/20 transition-all disabled:opacity-50" title="75 % des profs/admins requis">
                        Annuler ({votesAnnulationStaff?.votants.length ?? 0}/{votesAnnulationStaff?.seuilRequis ?? '?'})
                      </button>
                    )}
                    {/* Annulation immédiate — Directeur / Co-Directeur / Admin */}
                    {votesAnnulationStaff?.peutAnnulerDirectement && (
                      <button onClick={() => handleForceAnnuler(electionStaff.id)} disabled={pending} className="px-4 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-300 text-xs font-bold ring-1 ring-red-600/40 transition-all disabled:opacity-50" title="Annulation immédiate (Directeur / Co-Dir / Admin)">
                        ✕ Forcer
                      </button>
                    )}
                    {/* Unanimité PP */}
                    {votesAnnulationStaff?.estProfPrincipal && (
                      votesAnnulationStaff.aVotePP ? (
                        <button onClick={() => handleRetirerAnnulationPP(electionStaff.id)} disabled={pending} className="px-4 py-2 rounded-lg bg-orange-500/20 text-orange-300 text-xs font-bold ring-1 ring-orange-500/30 transition-all disabled:opacity-50" title="Retirer ma confirmation PP">
                          PP ({votesAnnulationStaff.nbVotesPP}/{votesAnnulationStaff.totalPP}) ✓
                        </button>
                      ) : (
                        <button onClick={() => handleForceAnnulerPP(electionStaff.id)} disabled={pending} className="px-4 py-2 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 text-xs font-bold ring-1 ring-orange-500/20 transition-all disabled:opacity-50" title="Unanimité des Profs Principaux requise">
                          PP ({votesAnnulationStaff.nbVotesPP}/{votesAnnulationStaff.totalPP})
                        </button>
                      )
                    )}
                  </div>
                </div>
                {votesAnnulationStaff && votesAnnulationStaff.votants.length > 0 && (
                  <div className="px-6 py-2 bg-red-500/[0.04] border-b border-red-500/10">
                    <p className="text-[10px] text-red-400/60">
                      Votes d&apos;annulation : {votesAnnulationStaff.votants.map(v => v.pseudo).join(', ')} ({votesAnnulationStaff.votants.length}/{votesAnnulationStaff.seuilRequis} — 75 % requis{votesAnnulationStaff.tousProfsPrincipauxOntVote ? ' · unanimité PP atteinte' : ''})
                    </p>
                  </div>
                )}
              </div>
              <div className="px-6 py-5 space-y-4">
                {/* Résultats actuels */}
                {resultatsStaff.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2">Résultats actuels</p>
                    {resultatsStaff.map((c, idx) => (
                      <div key={c.utilisateur_id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02]">
                        <span className="text-xs font-mono text-white/25 w-5">{idx + 1}.</span>
                        <Avatar url={c.avatar_url} pseudo={c.pseudo} size="sm" />
                        <span className="text-sm text-white/70 flex-1 truncate">
                          {c.prenom_rp && c.nom_rp ? `${c.prenom_rp} ${c.nom_rp}` : c.pseudo}
                        </span>
                        <span className="text-sm font-bold text-red-400">
                          {c.nb_votes}
                          <span className="text-[10px] ml-0.5 text-red-400/50">
                            vote{c.nb_votes !== 1 ? "s" : ""}
                          </span>
                        </span>
                        {mesVotesStaff.includes(c.utilisateur_id) && (
                          <button
                            onClick={() => setConfirmCancelVote({
                              electionId: electionStaff.id,
                              candidatId: c.utilisateur_id,
                              candidatName: c.prenom_rp && c.nom_rp ? `${c.prenom_rp} ${c.nom_rp}` : c.pseudo,
                            })}
                            disabled={pending}
                            className="px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-medium ring-1 ring-red-500/20 transition-all disabled:opacity-50"
                          >
                            Retirer
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Interface de vote */}
                <div>
                  <p className="text-xs text-red-400/70 mb-3">
                    Sélectionnez un candidat
                    {mesVotesStaff.length > 0 && ` (${maxVotesStaff - mesVotesStaff.length} vote(s) restant(s))`}
                  </p>
                  <input
                    type="text"
                    placeholder="Rechercher…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 ring-1 ring-white/10 text-white/80 text-sm placeholder:text-white/20 focus:ring-red-500/30 focus:outline-none mb-3 transition-all"
                  />
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {filteredCandidatsJoker
                      .filter((c) => !mesVotesStaff.includes(c.id) && !mesVotesBloquesStaff.includes(c.id))
                      .slice(0, 20)
                      .map((c) => (
                        <button
                          key={c.id}
                          onClick={() => handleVoteStaff(c.id)}
                          disabled={pending || mesVotesStaff.length >= maxVotesStaff}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] hover:bg-red-500/10 ring-1 ring-white/5 hover:ring-red-500/20 text-left transition-all disabled:opacity-50"
                        >
                          <Avatar url={c.avatar_url} pseudo={c.pseudo} size="sm" />
                          <span className="text-sm text-white/70 truncate flex-1">
                            {c.prenom_rp && c.nom_rp ? `${c.prenom_rp} ${c.nom_rp}` : c.pseudo}
                          </span>
                          <span className="text-[10px] text-red-400/60 uppercase">Voter</span>
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {/* ═══ TAB: Propositions & Votes ═══ */}
      {activeTab === "votes" && (
        <VotingSystem
          propositions={propositions}
          historique={historique}
          bansActifs={bansActifs}
          isCouncilMember={isCouncilMember}
          isDirector={isDirector}
          userId={userId}
          candidats={[...new Map([...candidats, ...candidatsJoker].map(c => [c.id, { id: c.id, pseudo: c.pseudo }])).values()]}
        />
      )}

      {/* ═══ TAB: Elections ═══ */}
      {activeTab === "elections" && (
        <div className="space-y-8">
          {/* Chief election */}
          <ChiefElection
            election={chiefElection}
            results={chiefResults}
            membres={membres}
            myVote={myChiefVote}
            canStart={canStartChief}
            cantStartReason={cantStartChiefReason}
            isCouncilMember={isCouncilMember}
            memberCount={memberCount}
            hasChief={hasChief}
          />

          {/* Élection élève en cours */}
          {electionEleve && (
            <section className="rounded-2xl bg-white/[0.02] ring-1 ring-amber-500/15 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-amber-500/[0.08] to-transparent border-b border-amber-500/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white text-sm">Élection Élève en cours</h3>
                    <p className="text-[10px] text-white/30">3 sièges — vote des top 3 escouades</p>
                  </div>
                  {isProfOrAdmin && (
                    <div className="flex gap-2">
                      <button onClick={() => handleCloturer(electionEleve.id)} disabled={pending} className="px-4 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-medium ring-1 ring-emerald-500/20 transition-all disabled:opacity-50">
                        Clôturer
                      </button>
                      {votesAnnulationEleve?.aVote ? (
                        <button onClick={() => handleRetirerAnnulation(electionEleve.id)} disabled={pending} className="px-4 py-2 rounded-lg bg-red-500/20 text-red-300 text-xs font-medium ring-1 ring-red-500/30 transition-all disabled:opacity-50">
                          Annuler ({votesAnnulationEleve.votants.length}/{votesAnnulationEleve.seuilRequis}) ✓
                        </button>
                      ) : (
                        <button onClick={() => handleAnnuler(electionEleve.id)} disabled={pending} className="px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium ring-1 ring-red-500/20 transition-all disabled:opacity-50" title="75 % des profs/admins requis">
                          Annuler ({votesAnnulationEleve?.votants.length ?? 0}/{votesAnnulationEleve?.seuilRequis ?? '?'})
                        </button>
                      )}
                      {votesAnnulationEleve?.peutAnnulerDirectement && (
                        <button onClick={() => handleForceAnnuler(electionEleve.id)} disabled={pending} className="px-4 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-300 text-xs font-bold ring-1 ring-red-600/40 transition-all disabled:opacity-50" title="Annulation immédiate (Directeur / Co-Dir / Admin)">
                          ✕ Forcer
                        </button>
                      )}
                      {/* Unanimité PP */}
                      {votesAnnulationEleve?.estProfPrincipal && (
                        votesAnnulationEleve.aVotePP ? (
                          <button onClick={() => handleRetirerAnnulationPP(electionEleve.id)} disabled={pending} className="px-4 py-2 rounded-lg bg-orange-500/20 text-orange-300 text-xs font-bold ring-1 ring-orange-500/30 transition-all disabled:opacity-50" title="Retirer ma confirmation PP">
                            PP ({votesAnnulationEleve.nbVotesPP}/{votesAnnulationEleve.totalPP}) ✓
                          </button>
                        ) : (
                          <button onClick={() => handleForceAnnulerPP(electionEleve.id)} disabled={pending} className="px-4 py-2 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 text-xs font-bold ring-1 ring-orange-500/20 transition-all disabled:opacity-50" title="Unanimité des Profs Principaux requise">
                            PP ({votesAnnulationEleve.nbVotesPP}/{votesAnnulationEleve.totalPP})
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
                {isProfOrAdmin && votesAnnulationEleve && votesAnnulationEleve.votants.length > 0 && (
                  <div className="px-6 py-2 bg-red-500/[0.04] border-b border-red-500/10">
                    <p className="text-[10px] text-red-400/60">
                      Votes d&apos;annulation : {votesAnnulationEleve.votants.map(v => v.pseudo).join(', ')} ({votesAnnulationEleve.votants.length}/{votesAnnulationEleve.seuilRequis} — 75 % requis{votesAnnulationEleve.tousProfsPrincipauxOntVote ? ' · unanimité PP atteinte' : ''})
                    </p>
                  </div>
                )}
              </div>
              <div className="px-6 py-5 space-y-4">
                {/* Résultats */}
                {resultatsEleve.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2">Résultats actuels</p>
                    {resultatsEleve.map((c, idx) => (
                      <div key={c.utilisateur_id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02]">
                        <span className="text-xs font-mono text-white/25 w-5">{idx + 1}.</span>
                        <Avatar url={c.avatar_url} pseudo={c.pseudo} size="sm" />
                        <span className="text-sm text-white/70 flex-1 truncate">
                          {c.prenom_rp && c.nom_rp ? `${c.prenom_rp} ${c.nom_rp}` : c.pseudo}
                        </span>
                        <span className="text-sm font-bold text-amber-400">
                          {c.nb_votes}
                          <span className="text-[10px] ml-0.5 text-amber-400/50">
                            vote{c.nb_votes !== 1 ? "s" : ""}
                          </span>
                        </span>
                        {mesVotesEleve.includes(c.utilisateur_id) && (
                          <button
                            onClick={() => setConfirmCancelVote({
                              electionId: electionEleve.id,
                              candidatId: c.utilisateur_id,
                              candidatName: c.prenom_rp && c.nom_rp ? `${c.prenom_rp} ${c.nom_rp}` : c.pseudo,
                            })}
                            disabled={pending}
                            className="px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-medium ring-1 ring-red-500/20 transition-all disabled:opacity-50"
                          >
                            Retirer
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Vote interface */}
                {peutVoterEleveInfo?.canVote && (
                  <div>
                    <p className="text-xs text-emerald-400/70 mb-3">
                      {peutVoterEleveInfo.votesRestants} vote{(peutVoterEleveInfo.votesRestants ?? 0) > 1 ? "s" : ""} restant{(peutVoterEleveInfo.votesRestants ?? 0) > 1 ? "s" : ""}
                    </p>
                    <input
                      type="text"
                      placeholder="Rechercher un candidat…"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 ring-1 ring-white/10 text-white/80 text-sm placeholder:text-white/20 focus:ring-red-500/30 focus:outline-none mb-3 transition-all"
                    />
                    <div className="max-h-60 overflow-y-auto space-y-1">
                      {filteredCandidats
                        .filter((c) => c.id !== userId && !mesVotesEleve.includes(c.id) && !mesVotesBloquesEleve.includes(c.id))
                        .slice(0, 20)
                        .map((c) => (
                          <button
                            key={c.id}
                            onClick={() => handleVoteEleve(c.id)}
                            disabled={pending}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] hover:bg-amber-500/10 ring-1 ring-white/5 hover:ring-amber-500/20 text-left transition-all disabled:opacity-50"
                          >
                            <Avatar url={c.avatar_url} pseudo={c.pseudo} size="sm" />
                            <span className="text-sm text-white/70 truncate flex-1">
                              {c.prenom_rp && c.nom_rp ? `${c.prenom_rp} ${c.nom_rp}` : c.pseudo}
                            </span>
                            <span className="text-[10px] text-amber-400/60 uppercase">Voter</span>
                          </button>
                        ))}
                    </div>
                  </div>
                )}
                {peutVoterEleveInfo && !peutVoterEleveInfo.canVote && peutVoterEleveInfo.reason && (
                  <p className="text-xs text-white/30 italic">{peutVoterEleveInfo.reason}</p>
                )}
              </div>
            </section>
          )}

          {/* Élection staff en cours */}
          {electionStaff && isProfOrAdmin && (
            <section className="rounded-2xl bg-white/[0.02] ring-1 ring-red-500/15 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-red-500/[0.08] to-transparent border-b border-red-500/10">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-white text-sm">Élection Joker en cours</h3>
                    <p className="text-[10px] text-white/30">{electionStaff.nb_sieges} sièges ({electionStaff.nb_sieges - siegesJokerOccupes} restant{electionStaff.nb_sieges - siegesJokerOccupes > 1 ? "s" : ""}) — vote de l&apos;équipe professorale</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleCloturer(electionStaff.id)} disabled={pending} className="px-4 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-medium ring-1 ring-emerald-500/20 transition-all disabled:opacity-50">
                      Clôturer
                    </button>
                    {votesAnnulationStaff?.aVote ? (
                      <button onClick={() => handleRetirerAnnulation(electionStaff.id)} disabled={pending} className="px-4 py-2 rounded-lg bg-red-500/20 text-red-300 text-xs font-medium ring-1 ring-red-500/30 transition-all disabled:opacity-50">
                        Annuler ({votesAnnulationStaff.votants.length}/{votesAnnulationStaff.seuilRequis}) ✓
                      </button>
                    ) : (
                      <button onClick={() => handleAnnuler(electionStaff.id)} disabled={pending} className="px-4 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium ring-1 ring-red-500/20 transition-all disabled:opacity-50" title="75 % des profs/admins requis">
                        Annuler ({votesAnnulationStaff?.votants.length ?? 0}/{votesAnnulationStaff?.seuilRequis ?? '?'})
                      </button>
                    )}
                    {votesAnnulationStaff?.peutAnnulerDirectement && (
                      <button onClick={() => handleForceAnnuler(electionStaff.id)} disabled={pending} className="px-4 py-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 text-red-300 text-xs font-bold ring-1 ring-red-600/40 transition-all disabled:opacity-50" title="Annulation immédiate (Directeur / Co-Dir / Admin)">
                        ✕ Forcer
                      </button>
                    )}
                    {/* Unanimité PP */}
                    {votesAnnulationStaff?.estProfPrincipal && (
                      votesAnnulationStaff.aVotePP ? (
                        <button onClick={() => handleRetirerAnnulationPP(electionStaff.id)} disabled={pending} className="px-4 py-2 rounded-lg bg-orange-500/20 text-orange-300 text-xs font-bold ring-1 ring-orange-500/30 transition-all disabled:opacity-50" title="Retirer ma confirmation PP">
                          PP ({votesAnnulationStaff.nbVotesPP}/{votesAnnulationStaff.totalPP}) ✓
                        </button>
                      ) : (
                        <button onClick={() => handleForceAnnulerPP(electionStaff.id)} disabled={pending} className="px-4 py-2 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 text-xs font-bold ring-1 ring-orange-500/20 transition-all disabled:opacity-50" title="Unanimité des Profs Principaux requise">
                          PP ({votesAnnulationStaff.nbVotesPP}/{votesAnnulationStaff.totalPP})
                        </button>
                      )
                    )}
                  </div>
                </div>
                {votesAnnulationStaff && votesAnnulationStaff.votants.length > 0 && (
                  <div className="px-6 py-2 bg-red-500/[0.04] border-b border-red-500/10">
                    <p className="text-[10px] text-red-400/60">
                      Votes d&apos;annulation : {votesAnnulationStaff.votants.map(v => v.pseudo).join(', ')} ({votesAnnulationStaff.votants.length}/{votesAnnulationStaff.seuilRequis} — 75 % requis{votesAnnulationStaff.tousProfsPrincipauxOntVote ? ' · unanimité PP atteinte' : ''})
                    </p>
                  </div>
                )}
              </div>
              <div className="px-6 py-5 space-y-4">
                {resultatsStaff.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-white/30 uppercase tracking-widest mb-2">Résultats actuels</p>
                    {resultatsStaff.map((c, idx) => (
                      <div key={c.utilisateur_id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02]">
                        <span className="text-xs font-mono text-white/25 w-5">{idx + 1}.</span>
                        <Avatar url={c.avatar_url} pseudo={c.pseudo} size="sm" />
                        <span className="text-sm text-white/70 flex-1 truncate">
                          {c.prenom_rp && c.nom_rp ? `${c.prenom_rp} ${c.nom_rp}` : c.pseudo}
                        </span>
                        <span className="text-sm font-bold text-red-400">
                          {c.nb_votes}
                          <span className="text-[10px] ml-0.5 text-red-400/50">
                            vote{c.nb_votes !== 1 ? "s" : ""}
                          </span>
                        </span>
                        {mesVotesStaff.includes(c.utilisateur_id) && (
                          <button
                            onClick={() => setConfirmCancelVote({
                              electionId: electionStaff.id,
                              candidatId: c.utilisateur_id,
                              candidatName: c.prenom_rp && c.nom_rp ? `${c.prenom_rp} ${c.nom_rp}` : c.pseudo,
                            })}
                            disabled={pending}
                            className="px-2 py-1 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-medium ring-1 ring-red-500/20 transition-all disabled:opacity-50"
                          >
                            Retirer
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div>
                  <p className="text-xs text-red-400/70 mb-3">
                    Sélectionnez un candidat
                    {mesVotesStaff.length > 0 && ` (${maxVotesStaff - mesVotesStaff.length} vote(s) restant(s))`}
                  </p>
                  <input
                    type="text"
                    placeholder="Rechercher…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 ring-1 ring-white/10 text-white/80 text-sm placeholder:text-white/20 focus:ring-red-500/30 focus:outline-none mb-3 transition-all"
                  />
                  <div className="max-h-60 overflow-y-auto space-y-1">
                    {filteredCandidatsJoker
                      .filter((c) => !mesVotesStaff.includes(c.id) && !mesVotesBloquesStaff.includes(c.id))
                      .slice(0, 20)
                      .map((c) => (
                        <button
                          key={c.id}
                          onClick={() => handleVoteStaff(c.id)}
                          disabled={pending || mesVotesStaff.length >= maxVotesStaff}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] hover:bg-red-500/10 ring-1 ring-white/5 hover:ring-red-500/20 text-left transition-all disabled:opacity-50"
                        >
                          <Avatar url={c.avatar_url} pseudo={c.pseudo} size="sm" />
                          <span className="text-sm text-white/70 truncate flex-1">
                            {c.prenom_rp && c.nom_rp ? `${c.prenom_rp} ${c.nom_rp}` : c.pseudo}
                          </span>
                          <span className="text-[10px] text-red-400/60 uppercase">Voter</span>
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      )}

      {/* ═══ TAB: Admin (prof/admin only) ═══ */}
      {activeTab === "admin" && isProfOrAdmin && (
        <section className="space-y-6">
          <div className="rounded-2xl bg-white/[0.02] ring-1 ring-white/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5">
              <h3 className="font-bold text-white text-sm">Gestion du Conseil</h3>
            </div>
            <div className="px-6 py-5 space-y-6">
              {/* Launch elections */}
              <div>
                <h4 className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-3">
                  Lancer des élections
                </h4>
                <div className="flex gap-3">
                  {!electionEleve && (
                    <button
                      onClick={() => handleLancerElection("elu_eleve")}
                      disabled={pending}
                      className="px-5 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 text-sm font-medium ring-1 ring-amber-500/20 transition-all disabled:opacity-50"
                    >
                      Élection élève
                    </button>
                  )}
                  {!electionStaff && (
                    <button
                      onClick={() => handleLancerElection("elu_joker")}
                      disabled={pending}
                      className="px-5 py-2.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 text-sm font-medium ring-1 ring-red-500/20 transition-all disabled:opacity-50"
                    >
                      Élection Joker
                    </button>
                  )}
                  {electionEleve && electionStaff && (
                    <p className="text-xs text-white/30 italic">Les deux types d&apos;élection sont déjà en cours.</p>
                  )}
                </div>
              </div>

              {/* Direct nomination */}
              <div className="border-t border-white/5 pt-5">
                <h4 className="text-[10px] font-semibold text-white/30 uppercase tracking-widest mb-3">
                  Nomination directe
                </h4>
                <div className="flex gap-3 mb-3">
                  <button
                    onClick={() => setNommerType("elu_joker")}
                    className={`px-4 py-1.5 rounded-lg text-xs font-medium ring-1 transition-all ${
                      nommerType === "elu_joker"
                        ? "bg-red-500/20 text-red-400 ring-red-500/30"
                        : "bg-white/5 text-white/30 ring-white/10 hover:bg-white/10"
                    }`}
                  >
                    Siège Joker
                  </button>
                  <button
                    onClick={() => setNommerType("elu_eleve")}
                    className={`px-4 py-1.5 rounded-lg text-xs font-medium ring-1 transition-all ${
                      nommerType === "elu_eleve"
                        ? "bg-amber-500/20 text-amber-400 ring-amber-500/30"
                        : "bg-white/5 text-white/30 ring-white/10 hover:bg-white/10"
                    }`}
                  >
                    Siège Élève
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Rechercher un membre à nommer…"
                  value={nommerSearchTerm}
                  onChange={(e) => setNommerSearchTerm(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 ring-1 ring-white/10 text-white/80 text-sm placeholder:text-white/20 focus:ring-red-500/30 focus:outline-none mb-3 transition-all"
                />
                {nommerSearchTerm.length >= 2 && (
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {filteredNommerCandidats.slice(0, 15).map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleNommer(c.id)}
                        disabled={pending}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] hover:bg-emerald-500/10 ring-1 ring-white/5 hover:ring-emerald-500/20 text-left transition-all disabled:opacity-50"
                      >
                        <Avatar url={c.avatar_url} pseudo={c.pseudo} size="sm" />
                        <span className="text-sm text-white/70 truncate flex-1">
                          {c.prenom_rp && c.nom_rp ? `${c.prenom_rp} ${c.nom_rp}` : c.pseudo}
                        </span>
                        <span className="text-[10px] text-emerald-400/60 uppercase">Nommer</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
