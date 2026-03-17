"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { creerAgenceInterEcole } from "@/app/(dashboard)/agences/actions";

type ExoPro = {
  id: string;
  pseudo: string;
  grade_role: string | null;
  site: string | null;
};

type Props = {
  exoProList: ExoPro[];
};

export function AgencesInterEcoleAdmin({ exoProList }: Props) {
  const [modalOuvert, setModalOuvert] = useState(false);
  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [urlLogo, setUrlLogo] = useState("");
  const [fondateurId, setFondateurId] = useState("");
  const [isPending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nom.trim() || nom.trim().length < 2) {
      setErreur("Le nom doit contenir au moins 2 caractères.");
      return;
    }
    if (!fondateurId) {
      setErreur("Veuillez sélectionner un fondateur.");
      return;
    }
    setErreur(null);
    startTransition(async () => {
      const result = await creerAgenceInterEcole({
        nom: nom.trim(),
        description: description.trim() || undefined,
        url_logo: urlLogo.trim() || undefined,
        fondateurId,
      });
      if (result.success) {
        setSucces(true);
        setTimeout(() => {
          router.refresh();
          setModalOuvert(false);
          setSucces(false);
          setNom("");
          setDescription("");
          setUrlLogo("");
          setFondateurId("");
        }, 1400);
      } else {
        setErreur(result.error ?? "Erreur lors de la création.");
      }
    });
  }

  function handleClose() {
    if (isPending) return;
    setModalOuvert(false);
    setErreur(null);
    setSucces(false);
    setNom("");
    setDescription("");
    setUrlLogo("");
    setFondateurId("");
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) handleClose();
  }

  const siteBadge = (siteId: string | null) => {
    if (siteId === "tokyo") return "Tokyo";
    if (siteId === "hokkaido") return "Hokkaido";
    return "";
  };

  return (
    <>
      {/* Section card */}
      <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 overflow-hidden">
        <div className="h-px w-full bg-gradient-to-r from-violet-500/0 via-violet-500/60 to-violet-500/0" />
        <div className="p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-4">
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 rounded-xl bg-amber-500/20 blur-md" />
                <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-600/30 to-orange-700/20 ring-1 ring-white/10">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-5 h-5 text-amber-300">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                  </svg>
                </div>
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Agences <span className="text-amber-400">inter-école</span>
                </h3>
                <p className="text-xs text-white/40 mt-0.5">
                  Créez des agences visibles par les deux écoles.
                </p>
              </div>
            </div>
            <button
              onClick={() => setModalOuvert(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white text-sm font-semibold hover:from-amber-500 hover:to-orange-500 transition-all shadow-lg shadow-amber-900/30"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
              </svg>
              Créer une agence inter-école
            </button>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-amber-500/5 ring-1 ring-amber-500/15">
            <p className="text-xs text-amber-300/70">
              Les agences inter-école sont visibles par les élèves des deux écoles (Tokyo et Hokkaido). Le fondateur doit être Exorciste Pro ou supérieur et ne pas être déjà dans une agence.
            </p>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalOuvert && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={handleBackdropClick}
        >
          <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />

          <div className="relative w-full max-w-lg rounded-2xl bg-[#081020] ring-1 ring-white/10 shadow-2xl overflow-hidden">
            <div className="h-px w-full bg-gradient-to-r from-amber-500/0 via-amber-500/60 to-amber-500/0" />

            <div className="p-6 space-y-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    Créer une agence inter-école
                  </h2>
                  <p className="text-xs text-white/35 mt-1">
                    Visible par les élèves des deux écoles.
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="text-white/30 hover:text-white/70 transition-colors p-1 rounded-lg hover:bg-white/5"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {succes ? (
                <div className="flex flex-col items-center py-6 gap-3 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 text-emerald-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  </div>
                  <p className="text-emerald-400 font-semibold">Agence inter-école créée avec succès !</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider">
                      Nom de l&apos;agence <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={nom}
                      onChange={(e) => setNom(e.target.value)}
                      placeholder="Ex : Agence Tengen…"
                      maxLength={100}
                      className="w-full px-3 py-2.5 rounded-xl bg-white/5 ring-1 ring-white/10 text-white text-sm placeholder:text-white/25 focus:outline-none focus:ring-amber-500/50 transition-all"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider">
                      Fondateur <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={fondateurId}
                      onChange={(e) => setFondateurId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-white/5 ring-1 ring-white/10 text-white text-sm focus:outline-none focus:ring-amber-500/50 transition-all"
                    >
                      <option value="">— Sélectionner un Exorciste Pro+ —</option>
                      {exoProList.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.pseudo}
                          {u.grade_role ? ` (${u.grade_role})` : ""}
                          {u.site ? ` — ${siteBadge(u.site)}` : ""}
                        </option>
                      ))}
                    </select>
                    {exoProList.length === 0 && (
                      <p className="text-xs text-white/30 italic">
                        Aucun Exorciste Pro+ disponible (déjà tous dans une agence ou aucun).
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider">
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Décrivez l'agence et ses missions inter-école…"
                      maxLength={2000}
                      rows={3}
                      className="w-full px-3 py-2.5 rounded-xl bg-white/5 ring-1 ring-white/10 text-white text-sm placeholder:text-white/25 focus:outline-none focus:ring-amber-500/50 transition-all resize-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider">
                      URL du logo
                    </label>
                    <input
                      type="url"
                      value={urlLogo}
                      onChange={(e) => setUrlLogo(e.target.value)}
                      placeholder="https://…"
                      className="w-full px-3 py-2.5 rounded-xl bg-white/5 ring-1 ring-white/10 text-white text-sm placeholder:text-white/25 focus:outline-none focus:ring-amber-500/50 transition-all"
                    />
                  </div>

                  {erreur && (
                    <p className="text-sm text-red-400 bg-red-500/10 ring-1 ring-red-500/20 rounded-lg px-3 py-2">
                      {erreur}
                    </p>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button
                      type="button"
                      onClick={handleClose}
                      disabled={isPending}
                      className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white/50 ring-1 ring-white/10 hover:bg-white/5 transition-colors disabled:opacity-50"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={isPending}
                      className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:from-amber-500 hover:to-orange-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isPending ? "Création…" : "Créer l'agence"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
