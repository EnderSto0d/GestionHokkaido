-- =====================================================
-- Migration V3 — Évaluations individuelles & Hauts Faits d'escouade
-- À exécuter sur une base existante issue de dbtokyo.sql (V2).
-- Ajoute :
--   1. evaluations_individuelles  (éval. une compétence à la fois + commentaire)
--   2. hauts_faits_escouade       (journal des attributions/retraits de points)
-- =====================================================

-- =================================================================
-- 1. Table : evaluations_individuelles
--    Un prof/admin évalue UNE compétence à la fois avec un commentaire.
--    Pas de contrainte d'unicité : on peut évaluer le même élève
--    plusieurs fois sur la même compétence (historique chronologique).
-- =================================================================

create table if not exists public.evaluations_individuelles (
	id             uuid        primary key default gen_random_uuid(),
	utilisateur_id uuid        not null references public.utilisateurs(id) on delete cascade,
	evaluateur_id  uuid        not null references public.utilisateurs(id) on delete cascade,
	competence     text        not null check (competence in (
		'energie_occulte',
		'force_physique',
		'agilite',
		'intelligence_tactique',
		'maitrise_sort',
		'travail_equipe'
	)),
	note           smallint    not null default 0 check (note between 0 and 100),
	commentaire    text        not null check (char_length(commentaire) >= 3),
	cree_le        timestamptz not null default now(),
	mis_a_jour_le  timestamptz not null default now()
);

-- Indexes
create index if not exists idx_eval_ind_utilisateur_id on public.evaluations_individuelles(utilisateur_id);
create index if not exists idx_eval_ind_evaluateur_id  on public.evaluations_individuelles(evaluateur_id);
create index if not exists idx_eval_ind_competence     on public.evaluations_individuelles(competence);

-- Trigger mis_a_jour_le (réutilise la fonction existante)
drop trigger if exists trg_eval_ind_mis_a_jour on public.evaluations_individuelles;
create trigger trg_eval_ind_mis_a_jour
	before update on public.evaluations_individuelles
	for each row execute function public.trigger_mis_a_jour_le();

-- =================================================================
-- 2. Table : hauts_faits_escouade
--    Journal des attributions / retraits de points d'escouade.
--    Visible par les élèves dans leur page escouade.
--    points != 0 (peut être positif ou négatif).
-- =================================================================

create table if not exists public.hauts_faits_escouade (
	id           uuid        primary key default gen_random_uuid(),
	escouade_id  uuid        not null references public.escouades(id) on delete cascade,
	attribue_par uuid        not null references public.utilisateurs(id) on delete cascade,
	points       integer     not null check (points <> 0),
	raison       text        not null check (char_length(raison) >= 3),
	cree_le      timestamptz not null default now()
);

-- Indexes
create index if not exists idx_hauts_faits_escouade_id  on public.hauts_faits_escouade(escouade_id);
create index if not exists idx_hauts_faits_attribue_par on public.hauts_faits_escouade(attribue_par);

-- =================================================================
-- 3. RLS — evaluations_individuelles
-- =================================================================

alter table public.evaluations_individuelles enable row level security;

-- Tout authentifié peut lire (les élèves voient leur historique)
drop policy if exists eval_ind_select on public.evaluations_individuelles;
create policy eval_ind_select
on public.evaluations_individuelles
for select
to authenticated
using (true);

-- Seuls les profs/admins peuvent insérer
drop policy if exists eval_ind_insert on public.evaluations_individuelles;
create policy eval_ind_insert
on public.evaluations_individuelles
for insert
to authenticated
with check (public.est_professeur_ou_admin());

-- Seuls les profs/admins peuvent mettre à jour
drop policy if exists eval_ind_update on public.evaluations_individuelles;
create policy eval_ind_update
on public.evaluations_individuelles
for update
to authenticated
using (public.est_professeur_ou_admin())
with check (public.est_professeur_ou_admin());

-- Seul l'admin peut supprimer
drop policy if exists eval_ind_delete on public.evaluations_individuelles;
create policy eval_ind_delete
on public.evaluations_individuelles
for delete
to authenticated
using (public.est_admin());

-- =================================================================
-- 4. RLS — hauts_faits_escouade
-- =================================================================

alter table public.hauts_faits_escouade enable row level security;

-- Tout authentifié peut lire (élèves voient les hauts faits de leur escouade)
drop policy if exists hauts_faits_select on public.hauts_faits_escouade;
create policy hauts_faits_select
on public.hauts_faits_escouade
for select
to authenticated
using (true);

-- Seuls les profs/admins peuvent insérer
drop policy if exists hauts_faits_insert on public.hauts_faits_escouade;
create policy hauts_faits_insert
on public.hauts_faits_escouade
for insert
to authenticated
with check (public.est_professeur_ou_admin());

-- Seul l'admin peut supprimer
drop policy if exists hauts_faits_delete on public.hauts_faits_escouade;
create policy hauts_faits_delete
on public.hauts_faits_escouade
for delete
to authenticated
using (public.est_admin());

-- =================================================================
-- 5. Grants
-- =================================================================

grant select, insert, update, delete on public.evaluations_individuelles to authenticated;
grant select, insert, delete on public.hauts_faits_escouade to authenticated;
