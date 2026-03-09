"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// ─── Types ────────────────────────────────────────────────────────────────────

export type InvitationResult =
  | { success: true }
  | { success: false; error: string };

// ─── Créer une invitation ─────────────────────────────────────────────────────

export async function creerInvitation(
  escouadeId: string,
  utilisateurCibleId: string
): Promise<InvitationResult> {
  if (!escouadeId || !utilisateurCibleId) {
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

  // Vérifier que l'utilisateur est le propriétaire de l'escouade
  const { data: _escouade, error: escouadeError } = await supabase
    .from("escouades")
    .select("id, proprietaire_id")
    .eq("id", escouadeId)
    .single();
  const escouade = _escouade as { id: string; proprietaire_id: string } | null;

  if (escouadeError || !escouade) {
    return { success: false, error: "Escouade introuvable." };
  }

  if (escouade.proprietaire_id !== user.id) {
    return {
      success: false,
      error: "Seul le propriétaire de l'escouade peut envoyer des invitations.",
    };
  }

  if (utilisateurCibleId === user.id) {
    return {
      success: false,
      error: "Vous ne pouvez pas vous inviter vous-même.",
    };
  }

  // Vérifier la limite de 5 membres par escouade
  const { data: membresActuels } = await supabase
    .from("membres_escouade")
    .select("utilisateur_id")
    .eq("escouade_id", escouadeId);

  if (membresActuels && membresActuels.length >= 5) {
    return {
      success: false,
      error: "L'escouade a atteint la limite de 5 membres.",
    };
  }

  // Vérifier que l'utilisateur cible n'est pas déjà membre
  const { data: dejaMembreListe } = await supabase
    .from("membres_escouade")
    .select("utilisateur_id")
    .eq("escouade_id", escouadeId)
    .eq("utilisateur_id", utilisateurCibleId);

  if (dejaMembreListe && dejaMembreListe.length > 0) {
    return {
      success: false,
      error: "Cet utilisateur est déjà membre de l'escouade.",
    };
  }

  // Vérifier qu'il n'y a pas déjà une invitation en attente
  const { data: invitationExistante } = await supabase
    .from("invitations_escouade")
    .select("id")
    .eq("escouade_id", escouadeId)
    .eq("utilisateur_id", utilisateurCibleId)
    .eq("statut", "en_attente");

  if (invitationExistante && invitationExistante.length > 0) {
    return {
      success: false,
      error: "Une invitation est déjà en attente pour cet utilisateur.",
    };
  }

  // Supprimer les anciennes invitations refusées pour permettre une nouvelle
  const adminClient = await createAdminClient();
  await adminClient
    .from("invitations_escouade")
    .delete()
    .eq("escouade_id", escouadeId)
    .eq("utilisateur_id", utilisateurCibleId)
    .neq("statut", "en_attente");

  // Créer l'invitation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: insertError } = await (supabase.from("invitations_escouade") as any)
    .insert({
      escouade_id: escouadeId,
      invite_par: user.id,
      utilisateur_id: utilisateurCibleId,
      statut: "en_attente",
    });

  if (insertError) {
    return {
      success: false,
      error: "Erreur lors de la création de l'invitation.",
    };
  }

  revalidatePath(`/escouades/${escouadeId}`);
  revalidatePath("/profil");
  return { success: true };
}

// ─── Accepter une invitation ──────────────────────────────────────────────────

export async function accepterInvitation(
  invitationId: string
): Promise<InvitationResult> {
  if (!invitationId) {
    return { success: false, error: "Identifiant d'invitation manquant." };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Vous devez être connecté." };
  }

  // Récupérer l'invitation
  const adminClient = await createAdminClient();

  const { data: _invitation, error: invError } = await adminClient
    .from("invitations_escouade")
    .select("id, escouade_id, utilisateur_id, statut")
    .eq("id", invitationId)
    .single();
  const invitation = _invitation as { id: string; escouade_id: string; utilisateur_id: string; statut: string } | null;

  if (invError || !invitation) {
    return { success: false, error: "Invitation introuvable." };
  }

  if (invitation.statut !== "en_attente") {
    return { success: false, error: "Cette invitation n'est plus en attente." };
  }

  // Vérifier que l'invitation est bien pour l'utilisateur courant
  if (invitation.utilisateur_id !== user.id) {
    return {
      success: false,
      error: "Vous n'êtes pas autorisé à accepter cette invitation.",
    };
  }

  // Vérifier que l'utilisateur n'est pas déjà dans une escouade
  const { data: dejaMembreListe } = await supabase
    .from("membres_escouade")
    .select("utilisateur_id")
    .eq("utilisateur_id", user.id);

  if (dejaMembreListe && dejaMembreListe.length > 0) {
    return {
      success: false,
      error: "Vous êtes déjà membre d'une escouade. Quittez-la d'abord.",
    };
  }

  // Vérifier la limite de 5 membres par escouade
  const { data: membresEscouade } = await adminClient
    .from("membres_escouade")
    .select("utilisateur_id")
    .eq("escouade_id", invitation.escouade_id);

  if (membresEscouade && membresEscouade.length >= 5) {
    return {
      success: false,
      error: "L'escouade a atteint la limite de 5 membres.",
    };
  }

  // Mettre à jour le statut de l'invitation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (adminClient.from("invitations_escouade") as any)
    .update({ statut: "acceptee" })
    .eq("id", invitationId);

  if (updateError) {
    return {
      success: false,
      error: "Erreur lors de l'acceptation de l'invitation.",
    };
  }

  // Ajouter l'utilisateur comme membre de l'escouade
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: membreError } = await (adminClient.from("membres_escouade") as any)
    .insert({
      escouade_id: invitation.escouade_id,
      utilisateur_id: user.id,
      role_escouade: "membre",
    });

  if (membreError) {
    // Rollback le statut si l'ajout échoue
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminClient.from("invitations_escouade") as any)
      .update({ statut: "en_attente" })
      .eq("id", invitationId);

    return {
      success: false,
      error: "Erreur lors de l'ajout à l'escouade.",
    };
  }

  revalidatePath(`/escouades/${invitation.escouade_id}`);
  revalidatePath("/profil");
  return { success: true };
}

