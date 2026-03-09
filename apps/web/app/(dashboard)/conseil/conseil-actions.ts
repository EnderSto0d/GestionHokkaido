"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { ActionResult } from "./actions";

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_MEMBERS_FOR_ELECTION = 5;
const ELECTION_COOLDOWN_DAYS = 7;
const EXECUTION_DELAY_MS = 60 * 60 * 1000; // 1 hour
const MAX_BAN_HOURS = 168; // 1 week

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChiefElectionInfo = {
  id: string;
  statut: string;
  debut: string;
  fin: string | null;
  elu_id: string | null;
  cree_par: string;
};

export type ChiefElectionCandidat = {
  utilisateur_id: string;
  pseudo: string;
  avatar_url: string | null;
  prenom_rp: string | null;
  nom_rp: string | null;
  nb_votes: number;
};

export type Proposition = {
  id: string;
  type: "general" | "derank";
  titre: string;
  description: string | null;
  propose_par: string;
  proposeur_pseudo: string;
  statut: string;
  cible_id: string | null;
  cible_pseudo: string | null;
  duree_ban_heures: number | null;
  resolution_a: string | null;
  execute_apres: string | null;
  cree_le: string;
  votes: PropositionVote[];
  total_pour: number;
  total_contre: number;
  total_neutre: number;
};

export type PropositionVote = {
  votant_id: string;
  pseudo: string;
  vote: "pour" | "contre" | "neutre";
};

