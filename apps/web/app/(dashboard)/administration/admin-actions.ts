"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { fetchDiscordGuildMemberByBot } from "@/lib/discord/guild-member";
import { getGradeSecondaireFromDiscordRoles } from "@/lib/discord/role-mappings";
import type { GradeRole, GradeSecondaire } from "@/types/database";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AdminActionResult =
  | { success: true }
  | { success: false; error: string };

type UtilisateurRoleRow = { role: string };

// ─── Discord role IDs for grade_secondaire ────────────────────────────────────

const DISCORD_GRADE_SECONDAIRE_ROLES: Record<GradeSecondaire, string> = {
  "Seconde": "1478950002909777973",
  "Première": "1478950113971015822",
  "Terminal": "1478950028663062680",
};

const DISCORD_EXORCISTE_PRO_ROLE_ID = "1460101369737248798";
const DISCORD_ELEVE_ROLE_ID = "1460101248148570122";
const DISCORD_PROFESSEUR_ROLE_ID = "1460101179726893108";
const DISCORD_CONSEIL_ROLE_ID = "1478966492388397118";

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const DISCORD_GUILD_ID = "1456715316313981153";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function verifyProfOrAdmin(): Promise<{ userId: string } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié." };

  const { data: _utilisateur } = await supabase
    .from("utilisateurs")
    .select("role")
    .eq("id", user.id)
    .single();

  const utilisateur = _utilisateur as UtilisateurRoleRow | null;

  if (!utilisateur || (utilisateur.role !== "professeur" && utilisateur.role !== "admin")) {
    return { error: "Permissions insuffisantes." };
  }

  return { userId: user.id };
}

/**
 * Add or remove a Discord role from a guild member.
 * Requires DISCORD_BOT_TOKEN env variable.
 */
async function modifyDiscordRole(
  discordId: string,
  roleId: string,
  action: "add" | "remove"
): Promise<boolean> {
  if (!DISCORD_BOT_TOKEN) {
    console.warn("[admin] DISCORD_BOT_TOKEN not set, skipping Discord role sync");
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
      console.error(`[admin] Discord role ${action} failed (${res.status}):`, text);
      return false;
    }

    return true;
  } catch (err) {
    console.error(`[admin] Discord role ${action} error:`, err);
    return false;
  }
}

// ─── Changer le grade secondaire (niveau académique) ──────────────────────────

export async function changerGradeSecondaire(
  utilisateurId: string,
  nouveauGrade: GradeSecondaire
): Promise<AdminActionResult> {
  const auth = await verifyProfOrAdmin();
  if ("error" in auth) return { success: false, error: auth.error };

  const validGrades: GradeSecondaire[] = ["Seconde", "Première", "Terminal"];
  if (!validGrades.includes(nouveauGrade)) {
    return { success: false, error: "Grade secondaire invalide." };
  }

  const admin = await createAdminClient();

  // Get user's current data
  const { data: _user, error: fetchErr } = await admin
    .from("utilisateurs")
    .select("discord_id, grade_secondaire, grade_role")
    .eq("id", utilisateurId)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userData = _user as any;

  if (fetchErr || !userData) {
    return { success: false, error: "Utilisateur introuvable." };
  }

  const ancienGrade = userData.grade_secondaire as GradeSecondaire | null;

  // Update DB
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateErr } = await (admin.from("utilisateurs") as any)
    .update({ grade_secondaire: nouveauGrade })
    .eq("id", utilisateurId);

  if (updateErr) {
    return { success: false, error: "Erreur lors de la mise à jour." };
  }

  // Sync Discord roles
  const discordId = userData.discord_id as string;

  // Remove old grade secondaire role if different
  if (ancienGrade && ancienGrade !== nouveauGrade) {
    const oldRoleId = DISCORD_GRADE_SECONDAIRE_ROLES[ancienGrade];
    if (oldRoleId) {
      await modifyDiscordRole(discordId, oldRoleId, "remove");
    }
  }

  // Add new grade secondaire role
  const newRoleId = DISCORD_GRADE_SECONDAIRE_ROLES[nouveauGrade];
  if (newRoleId) {
    await modifyDiscordRole(discordId, newRoleId, "add");
  }

  revalidatePath("/administration");
  return { success: true };
}

// ─── Promouvoir en Exorciste Pro ──────────────────────────────────────────────

