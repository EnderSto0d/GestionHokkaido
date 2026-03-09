-- ============================================================================
-- Migration : Support multi-site (Tokyo + Hokkaido) dans une seule DB
-- ============================================================================
-- Cette migration ajoute une colonne `site` à toutes les tables concernées
-- pour partitionner les données entre Tokyo et Hokkaido.
-- Un même compte Discord peut avoir un personnage sur chaque site.
-- Les données existantes sont marquées 'tokyo' par défaut.
-- ============================================================================

-- 1. Type ENUM pour les sites
DO $$ BEGIN
  CREATE TYPE site_id AS ENUM ('tokyo', 'hokkaido');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 2. Table utilisateurs : ajout de site + auth_user_id
-- ============================================================================

ALTER TABLE utilisateurs
  ADD COLUMN IF NOT EXISTS site site_id NOT NULL DEFAULT 'tokyo';

-- auth_user_id = le UUID Supabase Auth (auth.uid())
-- Pour Tokyo existant : auth_user_id = id (backward compatible)
-- Pour Hokkaido : id = gen_random_uuid(), auth_user_id = auth.uid()
ALTER TABLE utilisateurs
  ADD COLUMN IF NOT EXISTS auth_user_id UUID;

UPDATE utilisateurs SET auth_user_id = id WHERE auth_user_id IS NULL;

ALTER TABLE utilisateurs ALTER COLUMN auth_user_id SET NOT NULL;

-- Contrainte unique : un seul profil par auth user par site
ALTER TABLE utilisateurs
  ADD CONSTRAINT utilisateurs_auth_site_unique UNIQUE (auth_user_id, site);

CREATE INDEX IF NOT EXISTS idx_utilisateurs_site ON utilisateurs(site);
CREATE INDEX IF NOT EXISTS idx_utilisateurs_auth_site ON utilisateurs(auth_user_id, site);

-- ============================================================================
-- 3. Tables liées : ajout de site
-- ============================================================================

ALTER TABLE escouades ADD COLUMN IF NOT EXISTS site site_id NOT NULL DEFAULT 'tokyo';
CREATE INDEX IF NOT EXISTS idx_escouades_site ON escouades(site);

ALTER TABLE evaluations ADD COLUMN IF NOT EXISTS site site_id NOT NULL DEFAULT 'tokyo';
CREATE INDEX IF NOT EXISTS idx_evaluations_site ON evaluations(site);

ALTER TABLE evaluations_individuelles ADD COLUMN IF NOT EXISTS site site_id NOT NULL DEFAULT 'tokyo';
CREATE INDEX IF NOT EXISTS idx_evaluations_individuelles_site ON evaluations_individuelles(site);

ALTER TABLE hauts_faits_escouade ADD COLUMN IF NOT EXISTS site site_id NOT NULL DEFAULT 'tokyo';
CREATE INDEX IF NOT EXISTS idx_hauts_faits_escouade_site ON hauts_faits_escouade(site);

ALTER TABLE conseil_membres ADD COLUMN IF NOT EXISTS site site_id NOT NULL DEFAULT 'tokyo';
CREATE INDEX IF NOT EXISTS idx_conseil_membres_site ON conseil_membres(site);

ALTER TABLE conseil_elections_chef ADD COLUMN IF NOT EXISTS site site_id NOT NULL DEFAULT 'tokyo';
CREATE INDEX IF NOT EXISTS idx_conseil_elections_chef_site ON conseil_elections_chef(site);

ALTER TABLE conseil_votes_chef ADD COLUMN IF NOT EXISTS site site_id NOT NULL DEFAULT 'tokyo';
CREATE INDEX IF NOT EXISTS idx_conseil_votes_chef_site ON conseil_votes_chef(site);

ALTER TABLE conseil_propositions ADD COLUMN IF NOT EXISTS site site_id NOT NULL DEFAULT 'tokyo';
CREATE INDEX IF NOT EXISTS idx_conseil_propositions_site ON conseil_propositions(site);

ALTER TABLE conseil_votes_proposition ADD COLUMN IF NOT EXISTS site site_id NOT NULL DEFAULT 'tokyo';
CREATE INDEX IF NOT EXISTS idx_conseil_votes_proposition_site ON conseil_votes_proposition(site);

