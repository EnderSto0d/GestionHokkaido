"use server";

import { revalidatePath } from "next/cache";
import { DISCORD_GUILD_ID } from "@/lib/discord/guild-member";
import { createClient, createAdminClient } from "@/lib/supabase/server";

const DISCORD_API_BASE_URL = "https://discord.com/api/v10";

// ─── Types ────────────────────────────────────────────────────────────────────

type DiscordSyncSuccess = {
  success: true;
  roleId: string;
  leaderDiscordId: string;
};

type DiscordSyncFailure = {
  success: false;
  error: string;
};

export type DiscordSyncResult = DiscordSyncSuccess | DiscordSyncFailure;

export type CreateSquadResult =
  | { success: true; escouadeId: string }
  | { success: false; error: string };

export type DeleteSquadResult =
  | { success: true }
  | { success: false; error: string };

type UtilisateurDiscordRow = { discord_id: string };
type CreateRoleResponse = { id: string; name: string };

// ─── Helper : obtenir le bot token ────────────────────────────────────────────

function getBotToken(): string | null {
  return process.env.DISCORD_BOT_TOKEN ?? null;
}

// ─── Discord : créer un rôle et l'assigner au leader ─────────────────────────

export async function syncNouvelleEscouadeDiscord(
  squadName: string,
  squadLeaderUserId: string
): Promise<DiscordSyncResult> {
  const roleName = squadName.trim();

  if (!roleName) {
    return { success: false, error: "Le nom de l'escouade est requis." };
  }

  if (roleName.length > 100) {
    return {
      success: false,
      error: "Le nom de l'escouade ne peut pas dépasser 100 caractères pour Discord.",
    };
  }

  if (!squadLeaderUserId || typeof squadLeaderUserId !== "string") {
    return { success: false, error: "Identifiant du chef d'escouade invalide." };
  }

  const botToken = getBotToken();

  if (!botToken) {
    return {
      success: false,
      error: "Variable d'environnement DISCORD_BOT_TOKEN manquante.",
    };
  }

  const adminClient = await createAdminClient();

  const { data: _leader, error: leaderError } = await adminClient
    .from("utilisateurs")
    .select("discord_id")
    .eq("id", squadLeaderUserId)
    .single();

  const leader = _leader as UtilisateurDiscordRow | null;

  if (leaderError || !leader?.discord_id) {
    return {
      success: false,
      error: "Impossible de retrouver le Discord ID du chef d'escouade.",
    };
  }

  // POST — Créer le rôle Discord
  const createRoleResponse = await fetch(
    `${DISCORD_API_BASE_URL}/guilds/${DISCORD_GUILD_ID}/roles`,
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: roleName }),
      cache: "no-store",
    }
  );

  if (!createRoleResponse.ok) {
    const errorBody = await createRoleResponse.text();
    return {
      success: false,
      error: `Discord a refusé la création du rôle (${createRoleResponse.status}) : ${errorBody}`,
    };
  }

  const role = (await createRoleResponse.json()) as CreateRoleResponse;

  if (!role?.id) {
    return {
      success: false,
      error: "Discord n'a pas renvoyé d'identifiant de rôle.",
    };
  }

  // PUT — Assigner le rôle au leader
  const assignRoleResponse = await fetch(
    `${DISCORD_API_BASE_URL}/guilds/${DISCORD_GUILD_ID}/members/${leader.discord_id}/roles/${role.id}`,
    {
      method: "PUT",
      headers: { Authorization: `Bot ${botToken}` },
      cache: "no-store",
    }
  );

  if (!assignRoleResponse.ok) {
    const errorBody = await assignRoleResponse.text();
    return {
      success: false,
      error: `Rôle créé mais attribution impossible (${assignRoleResponse.status}) : ${errorBody}`,
    };
  }

  return {
    success: true,
    roleId: role.id,
    leaderDiscordId: leader.discord_id,
  };
}

// ─── Créer une escouade complète (Discord + Supabase) ─────────────────────────

