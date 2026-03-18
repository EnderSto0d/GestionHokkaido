"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  addDiscordRoleToMember,
  removeDiscordRoleFromMember,
} from "@/lib/discord/guild-member";

// ─── Constants ────────────────────────────────────────────────────────────────

const DISCORD_BUREAU_ROLE_ID = "1482945710885310530";
const DISCORD_GUILD_ID = "1456715316313981153";
const MAX_NOMME_SEATS = 4;
const SITE_ID = process.env.NEXT_PUBLIC_SITE_ID ?? "tokyo";

// Grade roles eligible for bureau membership (Exorciste Pro or higher)
const ELIGIBLE_GRADE_ROLES = ["Exorciste Pro", "Professeur", "Professeur Principal", "Co-Directeur", "Directeur"];

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActionResult =
  | { success: true }
  | { success: false; error: string };

export type BureauMembre = {
  id: string;
  utilisateur_id: string;
  type_siege: "nomme" | "elu";
  est_chef: boolean;
  nomme_par: string | null;
  nomme_le: string;
  pseudo: string;
  avatar_url: string | null;
  grade_role: string | null;
  prenom_rp: string | null;
  nom_rp: string | null;
};

export type BureauElection = {
  id: string;
  statut: "en_cours" | "terminee" | "annulee";
  debut: string;
  fin: string | null;
  elu_id: string | null;
};

export type BureauCandidatVotes = {
  utilisateur_id: string;
  pseudo: string;
  avatar_url: string | null;
  prenom_rp: string | null;
  nom_rp: string | null;
  nb_votes: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Vérifie que l'utilisateur courant est Directeur ou Co-Directeur.
 * Retourne l'ID de l'utilisateur si autorisé, sinon null.
 */
async function getCurrentDirector(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = await createAdminClient();
  const { data } = await admin
    .from("utilisateurs")
    .select("id, grade_role")
    .eq("id", user.id)
    .single();

  if (!data) return null;
  if (
    data.grade_role !== "Directeur" &&
    data.grade_role !== "Co-Directeur"
  ) {
    return null;
  }
  return data.id;
}

// ─── Read Actions ─────────────────────────────────────────────────────────────

/**
 * Récupère tous les membres du bureau pour ce site, enrichis avec les données utilisateur.
 */
export async function getBureauMembres(): Promise<BureauMembre[]> {
  const admin = await createAdminClient();

  const { data, error } = await admin
    .from("bureau_membres")
    .select(
      `
      id,
      utilisateur_id,
      type_siege,
      est_chef,
      nomme_par,
      nomme_le,
      utilisateurs!bureau_membres_utilisateur_id_fkey (
        pseudo,
        avatar_url,
        grade_role,
        prenom_rp,
        nom_rp
      )
    `
    )
    .eq("site_id", SITE_ID)
    .order("nomme_le", { ascending: true });

  if (error) {
    console.error("[getBureauMembres] Erreur Supabase:", error);
    return [];
  }

  if (!data) return [];

  return data.map((row) => {
    const u = Array.isArray(row.utilisateurs)
      ? row.utilisateurs[0]
      : row.utilisateurs;
    return {
      id: row.id,
      utilisateur_id: row.utilisateur_id,
      type_siege: row.type_siege as "nomme" | "elu",
      est_chef: row.est_chef,
      nomme_par: row.nomme_par,
      nomme_le: row.nomme_le,
      pseudo: u?.pseudo ?? "Inconnu",
      avatar_url: u?.avatar_url ?? null,
      grade_role: u?.grade_role ?? null,
      prenom_rp: u?.prenom_rp ?? null,
      nom_rp: u?.nom_rp ?? null,
    };
  });
}

/**
 * Récupère l'élection du bureau en cours pour ce site, ou null s'il n'y en a pas.
 */
export async function getBureauElection(): Promise<BureauElection | null> {
  const admin = await createAdminClient();

  const { data, error } = await admin
    .from("bureau_elections")
    .select("id, statut, debut, fin, elu_id")
    .eq("site_id", SITE_ID)
    .eq("statut", "en_cours")
    .order("debut", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[getBureauElection] Erreur Supabase:", error);
    return null;
  }

  if (!data) return null;

  return {
    id: data.id,
    statut: data.statut as "en_cours" | "terminee" | "annulee",
    debut: data.debut,
    fin: data.fin ?? null,
    elu_id: data.elu_id ?? null,
  };
}

/**
 * Récupère les résultats d'une élection (candidats + nombre de votes), triés par votes décroissants.
 */
export async function getBureauElectionResults(
  electionId: string
): Promise<BureauCandidatVotes[]> {
  const admin = await createAdminClient();

  // Récupère tous les votes pour cette élection
  const { data: votes, error } = await admin
    .from("bureau_votes")
    .select(
      `
      candidat_id,
      utilisateurs!bureau_votes_candidat_id_fkey (
        pseudo,
        avatar_url,
        prenom_rp,
        nom_rp
      )
    `
    )
    .eq("election_id", electionId);

  if (error) {
    console.error("[getBureauElectionResults] Erreur Supabase:", error);
    return [];
  }

  if (!votes || votes.length === 0) return [];

  // Agrège les votes par candidat
  const counts = new Map<
    string,
    {
      pseudo: string;
      avatar_url: string | null;
      prenom_rp: string | null;
      nom_rp: string | null;
      nb_votes: number;
    }
  >();

  for (const vote of votes) {
    const u = Array.isArray(vote.utilisateurs)
      ? vote.utilisateurs[0]
      : vote.utilisateurs;
    const existing = counts.get(vote.candidat_id);
    if (existing) {
      existing.nb_votes += 1;
    } else {
      counts.set(vote.candidat_id, {
        pseudo: u?.pseudo ?? "Inconnu",
        avatar_url: u?.avatar_url ?? null,
        prenom_rp: u?.prenom_rp ?? null,
        nom_rp: u?.nom_rp ?? null,
        nb_votes: 1,
      });
    }
  }

  const results: BureauCandidatVotes[] = Array.from(counts.entries()).map(
    ([utilisateur_id, info]) => ({
      utilisateur_id,
      ...info,
    })
  );

  // Trier par nb_votes décroissant
  results.sort((a, b) => b.nb_votes - a.nb_votes);

  return results;
}

/**
 * Retourne le candidat_id pour lequel l'utilisateur courant a voté dans cette élection, ou null.
 */
export async function getMyBureauVote(
  electionId: string
): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = await createAdminClient();

  const { data, error } = await admin
    .from("bureau_votes")
    .select("candidat_id")
    .eq("election_id", electionId)
    .eq("votant_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[getMyBureauVote] Erreur Supabase:", error);
    return null;
  }

  return data?.candidat_id ?? null;
}

