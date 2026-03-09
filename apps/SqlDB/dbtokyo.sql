-- =====================================================
-- Schéma PostgreSQL complet (Supabase) - GestionTokyo V2
-- Contrainte respectée : noms de tables/colonnes et valeurs ENUM en français.
-- V2 : système mono-personnage (champs fusionnés dans utilisateurs),
--       escouades liées directement aux utilisateurs,
--       table evaluations (stats radar profs/admins).
-- =====================================================

create extension if not exists pgcrypto;

-- =========================
-- Types ENUM personnalisés
-- =========================

do $$
begin
	if not exists (select 1 from pg_type where typname = 'sorts_innes') then
		create type public.sorts_innes as enum (
			'Altération Absolue',
			'Animaux Fantastiques',
			'Boogie Woogie',
			'Bourrasque',
			'Clonage',
			'Corbeau',
			'Givre',
			'Intervalle',
			'Jardin Floral',
			'Venin',
			'Projection Occulte',
			'Rage Volcanique'
		);
	end if;

	if not exists (select 1 from pg_type where typname = 'specialites') then
		create type public.specialites as enum (
			'Assassin',
			'Combattant',
			'Support',
			'Tank'
		);
	end if;

	if not exists (select 1 from pg_type where typname = 'arts_martiaux') then
		create type public.arts_martiaux as enum (
			'CorpACorp',
			'Kenjutsu'
		);
	end if;

	if not exists (select 1 from pg_type where typname = 'grades') then
		create type public.grades as enum (
			'Classe 4',
			'Classe 3',
			'Semi Classe 2',
			'Classe 2',
			'Semi Classe 1',
			'Classe 1',
			'Semi Classe S',
			'Classe S',
			'Classe Apo'
		);
	end if;

	if not exists (select 1 from pg_type where typname = 'grade_role') then
		create type public.grade_role as enum (
			'Élève Exorciste',
			'Exorciste Pro',
			'Professeur',
			'Co-Directeur',
			'Directeur'
		);
	end if;

	if not exists (select 1 from pg_type where typname = 'grade_secondaire') then
		create type public.grade_secondaire as enum (
			'Seconde',
			'Première',
			'Terminal'
		);
	end if;

	if not exists (select 1 from pg_type where typname = 'divisions') then
		create type public.divisions as enum (
			'Judiciaire',
			'Médical',
			'Académie',
			'Scientifique',
			'Disciplinaire',
			'Stratégie',
			'Diplomatie'
		);
	end if;

	if not exists (select 1 from pg_type where typname = 'roles_utilisateur') then
		create type public.roles_utilisateur as enum (
			'eleve',
			'professeur',
			'admin'
		);
	end if;

	if not exists (select 1 from pg_type where typname = 'roles_escouade') then
		create type public.roles_escouade as enum (
			'chef',
			'membre'
		);
	end if;

	if not exists (select 1 from pg_type where typname = 'statut_invitation') then
		create type public.statut_invitation as enum (
			'en_attente',
			'acceptee',
			'refusee'
		);
	end if;
end
$$;

-- ======
-- Tables
-- ======

-- Suppression dans l'ordre inverse des dépendances (pour recréation propre)
drop table if exists public.evaluations cascade;
drop table if exists public.invitations_escouade cascade;
drop table if exists public.membres_escouade cascade;
drop table if exists public.escouades cascade;
drop table if exists public.personnages cascade;   -- legacy V1, supprimée en V2
drop table if exists public.utilisateurs cascade;

-- Utilisateurs : contient aussi les champs personnage (1 user = 1 personnage)
create table if not exists public.utilisateurs (
	id uuid primary key default gen_random_uuid(),
	discord_id text not null unique,
	pseudo text not null,
	pseudo_custom boolean not null default false,
	avatar_url text,
	avatar_custom boolean not null default false,
	display_name text,
	email text,
	role public.roles_utilisateur not null default 'eleve',
	grade public.grades,
	grade_role public.grade_role,
	grade_secondaire public.grade_secondaire,
	division public.divisions,
	-- Champs personnage (ex table personnages)
	prenom_rp text,
	nom_rp text,
	sort_inne public.sorts_innes,
	specialite public.specialites,
	art_martial public.arts_martiaux,
	reliques text,
	sub_jutsu text,
	style_combat text,
	cree_le timestamptz not null default now(),
	mis_a_jour_le timestamptz not null default now()
);

