import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Classement Personnel — GestionHokkaido",
  description: "Classement personnel des exorcistes de l'École d'Exorcisme de Hokkaido.",
};

export default async function ClassementPersonnelPage() {
  const admin = await createAdminClient();

  const MIN_POINTS_SOLO = 150;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: _perso } = await (admin as any)
    .from("utilisateurs")
    .select("id, pseudo, avatar_url, prenom_rp, nom_rp, clan, points_personnels")
    .gt("points_personnels", 0)
    .order("points_personnels", { ascending: false });

  type PersonnelRow = {
    id: string;
    pseudo: string;
    avatar_url: string | null;
    prenom_rp: string | null;
    nom_rp: string | null;
    clan: string | null;
    points_personnels: number;
  };

  const allPerso = (_perso ?? []) as PersonnelRow[];
  const topPerso = allPerso.filter((u) => u.points_personnels >= MIN_POINTS_SOLO);
  const horsClassement = allPerso.filter((u) => u.points_personnels < MIN_POINTS_SOLO);

  return (
    <>
      <h2 className="text-xl font-bold text-white mb-1">
        Classement{" "}
        <span className="bg-gradient-to-r from-red-400 to-rose-400 bg-clip-text text-transparent">
          Personnel
        </span>
      </h2>
      <p className="text-sm text-white/40 mb-8">
        Points accumulés individuellement lors des missions. Le 1er obtient un siège au Conseil (après 24h en 1ère position).
      </p>

      {topPerso.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-white/30 text-sm">Aucun point personnel attribué pour l&apos;instant.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {topPerso.map((u, idx) => {
            const rank = idx + 1;
            const displayName = u.prenom_rp && u.nom_rp ? `${u.prenom_rp} ${u.nom_rp}` : u.pseudo;
            const isFirst = rank === 1;

            return (
              <div
                key={u.id}
                className={`flex items-center gap-4 p-4 rounded-xl ring-1 transition-all ${
                  isFirst
                    ? "bg-red-500/[0.07] ring-red-500/30"
                    : "bg-white/[0.02] ring-white/5"
                }`}
              >
                {/* Rang */}
                <div className="flex-shrink-0 w-8 text-center">
                  {isFirst ? (
                    <span className="text-lg">🔴</span>
                  ) : (
                    <span className="text-sm font-mono text-white/25">{rank}</span>
                  )}
                </div>

                {/* Avatar */}
                <div className="w-10 h-10 rounded-full overflow-hidden bg-white/5 ring-1 ring-white/10 flex items-center justify-center flex-shrink-0">
                  {u.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u.avatar_url} alt={u.pseudo} className="object-cover w-full h-full" />
                  ) : (
                    <span className="text-sm font-bold text-white/30 uppercase">{u.pseudo.charAt(0)}</span>
                  )}
                </div>

                {/* Nom + clan */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-semibold truncate text-sm ${isFirst ? "text-red-300" : "text-white/80"}`}>
                      {displayName}
                    </span>
                    {u.clan && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 ring-1 ring-rose-400/15 font-semibold whitespace-nowrap">
                        {u.clan}
                      </span>
                    )}
                    {isFirst && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-300 ring-1 ring-red-400/20 font-semibold whitespace-nowrap">
                        Siège Conseil
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-white/30 mt-0.5">{u.pseudo}</p>
                </div>

                {/* Points */}
                <div className="text-right flex-shrink-0">
                  <span className={`tabular-nums font-bold text-base ${isFirst ? "text-red-300" : "text-red-300"}`}>
                    {u.points_personnels.toLocaleString("fr-FR")}
                  </span>
                  <p className="text-[10px] text-white/25 uppercase tracking-wide">pts</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Joueurs hors classement (< 150 pts) ───────────────────── */}
      {horsClassement.length > 0 && (
        <section className="mt-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-white/5" />
            <h2 className="text-xs text-white/20 uppercase tracking-widest font-medium">
              Hors classement&nbsp;&nbsp;·&nbsp;&nbsp;{MIN_POINTS_SOLO} pts min. requis
            </h2>
            <div className="h-px flex-1 bg-white/5" />
          </div>
          <div className="space-y-2 opacity-60">
            {horsClassement.map((u) => {
              const displayName = u.prenom_rp && u.nom_rp ? `${u.prenom_rp} ${u.nom_rp}` : u.pseudo;

              return (
                <div
                  key={u.id}
                  className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.015] ring-1 ring-white/[0.03] transition-all"
                >
                  <div className="flex-shrink-0 w-8 text-center">
                    <span className="text-sm font-mono text-white/15">—</span>
                  </div>

                  <div className="w-10 h-10 rounded-full overflow-hidden bg-white/5 ring-1 ring-white/10 flex items-center justify-center flex-shrink-0">
                    {u.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.avatar_url} alt={u.pseudo} className="object-cover w-full h-full" />
                    ) : (
                      <span className="text-sm font-bold text-white/30 uppercase">{u.pseudo.charAt(0)}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold truncate text-sm text-white/50">
                        {displayName}
                      </span>
                      {u.clan && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-300/50 ring-1 ring-rose-400/10 font-semibold whitespace-nowrap">
                          {u.clan}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/20 mt-0.5">{u.pseudo}</p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="tabular-nums font-bold text-sm text-white/30">
                      {u.points_personnels.toLocaleString("fr-FR")}
                    </span>
                    <p className="text-[10px] text-white/15 uppercase tracking-wide">pts</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </>
  );
}