/**
 * Récupère tous les utilisateurs du site pouvant être candidats (non encore membres du bureau).
 */
export async function getCandidatsBureau(): Promise<
  { id: string; pseudo: string; avatar_url: string | null }[]
> {
  const admin = await createAdminClient();

  // Récupère les IDs déjà membres du bureau pour ce site
  const { data: membres, error: membresError } = await admin
    .from("bureau_membres")
    .select("utilisateur_id")
    .eq("site_id", SITE_ID);

  if (membresError) {
    console.error("[getCandidatsBureau] Erreur récupération membres:", membresError);
    return [];
  }

  const membresIds = (membres ?? []).map((m) => m.utilisateur_id);

  // Récupère les utilisateurs Exorciste Pro ou + excluant les membres actuels
  // Note: pas de filtre site_id car ce champ peut être null pour certains utilisateurs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (admin.from("utilisateurs") as any)
    .select("id, pseudo, avatar_url")
    .in("grade_role", ELIGIBLE_GRADE_ROLES)
    .order("pseudo", { ascending: true });

  if (membresIds.length > 0) {
    query = query.not("id", "in", `(${membresIds.join(",")})`);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[getCandidatsBureau] Erreur Supabase:", error);
    return [];
  }

  return (data ?? []).map((u: { id: string; pseudo: string | null; avatar_url: string | null }) => ({
    id: u.id,
    pseudo: u.pseudo ?? "Inconnu",
    avatar_url: u.avatar_url ?? null,
  }));
}

/**
 * Vérifie si un utilisateur est membre du bureau pour ce site.
 */
