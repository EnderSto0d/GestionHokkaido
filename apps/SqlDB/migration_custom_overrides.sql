-- ============================================================================
-- Migration : Ajout des champs de surcharge manuelle (pseudo & avatar)
-- ============================================================================
-- Ces colonnes permettent de savoir si un utilisateur a manuellement
-- modifié son pseudo ou son avatar sur le site. Si c'est le cas,
-- la synchronisation Discord au login ne remplacera pas ces valeurs.
-- ============================================================================

ALTER TABLE utilisateurs
  ADD COLUMN IF NOT EXISTS pseudo_custom BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE utilisateurs
  ADD COLUMN IF NOT EXISTS avatar_custom BOOLEAN NOT NULL DEFAULT FALSE;

-- Index optionnel pour filtrer rapidement les overrides
-- CREATE INDEX IF NOT EXISTS idx_utilisateurs_custom ON utilisateurs (pseudo_custom, avatar_custom);
