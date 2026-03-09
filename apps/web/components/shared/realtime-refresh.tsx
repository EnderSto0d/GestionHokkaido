"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

/**
 * Tables surveillées en temps réel.
 * Tout INSERT / UPDATE / DELETE déclenche un router.refresh()
 * pour rafraîchir les données du Server Component courant.
 */
const REALTIME_TABLES = [
  "utilisateurs",
  "escouades",
  "membres_escouade",
  "invitations_escouade",
  "evaluations",
  "evaluations_individuelles",
  "hauts_faits_escouade",
  "conseil_membres",
  "conseil_elections_chef",
  "conseil_votes_chef",
  "conseil_propositions",
  "conseil_votes_proposition",
  "conseil_rankup_bans",
  "elections_conseil",
  "votes_conseil",
  "utilisateur_divisions",
  "missions",
  "participations_mission",
  "mission_logs",
] as const;

/** Délai de debounce (ms) pour éviter de multiples refresh rapprochés */
const DEBOUNCE_MS = 400;

/**
 * Composant invisible qui s'abonne au Realtime Supabase
 * et rafraîchit automatiquement les données de la page courante.
 */
export function RealtimeRefresh() {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const debouncedRefresh = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        router.refresh();
      }, DEBOUNCE_MS);
    };

    const channel = supabase.channel("global-realtime");

    for (const table of REALTIME_TABLES) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        debouncedRefresh
      );
    }

    channel.subscribe();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
