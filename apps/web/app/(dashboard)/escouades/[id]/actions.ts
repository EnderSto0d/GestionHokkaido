"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActionResult =
  | { success: true }
  | { success: false; error: string };

type EscouadeRow = { proprietaire_id: string };

// ─── Transfert de propriété ───────────────────────────────────────────────────

/**
 * Transfère la propriété d'une escouade à un autre membre.
 * Seul le propriétaire actuel peut effectuer cette opération.
 */
export async function transfererPropriete(
  escouadeId: string,
  nouveauProprietaireId: string
): Promise<ActionResult> {
  const supabase = await createClient();

  // Vérifier que l'utilisateur courant est bien authentifié
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Vous devez être connecté pour effectuer cette action." };
  }

  // Vérifier que l'utilisateur courant est bien le propriétaire
  const { data: _escouade, error: fetchError } = await supabase
    .from("escouades")
    .select("proprietaire_id")
    .eq("id", escouadeId)
    .single();
  const escouade = _escouade as EscouadeRow | null;

  if (fetchError || !escouade) {
    return { success: false, error: "Escouade introuvable." };
  }

  if (escouade.proprietaire_id !== user.id) {
    return {
      success: false,
      error: "Seul le propriétaire de l'escouade peut transférer la propriété.",
    };
  }

  if (nouveauProprietaireId === user.id) {
    return {
      success: false,
      error: "Vous êtes déjà le propriétaire de cette escouade.",
    };
  }

  // Vérifier que le destinataire est bien membre de l'escouade
  const { data: _membreValide, error: membreError } = await supabase
    .from("membres_escouade")
    .select("utilisateur_id")
    .eq("escouade_id", escouadeId)
    .eq("utilisateur_id", nouveauProprietaireId)
    .maybeSingle();

  if (membreError) {
    return { success: false, error: "Erreur lors de la vérification du membre." };
  }

  if (!_membreValide) {
    return {
      success: false,
      error: "Le destinataire doit être membre de l'escouade.",
    };
  }

  // Effectuer le transfert
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase.from("escouades") as any)
    .update({ proprietaire_id: nouveauProprietaireId })
    .eq("id", escouadeId);

  if (updateError) {
    return { success: false, error: "Erreur lors du transfert de propriété." };
  }

  revalidatePath(`/escouades/${escouadeId}`);
  return { success: true };
}
