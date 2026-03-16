-- Migration: Bureau Directorial
-- Run in both Tokyo and Hokkaido Supabase instances

-- Table: bureau_membres (les 5 membres du bureau)
CREATE TABLE IF NOT EXISTS bureau_membres (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  utilisateur_id UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  site_id TEXT NOT NULL,
  type_siege TEXT NOT NULL CHECK (type_siege IN ('nomme', 'elu')),
  est_chef BOOLEAN NOT NULL DEFAULT false,
  nomme_par UUID REFERENCES utilisateurs(id) ON DELETE SET NULL,
  nomme_le TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(utilisateur_id, site_id)
);

-- Table: bureau_elections (élection pour le siège élu)
CREATE TABLE IF NOT EXISTS bureau_elections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  site_id TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'en_cours' CHECK (statut IN ('en_cours', 'terminee', 'annulee')),
  debut TIMESTAMPTZ NOT NULL DEFAULT now(),
  fin TIMESTAMPTZ,
  elu_id UUID REFERENCES utilisateurs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Table: bureau_votes (votes pour le siège élu, 1 vote par utilisateur par élection)
CREATE TABLE IF NOT EXISTS bureau_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  election_id UUID NOT NULL REFERENCES bureau_elections(id) ON DELETE CASCADE,
  votant_id UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  candidat_id UUID NOT NULL REFERENCES utilisateurs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(election_id, votant_id)
);

-- Enable RLS
ALTER TABLE bureau_membres ENABLE ROW LEVEL SECURITY;
ALTER TABLE bureau_elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE bureau_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies: bureau_membres
DROP POLICY IF EXISTS "bureau_membres_select" ON bureau_membres;
DROP POLICY IF EXISTS "bureau_membres_all_service" ON bureau_membres;
CREATE POLICY "bureau_membres_select" ON bureau_membres FOR SELECT TO authenticated USING (true);
CREATE POLICY "bureau_membres_all_service" ON bureau_membres FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies: bureau_elections
DROP POLICY IF EXISTS "bureau_elections_select" ON bureau_elections;
DROP POLICY IF EXISTS "bureau_elections_all_service" ON bureau_elections;
CREATE POLICY "bureau_elections_select" ON bureau_elections FOR SELECT TO authenticated USING (true);
CREATE POLICY "bureau_elections_all_service" ON bureau_elections FOR ALL TO service_role USING (true) WITH CHECK (true);

-- RLS Policies: bureau_votes
DROP POLICY IF EXISTS "bureau_votes_select" ON bureau_votes;
DROP POLICY IF EXISTS "bureau_votes_all_service" ON bureau_votes;
CREATE POLICY "bureau_votes_select" ON bureau_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "bureau_votes_all_service" ON bureau_votes FOR ALL TO service_role USING (true) WITH CHECK (true);
