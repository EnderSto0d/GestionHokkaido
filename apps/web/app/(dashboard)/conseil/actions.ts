"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// ─── Constants ────────────────────────────────────────────────────────────────

const DISCORD_CONSEIL_ROLE_ID = "1478966492388397118";
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_ID = "1456715316313981153";

const MAX_SIEGES_ELEVE = 5;
const MAX_SIEGES_STAFF = 2;
const MAX_VOTES_ELEVE = 5; // chaque votant peut voter pour 5 candidats max

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActionResult =
  | { success: true }
  | { success: false; error: string };

export type ConseilMembre = {
  id: string;
  utilisateur_id: string;
  type_siege: "elu_eleve" | "elu_joker" | "classement_perso";
  est_chef: boolean;
  elu_le: string;
  pseudo: string;
  avatar_url: string | null;
  prenom_rp: string | null;
  nom_rp: string | null;
  grade: string | null;
  grade_role: string | null;
};

export type ElectionInfo = {
  id: string;
  type: "elu_eleve" | "elu_joker";
  statut: "en_cours" | "terminee" | "annulee";
  nb_sieges: number;
  debut: string;
  fin: string | null;
};

export type CandidatVotes = {
  utilisateur_id: string;
  pseudo: string;
  avatar_url: string | null;
  prenom_rp: string | null;
  nom_rp: string | null;
  nb_votes: number;
};

export type VoteAnnulationInfo = {
  /** L'utilisateur courant a-t-il voté pour annuler ? */
  aVote: boolean;
  /** Liste des votants actuels */
  votants: { id: string; pseudo: string }[];
  /** Nombre total de profs/admins */
  totalProfsAdmins: number;
  /** Seuil requis (75 %) */
  seuilRequis: number;
  /** L'utilisateur courant peut annuler immédiatement (Directeur / Co-Directeur / Admin) */
  peutAnnulerDirectement: boolean;
  /** L'utilisateur est Professeur Principal */
  estProfPrincipal: boolean;
  /** Tous les Professeurs Principaux ont confirmé (piste PP) */
  tousProfsPrincipauxOntVote: boolean;
  /** L'utilisateur courant a-t-il confirmé sur la piste PP ? */
  aVotePP: boolean;
  /** Nombre de confirmations PP actuelles */
  nbVotesPP: number;
  /** Nombre total de Professeurs Principaux */
  totalPP: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function verifyAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return user;
}

async function verifyProfOrAdmin(): Promise<{ userId: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié." };

  const { data: _u } = await supabase
    .from("utilisateurs")
    .select("role")
    .eq("id", user.id)
    .single();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const u = _u as any;

  if (!u || (u.role !== "professeur" && u.role !== "admin")) {
    return { error: "Permissions insuffisantes." };
  }
  return { userId: user.id };
}

