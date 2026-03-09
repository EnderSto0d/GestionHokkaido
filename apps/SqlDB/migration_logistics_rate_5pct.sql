-- ============================================================
-- Migration : Taux de conversion logistique → points personnels
-- Passe le taux de 10 % à 5 %.
-- Basée sur la V2 (pas de propagation escouades.points,
-- protection delta négatif, logging historique_points_personnels,
-- REVOKE/GRANT service_role).
--
-- Actions :
--   1. Backfill : recalculer logistics_bonus_applied pour tous les
--      utilisateurs (le delta étant négatif, on ne retire PAS de
--      points_personnels — on ajuste seulement le tracker).
--   2. Mise à jour des deux RPC avec le nouveau taux 0.05.
-- ============================================================

-- 1. Backfill : ajuster logistics_bonus_applied au nouveau taux.
--    Le passage de 10% → 5% produit un delta NÉGATIF.
--    Conformément à la règle V2 "ne jamais retirer des points personnels",
--    on met seulement à jour le tracker sans toucher points_personnels.
DO $$
DECLARE
  v_cap INTEGER;
BEGIN
  SELECT COALESCE(
    (SELECT value::integer FROM public.app_config WHERE key = 'MAX_COUNTABLE_LOGISTICS_POINTS'),
    200
  ) INTO v_cap;

  -- Recalculer le tracker au taux 5 % (sans modifier points_personnels)
  UPDATE public.utilisateurs
     SET logistics_bonus_applied = FLOOR(LEAST(logistics_points * 0.05, v_cap))
   WHERE logistics_points > 0;
END;
$$;


-- 2. RPC : enregistrer_points_logistique (taux 5 %)
--    Identique à la V2 sauf 0.10 → 0.05.
CREATE OR REPLACE FUNCTION public.enregistrer_points_logistique(
  p_user_id       UUID,
  p_points_gained INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_logistics  INTEGER;
  v_current_applied    INTEGER;
  v_new_logistics      INTEGER;
  v_cap                INTEGER;
  v_new_contrib        INTEGER;
  v_delta              INTEGER;
BEGIN
  SELECT COALESCE(
    (SELECT value::integer FROM public.app_config WHERE key = 'MAX_COUNTABLE_LOGISTICS_POINTS'),
    200
  ) INTO v_cap;

  SELECT logistics_points, logistics_bonus_applied
    INTO v_current_logistics, v_current_applied
    FROM public.utilisateurs
   WHERE id = p_user_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Utilisateur introuvable: %', p_user_id;
  END IF;

  v_new_logistics := v_current_logistics + p_points_gained;

  v_new_contrib := FLOOR(LEAST(v_new_logistics * 0.05, v_cap));
  v_delta := v_new_contrib - v_current_applied;

  -- Ne jamais retirer des points personnels
  IF v_delta < 0 THEN
    v_delta := 0;
    v_new_contrib := v_current_applied;
  END IF;

  UPDATE public.utilisateurs
     SET logistics_points        = v_new_logistics,
         logistics_bonus_applied = v_new_contrib,
         points_personnels       = GREATEST(0, points_personnels + v_delta)
   WHERE id = p_user_id;

  -- NB : On ne touche plus à escouades.points (système V2)

  IF v_delta > 0 THEN
    INSERT INTO public.historique_points_personnels
      (utilisateur_id, points, justification, source)
    VALUES
      (p_user_id, v_delta, 'Bonus Production & Logistique', 'logistique');
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.enregistrer_points_logistique(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enregistrer_points_logistique(UUID, INTEGER) TO service_role;


-- 3. RPC : recalculer_bonus_logistique (taux 5 %)
--    Identique à la V2 sauf 0.10 → 0.05.
CREATE OR REPLACE FUNCTION public.recalculer_bonus_logistique(
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_logistics  INTEGER;
  v_current_applied    INTEGER;
  v_cap                INTEGER;
  v_expected           INTEGER;
  v_delta              INTEGER;
BEGIN
  SELECT COALESCE(
    (SELECT value::integer FROM public.app_config WHERE key = 'MAX_COUNTABLE_LOGISTICS_POINTS'),
    200
  ) INTO v_cap;

  SELECT logistics_points, logistics_bonus_applied
    INTO v_current_logistics, v_current_applied
    FROM public.utilisateurs
   WHERE id = p_user_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Utilisateur introuvable: %', p_user_id;
  END IF;

  v_expected := FLOOR(LEAST(v_current_logistics * 0.05, v_cap));
  v_delta    := v_expected - v_current_applied;

  -- Ne jamais retirer des points personnels
  IF v_delta < 0 THEN
    v_delta := 0;
    v_expected := v_current_applied;
  END IF;

  IF v_delta > 0 THEN
    UPDATE public.utilisateurs
       SET logistics_bonus_applied = v_expected,
           points_personnels       = GREATEST(0, points_personnels + v_delta)
     WHERE id = p_user_id;

    INSERT INTO public.historique_points_personnels
      (utilisateur_id, points, justification, source)
    VALUES
      (p_user_id, v_delta, 'Correction Bonus Production & Logistique', 'logistique');
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.recalculer_bonus_logistique(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.recalculer_bonus_logistique(UUID) TO service_role;
