-- Fix: stagiaires_agence uniqueness should be partial (active internships only)
-- A student may complete multiple internships over time (historical rows with fin IS NOT NULL must be allowed).
-- The old full UNIQUE constraint on utilisateur_id blocked any second internship for the same student.

-- Drop the old full unique constraint if it exists
ALTER TABLE stagiaires_agence DROP CONSTRAINT IF EXISTS stagiaires_agence_actif_unique;

-- Drop any previous partial index to recreate it cleanly
DROP INDEX IF EXISTS idx_stagiaires_agence_actif_unique;

-- Add partial unique index: enforce uniqueness only for active internships (fin IS NULL)
CREATE UNIQUE INDEX idx_stagiaires_agence_actif_unique
  ON stagiaires_agence(utilisateur_id)
  WHERE fin IS NULL;
