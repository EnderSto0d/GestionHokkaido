-- ============================================================
-- Migration : Système Production & Logistique
-- Ajoute logistics_points sur `utilisateurs` et les fonctions
-- RPC associées au calcul du bonus personnel et d'escouade.
-- ============================================================

-- 1. Colonne logistics_points (jamais remise à zéro lors des purges normales)
ALTER TABLE public.utilisateurs
  ADD COLUMN IF NOT EXISTS logistics_points INTEGER NOT NULL DEFAULT 0;

-- Index utile pour les tris/classements futurs
CREATE INDEX IF NOT EXISTS idx_utilisateurs_logistics_points
  ON public.utilisateurs (logistics_points DESC);


-- 2. Constante de configuration : plafond des points comptabilisables
--    Stockée dans une table de config pour permettre une modification admin.
CREATE TABLE IF NOT EXISTS public.app_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO public.app_config (key, value)
VALUES ('MAX_COUNTABLE_LOGISTICS_POINTS', '200')
ON CONFLICT (key) DO NOTHING;


-- 3. RPC : enregistrer_points_logistique
--    Ajoute p_points_gained à logistics_points de l'utilisateur,
--    recalcule le delta de la contribution : MIN(logistics * 0.10, plafond),
--    et répercute ce delta sur points_personnels + points d'escouade.
CREATE OR REPLACE FUNCTION public.enregistrer_points_logistique(
  p_user_id       UUID,
  p_points_gained INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_logistics   INTEGER;
  v_new_logistics   INTEGER;
  v_old_contrib     INTEGER;
  v_new_contrib     INTEGER;
  v_delta           INTEGER;
  v_cap             INTEGER;
  v_escouade_id     UUID;
BEGIN
  -- Lire le plafond depuis la config (défaut = 200)
  SELECT COALESCE(NULLIF(value, '')::INTEGER, 200)
    INTO v_cap
    FROM public.app_config
   WHERE key = 'MAX_COUNTABLE_LOGISTICS_POINTS';

  IF v_cap IS NULL THEN
    v_cap := 200;
  END IF;

  -- Lire le solde actuel
  SELECT logistics_points
    INTO v_old_logistics
    FROM public.utilisateurs
   WHERE id = p_user_id
     FOR UPDATE;   -- verrouillage ligne pour éviter les race conditions

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Utilisateur % introuvable', p_user_id;
  END IF;

  v_new_logistics := v_old_logistics + p_points_gained;

  -- Contribution : MIN(logistics_points × 0.10, plafond)
  v_old_contrib := FLOOR(LEAST(v_old_logistics * 0.10, v_cap));
  v_new_contrib := FLOOR(LEAST(v_new_logistics * 0.10, v_cap));
  v_delta       := v_new_contrib - v_old_contrib;

  -- Mise à jour des logistics_points (jamais remis à zéro par les crons)
  UPDATE public.utilisateurs
     SET logistics_points = v_new_logistics,
         mis_a_jour_le    = NOW()
   WHERE id = p_user_id;

  -- Répercussion du delta sur les points personnels
  IF v_delta > 0 THEN
    UPDATE public.utilisateurs
       SET points_personnels = points_personnels + v_delta
     WHERE id = p_user_id;

    -- Escouade de l'utilisateur (s'il en a une)
    SELECT me.escouade_id
      INTO v_escouade_id
      FROM public.membres_escouade me
     WHERE me.utilisateur_id = p_user_id
     LIMIT 1;

    IF v_escouade_id IS NOT NULL THEN
      UPDATE public.escouades
         SET points = points + v_delta
       WHERE id = v_escouade_id;

      -- Journal hauts_faits_escouade (contrainte : points ≠ 0, raison ≥ 3 chars)
      INSERT INTO public.hauts_faits_escouade (escouade_id, raison, points)
      VALUES (v_escouade_id, 'Bonus Production & Logistique', v_delta);
    END IF;
  END IF;
END;
$$;


-- 4. Sécurité RLS : logistics_points ne doit pas être réinitialisé
--    par le cron de décroissance (qui ne touche qu'à escouades.points).
--    Vérifier que la fonction de décroissance n'affecte pas utilisateurs :
--    → aucun changement requis ici, le cron appelle uniquement
--      appliquer_decroissance_points_escouade (table escouades).


-- 5. RLS policies pour app_config (lecture publique, écriture admin)
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_config_read_all"  ON public.app_config;
DROP POLICY IF EXISTS "app_config_write_admin" ON public.app_config;

CREATE POLICY "app_config_read_all"
  ON public.app_config FOR SELECT
  USING (true);

-- Seul le service_role (admin client) peut modifier la config
CREATE POLICY "app_config_write_admin"
  ON public.app_config FOR ALL
  USING (auth.role() = 'service_role');
