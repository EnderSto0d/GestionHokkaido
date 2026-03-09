-- =====================================================
-- Migration : Support multi-divisions par utilisateur
-- Un utilisateur peut appartenir à plusieurs divisions
-- avec un rôle (membre ou superviseur) dans chacune.
-- =====================================================

-- ─── 1. Nouveau type ENUM : rôle au sein d'une division ─────────────────────

DO $$ BEGIN
  CREATE TYPE public.role_division AS ENUM ('membre', 'superviseur');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 2. Table de jonction : utilisateur ↔ divisions ─────────────────────────

CREATE TABLE IF NOT EXISTS public.utilisateur_divisions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  utilisateur_id  UUID NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
  division        public.divisions NOT NULL,
  role_division   public.role_division NOT NULL DEFAULT 'membre',
  cree_le         TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Un utilisateur ne peut avoir qu'un seul rôle par division
  -- (s'il est superviseur, il n'est pas aussi "membre" en doublon)
  UNIQUE (utilisateur_id, division, role_division)
);

-- ─── 3. Index pour requêtes fréquentes ──────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_utilisateur_divisions_user
  ON public.utilisateur_divisions(utilisateur_id);

CREATE INDEX IF NOT EXISTS idx_utilisateur_divisions_division
  ON public.utilisateur_divisions(division);

-- ─── 4. Migrer les données existantes ────────────────────────────────────────
-- Copier la division existante comme rôle "membre" dans la nouvelle table

INSERT INTO public.utilisateur_divisions (utilisateur_id, division, role_division)
SELECT id, division, 'membre'
FROM public.utilisateurs
WHERE division IS NOT NULL
ON CONFLICT (utilisateur_id, division, role_division) DO NOTHING;

-- ─── 5. RLS ──────────────────────────────────────────────────────────────────

ALTER TABLE public.utilisateur_divisions ENABLE ROW LEVEL SECURITY;

-- Lecture publique (tout le monde peut voir les divisions des utilisateurs)
CREATE POLICY "utilisateur_divisions_select" ON public.utilisateur_divisions
  FOR SELECT USING (true);

-- Insert : admin/prof ou l'utilisateur lui-même (via sync Discord)
CREATE POLICY "utilisateur_divisions_insert" ON public.utilisateur_divisions
  FOR INSERT WITH CHECK (
    utilisateur_id = auth.uid()
    OR public.est_professeur_ou_admin()
  );

-- Update : admin/prof ou l'utilisateur lui-même
CREATE POLICY "utilisateur_divisions_update" ON public.utilisateur_divisions
  FOR UPDATE USING (
    utilisateur_id = auth.uid()
    OR public.est_professeur_ou_admin()
  );

-- Delete : admin/prof ou l'utilisateur lui-même (pour sync)
CREATE POLICY "utilisateur_divisions_delete" ON public.utilisateur_divisions
  FOR DELETE USING (
    utilisateur_id = auth.uid()
    OR public.est_professeur_ou_admin()
  );

-- ─── 6. Note ─────────────────────────────────────────────────────────────────
-- L'ancienne colonne `utilisateurs.division` est conservée pour rétrocompatibilité
-- mais ne sera plus utilisée par le code applicatif.
-- Elle pourra être supprimée dans une migration future une fois la transition terminée.
-- ALTER TABLE public.utilisateurs DROP COLUMN IF EXISTS division;
