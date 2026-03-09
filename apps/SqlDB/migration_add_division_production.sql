-- =====================================================
-- Migration : Ajout de la division "Production et Logistique"
-- =====================================================

-- ─── 1. Ajouter la valeur à l'enum "divisions" ──────────────────────────────

ALTER TYPE public.divisions ADD VALUE IF NOT EXISTS 'Production et Logistique';