create table if not exists public.escouades (
	id uuid primary key default gen_random_uuid(),
	nom text not null unique,
	description text,
	url_logo text,
	url_banniere text,
	url_photo_1 text,
	url_photo_2 text,
	url_photo_3 text,
	discord_role_id text unique,
	proprietaire_id uuid not null references public.utilisateurs(id) on delete cascade,
	points integer not null default 0,
	cree_le timestamptz not null default now(),
	mis_a_jour_le timestamptz not null default now()
);

-- Un utilisateur ne peut appartenir qu'à UNE seule escouade (UNIQUE sur utilisateur_id)
create table if not exists public.membres_escouade (
	escouade_id uuid not null references public.escouades(id) on delete cascade,
	utilisateur_id uuid not null references public.utilisateurs(id) on delete cascade,
	role_escouade public.roles_escouade not null default 'membre',
	rejoint_le timestamptz not null default now(),
	primary key (escouade_id, utilisateur_id),
	constraint un_utilisateur_une_escouade unique (utilisateur_id)
);

create table if not exists public.invitations_escouade (
	id uuid primary key default gen_random_uuid(),
	escouade_id uuid not null references public.escouades(id) on delete cascade,
	invite_par uuid not null references public.utilisateurs(id) on delete cascade,
	utilisateur_id uuid not null references public.utilisateurs(id) on delete cascade,
	statut public.statut_invitation not null default 'en_attente',
	cree_le timestamptz not null default now(),
	mis_a_jour_le timestamptz not null default now(),
	constraint invitations_unique_pending unique (escouade_id, utilisateur_id)
);

-- Évaluations (stats radar) — un prof/admin peut évaluer chaque élève une fois
create table if not exists public.evaluations (
	id uuid primary key default gen_random_uuid(),
	utilisateur_id uuid not null references public.utilisateurs(id) on delete cascade,
	evaluateur_id uuid not null references public.utilisateurs(id) on delete cascade,
	energie_occulte smallint not null default 0 check (energie_occulte between 0 and 20),
	force_physique smallint not null default 0 check (force_physique between 0 and 20),
	agilite smallint not null default 0 check (agilite between 0 and 20),
	intelligence_tactique smallint not null default 0 check (intelligence_tactique between 0 and 20),
	maitrise_sort smallint not null default 0 check (maitrise_sort between 0 and 20),
	travail_equipe smallint not null default 0 check (travail_equipe between 0 and 100),
	commentaire text,
	cree_le timestamptz not null default now(),
	mis_a_jour_le timestamptz not null default now(),
	constraint evaluations_unique_pair unique (utilisateur_id, evaluateur_id)
);

-- ======
-- Indexes
-- ======

create index if not exists idx_escouades_proprietaire_id on public.escouades(proprietaire_id);
create index if not exists idx_escouades_discord_role_id on public.escouades(discord_role_id);
create index if not exists idx_membres_escouade_utilisateur_id on public.membres_escouade(utilisateur_id);
create index if not exists idx_invitations_utilisateur_id on public.invitations_escouade(utilisateur_id);
create index if not exists idx_invitations_escouade_id on public.invitations_escouade(escouade_id);
create index if not exists idx_invitations_statut on public.invitations_escouade(statut);
create index if not exists idx_evaluations_utilisateur_id on public.evaluations(utilisateur_id);
create index if not exists idx_evaluations_evaluateur_id on public.evaluations(evaluateur_id);

-- ================================
-- Triggers :  mis_a_jour_le auto
-- ================================

