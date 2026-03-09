-- =====================================================
-- Migration: Conseil des Élèves (7 sièges)
-- 5 élus par les top 3 escouades, 2 Jokers nommés par le staff
-- =====================================================

-- ─── Types énumérés ──────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE public.type_siege_conseil AS ENUM ('elu_eleve', 'elu_joker');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.statut_election AS ENUM ('en_cours', 'terminee', 'annulee');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Table : membres actuels du conseil ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.conseil_membres (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  utilisateur_id UUID NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
  type_siege  public.type_siege_conseil NOT NULL,
  elu_le      TIMESTAMPTZ NOT NULL DEFAULT now(),
  cree_le     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (utilisateur_id)  -- un utilisateur ne peut occuper qu'un siège
);

-- ─── Table : sessions d'élection ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.elections_conseil (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        public.type_siege_conseil NOT NULL,  -- 'elu_eleve' ou 'elu_joker'
  statut      public.statut_election NOT NULL DEFAULT 'en_cours',
  nb_sieges   INTEGER NOT NULL DEFAULT 5,          -- 5 pour élèves, 2 pour staff
  debut       TIMESTAMPTZ NOT NULL DEFAULT now(),
  fin         TIMESTAMPTZ,
  cree_par    UUID NOT NULL REFERENCES public.utilisateurs(id),
  cree_le     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contraintes
ALTER TABLE public.elections_conseil
  ADD CONSTRAINT elections_conseil_nb_sieges_check
  CHECK (nb_sieges > 0 AND nb_sieges <= 7);

-- ─── Table : votes individuels ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.votes_conseil (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id UUID NOT NULL REFERENCES public.elections_conseil(id) ON DELETE CASCADE,
  votant_id   UUID NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
  candidat_id UUID NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
  cree_le     TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Un votant ne vote qu'une fois par candidat par élection
  UNIQUE (election_id, votant_id, candidat_id)
);

-- Index pour requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_votes_conseil_election ON public.votes_conseil(election_id);
CREATE INDEX IF NOT EXISTS idx_votes_conseil_candidat ON public.votes_conseil(candidat_id);
CREATE INDEX IF NOT EXISTS idx_conseil_membres_utilisateur ON public.conseil_membres(utilisateur_id);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.conseil_membres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.elections_conseil ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes_conseil ENABLE ROW LEVEL SECURITY;

-- Lecture publique pour les membres du conseil
CREATE POLICY "conseil_membres_select" ON public.conseil_membres
  FOR SELECT USING (true);

-- Seuls les admins/profs peuvent INSERT/UPDATE/DELETE sur conseil_membres
CREATE POLICY "conseil_membres_insert" ON public.conseil_membres
  FOR INSERT WITH CHECK (public.est_professeur_ou_admin());

CREATE POLICY "conseil_membres_update" ON public.conseil_membres
  FOR UPDATE USING (public.est_professeur_ou_admin());

CREATE POLICY "conseil_membres_delete" ON public.conseil_membres
  FOR DELETE USING (public.est_professeur_ou_admin());

-- Élections : lecture publique, gestion staff
CREATE POLICY "elections_conseil_select" ON public.elections_conseil
  FOR SELECT USING (true);

CREATE POLICY "elections_conseil_insert" ON public.elections_conseil
  FOR INSERT WITH CHECK (public.est_professeur_ou_admin());

CREATE POLICY "elections_conseil_update" ON public.elections_conseil
  FOR UPDATE USING (public.est_professeur_ou_admin());

-- Votes : chacun voit les siens, insert si authentifié
CREATE POLICY "votes_conseil_select" ON public.votes_conseil
  FOR SELECT USING (true);

CREATE POLICY "votes_conseil_insert" ON public.votes_conseil
  FOR INSERT WITH CHECK (auth.uid() = votant_id);
