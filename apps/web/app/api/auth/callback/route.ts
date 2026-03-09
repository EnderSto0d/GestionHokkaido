import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/server";
import { DISCORD_GUILD_ID, fetchDiscordGuildMember, addDiscordRoleToMember, removeDiscordRoleFromMember } from "@/lib/discord/guild-member";
import { resolveDiscordRoles, GRADE_SECONDAIRE_TO_ROLE_ID, ALL_GRADES_SECONDAIRES } from "@/lib/discord/role-mappings";
import { getGradeSecondaireFromDiscordRoles } from "@/lib/discord/role-mappings";
import { SITE_ID } from "@/lib/site-config";
import type { Database } from "@/types/database";

/**
 * GET /api/auth/callback
 * Callback OAuth2 Supabase après connexion via Discord.
 * Supabase échange le code contre une session et redirige l'utilisateur.
 * Upsert l'utilisateur dans notre table `utilisateurs` avec avatar, rôle,
 * grade, division et pseudo — tous déterminés par les rôles Discord.
 *
 * IMPORTANT : On crée le client Supabase directement ici (au lieu de
 * createClient()) pour collecter les cookies et les appliquer sur la
 * réponse de redirection. Sans cela, les cookies de session sont perdus
 * et l'utilisateur doit se connecter deux fois.
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  // Priorité : query param → cookie → défaut profil
  const cookieNext = req.cookies.get("auth_redirect")?.value
    ? decodeURIComponent(req.cookies.get("auth_redirect")!.value)
    : null;
  const next = searchParams.get("next") ?? cookieNext ?? "/profil";
  const safeNext = (next.startsWith("/") && !next.startsWith("//")) ? next : "/profil";

  // Collecteur de cookies — on les appliquera sur la réponse de redirection
  const collectedCookies: { name: string; value: string; options: CookieOptions }[] = [];

  if (code) {
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return req.cookies.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
            cookiesToSet.forEach((cookie) => {
              collectedCookies.push(cookie);
              // Mettre à jour aussi les cookies de la requête pour les lectures ultérieures
              req.cookies.set(cookie.name, cookie.value);
            });
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const providerToken = data.session?.provider_token;

      if (!providerToken) {
        const response = NextResponse.redirect(`${origin}/login?error=discord_token_missing`);
        applyCollectedCookies(response, collectedCookies);
        return response;
      }

      try {
        const member = await fetchDiscordGuildMember(providerToken, DISCORD_GUILD_ID);

        // Sauvegarder les rôles Discord dans les user metadata Supabase
        await supabase.auth.updateUser({
          data: {
            discord_guild_id: DISCORD_GUILD_ID,
            discord_user_id: member.user.id,
            discord_roles: member.roles,
            discord_roles_synced_at: new Date().toISOString(),
          },
        });

        // Synchroniser l'utilisateur dans notre table `utilisateurs`
        const { grade, gradeRole, division, divisions, clans, appRole } = resolveDiscordRoles(member.roles);
        const gradeSecondaire = getGradeSecondaireFromDiscordRoles(member.roles);

        // Primary clan: patriarche first, then membre, then null
        const primaryClan = clans.find((c) => c.role_clan === "patriarche")?.clan
          ?? clans[0]?.clan
          ?? null;

        // Auto-attribution du rôle Discord grade secondaire sur le serveur :
        // Si l'utilisateur a un grade secondaire (Seconde, Première ou Terminal),
        // on s'assure que le rôle Discord correspondant est attribué et les autres retirés.
        if (gradeSecondaire) {
          try {
            const targetRoleId = GRADE_SECONDAIRE_TO_ROLE_ID[gradeSecondaire];
            // Ajouter le rôle correspondant s'il ne l'a pas déjà
            if (!member.roles.includes(targetRoleId)) {
              await addDiscordRoleToMember(member.user.id, targetRoleId);
              console.log(`[auth/callback] Rôle ${gradeSecondaire} ajouté sur Discord pour ${member.user.id}`);
            }
            // Retirer les autres rôles grade secondaire
            for (const gs of ALL_GRADES_SECONDAIRES) {
              if (gs !== gradeSecondaire) {
                const oldRoleId = GRADE_SECONDAIRE_TO_ROLE_ID[gs];
                if (member.roles.includes(oldRoleId)) {
                  await removeDiscordRoleFromMember(member.user.id, oldRoleId);
                  console.log(`[auth/callback] Rôle ${gs} retiré sur Discord pour ${member.user.id}`);
                }
              }
            }
          } catch (roleErr) {
            console.error("[auth/callback] Impossible de synchroniser les rôles grade secondaire Discord :", roleErr);
          }
        }

        const avatarUrl = member.user.avatar
          ? `https://cdn.discordapp.com/avatars/${member.user.id}/${member.user.avatar}.png?size=256`
          : null;
        const pseudoFromDiscord =
          member.nick ?? member.user.global_name ?? member.user.username;

        const adminClient = await createAdminClient();

        // Vérifier si l'utilisateur existe déjà pour respecter les overrides manuels
        // Recherche par (auth_user_id, site) pour le support multi-site
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: existingUser, error: selectError } = await (adminClient.from("utilisateurs") as any)
          .select("id, pseudo_custom, avatar_custom")
          .eq("auth_user_id", data.user.id)
          .eq("site", SITE_ID)
          .maybeSingle();

        if (selectError) {
          console.error("[auth/callback] Erreur SELECT utilisateur :", selectError);
        }

        if (existingUser) {
          // Mise à jour — respecter pseudo_custom et avatar_custom
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const updatePayload: Record<string, any> = {
            discord_id: member.user.id,
            email: data.user.email ?? null,
            role: appRole,
            grade: grade,
            grade_role: gradeRole,
            division: division,
            grade_secondaire: gradeSecondaire,
            clan: primaryClan,
          };

          const { error: updateError } = await (adminClient.from("utilisateurs") as any)
            .update(updatePayload)
            .eq("auth_user_id", data.user.id)
            .eq("site", SITE_ID);

          if (updateError) {
            console.error("[auth/callback] Erreur UPDATE utilisateur :", updateError);
          } else {
            console.log("[auth/callback] Utilisateur mis à jour :", data.user.id);
          }

          // Sync multi-divisions (utiliser l'id du profil site-specific)
          const siteUserId = existingUser.id;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (adminClient.from("utilisateur_divisions") as any)
            .delete()
            .eq("utilisateur_id", siteUserId);

          if (divisions.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (adminClient.from("utilisateur_divisions") as any)
              .insert(
                divisions.map((d) => ({
                  utilisateur_id: siteUserId,
                  division: d.division,
                  role_division: d.role_division,
                  site: SITE_ID,
                }))
              );
          }
        } else {
          // Nouvel utilisateur — toujours définir pseudo et avatar
          // Pour Tokyo: id = auth.uid() (backward compatible)
          // Pour Hokkaido: id = crypto.randomUUID() (distinct de auth.uid())
          const newUserId = SITE_ID === 'tokyo' ? data.user.id : crypto.randomUUID();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: insertError } = await (adminClient.from("utilisateurs") as any).insert({
            id: newUserId,
            auth_user_id: data.user.id,
            site: SITE_ID,
            discord_id: member.user.id,
            pseudo: pseudoFromDiscord,
            avatar_url: avatarUrl,
            email: data.user.email ?? null,
            role: appRole,
            grade: grade,
            grade_role: gradeRole,
            division: division,
            grade_secondaire: gradeSecondaire,
            clan: primaryClan,
          });

          if (insertError) {
            console.error("[auth/callback] Erreur INSERT utilisateur :", insertError);
          } else {
            console.log("[auth/callback] Nouvel utilisateur créé :", data.user.id);

            // Sync multi-divisions pour le nouvel utilisateur
            if (divisions.length > 0) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (adminClient.from("utilisateur_divisions") as any)
                .insert(
                  divisions.map((d) => ({
                    utilisateur_id: newUserId,
                    division: d.division,
                    role_division: d.role_division,
                    site: SITE_ID,
                  }))
                );
            }
          }
        }
      } catch (err) {
        console.error("[auth/callback] Erreur sync Discord/DB :", err);
        const response = NextResponse.redirect(`${origin}/login?error=discord_member_fetch_failed`);
        applyCollectedCookies(response, collectedCookies);
        return response;
      }

      // ── Réponse HTML 200 au lieu de 302 ──────────────────────────────
      // Sur Vercel Edge, les Set-Cookie sur une réponse 302 (redirect) sont
      // parfois ignorés par le navigateur. En retournant du HTML (200), le
      // navigateur traite TOUJOURS les cookies avant d'exécuter le JS.
      // Le script JS lit sessionStorage (posé par discord-login-form avant
      // le flow OAuth, même onglet = même sessionStorage) pour la redirection.
      const fallback = safeNext;
      const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>Connexion r\u00e9ussie</title>
<style>body{margin:0;background:#0a0505;display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui,sans-serif}
.s{color:rgba(255,255,255,.4);font-size:.875rem;display:flex;align-items:center;gap:.5rem}
.d{width:1rem;height:1rem;border:2px solid rgba(220,38,38,.5);border-top-color:transparent;border-radius:50%;animation:r .6s linear infinite}
@keyframes r{to{transform:rotate(360deg)}}</style>
</head><body>
<div class="s"><div class="d"></div>Connexion en cours\u2026</div>
<script>
(function(){
  var s=sessionStorage.getItem("auth_redirect_path");
  if(s)sessionStorage.removeItem("auth_redirect_path");
  var dest=s||${JSON.stringify(fallback)};
  window.location.replace(dest);
})();
</script>
<noscript><a href="/profil">Continuer</a></noscript>
</body></html>`;

      const response = new NextResponse(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      });
      response.cookies.set("auth_redirect", "", { path: "/", maxAge: 0 });
      applyCollectedCookies(response, collectedCookies);
      return response;
    }
  }

  // En cas d'erreur, rediriger vers la page de connexion avec un message
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}

/** Applique les cookies collectés pendant le flow auth sur la réponse HTTP. */
function applyCollectedCookies(
  response: NextResponse,
  cookies: { name: string; value: string; options: CookieOptions }[]
) {
  for (const { name, value, options } of cookies) {
    response.cookies.set(name, value, options);
  }
}