export type RankupBan = {
  id: string;
  utilisateur_id: string;
  pseudo: string;
  interdit_jusqua: string;
  actif: boolean;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function verifyAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

async function verifyConseilMember(): Promise<
  { userId: string; membreId: string; estChef: boolean } | { error: string }
> {
  const user = await verifyAuth();
  if (!user) return { error: "Non authentifié." };

  const admin = await createAdminClient();
  const { data } = await admin
    .from("conseil_membres")
    .select("id, est_chef")
    .eq("utilisateur_id", user.id)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const membre = data as any;
  if (!membre) return { error: "Vous n'êtes pas membre du conseil." };
  return { userId: user.id, membreId: membre.id, estChef: membre.est_chef ?? false };
}

async function isDirector(userId: string): Promise<boolean> {
  const admin = await createAdminClient();
  const { data } = await admin
    .from("utilisateurs")
    .select("grade_role")
    .eq("id", userId)
    .single();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const u = data as any;
  return u?.grade_role === "Directeur" || u?.grade_role === "Co-Directeur";
}

/** Check if all Professeurs Principaux have voted "contre" on a proposition */
async function allProfsPrincipauxOpposed(propositionId: string): Promise<boolean> {
  const admin = await createAdminClient();

  // Get all users with grade_role = "Professeur Principal"
  const { data: profs } = await admin
    .from("utilisateurs")
    .select("id")
    .eq("grade_role", "Professeur Principal");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profIds = ((profs ?? []) as any[]).map((p) => p.id);
  if (profIds.length === 0) return false; // no profs principaux → no veto

  // Get their votes on this proposition
  const { data: votes } = await admin
    .from("conseil_votes_proposition")
    .select("votant_id, vote")
    .eq("proposition_id", propositionId)
    .in("votant_id", profIds);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allVotes = (votes ?? []) as any[];

  // ALL profs principaux must have voted "contre"
  if (allVotes.length < profIds.length) return false; // not all have voted
  return allVotes.every((v) => v.vote === "contre");
}

async function getActiveMemberCount(): Promise<number> {
  const admin = await createAdminClient();
  const { count } = await admin
    .from("conseil_membres")
    .select("id", { count: "exact", head: true });
  return count ?? 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHIEF ELECTION SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

/** Check if a chief election can be started */
export async function canStartChiefElection(): Promise<{
  canStart: boolean;
  reason?: string;
  memberCount: number;
  hasChief: boolean;
  lastElectionDate: string | null;
}> {
  const admin = await createAdminClient();

  const memberCount = await getActiveMemberCount();
  const hasChief = await hasActiveChief();

  // Check last election date
  const { data: lastElection } = await admin
    .from("conseil_elections_chef")
    .select("fin")
    .eq("statut", "terminee")
    .order("fin", { ascending: false })
    .limit(1)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lastDate = (lastElection as any)?.fin ?? null;

  if (memberCount < MIN_MEMBERS_FOR_ELECTION) {
    return {
      canStart: false,
      reason: `Il faut au moins ${MIN_MEMBERS_FOR_ELECTION} membres actifs (actuellement ${memberCount}).`,
      memberCount,
      hasChief,
      lastElectionDate: lastDate,
    };
  }

  if (lastDate) {
    const daysSince = (Date.now() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince < ELECTION_COOLDOWN_DAYS) {
      const daysLeft = Math.ceil(ELECTION_COOLDOWN_DAYS - daysSince);
      return {
        canStart: false,
        reason: `La dernière élection date de moins de ${ELECTION_COOLDOWN_DAYS} jours. Réessayez dans ${daysLeft} jour(s).`,
        memberCount,
        hasChief,
        lastElectionDate: lastDate,
      };
    }
  }

  // Check no election in progress
  const { data: enCours } = await admin
    .from("conseil_elections_chef")
    .select("id")
    .eq("statut", "en_cours")
    .limit(1);

  if (enCours && enCours.length > 0) {
    return {
      canStart: false,
      reason: "Une élection du Chef est déjà en cours.",
      memberCount,
      hasChief,
      lastElectionDate: lastDate,
    };
  }

  return { canStart: true, memberCount, hasChief, lastElectionDate: lastDate };
}

/** Check if there is currently an active chief */
export async function hasActiveChief(): Promise<boolean> {
  const admin = await createAdminClient();
  const { data } = await admin
    .from("conseil_membres")
    .select("id")
    .eq("est_chef", true)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

/** Get current chief election in progress */
export async function getChiefElection(): Promise<ChiefElectionInfo | null> {
  const admin = await createAdminClient();
  const { data } = await admin
    .from("conseil_elections_chef")
    .select("id, statut, debut, fin, elu_id, cree_par")
    .eq("statut", "en_cours")
    .order("debut", { ascending: false })
    .limit(1)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any) ?? null;
}

/** Get chief election results (votes per candidate) */
export async function getChiefElectionResults(
  electionId: string
): Promise<ChiefElectionCandidat[]> {
  const admin = await createAdminClient();

  const { data: votes } = await admin
    .from("conseil_votes_chef")
    .select("candidat_id")
    .eq("election_id", electionId);

  if (!votes || votes.length === 0) return [];

  const voteCount: Record<string, number> = {};
  for (const v of votes) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cid = (v as any).candidat_id;
    voteCount[cid] = (voteCount[cid] ?? 0) + 1;
  }

  const candidatIds = Object.keys(voteCount);
  const { data: candidats } = await admin
    .from("utilisateurs")
    .select("id, pseudo, avatar_url, prenom_rp, nom_rp")
    .in("id", candidatIds);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((candidats ?? []) as any[])
    .map((c) => ({
      utilisateur_id: c.id,
      pseudo: c.pseudo,
      avatar_url: c.avatar_url,
      prenom_rp: c.prenom_rp,
      nom_rp: c.nom_rp,
      nb_votes: voteCount[c.id] ?? 0,
    }))
    .sort((a, b) => b.nb_votes - a.nb_votes);
}

/** Get my vote in the chief election */
export async function getMyChiefVote(electionId: string): Promise<string | null> {
  const user = await verifyAuth();
  if (!user) return null;
  const admin = await createAdminClient();
  const { data } = await admin
    .from("conseil_votes_chef")
    .select("candidat_id")
    .eq("election_id", electionId)
    .eq("votant_id", user.id)
    .single();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any)?.candidat_id ?? null;
}

