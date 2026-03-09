"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActionResult =
  | { success: true; nouveauxPoints: number }
  | { success: false; error: string };

type UtilisateurRoleRow = { role: string };
type EscouadePointsRow = { points: number };

// ─── Constantes ───────────────────────────────────────────────────────────────

/** Valeur maximale (absolue) qu'un delta peut avoir par appel. */
const DELTA_MAX = 1000;

// ─── Modifier les points d'une escouade ───────────────────────────────────────

/**
 * Modifie les points d'une escouade de `delta` unités (positif ou négatif).
 *
 * Sécurité :
 *  - L'utilisateur doit être authentifié.
 *  - Le rôle de l'utilisateur doit être "professeur" ou "admin".
 *  - La mise à jour s'effectue via le client admin (service_role) pour
 *    contourner le RLS qui limite les écritures au propriétaire/admin,
 *    tout en garantissant que la vérification de rôle est réalisée côté
 *    serveur dans cette action sécurisée.
 *
 * @param escouadeId  UUID de l'escouade à modifier.
 * @param delta       Variation de points (ex: +10 ou -10).
 */
export async function modifierPoints(
  escouadeId: string,
  delta: number
): Promise<ActionResult> {
  // ── 1. Valider les paramètres ───────────────────────────────────────────
  if (!escouadeId || typeof escouadeId !== "string") {
    return { success: false, error: "Identifiant d'escouade invalide." };
  }

  if (!Number.isInteger(delta) || Math.abs(delta) > DELTA_MAX || delta === 0) {
    return {
      success: false,
      error: `La variation de points doit être un entier non nul entre -${DELTA_MAX} et +${DELTA_MAX}.`,
    };
  }

  // ── 2. Vérifier l'authentification ─────────────────────────────────────
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: "Vous devez être connecté pour effectuer cette action.",
    };
  }

  // ── 3. Vérifier le rôle de l'utilisateur ───────────────────────────────
  const { data: _utilisateur, error: roleError } = await supabase
    .from("utilisateurs")
    .select("role")
    .eq("id", user.id)
    .single();

  const utilisateur = _utilisateur as UtilisateurRoleRow | null;

  if (roleError || !utilisateur) {
    return {
      success: false,
      error: "Impossible de vérifier vos autorisations.",
    };
  }

  if (utilisateur.role !== "professeur" && utilisateur.role !== "admin") {
    return {
      success: false,
      error: "Seuls les professeurs et les administrateurs peuvent modifier les points.",
    };
  }

  // ── 4. Lire les points actuels (via client admin pour fiabilité) ────────
  const adminClient = await createAdminClient();

  const { data: _escouade, error: fetchError } = await adminClient
    .from("escouades")
    .select("points")
    .eq("id", escouadeId)
    .single();

  const escouade = _escouade as EscouadePointsRow | null;

  if (fetchError || !escouade) {
    return { success: false, error: "Escouade introuvable." };
  }

  const nouveauxPoints = escouade.points + delta;

  // ── 5. Mettre à jour les points ─────────────────────────────────────────
  const { error: updateError } = await adminClient
    .from("escouades")
    .update({ points: nouveauxPoints })
    .eq("id", escouadeId);

  if (updateError) {
    return {
      success: false,
      error: "Une erreur est survenue lors de la mise à jour des points.",
    };
  }

  // ── 6. Invalider le cache de la page et retourner le résultat ──────────
  revalidatePath("/administration");

  return { success: true, nouveauxPoints };
}
