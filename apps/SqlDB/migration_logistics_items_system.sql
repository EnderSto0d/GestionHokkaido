-- ============================================================
-- Migration : Système Logistics Items & Corrections Architecturales
--
-- 1. Table logistics_items : catalogue d'items configurable par les admins
-- 2. Seed depuis le catalogue hardcodé existant
-- 3. Colonne item_id (FK) sur dons_logistique pour traçabilité
-- 4. Backfill item_id sur les dons existants
-- 5. Fix RPC : les points vont au DONNEUR, pas au membre logistique
--    (la RPC elle-même est correcte ; le fix est côté serveur TypeScript)
--
-- ⚠ Aucune table existante n'est supprimée.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Table logistics_items
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.logistics_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key             TEXT NOT NULL UNIQUE,
  label           TEXT NOT NULL,
  category        TEXT NOT NULL,
  points_per_unit INTEGER NOT NULL DEFAULT 0 CHECK (points_per_unit >= 0),
  actif           BOOLEAN NOT NULL DEFAULT true,
  cree_le         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  mis_a_jour_le   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour les requêtes par catégorie et les items actifs
CREATE INDEX IF NOT EXISTS idx_logistics_items_category
  ON public.logistics_items (category);

CREATE INDEX IF NOT EXISTS idx_logistics_items_actif
  ON public.logistics_items (actif) WHERE actif = true;

-- Trigger mis_a_jour_le automatique (réutilise la fonction existante)
DROP TRIGGER IF EXISTS trg_logistics_items_mis_a_jour ON public.logistics_items;
CREATE TRIGGER trg_logistics_items_mis_a_jour
  BEFORE UPDATE ON public.logistics_items
  FOR EACH ROW EXECUTE FUNCTION public.trigger_mis_a_jour_le();

-- RLS
ALTER TABLE public.logistics_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "logistics_items_read_all"   ON public.logistics_items;
DROP POLICY IF EXISTS "logistics_items_write_admin" ON public.logistics_items;

-- Lecture : tout utilisateur authentifié
CREATE POLICY "logistics_items_read_all"
  ON public.logistics_items FOR SELECT
  USING (true);

-- Écriture : uniquement via service_role (admin client)
CREATE POLICY "logistics_items_write_admin"
  ON public.logistics_items FOR ALL
  USING (auth.role() = 'service_role');


-- ─────────────────────────────────────────────────────────────
-- 2. Seed : insertion depuis le catalogue hardcodé
--    ON CONFLICT DO NOTHING pour ne pas écraser les valeurs
--    déjà modifiées par un admin.
-- ─────────────────────────────────────────────────────────────

