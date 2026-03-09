-- =====================================================
-- Migration V2 — Suppression du système multi-personnages
-- Fusion des champs personnage dans `utilisateurs`
-- Liaison directe escouade ↔ utilisateur
-- Ajout de la table `evaluations` (stats radar)
-- =====================================================

-- ─── 1. Ajouter les champs personnage dans `utilisateurs` ────────────────────

ALTER TABLE public.utilisateurs
  ADD COLUMN IF NOT EXISTS prenom_rp text,
  ADD COLUMN IF NOT EXISTS nom_rp text,
  ADD COLUMN IF NOT EXISTS sort_inne public.sorts_innes,
  ADD COLUMN IF NOT EXISTS specialite public.specialites,
  ADD COLUMN IF NOT EXISTS art_martial public.arts_martiaux,
  ADD COLUMN IF NOT EXISTS reliques text,
  ADD COLUMN IF NOT EXISTS sub_jutsu text,
  ADD COLUMN IF NOT EXISTS style_combat text;

-- ─── 2. Migrer les données existantes de personnages → utilisateurs ──────────
-- (Prend le personnage le plus récent de chaque utilisateur)

UPDATE public.utilisateurs u
SET
  sort_inne    = p.sort_inne,
  specialite   = p.specialite,
  art_martial  = p.art_martial,
  reliques     = p.reliques,
  sub_jutsu    = p.sub_jutsu
FROM (
  SELECT DISTINCT ON (utilisateur_id)
    utilisateur_id, sort_inne, specialite, art_martial, reliques, sub_jutsu
  FROM public.personnages
  ORDER BY utilisateur_id, cree_le DESC
) p
WHERE u.id = p.utilisateur_id;

-- ─── 3. Refaire membres_escouade → lien direct vers utilisateurs ─────────────

-- 3a. Créer la nouvelle table
CREATE TABLE IF NOT EXISTS public.membres_escouade_v2 (
  escouade_id uuid NOT NULL REFERENCES public.escouades(id) ON DELETE CASCADE,
  utilisateur_id uuid NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
  role_escouade public.roles_escouade NOT NULL DEFAULT 'membre',
  rejoint_le timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (escouade_id, utilisateur_id),
  -- Un utilisateur ne peut appartenir qu'à UNE seule escouade
  CONSTRAINT un_utilisateur_une_escouade UNIQUE (utilisateur_id)
);

-- 3b. Migrer les données (un seul enregistrement par utilisateur)
INSERT INTO public.membres_escouade_v2 (escouade_id, utilisateur_id, role_escouade, rejoint_le)
SELECT DISTINCT ON (p.utilisateur_id)
  me.escouade_id,
  p.utilisateur_id,
  me.role_escouade,
  me.rejoint_le
FROM public.membres_escouade me
JOIN public.personnages p ON p.id = me.personnage_id
ORDER BY p.utilisateur_id, me.rejoint_le ASC
ON CONFLICT DO NOTHING;

-- 3c. Supprimer l'ancienne table et renommer
DROP TABLE IF EXISTS public.membres_escouade CASCADE;
ALTER TABLE public.membres_escouade_v2 RENAME TO membres_escouade;

-- 3d. Re-créer les index
CREATE INDEX IF NOT EXISTS idx_membres_escouade_utilisateur_id ON public.membres_escouade(utilisateur_id);

-- ─── 4. Refaire invitations_escouade → lien direct vers utilisateurs ─────────

-- 4a. Créer la nouvelle table
CREATE TABLE IF NOT EXISTS public.invitations_escouade_v2 (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escouade_id uuid NOT NULL REFERENCES public.escouades(id) ON DELETE CASCADE,
  invite_par uuid NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
  utilisateur_id uuid NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
  statut public.statut_invitation NOT NULL DEFAULT 'en_attente',
  cree_le timestamptz NOT NULL DEFAULT now(),
  mis_a_jour_le timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invitations_v2_unique_pending UNIQUE (escouade_id, utilisateur_id)
);

-- 4b. Migrer les données
INSERT INTO public.invitations_escouade_v2 (id, escouade_id, invite_par, utilisateur_id, statut, cree_le, mis_a_jour_le)
SELECT DISTINCT ON (ie.escouade_id, p.utilisateur_id)
  ie.id,
  ie.escouade_id,
  ie.invite_par,
  p.utilisateur_id,
  ie.statut,
  ie.cree_le,
  ie.mis_a_jour_le
