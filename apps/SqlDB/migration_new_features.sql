-- ============================================================
-- Migration : New Features
-- Points personnels, Clan, Soft-delete missions,
-- Siège classement perso au conseil, RLS mises à jour
-- ============================================================

-- 1. Points personnels sur utilisateurs
ALTER TABLE public.utilisateurs
  ADD COLUMN IF NOT EXISTS points_personnels INTEGER NOT NULL DEFAULT 0;

-- 2. Clan sur utilisateurs (synchronisé depuis Discord)
ALTER TABLE public.utilisateurs
  ADD COLUMN IF NOT EXISTS clan TEXT;

-- 3. Soft-delete sur missions
ALTER TABLE public.missions
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 4. Nouveau type de siège au conseil : classement_perso (rouge)
--    PostgreSQL ne supporte pas "IF NOT EXISTS" sur ADD VALUE avant la 14.x.
--    On vérifie l'absence avant d'insérer.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'public.type_siege_conseil'::regtype
      AND enumlabel = 'classement_perso'
  ) THEN
    ALTER TYPE public.type_siege_conseil ADD VALUE 'classement_perso';
  END IF;
END;
$$;

-- 5. Politique RLS : les membres du conseil peuvent soumettre des évaluations individuelles
--    (en plus des professeurs et admins)
DROP POLICY IF EXISTS "evaluations_individuelles_insert" ON public.evaluations_individuelles;
CREATE POLICY "evaluations_individuelles_insert"
  ON public.evaluations_individuelles
  FOR INSERT
  WITH CHECK (
    auth.uid() = evaluateur_id
    AND (
      -- Professeur ou admin
      EXISTS (
        SELECT 1 FROM public.utilisateurs u
        WHERE u.id = auth.uid()
          AND u.role IN ('professeur', 'admin')
      )
      OR
      -- Membre du conseil
      EXISTS (
        SELECT 1 FROM public.conseil_membres cm
        WHERE cm.utilisateur_id = auth.uid()
      )
    )
  );

-- 6. Filtrer les missions supprimées dans la politique SELECT existante
--    (les missions avec deleted_at non null ne sont plus visibles)
DROP POLICY IF EXISTS "missions_select" ON public.missions;
CREATE POLICY "missions_select"
  ON public.missions
  FOR SELECT
  USING (deleted_at IS NULL);

-- 7. Index pour les requêtes sur points_personnels (classement)
CREATE INDEX IF NOT EXISTS idx_utilisateurs_points_personnels
  ON public.utilisateurs (points_personnels DESC);

-- 8. Index pour les missions non supprimées
CREATE INDEX IF NOT EXISTS idx_missions_deleted_at
  ON public.missions (deleted_at)
  WHERE deleted_at IS NULL;

-- 9. Fonction batch pour incrémenter les points personnels de plusieurs utilisateurs
--    en une seule requête (utilisée lors de la finalisation d'une mission)
-- ⚠️  RESET PROTECTION : cette fonction modifie UNIQUEMENT points_personnels.
--    Elle ne doit JAMAIS toucher à logistics_points, qui sont immutables
--    vis-à-vis des purges et réinitialisations standard.
CREATE OR REPLACE FUNCTION public.incrementer_points_personnels_batch(
  user_ids UUID[],
  increment_amount INTEGER
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- N.B. : seul points_personnels est modifié.
  -- logistics_points ne doit JAMAIS être réinitialisé par cette fonction.
  UPDATE public.utilisateurs
  SET points_personnels = points_personnels + increment_amount
  WHERE id = ANY(user_ids);
END;
$$;

-- Accorder l'exécution uniquement aux rôles authentifiés (service_role)
REVOKE ALL ON FUNCTION public.incrementer_points_personnels_batch(UUID[], INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.incrementer_points_personnels_batch(UUID[], INTEGER) TO service_role;
