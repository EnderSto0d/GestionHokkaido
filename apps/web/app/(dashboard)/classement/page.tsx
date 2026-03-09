import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Classement des Escouades — GestionHokkaido",
  description: "Classement public des escouades de l'École d'Exorcisme de Hokkaido.",
};

type MembreWithPoints = {
  utilisateur_id: string;
  utilisateurs: { points_personnels: number } | null;
};

type EscouadeClassementRow = {
  id: string;
  nom: string;
  url_logo: string | null;
  points: number;
  description: string | null;
  membres_escouade: MembreWithPoints[];
};

type EscouadeAvecTotal = EscouadeClassementRow & { points_totaux: number };

// ─── Médailles SVG ────────────────────────────────────────────────────────────

function MedailleOr() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8">
      <circle cx="12" cy="12" r="10" fill="#f59e0b" opacity="0.2" />
      <circle cx="12" cy="12" r="8" fill="#f59e0b" opacity="0.15" />
      <text x="12" y="17" textAnchor="middle" fontSize="13" fill="#fbbf24">🥇</text>
    </svg>
  );
}

// ─── Logo escouade ────────────────────────────────────────────────────────────

function LogoEscouade({ url, nom, size = "md" }: { url: string | null; nom: string; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "w-10 h-10 text-sm", md: "w-14 h-14 text-base", lg: "w-20 h-20 text-xl" };
  return (
    <div className={`${sizes[size]} rounded-xl overflow-hidden bg-white/5 ring-1 ring-white/10 flex items-center justify-center flex-shrink-0`}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={`Logo ${nom}`} className="object-cover w-full h-full" />
      ) : (
        <span className={`font-bold text-white/30 uppercase ${sizes[size].split(" ")[2]}`}>
          {nom.charAt(0)}
        </span>
      )}
    </div>
  );
}