/** Start a chief election (council members only) */
export async function lancerElectionChef(): Promise<ActionResult> {
  const auth = await verifyConseilMember();
  if ("error" in auth) return { success: false, error: auth.error };

  const eligibility = await canStartChiefElection();
  if (!eligibility.canStart) {
    return { success: false, error: eligibility.reason ?? "Impossible de lancer l'élection." };
  }

  const admin = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from("conseil_elections_chef") as any).insert({
    statut: "en_cours",
    cree_par: auth.userId,
  });

  if (error) return { success: false, error: "Erreur lors du lancement de l'élection." };

  revalidatePath("/conseil");
  return { success: true };
}

/** Vote for a chief candidate (council members only, one vote each) */
export async function voterChef(
  electionId: string,
  candidatId: string
): Promise<ActionResult> {
  const auth = await verifyConseilMember();
  if ("error" in auth) return { success: false, error: auth.error };

  // Candidate must be a council member
  const admin = await createAdminClient();
  const { data: isMember } = await admin
    .from("conseil_membres")
    .select("id")
    .eq("utilisateur_id", candidatId)
    .limit(1);

  if (!isMember || isMember.length === 0) {
    return { success: false, error: "Le candidat doit être membre du conseil." };
  }

  // Check election is active
  const { data: election } = await admin
    .from("conseil_elections_chef")
    .select("statut")
    .eq("id", electionId)
    .single();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!election || (election as any).statut !== "en_cours") {
    return { success: false, error: "Élection non en cours." };
  }

  // Upsert vote (change vote if already voted)
  const { data: existing } = await admin
    .from("conseil_votes_chef")
    .select("id")
    .eq("election_id", electionId)
    .eq("votant_id", auth.userId)
    .single();

  if (existing) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from("conseil_votes_chef") as any)
      .update({ candidat_id: candidatId })
      .eq("id", (existing as any).id);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin.from("conseil_votes_chef") as any).insert({
      election_id: electionId,
      votant_id: auth.userId,
      candidat_id: candidatId,
    });
    if (error) return { success: false, error: "Erreur lors du vote." };
  }

  revalidatePath("/conseil");
  return { success: true };
}

/** Conclude the chief election — elect the winner */
export async function cloturerElectionChef(electionId: string): Promise<ActionResult> {
  const auth = await verifyConseilMember();
  if ("error" in auth) return { success: false, error: auth.error };

  const admin = await createAdminClient();
  const results = await getChiefElectionResults(electionId);

  if (results.length === 0) {
    return { success: false, error: "Aucun vote enregistré." };
  }

  const winner = results[0];

  // Remove old chief
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.from("conseil_membres") as any)
    .update({ est_chef: false })
    .eq("est_chef", true);

  // Set new chief
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.from("conseil_membres") as any)
    .update({ est_chef: true })
    .eq("utilisateur_id", winner.utilisateur_id);

  // Close election
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.from("conseil_elections_chef") as any)
    .update({
      statut: "terminee",
      fin: new Date().toISOString(),
      elu_id: winner.utilisateur_id,
    })
    .eq("id", electionId);

  revalidatePath("/conseil");
  return { success: true };
}

/** Auto-check: depose chief if promoted to exo pro or member count < 5 */
export async function checkChiefDeposition(): Promise<{
  deposited: boolean;
  reason?: string;
}> {
  const admin = await createAdminClient();

  const { data: chef } = await admin
    .from("conseil_membres")
    .select("id, utilisateur_id")
    .eq("est_chef", true)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!chef) return { deposited: false };
  const chefData = chef as any;

  // Check if promoted to "Exorciste Pro" (exo pro)
  const { data: userData } = await admin
    .from("utilisateurs")
    .select("grade_role")
    .eq("id", chefData.utilisateur_id)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gradeRole = (userData as any)?.grade_role;
  if (gradeRole === "Exorciste Pro") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from("conseil_membres") as any)
      .update({ est_chef: false })
      .eq("id", chefData.id);
    return { deposited: true, reason: "Promu Exorciste Pro." };
  }

  // Check member count
  const count = await getActiveMemberCount();
  if (count < MIN_MEMBERS_FOR_ELECTION) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from("conseil_membres") as any)
      .update({ est_chef: false })
      .eq("id", chefData.id);
    return { deposited: true, reason: `Nombre de membres insuffisant (${count}/${MIN_MEMBERS_FOR_ELECTION}).` };
  }

  return { deposited: false };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROPOSAL / VOTING SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