async function modifyDiscordRole(
  discordId: string,
  roleId: string,
  action: "add" | "remove"
): Promise<boolean> {
  if (!DISCORD_BOT_TOKEN) {
    console.warn("[conseil] DISCORD_BOT_TOKEN not set, skipping Discord role sync");
    return false;
  }
  const method = action === "add" ? "PUT" : "DELETE";
  try {
    const res = await fetch(
      `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${discordId}/roles/${roleId}`,
      {
        method,
        headers: {
          Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
      }
    );
    if (!res.ok) {
      const text = await res.text();
      console.error(`[conseil] Discord role ${action} failed (${res.status}):`, text);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[conseil] Discord role ${action} error:`, err);
    return false;
  }
}

// ─── Lire les membres actuels du conseil ──────────────────────────────────────

export async function getConseilMembres(): Promise<ConseilMembre[]> {
  const admin = await createAdminClient();

  const { data, error } = await admin
    .from("conseil_membres")
    .select(`
      id,
      utilisateur_id,
      type_siege,
      est_chef,
      elu_le,
      utilisateurs!conseil_membres_utilisateur_id_fkey (
        pseudo,
        avatar_url,
        prenom_rp,
        nom_rp,
        grade,
        grade_role
      )
    `)
    .order("elu_le", { ascending: true });

  if (error || !data) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((row) => ({
    id: row.id,
    utilisateur_id: row.utilisateur_id,
    type_siege: row.type_siege,
    est_chef: row.est_chef ?? false,
    elu_le: row.elu_le,
    pseudo: row.utilisateurs?.pseudo ?? "Inconnu",
    avatar_url: row.utilisateurs?.avatar_url ?? null,
    prenom_rp: row.utilisateurs?.prenom_rp ?? null,
    nom_rp: row.utilisateurs?.nom_rp ?? null,
    grade: row.utilisateurs?.grade ?? null,
    grade_role: row.utilisateurs?.grade_role ?? null,
  }));
}

// ─── Lire les élections en cours ──────────────────────────────────────────────

export async function getElectionsEnCours(): Promise<ElectionInfo[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("elections_conseil")
    .select("id, type, statut, nb_sieges, debut, fin")
    .eq("statut", "en_cours")
    .order("debut", { ascending: false });

  if (error || !data) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data as any[];
}

// ─── Lancer une élection ──────────────────────────────────────────────────────

export async function lancerElection(
  type: "elu_eleve" | "elu_joker"
): Promise<ActionResult> {
  const auth = await verifyProfOrAdmin();
  if ("error" in auth) return { success: false, error: auth.error };

  const admin = await createAdminClient();

  // Vérifier qu'il n'y a pas déjà une élection en cours du même type
  const { data: enCours } = await admin
    .from("elections_conseil")
    .select("id")
    .eq("type", type)
    .eq("statut", "en_cours")
    .limit(1);

  if (enCours && enCours.length > 0) {
    return { success: false, error: "Une élection de ce type est déjà en cours." };
  }

  const nbSieges = type === "elu_eleve" ? MAX_SIEGES_ELEVE : MAX_SIEGES_STAFF;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from("elections_conseil") as any).insert({
    type,
    statut: "en_cours",
    nb_sieges: nbSieges,
    cree_par: auth.userId,
  });

  if (error) {
    return { success: false, error: "Erreur lors de la création de l'élection." };
  }

  revalidatePath("/conseil");
  return { success: true };
}

// ─── Vérifier si l'utilisateur peut voter (élection élève) ────────────────────

export async function peutVoterEleve(
  electionId: string
): Promise<{ canVote: boolean; reason?: string; votesRestants?: number }> {
  const user = await verifyAuth();
  if (!user) return { canVote: false, reason: "Non authentifié." };

  const admin = await createAdminClient();

  // Vérifier que l'élection est en cours
  const { data: _election } = await admin
    .from("elections_conseil")
    .select("id, type, statut")
    .eq("id", electionId)
    .single();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const election = _election as any;
  if (!election || election.statut !== "en_cours") {
    return { canVote: false, reason: "Élection non en cours." };
  }
  if (election.type !== "elu_eleve") {
    return { canVote: false, reason: "Cette élection est réservée à l'équipe professorale." };
  }

  // L'utilisateur doit être dans le top 3 des escouades
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: escouades } = await (admin.from("escouades") as any)
    .select("id")
    .order("points", { ascending: false })
    .limit(3);

  const top3Ids = (escouades ?? []).map((e: { id: string }) => e.id);

  if (top3Ids.length === 0) {
    return { canVote: false, reason: "Aucune escouade dans le classement." };
  }

  // Vérifier que l'utilisateur est membre d'une de ces escouades
  const { data: membership } = await admin
    .from("membres_escouade")
    .select("escouade_id")
    .eq("utilisateur_id", user.id)
    .in("escouade_id", top3Ids)
    .limit(1);

  if (!membership || membership.length === 0) {
    return { canVote: false, reason: "Vous devez être membre du top 3 des escouades pour voter." };
  }

  // Compter les votes existants de cet utilisateur pour cette élection
  const { count } = await admin
    .from("votes_conseil")
    .select("id", { count: "exact", head: true })
    .eq("election_id", electionId)
    .eq("votant_id", user.id);

  const nbVotes = count ?? 0;
  const votesRestants = MAX_VOTES_ELEVE - nbVotes;

  if (votesRestants <= 0) {
    return { canVote: false, reason: "Vous avez déjà utilisé tous vos votes.", votesRestants: 0 };
  }

  return { canVote: true, votesRestants };
}

// ─── Voter (élection élève) ───────────────────────────────────────────────────

export async function voterEleve(
  electionId: string,
  candidatId: string
): Promise<ActionResult> {
  const user = await verifyAuth();
  if (!user) return { success: false, error: "Non authentifié." };

  // On ne peut pas voter pour soi-même
  if (candidatId === user.id) {
    return { success: false, error: "Vous ne pouvez pas voter pour vous-même." };
  }

  const eligibilite = await peutVoterEleve(electionId);
  if (!eligibilite.canVote) {
    return { success: false, error: eligibilite.reason ?? "Vote impossible." };
  }

  const admin = await createAdminClient();

  // Vérifier que le candidat est membre d'une des top 3 escouades
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: escouadesTop3 } = await (admin.from("escouades") as any)
    .select("id")
    .order("points", { ascending: false })
    .limit(3);

  const top3Ids = (escouadesTop3 ?? []).map((e: { id: string }) => e.id);

  if (top3Ids.length > 0) {
    const { data: candidatMembership } = await admin
      .from("membres_escouade")
      .select("escouade_id")
      .eq("utilisateur_id", candidatId)
      .in("escouade_id", top3Ids)
      .limit(1);

    if (!candidatMembership || candidatMembership.length === 0) {
      return { success: false, error: "Le candidat doit être membre d'une des 3 meilleures escouades." };
    }
  }

  // Vérifier que le candidat n'est pas déjà dans le conseil (éviter doublons)
  const { data: dejaConseil } = await admin
    .from("conseil_membres")
    .select("id")
    .eq("utilisateur_id", candidatId)
    .limit(1);

  if (dejaConseil && dejaConseil.length > 0) {
    return { success: false, error: "Ce membre fait déjà partie du conseil." };
  }

  // Vérifier qu'on n'a pas déjà voté pour ce candidat
  const { data: dejaVote } = await admin
    .from("votes_conseil")
    .select("id")
    .eq("election_id", electionId)
    .eq("votant_id", user.id)
    .eq("candidat_id", candidatId)
    .limit(1);

  if (dejaVote && dejaVote.length > 0) {
    return { success: false, error: "Vous avez déjà voté pour ce candidat." };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from("votes_conseil") as any).insert({
    election_id: electionId,
    votant_id: user.id,
    candidat_id: candidatId,
  });

  if (error) {
    return { success: false, error: "Erreur lors de l'enregistrement du vote." };
  }

  revalidatePath("/conseil");
  return { success: true };
}

// ─── Voter (élection staff — profs/co-dir/dir) ───────────────────────────────

export async function voterStaff(
  electionId: string,
  candidatId: string
): Promise<ActionResult> {
  const auth = await verifyProfOrAdmin();
  if ("error" in auth) return { success: false, error: auth.error };

  const admin = await createAdminClient();

  // Vérifier l'élection
  const { data: _election } = await admin
    .from("elections_conseil")
    .select("id, type, statut")
    .eq("id", electionId)
    .single();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const election = _election as any;
  if (!election || election.statut !== "en_cours" || election.type !== "elu_joker") {
    return { success: false, error: "Élection Joker non en cours." };
  }

  // Vérifier doublons
  const { data: dejaVote } = await admin
    .from("votes_conseil")
    .select("id")
    .eq("election_id", electionId)
    .eq("votant_id", auth.userId)
    .eq("candidat_id", candidatId)
    .limit(1);

  if (dejaVote && dejaVote.length > 0) {
    return { success: false, error: "Vous avez déjà voté pour ce candidat." };
  }

  // Compter les votes du staff (max 2)
  const { count } = await admin
    .from("votes_conseil")
    .select("id", { count: "exact", head: true })
    .eq("election_id", electionId)
    .eq("votant_id", auth.userId);

  if ((count ?? 0) >= MAX_SIEGES_STAFF) {
    return { success: false, error: "Vous avez déjà utilisé vos 2 votes." };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from("votes_conseil") as any).insert({
    election_id: electionId,
    votant_id: auth.userId,
    candidat_id: candidatId,
  });

  if (error) {
    return { success: false, error: "Erreur lors de l'enregistrement du vote." };
  }

  revalidatePath("/conseil");
  return { success: true };
}

// ─── Obtenir les résultats d'une élection ─────────────────────────────────────

export async function getResultatsElection(
  electionId: string
): Promise<CandidatVotes[]> {
  const admin = await createAdminClient();

  // Récupérer tous les votes groupés par candidat
  const { data: votes } = await admin
    .from("votes_conseil")
    .select("candidat_id")
    .eq("election_id", electionId);

  if (!votes || votes.length === 0) return [];

  // Compter les votes par candidat
  const voteCount: Record<string, number> = {};
  for (const v of votes) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cid = (v as any).candidat_id;
    voteCount[cid] = (voteCount[cid] ?? 0) + 1;
  }

  // Récupérer les infos des candidats
  const candidatIds = Object.keys(voteCount);
  const { data: _candidats } = await admin
    .from("utilisateurs")
    .select("id, pseudo, avatar_url, prenom_rp, nom_rp")
    .in("id", candidatIds);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const candidats = (_candidats ?? []) as any[];

  return candidats
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

// ─── Clôturer une élection et élire les gagnants ─────────────────────────────

export async function cloturerElection(
  electionId: string
): Promise<ActionResult> {
  const auth = await verifyProfOrAdmin();
  if ("error" in auth) return { success: false, error: auth.error };

  const admin = await createAdminClient();

  // Récupérer l'élection
  const { data: _election } = await admin
    .from("elections_conseil")
    .select("id, type, statut, nb_sieges")
    .eq("id", electionId)
    .single();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const election = _election as any;

  if (!election || election.statut !== "en_cours") {
    return { success: false, error: "Élection non en cours." };
  }

  const nbSieges = election.nb_sieges as number;
  const typeSiege = election.type as "elu_eleve" | "elu_joker";

  // Obtenir les résultats triés
  const resultats = await getResultatsElection(electionId);
  const gagnants = resultats.slice(0, nbSieges);

  if (gagnants.length === 0) {
    return { success: false, error: "Aucun vote enregistré, impossible de clôturer." };
  }

  // Retirer les anciens membres du conseil pour ce type de siège
  const { data: anciensMembres } = await admin
    .from("conseil_membres")
    .select("utilisateur_id")
    .eq("type_siege", typeSiege);

  // Retirer le rôle Discord des anciens membres
  if (anciensMembres) {
    for (const ancien of anciensMembres) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const uid = (ancien as any).utilisateur_id;
      const { data: _userData } = await admin
        .from("utilisateurs")
        .select("discord_id")
        .eq("id", uid)
        .single();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const discordId = (_userData as any)?.discord_id;
      if (discordId) {
        await modifyDiscordRole(discordId, DISCORD_CONSEIL_ROLE_ID, "remove");
      }
    }

    // Supprimer les anciens sièges
    await admin
      .from("conseil_membres")
      .delete()
      .eq("type_siege", typeSiege);
  }

  // Insérer les nouveaux membres et leur attribuer le rôle Discord
  for (const gagnant of gagnants) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from("conseil_membres") as any).insert({
      utilisateur_id: gagnant.utilisateur_id,
      type_siege: typeSiege,
    });

    // Attribuer le rôle Discord
    const { data: _userData } = await admin
      .from("utilisateurs")
      .select("discord_id")
      .eq("id", gagnant.utilisateur_id)
      .single();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const discordId = (_userData as any)?.discord_id;
    if (discordId) {
      await modifyDiscordRole(discordId, DISCORD_CONSEIL_ROLE_ID, "add");
    }
  }

  // Marquer l'élection comme terminée
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.from("elections_conseil") as any)
    .update({ statut: "terminee", fin: new Date().toISOString() })
    .eq("id", electionId);

  revalidatePath("/conseil");
  return { success: true };
}

// ─── Annuler une élection ─────────────────────────────────────────────────────

export async function annulerElection(
  electionId: string
): Promise<ActionResult> {
  const auth = await verifyProfOrAdmin();
  if ("error" in auth) return { success: false, error: auth.error };

  const admin = await createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from("elections_conseil") as any)
    .update({ statut: "annulee", fin: new Date().toISOString() })
    .eq("id", electionId)
    .eq("statut", "en_cours");

  if (error) {
    return { success: false, error: "Erreur lors de l'annulation." };
  }

  revalidatePath("/conseil");
  return { success: true };
}

// ─── Révoquer un membre du conseil ────────────────────────────────────────────

export async function revoquerMembreConseil(
  membreConseilId: string
): Promise<ActionResult> {
  const auth = await verifyProfOrAdmin();
  if ("error" in auth) return { success: false, error: auth.error };

  const admin = await createAdminClient();

  // Récupérer le membre
  const { data: _membre } = await admin
    .from("conseil_membres")
    .select("utilisateur_id")
    .eq("id", membreConseilId)
    .single();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const membre = _membre as any;

  if (!membre) {
    return { success: false, error: "Membre du conseil introuvable." };
  }

  // Retirer le rôle Discord
  const { data: _userData } = await admin
    .from("utilisateurs")
    .select("discord_id")
    .eq("id", membre.utilisateur_id)
    .single();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const discordId = (_userData as any)?.discord_id;
  if (discordId) {
    await modifyDiscordRole(discordId, DISCORD_CONSEIL_ROLE_ID, "remove");
  }

  // Supprimer le siège
  const { error } = await admin
    .from("conseil_membres")
    .delete()
    .eq("id", membreConseilId);

  if (error) {
    return { success: false, error: "Erreur lors de la révocation." };
  }

  revalidatePath("/conseil");
  return { success: true };
}

// ─── Nommer directement un membre au conseil (staff only) ─────────────────────

export async function nommerMembreConseil(
  utilisateurId: string,
  typeSiege: "elu_eleve" | "elu_joker"
): Promise<ActionResult> {
  const auth = await verifyProfOrAdmin();
  if ("error" in auth) return { success: false, error: auth.error };

  const admin = await createAdminClient();

  // Vérifier que l'utilisateur n'est pas déjà dans le conseil
  const { data: deja } = await admin
    .from("conseil_membres")
    .select("id")
    .eq("utilisateur_id", utilisateurId)
    .limit(1);

  if (deja && deja.length > 0) {
    return { success: false, error: "Cet utilisateur fait déjà partie du conseil." };
  }

  // Vérifier le nombre de sièges occupés pour ce type
  const { count } = await admin
    .from("conseil_membres")
    .select("id", { count: "exact", head: true })
    .eq("type_siege", typeSiege);

  const maxSieges = typeSiege === "elu_eleve" ? MAX_SIEGES_ELEVE : MAX_SIEGES_STAFF;
  if ((count ?? 0) >= maxSieges) {
    return {
      success: false,
      error: `Tous les sièges de type "${typeSiege === "elu_eleve" ? "élève" : "joker"}" sont déjà occupés.`,
    };
  }

  // Insérer
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from("conseil_membres") as any).insert({
    utilisateur_id: utilisateurId,
    type_siege: typeSiege,
  });

  if (error) {
    return { success: false, error: "Erreur lors de la nomination." };
  }

  // Attribuer le rôle Discord
  const { data: _userData } = await admin
    .from("utilisateurs")
    .select("discord_id")
    .eq("id", utilisateurId)
    .single();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const discordId = (_userData as any)?.discord_id;
  if (discordId) {
    await modifyDiscordRole(discordId, DISCORD_CONSEIL_ROLE_ID, "add");
  }

  revalidatePath("/conseil");
  return { success: true };
}

// ─── Obtenir les candidats possibles (top 3 escouades, pour élection élève) ──

export async function getCandidatsPossibles(): Promise<
  { id: string; pseudo: string; avatar_url: string | null; prenom_rp: string | null; nom_rp: string | null }[]
> {
  const admin = await createAdminClient();

  // Récupérer les utilisateurs déjà au conseil
  const { data: conseilMembres } = await admin
    .from("conseil_membres")
    .select("utilisateur_id");
  const conseilIds = (conseilMembres ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (m: any) => m.utilisateur_id as string
  );

  // Récupérer le top 3 des escouades par points
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: escouadesTop3 } = await (admin.from("escouades") as any)
    .select("id")
    .order("points", { ascending: false })
    .limit(3);

  const top3Ids = (escouadesTop3 ?? []).map((e: { id: string }) => e.id);

  if (top3Ids.length === 0) return [];

  // Récupérer les utilisateurs membres des top 3 escouades
  const { data: membresTop3 } = await admin
    .from("membres_escouade")
    .select("utilisateur_id")
    .in("escouade_id", top3Ids);

  const membresTop3Ids = [...new Set(
    (membresTop3 ?? []).map((m: { utilisateur_id: string }) => m.utilisateur_id)
  )];

  if (membresTop3Ids.length === 0) return [];

  // Exclure ceux qui sont déjà au conseil
  const candidatIds = membresTop3Ids.filter((id) => !conseilIds.includes(id));

  if (candidatIds.length === 0) return [];

  // Récupérer les infos des candidats éligibles
  const { data } = await admin
    .from("utilisateurs")
    .select("id, pseudo, avatar_url, prenom_rp, nom_rp")
    .in("id", candidatIds)
    .order("pseudo");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []) as any[];
}

// ─── Obtenir les candidats joker (tous les élèves, peu importe l'escouade) ───

export async function getCandidatsJokerPossibles(): Promise<
  { id: string; pseudo: string; avatar_url: string | null; prenom_rp: string | null; nom_rp: string | null }[]
> {
  const admin = await createAdminClient();

  // Récupérer les utilisateurs déjà au conseil
  const { data: conseilMembres } = await admin
    .from("conseil_membres")
    .select("utilisateur_id");
  const conseilIds = (conseilMembres ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (m: any) => m.utilisateur_id as string
  );

  // Récupérer tous les élèves (role = 'eleve') qui ne sont pas déjà au conseil
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (admin.from("utilisateurs") as any)
    .select("id, pseudo, avatar_url, prenom_rp, nom_rp")
    .eq("role", "eleve")
    .order("pseudo");

  if (conseilIds.length > 0) {
    // Supabase ne supporte pas "not in" directement, on filtre après
    const { data } = await query;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return ((data ?? []) as any[]).filter((u: any) => !conseilIds.includes(u.id));
  }

  const { data } = await query;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []) as any[];
}

// ─── Obtenir les votes de l'utilisateur courant pour une élection ─────────────

export async function getMesVotes(
  electionId: string
): Promise<string[]> {
  const user = await verifyAuth();
  if (!user) return [];

  const admin = await createAdminClient();

  const { data } = await admin
    .from("votes_conseil")
    .select("candidat_id")
    .eq("election_id", electionId)
    .eq("votant_id", user.id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((v: any) => v.candidat_id as string);
}

// ─── Constante : seuil de majorité pour annuler une élection ──────────────────

const SEUIL_ANNULATION = 0.75; // 75 %

// ─── Obtenir les infos d'annulation pour une élection ─────────────────────────

export async function getVotesAnnulation(
  electionId: string,
  userId: string
): Promise<VoteAnnulationInfo | null> {
  const admin = await createAdminClient();

  // Récupérer le rôle/grade_role de l'utilisateur courant
  const { data: _userRow } = await admin
    .from("utilisateurs")
    .select("role, grade_role")
    .eq("id", userId)
    .single();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userRow = _userRow as any;
  if (!userRow) return null;

  const peutAnnulerDirectement =
    userRow.role === "admin" ||
    userRow.grade_role === "Directeur" ||
    userRow.grade_role === "Co-Directeur";

  const estProfPrincipal = userRow.grade_role === "Professeur Principal";

  // Nombre total de profs/admins
  const { count: totalProfsAdmins } = await admin
    .from("utilisateurs")
    .select("id", { count: "exact", head: true })
    .in("role", ["professeur", "admin"]);

  const total = totalProfsAdmins ?? 0;
  const seuilRequis = Math.ceil(total * SEUIL_ANNULATION);

  // Votes existants pour cette élection
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: votesRaw } = await (admin as any).from("votes_annulation_election")
    .select("votant_id, utilisateurs!votes_annulation_election_votant_id_fkey(pseudo)")
    .eq("election_id", electionId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const votes = (votesRaw ?? []) as any[];

  const votants = votes.map((v) => ({
    id: v.votant_id as string,
    pseudo: (v.utilisateurs?.pseudo ?? "Inconnu") as string,
  }));

  const aVote = votants.some((v) => v.id === userId);

  // ── Piste PP (unanimité) ──
  const { data: profsP } = await admin
    .from("utilisateurs")
    .select("id")
    .eq("grade_role", "Professeur Principal");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profPIds = ((profsP ?? []) as any[]).map((p) => p.id as string);
  const totalPP = profPIds.length;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: votesPPRaw } = await (admin as any).from("votes_annulation_election_pp")
    .select("votant_id")
    .eq("election_id", electionId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const votesPPIds = ((votesPPRaw ?? []) as any[]).map((v) => v.votant_id as string);

  const aVotePP = votesPPIds.includes(userId);
  const nbVotesPP = votesPPIds.length;
  const tousProfsPrincipauxOntVote =
    totalPP > 0 && profPIds.every((pid) => votesPPIds.includes(pid));

  return {
    aVote,
    votants,
    totalProfsAdmins: total,
    seuilRequis,
    peutAnnulerDirectement,
    estProfPrincipal,
    tousProfsPrincipauxOntVote,
    aVotePP,
    nbVotesPP,
    totalPP,
  };
}

// ─── Annulation immédiate (Directeur / Co-Directeur / Admin uniquement) ───────

export async function forceAnnulerElection(
  electionId: string
): Promise<ActionResult> {
  const auth = await verifyProfOrAdmin();
  if ("error" in auth) return { success: false, error: auth.error };

  const admin = await createAdminClient();

  // Vérifier que c'est bien un Directeur / Co-Directeur / Admin
  const { data: _userRow } = await admin
    .from("utilisateurs")
    .select("role, grade_role")
    .eq("id", auth.userId)
    .single();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userRow = _userRow as any;

  const canForce =
    userRow?.role === "admin" ||
    userRow?.grade_role === "Directeur" ||
    userRow?.grade_role === "Co-Directeur";

  if (!canForce) {
    return { success: false, error: "Seul un Directeur, Co-Directeur ou Admin peut forcer l'annulation." };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from("elections_conseil") as any)
    .update({ statut: "annulee", fin: new Date().toISOString() })
    .eq("id", electionId)
    .eq("statut", "en_cours");

  if (error) {
    return { success: false, error: "Erreur lors de l'annulation." };
  }

  revalidatePath("/conseil");
  return { success: true };
}

// ─── Unanimité PP : confirmer l'annulation ───────────────────────────────────
// Chaque PP confirme indépendamment. Quand TOUS les PPs ont confirmé, l'élection
// est annulée. Un PP peut aussi voter sur la piste 75 % comme un prof normal.
// ─────────────────────────────────────────────────────────────────────────────

export async function forceAnnulerElectionPP(
  electionId: string
): Promise<{ success: true; annulee: boolean } | { success: false; error: string }> {
  const auth = await verifyProfOrAdmin();
  if ("error" in auth) return { success: false, error: auth.error };

  const admin = await createAdminClient();

  // Vérifier que l'appelant est Professeur Principal
  const { data: _me } = await admin
    .from("utilisateurs")
    .select("grade_role")
    .eq("id", auth.userId)
    .single();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const me = _me as any;
  if (me?.grade_role !== "Professeur Principal") {
    return { success: false, error: "Seul un Professeur Principal peut utiliser cette action." };
  }

  // Vérifier que l'élection est en cours
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: _elec } = await (admin.from("elections_conseil") as any)
    .select("id, statut")
    .eq("id", electionId)
    .single();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const elec = _elec as any;
  if (!elec || elec.statut !== "en_cours") {
    return { success: false, error: "Élection non en cours." };
  }

  // Enregistrer la confirmation PP
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: insertErr } = await (admin as any).from("votes_annulation_election_pp").insert({
    election_id: electionId,
    votant_id: auth.userId,
  });

  if (insertErr) {
    if (insertErr.code === "23505") {
      return { success: false, error: "Vous avez déjà confirmé l'annulation (PP)." };
    }
    return { success: false, error: "Erreur lors de l'enregistrement." };
  }

  // Vérifier si TOUS les PPs ont maintenant confirmé
  const { data: profsP } = await admin
    .from("utilisateurs")
    .select("id")
    .eq("grade_role", "Professeur Principal");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const profPIds = ((profsP ?? []) as any[]).map((p) => p.id as string);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: confirmsPP } = await (admin as any).from("votes_annulation_election_pp")
    .select("votant_id")
    .eq("election_id", electionId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const confirmedIds = ((confirmsPP ?? []) as any[]).map((v) => v.votant_id as string);

  const tousOntConfirme =
    profPIds.length > 0 && profPIds.every((pid) => confirmedIds.includes(pid));

  if (tousOntConfirme) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from("elections_conseil") as any)
      .update({ statut: "annulee", fin: new Date().toISOString() })
      .eq("id", electionId);
    revalidatePath("/conseil");
    return { success: true, annulee: true };
  }

  revalidatePath("/conseil");
  return { success: true, annulee: false };
}

// ─── Retirer sa confirmation PP ───────────────────────────────────────────────

export async function retirerVoteAnnulationPP(
  electionId: string
): Promise<ActionResult> {
  const auth = await verifyProfOrAdmin();
  if ("error" in auth) return { success: false, error: auth.error };

  const admin = await createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).from("votes_annulation_election_pp")
    .delete()
    .eq("election_id", electionId)
    .eq("votant_id", auth.userId);

  if (error) {
    return { success: false, error: "Erreur lors du retrait de la confirmation PP." };
  }

  revalidatePath("/conseil");
  return { success: true };
}

// ─── Voter pour annuler une élection (piste 75 %) ────────────────────────────
// 75 % des profs/admins votent → annulation.
// Le Directeur / Co-Directeur / Admin utilise forceAnnulerElection à la place.
// Les PP peuvent voter ici comme des profs normaux.
// ─────────────────────────────────────────────────────────────────────────────

export async function voterAnnulationElection(
  electionId: string
): Promise<{ success: true; annulee: boolean } | { success: false; error: string }> {
  const auth = await verifyProfOrAdmin();
  if ("error" in auth) return { success: false, error: auth.error };

  const admin = await createAdminClient();

  // Vérifier que l'élection est en cours
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: _elec } = await (admin.from("elections_conseil") as any)
    .select("id, statut")
    .eq("id", electionId)
    .single();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const elec = _elec as any;
  if (!elec || elec.statut !== "en_cours") {
    return { success: false, error: "Élection non en cours." };
  }

  // Enregistrer le vote d'annulation (75 %)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: insertErr } = await (admin as any).from("votes_annulation_election").insert({
    election_id: electionId,
    votant_id: auth.userId,
  });

  if (insertErr) {
    if (insertErr.code === "23505") {
      return { success: false, error: "Vous avez déjà voté pour l'annulation." };
    }
    return { success: false, error: "Erreur lors de l'enregistrement du vote." };
  }

  // Compter les votes après insertion
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: nbVotes } = await (admin as any).from("votes_annulation_election")
    .select("id", { count: "exact", head: true })
    .eq("election_id", electionId);

  const { count: totalProfsAdmins } = await admin
    .from("utilisateurs")
    .select("id", { count: "exact", head: true })
    .in("role", ["professeur", "admin"]);

  const total = totalProfsAdmins ?? 0;
  const votes = nbVotes ?? 0;
  const seuilRequis = Math.ceil(total * SEUIL_ANNULATION);

  // 75 % atteint → annuler
  if (votes >= seuilRequis) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from("elections_conseil") as any)
      .update({ statut: "annulee", fin: new Date().toISOString() })
      .eq("id", electionId);
    revalidatePath("/conseil");
    return { success: true, annulee: true };
  }

  revalidatePath("/conseil");
  return { success: true, annulee: false };
}

// ─── Retirer son vote d'annulation ────────────────────────────────────────────

export async function retirerVoteAnnulation(
  electionId: string
): Promise<ActionResult> {
  const auth = await verifyProfOrAdmin();
  if ("error" in auth) return { success: false, error: auth.error };

  const admin = await createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).from("votes_annulation_election")
    .delete()
    .eq("election_id", electionId)
    .eq("votant_id", auth.userId);

  if (error) {
    return { success: false, error: "Erreur lors du retrait du vote." };
  }

  revalidatePath("/conseil");
  return { success: true };
}