export async function isBureauMember(userId: string): Promise<boolean> {
  const admin = await createAdminClient();

  const { data, error } = await admin
    .from("bureau_membres")
    .select("id")
    .eq("utilisateur_id", userId)
    .eq("site_id", SITE_ID)
    .maybeSingle();

  if (error) {
    console.error("[isBureauMember] Erreur Supabase:", error);
    return false;
  }

  return data !== null;
}

// ─── Write Actions ────────────────────────────────────────────────────────────

/**
 * Nomme un utilisateur comme membre du bureau (siège 'nomme').
 * Réservé aux Directeurs et Co-Directeurs.
 * Maximum 4 sièges nommés.
 */
export async function nommerMembreBureau(userId: string): Promise<ActionResult> {
  const directorId = await getCurrentDirector();
  if (!directorId) {
    return {
      success: false,
      error: "Accès refusé. Seuls les Directeurs et Co-Directeurs peuvent nommer des membres du bureau.",
    };
  }

  if (!userId || typeof userId !== "string") {
    return { success: false, error: "Identifiant utilisateur invalide." };
  }

  const admin = await createAdminClient();

  // Vérifie que le nombre de sièges nommés n'est pas déjà atteint
  const { count: nommeCount, error: countError } = await admin
    .from("bureau_membres")
    .select("id", { count: "exact", head: true })
    .eq("site_id", SITE_ID)
    .eq("type_siege", "nomme");

  if (countError) {
    console.error("[nommerMembreBureau] Erreur comptage sièges:", countError);
    return { success: false, error: "Erreur lors de la vérification des sièges disponibles." };
  }

  if ((nommeCount ?? 0) >= MAX_NOMME_SEATS) {
    return {
      success: false,
      error: `Le bureau compte déjà ${MAX_NOMME_SEATS} membres nommés. Révoquez un membre avant d'en nommer un nouveau.`,
    };
  }

  // Vérifie que l'utilisateur n'est pas déjà membre du bureau pour ce site
  const { data: existingMembre, error: existingError } = await admin
    .from("bureau_membres")
    .select("id")
    .eq("utilisateur_id", userId)
    .eq("site_id", SITE_ID)
    .maybeSingle();

  if (existingError) {
    console.error("[nommerMembreBureau] Erreur vérification membre existant:", existingError);
    return { success: false, error: "Erreur lors de la vérification du membre." };
  }

  if (existingMembre) {
    return { success: false, error: "Cet utilisateur est déjà membre du bureau." };
  }

  // Vérifie que l'utilisateur cible existe et a le grade requis (Exorciste Pro ou +)
  const { data: targetUser, error: targetError } = await admin
    .from("utilisateurs")
    .select("id, discord_id, pseudo, grade_role")
    .eq("id", userId)
    .maybeSingle();

  if (targetError || !targetUser) {
    return { success: false, error: "Utilisateur introuvable." };
  }

  if (!ELIGIBLE_GRADE_ROLES.includes((targetUser as any).grade_role)) {
    return { success: false, error: "Cet utilisateur doit être au minimum Exorciste Pro pour rejoindre le bureau." };
  }

  // Insère le nouveau membre du bureau
  const { error: insertError } = await admin.from("bureau_membres").insert({
    utilisateur_id: userId,
    site_id: SITE_ID,
    type_siege: "nomme",
    nomme_par: directorId,
  });

  if (insertError) {
    console.error("[nommerMembreBureau] Erreur insertion:", insertError);
    return { success: false, error: "Impossible de nommer ce membre. Veuillez réessayer." };
  }

  // Attribue le rôle Discord — erreur non bloquante
  if (targetUser.discord_id) {
    try {
      await addDiscordRoleToMember(
        targetUser.discord_id,
        DISCORD_BUREAU_ROLE_ID,
        DISCORD_GUILD_ID
      );
    } catch (discordErr) {
      console.error(
        `[nommerMembreBureau] Impossible d'attribuer le rôle Discord à ${targetUser.discord_id}:`,
        discordErr
      );
    }
  }

  revalidatePath("/bureau");
  return { success: true };
}

/**
 * Révoque un membre du bureau.
 * Réservé aux Directeurs et Co-Directeurs.
 */
