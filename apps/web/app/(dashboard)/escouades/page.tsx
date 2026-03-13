import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { CreateEscouadeButton } from "@/components/shared/create-escouade-modal";

export const metadata: Metadata = {
  title: "Escouades — GestionHokkaido",
  description: "Liste de toutes les escouades de l'École d'Exorcisme de Hokkaido.",
};

type EscouadeListRow = {
  id: string;
  nom: string;
  description: string | null;
  url_logo: string | null;
  points: number;
  proprietaire_id: string;
  utilisateurs: { pseudo: string } | null;
  membres_escouade: { utilisateur_id: string; utilisateurs: { points_personnels: number } | null }[];
};

export default async function EscouadesListPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/escouades");
  }

  // Vérifier si l'utilisateur est déjà dans une escouade
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: monEscouade } = await (supabase as any)
    .from("membres_escouade")
    .select("escouade_id")
    .eq("utilisateur_id", user.id)
    .limit(1)
    .single();

  const dejaMembreEscouade = !!monEscouade?.escouade_id;

  // Si pas de param ?list, rediriger vers l'escouade de l'utilisateur
  if (!params.list && dejaMembreEscouade) {
    redirect(`/escouades/${monEscouade.escouade_id}`);
  }

  // Escouades avec propriétaire et nb membres
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: _escouades } = await (supabase as any)
    .from("escouades")
    .select(`
      id, nom, description, url_logo, points, proprietaire_id,
      utilisateurs!escouades_proprietaire_id_fkey ( pseudo ),
      membres_escouade ( utilisateur_id, utilisateurs ( points_personnels ) )
    `)
    .order("points", { ascending: false });

  const allEscouades = ((_escouades ?? []) as EscouadeListRow[]).map((e) => {
    const sumPersonnels = (e.membres_escouade ?? []).reduce(
      (acc, m) => acc + (m.utilisateurs?.points_personnels ?? 0),
      0
    );
    return { ...e, points_totaux: sumPersonnels + e.points };
  });
  const escouades = allEscouades
    .filter((e) => (e.membres_escouade?.length ?? 0) >= 3)
    .sort((a, b) => b.points_totaux - a.points_totaux);
  const escouadesIncompletes = allEscouades.filter((e) => (e.membres_escouade?.length ?? 0) < 3);

  return (
    <div className="relative min-h-screen bg-[#0a0505] overflow-hidden">
      {/* Blobs */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 select-none">
        <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-red-700/15 blur-[120px]" />
        <div className="absolute -bottom-40 -right-16 w-[520px] h-[520px] rounded-full bg-orange-600/10 blur-[140px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-red-900/10 blur-[100px]" />
      </div>
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 opacity-[0.025]"
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundRepeat: "repeat",
          backgroundSize: "160px",
        }}
      />

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 animate-fade-in">
        {/* Header */}
        <header className="mb-10">
          <p className="text-xs text-white/25 uppercase tracking-widest mb-5 font-medium">
            École d&apos;Exorcisme de Hokkaido&nbsp;&nbsp;/&nbsp;&nbsp;Escouades
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">
                <span className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">Escouades</span>
              </h1>
              <p className="mt-2 text-sm text-white/40">
                {escouades.length} escouade{escouades.length !== 1 ? "s" : ""} enregistrée{escouades.length !== 1 ? "s" : ""}
              </p>
            </div>
            <CreateEscouadeButton dejaMembreEscouade={dejaMembreEscouade} />
          </div>
          <div className="mt-8 h-px bg-gradient-to-r from-red-500/30 via-white/10 to-transparent" />
        </header>

        {/* Cards grid */}
        {escouades.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-8 h-8 text-red-400/40">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c-4.5 1.8-8 3-8 9 0 5.4 4.8 9 8 9s8-3.6 8-9c0-6-3.5-7.2-8-9Z" />
              </svg>
            </div>
            <p className="text-white/30 text-sm">Aucune escouade n&apos;a encore été créée.</p>
            <p className="text-white/20 text-xs">Soyez le premier à en créer une !</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {escouades.map((escouade) => {
              const nbMembres = escouade.membres_escouade?.length ?? 0;
              const proprietaireNom = (escouade.utilisateurs as { pseudo: string } | null)?.pseudo ?? "Inconnu";

              return (
                <Link
                  key={escouade.id}
                  href={`/escouades/${escouade.id}`}
                  className="group relative overflow-hidden flex flex-col rounded-2xl bg-white/[0.02] ring-1 ring-white/8 hover:ring-red-500/30 hover:bg-white/[0.04] hover:scale-[1.01] transition-all duration-200"
                >
                  {/* Accent top */}
                  <div className="h-px w-full bg-gradient-to-r from-red-500/0 via-red-500/40 to-red-500/0 group-hover:via-red-500/70 transition-all" />

                  {/* Glow sur hover */}
                  <div className="absolute inset-0 rounded-2xl bg-red-500/0 group-hover:bg-red-500/[0.03] transition-all" />

                  <div className="relative p-5 flex-1 flex flex-col gap-4">
                    {/* Logo + Nom */}
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-red-500/10 ring-1 ring-red-400/20 flex items-center justify-center flex-shrink-0">
                        {escouade.url_logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={escouade.url_logo} alt={`Logo ${escouade.nom}`} className="object-cover w-full h-full" />
                        ) : (
                          <span className="text-lg font-bold text-red-300 uppercase">
                            {escouade.nom.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white truncate group-hover:text-red-300 transition-colors">
                          {escouade.nom}
                        </p>
                        <p className="text-xs text-white/35 truncate">
                          Chef : {proprietaireNom}
                        </p>
                      </div>
                    </div>

                    {/* Description */}
                    {escouade.description && (
                      <p className="text-xs text-white/40 line-clamp-2 leading-relaxed">
                        {escouade.description}
                      </p>
                    )}

                    {/* Stats */}
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-red-400">
                          <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm font-semibold text-red-300 font-mono">
                          {escouade.points_totaux.toLocaleString("fr-FR")} pts
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-white/30">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                          <path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM1.49 15.326a.78.78 0 0 1-.358-.442 3 3 0 0 1 4.308-3.516 6.484 6.484 0 0 0-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 0 1-2.07-.655ZM16.44 15.98a4.97 4.97 0 0 0 2.07-.654.78.78 0 0 0 .357-.442 3 3 0 0 0-4.308-3.517 6.484 6.484 0 0 1 1.907 3.96 2.32 2.32 0 0 1-.026.654ZM18 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM5.304 16.19a.844.844 0 0 1-.277-.71 5 5 0 0 1 9.947 0 .843.843 0 0 1-.277.71A6.975 6.975 0 0 1 10 18a6.974 6.974 0 0 1-4.696-1.81Z" />
                        </svg>
                        {nbMembres} membre{nbMembres !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Escouades incomplètes (< 3 membres) */}
        {escouadesIncompletes.length > 0 && (
          <section className="mt-12">
            <h2 className="text-xs text-white/30 uppercase tracking-widest font-medium mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-amber-400/50">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
              </svg>
              Escouades incomplètes
              <span className="text-white/20 normal-case">— minimum 3 membres requis pour être comptabilisée</span>
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {escouadesIncompletes.map((escouade) => {
                const nbMembres = escouade.membres_escouade?.length ?? 0;
                const proprietaireNom = (escouade.utilisateurs as { pseudo: string } | null)?.pseudo ?? "Inconnu";

                return (
                  <Link
                    key={escouade.id}
                    href={`/escouades/${escouade.id}`}
                    className="group relative overflow-hidden flex flex-col rounded-2xl bg-white/[0.015] ring-1 ring-amber-500/10 hover:ring-amber-500/25 hover:bg-white/[0.03] hover:scale-[1.01] transition-all duration-200 opacity-60 hover:opacity-80"
                  >
                    <div className="h-px w-full bg-gradient-to-r from-amber-500/0 via-amber-500/30 to-amber-500/0" />
                    <div className="relative p-5 flex-1 flex flex-col gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-amber-500/10 ring-1 ring-amber-400/20 flex items-center justify-center flex-shrink-0">
                          {escouade.url_logo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={escouade.url_logo} alt={`Logo ${escouade.nom}`} className="object-cover w-full h-full" />
                          ) : (
                            <span className="text-lg font-bold text-amber-300 uppercase">
                              {escouade.nom.charAt(0)}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white/70 truncate group-hover:text-amber-300 transition-colors">
                            {escouade.nom}
                          </p>
                          <p className="text-xs text-white/30 truncate">
                            Chef : {proprietaireNom}
                          </p>
                        </div>
                      </div>
                      <div className="mt-auto flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-amber-400/70 bg-amber-500/10 px-2 py-0.5 rounded-full">
                          {nbMembres}/3 membres
                        </span>
                        <span className="text-[10px] text-white/25">Non comptabilisée</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
