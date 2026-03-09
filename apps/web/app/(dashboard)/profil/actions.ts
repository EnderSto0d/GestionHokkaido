"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { fetchDiscordGuildMemberByBot, addDiscordRoleToMember, removeDiscordRoleFromMember } from "@/lib/discord/guild-member";
import { resolveDiscordRoles, getGradeSecondaireFromDiscordRoles, GRADE_SECONDAIRE_TO_ROLE_ID, ALL_GRADES_SECONDAIRES } from "@/lib/discord/role-mappings";
import type { SortsInnes, Specialites, ArtsMartiaux } from "@/types/database";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProfileFormData = {
  prenom_rp: string | null;
  nom_rp: string | null;
  sort_inne: SortsInnes | null;
  specialite: Specialites | null;
  art_martial: ArtsMartiaux | null;
  reliques: string | null;
  sub_jutsu: string | null;
  style_combat: string | null;
  // Pseudo override (sets pseudo_custom = true)
  pseudo: string | null;
};

export type ProfileActionResult =
  | { success: true }
  | { success: false; error: string };

// ─── Valeurs autorisées ───────────────────────────────────────────────────────

const SORTS_VALIDES: SortsInnes[] = [
  "Altération Absolue", "Animaux Fantastiques", "Boogie Woogie", "Bourrasque",
  "Clonage", "Corbeau", "Givre", "Intervalle", "Jardin Floral", "Venin",
  "Projection Occulte", "Rage Volcanique",
];

const SPECIALITES_VALIDES: Specialites[] = ["Assassin", "Combattant", "Support", "Tank"];
const ARTS_MARTIAUX_VALIDES: ArtsMartiaux[] = ["CorpACorp", "Kenjutsu"];

// ─── Mettre à jour le profil ──────────────────────────────────────────────────

export async function updateProfile(data: ProfileFormData): Promise<ProfileActionResult> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "Vous devez être connecté." };
  }

  // Validation
  if (data.prenom_rp && data.prenom_rp.length > 60) {
    return { success: false, error: "Le prénom RP ne peut pas dépasser 60 caractères." };
  }
  if (data.nom_rp && data.nom_rp.length > 60) {
    return { success: false, error: "Le nom RP ne peut pas dépasser 60 caractères." };
  }
  if (data.sort_inne && !SORTS_VALIDES.includes(data.sort_inne)) {
    return { success: false, error: "Sort inné invalide." };
  }
  if (data.specialite && !SPECIALITES_VALIDES.includes(data.specialite)) {
    return { success: false, error: "Spécialité invalide." };
  }
  if (data.art_martial && !ARTS_MARTIAUX_VALIDES.includes(data.art_martial)) {
    return { success: false, error: "Style de combat invalide." };
  }
  if (data.reliques && data.reliques.length > 1000) {
    return { success: false, error: "Les reliques ne peuvent pas dépasser 1000 caractères." };
  }
  if (data.sub_jutsu && data.sub_jutsu.length > 1000) {
    return { success: false, error: "Le sub jutsu ne peut pas dépasser 1000 caractères." };
  }
  if (data.style_combat && data.style_combat.length > 200) {
    return { success: false, error: "Le style de combat ne peut pas dépasser 200 caractères." };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updatePayload: Record<string, any> = {
    prenom_rp: data.prenom_rp?.trim() || null,
    nom_rp: data.nom_rp?.trim() || null,
    sort_inne: data.sort_inne || null,
    specialite: data.specialite || null,
    art_martial: data.art_martial || null,
    reliques: data.reliques?.trim() || null,
    sub_jutsu: data.sub_jutsu?.trim() || null,
    style_combat: data.style_combat?.trim() || null,
  };

  // Si le pseudo est modifié, marquer pseudo_custom
  if (data.pseudo && data.pseudo.trim().length >= 2) {
    updatePayload.pseudo = data.pseudo.trim();
    updatePayload.pseudo_custom = true;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase.from("utilisateurs") as any)
    .update(updatePayload)
    .eq("id", user.id);

  if (updateError) {
    console.error("[profil/actions] Erreur UPDATE :", updateError);
    return { success: false, error: "Erreur lors de la mise à jour du profil." };
  }

  revalidatePath("/profil");
  revalidatePath("/escouades");
  return { success: true };
}

// ─── Marquer l'avatar comme custom (quand l'utilisateur upload une image) ────