export async function revoquerMembreBureau(membreId: string): Promise<ActionResult> {
  const directorId = await getCurrentDirector();
  if (!directorId) {
    return {
      success: false,
      error: "Accès refusé. Seuls les Directeurs et Co-Directeurs peuvent révoquer des membres du bureau.",
    };
  }

  if (!membreId || typeof membreId !== "string") {
    return { success: false, error: "Identifiant de membre invalide." };
  }

  const admin = await createAdminClient();

  // Récupère le membre pour obtenir son utilisateur_id et discord_id
  const { data: membre, error: membreError } = await admin
    .from("bureau_membres")
    .select(
      `
      id,
      utilisateur_id,
      site_id,
      utilisateurs!bureau_membres_utilisateur_id_fkey (
        discord_id,
        pseudo
      )
    `
    )
    .eq("id", membreId)
    .eq("site_id", SITE_ID)
    .maybeSingle();

  if (membreError || !membre) {
    return { success: false, error: "Membre du bureau introuvable." };
  }

  // Supprime le membre du bureau
  const { error: deleteError } = await admin
    .from("bureau_membres")
    .delete()
    .eq("id", membreId)
    .eq("site_id", SITE_ID);

  if (deleteError) {
    console.error("[revoquerMembreBureau] Erreur suppression:", deleteError);
    return { success: false, error: "Impossible de révoquer ce membre. Veuillez réessayer." };
  }

  // Retire le rôle Discord — erreur ignorée silencieusement
  const u = Array.isArray(membre.utilisateurs)
    ? membre.utilisateurs[0]
    : membre.utilisateurs;
  if (u?.discord_id) {
    try {
      await removeDiscordRoleFromMember(
        u.discord_id,
        DISCORD_BUREAU_ROLE_ID,
        DISCORD_GUILD_ID
      );
    } catch (discordErr) {
      console.error(
        `[revoquerMembreBureau] Impossible de retirer le rôle Discord de ${u.discord_id}:`,
        discordErr
      );
    }
  }

  revalidatePath("/bureau");
  return { success: true };
}

/**
 * Désigne un membre du bureau comme chef du bureau.
 * Un seul chef à la fois — l'ancien chef est automatiquement démis.
 * Réservé aux Directeurs et Co-Directeurs.
 */
export async function designerChefBureau(membreId: string): Promise<ActionResult> {
  const directorId = await getCurrentDirector();
  if (!directorId) {
    return {
      success: false,
      error: "Accès refusé. Seuls les Directeurs et Co-Directeurs peuvent désigner le chef du bureau.",
    };
  }

  if (!membreId || typeof membreId !== "string") {
    return { success: false, error: "Identifiant de membre invalide." };
  }

  const admin = await createAdminClient();

  // Vérifie que le membre cible appartient bien au bureau pour ce site
  const { data: membreCible, error: membreError } = await admin
    .from("bureau_membres")
    .select("id")
    .eq("id", membreId)
    .eq("site_id", SITE_ID)
    .maybeSingle();

  if (membreError || !membreCible) {
    return { success: false, error: "Membre du bureau introuvable." };
  }

  // Démissionne l'actuel chef (s'il y en a un)
  const { error: unsetError } = await admin
    .from("bureau_membres")
    .update({ est_chef: false })
    .eq("site_id", SITE_ID)
    .eq("est_chef", true);

  if (unsetError) {
    console.error("[designerChefBureau] Erreur démission ancien chef:", unsetError);
    return { success: false, error: "Erreur lors de la démission de l'ancien chef." };
  }

  // Désigne le nouveau chef
  const { error: setError } = await admin
    .from("bureau_membres")
    .update({ est_chef: true })
    .eq("id", membreId)
    .eq("site_id", SITE_ID);

  if (setError) {
    console.error("[designerChefBureau] Erreur désignation nouveau chef:", setError);
    return { success: false, error: "Impossible de désigner ce membre comme chef." };
  }

  revalidatePath("/bureau");
  return { success: true };
}

/**
 * Lance une élection pour le siège élu du bureau.
 * Réservé aux Directeurs et Co-Directeurs.
 * Conditions : pas d'élection en cours, pas de siège élu déjà occupé.
 */
