-- =====================================================
-- Migration: notes d'évaluation de /100 à /20
-- =====================================================

-- 1. Mettre à jour les notes existantes (conversion proportionnelle)
UPDATE public.evaluations SET
  energie_occulte = LEAST(ROUND(energie_occulte * 20.0 / 100), 20),
  force_physique = LEAST(ROUND(force_physique * 20.0 / 100), 20),
  agilite = LEAST(ROUND(agilite * 20.0 / 100), 20),
  intelligence_tactique = LEAST(ROUND(intelligence_tactique * 20.0 / 100), 20),
  maitrise_sort = LEAST(ROUND(maitrise_sort * 20.0 / 100), 20),
  travail_equipe = LEAST(ROUND(travail_equipe * 20.0 / 100), 20);

-- 2. Supprimer les anciennes contraintes CHECK
ALTER TABLE public.evaluations DROP CONSTRAINT IF EXISTS evaluations_energie_occulte_check;
ALTER TABLE public.evaluations DROP CONSTRAINT IF EXISTS evaluations_force_physique_check;
ALTER TABLE public.evaluations DROP CONSTRAINT IF EXISTS evaluations_agilite_check;
ALTER TABLE public.evaluations DROP CONSTRAINT IF EXISTS evaluations_intelligence_tactique_check;
ALTER TABLE public.evaluations DROP CONSTRAINT IF EXISTS evaluations_maitrise_sort_check;
ALTER TABLE public.evaluations DROP CONSTRAINT IF EXISTS evaluations_travail_equipe_check;

-- 3. Ajouter les nouvelles contraintes /20
ALTER TABLE public.evaluations ADD CONSTRAINT evaluations_energie_occulte_check CHECK (energie_occulte BETWEEN 0 AND 20);
ALTER TABLE public.evaluations ADD CONSTRAINT evaluations_force_physique_check CHECK (force_physique BETWEEN 0 AND 20);
ALTER TABLE public.evaluations ADD CONSTRAINT evaluations_agilite_check CHECK (agilite BETWEEN 0 AND 20);
ALTER TABLE public.evaluations ADD CONSTRAINT evaluations_intelligence_tactique_check CHECK (intelligence_tactique BETWEEN 0 AND 20);
ALTER TABLE public.evaluations ADD CONSTRAINT evaluations_maitrise_sort_check CHECK (maitrise_sort BETWEEN 0 AND 20);
ALTER TABLE public.evaluations ADD CONSTRAINT evaluations_travail_equipe_check CHECK (travail_equipe BETWEEN 0 AND 20);
