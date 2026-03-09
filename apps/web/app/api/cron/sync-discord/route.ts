import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { fetchDiscordGuildMemberByBot, addDiscordRoleToMember, removeDiscordRoleFromMember } from "@/lib/discord/guild-member";
import { resolveDiscordRoles, getGradeSecondaireFromDiscordRoles, GRADE_SECONDAIRE_TO_ROLE_ID, ALL_GRADES_SECONDAIRES } from "@/lib/discord/role-mappings";

/**
 * GET /api/cron/sync-discord
 *
 * Synchronise TOUS les utilisateurs de la DB avec leurs rôles Discord actuels.
 * Appelé quotidiennement par Vercel Cron.
 *
 * Protégé par CRON_SECRET (header Authorization: Bearer <secret>).
 */
export async function GET(req: NextRequest) {
  // Vérifier le secret cron
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const admin = await createAdminClient();

  // Récupérer tous les utilisateurs avec un discord_id
  const { data: utilisateurs, error } = await admin
    .from("utilisateurs")
    .select("id, discord_id, pseudo_custom, avatar_custom");

  if (error || !utilisateurs) {
    console.error("[cron/sync-discord] Erreur récupération utilisateurs:", error);
    return NextResponse.json({ error: "Erreur DB." }, { status: 500 });
  }

  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const user of utilisateurs) {
    if (!user.discord_id) {
      continue;
    }

    try {
      const member = await fetchDiscordGuildMemberByBot(user.discord_id);

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

      if (!user.pseudo_custom) {
        updatePayload.pseudo = pseudoFromDiscord;
      }
      if (!user.avatar_custom) {
        updatePayload.avatar_url = avatarUrl;
      }

      const { error: updateError } = await admin
        .from("utilisateurs")
        .update(updatePayload)
        .eq("id", user.id);

      // ── Sync multi-divisions ──────────────────────────────────────
      // Supprimer les anciennes divisions puis insérer les nouvelles
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin.from("utilisateur_divisions") as any)
        .delete()
        .eq("utilisateur_id", user.id);

      if (divisions.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (admin.from("utilisateur_divisions") as any)
          .insert(
            divisions.map((d) => ({
              utilisateur_id: user.id,
              division: d.division,
              role_division: d.role_division,
            }))
          );
      }

      if (updateError) {
        failed++;
        errors.push(`${user.discord_id}: ${updateError.message}`);
      } else {
        synced++;
      }

      // ── Sync grade secondaire → Discord roles ─────────────────────
      if (gradeSecondaire) {
        const targetRoleId = GRADE_SECONDAIRE_TO_ROLE_ID[gradeSecondaire];
        if (!member.roles.includes(targetRoleId)) {
          await addDiscordRoleToMember(user.discord_id, targetRoleId);
        }
        for (const gs of ALL_GRADES_SECONDAIRES) {
          if (gs !== gradeSecondaire) {
            const oldRoleId = GRADE_SECONDAIRE_TO_ROLE_ID[gs];
            if (member.roles.includes(oldRoleId)) {
              await removeDiscordRoleFromMember(user.discord_id, oldRoleId);
            }
          }
        }
      }

      // Rate limiting : ~50 requêtes/seconde max Discord
      // On attend 100ms entre chaque pour rester safe
      await new Promise((r) => setTimeout(r, 100));
    } catch (err) {
      failed++;
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${user.discord_id}: ${msg}`);
    }
  }

  console.log(`[cron/sync-discord] Terminé: ${synced} sync, ${failed} erreurs sur ${utilisateurs.length} utilisateurs.`);

  return NextResponse.json({
    total: utilisateurs.length,
    synced,
    failed,
    errors: errors.slice(0, 10), // Limiter la taille de la réponse
  });
}
