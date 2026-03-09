"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EscouadeCustomResult =
  | { success: true }
  | { success: false; error: string };

export type PhotoSetting = { scale: number; posX: number; posY: number };
export type PhotoSettings = {
  photo_1?: PhotoSetting;
  photo_2?: PhotoSetting;
  photo_3?: PhotoSetting;
};

export type EscouadeCustomData = {
  description?: string | null;
  url_logo?: string | null;
  url_banniere?: string | null;
  url_photo_1?: string | null;
  url_photo_2?: string | null;
  url_photo_3?: string | null;
  photo_settings?: PhotoSettings | null;
};

// ─── Personnaliser une escouade ───────────────────────────────────────────────

export async function personnaliserEscouade(
  escouadeId: string,
  data: EscouadeCustomData
): Promise<EscouadeCustomResult> {
  if (!escouadeId) {
    return { success: false, error: "Identifiant d'escouade manquant." };
  }

  if (data.description && data.description.length > 2000) {
    return {
      success: false,
      error: "La description ne peut pas dépasser 2000 caractères.",
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Vous devez être connecté." };
  }

  // Vérifier la propriété
  const { data: _escouade, error: fetchError } = await supabase
    .from("escouades")
    .select("id, proprietaire_id")
    .eq("id", escouadeId)
    .single();
  const escouade = _escouade as { id: string; proprietaire_id: string } | null;

  if (fetchError || !escouade) {
    return { success: false, error: "Escouade introuvable." };
  }

  if (escouade.proprietaire_id !== user.id) {
    return {
      success: false,
      error: "Seul le propriétaire peut personnaliser l'escouade.",
    };
  }

  // Construire les champs à mettre à jour (ne mettre à jour que les champs fournis)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updatePayload: Record<string, any> = {};

  if (data.description !== undefined)
    updatePayload.description = data.description?.trim() || null;
  if (data.url_logo !== undefined) updatePayload.url_logo = data.url_logo || null;
  if (data.url_banniere !== undefined)
    updatePayload.url_banniere = data.url_banniere || null;
  if (data.url_photo_1 !== undefined)
    updatePayload.url_photo_1 = data.url_photo_1 || null;
  if (data.url_photo_2 !== undefined)
    updatePayload.url_photo_2 = data.url_photo_2 || null;
  if (data.url_photo_3 !== undefined)
    updatePayload.url_photo_3 = data.url_photo_3 || null;
  if (data.photo_settings !== undefined)
    updatePayload.photo_settings = data.photo_settings || null;

  if (Object.keys(updatePayload).length === 0) {
    return { success: false, error: "Aucune modification à appliquer." };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase.from("escouades") as any)
    .update(updatePayload)
    .eq("id", escouadeId);

  if (updateError) {
    return {
      success: false,
      error: "Erreur lors de la personnalisation de l'escouade.",
    };
  }

  revalidatePath(`/escouades/${escouadeId}`);
  return { success: true };
}

// ─── Quitter une escouade ─────────────────────────────────────────────────────

export async function quitterEscouade(
  escouadeId: string
): Promise<EscouadeCustomResult> {
  if (!escouadeId) {
    return { success: false, error: "Paramètres manquants." };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Vous devez être connecté." };
  }

  // Vérifier que l'utilisateur n'est pas le propriétaire de l'escouade
  const { data: _escouadeQ } = await supabase
    .from("escouades")
    .select("proprietaire_id")
    .eq("id", escouadeId)
    .single();
  const escouadeQ = _escouadeQ as { proprietaire_id: string } | null;

  if (escouadeQ?.proprietaire_id === user.id) {
    return {
      success: false,
      error:
        "Le propriétaire ne peut pas quitter l'escouade. Transférez d'abord la propriété ou supprimez l'escouade.",
    };
  }

  // Pénalité de départ V2 : l'escouade perd une fraction de ses points
  // Formule : Pénalité = Points d'escouade × (1 / Nombre de membres AVANT départ)
  // L'utilisateur conserve 100% de ses points personnels.
  const admin = await createAdminClient();

  // Compter les membres AVANT le départ
  const { count: memberCountBefore } = await admin
    .from("membres_escouade")
    .select("id", { count: "exact", head: true })
    .eq("escouade_id", escouadeId);

  const totalMembersBefore = memberCountBefore ?? 1;

  // Récupérer les points actuels de l'escouade
  const { data: _escouadePoints } = await admin
    .from("escouades")
    .select("points")
    .eq("id", escouadeId)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentSquadPoints = (_escouadePoints as any)?.points ?? 0;

  if (currentSquadPoints > 0 && totalMembersBefore > 0) {
    const penalty = Math.floor(currentSquadPoints * (1 / totalMembersBefore));
    const newSquadPoints = currentSquadPoints - penalty;

    await admin
      .from("escouades")
      .update({ points: newSquadPoints })
      .eq("id", escouadeId);

    // Log dans hauts_faits_escouade
    await admin.from("hauts_faits_escouade").insert({
      escouade_id: escouadeId,
      attribue_par: user.id,
      points: -penalty,
      raison: `Départ d'un membre (pénalité : -${penalty} pts)`,
    });
  }

  const { error: deleteError } = await supabase
    .from("membres_escouade")
    .delete()
    .eq("escouade_id", escouadeId)
    .eq("utilisateur_id", user.id);

  if (deleteError) {
    return {
      success: false,
      error: "Erreur lors du retrait de l'escouade.",
    };
  }

  revalidatePath(`/escouades/${escouadeId}`);
  revalidatePath("/profil");
  return { success: true };
}