export async function createSquadWithDiscordRole(
  nom: string
): Promise<CreateSquadResult> {
  if (!nom || nom.trim().length < 2 || nom.trim().length > 100) {
    return {
      success: false,
      error: "Le nom de l'escouade doit contenir entre 2 et 100 caractères.",
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

  // Vérifier que l'utilisateur n'est pas déjà dans une escouade (1 max)
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

  // Vérifier l'unicité du nom
  const { data: existant } = await supabase
    .from("escouades")
    .select("id")
    .eq("nom", nom.trim())
    .maybeSingle();

  if (existant) {
    return {
      success: false,
      error: "Une escouade porte déjà ce nom.",
    };
  }

  // 1) Sync Discord — créer le rôle + assigner au leader
  const discordResult = await syncNouvelleEscouadeDiscord(nom, user.id);

  if (!discordResult.success) {
    return { success: false, error: discordResult.error };
  }

  // 2) Insérer l'escouade dans Supabase
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: _escouade, error: insertError } = await (supabase.from("escouades") as any)
    .insert({
      nom: nom.trim(),
      proprietaire_id: user.id,
      discord_role_id: discordResult.roleId,
    })
    .select("id")
    .single();
  const escouade = _escouade as { id: string } | null;

  if (insertError || !escouade) {
    // Rollback Discord : tenter de supprimer le rôle créé
    const botToken = getBotToken();
    if (botToken) {
      await fetch(
        `${DISCORD_API_BASE_URL}/guilds/${DISCORD_GUILD_ID}/roles/${discordResult.roleId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bot ${botToken}` },
          cache: "no-store",
        }
      ).catch(() => {
        // Silencieux — le rôle orphelin sera nettoyé manuellement
      });
    }

    return {
      success: false,
      error: "Erreur lors de la création de l'escouade en base de données.",
    };
  }

  // 3) Ajouter le créateur comme « chef » de l'escouade
  const adminClient = await createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (adminClient.from("membres_escouade") as any).insert({
    escouade_id: escouade.id,
    utilisateur_id: user.id,
    role_escouade: "chef",
  });

  revalidatePath("/escouades");
  revalidatePath("/profil");
  return { success: true, escouadeId: escouade.id };
}

// ─── Supprimer une escouade et le rôle Discord associé ────────────────────────

export async function deleteSquadAndDiscordRole(
  escouadeId: string
): Promise<DeleteSquadResult> {
  if (!escouadeId) {
    return { success: false, error: "Identifiant d'escouade manquant." };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Vous devez être connecté." };
  }

  // Récupérer l'escouade
  const { data: _escouadeDel, error: fetchError } = await supabase
    .from("escouades")
    .select("id, proprietaire_id, discord_role_id")
    .eq("id", escouadeId)
    .single();
  const escouadeDel = _escouadeDel as { id: string; proprietaire_id: string; discord_role_id: string | null } | null;

  if (fetchError || !escouadeDel) {
    return { success: false, error: "Escouade introuvable." };
  }

  // Vérifier si l'utilisateur est admin/directeur/co-directeur
  const { data: _utilisateur } = await supabase
    .from("utilisateurs")
    .select("role, grade_role")
    .eq("id", user.id)
    .single();
  const utilisateur = _utilisateur as { role: string; grade_role: string | null } | null;

  const estAdminDirecteur = utilisateur?.role === "admin";

  if (escouadeDel.proprietaire_id !== user.id && !estAdminDirecteur) {
    return {
      success: false,
      error: "Seul le propriétaire ou un directeur peut supprimer l'escouade.",
    };
  }

  // 1) DELETE sur Discord — supprimer le rôle
  if (escouadeDel.discord_role_id) {
    const botToken = getBotToken();

    if (botToken) {
      const deleteRoleResponse = await fetch(
        `${DISCORD_API_BASE_URL}/guilds/${DISCORD_GUILD_ID}/roles/${escouadeDel.discord_role_id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bot ${botToken}` },
          cache: "no-store",
        }
      );

      if (!deleteRoleResponse.ok && deleteRoleResponse.status !== 404) {
        const errorBody = await deleteRoleResponse.text();
        return {
          success: false,
          error: `Impossible de supprimer le rôle Discord (${deleteRoleResponse.status}) : ${errorBody}`,
        };
      }
    }
  }

  // 2) Supprimer de Supabase (cascade supprimera membres et invitations)
  // Utiliser le client admin si c'est un directeur (bypass RLS)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let deleteError: any = null;
  if (estAdminDirecteur) {
    const adminClient = await createAdminClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await (adminClient.from("escouades") as any).delete().eq("id", escouadeId);
    deleteError = res.error;
  } else {
    const res = await supabase.from("escouades").delete().eq("id", escouadeId);
    deleteError = res.error;
  }

  if (deleteError) {
    return {
      success: false,
      error: "Erreur lors de la suppression de l'escouade.",
    };
  }

  revalidatePath("/escouades");
  revalidatePath("/profil");
  return { success: true };
}

// ─── Lister toutes les escouades (pour la page listing) ───────────────────────

export async function getEscouades() {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase
    .from("escouades") as any)
    .select(
      `
      id,
      nom,
      description,
      url_logo,
      points,
      proprietaire_id,
      utilisateurs!escouades_proprietaire_id_fkey ( pseudo ),
      membres_escouade ( utilisateur_id )
    `
    )
    .order("points", { ascending: false });

  if (error) return [];
  // Filtrer les escouades avec moins de 3 membres (non comptabilisées)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).filter(
    (e: any) => (e.membres_escouade?.length ?? 0) >= 3
  );
}
