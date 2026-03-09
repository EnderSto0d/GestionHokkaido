"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type DiscordLoginFormProps = {
  nextPath?: string;
  errorCode?: string;
};

function getFrenchErrorMessage(errorCode?: string) {
  if (!errorCode) return null;

  switch (errorCode) {
    case "auth_callback_failed":
      return "La connexion a échoué. Veuillez réessayer.";
    case "discord_token_missing":
      return "La session Discord est incomplète. Reconnectez-vous.";
    case "discord_member_fetch_failed":
      return "Connexion réussie, mais impossible de récupérer vos rôles Discord.";
    default:
      return "Une erreur est survenue pendant l'authentification.";
  }
}

function DiscordIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.032.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

export function DiscordLoginForm({
  nextPath = "/",
  errorCode,
}: DiscordLoginFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const errorMessage = getFrenchErrorMessage(errorCode);

  async function handleDiscordLogin() {
    setIsLoading(true);

    // Sauvegarder la destination dans sessionStorage (survit aux redirections
    // cross-site contrairement aux cookies SameSite ou aux query params
    // que Supabase peut supprimer du redirect_to).
    if (nextPath && nextPath !== "/profil") {
      sessionStorage.setItem("auth_redirect_path", nextPath);
    }

    // Cookie en fallback pour le callback côté serveur
    if (nextPath) {
      document.cookie = `auth_redirect=${encodeURIComponent(nextPath)};path=/;max-age=600;samesite=lax;secure`;
    }

    const supabase = createClient();
    const redirectTo = `${window.location.origin}/api/auth/callback`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo,
        scopes: "identify guilds guilds.members.read",
      },
    });

    if (error) {
      setIsLoading(false);
      return;
    }
  }

  return (
    <div className="w-full">
      {errorMessage ? (
        <p className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {errorMessage}
        </p>
      ) : null}

      <button
        type="button"
        onClick={handleDiscordLogin}
        disabled={isLoading}
        className="inline-flex w-full items-center justify-center gap-3 rounded-xl bg-[#5865F2] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#5865F2]/20 transition-all hover:bg-[#4752C4] hover:shadow-[#5865F2]/30 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <DiscordIcon />
        {isLoading ? "Redirection en cours…" : "Continuer avec Discord"}
      </button>
    </div>
  );
}