FROM public.invitations_escouade ie
JOIN public.personnages p ON p.id = ie.personnage_id
ORDER BY ie.escouade_id, p.utilisateur_id, ie.cree_le DESC
ON CONFLICT DO NOTHING;

-- 4c. Supprimer l'ancienne table et renommer
DROP TABLE IF EXISTS public.invitations_escouade CASCADE;
ALTER TABLE public.invitations_escouade_v2 RENAME TO invitations_escouade;

-- 4d. Re-créer les index
CREATE INDEX IF NOT EXISTS idx_invitations_utilisateur_id ON public.invitations_escouade(utilisateur_id);
CREATE INDEX IF NOT EXISTS idx_invitations_escouade_id ON public.invitations_escouade(escouade_id);
CREATE INDEX IF NOT EXISTS idx_invitations_statut ON public.invitations_escouade(statut);

-- ─── 5. Supprimer la table personnages (obsolète) ────────────────────────────

DROP TABLE IF EXISTS public.personnages CASCADE;

-- ─── 6. Triggers mis_a_jour_le pour la table invitations renommée ────────────

DROP TRIGGER IF EXISTS trg_invitations_mis_a_jour ON public.invitations_escouade;
CREATE TRIGGER trg_invitations_mis_a_jour
  BEFORE UPDATE ON public.invitations_escouade
  FOR EACH ROW EXECUTE FUNCTION public.trigger_mis_a_jour_le();

-- ─── 7. Créer la table evaluations (stats radar — profs/admins only) ─────────

CREATE TABLE IF NOT EXISTS public.evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  utilisateur_id uuid NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
  evaluateur_id uuid NOT NULL REFERENCES public.utilisateurs(id) ON DELETE CASCADE,
  energie_occulte smallint NOT NULL DEFAULT 0 CHECK (energie_occulte BETWEEN 0 AND 100),
  force_physique smallint NOT NULL DEFAULT 0 CHECK (force_physique BETWEEN 0 AND 100),
  agilite smallint NOT NULL DEFAULT 0 CHECK (agilite BETWEEN 0 AND 100),
  intelligence_tactique smallint NOT NULL DEFAULT 0 CHECK (intelligence_tactique BETWEEN 0 AND 100),
  maitrise_sort smallint NOT NULL DEFAULT 0 CHECK (maitrise_sort BETWEEN 0 AND 100),
  travail_equipe smallint NOT NULL DEFAULT 0 CHECK (travail_equipe BETWEEN 0 AND 100),
  commentaire text,
  cree_le timestamptz NOT NULL DEFAULT now(),
  mis_a_jour_le timestamptz NOT NULL DEFAULT now(),
  -- Un évaluateur ne peut évaluer un élève qu'une fois (mise à jour possible)
  CONSTRAINT evaluations_unique_pair UNIQUE (utilisateur_id, evaluateur_id)
);

