"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { calculateLogisticsBonus, DIVISION_PRODUCTION_LOGISTICS } from "@/lib/logistics/config";

import type { RolesUtilisateur, GradeRole } from "@/types/database";

// ─── Types ────────────────────────────────────────────────────────────────────

export type LogisticsActionResult =
  | { success: true; pointsGained: number; logisticsTotal: number }
  | { success: false; error: string };

export type LogisticsItemRow = {
  id: string;
  key: string;
  label: string;
  category: string;
  points_per_unit: number;
  actif: boolean;
};

export type AdminItemResult =
  | { success: true }
  | { success: false; error: string };

// ─── Guard : vérifie que l'utilisateur courant est membre de P&L ──────────────

async function assertProductionLogisticsMember(): Promise<string> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Non authentifié.");
  }

  // Admin et directeurs ont accès sans être membres de la division
  const { data: utilisateur } = await supabase
    .from("utilisateurs")
    .select("role, grade_role")
    .eq("id", user.id)
    .single();

  const u = utilisateur as { role: RolesUtilisateur; grade_role: GradeRole | null } | null;
  const isAdminOrDirector =
    u?.role === "admin" ||
    u?.grade_role === "Directeur" ||
    u?.grade_role === "Co-Directeur";

  if (!isAdminOrDirector) {
    const { data: divRow } = await supabase
      .from("utilisateur_divisions")
      .select("id")
      .eq("utilisateur_id", user.id)
      .eq("division", DIVISION_PRODUCTION_LOGISTICS)
      .limit(1);

    if (!divRow || divRow.length === 0) {
      throw new Error("Accès refusé : vous n'êtes pas membre de la division Production & Logistique.");
    }
  }

  return user.id;
}

// ─── Action principale ────────────────────────────────────────────────────────

/**
 * Enregistre la réception d'une ressource/blueprint/objet crafté.
 * Calcule les points logistique gagnés (quantité × valeur de l'item),
 * appelle la RPC qui met à jour logistics_points + répercute le bonus
 * 5 % plafonné sur points_personnels et points d'escouade.
 *
 * ⚠ CORRECTION ARCHITECTURALE : les points vont au DONNEUR (donneurId),
 *   pas au membre logistique qui enregistre le don.
 */
export async function enregistrerRessource(
  itemKey: string,
  quantite: number,
  donneurId: string
): Promise<LogisticsActionResult> {
  try {
    // 1. Vérification des droits (l'utilisateur connecté est le membre logistique)
    const userId = await assertProductionLogisticsMember();

    // 2. Validation des inputs
    if (!Number.isInteger(quantite) || quantite <= 0) {
      return { success: false, error: "La quantité doit être un entier strictement positif." };
    }
    if (quantite > 9_999) {
      return { success: false, error: "La quantité ne peut pas dépasser 9 999." };
    }
    if (!donneurId) {
      return { success: false, error: "Veuillez sélectionner un donneur." };
    }

    // 3. Charger l'item depuis la DB (source de vérité pour la valeur en points)
    const admin = await createAdminClient();

    const { data: itemRow } = await admin
      .from("logistics_items")
      .select("id, key, label, points_per_unit, actif")
      .eq("key", itemKey)
      .single();

    if (!itemRow) {
      return { success: false, error: "Item inconnu." };
    }
    if (!itemRow.actif) {
      return { success: false, error: "Cet item est désactivé." };
    }

    // 4. Calcul des points
    const pointsGained = itemRow.points_per_unit * quantite;

    // 5. Appel RPC — crédite le DONNEUR (pas le membre logistique)
    await admin.rpc("enregistrer_points_logistique", {
      p_user_id: donneurId,
      p_points_gained: pointsGained,
    });

    // 6. Enregistrer le don dans l'historique (avec FK vers logistics_items)
    await admin.from("dons_logistique").insert({
      donneur_id: donneurId,
      enregistre_par: userId,
      item_id: itemRow.id,
      item_key: itemRow.key,
      item_label: itemRow.label,
      quantite,
      points_gagnes: pointsGained,
    });

    // 7. Récupérer le nouveau solde du DONNEUR pour le retour UI
    const { data: donneur } = await admin
      .from("utilisateurs")
      .select("logistics_points")
      .eq("id", donneurId)
      .single();

    const logisticsTotal: number = donneur?.logistics_points ?? 0;

    revalidatePath("/production-logistique");

    return { success: true, pointsGained, logisticsTotal };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue.";
    return { success: false, error: message };
  }
}

