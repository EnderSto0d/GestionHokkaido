import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import {
  getConseilMembres,
  getElectionsEnCours,
  getResultatsElection,
  getCandidatsPossibles,
  getCandidatsJokerPossibles,
  peutVoterEleve,
  getMesVotes,
  getVotesAnnulation,
  getMesVotesBloques,
} from "./actions";
import {
  canStartChiefElection,
  getChiefElection,
  getChiefElectionResults,
  getMyChiefVote,
  checkChiefDeposition,
  getPropositions,
  getPropositionsHistorique,
  getBansActifs,
  executerPropositionsEnAttente,
  isConseilMember,
} from "./conseil-actions";
import { ConseilClient } from "./conseil-client";

// ─── Métadonnées ──────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: "Conseil des Élèves — GestionHokkaido",
  description: "Conseil des élèves de l'École d'Exorcisme de Hokkaido : 7 membres élus, propositions et votes.",
};

// ─── Types locaux ─────────────────────────────────────────────────────────────

type UtilisateurRow = {
  role: string;
  grade_role: string | null;
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ConseilPage() {
  const supabase = await createClient();

  // 1. Vérifier la session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 2. Récupérer le rôle de l'utilisateur
  const { data: _utilisateur } = await supabase
    .from("utilisateurs")
    .select("role, grade_role")
    .eq("id", user.id)
    .single();

  const utilisateur = _utilisateur as UtilisateurRow | null;

  const isProfOrAdmin =
    utilisateur?.role === "professeur" || utilisateur?.role === "admin";
  const isDirector =
    utilisateur?.grade_role === "Directeur" ||
    utilisateur?.grade_role === "Co-Directeur";
  const isProfPrincipal = utilisateur?.grade_role === "Professeur Principal";

  // 3. Auto-checks on page load: deposition + execute pending proposals
  await Promise.all([
    checkChiefDeposition(),
    executerPropositionsEnAttente(),
  ]);

  // 4. Récupérer toutes les données en parallèle
  const [
    membres,
    elections,
    candidats,
    candidatsJoker,
    chiefEligibility,
    chiefElection,
    userIsCouncilMember,
    propositions,
    historique,
    bansActifs,
  ] = await Promise.all([
    getConseilMembres(),
    getElectionsEnCours(),
    getCandidatsPossibles(),
    getCandidatsJokerPossibles(),
    canStartChiefElection(),
    getChiefElection(),
    isConseilMember(user.id),
    getPropositions(),
    getPropositionsHistorique(),
    getBansActifs(),
  ]);

  const electionEleve = elections.find((e) => e.type === "elu_eleve");
  const electionStaff = elections.find((e) => e.type === "elu_joker");

  // 5. Récupérer les résultats & votes (dépend des étapes précédentes)
  const [
    resultatsEleve,
    resultatsStaff,
    mesVotesEleve,
    mesVotesStaff,
    peutVoterEleveInfo,
    chiefResults,
    myChiefVote,
    votesAnnulationEleve,
    votesAnnulationStaff,
    mesVotesBloquesEleve,
    mesVotesBloquesStaff,
  ] = await Promise.all([
    electionEleve ? getResultatsElection(electionEleve.id) : Promise.resolve([]),
    electionStaff ? getResultatsElection(electionStaff.id) : Promise.resolve([]),
    electionEleve ? getMesVotes(electionEleve.id) : Promise.resolve([]),
    electionStaff ? getMesVotes(electionStaff.id) : Promise.resolve([]),
    electionEleve ? peutVoterEleve(electionEleve.id) : Promise.resolve(null),
    chiefElection ? getChiefElectionResults(chiefElection.id) : Promise.resolve([]),
    chiefElection ? getMyChiefVote(chiefElection.id) : Promise.resolve(null),
    electionEleve ? getVotesAnnulation(electionEleve.id, user.id) : Promise.resolve(null),
    electionStaff ? getVotesAnnulation(electionStaff.id, user.id) : Promise.resolve(null),
    electionEleve ? getMesVotesBloques(electionEleve.id) : Promise.resolve([]),
    electionStaff ? getMesVotesBloques(electionStaff.id) : Promise.resolve([]),
  ]);

  return (
    <div className="relative min-h-screen bg-[#0a0505] overflow-hidden">
      {/* Background effects */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 select-none">
        <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-red-700/15 blur-[120px]" />
        <div className="absolute -bottom-40 -right-16 w-[520px] h-[520px] rounded-full bg-orange-600/10 blur-[140px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-amber-900/8 blur-[100px]" />
      </div>
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

      <div className="relative z-10 mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8 animate-fade-in">
        {/* Header */}
        <header className="mb-10">
          <p className="text-xs text-white/25 uppercase tracking-widest mb-5 font-medium">
            École d&apos;Exorcisme de Hokkaido&nbsp;&nbsp;/&nbsp;&nbsp;Conseil
          </p>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Conseil des{" "}
            <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              Élèves
            </span>
          </h1>
          <p className="mt-2 text-sm text-white/40">
            7 sièges : 4 escouades (orange), 1 classement personnel (rouge), 1 joker (violet), 1 chef (ambre).
            {userIsCouncilMember && (
              <span className="ml-2 text-amber-400/60">Vous êtes membre du conseil.</span>
            )}
          </p>
          <div className="mt-8 h-px bg-gradient-to-r from-amber-500/30 via-white/10 to-transparent" />
        </header>

        <ConseilClient
          membres={membres}
          elections={elections}
          resultatsEleve={resultatsEleve}
          resultatsStaff={resultatsStaff}
          candidats={candidats}
          candidatsJoker={candidatsJoker}
          mesVotesEleve={mesVotesEleve}
          mesVotesStaff={mesVotesStaff}
          mesVotesBloquesEleve={mesVotesBloquesEleve}
          mesVotesBloquesStaff={mesVotesBloquesStaff}
          peutVoterEleveInfo={peutVoterEleveInfo}
          isProfOrAdmin={isProfOrAdmin}
          isDirector={isDirector}
          isCouncilMember={userIsCouncilMember}
          userId={user.id}
          chiefElection={chiefElection}
          chiefResults={chiefResults}
          myChiefVote={myChiefVote}
          canStartChief={chiefEligibility.canStart}
          cantStartChiefReason={chiefEligibility.reason}
          memberCount={chiefEligibility.memberCount}
          hasChief={chiefEligibility.hasChief}
          propositions={propositions}
          historique={historique}
          bansActifs={bansActifs}
          votesAnnulationEleve={votesAnnulationEleve}
          votesAnnulationStaff={votesAnnulationStaff}
        />
      </div>
    </div>
  );
}
