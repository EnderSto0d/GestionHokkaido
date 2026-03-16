"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getEligibleStagiaires, prendreStagiaire } from "../actions";

type Stagiaire = {
  id: string;
  pseudo: string;
  avatar_url: string | null;
  grade_secondaire: string | null;
  site_id: string | null;
};

type Props = {
  agenceId: string;
  onFermer: () => void;
};

export function StagiaireModal({ agenceId, onFermer }: Props) {
  const [stagiaires, setStagiaires] = useState<Stagiaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);
  const router = useRouter();

  useEffect(() => {
    getEligibleStagiaires(agenceId)
      .then((data) => {
        setStagiaires(data as Stagiaire[]);
        setLoading(false);
      })
      .catch(() => {
        setStagiaires([]);
        setLoading(false);
      });
  }, [agenceId]);

  const stagiairesFiltered = stagiaires.filter((s) =>
    s.pseudo.toLowerCase().includes(search.toLowerCase())
  );

  function handleConfirmer() {
    if (!selected) return;
    setErreur(null);
    startTransition(async () => {
      const result = await prendreStagiaire(agenceId, selected);
      if (result.success) {
        setSucces(true);
        setTimeout(() => {
          router.refresh();
          onFermer();
        }, 1200);
      } else {
        setErreur(result.error ?? "Erreur lors de la prise en stage.");
      }
    });
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onFermer();
  }

  const selectedStagiaire = stagiaires.find((s) => s.id === selected);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />

      <div className="relative w-full max-w-md rounded-2xl bg-[#081020] ring-1 ring-white/10 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="h-px w-full bg-gradient-to-r from-violet-500/0 via-violet-500/60 to-violet-500/0" />

        <div className="p-6 flex-shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Prendre un stagiaire</h2>
              <p className="text-xs text-white/35 mt-1">
                Seuls les élèves en Terminal sans stage actif sont éligibles.
              </p>
            </div>
            <button
              onClick={onFermer}
              className="text-white/30 hover:text-white/70 transition-colors p-1 rounded-lg hover:bg-white/5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {succes ? (
          <div className="flex flex-col items-center py-8 gap-3 text-center px-6 pb-6">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 text-emerald-400">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <p className="text-emerald-400 font-semibold">
              {selectedStagiaire?.pseudo ?? "Stage"} a rejoint l&apos;agence en tant que stagiaire !
            </p>
          </div>
        ) : (
          <>
            {/* Recherche */}
            <div className="px-6 pb-3 flex-shrink-0">
              <div className="relative">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25 pointer-events-none">
                  <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Rechercher un élève Terminal…"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 ring-1 ring-white/10 text-white text-sm placeholder:text-white/25 focus:outline-none focus:ring-violet-500/50 transition-all"
                />
              </div>
            </div>

            {/* Liste */}
            <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-1.5 min-h-0">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 rounded-full border-2 border-violet-500/30 border-t-violet-400 animate-spin" />
                </div>
              ) : stagiairesFiltered.length === 0 ? (
                <div className="flex flex-col items-center py-8 gap-2 text-center">
                  <p className="text-sm text-white/30">
                    {search ? "Aucun résultat pour cette recherche." : "Aucun élève Terminal éligible."}
                  </p>
                </div>
              ) : (
                stagiairesFiltered.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSelected(s.id === selected ? null : s.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl ring-1 transition-all text-left ${
                      selected === s.id
                        ? "bg-violet-600/20 ring-violet-500/40"
                        : "bg-white/[0.03] ring-white/10 hover:ring-violet-500/20 hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="w-9 h-9 rounded-full overflow-hidden bg-violet-500/20 ring-1 ring-white/10 flex items-center justify-center flex-shrink-0">
                      {s.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={s.avatar_url} alt={s.pseudo} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-violet-300 uppercase">
                          {s.pseudo.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{s.pseudo}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-amber-400">Terminal</span>
                        {s.site_id && (
                          <span className={`text-[10px] ${s.site_id === "tokyo" ? "text-violet-400/60" : "text-red-400/60"}`}>
                            {s.site_id === "tokyo" ? "Tokyo" : "Hokkaido"}
                          </span>
                        )}
                      </div>
                    </div>
                    {selected === s.id && (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-violet-400 flex-shrink-0">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))
              )}
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 flex-shrink-0 space-y-3">
              {erreur && (
                <p className="text-sm text-red-400 bg-red-500/10 ring-1 ring-red-500/20 rounded-lg px-3 py-2">
                  {erreur}
                </p>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onFermer}
                  disabled={isPending}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white/50 ring-1 ring-white/10 hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleConfirmer}
                  disabled={isPending || !selected}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-indigo-700 text-white hover:from-violet-500 hover:to-indigo-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isPending ? "Confirme…" : "Confirmer le stage"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