// ─── Refuser une invitation ───────────────────────────────────────────────────

export async function refuserInvitation(
  invitationId: string
): Promise<InvitationResult> {
  if (!invitationId) {
    return { success: false, error: "Identifiant d'invitation manquant." };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Vous devez être connecté." };
  }

  const adminClient = await createAdminClient();

  const { data: _invitation2, error: invError } = await adminClient
    .from("invitations_escouade")
    .select("id, escouade_id, utilisateur_id, statut")
    .eq("id", invitationId)
    .single();
  const invitation = _invitation2 as { id: string; escouade_id: string; utilisateur_id: string; statut: string } | null;

  if (invError || !invitation) {
    return { success: false, error: "Invitation introuvable." };
  }

  if (invitation.statut !== "en_attente") {
    return { success: false, error: "Cette invitation n'est plus en attente." };
  }

  // Vérifier que l'invitation est bien pour l'utilisateur courant
  if (invitation.utilisateur_id !== user.id) {
    return {
      success: false,
      error: "Vous n'êtes pas autorisé à refuser cette invitation.",
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (adminClient.from("invitations_escouade") as any)
    .update({ statut: "refusee" })
    .eq("id", invitationId);

  if (updateError) {
    return {
      success: false,
      error: "Erreur lors du refus de l'invitation.",
    };
  }

  revalidatePath("/profil");
  return { success: true };
}

// ─── Récupérer les invitations en attente pour l'utilisateur courant ─────────

export async function getInvitationsEnAttente() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: invitations, error } = await (supabase.from("invitations_escouade") as any)
    .select(
      `
      id,
      statut,
      cree_le,
      escouades (
        id,
        nom,
        url_logo
      )
    `
    )
    .eq("utilisateur_id", user.id)
    .eq("statut", "en_attente")
    .order("cree_le", { ascending: false });

  if (error) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (invitations ?? []) as any[];
}