export async function lancerElectionBureau(): Promise<ActionResult> {
  const directorId = await getCurrentDirector();
  if (!directorId) {
    return {
      success: false,
      error: "Accès refusé. Seuls les Directeurs et Co-Directeurs peuvent lancer une élection.",
    };
  }

  const admin = await createAdminClient();

  // Vérifie qu'il n'y a pas déjà une élection en cours
  const { data: electionEnCours, error: electionError } = await admin
    .from("bureau_elections")
    .select("id")
    .eq("site_id", SITE_ID)
    .eq("statut", "en_cours")
    .maybeSingle();

  if (electionError) {
    console.error("[lancerElectionBureau] Erreur vérification élection:", electionError);
    return { success: false, error: "Erreur lors de la vérification des élections en cours." };
  }

  if (electionEnCours) {
    return { success: false, error: "Une élection est déjà en cours pour ce bureau." };
  }

  // Vérifie qu'il n'y a pas déjà un siège élu occupé
  const { data: eluExistant, error: eluError } = await admin
    .from("bureau_membres")
    .select("id")
    .eq("site_id", SITE_ID)
    .eq("type_siege", "elu")
    .maybeSingle();

  if (eluError) {
    console.error("[lancerElectionBureau] Erreur vérification siège élu:", eluError);
    return { success: false, error: "Erreur lors de la vérification du siège élu." };
  }

  if (eluExistant) {
    return {
      success: false,
      error: "Un membre élu occupe déjà son siège. Révoquez-le avant de lancer une nouvelle élection.",
    };
  }

  // Crée l'élection
  const { error: insertError } = await admin.from("bureau_elections").insert({
    site_id: SITE_ID,
    statut: "en_cours",
  });

  if (insertError) {
    console.error("[lancerElectionBureau] Erreur création élection:", insertError);
    return { success: false, error: "Impossible de lancer l'élection. Veuillez réessayer." };
  }

  revalidatePath("/bureau");
  return { success: true };
}

/**
 * Enregistre le vote d'un utilisateur pour un candidat lors d'une élection.
 * Chaque utilisateur ne peut voter qu'une seule fois par élection.
 */
export async function voterBureau(
  electionId: string,
  candidatId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Vous devez être connecté pour voter." };
  }

  if (!electionId || !candidatId) {
    return { success: false, error: "Paramètres de vote invalides." };
  }

  const admin = await createAdminClient();

  // Vérifie que l'élection existe et est en cours pour ce site
  const { data: election, error: electionError } = await admin
    .from("bureau_elections")
    .select("id, statut")
    .eq("id", electionId)
    .eq("site_id", SITE_ID)
    .eq("statut", "en_cours")
    .maybeSingle();

  if (electionError || !election) {
    return {
      success: false,
      error: "Cette élection n'existe pas ou n'est plus en cours.",
    };
  }

  // Vérifie que l'utilisateur n'a pas déjà voté
  const { data: existingVote, error: voteCheckError } = await admin
    .from("bureau_votes")
    .select("id")
    .eq("election_id", electionId)
    .eq("votant_id", user.id)
    .maybeSingle();

  if (voteCheckError) {
    console.error("[voterBureau] Erreur vérification vote existant:", voteCheckError);
    return { success: false, error: "Erreur lors de la vérification de votre vote." };
  }

  if (existingVote) {
    return { success: false, error: "Vous avez déjà voté pour cette élection." };
  }

  // Vérifie que le candidat n'est pas déjà membre du bureau
  const { data: candidatMembre, error: candidatMembreError } = await admin
    .from("bureau_membres")
    .select("id")
    .eq("utilisateur_id", candidatId)
    .eq("site_id", SITE_ID)
    .maybeSingle();

  if (candidatMembreError) {
    console.error("[voterBureau] Erreur vérification candidat:", candidatMembreError);
    return { success: false, error: "Erreur lors de la vérification du candidat." };
  }

  if (candidatMembre) {
    return {
      success: false,
      error: "Ce candidat est déjà membre du bureau et ne peut pas être élu.",
    };
  }

  // Enregistre le vote
  const { error: insertError } = await admin.from("bureau_votes").insert({
    election_id: electionId,
    votant_id: user.id,
    candidat_id: candidatId,
  });

  if (insertError) {
    // Gère la violation de contrainte UNIQUE (double vote concurrent)
    if (insertError.code === "23505") {
      return { success: false, error: "Vous avez déjà voté pour cette élection." };
    }
    console.error("[voterBureau] Erreur insertion vote:", insertError);
    return { success: false, error: "Impossible d'enregistrer votre vote. Veuillez réessayer." };
  }

  revalidatePath("/bureau");
  return { success: true };
}

