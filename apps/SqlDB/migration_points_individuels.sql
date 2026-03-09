-- ============================================================
-- Migration : Points Individuels pour les Missions
-- Ajoute un champ points_individuels aux missions pour
-- permettre de donner des points personnels séparément
-- des points d'escouade.
-- ============================================================

-- 1. Ajouter la colonne points_individuels à la table missions
ALTER TABLE public.missions
  ADD COLUMN IF NOT EXISTS points_individuels integer NOT NULL DEFAULT 0;

-- 2. Mettre à jour les missions existantes : points_individuels = points_recompense
UPDATE public.missions
  SET points_individuels = points_recompense
  WHERE points_individuels = 0 AND points_recompense > 0;
