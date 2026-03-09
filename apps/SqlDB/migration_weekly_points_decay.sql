-- =====================================================
-- Migration : Décroissance hebdomadaire des points d'escouade
-- Chaque semaine, toutes les escouades perdent 50 % de leurs
-- points accumulés (arrondi vers zéro).
-- La fonction est appelée par le cron Vercel /api/cron/decay-points.
-- =====================================================

-- Fonction SQL appelable par le service_role via rpc()
-- ⚠️  RESET PROTECTION : cette fonction ne touche QUE la table escouades.
--    Elle ne doit JAMAIS modifier utilisateurs.logistics_points ni
--    utilisateurs.points_personnels. Les logistics_points sont immutables
--    vis-à-vis des purges/décroissances périodiques.
create or replace function public.appliquer_decroissance_points_escouade()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  nb_updated integer;
begin
  -- N.B. : seuls les points d'escouade sont concernés.
  -- utilisateurs.logistics_points ne doit JAMAIS être réinitialisé ici.
  update public.escouades
  set points = trunc(points::numeric / 2)::integer
  where points <> 0;

  get diagnostics nb_updated = row_count;
  return nb_updated;
end;
$$;