INSERT INTO public.logistics_items (key, label, category, points_per_unit) VALUES
  -- Matières Premières
  ('titane',       'Titane',        'Matières Premières', 0),
  ('plastique',    'Plastique',     'Matières Premières', 0),
  ('papier',       'Papier',        'Matières Premières', 0),
  ('metal_occulte','Metal occulte', 'Matières Premières', 0),
  ('laine',        'Laine',         'Matières Premières', 0),
  ('fer',          'Fer',           'Matières Premières', 0),
  ('cuivre',       'Cuivre',        'Matières Premières', 0),
  ('cuir',         'Cuir',          'Matières Premières', 0),
  ('bois',         'Bois',          'Matières Premières', 0),
  ('argent',       'Argent',        'Matières Premières', 0),

  -- Blueprints Tier 1 [C]
  ('bp_c_pantalon_t1',        'Blueprint de [C] Pantalon T1',        'Blueprints', 0),
  ('bp_c_collier_t1',         'Blueprint de [C] Collier T1',         'Blueprints', 0),
  ('bp_c_bottes_tenacite_t1', 'Blueprint de [C] Bottes Ténacité T1', 'Blueprints', 0),
  ('bp_c_bottes_ap_t1',       'Blueprint de [C] Bottes AP T1',       'Blueprints', 0),
  ('bp_c_bottes_ad_t1',       'Blueprint de [C] Bottes AD T1',       'Blueprints', 0),
  ('bp_c_armure_ap_t1',       'Blueprint de [C] Armure AP T1',       'Blueprints', 0),
  ('bp_c_armure_ad_t1',       'Blueprint de [C] Armure AD T1',       'Blueprints', 0),

  -- Blueprints Tier 2 [B]
  ('bp_b_pantalon_t2',        'Blueprint de [B] Pantalon T2',        'Blueprints', 0),
  ('bp_b_collier_t2',         'Blueprint de [B] Collier T2',         'Blueprints', 0),
  ('bp_b_bottes_tenacite_t2', 'Blueprint de [B] Bottes Ténacité T2', 'Blueprints', 0),
  ('bp_b_bottes_ap_t2',       'Blueprint de [B] Bottes AP T2',       'Blueprints', 0),
  ('bp_b_bottes_ad_t2',       'Blueprint de [B] Bottes AD T2',       'Blueprints', 0),
  ('bp_b_armure_ap_t2',       'Blueprint de [B] Armure AP T2',       'Blueprints', 0),
  ('bp_b_armure_ad_t2',       'Blueprint de [B] Armure AD T2',       'Blueprints', 0),

  -- Blueprints Tier 3 [A]
  ('bp_a_pantalon_t3',        'Blueprint de [A] Pantalon T3',        'Blueprints', 0),
  ('bp_a_collier_t3',         'Blueprint de [A] Collier T3',         'Blueprints', 0),
  ('bp_a_bottes_tenacite_t3', 'Blueprint de [A] Bottes Ténacité T3', 'Blueprints', 0),
  ('bp_a_bottes_ap_t3',       'Blueprint de [A] Bottes AP T3',       'Blueprints', 0),
  ('bp_a_bottes_ad_t3',       'Blueprint de [A] Bottes AD T3',       'Blueprints', 0),
  ('bp_a_armure_ap_t3',       'Blueprint de [A] Armure AP T3',       'Blueprints', 0),
  ('bp_a_armure_ad_t3',       'Blueprint de [A] Armure AD T3',       'Blueprints', 0),

  -- Blueprints Tier 4 [S]
  ('bp_s_pantalon_t4',        'Blueprint de [S] Pantalon T4',        'Blueprints', 0),
  ('bp_s_collier_t4',         'Blueprint de [S] Collier T4',         'Blueprints', 0),
  ('bp_s_bottes_tenacite_t4', 'Blueprint de [S] Bottes Ténacité T4', 'Blueprints', 0),
  ('bp_s_bottes_ap_t4',       'Blueprint de [S] Bottes AP T4',       'Blueprints', 0),
  ('bp_s_bottes_ad_t4',       'Blueprint de [S] Bottes AD T4',       'Blueprints', 0),
  ('bp_s_armure_ap_t4',       'Blueprint de [S] Armure AP T4',       'Blueprints', 0),
  ('bp_s_armure_ad_t4',       'Blueprint de [S] Armure AD T4',       'Blueprints', 0),

  -- Objets Craftés - Tier 1 [C]
  ('c_pantalon_t1',        '[C] Pantalon T1',        'Objets Craftés - Tier 1 [C]', 0),
  ('c_collier_t1',         '[C] Collier T1',         'Objets Craftés - Tier 1 [C]', 0),
  ('c_bottes_tenacite_t1', '[C] Bottes Ténacité T1', 'Objets Craftés - Tier 1 [C]', 0),
  ('c_bottes_ap_t1',       '[C] Bottes AP T1',       'Objets Craftés - Tier 1 [C]', 0),
  ('c_bottes_ad_t1',       '[C] Bottes AD T1',       'Objets Craftés - Tier 1 [C]', 0),
  ('c_armure_ap_t1',       '[C] Armure AP T1',       'Objets Craftés - Tier 1 [C]', 0),
  ('c_armure_ad_t1',       '[C] Armure AD T1',       'Objets Craftés - Tier 1 [C]', 0),

  -- Objets Craftés - Tier 2 [B]
  ('b_pantalon_t2',        '[B] Pantalon T2',        'Objets Craftés - Tier 2 [B]', 0),
  ('b_collier_t2',         '[B] Collier T2',         'Objets Craftés - Tier 2 [B]', 0),
  ('b_bottes_tenacite_t2', '[B] Bottes Ténacité T2', 'Objets Craftés - Tier 2 [B]', 0),
  ('b_bottes_ap_t2',       '[B] Bottes AP T2',       'Objets Craftés - Tier 2 [B]', 0),
  ('b_bottes_ad_t2',       '[B] Bottes AD T2',       'Objets Craftés - Tier 2 [B]', 0),
  ('b_armure_ap_t2',       '[B] Armure AP T2',       'Objets Craftés - Tier 2 [B]', 0),
  ('b_armure_ad_t2',       '[B] Armure AD T2',       'Objets Craftés - Tier 2 [B]', 0),

  -- Objets Craftés - Tier 3 [A]
  ('a_pantalon_t3',        '[A] Pantalon T3',        'Objets Craftés - Tier 3 [A]', 0),
  ('a_collier_t3',         '[A] Collier T3',         'Objets Craftés - Tier 3 [A]', 0),
  ('a_bottes_tenacite_t3', '[A] Bottes Ténacité T3', 'Objets Craftés - Tier 3 [A]', 0),
  ('a_bottes_ap_t3',       '[A] Bottes AP T3',       'Objets Craftés - Tier 3 [A]', 0),
  ('a_bottes_ad_t3',       '[A] Bottes AD T3',       'Objets Craftés - Tier 3 [A]', 0),
  ('a_armure_ap_t3',       '[A] Armure AP T3',       'Objets Craftés - Tier 3 [A]', 0),
  ('a_armure_ad_t3',       '[A] Armure AD T3',       'Objets Craftés - Tier 3 [A]', 0),

  -- Objets Craftés - Tier 4 [S]
  ('s_pantalon_t4',        '[S] Pantalon T4',        'Objets Craftés - Tier 4 [S]', 0),
  ('s_collier_t4',         '[S] Collier T4',         'Objets Craftés - Tier 4 [S]', 0),
  ('s_bottes_tenacite_t4', '[S] Bottes Ténacité T4', 'Objets Craftés - Tier 4 [S]', 0),
  ('s_bottes_ap_t4',       '[S] Bottes AP T4',       'Objets Craftés - Tier 4 [S]', 0),
  ('s_bottes_ad_t4',       '[S] Bottes AD T4',       'Objets Craftés - Tier 4 [S]', 0),
  ('s_armure_ap_t4',       '[S] Armure AP T4',       'Objets Craftés - Tier 4 [S]', 0),
  ('s_armure_ad_t4',       '[S] Armure AD T4',       'Objets Craftés - Tier 4 [S]', 0)