create or replace function public.trigger_mis_a_jour_le()
returns trigger
language plpgsql
as $$
begin
	new.mis_a_jour_le = now();
	return new;
end;
$$;

drop trigger if exists trg_utilisateurs_mis_a_jour on public.utilisateurs;
create trigger trg_utilisateurs_mis_a_jour
	before update on public.utilisateurs
	for each row execute function public.trigger_mis_a_jour_le();

drop trigger if exists trg_escouades_mis_a_jour on public.escouades;
create trigger trg_escouades_mis_a_jour
	before update on public.escouades
	for each row execute function public.trigger_mis_a_jour_le();

drop trigger if exists trg_invitations_mis_a_jour on public.invitations_escouade;
create trigger trg_invitations_mis_a_jour
	before update on public.invitations_escouade
	for each row execute function public.trigger_mis_a_jour_le();

drop trigger if exists trg_evaluations_mis_a_jour on public.evaluations;
create trigger trg_evaluations_mis_a_jour
	before update on public.evaluations
	for each row execute function public.trigger_mis_a_jour_le();

-- ===========================
-- Sécurité RLS (Row Level Security)
-- ===========================

alter table public.utilisateurs enable row level security;
alter table public.escouades enable row level security;
alter table public.membres_escouade enable row level security;
alter table public.invitations_escouade enable row level security;
alter table public.evaluations enable row level security;

-- Fonction utilitaire : détecter un administrateur.
create or replace function public.est_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select exists (
		select 1
		from public.utilisateurs u
		where u.id = auth.uid()
			and u.role = 'admin'
	);
$$;

-- Fonction utilitaire : détecter un professeur ou admin.
create or replace function public.est_professeur_ou_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
	select exists (
		select 1
		from public.utilisateurs u
		where u.id = auth.uid()
			and u.role in ('professeur', 'admin')
	);
$$;

-- Permissions d'exécution des fonctions pour rôles Supabase.
grant execute on function public.est_admin() to authenticated;
grant execute on function public.est_professeur_ou_admin() to authenticated;

-- ================
-- Politiques RLS
-- ================

-- ── Utilisateurs ──────────────────────────────────

drop policy if exists utilisateurs_select on public.utilisateurs;
create policy utilisateurs_select
on public.utilisateurs
for select
to authenticated
using (true);

drop policy if exists utilisateurs_insert on public.utilisateurs;
create policy utilisateurs_insert
on public.utilisateurs
for insert
to authenticated
with check (id = auth.uid() or public.est_admin());

drop policy if exists utilisateurs_update on public.utilisateurs;
create policy utilisateurs_update
on public.utilisateurs
for update
to authenticated
using (id = auth.uid() or public.est_admin())
with check (id = auth.uid() or public.est_admin());

drop policy if exists utilisateurs_delete on public.utilisateurs;
create policy utilisateurs_delete
on public.utilisateurs
for delete
to authenticated
using (public.est_admin());

-- ── Escouades ─────────────────────────────────────

drop policy if exists escouades_select on public.escouades;
create policy escouades_select
on public.escouades
for select
to authenticated
using (true);

drop policy if exists escouades_insert on public.escouades;
create policy escouades_insert
on public.escouades
for insert
to authenticated
with check (
	proprietaire_id = auth.uid()
	or public.est_admin()
);

drop policy if exists escouades_update on public.escouades;
create policy escouades_update
on public.escouades
for update
to authenticated
using (
	proprietaire_id = auth.uid()
	or public.est_admin()
)
with check (
	proprietaire_id = auth.uid()
	or public.est_admin()
);

drop policy if exists escouades_delete on public.escouades;
create policy escouades_delete
on public.escouades
for delete
to authenticated
using (
	proprietaire_id = auth.uid()
	or public.est_admin()
);

-- ── Membres d'escouade ────────────────────────────

drop policy if exists membres_escouade_select on public.membres_escouade;
create policy membres_escouade_select
on public.membres_escouade
for select
to authenticated
using (true);