/**
 * Clôture une élection et proclame le gagnant (candidat avec le plus de votes).
 * Le gagnant est automatiquement ajouté comme membre élu du bureau.
 * Réservé aux Directeurs et Co-Directeurs.
 */
export async function cloturerElectionBureau(
  electionId: string
): Promise<ActionResult> {
  const directorId = await getCurrentDirector();
  if (!directorId) {
    return {
      success: false,
      error: "Accès refusé. Seuls les Directeurs et Co-Directeurs peuvent clôturer une élection.",
    };
  }

  if (!electionId) {
    return { success: false, error: "Identifiant d'élection invalide." };
  }

  const admin = await createAdminClient();

  // Vérifie que l'élection est bien en cours pour ce site
  const { data: election, error: electionError } = await admin
    .from("bureau_elections")
    .select("id, statut")
    .eq("id", electionId)
    .eq("site_id", SITE_ID)
    .eq("statut", "en_cours")
    .maybeSingle();

  if (electionError || !election) {
    return {
      success: false,
      error: "Cette élection n'existe pas ou n'est plus en cours.",
    };
  }

  // Récupère tous les votes et calcule le gagnant
  const { data: votes, error: votesError } = await admin
    .from("bureau_votes")
    .select("candidat_id")
    .eq("election_id", electionId);

  if (votesError) {
    console.error("[cloturerElectionBureau] Erreur récupération votes:", votesError);
    return { success: false, error: "Erreur lors de la récupération des votes." };
  }

  if (!votes || votes.length === 0) {
    return { success: false, error: "Aucun vote enregistré. Impossible de clôturer l'élection." };
  }

  // Compte les votes par candidat
  const voteCounts = new Map<string, number>();
  for (const vote of votes) {
    voteCounts.set(vote.candidat_id, (voteCounts.get(vote.candidat_id) ?? 0) + 1);
  }

  // Trouve le candidat avec le plus de votes
  let winnerId = "";
  let maxVotes = 0;
  for (const [candidatId, count] of voteCounts.entries()) {
    if (count > maxVotes) {
      maxVotes = count;
      winnerId = candidatId;
    }
  }

  if (!winnerId) {
    return { success: false, error: "Impossible de déterminer le gagnant." };
  }

  // Récupère les infos du gagnant (discord_id notamment)
  const { data: winner, error: winnerError } = await admin
    .from("utilisateurs")
    .select("id, discord_id, pseudo")
    .eq("id", winnerId)
    .maybeSingle();

  if (winnerError || !winner) {
    return { success: false, error: "Impossible de récupérer les informations du gagnant." };
  }

  // Insère le gagnant comme membre élu du bureau
  const { error: insertError } = await admin.from("bureau_membres").insert({
    utilisateur_id: winnerId,
    site_id: SITE_ID,
    type_siege: "elu",
    nomme_par: null,
  });

  if (insertError) {
    // Gestion de la contrainte UNIQUE (utilisateur déjà membre)
    if (insertError.code === "23505") {
      return {
        success: false,
        error: "Le gagnant est déjà membre du bureau.",
      };
    }
    console.error("[cloturerElectionBureau] Erreur insertion gagnant:", insertError);
    return { success: false, error: "Impossible d'inscrire le gagnant au bureau." };
  }

  // Met à jour l'élection : statut terminée, elu_id, fin
  const { error: updateError } = await admin
    .from("bureau_elections")
    .update({
      statut: "terminee",
      fin: new Date().toISOString(),
      elu_id: winnerId,
    })
    .eq("id", electionId)
    .eq("site_id", SITE_ID);

  if (updateError) {
    console.error("[cloturerElectionBureau] Erreur mise à jour élection:", updateError);
    // Ne pas retourner une erreur ici — le membre a déjà été inséré
  }

  // Attribue le rôle Discord au gagnant — erreur non bloquante
  if (winner.discord_id) {
    try {
      await addDiscordRoleToMember(
        winner.discord_id,
        DISCORD_BUREAU_ROLE_ID,
        DISCORD_GUILD_ID
      );
    } catch (discordErr) {
      console.error(
        `[cloturerElectionBureau] Impossible d'attribuer le rôle Discord à ${winner.discord_id}:`,
        discordErr
      );
    }
  }

  revalidatePath("/bureau");
  return { success: true };
}