/** Get all active propositions */
export async function getPropositions(): Promise<Proposition[]> {
  const admin = await createAdminClient();

  const { data: props } = await admin
    .from("conseil_propositions")
    .select("*")
    .in("statut", ["en_cours", "validee", "refusee"])
    .order("cree_le", { ascending: false });

  if (!props || props.length === 0) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const propositions = props as any[];

  // Get all related votes
  const propIds = propositions.map((p) => p.id);
  const { data: allVotes } = await admin
    .from("conseil_votes_proposition")
    .select("proposition_id, votant_id, vote")
    .in("proposition_id", propIds);

  // Get unique user IDs for pseudo resolution
  const userIds = new Set<string>();
  propositions.forEach((p) => {
    userIds.add(p.propose_par);
    if (p.cible_id) userIds.add(p.cible_id);
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (allVotes ?? []).forEach((v: any) => userIds.add(v.votant_id));

  const { data: users } = await admin
    .from("utilisateurs")
    .select("id, pseudo")
    .in("id", Array.from(userIds));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userMap: Record<string, string> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (users ?? []).forEach((u: any) => {
    userMap[u.id] = u.pseudo;
  });

  return propositions.map((p) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const propVotes = ((allVotes ?? []) as any[]).filter(
      (v) => v.proposition_id === p.id
    );
    const votes: PropositionVote[] = propVotes.map((v) => ({
      votant_id: v.votant_id,
      pseudo: userMap[v.votant_id] ?? "Inconnu",
      vote: v.vote,
    }));

    return {
      id: p.id,
      type: p.type,
      titre: p.titre,
      description: p.description,
      propose_par: p.propose_par,
      proposeur_pseudo: userMap[p.propose_par] ?? "Inconnu",
      statut: p.statut,
      cible_id: p.cible_id,
      cible_pseudo: p.cible_id ? (userMap[p.cible_id] ?? "Inconnu") : null,
      duree_ban_heures: p.duree_ban_heures,
      resolution_a: p.resolution_a,
      execute_apres: p.execute_apres,
      cree_le: p.cree_le,
      votes,
      total_pour: votes.filter((v) => v.vote === "pour").length,
      total_contre: votes.filter((v) => v.vote === "contre").length,
      total_neutre: votes.filter((v) => v.vote === "neutre").length,
    };
  });
}

/** Get closed/executed propositions for history */
export async function getPropositionsHistorique(): Promise<Proposition[]> {
  const admin = await createAdminClient();

  const { data: props } = await admin
    .from("conseil_propositions")
    .select("*")
    .in("statut", ["executee", "rejetee", "annulee"])
    .order("cree_le", { ascending: false })
    .limit(20);

  if (!props || props.length === 0) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const propositions = props as any[];
  const propIds = propositions.map((p) => p.id);

  const { data: allVotes } = await admin
    .from("conseil_votes_proposition")
    .select("proposition_id, votant_id, vote")
    .in("proposition_id", propIds);

  const userIds = new Set<string>();
  propositions.forEach((p) => {
    userIds.add(p.propose_par);
    if (p.cible_id) userIds.add(p.cible_id);
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (allVotes ?? []).forEach((v: any) => userIds.add(v.votant_id));

  const { data: users } = await admin
    .from("utilisateurs")
    .select("id, pseudo")
    .in("id", Array.from(userIds));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userMap: Record<string, string> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (users ?? []).forEach((u: any) => {
    userMap[u.id] = u.pseudo;
  });

  return propositions.map((p) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const propVotes = ((allVotes ?? []) as any[]).filter(
      (v) => v.proposition_id === p.id
    );
    const votes: PropositionVote[] = propVotes.map((v) => ({
      votant_id: v.votant_id,
      pseudo: userMap[v.votant_id] ?? "Inconnu",
      vote: v.vote,
    }));

    return {
      id: p.id,
      type: p.type,
      titre: p.titre,
      description: p.description,
      propose_par: p.propose_par,
      proposeur_pseudo: userMap[p.propose_par] ?? "Inconnu",
      statut: p.statut,
      cible_id: p.cible_id,
      cible_pseudo: p.cible_id ? (userMap[p.cible_id] ?? "Inconnu") : null,
      duree_ban_heures: p.duree_ban_heures,
      resolution_a: p.resolution_a,
      execute_apres: p.execute_apres,
      cree_le: p.cree_le,
      votes,
      total_pour: votes.filter((v) => v.vote === "pour").length,
      total_contre: votes.filter((v) => v.vote === "contre").length,
      total_neutre: votes.filter((v) => v.vote === "neutre").length,
    };
  });
}

/** Create a new general proposal */
export async function creerProposition(
  titre: string,
  description: string
): Promise<ActionResult> {
  const auth = await verifyConseilMember();
  if ("error" in auth) return { success: false, error: auth.error };

  if (!titre.trim()) return { success: false, error: "Le titre est requis." };

  const admin = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from("conseil_propositions") as any).insert({
    type: "general",
    titre: titre.trim(),
    description: description.trim() || null,
    propose_par: auth.userId,
    statut: "en_cours",
  });

  if (error) return { success: false, error: "Erreur lors de la création." };

  revalidatePath("/conseil");
  return { success: true };
}

/** Create a derank proposal */
export async function creerPropositionDerank(
  cibleId: string,
  dureeHeures: number,
  description: string
): Promise<ActionResult> {
  const auth = await verifyConseilMember();
  if ("error" in auth) return { success: false, error: auth.error };

  if (dureeHeures < 1 || dureeHeures > MAX_BAN_HOURS) {
    return { success: false, error: `La durée du ban doit être entre 1h et ${MAX_BAN_HOURS}h (1 semaine).` };
  }

  const admin = await createAdminClient();

  // Get target user info
  const { data: cible } = await admin
    .from("utilisateurs")
    .select("pseudo")
    .eq("id", cibleId)
    .single();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!cible) return { success: false, error: "Utilisateur cible introuvable." };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from("conseil_propositions") as any).insert({
    type: "derank",
    titre: `Déclassement de ${(cible as any).pseudo}`,
    description: description.trim() || null,
    propose_par: auth.userId,
    statut: "en_cours",
    cible_id: cibleId,
    duree_ban_heures: dureeHeures,
  });

  if (error) return { success: false, error: "Erreur lors de la création." };

  revalidatePath("/conseil");
  return { success: true };
}

