-- ========================================
-- AGENCES D'EXORCISTES
-- ========================================

-- Table principale des agences
CREATE TABLE IF NOT EXISTS agences (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom             text NOT NULL,
  description     text,
  url_logo        text,
  url_banniere    text,
  fondateur_id    uuid NOT NULL REFERENCES utilisateurs(id) ON DELETE RESTRICT,
  site_id         text CHECK (site_id IN ('tokyo', 'hokkaido')),  -- NULL = inter-école
  est_inter_ecole boolean NOT NULL DEFAULT false,
  discord_role_id text,
  cree_le         timestamptz NOT NULL DEFAULT now(),
  mis_a_jour_le   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agences_nom_unique UNIQUE (nom)
);

-- Membres d'agence (ExoPro+ uniquement)
CREATE TABLE IF NOT EXISTS membres_agence (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agence_id       uuid NOT NULL REFERENCES agences(id) ON DELETE CASCADE,
  utilisateur_id  uuid NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  role_agence     text NOT NULL DEFAULT 'membre' CHECK (role_agence IN ('fondateur', 'membre')),
  cree_le         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT membres_agence_user_unique UNIQUE (utilisateur_id)  -- 1 agence max par utilisateur
);

-- Stagiaires d'agence (étudiants Terminal uniquement)
CREATE TABLE IF NOT EXISTS stagiaires_agence (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agence_id       uuid NOT NULL REFERENCES agences(id) ON DELETE CASCADE,
  utilisateur_id  uuid NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  parrain_id      uuid NOT NULL REFERENCES utilisateurs(id) ON DELETE RESTRICT,  -- Parrain ExoPro
  debut           timestamptz NOT NULL DEFAULT now(),
  fin             timestamptz   -- NULL = stage actif
);

-- Ajout des colonnes agence sur la table missions
ALTER TABLE missions
  ADD COLUMN IF NOT EXISTS agence_id uuid REFERENCES agences(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS est_mission_agence boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS delegation_escouade_id uuid REFERENCES escouades(id) ON DELETE SET NULL;

-- Index
CREATE INDEX IF NOT EXISTS idx_membres_agence_agence_id ON membres_agence(agence_id);
CREATE INDEX IF NOT EXISTS idx_membres_agence_utilisateur_id ON membres_agence(utilisateur_id);
CREATE INDEX IF NOT EXISTS idx_stagiaires_agence_agence_id ON stagiaires_agence(agence_id);
CREATE INDEX IF NOT EXISTS idx_stagiaires_agence_utilisateur_id ON stagiaires_agence(utilisateur_id);
-- Partial unique index: only 1 active internship (fin IS NULL) per student at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_stagiaires_agence_actif_unique
  ON stagiaires_agence(utilisateur_id)
  WHERE fin IS NULL;
CREATE INDEX IF NOT EXISTS idx_stagiaires_agence_actifs ON stagiaires_agence(utilisateur_id) WHERE fin IS NULL;
CREATE INDEX IF NOT EXISTS idx_agences_site_id ON agences(site_id);
CREATE INDEX IF NOT EXISTS idx_missions_agence_id ON missions(agence_id);

-- RLS
ALTER TABLE agences ENABLE ROW LEVEL SECURITY;
ALTER TABLE membres_agence ENABLE ROW LEVEL SECURITY;
ALTER TABLE stagiaires_agence ENABLE ROW LEVEL SECURITY;

-- Politiques : tout utilisateur authentifié peut lire ; les écritures passent uniquement par service_role
CREATE POLICY "agences_select" ON agences FOR SELECT TO authenticated USING (true);
CREATE POLICY "agences_service" ON agences FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "membres_agence_select" ON membres_agence FOR SELECT TO authenticated USING (true);
CREATE POLICY "membres_agence_service" ON membres_agence FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "stagiaires_agence_select" ON stagiaires_agence FOR SELECT TO authenticated USING (true);
CREATE POLICY "stagiaires_agence_service" ON stagiaires_agence FOR ALL TO service_role USING (true) WITH CHECK (true);