export default async function ClassementPage() {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: _escouades } = await (supabase as any)
    .from("escouades")
    .select("id, nom, url_logo, points, description, membres_escouade(utilisateur_id, utilisateurs(points_personnels))")
    .order("points", { ascending: false });

  // Calculer Points totaux = sum(members' points_personnels) + escouade.points
  const escouadesAvecTotal: EscouadeAvecTotal[] = ((_escouades ?? []) as EscouadeClassementRow[])
    .filter((e) => (e.membres_escouade?.length ?? 0) >= 3)
    .map((e) => {
      const sumPersonnels = (e.membres_escouade ?? []).reduce(
        (acc, m) => acc + (m.utilisateurs?.points_personnels ?? 0),
        0
      );
      return { ...e, points_totaux: sumPersonnels + e.points };
    })
    .sort((a, b) => b.points_totaux - a.points_totaux);

  // Minimum 350 pts totaux pour figurer dans le top
  const MIN_POINTS_ESCOUADE = 350;
  const topEscouades = escouadesAvecTotal.filter((e) => e.points_totaux >= MIN_POINTS_ESCOUADE);
  const horsClassement = escouadesAvecTotal.filter((e) => e.points_totaux < MIN_POINTS_ESCOUADE);

  const top3 = topEscouades.slice(0, 3);
  const reste = topEscouades.slice(3);
  const maxPoints = topEscouades[0]?.points_totaux ?? 1;

  const podiumOrder = top3.length >= 2
    ? [top3[1], top3[0], top3[2]] // 2nd, 1st, 3rd (visual podium order)
    : top3.length === 1
    ? [undefined, top3[0], undefined] // single squad → center (1st)
    : top3;

  const podiumConfig = [
    { rank: 2, medal: "🥈", glow: "bg-slate-400/10", ring: "ring-slate-400/30", text: "text-slate-300", height: "h-24", rankLabel: "2ème" },
    { rank: 1, medal: "🥇", glow: "bg-amber-400/15", ring: "ring-amber-400/40", text: "text-amber-300", height: "h-32", rankLabel: "1er" },
    { rank: 3, medal: "🥉", glow: "bg-amber-700/10", ring: "ring-amber-700/30", text: "text-amber-600", height: "h-20", rankLabel: "3ème" },
  ];

  return (
    <>
      <h2 className="text-xl font-bold text-white mb-1">
        Classement des{" "}
        <span className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
          Escouades
        </span>
      </h2>
      <p className="text-sm text-white/40 mb-8">
        Les escouades sont classées par <strong className="text-white/60">Points totaux</strong> = somme des points personnels des membres + points d&apos;escouade.
      </p>

        {escouadesAvecTotal.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-8 h-8 text-red-400/40">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0" />
              </svg>
            </div>
            <p className="text-white/30 text-sm">Aucune escouade n&apos;a encore été créée.</p>
          </div>
        ) : (
          <>
            {/* ── Podium top 3 ──────────────────────────────────────────── */}
            {top3.length > 0 && (
              <section className="mb-12">
                <div className="flex items-end justify-center gap-3 sm:gap-6">
                  {podiumOrder.map((escouade, visualIdx) => {
                    if (!escouade) return null;
                    const cfg = podiumConfig[visualIdx];
                    const realIdx = top3.indexOf(escouade);
                    const nbMembres = escouade.membres_escouade?.length ?? 0;

                    return (
                      <Link
                        key={escouade.id}
                        href={`/escouades/${escouade.id}`}
                        className={`group flex flex-col items-center gap-3 flex-1 max-w-[200px] transition-transform hover:-translate-y-1`}
                      >
                        {/* Médaille */}
                        <span className="text-3xl sm:text-4xl">{cfg.medal}</span>

                        {/* Card */}
                        <div className={`relative w-full p-4 rounded-2xl bg-white/[0.03] ${cfg.ring} ring-1 flex flex-col items-center gap-2 text-center`}>
                          {/* Glow */}
                          <div className={`absolute inset-0 rounded-2xl ${cfg.glow} blur-xl -z-10`} />

                          <LogoEscouade url={escouade.url_logo} nom={escouade.nom} size={realIdx === 0 ? "lg" : "md"} />

                          <p className={`font-bold text-white text-sm sm:text-base leading-tight mt-1 line-clamp-2 group-hover:${cfg.text} transition-colors`}>
                            {escouade.nom}
                          </p>

                          <div className={`font-mono text-xl sm:text-2xl font-bold ${cfg.text}`}>
                            {escouade.points_totaux.toLocaleString("fr-FR")}
                            <span className="text-xs ml-1 opacity-60">pts totaux</span>
                          </div>

                          <p className="text-[10px] text-white/30">
                            {nbMembres} membre{nbMembres !== 1 ? "s" : ""}
                          </p>
                        </div>

                        {/* Podium stand */}
                        <div className={`w-full ${cfg.height} rounded-t-lg ${cfg.glow.replace("bg-", "bg-").replace("/10", "/20").replace("/15", "/25")} ring-1 ${cfg.ring.replace("/30", "/20").replace("/40", "/30")}`} />
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ── Liste 4ème+ ───────────────────────────────────────────── */}
            {reste.length > 0 && (
              <section>
                <h2 className="text-xs text-white/30 uppercase tracking-widest font-medium mb-4">
                  Suite du classement
                </h2>
                <div className="space-y-2">
                  {reste.map((escouade, idx) => {
                    const rank = idx + 4;
                    const nbMembres = escouade.membres_escouade?.length ?? 0;
                    const progressPct = maxPoints > 0 ? Math.round((escouade.points_totaux / maxPoints) * 100) : 0;

                    return (
                      <Link
                        key={escouade.id}
                        href={`/escouades/${escouade.id}`}
                        className="group flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] ring-1 ring-white/5 hover:bg-white/[0.04] hover:ring-red-500/15 transition-all"
                      >
                        {/* Rang */}
                        <div className="flex-shrink-0 w-8 text-center">
                          <span className="text-sm font-mono text-white/25">{rank}</span>
                        </div>

                        <LogoEscouade url={escouade.url_logo} nom={escouade.nom} size="sm" />

                        {/* Infos */}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-white/80 truncate group-hover:text-red-300 transition-colors text-sm">
                            {escouade.nom}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5">
                            <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden max-w-[120px]">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-red-600 to-orange-500"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-white/25">{nbMembres} m.</span>
                          </div>
                        </div>

                        {/* Points */}
                        <div className="text-right flex-shrink-0">
                          <span className={`tabular-nums font-bold text-base ${escouade.points_totaux > 0 ? "text-red-300" : escouade.points_totaux < 0 ? "text-red-400" : "text-white/30"}`}>
                            {escouade.points_totaux > 0 ? "+" : ""}
                            {escouade.points_totaux.toLocaleString("fr-FR")}
                          </span>
                          <p className="text-[10px] text-white/25 uppercase tracking-wide">pts totaux</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}

        {/* ── Escouades hors classement (< 500 pts) ───────────────────── */}
        {horsClassement.length > 0 && (
          <section className="mt-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-white/5" />
              <h2 className="text-xs text-white/20 uppercase tracking-widest font-medium">
                Hors classement&nbsp;&nbsp;·&nbsp;&nbsp;{MIN_POINTS_ESCOUADE} pts min. requis
              </h2>
              <div className="h-px flex-1 bg-white/5" />
            </div>
            <div className="space-y-2 opacity-60">
              {horsClassement.map((escouade) => {
                const nbMembres = escouade.membres_escouade?.length ?? 0;

                return (
                  <Link
                    key={escouade.id}
                    href={`/escouades/${escouade.id}`}
                    className="group flex items-center gap-4 p-3 rounded-xl bg-white/[0.015] ring-1 ring-white/[0.03] hover:bg-white/[0.03] hover:ring-white/10 transition-all"
                  >
                    <div className="flex-shrink-0 w-8 text-center">
                      <span className="text-sm font-mono text-white/15">—</span>
                    </div>

                    <LogoEscouade url={escouade.url_logo} nom={escouade.nom} size="sm" />

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white/50 truncate group-hover:text-white/70 transition-colors text-sm">
                        {escouade.nom}
                      </p>
                      <span className="text-[10px] text-white/20">{nbMembres} membre{nbMembres !== 1 ? "s" : ""}</span>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="tabular-nums font-bold text-sm text-white/30">
                        {escouade.points_totaux.toLocaleString("fr-FR")}
                      </span>
                      <p className="text-[10px] text-white/15 uppercase tracking-wide">pts totaux</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
    </>
  );
}