/** Vote on a proposition (pour/contre/neutre) — council members only */
export async function voterProposition(
  propositionId: string,
  vote: "pour" | "contre" | "neutre"
): Promise<ActionResult> {
  const auth = await verifyConseilMember();
  if ("error" in auth) return { success: false, error: auth.error };

  const admin = await createAdminClient();

  // Check proposition is still votable
  const { data: prop } = await admin
    .from("conseil_propositions")
    .select("statut")
    .eq("id", propositionId)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const statut = (prop as any)?.statut;
  if (!statut || !["en_cours", "validee", "refusee"].includes(statut)) {
    return { success: false, error: "Cette proposition n'est plus ouverte au vote." };
  }

  // Upsert vote
  const { data: existing } = await admin
    .from("conseil_votes_proposition")
    .select("id")
    .eq("proposition_id", propositionId)
    .eq("votant_id", auth.userId)
    .single();

  if (existing) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from("conseil_votes_proposition") as any)
      .update({ vote, mis_a_jour_le: new Date().toISOString() })
      .eq("id", (existing as any).id);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin.from("conseil_votes_proposition") as any).insert({
      proposition_id: propositionId,
      votant_id: auth.userId,
      vote,
    });
    if (error) return { success: false, error: "Erreur lors du vote." };
  }

  // Recalculate vote status and update proposition
  await recalculerStatutProposition(propositionId);

  revalidatePath("/conseil");
  return { success: true };
}

