-- ============================================================
-- Migration : Table dons_logistique
-- Historique de chaque don de ressource enregistré par la
-- division Production & Logistique.
-- ============================================================

-- 1. Table dons_logistique
CREATE TABLE IF NOT EXISTS public.dons_logistique (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donneur_id     UUID NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
  enregistre_par UUID NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
  item_key       TEXT NOT NULL,
  item_label     TEXT NOT NULL,
  quantite       INTEGER NOT NULL CHECK (quantite > 0),
  points_gagnes  INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_dons_logistique_donneur
  ON public.dons_logistique (donneur_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dons_logistique_created
  ON public.dons_logistique (created_at DESC);

-- 3. RLS
ALTER TABLE public.dons_logistique ENABLE ROW LEVEL SECURITY;

-- Lecture : tout utilisateur authentifié peut voir les dons
DROP POLICY IF EXISTS "dons_logistique_select" ON public.dons_logistique;
CREATE POLICY "dons_logistique_select"
  ON public.dons_logistique FOR SELECT
  USING (true);

-- Insertion : uniquement via service_role (admin client)
DROP POLICY IF EXISTS "dons_logistique_insert" ON public.dons_logistique;
CREATE POLICY "dons_logistique_insert"
  ON public.dons_logistique FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Pas de UPDATE/DELETE pour l'historique (immuable)