ALTER TABLE conseil_rankup_bans ADD COLUMN IF NOT EXISTS site site_id NOT NULL DEFAULT 'tokyo';
CREATE INDEX IF NOT EXISTS idx_conseil_rankup_bans_site ON conseil_rankup_bans(site);

ALTER TABLE utilisateur_divisions ADD COLUMN IF NOT EXISTS site site_id NOT NULL DEFAULT 'tokyo';
CREATE INDEX IF NOT EXISTS idx_utilisateur_divisions_site ON utilisateur_divisions(site);

ALTER TABLE elections_conseil ADD COLUMN IF NOT EXISTS site site_id NOT NULL DEFAULT 'tokyo';
CREATE INDEX IF NOT EXISTS idx_elections_conseil_site ON elections_conseil(site);

ALTER TABLE votes_conseil ADD COLUMN IF NOT EXISTS site site_id NOT NULL DEFAULT 'tokyo';
CREATE INDEX IF NOT EXISTS idx_votes_conseil_site ON votes_conseil(site);

ALTER TABLE missions ADD COLUMN IF NOT EXISTS site site_id NOT NULL DEFAULT 'tokyo';
CREATE INDEX IF NOT EXISTS idx_missions_site ON missions(site);

ALTER TABLE participations_mission ADD COLUMN IF NOT EXISTS site site_id NOT NULL DEFAULT 'tokyo';
CREATE INDEX IF NOT EXISTS idx_participations_mission_site ON participations_mission(site);

ALTER TABLE mission_logs ADD COLUMN IF NOT EXISTS site site_id NOT NULL DEFAULT 'tokyo';
CREATE INDEX IF NOT EXISTS idx_mission_logs_site ON mission_logs(site);

ALTER TABLE logistics_items ADD COLUMN IF NOT EXISTS site site_id NOT NULL DEFAULT 'tokyo';
CREATE INDEX IF NOT EXISTS idx_logistics_items_site ON logistics_items(site);

ALTER TABLE dons_logistique ADD COLUMN IF NOT EXISTS site site_id NOT NULL DEFAULT 'tokyo';
CREATE INDEX IF NOT EXISTS idx_dons_logistique_site ON dons_logistique(site);

ALTER TABLE app_config ADD COLUMN IF NOT EXISTS site site_id NOT NULL DEFAULT 'tokyo';
CREATE INDEX IF NOT EXISTS idx_app_config_site ON app_config(site);

ALTER TABLE invitations_escouade ADD COLUMN IF NOT EXISTS site site_id NOT NULL DEFAULT 'tokyo';
CREATE INDEX IF NOT EXISTS idx_invitations_escouade_site ON invitations_escouade(site);

ALTER TABLE membres_escouade ADD COLUMN IF NOT EXISTS site site_id NOT NULL DEFAULT 'tokyo';
CREATE INDEX IF NOT EXISTS idx_membres_escouade_site ON membres_escouade(site);

-- ============================================================================
-- 4. Dupliquer les items logistiques pour Hokkaido
-- ============================================================================
INSERT INTO logistics_items (key, label, category, points_per_unit, actif, site)
SELECT key, label, category, points_per_unit, actif, 'hokkaido'
FROM logistics_items
WHERE site = 'tokyo'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 5. Fonctions utilitaires mises à jour
-- ============================================================================

CREATE OR REPLACE FUNCTION get_current_site()
RETURNS site_id AS $$
  SELECT COALESCE(
    current_setting('app.current_site', true)::site_id,
    'tokyo'::site_id
  );
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION est_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM utilisateurs
    WHERE auth_user_id = auth.uid()
      AND site = get_current_site()
      AND role = 'admin'
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION est_professeur_ou_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM utilisateurs
    WHERE auth_user_id = auth.uid()
      AND site = get_current_site()
      AND role IN ('admin', 'professeur')
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_site_user_id()
RETURNS UUID AS $$
  SELECT id FROM utilisateurs
  WHERE auth_user_id = auth.uid()
    AND site = get_current_site()
  LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ============================================================================
-- 6. Notes de déploiement
-- ============================================================================
-- 
-- 1. Variables d'environnement Vercel :
--    Tokyo   : NEXT_PUBLIC_SITE_ID=tokyo
--    Hokkaido: NEXT_PUBLIC_SITE_ID=hokkaido
--
-- 2. Ajouter l'URL Hokkaido dans Supabase Auth > Redirect URLs
--
-- 3. Les données existantes restent 'tokyo' automatiquement.
-- ============================================================================
