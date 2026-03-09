-- =====================================================
-- Migration : Ajout grades Discord, divisions, rôles
-- À exécuter sur une base existante pour mettre à jour le schéma.
-- =====================================================

-- 1. Supprimer "Rock'n'Roll" de l'enum sorts_innes
-- Note : PostgreSQL ne supporte pas nativement DROP VALUE d'un enum.
-- Il faut recréer le type. Cette migration suppose qu'aucune ligne n'utilise "Rock'n'Roll".
-- Si des rows existent, il faut d'abord les migrer (UPDATE personnages SET sort_inne = 'Altération Absolue' WHERE sort_inne = 'Rock''n''Roll';)

-- 2. Créer les nouveaux types ENUM
DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'grade_role') THEN
		CREATE TYPE public.grade_role AS ENUM (
			'Élève Exorciste',
			'Exorciste Pro',
			'Professeur',
			'Co-Directeur',
			'Directeur'
		);
	END IF;

	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'grade_secondaire') THEN
		CREATE TYPE public.grade_secondaire AS ENUM (
			'Seconde',
			'Première',
			'Terminal'
		);
	END IF;

	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'divisions') THEN
		CREATE TYPE public.divisions AS ENUM (
			'Judiciaire',
			'Médical',
			'Académie',
			'Scientifique',
			'Disciplinaire',
			'Stratégie',
			'Diplomatie'
		);
	END IF;
END
$$;

-- 3. Mettre à jour l'enum grades (supprimer les anciennes valeurs combinées, ajouter les nouvelles)
-- PostgreSQL ne permet pas de renommer ou supprimer des valeurs enum facilement.
-- Solution : recréer le type.

-- 3a. Sauvegarder les données existantes
ALTER TABLE public.personnages ALTER COLUMN grade TYPE text;

-- 3b. Supprimer l'ancien type et recréer
DROP TYPE IF EXISTS public.grades;
CREATE TYPE public.grades AS ENUM (
	'Classe 4',
	'Classe 3',
	'Semi Classe 2',
	'Classe 2',
	'Semi Classe 1',
	'Classe 1',
	'Semi Classe S',
	'Classe S',
	'Classe Apo'
);

-- 3c. Migrer les anciennes valeurs vers les nouvelles
UPDATE public.personnages SET grade = 'Classe 4' WHERE grade = 'Classe 4 / Seconde';
UPDATE public.personnages SET grade = 'Classe 3' WHERE grade = 'Classe 3 / Première';
UPDATE public.personnages SET grade = 'Semi Classe 2' WHERE grade = 'Semi Classe 2 / Terminal';
UPDATE public.personnages SET grade = 'Classe 2' WHERE grade = 'Classe 2 / Exo Pro';
UPDATE public.personnages SET grade = 'Classe Apo' WHERE grade = 'Semi Classe Apo';
-- Les grades "Semi Classe 1", "Classe 1", "Semi Classe S", "Classe S", "Classe Apo" restent inchangés.

-- 3d. Reconvertir la colonne au type enum
ALTER TABLE public.personnages ALTER COLUMN grade TYPE public.grades USING grade::public.grades;

-- 4. Supprimer Rock'n'Roll de sorts_innes
ALTER TABLE public.personnages ALTER COLUMN sort_inne TYPE text;
UPDATE public.personnages SET sort_inne = 'Altération Absolue' WHERE sort_inne = 'Rock''n''Roll';
DROP TYPE IF EXISTS public.sorts_innes;
CREATE TYPE public.sorts_innes AS ENUM (
	'Altération Absolue',
	'Animaux Fantastiques',
	'Boogie Woogie',
	'Bourrasque',
	'Clonage',
	'Corbeau',
	'Givre',
	'Intervalle',
	'Jardin Floral',
	'Venin',
	'Projection Occulte',
	'Rage Volcanique'
);
ALTER TABLE public.personnages ALTER COLUMN sort_inne TYPE public.sorts_innes USING sort_inne::public.sorts_innes;

-- 5. Ajouter les nouvelles colonnes à utilisateurs
ALTER TABLE public.utilisateurs ADD COLUMN IF NOT EXISTS grade public.grades;
ALTER TABLE public.utilisateurs ADD COLUMN IF NOT EXISTS grade_role public.grade_role;
ALTER TABLE public.utilisateurs ADD COLUMN IF NOT EXISTS grade_secondaire public.grade_secondaire;
ALTER TABLE public.utilisateurs ADD COLUMN IF NOT EXISTS division public.divisions;

-- Terminé !
-- Les grades et divisions seront automatiquement synchronisés lors de la prochaine connexion Discord.
