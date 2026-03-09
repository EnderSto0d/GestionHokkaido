-- ================================================================
-- Migration : Système de Missions
-- Crée les tables `missions` et `participations_mission`.
-- Dépendances : utilisateurs, escouades, membres_escouade
--               trigger public.trigger_mis_a_jour_le() (dbtokyo.sql)
-- ================================================================

-- ── 1. Table : missions ──────────────────────────────────────────────────────
create table if not exists public.missions (
  id                  uuid        primary key default gen_random_uuid(),
  createur_id         uuid        not null references public.utilisateurs(id) on delete cascade,
  titre               text        not null check (char_length(titre) between 1 and 200),
  date_heure          timestamptz,
  -- NULL = illimité
  capacite            integer     check (capacite is null or capacite > 0),
  -- {"type":"everyone"} | {"type":"eleve_exorciste"} | {"type":"escouades","ids":["uuid",...]}
  ping_cible          jsonb       not null default '{"type": "everyone"}',
  points_recompense   integer     not null default 0 check (points_recompense >= 0),
  synopsis            text,
  discord_message_id  text,
  statut              text        not null default 'active'
                                  check (statut in ('active', 'terminee', 'annulee')),
  cree_le             timestamptz not null default now(),
  mis_a_jour_le       timestamptz not null default now()
);

-- ── 2. Table : participations_mission ────────────────────────────────────────
create table if not exists public.participations_mission (
  id             uuid        primary key default gen_random_uuid(),
  mission_id     uuid        not null references public.missions(id) on delete cascade,
  utilisateur_id uuid        not null references public.utilisateurs(id) on delete cascade,
  cree_le        timestamptz not null default now(),
  constraint participations_mission_unique unique (mission_id, utilisateur_id)
);

-- ── 3. Indexes ───────────────────────────────────────────────────────────────
create index if not exists idx_missions_createur_id     on public.missions(createur_id);
create index if not exists idx_missions_statut           on public.missions(statut);
create index if not exists idx_participations_mission_id on public.participations_mission(mission_id);
create index if not exists idx_participations_user_id    on public.participations_mission(utilisateur_id);

-- ── 4. Trigger auto mis_a_jour_le ─────────────────────────────────────────
drop trigger if exists trg_missions_mis_a_jour on public.missions;
create trigger trg_missions_mis_a_jour
  before update on public.missions
  for each row execute function public.trigger_mis_a_jour_le();

-- ── 5. Row Level Security ────────────────────────────────────────────────────
alter table public.missions enable row level security;
alter table public.participations_mission enable row level security;

-- missions : toute personne authentifiée peut lire
drop policy if exists missions_select on public.missions;
create policy missions_select
on public.missions
for select
to authenticated
using (true);

-- missions : écriture réservée au service_role (server actions avec admin client)
drop policy if exists missions_insert on public.missions;
create policy missions_insert
on public.missions
for insert
to service_role
with check (true);

drop policy if exists missions_update on public.missions;
create policy missions_update
on public.missions
for update
to service_role
using (true);

drop policy if exists missions_delete on public.missions;
create policy missions_delete
on public.missions
for delete
to service_role
using (true);

-- participations : lecture pour tous les authentifiés
drop policy if exists participations_select on public.participations_mission;
create policy participations_select
on public.participations_mission
for select
to authenticated
using (true);

-- participations : écriture réservée au service_role
drop policy if exists participations_insert on public.participations_mission;
create policy participations_insert
on public.participations_mission
for insert
to service_role
with check (true);

drop policy if exists participations_delete on public.participations_mission;
create policy participations_delete
on public.participations_mission
for delete
to service_role
using (true);