export async function setAvatarCustom(avatarUrl: string): Promise<ProfileActionResult> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "Vous devez être connecté." };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("utilisateurs") as any)
    .update({ avatar_url: avatarUrl, avatar_custom: true })
    .eq("id", user.id);

  if (error) {
    return { success: false, error: "Erreur lors de la mise à jour de l'avatar." };
  }

  revalidatePath("/profil");
  return { success: true };
}

// ─── Récupérer le profil complet ──────────────────────────────────────────────

export async function getFullProfile() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("utilisateurs")
    .select("*")
    .eq("id", user.id)
    .single();

  return data;
}

// ─── Synchroniser le profil avec les rôles Discord actuels ────────────────────

export async function syncWithDiscord(): Promise<ProfileActionResult> {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { success: false, error: "Vous devez être connecté." };
  }

  // Récupérer discord_id et les flags custom
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: utilisateur, error: selectError } = await (supabase.from("utilisateurs") as any)
    .select("discord_id, pseudo_custom, avatar_custom")
    .eq("id", user.id)
    .single();

  if (selectError || !utilisateur?.discord_id) {
    return { success: false, error: "Impossible de récupérer votre Discord ID." };
  }

  try {
    const member = await fetchDiscordGuildMemberByBot(utilisateur.discord_id);

    const { grade, gradeRole, division, divisions, appRole } = resolveDiscordRoles(member.roles);
    const gradeSecondaire = getGradeSecondaireFromDiscordRoles(member.roles);

    const avatarUrl = member.user.avatar
      ? `https://cdn.discordapp.com/avatars/${member.user.id}/${member.user.avatar}.png?size=256`
      : null;
    const pseudoFromDiscord =
      member.nick ?? member.user.global_name ?? member.user.username;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatePayload: Record<string, any> = {
      role: appRole,
      grade: grade,
      grade_role: gradeRole,
      division: division,  // rétrocompat : première division
      grade_secondaire: gradeSecondaire,
    };

    if (!utilisateur.pseudo_custom) {
      updatePayload.pseudo = pseudoFromDiscord;
    }
    if (!utilisateur.avatar_custom) {
      updatePayload.avatar_url = avatarUrl;
    }

    const adminClient = await createAdminClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (adminClient.from("utilisateurs") as any)
      .update(updatePayload)
      .eq("id", user.id);

    // ── Sync multi-divisions ──────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (adminClient.from("utilisateur_divisions") as any)
      .delete()
      .eq("utilisateur_id", user.id);

    if (divisions.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (adminClient.from("utilisateur_divisions") as any)
        .insert(
          divisions.map((d) => ({
            utilisateur_id: user.id,
            division: d.division,
            role_division: d.role_division,
          }))
        );
    }

    if (updateError) {
      console.error("[profil/sync] Erreur UPDATE :", updateError);
      return { success: false, error: `Erreur lors de la synchronisation avec Discord : ${updateError.message}` };
    }

    // ── Sync grade secondaire → Discord roles ─────────────────────
    if (gradeSecondaire) {
      try {
        const targetRoleId = GRADE_SECONDAIRE_TO_ROLE_ID[gradeSecondaire];
        if (!member.roles.includes(targetRoleId)) {
          await addDiscordRoleToMember(utilisateur.discord_id, targetRoleId);
          console.log(`[profil/sync] Rôle ${gradeSecondaire} ajouté sur Discord pour ${utilisateur.discord_id}`);
        }
        for (const gs of ALL_GRADES_SECONDAIRES) {
          if (gs !== gradeSecondaire) {
            const oldRoleId = GRADE_SECONDAIRE_TO_ROLE_ID[gs];
            if (member.roles.includes(oldRoleId)) {
              await removeDiscordRoleFromMember(utilisateur.discord_id, oldRoleId);
              console.log(`[profil/sync] Rôle ${gs} retiré sur Discord pour ${utilisateur.discord_id}`);
            }
          }
        }
      } catch (roleErr) {
        console.error("[profil/sync] Impossible de synchroniser les rôles grade secondaire Discord :", roleErr);
      }
    }

    revalidatePath("/profil");
    revalidatePath("/escouades");
    revalidatePath("/classement");
    return { success: true };
  } catch (err) {
    console.error("[profil/sync] Erreur Discord API :", err);
    return { success: false, error: "Impossible de contacter Discord. Vérifiez que le bot est configuré." };
  }
}
