-- =====================================================
-- Migration V2: Conseil — Chef du Conseil, Propositions & Système de Vote
-- Chief election, council proposals with For/Against/Neutral,
-- 1-hour execution buffer, derank system with rank-up bans.
-- =====================================================

-- ─── 1. Ajouter colonne "est_chef" au conseil_membres ────────────────────────

ALTER TABLE public.conseil_membres
  ADD COLUMN IF NOT EXISTS est_chef BOOLEAN NOT NULL DEFAULT false;

-- Un seul chef à la fois
CREATE UNIQUE INDEX IF NOT EXISTS idx_conseil_un_seul_chef
  ON public.conseil_membres (est_chef) WHERE est_chef = true;

-- ─── 2. Table : élections du Chef du Conseil ─────────────────────────────────

CREATE TABLE IF NOT EXISTS public.conseil_elections_chef (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  statut          TEXT NOT NULL DEFAULT 'en_cours'
                    CHECK (statut IN ('en_cours', 'terminee', 'annulee')),
  debut           TIMESTAMPTZ NOT NULL DEFAULT now(),
  fin             TIMESTAMPTZ,
  elu_id          UUID REFERENCES public.utilisateurs(id),  -- winner, null until concluded
  cree_par        UUID NOT NULL REFERENCES public.utilisateurs(id),
  cree_le         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 3. Table : votes pour l'élection du Chef ────────────────────────────────

CREATE TABLE IF NOT EXISTS public.conseil_votes_chef (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id     UUID NOT NULL REFERENCES public.conseil_elections_chef(id) ON DELETE CASCADE,
  votant_id       UUID NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
  candidat_id     UUID NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
  cree_le         TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Chaque membre du conseil ne vote qu'une fois par élection du chef
  UNIQUE (election_id, votant_id)
);

-- ─── 4. Type ENUM pour le statut de proposition ──────────────────────────────

DO $$ BEGIN
  CREATE TYPE public.statut_proposition AS ENUM (
    'en_cours',     -- voting is active
    'validee',      -- majority FOR → 1h countdown started
    'refusee',      -- majority AGAINST → 1h countdown started
    'executee',     -- action executed after 1h
    'rejetee',      -- vote reversed during countdown → final reject
    'annulee'       -- cancelled by council
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.type_vote_proposition AS ENUM ('pour', 'contre', 'neutre');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.type_proposition AS ENUM (
    'general',      -- general council decision
    'derank'        -- propose to demote a user
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 5. Table : propositions du conseil ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.conseil_propositions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type            public.type_proposition NOT NULL DEFAULT 'general',
  titre           TEXT NOT NULL,
  description     TEXT,
  propose_par     UUID NOT NULL REFERENCES public.utilisateurs(id),
  statut          public.statut_proposition NOT NULL DEFAULT 'en_cours',
  -- For derank proposals
  cible_id        UUID REFERENCES public.utilisateurs(id),       -- target user for derank
  duree_ban_heures INTEGER CHECK (duree_ban_heures IS NULL OR (duree_ban_heures >= 1 AND duree_ban_heures <= 168)),
    -- max 168h = 1 week
  -- 1-hour execution buffer
  resolution_a    TIMESTAMPTZ,  -- when the vote reached majority (start of 1h buffer)
  execute_apres   TIMESTAMPTZ,  -- resolution_a + 1hour = when action fires
  -- Timestamps
  cree_le         TIMESTAMPTZ NOT NULL DEFAULT now(),
  mis_a_jour_le   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 6. Table : votes sur les propositions ───────────────────────────────────

CREATE TABLE IF NOT EXISTS public.conseil_votes_proposition (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposition_id  UUID NOT NULL REFERENCES public.conseil_propositions(id) ON DELETE CASCADE,
  votant_id       UUID NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
  vote            public.type_vote_proposition NOT NULL,
  cree_le         TIMESTAMPTZ NOT NULL DEFAULT now(),
  mis_a_jour_le   TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Chaque membre ne vote qu'une fois par proposition (mais peut modifier)
  UNIQUE (proposition_id, votant_id)
);

-- ─── 7. Table : bans de rank-up (suite à un derank approuvé) ────────────────

CREATE TABLE IF NOT EXISTS public.conseil_rankup_bans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  utilisateur_id  UUID NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
  proposition_id  UUID REFERENCES public.conseil_propositions(id),  -- source proposal
  interdit_jusqua TIMESTAMPTZ NOT NULL,   -- ban expiry
  leve_par        UUID REFERENCES public.utilisateurs(id),  -- director who lifted it (null if not lifted)
  leve_le         TIMESTAMPTZ,
  actif           BOOLEAN NOT NULL DEFAULT true,
  cree_le         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─── 8. Index ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_conseil_elections_chef_statut ON public.conseil_elections_chef(statut);
CREATE INDEX IF NOT EXISTS idx_conseil_votes_chef_election ON public.conseil_votes_chef(election_id);
CREATE INDEX IF NOT EXISTS idx_conseil_propositions_statut ON public.conseil_propositions(statut);
CREATE INDEX IF NOT EXISTS idx_conseil_votes_prop ON public.conseil_votes_proposition(proposition_id);
CREATE INDEX IF NOT EXISTS idx_conseil_rankup_bans_user ON public.conseil_rankup_bans(utilisateur_id) WHERE actif = true;

-- ─── 9. RLS ──────────────────────────────────────────────────────────────────

ALTER TABLE public.conseil_elections_chef ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conseil_votes_chef ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conseil_propositions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conseil_votes_proposition ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conseil_rankup_bans ENABLE ROW LEVEL SECURITY;

-- Elections chef: lecture publique
CREATE POLICY "elections_chef_select" ON public.conseil_elections_chef
  FOR SELECT USING (true);
CREATE POLICY "elections_chef_insert" ON public.conseil_elections_chef
  FOR INSERT WITH CHECK (public.est_professeur_ou_admin());
CREATE POLICY "elections_chef_update" ON public.conseil_elections_chef
  FOR UPDATE USING (public.est_professeur_ou_admin());

-- Votes chef: lecture publique, insert si conseil member
CREATE POLICY "votes_chef_select" ON public.conseil_votes_chef
  FOR SELECT USING (true);
CREATE POLICY "votes_chef_insert" ON public.conseil_votes_chef
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.conseil_membres WHERE utilisateur_id = auth.uid())
  );
CREATE POLICY "votes_chef_update" ON public.conseil_votes_chef
  FOR UPDATE USING (
    votant_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.conseil_membres WHERE utilisateur_id = auth.uid())
  );

