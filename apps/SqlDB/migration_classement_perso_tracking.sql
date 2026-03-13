-- Migration: classement_perso_tracking
-- Tracks who is #1 in personal ranking and since when,
-- for the 24h rule on the conseil classement_perso seat.

CREATE TABLE IF NOT EXISTS classement_perso_premier (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  utilisateur_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  premier_depuis timestamptz NOT NULL DEFAULT now(),
  perdu_premier_le timestamptz, -- null = still #1, set = lost #1 at this time
  cree_le timestamptz DEFAULT now(),
  mis_a_jour_le timestamptz DEFAULT now()
);

-- Only one tracking row should exist at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_classement_perso_premier_unique
  ON classement_perso_premier (utilisateur_id);

-- RLS policies
ALTER TABLE classement_perso_premier ENABLE ROW LEVEL SECURITY;

CREATE POLICY "classement_perso_premier_select_all"
  ON classement_perso_premier FOR SELECT
  USING (true);

CREATE POLICY "classement_perso_premier_admin_all"
  ON classement_perso_premier FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM utilisateurs
      WHERE utilisateurs.id = auth.uid()
      AND utilisateurs.role IN ('professeur', 'admin')
    )
  );
