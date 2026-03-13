-- ============================================================
-- Migration : Malus logistique — retrait de points
-- Rôles autorisés côté app : Directeur, Co-Directeur, Superviseur P&L
-- ============================================================
-- Crée la RPC appliquer_malus_logistique qui :
--   1. Retire des points logistique (peut aller en négatif, sans plancher)
--   2. Recalcule le bonus 5% (peut devenir négatif si logistics_points < 0)
--   3. Applique le delta sur points_personnels — sans GREATEST(0, …)
--      → les points personnels PEUVENT passer en négatif (malus sans plancher)
--   4. Enregistre dans historique_points_personnels (valeur peut être négative)
-- ============================================================

CREATE OR REPLACE FUNCTION public.appliquer_malus_logistique(
  p_user_id        UUID,
  p_points_retires INTEGER,  -- nombre de points à RETIRER (doit être > 0)
  p_raison         TEXT DEFAULT 'Malus Production & Logistique'
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
  IF p_points_retires <= 0 THEN
    RAISE EXCEPTION 'p_points_retires doit être un entier strictement positif, reçu : %', p_points_retires;
  END IF;

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
    RAISE EXCEPTION 'Utilisateur introuvable : %', p_user_id;
  END IF;

  -- Retrait (peut résulter en valeur négative — pas de plancher)
  v_new_logistics := v_current_logistics - p_points_retires;

  -- Bonus : FLOOR(LEAST(logistics * 5%, cap)).
  -- Si logistics négatif → bonus négatif.
  -- Pas de GREATEST(0, …) : le malus est intentionnellement sans plancher.
  v_new_contrib := FLOOR(LEAST(v_new_logistics::numeric * 0.05, v_cap::numeric));

  v_delta := v_new_contrib - v_current_applied;

  UPDATE public.utilisateurs
     SET logistics_points        = v_new_logistics,
         logistics_bonus_applied = v_new_contrib,
         points_personnels       = points_personnels + v_delta
   WHERE id = p_user_id;

  -- Log dans l'historique (valeur peut être négative)
  IF v_delta <> 0 THEN
    INSERT INTO public.historique_points_personnels
      (utilisateur_id, points, justification, source)
    VALUES
      (p_user_id, v_delta, p_raison, 'logistique');
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.appliquer_malus_logistique(UUID, INTEGER, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.appliquer_malus_logistique(UUID, INTEGER, TEXT) TO service_role;