-- Propositions: lecture publique (statut visible), insert/update si conseil
CREATE POLICY "propositions_select" ON public.conseil_propositions
  FOR SELECT USING (true);
CREATE POLICY "propositions_insert" ON public.conseil_propositions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.conseil_membres WHERE utilisateur_id = auth.uid())
  );
CREATE POLICY "propositions_update" ON public.conseil_propositions
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.conseil_membres WHERE utilisateur_id = auth.uid())
    OR public.est_professeur_ou_admin()
  );

-- Votes proposition: read public, insert/update if conseil
CREATE POLICY "votes_proposition_select" ON public.conseil_votes_proposition
  FOR SELECT USING (true);
CREATE POLICY "votes_proposition_insert" ON public.conseil_votes_proposition
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.conseil_membres WHERE utilisateur_id = auth.uid())
  );
CREATE POLICY "votes_proposition_update" ON public.conseil_votes_proposition
  FOR UPDATE USING (
    votant_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.conseil_membres WHERE utilisateur_id = auth.uid())
  );

-- Rank-up bans: lecture publique, gestion admin
CREATE POLICY "rankup_bans_select" ON public.conseil_rankup_bans
  FOR SELECT USING (true);
CREATE POLICY "rankup_bans_insert" ON public.conseil_rankup_bans
  FOR INSERT WITH CHECK (public.est_professeur_ou_admin()
    OR EXISTS (SELECT 1 FROM public.conseil_membres WHERE utilisateur_id = auth.uid()));
CREATE POLICY "rankup_bans_update" ON public.conseil_rankup_bans
  FOR UPDATE USING (public.est_professeur_ou_admin());