drop policy if exists membres_escouade_insert on public.membres_escouade;
create policy membres_escouade_insert
on public.membres_escouade
for insert
to authenticated
with check (
	public.est_admin()
	or exists (
		select 1
		from public.escouades e
		where e.id = escouade_id
			and e.proprietaire_id = auth.uid()
	)
	or utilisateur_id = auth.uid()
);

drop policy if exists membres_escouade_update on public.membres_escouade;
create policy membres_escouade_update
on public.membres_escouade
for update
to authenticated
using (
	public.est_admin()
	or exists (
		select 1
		from public.escouades e
		where e.id = escouade_id
			and e.proprietaire_id = auth.uid()
	)
)
with check (
	public.est_admin()
	or exists (
		select 1
		from public.escouades e
		where e.id = escouade_id
			and e.proprietaire_id = auth.uid()
	)
);

drop policy if exists membres_escouade_delete on public.membres_escouade;
create policy membres_escouade_delete
on public.membres_escouade
for delete
to authenticated
using (
	public.est_admin()
	or exists (
		select 1
		from public.escouades e
		where e.id = escouade_id
			and e.proprietaire_id = auth.uid()
	)
	or utilisateur_id = auth.uid()
);

-- ── Invitations d'escouade ────────────────────────

drop policy if exists invitations_select on public.invitations_escouade;
create policy invitations_select
on public.invitations_escouade
for select
to authenticated
using (
	public.est_admin()
	or exists (
		select 1
		from public.escouades e
		where e.id = escouade_id
			and e.proprietaire_id = auth.uid()
	)
	or utilisateur_id = auth.uid()
	or invite_par = auth.uid()
);

drop policy if exists invitations_insert on public.invitations_escouade;
create policy invitations_insert
on public.invitations_escouade
for insert
to authenticated
with check (
	public.est_admin()
	or exists (
		select 1
		from public.escouades e
		where e.id = escouade_id
			and e.proprietaire_id = auth.uid()
	)
);

drop policy if exists invitations_update on public.invitations_escouade;
create policy invitations_update
on public.invitations_escouade
for update
to authenticated
using (
	public.est_admin()
	or utilisateur_id = auth.uid()
	or exists (
		select 1
		from public.escouades e
		where e.id = escouade_id
			and e.proprietaire_id = auth.uid()
	)
)
with check (
	public.est_admin()
	or utilisateur_id = auth.uid()
	or exists (
		select 1
		from public.escouades e
		where e.id = escouade_id
			and e.proprietaire_id = auth.uid()
	)
);

drop policy if exists invitations_delete on public.invitations_escouade;
create policy invitations_delete
on public.invitations_escouade
for delete
to authenticated
using (
	public.est_admin()
	or exists (
		select 1
		from public.escouades e
		where e.id = escouade_id
			and e.proprietaire_id = auth.uid()
	)
);

-- ── Évaluations ───────────────────────────────────

drop policy if exists evaluations_select on public.evaluations;
create policy evaluations_select
on public.evaluations
for select
to authenticated
using (true);

drop policy if exists evaluations_insert on public.evaluations;
create policy evaluations_insert
on public.evaluations
for insert
to authenticated
with check (public.est_professeur_ou_admin());

drop policy if exists evaluations_update on public.evaluations;
create policy evaluations_update
on public.evaluations
for update
to authenticated
using (public.est_professeur_ou_admin())
with check (public.est_professeur_ou_admin());

drop policy if exists evaluations_delete on public.evaluations;
create policy evaluations_delete
on public.evaluations
for delete
to authenticated
using (public.est_admin());

-- ── Grants ────────────────────────────────────────

grant select, insert, update, delete on public.utilisateurs to authenticated;
grant select, insert, update, delete on public.escouades to authenticated;
grant select, insert, update, delete on public.membres_escouade to authenticated;
grant select, insert, update, delete on public.invitations_escouade to authenticated;
grant select, insert, update, delete on public.evaluations to authenticated;

