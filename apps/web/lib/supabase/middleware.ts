import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtectedRoute =
    request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/administration") ||
    request.nextUrl.pathname.startsWith("/missions") ||
    request.nextUrl.pathname.startsWith("/personnages") ||
    request.nextUrl.pathname.startsWith("/profil") ||
    request.nextUrl.pathname.startsWith("/escouades") ||
    request.nextUrl.pathname.startsWith("/invitations") ||
    request.nextUrl.pathname.startsWith("/classement") ||
    request.nextUrl.pathname.startsWith("/evaluation") ||
    request.nextUrl.pathname.startsWith("/info") ||
    request.nextUrl.pathname.startsWith("/conseil");

  if (isProtectedRoute && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", request.nextUrl.pathname);
    const loginRedirect = NextResponse.redirect(redirectUrl);
    // Cookie first-party httpOnly posé par le serveur sur notre propre domaine.
    // Contrairement aux cookies client ou query params, celui-ci survit
    // systématiquement au round-trip OAuth (Supabase → Discord → retour).
    loginRedirect.cookies.set("post_auth_redirect", request.nextUrl.pathname, {
      path: "/",
      maxAge: 600,
      httpOnly: true,
      sameSite: "lax",
      secure: true,
    });
    return loginRedirect;
  }

  // Après authentification : si un cookie post_auth_redirect existe,
  // rediriger l'utilisateur vers sa destination initiale.
  if (user) {
    const pending = request.cookies.get("post_auth_redirect")?.value;
    if (
      pending &&
      pending.startsWith("/") &&
      !pending.startsWith("//") &&
      pending !== request.nextUrl.pathname
    ) {
      const target = request.nextUrl.clone();
      target.pathname = pending;
      target.search = "";
      const redir = NextResponse.redirect(target);
      // Copier les cookies d'auth Supabase sur la réponse de redirection
      for (const h of response.headers.getSetCookie()) {
        redir.headers.append("Set-Cookie", h);
      }
      redir.cookies.set("post_auth_redirect", "", { path: "/", maxAge: 0 });
      return redir;
    }
    // Nettoyer le cookie s'il pointe déjà vers la page courante
    if (pending) {
      response.cookies.set("post_auth_redirect", "", { path: "/", maxAge: 0 });
    }
  }

  return response;
}