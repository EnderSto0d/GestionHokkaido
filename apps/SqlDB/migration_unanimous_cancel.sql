-- =====================================================
-- Migration : Votes d'annulation d'une élection du conseil
--
-- Règles d'annulation :
--   1. Directeur / Co-Directeur / Admin → annulation immédiate (forceAnnulerElection)
--   2. Unanimité des Professeurs Principaux → annulation (forceAnnulerElectionPP)
--   3. 75 % des profs/admins votent → annulation (voterAnnulationElection)
--
-- Tables :
--   - votes_annulation_election     → votes 75 % (cas 3)
--   - votes_annulation_election_pp  → confirmations PP (cas 2)
-- Les Directeurs/Admins utilisent un bouton dédié (cas 1, sans table).
-- Les PP peuvent voter sur les DEUX pistes indépendamment.
-- =====================================================

-- ─── 1. Table de votes d'annulation (75 %) ──────────────────────────────────

CREATE TABLE IF NOT EXISTS public.votes_annulation_election (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id     UUID NOT NULL REFERENCES public.elections_conseil(id) ON DELETE CASCADE,
  votant_id       UUID NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
  vote_le         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (election_id, votant_id)
);

CREATE INDEX IF NOT EXISTS idx_votes_annulation_election
  ON public.votes_annulation_election(election_id);

ALTER TABLE public.votes_annulation_election ENABLE ROW LEVEL SECURITY;

CREATE POLICY "votes_annulation_select" ON public.votes_annulation_election
  FOR SELECT USING (true);
CREATE POLICY "votes_annulation_insert" ON public.votes_annulation_election
  FOR INSERT WITH CHECK (
    public.est_professeur_ou_admin()
  );
CREATE POLICY "votes_annulation_delete" ON public.votes_annulation_election
  FOR DELETE USING (
    votant_id = auth.uid()
    AND public.est_professeur_ou_admin()
  );

-- ─── 2. Table de confirmations PP (unanimité) ───────────────────────────────

CREATE TABLE IF NOT EXISTS public.votes_annulation_election_pp (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id     UUID NOT NULL REFERENCES public.elections_conseil(id) ON DELETE CASCADE,
  votant_id       UUID NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
  vote_le         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (election_id, votant_id)
);

CREATE INDEX IF NOT EXISTS idx_votes_annulation_election_pp
  ON public.votes_annulation_election_pp(election_id);

ALTER TABLE public.votes_annulation_election_pp ENABLE ROW LEVEL SECURITY;

CREATE POLICY "votes_annulation_pp_select" ON public.votes_annulation_election_pp
  FOR SELECT USING (true);
CREATE POLICY "votes_annulation_pp_insert" ON public.votes_annulation_election_pp
  FOR INSERT WITH CHECK (
    public.est_professeur_ou_admin()
  );
CREATE POLICY "votes_annulation_pp_delete" ON public.votes_annulation_election_pp
  FOR DELETE USING (
    votant_id = auth.uid()
    AND public.est_professeur_ou_admin()
  );