CREATE INDEX IF NOT EXISTS idx_evaluations_utilisateur_id ON public.evaluations(utilisateur_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_evaluateur_id ON public.evaluations(evaluateur_id);

DROP TRIGGER IF EXISTS trg_evaluations_mis_a_jour ON public.evaluations;
CREATE TRIGGER trg_evaluations_mis_a_jour
  BEFORE UPDATE ON public.evaluations
  FOR EACH ROW EXECUTE FUNCTION public.trigger_mis_a_jour_le();

-- ─── 8. RLS pour evaluations ─────────────────────────────────────────────────

ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

-- Tout utilisateur authentifié peut voir les évaluations (pour afficher le radar)
DROP POLICY IF EXISTS evaluations_select ON public.evaluations;
CREATE POLICY evaluations_select
ON public.evaluations
FOR SELECT
TO authenticated
USING (true);

-- Seuls les profs et admins peuvent insérer
DROP POLICY IF EXISTS evaluations_insert ON public.evaluations;
CREATE POLICY evaluations_insert
ON public.evaluations
FOR INSERT
TO authenticated
WITH CHECK (public.est_professeur_ou_admin());

-- Seuls les profs et admins peuvent mettre à jour
DROP POLICY IF EXISTS evaluations_update ON public.evaluations;
CREATE POLICY evaluations_update
ON public.evaluations
FOR UPDATE
TO authenticated
USING (public.est_professeur_ou_admin())
WITH CHECK (public.est_professeur_ou_admin());

-- Seuls les admins peuvent supprimer
DROP POLICY IF EXISTS evaluations_delete ON public.evaluations;
CREATE POLICY evaluations_delete
ON public.evaluations
FOR DELETE
TO authenticated
USING (public.est_admin());

-- ─── 9. RLS pour les nouvelles tables membres_escouade & invitations ─────────

-- membres_escouade (recréée)
ALTER TABLE public.membres_escouade ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS membres_escouade_select ON public.membres_escouade;
CREATE POLICY membres_escouade_select
ON public.membres_escouade FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS membres_escouade_insert ON public.membres_escouade;
CREATE POLICY membres_escouade_insert
ON public.membres_escouade FOR INSERT TO authenticated
WITH CHECK (
  public.est_admin()
  OR EXISTS (SELECT 1 FROM public.escouades e WHERE e.id = escouade_id AND e.proprietaire_id = auth.uid())
  OR utilisateur_id = auth.uid()
);

DROP POLICY IF EXISTS membres_escouade_update ON public.membres_escouade;
CREATE POLICY membres_escouade_update
ON public.membres_escouade FOR UPDATE TO authenticated
USING (
  public.est_admin()
  OR EXISTS (SELECT 1 FROM public.escouades e WHERE e.id = escouade_id AND e.proprietaire_id = auth.uid())
)
WITH CHECK (
  public.est_admin()
  OR EXISTS (SELECT 1 FROM public.escouades e WHERE e.id = escouade_id AND e.proprietaire_id = auth.uid())
);

DROP POLICY IF EXISTS membres_escouade_delete ON public.membres_escouade;
CREATE POLICY membres_escouade_delete
ON public.membres_escouade FOR DELETE TO authenticated
USING (
  public.est_admin()
  OR EXISTS (SELECT 1 FROM public.escouades e WHERE e.id = escouade_id AND e.proprietaire_id = auth.uid())
  OR utilisateur_id = auth.uid()
);

-- invitations_escouade (recréée)
ALTER TABLE public.invitations_escouade ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS invitations_select ON public.invitations_escouade;
CREATE POLICY invitations_select
ON public.invitations_escouade FOR SELECT TO authenticated
USING (
  public.est_admin()
  OR EXISTS (SELECT 1 FROM public.escouades e WHERE e.id = escouade_id AND e.proprietaire_id = auth.uid())
  OR utilisateur_id = auth.uid()
  OR invite_par = auth.uid()
);

DROP POLICY IF EXISTS invitations_insert ON public.invitations_escouade;
CREATE POLICY invitations_insert
ON public.invitations_escouade FOR INSERT TO authenticated
WITH CHECK (
  public.est_admin()
  OR EXISTS (SELECT 1 FROM public.escouades e WHERE e.id = escouade_id AND e.proprietaire_id = auth.uid())
);

DROP POLICY IF EXISTS invitations_update ON public.invitations_escouade;
CREATE POLICY invitations_update
ON public.invitations_escouade FOR UPDATE TO authenticated
USING (
  public.est_admin()
  OR utilisateur_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.escouades e WHERE e.id = escouade_id AND e.proprietaire_id = auth.uid())
)
WITH CHECK (
  public.est_admin()
  OR utilisateur_id = auth.uid()
  OR EXISTS (SELECT 1 FROM public.escouades e WHERE e.id = escouade_id AND e.proprietaire_id = auth.uid())
);

DROP POLICY IF EXISTS invitations_delete ON public.invitations_escouade;
CREATE POLICY invitations_delete
ON public.invitations_escouade FOR DELETE TO authenticated
USING (
  public.est_admin()
  OR EXISTS (SELECT 1 FROM public.escouades e WHERE e.id = escouade_id AND e.proprietaire_id = auth.uid())
);

-- ─── 10. Grants ──────────────────────────────────────────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON public.evaluations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.membres_escouade TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitations_escouade TO authenticated;