// ─── Loader : données initiales de la page ────────────────────────────────────

export type LogisticsPageData = {
  logisticsPoints: number;
  bonusPersonnel: number;
};

/**
 * Récupère les logistics_points courants de l'utilisateur connecté.
 * Utilisé dans le Server Component de la page.
 */
export async function getLogisticsPageData(): Promise<LogisticsPageData> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { logisticsPoints: 0, bonusPersonnel: 0 };
  }

  const { data } = await supabase
    .from("utilisateurs")
    .select("logistics_points")
    .eq("id", user.id)
    .single();

  const row = data as { logistics_points: number } | null;
  const logisticsPoints: number = row?.logistics_points ?? 0;
  const cap = await getGlobalBonusCap();
  const bonusPersonnel = calculateLogisticsBonus(logisticsPoints, cap);

  return { logisticsPoints, bonusPersonnel };
}

// ─── Loader : liste des utilisateurs pour le sélecteur de donneur ─────────────

export type UtilisateurOption = {
  id: string;
  pseudo: string;
};

export async function getUtilisateursOptions(): Promise<UtilisateurOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("utilisateurs")
    .select("id, pseudo")
    .order("pseudo", { ascending: true });

  return (data ?? []) as UtilisateurOption[];
}

// ─── Loader : historique des dons ─────────────────────────────────────────────

export type DonLogistique = {
  id: string;
  donneur_pseudo: string;
  enregistre_par_pseudo: string;
  item_label: string;
  quantite: number;
  points_gagnes: number;
  created_at: string;
};

