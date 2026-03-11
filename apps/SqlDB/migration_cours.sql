-- ============================================================================
-- Migration : Système de Cours (enseignement entre élèves / profs)
-- ============================================================================
-- Tables : cours, participations_cours
-- Points : 5 pts personnels par participant, 15 pts personnels au créateur
-- Aucun bonus d'escouade.
-- Minimum 5 participants pour valider un cours.
-- Le créateur fait l'appel avant de clôturer.
-- ============================================================================

-- 1. Table cours
CREATE TABLE IF NOT EXISTS cours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  createur_id UUID NOT NULL REFERENCES utilisateurs(id),
  titre VARCHAR(200) NOT NULL,
  description TEXT,
  date_heure TIMESTAMPTZ,
  capacite INTEGER, -- NULL = illimité
  ping_cible JSONB NOT NULL DEFAULT '{}',
  discord_message_id TEXT,
  statut VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (statut IN ('active', 'termine', 'annule')),
  site site_id NOT NULL DEFAULT 'tokyo',
  deleted_at TIMESTAMPTZ,
  cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
  mis_a_jour_le TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cours_site ON cours(site);
CREATE INDEX IF NOT EXISTS idx_cours_statut ON cours(statut);
CREATE INDEX IF NOT EXISTS idx_cours_createur ON cours(createur_id);

-- 2. Table participations_cours
CREATE TABLE IF NOT EXISTS participations_cours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cours_id UUID NOT NULL REFERENCES cours(id) ON DELETE CASCADE,
  utilisateur_id UUID NOT NULL REFERENCES utilisateurs(id),
  present BOOLEAN NOT NULL DEFAULT false, -- validé par l'appel du créateur
  site site_id NOT NULL DEFAULT 'tokyo',
  cree_le TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (cours_id, utilisateur_id)
);

CREATE INDEX IF NOT EXISTS idx_participations_cours_cours ON participations_cours(cours_id);
CREATE INDEX IF NOT EXISTS idx_participations_cours_user ON participations_cours(utilisateur_id);
CREATE INDEX IF NOT EXISTS idx_participations_cours_site ON participations_cours(site);

-- 3. Ajouter colonne appel validé aux participations_mission (système d'appel missions)
ALTER TABLE participations_mission
  ADD COLUMN IF NOT EXISTS present BOOLEAN NOT NULL DEFAULT false;

-- 4. RLS
ALTER TABLE cours ENABLE ROW LEVEL SECURITY;
ALTER TABLE participations_cours ENABLE ROW LEVEL SECURITY;

-- Lecture : tout le monde authentifié
CREATE POLICY "cours_select" ON cours FOR SELECT TO authenticated USING (true);
CREATE POLICY "participations_cours_select" ON participations_cours FOR SELECT TO authenticated USING (true);

-- Insert/Update/Delete : via service_role (admin client côté serveur)
CREATE POLICY "cours_insert_service" ON cours FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "cours_update_service" ON cours FOR UPDATE TO service_role USING (true);
CREATE POLICY "cours_delete_service" ON cours FOR DELETE TO service_role USING (true);

CREATE POLICY "participations_cours_insert_service" ON participations_cours FOR INSERT TO service_role WITH CHECK (true);
CREATE POLICY "participations_cours_update_service" ON participations_cours FOR UPDATE TO service_role USING (true);
CREATE POLICY "participations_cours_delete_service" ON participations_cours FOR DELETE TO service_role USING (true);

-- ============================================================================
-- Notes :
-- - Le créateur du cours reçoit 15 pts personnels à la clôture
-- - Chaque participant marqué "présent" reçoit 5 pts personnels
-- - Minimum 5 présents pour valider
-- - Aucun bonus d'escouade
-- ============================================================================
