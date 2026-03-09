-- =====================================================
-- Migration : Ajout de "Professeur Principal" à l'enum grade_role
-- Le code TypeScript mappe le rôle Discord Professeur Principal
-- mais la valeur n'existait pas dans l'enum PostgreSQL.
-- =====================================================

ALTER TYPE public.grade_role ADD VALUE IF NOT EXISTS 'Professeur Principal' AFTER 'Professeur';