export async function promouvoirExorcistePro(
  utilisateurId: string
): Promise<AdminActionResult> {
  const auth = await verifyProfOrAdmin();
  if ("error" in auth) return { success: false, error: auth.error };

  const admin = await createAdminClient();

  const { data: _user, error: fetchErr } = await admin
    .from("utilisateurs")
    .select("discord_id, grade_role, grade_secondaire")
    .eq("id", utilisateurId)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userData = _user as any;

  if (fetchErr || !userData) {
    return { success: false, error: "Utilisateur introuvable." };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateErr } = await (admin.from("utilisateurs") as any)
    .update({
      grade_role: "Exorciste Pro" as GradeRole,
      grade_secondaire: null, // No longer a student
    })
    .eq("id", utilisateurId);

  if (updateErr) {
    return { success: false, error: "Erreur lors de la mise à jour." };
  }

  // ── Retirer de l'escouade (exo pro ne peut pas rester dans une escouade) ──

  const { data: _membreEscouade } = await admin
    .from("membres_escouade")
    .select("escouade_id, role_escouade")
    .eq("utilisateur_id", utilisateurId)
    .maybeSingle();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const membreEscouade = _membreEscouade as any;

  if (membreEscouade) {
    const escouadeId = membreEscouade.escouade_id as string;
    const estChef = membreEscouade.role_escouade === "chef";

    if (estChef) {
      // Transférer la propriété au plus ancien membre
      const { data: _membres } = await admin
        .from("membres_escouade")
        .select("utilisateur_id, rejoint_le")
        .eq("escouade_id", escouadeId)
        .neq("utilisateur_id", utilisateurId)
        .order("rejoint_le", { ascending: true })
        .limit(1);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const plusAncien = (_membres as any)?.[0];

      if (plusAncien) {
        // Transférer le rôle chef et la propriété
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (admin.from("membres_escouade") as any)
          .update({ role_escouade: "chef" })
          .eq("escouade_id", escouadeId)
          .eq("utilisateur_id", plusAncien.utilisateur_id);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (admin.from("escouades") as any)
          .update({ proprietaire_id: plusAncien.utilisateur_id })
          .eq("id", escouadeId);
      }
      // Si pas d'autre membre, l'escouade sera sans chef (elle sera vide)
    }

    // Retirer le membre de l'escouade
    await admin
      .from("membres_escouade")
      .delete()
      .eq("utilisateur_id", utilisateurId);

    // Retirer le rôle Discord de l'escouade
    const { data: _escouade } = await admin
      .from("escouades")
      .select("discord_role_id")
      .eq("id", escouadeId)
      .single();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const escouadeRoleId = (_escouade as any)?.discord_role_id;
    if (escouadeRoleId && userData.discord_id) {
      await modifyDiscordRole(userData.discord_id, escouadeRoleId, "remove");
    }
  }

  // ── Retirer du conseil des élèves si membre ──

  const { data: _conseilMembre } = await admin
    .from("conseil_membres")
    .select("id")
    .eq("utilisateur_id", utilisateurId)
    .maybeSingle();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (_conseilMembre) {
    await admin
      .from("conseil_membres")
      .delete()
      .eq("utilisateur_id", utilisateurId);

    // Retirer le rôle Discord du conseil
    if (userData.discord_id) {
      await modifyDiscordRole(userData.discord_id, DISCORD_CONSEIL_ROLE_ID, "remove");
    }
  }

  // Sync Discord roles
  const discordId = userData.discord_id as string;

  // Remove student role
  await modifyDiscordRole(discordId, DISCORD_ELEVE_ROLE_ID, "remove");

  // Remove old grade secondaire role if any
  const ancienGradeSecondaire = userData.grade_secondaire as GradeSecondaire | null;
  if (ancienGradeSecondaire) {
    const oldSecondaireRole = DISCORD_GRADE_SECONDAIRE_ROLES[ancienGradeSecondaire];
    if (oldSecondaireRole) {
      await modifyDiscordRole(discordId, oldSecondaireRole, "remove");
    }
  }

  // Add Exorciste Pro role
  await modifyDiscordRole(discordId, DISCORD_EXORCISTE_PRO_ROLE_ID, "add");

  revalidatePath("/administration");
  revalidatePath("/escouades");
  revalidatePath("/conseil");
  return { success: true };
}

// ─── Rétrograder (remettre en Élève Exorciste + Seconde) ──────────────────────