/** Recalculate proposition status based on votes */
async function recalculerStatutProposition(propositionId: string): Promise<void> {
  const admin = await createAdminClient();

  const memberCount = await getActiveMemberCount();
  const quorum = Math.ceil(memberCount / 2); // 50% must cast definitive vote

  // Get all votes
  const { data: votes } = await admin
    .from("conseil_votes_proposition")
    .select("votant_id, vote")
    .eq("proposition_id", propositionId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allVotes = (votes ?? []) as any[];
  const pour = allVotes.filter((v) => v.vote === "pour").length;
  const contre = allVotes.filter((v) => v.vote === "contre").length;
  const definitiveVotes = pour + contre;

  // ── Veto: si TOUS les Professeurs Principaux votent "contre", annulation ──
  const vetoTriggered = await allProfsPrincipauxOpposed(propositionId);
  if (vetoTriggered) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from("conseil_propositions") as any)
      .update({
        statut: "annulee",
        resolution_a: new Date().toISOString(),
        execute_apres: null,
        mis_a_jour_le: new Date().toISOString(),
      })
      .eq("id", propositionId);
    return;
  }

  // Get current proposition state
  const { data: propData } = await admin
    .from("conseil_propositions")
    .select("statut, resolution_a")
    .eq("id", propositionId)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentStatut = (propData as any)?.statut;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentResolution = (propData as any)?.resolution_a;

  // Check quorum
  if (definitiveVotes < quorum) {
    // Not enough definitive votes — if it was in resolved state, revert
    if (currentStatut === "validee" || currentStatut === "refusee") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin.from("conseil_propositions") as any)
        .update({ statut: "en_cours", resolution_a: null, execute_apres: null, mis_a_jour_le: new Date().toISOString() })
        .eq("id", propositionId);
    }
    return;
  }

  // Determine outcome
  let newStatut: string;
  if (pour > contre) {
    newStatut = "validee";
  } else if (contre > pour) {
    newStatut = "refusee";
  } else {
    // Tie — check chief's vote as tiebreaker
    const { data: chef } = await admin
      .from("conseil_membres")
      .select("utilisateur_id")
      .eq("est_chef", true)
      .single();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chefId = (chef as any)?.utilisateur_id;
    if (chefId) {
      const chefVote = allVotes.find((v) => v.votant_id === chefId);
      if (chefVote?.vote === "pour") {
        newStatut = "validee";
      } else if (chefVote?.vote === "contre") {
        newStatut = "refusee";
      } else {
        // Chief voted neutral or hasn't voted — vote remains open
        if (currentStatut === "validee" || currentStatut === "refusee") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (admin.from("conseil_propositions") as any)
            .update({ statut: "en_cours", resolution_a: null, execute_apres: null, mis_a_jour_le: new Date().toISOString() })
            .eq("id", propositionId);
        }
        return;
      }
    } else {
      // No chief — tie remains open
      return;
    }
  }

  // Only set timer if status changed
  if (currentStatut !== newStatut) {
    const now = new Date();
    const executeAfter = new Date(now.getTime() + EXECUTION_DELAY_MS);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from("conseil_propositions") as any)
      .update({
        statut: newStatut,
        resolution_a: now.toISOString(),
        execute_apres: executeAfter.toISOString(),
        mis_a_jour_le: now.toISOString(),
      })
      .eq("id", propositionId);
  }
}

/** Execute propositions that have passed the 1-hour buffer.
 *  This should be called periodically (e.g., via cron or on page load).
 */
export async function executerPropositionsEnAttente(): Promise<{
  executed: number;
  reversed: number;
}> {
  const admin = await createAdminClient();
  const now = new Date().toISOString();

  // Get all propositions past their execution time
  const { data: readyProps } = await admin
    .from("conseil_propositions")
    .select("*")
    .in("statut", ["validee", "refusee"])
    .lte("execute_apres", now);

  let executed = 0;
  let reversed = 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const prop of ((readyProps ?? []) as any[])) {
    if (prop.statut === "validee") {
      // Execute the approved action
      if (prop.type === "derank" && prop.cible_id) {
        await executerDerank(prop.id, prop.cible_id, prop.duree_ban_heures ?? 24);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin.from("conseil_propositions") as any)
        .update({ statut: "executee", mis_a_jour_le: now })
        .eq("id", prop.id);
      executed++;
    } else if (prop.statut === "refusee") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin.from("conseil_propositions") as any)
        .update({ statut: "rejetee", mis_a_jour_le: now })
        .eq("id", prop.id);
      reversed++;
    }
  }

  if (executed > 0 || reversed > 0) {
    revalidatePath("/conseil");
  }

  return { executed, reversed };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DERANK SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

