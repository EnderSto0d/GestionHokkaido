-- ─── Migration: Replace evaluation competences ────────────────────────────────
-- Replaces the 6 old radar competences with 10 new ones.
-- Old: energie_occulte, force_physique, agilite, intelligence_tactique, maitrise_sort, travail_equipe
-- New: maitrise_energie_occulte, sang_froid, discipline, intelligence_tactique, travail_equipe,
--      premiers_soin, combat, initiative, connaissance_theorique, pedagogie

-- ─── 1. Alter evaluations table (radar /20) ───────────────────────────────────

alter table public.evaluations
  add column if not exists maitrise_energie_occulte smallint not null default 0 check (maitrise_energie_occulte between 0 and 20),
  add column if not exists sang_froid               smallint not null default 0 check (sang_froid between 0 and 20),
  add column if not exists discipline               smallint not null default 0 check (discipline between 0 and 20),
  add column if not exists premiers_soin            smallint not null default 0 check (premiers_soin between 0 and 20),
  add column if not exists combat                   smallint not null default 0 check (combat between 0 and 20),
  add column if not exists initiative               smallint not null default 0 check (initiative between 0 and 20),
  add column if not exists connaissance_theorique   smallint not null default 0 check (connaissance_theorique between 0 and 20),
  add column if not exists pedagogie                smallint not null default 0 check (pedagogie between 0 and 20);

-- Drop removed competence columns
alter table public.evaluations
  drop column if exists energie_occulte,
  drop column if exists force_physique,
  drop column if exists agilite,
  drop column if exists maitrise_sort;

-- ─── 2. Update check constraint on evaluations_individuelles ─────────────────

-- Drop old constraint
alter table public.evaluations_individuelles
  drop constraint if exists evaluations_individuelles_competence_check;

-- Migrate existing rows with old competence names to new ones
update public.evaluations_individuelles set competence = 'maitrise_energie_occulte' where competence = 'energie_occulte';
update public.evaluations_individuelles set competence = 'combat'                   where competence = 'force_physique';
update public.evaluations_individuelles set competence = 'initiative'               where competence = 'agilite';
update public.evaluations_individuelles set competence = 'connaissance_theorique'    where competence = 'maitrise_sort';

-- Add updated constraint with new competences
alter table public.evaluations_individuelles
  add constraint evaluations_individuelles_competence_check
  check (competence in (
    'maitrise_energie_occulte',
    'sang_froid',
    'discipline',
    'intelligence_tactique',
    'travail_equipe',
    'premiers_soin',
    'combat',
    'initiative',
    'connaissance_theorique',
    'pedagogie'
  ));
