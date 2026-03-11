-- Migration : table pour bloquer les votes annulés (on ne peut plus re-voter pour le même candidat)
-- Date : 2026-03-10

-- ─── Table : votes bloqués (annulation définitive) ───────────────────────────

CREATE TABLE IF NOT EXISTS public.votes_conseil_bloques (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id UUID NOT NULL REFERENCES public.elections_conseil(id) ON DELETE CASCADE,
  votant_id   UUID NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
  candidat_id UUID NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
  cree_le     TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Un votant ne peut bloquer qu'une fois par candidat par élection
  UNIQUE (election_id, votant_id, candidat_id)
);

CREATE INDEX IF NOT EXISTS idx_votes_conseil_bloques_election ON public.votes_conseil_bloques(election_id);
CREATE INDEX IF NOT EXISTS idx_votes_conseil_bloques_votant ON public.votes_conseil_bloques(votant_id);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.votes_conseil_bloques ENABLE ROW LEVEL SECURITY;

CREATE POLICY "votes_conseil_bloques_select" ON public.votes_conseil_bloques
  FOR SELECT USING (true);

CREATE POLICY "votes_conseil_bloques_insert" ON public.votes_conseil_bloques
  FOR INSERT WITH CHECK (public.est_professeur_ou_admin());

CREATE POLICY "votes_conseil_bloques_delete" ON public.votes_conseil_bloques
  FOR DELETE USING (public.est_professeur_ou_admin());