export async function getDonsLogistique(): Promise<DonLogistique[]> {
  const admin = await createAdminClient();

  const { data } = await admin
    .from("dons_logistique")
    .select("id, donneur_id, enregistre_par, item_label, quantite, points_gagnes, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (!data || data.length === 0) return [];

  // Récupérer les pseudos en batch
  const userIds = [
    ...new Set((data as any[]).flatMap((d: any) => [d.donneur_id, d.enregistre_par])),
  ];

  const { data: users } = await admin
    .from("utilisateurs")
    .select("id, pseudo")
    .in("id", userIds);

  const pseudoMap = new Map((users ?? []).map((u: any) => [u.id, u.pseudo as string]));

  return (data as any[]).map((d: any) => ({
    id: d.id,
    donneur_pseudo: pseudoMap.get(d.donneur_id) ?? "Inconnu",
    enregistre_par_pseudo: pseudoMap.get(d.enregistre_par) ?? "Inconnu",
    item_label: d.item_label,
    quantite: d.quantite,
    points_gagnes: d.points_gagnes,
    created_at: d.created_at,
  }));
}

// ─── Loader : liste des étudiants avec stats de dons ──────────────────────────

export type StudentDonationSummary = {
  id: string;
  pseudo: string;
  avatar_url: string | null;
  grade: string | null;
  logistics_points: number;
  bonus_personnel: number;
  total_dons: number;
  total_points_donnes: number;
};

export async function getStudentsWithDonationStats(): Promise<StudentDonationSummary[]> {
  const admin = await createAdminClient();

  const { data: utilisateurs } = await admin
    .from("utilisateurs")
    .select("id, pseudo, avatar_url, grade, logistics_points")
    .order("pseudo", { ascending: true });

  if (!utilisateurs || utilisateurs.length === 0) return [];

  // Tous les dons groupés par donneur (comptage + somme points)
  const { data: dons } = await admin
    .from("dons_logistique")
    .select("donneur_id, quantite, points_gagnes");

  // Agréger côté serveur
  const donStats = new Map<string, { count: number; totalPoints: number }>();
  if (dons) {
    for (const d of dons as any[]) {
      const existing = donStats.get(d.donneur_id) ?? { count: 0, totalPoints: 0 };
      existing.count += 1;
      existing.totalPoints += d.points_gagnes ?? 0;
      donStats.set(d.donneur_id, existing);
    }
  }

  const cap = await getGlobalBonusCap();

  return (utilisateurs as any[]).map((u) => {
    const stats = donStats.get(u.id) ?? { count: 0, totalPoints: 0 };
    const lp: number = u.logistics_points ?? 0;
    return {
      id: u.id,
      pseudo: u.pseudo,
      avatar_url: u.avatar_url,
      grade: u.grade,
      logistics_points: lp,
      bonus_personnel: calculateLogisticsBonus(lp, cap),
      total_dons: stats.count,
      total_points_donnes: stats.totalPoints,
    };
  });
}

// ─── Loader : historique complet des dons d'un étudiant ───────────────────────

export async function getDonsForStudent(studentId: string): Promise<DonLogistique[]> {
  await assertProductionLogisticsMember();

  const admin = await createAdminClient();

  const { data } = await admin
    .from("dons_logistique")
    .select("id, donneur_id, enregistre_par, item_label, quantite, points_gagnes, created_at")
    .eq("donneur_id", studentId)
    .order("created_at", { ascending: false });

  if (!data || data.length === 0) return [];

  const userIds = [
    ...new Set((data as any[]).flatMap((d: any) => [d.donneur_id, d.enregistre_par])),
  ];

  const { data: users } = await admin
    .from("utilisateurs")
    .select("id, pseudo")
    .in("id", userIds);

  const pseudoMap = new Map((users ?? []).map((u: any) => [u.id, u.pseudo as string]));

  return (data as any[]).map((d: any) => ({
    id: d.id,
    donneur_pseudo: pseudoMap.get(d.donneur_id) ?? "Inconnu",
    enregistre_par_pseudo: pseudoMap.get(d.enregistre_par) ?? "Inconnu",
    item_label: d.item_label,
    quantite: d.quantite,
    points_gagnes: d.points_gagnes,
    created_at: d.created_at,
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// Administration Logistique — CRUD items & plafond global
// Rôles autorisés : Admin, Directeur, Co-Directeur, Professeur + membre P&L
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Guard : vérifie que l'utilisateur est admin logistique ───────────────────

async function assertAdminRole(): Promise<string> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Non authentifié.");
  }

  const { data: utilisateur } = await supabase
    .from("utilisateurs")
    .select("role, grade_role")
    .eq("id", user.id)
    .single();

  const adm = utilisateur as { role: RolesUtilisateur; grade_role: GradeRole | null } | null;

  // Admin, Directeur, Co-Directeur ont accès directement
  const isAdminOrDirector =
    adm?.role === "admin" ||
    adm?.grade_role === "Directeur" ||
    adm?.grade_role === "Co-Directeur";

  if (isAdminOrDirector) return user.id;

  // Professeur + membre de la division P&L = Responsable Logistique
  if (adm?.role === "professeur") {
    const { data: divRow } = await supabase
      .from("utilisateur_divisions")
      .select("id")
      .eq("utilisateur_id", user.id)
      .eq("division", DIVISION_PRODUCTION_LOGISTICS)
      .limit(1);

    if (divRow && divRow.length > 0) return user.id;
  }

  throw new Error("Accès refusé : droits d'administration logistique requis.");
}

// ─── Vérifie si l'utilisateur courant est admin (non-throwing) ────────────────

export async function checkIsLogisticsAdmin(): Promise<boolean> {
  try {
    await assertAdminRole();
    return true;
  } catch {
    return false;
  }
}

// ─── Loader : items actifs depuis la DB ───────────────────────────────────────

/**
 * Retourne tous les logistics_items actifs, triés par catégorie.
 * Source de vérité pour le formulaire de saisie (remplace le catalogue hardcodé).
 */
export async function getLogisticsItems(): Promise<LogisticsItemRow[]> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("logistics_items")
    .select("id, key, label, category, points_per_unit, actif")
    .eq("actif", true)
    .order("category")
    .order("label");

  return (data ?? []) as LogisticsItemRow[];
}

/**
 * Retourne TOUS les items (actifs et inactifs) — pour l'écran d'administration.
 */
export async function getAllLogisticsItems(): Promise<LogisticsItemRow[]> {
  const admin = await createAdminClient();

  const { data } = await admin
    .from("logistics_items")
    .select("id, key, label, category, points_per_unit, actif")
    .order("category")
    .order("label");

  return (data ?? []) as LogisticsItemRow[];
}

// ─── Loader : plafond global du bonus ─────────────────────────────────────────

export async function getGlobalBonusCap(): Promise<number> {
  const admin = await createAdminClient();

  const { data } = await admin
    .from("app_config")
    .select("value")
    .eq("key", "MAX_COUNTABLE_LOGISTICS_POINTS")
    .single();

  return data?.value ? parseInt(data.value, 10) : 200;
}

// ─── Admin : CRUD Logistics Items ─────────────────────────────────────────────

/**
 * Crée un nouvel item logistique (admin uniquement).
 */
export async function createLogisticsItem(
  key: string,
  label: string,
  category: string,
  pointsPerUnit: number
): Promise<AdminItemResult> {
  try {
    await assertAdminRole();

    if (!key.trim() || !label.trim() || !category.trim()) {
      return { success: false, error: "Tous les champs sont requis." };
    }
    if (!Number.isInteger(pointsPerUnit) || pointsPerUnit < 0) {
      return { success: false, error: "Les points par unité doivent être un entier ≥ 0." };
    }

    const admin = await createAdminClient();

    const { error } = await admin.from("logistics_items").insert({
      key: key.trim(),
      label: label.trim(),
      category: category.trim(),
      points_per_unit: pointsPerUnit,
    });

    if (error) {
      if (error.code === "23505") {
        return { success: false, error: "Un item avec cette clé existe déjà." };
      }
      return { success: false, error: error.message };
    }

    revalidatePath("/production-logistique");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue.";
    return { success: false, error: message };
  }
}

/**
 * Met à jour un item logistique existant (admin uniquement).
 * Permet de changer label, catégorie, valeur en points, ou actif/inactif.
 */
export async function updateLogisticsItem(
  itemId: string,
  updates: { label?: string; category?: string; points_per_unit?: number; actif?: boolean }
): Promise<AdminItemResult> {
  try {
    await assertAdminRole();

    if (updates.points_per_unit !== undefined && (updates.points_per_unit < 0 || !Number.isInteger(updates.points_per_unit))) {
      return { success: false, error: "Les points par unité doivent être un entier ≥ 0." };
    }

    const admin = await createAdminClient();

    const { error } = await admin
      .from("logistics_items")
      .update(updates)
      .eq("id", itemId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/production-logistique");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue.";
    return { success: false, error: message };
  }
}

// ─── Admin : Global Bonus Cap ─────────────────────────────────────────────────

/**
 * Met à jour le plafond global du bonus logistique (admin uniquement).
 * Ce plafond est stocké dans app_config et lu par la RPC PostgreSQL.
 */
export async function updateGlobalBonusCap(newCap: number): Promise<AdminItemResult> {
  try {
    await assertAdminRole();

    if (!Number.isInteger(newCap) || newCap < 0 || newCap > 100_000) {
      return { success: false, error: "Le plafond doit être un entier entre 0 et 100 000." };
    }

    const admin = await createAdminClient();

    const { error } = await admin
      .from("app_config")
      .upsert({ key: "MAX_COUNTABLE_LOGISTICS_POINTS", value: String(newCap) });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/production-logistique");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue.";
    return { success: false, error: message };
  }
}