/**
 * Annule une élection en cours.
 * Réservé aux Directeurs et Co-Directeurs.
 */
export async function annulerElectionBureau(
  electionId: string
): Promise<ActionResult> {
  const directorId = await getCurrentDirector();
  if (!directorId) {
    return {
      success: false,
      error: "Accès refusé. Seuls les Directeurs et Co-Directeurs peuvent annuler une élection.",
    };
  }

  if (!electionId) {
    return { success: false, error: "Identifiant d'élection invalide." };
  }

  const admin = await createAdminClient();

  const { error } = await admin
    .from("bureau_elections")
    .update({
      statut: "annulee",
      fin: new Date().toISOString(),
    })
    .eq("id", electionId)
    .eq("site_id", SITE_ID)
    .eq("statut", "en_cours");

  if (error) {
    console.error("[annulerElectionBureau] Erreur Supabase:", error);
    return { success: false, error: "Impossible d'annuler cette élection. Veuillez réessayer." };
  }

  revalidatePath("/bureau");
  return { success: true };
}

/**
 * Vérifie si les membres nommés sont toujours valides (leur nominateur est encore Directeur/Co-Directeur).
 * Supprime automatiquement les membres dont le nominateur n'a plus le grade requis.
 * Retire également les rôles Discord correspondants.
 */
export async function checkDirectorChange(): Promise<void> {
  const admin = await createAdminClient();

  // Récupère tous les membres nommés avec leur nominateur
  const { data: membres, error: membresError } = await admin
    .from("bureau_membres")
    .select(
      `
      id,
      utilisateur_id,
      nomme_par,
      utilisateurs!bureau_membres_utilisateur_id_fkey (
        discord_id,
        pseudo
      )
    `
    )
    .eq("site_id", SITE_ID)
    .eq("type_siege", "nomme");

  if (membresError || !membres || membres.length === 0) {
    return;
  }

  // Collecte les IDs des nominateurs uniques (non null)
  const nominateurIds = [
    ...new Set(
      membres
        .map((m) => m.nomme_par)
        .filter((id): id is string => id !== null)
    ),
  ];

  // Si tous les membres n'ont pas de nominateur, ils sont tous invalides
  const validNominateurs = new Set<string>();

  if (nominateurIds.length > 0) {
    const { data: nominateurs, error: nominateursError } = await admin
      .from("utilisateurs")
      .select("id, grade_role")
      .in("id", nominateurIds);

    if (!nominateursError && nominateurs) {
      for (const nom of nominateurs) {
        if (
          nom.grade_role === "Directeur" ||
          nom.grade_role === "Co-Directeur"
        ) {
          validNominateurs.add(nom.id);
        }
      }
    }
  }

  // Identifie les membres à révoquer
  const aRevoquer = membres.filter(
    (m) => m.nomme_par === null || !validNominateurs.has(m.nomme_par)
  );

  if (aRevoquer.length === 0) {
    return;
  }

  const idsASupprimer = aRevoquer.map((m) => m.id);

  // Supprime en batch
  const { error: deleteError } = await admin
    .from("bureau_membres")
    .delete()
    .in("id", idsASupprimer)
    .eq("site_id", SITE_ID);

  if (deleteError) {
    console.error("[checkDirectorChange] Erreur suppression membres:", deleteError);
    return;
  }

  // Retire les rôles Discord pour chaque membre révoqué
  for (const membre of aRevoquer) {
    const u = Array.isArray(membre.utilisateurs)
      ? membre.utilisateurs[0]
      : membre.utilisateurs;
    if (u?.discord_id) {
      try {
        await removeDiscordRoleFromMember(
          u.discord_id,
          DISCORD_BUREAU_ROLE_ID,
          DISCORD_GUILD_ID
        );
      } catch (discordErr) {
        console.error(
          `[checkDirectorChange] Impossible de retirer le rôle Discord de ${u.discord_id}:`,
          discordErr
        );
      }
    }
  }

  revalidatePath("/bureau");
}
