-- ================================================================
-- Migration : Activer Supabase Realtime sur toutes les tables
-- Permet aux clients de recevoir les changements en temps réel
-- via Postgres Changes (INSERT, UPDATE, DELETE).
-- ================================================================

-- Supabase Realtime utilise la publication `supabase_realtime`.
-- On ajoute chaque table à cette publication pour que les
-- événements soient diffusés aux abonnés websocket.

-- ── Suppression préventive (idempotent) ──────────────────────────
-- Si une table est déjà dans la publication, ALTER échouera.
-- On recréé la publication proprement avec toutes les tables.

do $$
begin
  -- Vérifie si la publication existe
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    -- Supprime les tables existantes de la publication, puis re-ajoute tout
    execute 'alter publication supabase_realtime set table
      public.utilisateurs,
      public.escouades,
      public.membres_escouade,
      public.invitations_escouade,
      public.evaluations,
      public.evaluations_individuelles,
      public.hauts_faits_escouade,
      public.conseil_membres,
      public.conseil_elections_chef,
      public.conseil_votes_chef,
      public.conseil_propositions,
      public.conseil_votes_proposition,
      public.conseil_rankup_bans,
      public.elections_conseil,
      public.votes_conseil,
      public.utilisateur_divisions,
      public.missions,
      public.participations_mission,
      public.mission_logs';
  end if;
end
$$;
