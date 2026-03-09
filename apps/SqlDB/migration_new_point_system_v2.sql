-- ============================================================================
-- Migration : Nouveau système de points V2
-- ============================================================================
-- Règles :
--   1. Points personnels (utilisateurs.points_personnels) : ne diminuent JAMAIS.
--   2. Points d'escouade (escouades.points) : réserve logistique du groupe.
--      - Décroissance ÷2 chaque lundi à 4h UTC (inchangé).
--   3. Points totaux = Somme(points_personnels des membres actuels) + points d'escouade.
--
-- Modifications :
--   - Ajout table historique_points_personnels (log des attributions individuelles)
--   - Mise à jour RPC enregistrer_points_logistique : ne touche plus escouades.points
--   - Mise à jour RPC recalculer_bonus_logistique : ne touche plus escouades.points
--   - Nouvelle RPC calculer_points_totaux_escouade(p_escouade_id)
-- ============================================================================

-- ─── Table de log pour les attributions de points personnels ──────────────────

CREATE TABLE IF NOT EXISTS public.historique_points_personnels (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  utilisateur_id  UUID NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
  attribue_par    UUID REFERENCES public.utilisateurs(id) ON DELETE SET NULL,
  points          INTEGER NOT NULL,
  justification   TEXT DEFAULT '',
  source          TEXT NOT NULL DEFAULT 'manuel',
  cree_le         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hpp_utilisateur
  ON public.historique_points_personnels(utilisateur_id);

-- RLS : allow service_role full access
ALTER TABLE public.historique_points_personnels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access historique_points_personnels"
  ON public.historique_points_personnels
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ─── RPC : Calculer les points totaux d'une escouade ──────────────────────────

CREATE OR REPLACE FUNCTION public.calculer_points_totaux_escouade(
  p_escouade_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_somme_personnels INTEGER;
  v_points_escouade  INTEGER;
BEGIN
  -- Somme des points personnels des membres actuels
  SELECT COALESCE(SUM(u.points_personnels), 0)
    INTO v_somme_personnels
    FROM public.membres_escouade me
    JOIN public.utilisateurs u ON u.id = me.utilisateur_id
   WHERE me.escouade_id = p_escouade_id;

  -- Points d'escouade (réserve)
  SELECT COALESCE(e.points, 0)
    INTO v_points_escouade
    FROM public.escouades e
   WHERE e.id = p_escouade_id;

  RETURN v_somme_personnels + v_points_escouade;
END;
$$;

-- Accès pour authenticated + service_role
GRANT EXECUTE ON FUNCTION public.calculer_points_totaux_escouade(UUID)
  TO authenticated, service_role;

-- ─── Mise à jour RPC enregistrer_points_logistique ────────────────────────────
-- Ne propage plus le delta aux escouades.points (seuls les points personnels).

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
  -- Lire le plafond depuis app_config
  SELECT COALESCE(
    (SELECT value::integer FROM public.app_config WHERE key = 'MAX_COUNTABLE_LOGISTICS_POINTS'),
    200
  ) INTO v_cap;

  -- Verrouiller la ligne utilisateur
  SELECT logistics_points, logistics_bonus_applied
    INTO v_current_logistics, v_current_applied
    FROM public.utilisateurs
   WHERE id = p_user_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Utilisateur introuvable: %', p_user_id;
  END IF;

  v_new_logistics := v_current_logistics + p_points_gained;

  -- Calcul du nouveau bonus (ne doit jamais baisser pour les points personnels)
  v_new_contrib := FLOOR(LEAST(v_new_logistics * 0.10, v_cap));
  v_delta := v_new_contrib - v_current_applied;

  -- Ne jamais retirer des points personnels
  IF v_delta < 0 THEN
    v_delta := 0;
    v_new_contrib := v_current_applied;
  END IF;

  -- Mise à jour de l'utilisateur
  UPDATE public.utilisateurs
     SET logistics_points        = v_new_logistics,
         logistics_bonus_applied = v_new_contrib,
         points_personnels       = GREATEST(0, points_personnels + v_delta)
   WHERE id = p_user_id;

  -- NB : On ne touche plus à escouades.points ici (nouveau système V2)

  -- Log si delta positif
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

-- ─── Mise à jour RPC recalculer_bonus_logistique ──────────────────────────────
-- Idem : ne touche plus escouades.points.

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

  v_expected := FLOOR(LEAST(v_current_logistics * 0.10, v_cap));
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

-- ─── Nouvelle RPC : Attribuer des points personnels (prof/admin) ──────────────

CREATE OR REPLACE FUNCTION public.attribuer_points_personnels(
  p_user_id       UUID,
  p_points        INTEGER,
  p_attribue_par  UUID,
  p_justification TEXT DEFAULT ''
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_points <= 0 THEN
    RAISE EXCEPTION 'Les points doivent être positifs';
  END IF;

  UPDATE public.utilisateurs
     SET points_personnels = points_personnels + p_points
   WHERE id = p_user_id;

  INSERT INTO public.historique_points_personnels
    (utilisateur_id, attribue_par, points, justification, source)
  VALUES
    (p_user_id, p_attribue_par, p_points, COALESCE(p_justification, ''), 'manuel');
END;
$$;

REVOKE ALL ON FUNCTION public.attribuer_points_personnels(UUID, INTEGER, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.attribuer_points_personnels(UUID, INTEGER, UUID, TEXT) TO service_role;