/** Execute a derank: demote user by one grade and apply rank-up ban */
async function executerDerank(
  propositionId: string,
  cibleId: string,
  banHeures: number
): Promise<void> {
  const admin = await createAdminClient();

  // Grade hierarchy for demotion
  const gradeHierarchy = [
    "Classe 4",
    "Classe 3",
    "Semi Classe 2",
    "Classe 2",
    "Semi Classe 1",
    "Classe 1",
    "Semi Classe S",
    "Classe S",
    "Classe Apo",
  ];

  const { data: userData } = await admin
    .from("utilisateurs")
    .select("grade")
    .eq("id", cibleId)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentGrade = (userData as any)?.grade;

  if (currentGrade) {
    const idx = gradeHierarchy.indexOf(currentGrade);
    if (idx > 0) {
      const newGrade = gradeHierarchy[idx - 1];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin.from("utilisateurs") as any)
        .update({ grade: newGrade, mis_a_jour_le: new Date().toISOString() })
        .eq("id", cibleId);
    }
  }

  // Apply rank-up ban
  const banExpiry = new Date(Date.now() + banHeures * 60 * 60 * 1000);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.from("conseil_rankup_bans") as any).insert({
    utilisateur_id: cibleId,
    proposition_id: propositionId,
    interdit_jusqua: banExpiry.toISOString(),
    actif: true,
  });
}

/** Director-only: lift a rank-up ban */
export async function leverBanRankup(banId: string): Promise<ActionResult> {
  const user = await verifyAuth();
  if (!user) return { success: false, error: "Non authentifié." };

  if (!(await isDirector(user.id))) {
    return { success: false, error: "Seuls les directeurs peuvent lever un ban de rank-up." };
  }

  const admin = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from("conseil_rankup_bans") as any)
    .update({
      actif: false,
      leve_par: user.id,
      leve_le: new Date().toISOString(),
    })
    .eq("id", banId);

  if (error) return { success: false, error: "Erreur lors de la levée du ban." };

  revalidatePath("/conseil");
  return { success: true };
}

/** Get active rank-up bans */
export async function getBansActifs(): Promise<RankupBan[]> {
  const admin = await createAdminClient();

  const { data: bans } = await admin
    .from("conseil_rankup_bans")
    .select("id, utilisateur_id, interdit_jusqua, actif")
    .eq("actif", true)
    .gte("interdit_jusqua", new Date().toISOString());

  if (!bans || bans.length === 0) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userIds = (bans as any[]).map((b) => b.utilisateur_id);
  const { data: users } = await admin
    .from("utilisateurs")
    .select("id, pseudo")
    .in("id", userIds);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userMap: Record<string, string> = {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (users ?? []).forEach((u: any) => { userMap[u.id] = u.pseudo; });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (bans as any[]).map((b) => ({
    id: b.id,
    utilisateur_id: b.utilisateur_id,
    pseudo: userMap[b.utilisateur_id] ?? "Inconnu",
    interdit_jusqua: b.interdit_jusqua,
    actif: b.actif,
  }));
}

/** Check if a user is currently council member */
export async function isConseilMember(userId?: string): Promise<boolean> {
  if (!userId) {
    const user = await verifyAuth();
    if (!user) return false;
    userId = user.id;
  }
  const admin = await createAdminClient();
  const { data } = await admin
    .from("conseil_membres")
    .select("id")
    .eq("utilisateur_id", userId)
    .limit(1);
  return (data?.length ?? 0) > 0;
}
