-- ============================================================
-- Migration : Configuration Admin du Système Logistique
-- Compléments pour le panneau d'administration logistique.
-- Prérequis : logistics_items et app_config doivent déjà exister.
-- ============================================================

-- 1. S'assurer que la clé MAX_COUNTABLE_LOGISTICS_POINTS existe dans app_config
INSERT INTO public.app_config (key, value)
VALUES ('MAX_COUNTABLE_LOGISTICS_POINTS', '200')
ON CONFLICT (key) DO NOTHING;

-- 2. S'assurer que l'index existe pour les requêtes fréquentes sur logistics_items
CREATE INDEX IF NOT EXISTS idx_logistics_items_category
  ON public.logistics_items (category, label);

CREATE INDEX IF NOT EXISTS idx_logistics_items_actif
  ON public.logistics_items (actif) WHERE actif = true;

