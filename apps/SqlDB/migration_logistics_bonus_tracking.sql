-- ============================================================
-- Migration : Suivi du bonus logistique appliqué
-- Ajoute logistics_bonus_applied sur `utilisateurs` pour permettre
-- une recalculation sûre du bonus 10 % plafonné.
-- Met à jour la RPC enregistrer_points_logistique pour s'auto‑corriger
-- lors de changements de plafond.
-- Ajoute une RPC recalculer_bonus_logistique pour recalcul unitaire.
-- ============================================================

-- 1. Colonne de suivi : total du bonus déjà répercuté sur points_personnels
ALTER TABLE public.utilisateurs
  ADD COLUMN IF NOT EXISTS logistics_bonus_applied INTEGER NOT NULL DEFAULT 0;

-- 2. Backfill : initialiser à partir des données existantes
--    Lit le plafond depuis app_config pour être cohérent.
DO $$
DECLARE
  v_cap INTEGER;
BEGIN
  SELECT COALESCE(NULLIF(value, '')::INTEGER, 200)
    INTO v_cap
    FROM public.app_config
   WHERE key = 'MAX_COUNTABLE_LOGISTICS_POINTS';

  IF v_cap IS NULL THEN v_cap := 200; END IF;

  UPDATE public.utilisateurs
     SET logistics_bonus_applied = FLOOR(LEAST(logistics_points * 0.10, v_cap))
   WHERE logistics_points > 0;
END;
$$;


-- 3. RPC mise à jour : enregistrer_points_logistique
--    Utilise logistics_bonus_applied pour calculer le delta réel.
--    Se corrige automatiquement si le plafond a changé entre deux appels.
--    Gère les deltas positifs ET négatifs (correction de cap).
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
  v_new_logistics      INTEGER;
  v_current_applied    INTEGER;
  v_new_contrib        INTEGER;
  v_delta              INTEGER;
  v_cap                INTEGER;
  v_escouade_id        UUID;
BEGIN
  -- Lire le plafond depuis la config (défaut = 200)
  SELECT COALESCE(NULLIF(value, '')::INTEGER, 200)
    INTO v_cap
    FROM public.app_config
   WHERE key = 'MAX_COUNTABLE_LOGISTICS_POINTS';

  IF v_cap IS NULL THEN
    v_cap := 200;
  END IF;

  -- Verrouiller la ligne et lire l'état actuel
  SELECT logistics_points + p_points_gained,
         logistics_bonus_applied
    INTO v_new_logistics,
         v_current_applied
    FROM public.utilisateurs
   WHERE id = p_user_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Utilisateur % introuvable', p_user_id;
  END IF;

  -- Bonus attendu au nouveau niveau de logistics_points
  v_new_contrib := FLOOR(LEAST(v_new_logistics * 0.10, v_cap));
  -- Delta = différence entre ce qui devrait être appliqué et ce qui l'est déjà
  v_delta       := v_new_contrib - v_current_applied;

  -- Mise à jour logistics_points + suivi
  UPDATE public.utilisateurs
     SET logistics_points        = v_new_logistics,
         logistics_bonus_applied = v_new_contrib,
         mis_a_jour_le           = NOW()
   WHERE id = p_user_id;

  -- Répercuter le delta sur points personnels et escouade
  IF v_delta <> 0 THEN
    UPDATE public.utilisateurs
       SET points_personnels = GREATEST(points_personnels + v_delta, 0)
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

      INSERT INTO public.hauts_faits_escouade (escouade_id, raison, points)
      VALUES (
        v_escouade_id,
        CASE WHEN v_delta > 0
          THEN 'Bonus Production & Logistique'
          ELSE 'Correction Bonus Production & Logistique'
        END,
        v_delta
      );
    END IF;
  END IF;
END;
$$;


-- 4. Nouvelle RPC : recalculer_bonus_logistique
--    Recalcule le bonus d'un seul utilisateur. Sûr et idempotent.
--    À appeler après un changement de plafond ou pour corriger un désync.
CREATE OR REPLACE FUNCTION public.recalculer_bonus_logistique(
  p_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_logistics       INTEGER;
  v_current_applied INTEGER;
  v_expected        INTEGER;
  v_delta           INTEGER;
  v_cap             INTEGER;
  v_escouade_id     UUID;
BEGIN
  -- Lire le plafond
  SELECT COALESCE(NULLIF(value, '')::INTEGER, 200)
    INTO v_cap
    FROM public.app_config
   WHERE key = 'MAX_COUNTABLE_LOGISTICS_POINTS';

  IF v_cap IS NULL THEN v_cap := 200; END IF;

  -- Verrouiller et lire
  SELECT logistics_points, logistics_bonus_applied
    INTO v_logistics, v_current_applied
    FROM public.utilisateurs
   WHERE id = p_user_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Utilisateur % introuvable', p_user_id;
  END IF;

  v_expected := FLOOR(LEAST(v_logistics * 0.10, v_cap));
  v_delta    := v_expected - v_current_applied;

  -- Rien à faire si le bonus est déjà correct
  IF v_delta = 0 THEN RETURN; END IF;

  -- Corriger points personnels + suivi
  UPDATE public.utilisateurs
     SET points_personnels       = GREATEST(points_personnels + v_delta, 0),
         logistics_bonus_applied = v_expected,
         mis_a_jour_le           = NOW()
   WHERE id = p_user_id;

  -- Corriger points d'escouade (escouade actuelle)
  SELECT me.escouade_id
    INTO v_escouade_id
    FROM public.membres_escouade me
   WHERE me.utilisateur_id = p_user_id
   LIMIT 1;

  IF v_escouade_id IS NOT NULL THEN
    UPDATE public.escouades
       SET points = points + v_delta
     WHERE id = v_escouade_id;

    INSERT INTO public.hauts_faits_escouade (escouade_id, raison, points)
    VALUES (v_escouade_id, 'Recalcul Bonus Production & Logistique', v_delta);
  END IF;
END;
$$;
