-- ================================================================
-- Migration : Historique / Logs des Missions
-- Enregistre chaque événement significatif sur les missions
-- (création, participation, départ, clôture, annulation).
-- Dépendances : migrations missions, utilisateurs
-- ================================================================

-- ── 1. Table : mission_logs ──────────────────────────────────────────────────
create table if not exists public.mission_logs (
  id                  uuid        primary key default gen_random_uuid(),
  -- Référence conservée même si la mission est supprimée
  mission_id          uuid        references public.missions(id) on delete set null,
  mission_titre       text,
  -- Référence conservée même si l'utilisateur est supprimé
  utilisateur_id      uuid        references public.utilisateurs(id) on delete set null,
  utilisateur_pseudo  text,
  -- Type d'événement
  action              text        not null
                                  check (action in ('creation', 'participation', 'depart', 'terminee', 'annulee')),
  -- Métadonnées complémentaires (points, nb_participants, etc.)
  details             jsonb       not null default '{}',
  cree_le             timestamptz not null default now()
);

-- ── 2. Index ─────────────────────────────────────────────────────────────────
create index if not exists idx_mission_logs_mission_id      on public.mission_logs(mission_id);
create index if not exists idx_mission_logs_utilisateur_id  on public.mission_logs(utilisateur_id);
create index if not exists idx_mission_logs_action          on public.mission_logs(action);
create index if not exists idx_mission_logs_cree_le         on public.mission_logs(cree_le desc);

-- ── 3. Row Level Security ────────────────────────────────────────────────────
alter table public.mission_logs enable row level security;

-- Lecture : service_role uniquement (vérification de rôle côté serveur)
drop policy if exists mission_logs_select on public.mission_logs;
create policy mission_logs_select
on public.mission_logs
for select
to service_role
using (true);

-- Insertion : service_role uniquement
drop policy if exists mission_logs_insert on public.mission_logs;
create policy mission_logs_insert
on public.mission_logs
for insert
to service_role
with check (true);