ON CONFLICT (key) DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- 3. Colonne item_id sur dons_logistique (FK vers logistics_items)
--    Nullable : les dons historiques créés avant cette migration
--    n'ont pas de lien FK, mais gardent item_key / item_label
--    comme snapshot dénormalisé.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.dons_logistique
  ADD COLUMN IF NOT EXISTS item_id UUID REFERENCES public.logistics_items(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_dons_logistique_item_id
  ON public.dons_logistique (item_id);


-- ─────────────────────────────────────────────────────────────
-- 4. Backfill item_id sur les dons existants (match par item_key)
-- ─────────────────────────────────────────────────────────────

UPDATE public.dons_logistique d
   SET item_id = li.id
  FROM public.logistics_items li
 WHERE d.item_key = li.key
   AND d.item_id IS NULL;


-- ─────────────────────────────────────────────────────────────
-- 5. Garantir que app_config contient le Global Bonus Cap
--    (déjà créé par migration_logistics_points.sql, mais
--    on s'assure de sa présence).
-- ─────────────────────────────────────────────────────────────

INSERT INTO public.app_config (key, value)
VALUES ('MAX_COUNTABLE_LOGISTICS_POINTS', '200')
ON CONFLICT (key) DO NOTHING;


-- ─────────────────────────────────────────────────────────────
-- 6. Vue utilitaire : statistiques logistique par donneur
--    Permet de récupérer rapidement le total de dons et points
--    par utilisateur sans scan de toute la table dons_logistique.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.v_logistics_donor_stats AS
SELECT
  d.donneur_id,
  u.pseudo           AS donneur_pseudo,
  COUNT(*)           AS total_dons,
  COALESCE(SUM(d.quantite), 0)       AS total_quantite,
  COALESCE(SUM(d.points_gagnes), 0)  AS total_points_gagnes,
  MAX(d.created_at)  AS dernier_don
FROM public.dons_logistique d
JOIN public.utilisateurs u ON u.id = d.donneur_id
GROUP BY d.donneur_id, u.pseudo;
