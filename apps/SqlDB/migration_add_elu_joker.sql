-- =====================================================
-- Migration : Ajout de "elu_joker" à l'enum type_siege_conseil
-- L'enum a pu être créé sans cette valeur si elle existait déjà
-- partiellement. Cette commande est idempotente (IF NOT EXISTS).
-- =====================================================

ALTER TYPE public.type_siege_conseil ADD VALUE IF NOT EXISTS 'elu_joker';