export async function retrograderEleve(
  utilisateurId: string
): Promise<AdminActionResult> {
  const auth = await verifyProfOrAdmin();
  if ("error" in auth) return { success: false, error: auth.error };

  const admin = await createAdminClient();

  // Vérifier si l'appelant est Directeur/Co-Directeur (pour demotion élargie)
  const { data: _caller } = await admin
    .from("utilisateurs")
    .select("grade_role")
    .eq("id", auth.userId)
    .single();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const callerGradeRole = (_caller as any)?.grade_role as string | null;
  const callerIsDirector = callerGradeRole === "Directeur" || callerGradeRole === "Co-Directeur";

  const { data: _user, error: fetchErr } = await admin
    .from("utilisateurs")
    .select("discord_id, grade_role, grade_secondaire")
    .eq("id", utilisateurId)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userData = _user as any;

  if (fetchErr || !userData) {
    return { success: false, error: "Utilisateur introuvable." };
  }

  const targetGradeRole = userData.grade_role as string | null;

  // Un prof ne peut rétrograder que les Exo Pro
  // Un Directeur/Co-Directeur peut rétrograder n'importe qui sauf un autre Directeur
  if (!callerIsDirector && targetGradeRole !== "Exorciste Pro") {
    return { success: false, error: "Seul un Directeur ou Co-Directeur peut rétrograder ce grade." };
  }
  if (targetGradeRole === "Directeur" || targetGradeRole === "Co-Directeur") {
    return { success: false, error: "Impossible de rétrograder un Directeur ou Co-Directeur." };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updatePayload: Record<string, any> = {
    grade_role: "Élève Exorciste" as GradeRole,
    grade_secondaire: "Seconde" as GradeSecondaire,
  };

  // Si on rétrograde un prof ou exo pro, remettre le rôle applicatif en élève
  if (targetGradeRole === "Professeur" || targetGradeRole === "Exorciste Pro") {
    updatePayload.role = "eleve";
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateErr } = await (admin.from("utilisateurs") as any)
    .update(updatePayload)
    .eq("id", utilisateurId);

  if (updateErr) {
    return { success: false, error: "Erreur lors de la mise à jour." };
  }

  // Sync Discord roles
  const discordId = userData.discord_id as string;

  // Remove Exorciste Pro role if was pro
  if (userData.grade_role === "Exorciste Pro") {
    await modifyDiscordRole(discordId, DISCORD_EXORCISTE_PRO_ROLE_ID, "remove");
  }

  // Remove Professeur role if was prof
  if (userData.grade_role === "Professeur") {
    await modifyDiscordRole(discordId, DISCORD_PROFESSEUR_ROLE_ID, "remove");
  }

  // Remove old grade secondaire role
  const ancienGrade = userData.grade_secondaire as GradeSecondaire | null;
  if (ancienGrade) {
    const oldRoleId = DISCORD_GRADE_SECONDAIRE_ROLES[ancienGrade];
    if (oldRoleId) {
      await modifyDiscordRole(discordId, oldRoleId, "remove");
    }
  }

  // Add Élève Exorciste role
  await modifyDiscordRole(discordId, DISCORD_ELEVE_ROLE_ID, "add");

  // Add Seconde role
  await modifyDiscordRole(discordId, DISCORD_GRADE_SECONDAIRE_ROLES["Seconde"], "add");

  revalidatePath("/administration");
  return { success: true };
}

// ─── Récupérer l'historique d'évaluations individuelles d'un élève ────────────

export type EvalIndividuelleRow = {
  id: string;
  competence: string;
  note: number;
  commentaire: string;
  cree_le: string;
  evaluateur: {
    pseudo: string;
    avatar_url: string | null;
  };
};

export async function getEvaluationsIndividuelles(
  utilisateurId: string
): Promise<EvalIndividuelleRow[]> {
  const auth = await verifyProfOrAdmin();
  if ("error" in auth) return [];

  const admin = await createAdminClient();

  const { data, error } = await admin
    .from("evaluations_individuelles")
    .select(`
      id,
      competence,
      note,
      commentaire,
      cree_le,
      utilisateurs!evaluations_individuelles_evaluateur_id_fkey (
        pseudo,
        avatar_url
      )
    `)
    .eq("utilisateur_id", utilisateurId)
    .order("cree_le", { ascending: false });

  if (error || !data) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((row) => ({
    id: row.id,
    competence: row.competence,
    note: row.note,
    commentaire: row.commentaire,
    cree_le: row.cree_le,
    evaluateur: {
      pseudo: row.utilisateurs?.pseudo ?? "Inconnu",
      avatar_url: row.utilisateurs?.avatar_url ?? null,
    },
  }));
}

// ─── Récupérer la moyenne des évaluations (radar) d'un élève ──────────────────

export type MoyenneEvaluations = {
  maitrise_energie_occulte: number;
  sang_froid: number;
  discipline: number;
  intelligence_tactique: number;
  travail_equipe: number;
  premiers_soin: number;
  combat: number;
  initiative: number;
  connaissance_theorique: number;
  pedagogie: number;
  nombre_evaluations: number;
  moyenne_globale: number;
};

export async function getMoyenneEvaluations(
  utilisateurId: string
): Promise<MoyenneEvaluations | null> {
  const supabase = await createClient();

  const { data: evaluations } = await supabase
    .from("evaluations")
    .select("maitrise_energie_occulte, sang_froid, discipline, intelligence_tactique, travail_equipe, premiers_soin, combat, initiative, connaissance_theorique, pedagogie")
    .eq("utilisateur_id", utilisateurId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const evals = (evaluations ?? []) as any[];
  if (evals.length === 0) return null;

  const count = evals.length;
  const sum = {
    maitrise_energie_occulte: 0,
    sang_froid: 0,
    discipline: 0,
    intelligence_tactique: 0,
    travail_equipe: 0,
    premiers_soin: 0,
    combat: 0,
    initiative: 0,
    connaissance_theorique: 0,
    pedagogie: 0,
  };

  for (const ev of evals) {
    sum.maitrise_energie_occulte += ev.maitrise_energie_occulte;
    sum.sang_froid += ev.sang_froid;
    sum.discipline += ev.discipline;
    sum.intelligence_tactique += ev.intelligence_tactique;
    sum.travail_equipe += ev.travail_equipe;
    sum.premiers_soin += ev.premiers_soin;
    sum.combat += ev.combat;
    sum.initiative += ev.initiative;
    sum.connaissance_theorique += ev.connaissance_theorique;
    sum.pedagogie += ev.pedagogie;
  }

  const avg = {
    maitrise_energie_occulte: Math.round(sum.maitrise_energie_occulte / count),
    sang_froid: Math.round(sum.sang_froid / count),
    discipline: Math.round(sum.discipline / count),
    intelligence_tactique: Math.round(sum.intelligence_tactique / count),
    travail_equipe: Math.round(sum.travail_equipe / count),
    premiers_soin: Math.round(sum.premiers_soin / count),
    combat: Math.round(sum.combat / count),
    initiative: Math.round(sum.initiative / count),
    connaissance_theorique: Math.round(sum.connaissance_theorique / count),
    pedagogie: Math.round(sum.pedagogie / count),
  };

  const avgTotal = avg.maitrise_energie_occulte + avg.sang_froid + avg.discipline + avg.intelligence_tactique + avg.travail_equipe + avg.premiers_soin + avg.combat + avg.initiative + avg.connaissance_theorique + avg.pedagogie;
  const moyenneGlobale = Math.round(avgTotal / 10);

  return {
    ...avg,
    nombre_evaluations: count,
    moyenne_globale: moyenneGlobale,
  };
}

// ─── Supprimer une évaluation individuelle (admin/directeur) ──────────────────

/**
 * Supprime une évaluation individuelle.
 * Les professeurs/admins peuvent supprimer n'importe quelle évaluation.
 * L'évaluateur (créateur) peut aussi supprimer la sienne via evaluation/actions.ts.
 */
export async function supprimerEvaluationIndividuelleAdmin(
  evalId: string
): Promise<AdminActionResult> {
  if (!evalId || typeof evalId !== "string") {
    return { success: false, error: "Identifiant invalide." };
  }

  const auth = await verifyProfOrAdmin();
  if ("error" in auth) return { success: false, error: auth.error };

  const admin = await createAdminClient();

  const { data: _eval } = await admin
    .from("evaluations_individuelles")
    .select("id")
    .eq("id", evalId)
    .maybeSingle();

  if (!_eval) {
    return { success: false, error: "Évaluation introuvable." };
  }

  const { error } = await admin
    .from("evaluations_individuelles")
    .delete()
    .eq("id", evalId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/administration");
  return { success: true };
}

// ─── Set tous les utilisateurs sans grade académique en Seconde ───────────────

export async function setAllSansGradeEnSeconde(): Promise<AdminActionResult & { count?: number }> {
  const auth = await verifyProfOrAdmin();
  if ("error" in auth) return { success: false, error: auth.error };

  const admin = await createAdminClient();

  // Récupérer uniquement les Élèves Exorcistes sans grade_secondaire
  const { data: _users, error: fetchErr } = await admin
    .from("utilisateurs")
    .select("id, discord_id")
    .eq("grade_role", "Élève Exorciste")
    .is("grade_secondaire", null);

  if (fetchErr) {
    return { success: false, error: "Erreur lors de la récupération des utilisateurs." };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const users = (_users ?? []) as any[];
  if (users.length === 0) {
    return { success: true, count: 0 };
  }

  const ids = users.map((u) => u.id as string);

  // Bulk update en base
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateErr } = await (admin.from("utilisateurs") as any)
    .update({ grade_secondaire: "Seconde" })
    .in("id", ids);

  if (updateErr) {
    return { success: false, error: "Erreur lors de la mise à jour en base." };
  }

  // Sync Discord : ajouter le rôle Seconde à chaque utilisateur
  const secondeRoleId = DISCORD_GRADE_SECONDAIRE_ROLES["Seconde"];
  for (const u of users) {
    if (u.discord_id) {
      await modifyDiscordRole(u.discord_id, secondeRoleId, "add");
    }
  }

  revalidatePath("/administration");
  return { success: true, count: users.length };
}

// ─── Synchroniser les grades secondaires depuis les rôles Discord ─────────────

export async function syncGradesFromDiscord(): Promise<AdminActionResult & { synced?: number; removed?: number; errors?: number }> {
  const auth = await verifyProfOrAdmin();
  if ("error" in auth) return { success: false, error: auth.error };

  const admin = await createAdminClient();

  // Récupérer tous les utilisateurs avec un discord_id
  const { data: _users, error: fetchErr } = await admin
    .from("utilisateurs")
    .select("id, discord_id, grade_secondaire");

  if (fetchErr || !_users) {
    return { success: false, error: "Erreur lors de la récupération des utilisateurs." };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const users = _users as any[];

  let synced = 0;
  let removed = 0;
  let errors = 0;

  for (const user of users) {
    if (!user.discord_id) continue;

    try {
      const member = await fetchDiscordGuildMemberByBot(user.discord_id);
      const discordGrade = getGradeSecondaireFromDiscordRoles(member.roles);
      const currentGrade = user.grade_secondaire as string | null;

      // Si le grade Discord diffère du grade en base, on met à jour
      if (discordGrade !== currentGrade) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: updateErr } = await (admin.from("utilisateurs") as any)
          .update({ grade_secondaire: discordGrade })
          .eq("id", user.id);

        if (updateErr) {
          errors++;
          continue;
        }

        if (!discordGrade && currentGrade) {
          removed++;
        } else {
          synced++;
        }
      }

      // ── Sync grade secondaire → Discord roles ─────────────────────
      // Ajouter le rôle Discord correspondant et retirer les autres
      if (discordGrade) {
        const targetRoleId = DISCORD_GRADE_SECONDAIRE_ROLES[discordGrade];
        if (!member.roles.includes(targetRoleId)) {
          await modifyDiscordRole(user.discord_id, targetRoleId, "add");
        }
        // Retirer les rôles grade secondaire incorrects
        for (const gs of (["Seconde", "Première", "Terminal"] as GradeSecondaire[])) {
          if (gs !== discordGrade) {
            const oldRoleId = DISCORD_GRADE_SECONDAIRE_ROLES[gs];
            if (member.roles.includes(oldRoleId)) {
              await modifyDiscordRole(user.discord_id, oldRoleId, "remove");
            }
          }
        }
      } else {
        // Pas de grade secondaire (prof/admin/exo pro) → retirer tous les rôles grade secondaire
        for (const gs of (["Seconde", "Première", "Terminal"] as GradeSecondaire[])) {
          const roleId = DISCORD_GRADE_SECONDAIRE_ROLES[gs];
          if (member.roles.includes(roleId)) {
            await modifyDiscordRole(user.discord_id, roleId, "remove");
          }
        }
      }

      // Rate limiting Discord API
      await new Promise((r) => setTimeout(r, 100));
    } catch {
      errors++;
    }
  }

  revalidatePath("/administration");
  return { success: true, synced, removed, errors };
}

// ─── Récupérer l'historique des points personnels d'un élève (admin) ──────────

export type PointsHistoriqueRow = {
  id: string;
  points: number;
  justification: string;
  source: string;
  cree_le: string;
  attribue_par_pseudo: string | null;
};

export async function getPointsHistoriqueAdmin(
  utilisateurId: string
): Promise<PointsHistoriqueRow[]> {
  const auth = await verifyProfOrAdmin();
  if ("error" in auth) return [];

  const admin = await createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: _hist, error } = await (admin.from("historique_points_personnels") as any)
    .select("id, points, justification, source, cree_le, attribue_par")
    .eq("utilisateur_id", utilisateurId)
    .order("cree_le", { ascending: false })
    .limit(200);

  if (error || !_hist) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hist = _hist as any[];

  // Récupérer les pseudos des attributeurs
  const attribueParIds = [...new Set(
    hist.map((h) => h.attribue_par).filter(Boolean)
  )] as string[];

  let pseudoMap: Record<string, string> = {};
  if (attribueParIds.length > 0) {
    const { data: _pseudos } = await admin
      .from("utilisateurs")
      .select("id, pseudo")
      .in("id", attribueParIds);
    for (const p of (_pseudos ?? []) as { id: string; pseudo: string }[]) {
      pseudoMap[p.id] = p.pseudo;
    }
  }

  return hist.map((h) => ({
    id: h.id,
    points: h.points,
    justification: h.justification ?? "",
    source: h.source,
    cree_le: h.cree_le,
    attribue_par_pseudo: h.attribue_par ? (pseudoMap[h.attribue_par] ?? null) : null,
  }));
}

// ─── Annuler une entrée de points personnels (admin/directeur/prof principal) ─

export async function annulerPointsPersonnels(
  entryId: string
): Promise<AdminActionResult> {
  if (!entryId || typeof entryId !== "string") {
    return { success: false, error: "Identifiant invalide." };
  }

  const auth = await verifyProfOrAdmin();
  if ("error" in auth) return { success: false, error: auth.error };

  const admin = await createAdminClient();

  // Vérifier que l'appelant est admin, prof principal, directeur ou co-directeur
  const { data: _caller } = await admin
    .from("utilisateurs")
    .select("role, grade_role")
    .eq("id", auth.userId)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const caller = _caller as any;
  if (!caller) return { success: false, error: "Utilisateur introuvable." };

  const callerRole = caller.role as string;
  const callerGradeRole = caller.grade_role as string | null;
  const canCancel =
    callerRole === "admin" ||
    callerGradeRole === "Professeur Principal" ||
    callerGradeRole === "Directeur" ||
    callerGradeRole === "Co-Directeur";

  if (!canCancel) {
    return { success: false, error: "Seuls les administrateurs, le professeur principal et la direction peuvent annuler des points." };
  }

  // Récupérer l'entrée de points
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: _entry } = await (admin.from("historique_points_personnels") as any)
    .select("id, utilisateur_id, points")
    .eq("id", entryId)
    .maybeSingle();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entry = _entry as any;
  if (!entry) {
    return { success: false, error: "Entrée de points introuvable." };
  }

  // Retrancher les points de l'utilisateur (ne pas descendre en dessous de 0)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: _user } = await (admin.from("utilisateurs") as any)
    .select("points_personnels")
    .eq("id", entry.utilisateur_id)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentPoints = (_user as any)?.points_personnels ?? 0;
  const newPoints = Math.max(0, currentPoints - entry.points);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateErr } = await (admin.from("utilisateurs") as any)
    .update({ points_personnels: newPoints })
    .eq("id", entry.utilisateur_id);

  if (updateErr) {
    return { success: false, error: "Erreur lors de la mise à jour des points." };
  }

  // Supprimer l'entrée de l'historique
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: deleteErr } = await (admin.from("historique_points_personnels") as any)
    .delete()
    .eq("id", entryId);

  if (deleteErr) {
    return { success: false, error: "Erreur lors de la suppression de l'entrée." };
  }

  revalidatePath("/administration");
  revalidatePath("/classement/personnel");
  revalidatePath("/profil");
  return { success: true };
}
