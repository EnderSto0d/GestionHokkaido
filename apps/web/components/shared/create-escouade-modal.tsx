"use client";

import { useState, useTransition } from "react";
import { createSquadWithDiscordRole } from "@/app/(dashboard)/escouades/actions";
import { useRouter } from "next/navigation";

type CreateEscouadeModalProps = {
  onFermer: () => void;
};

export function CreateEscouadeModal({ onFermer }: CreateEscouadeModalProps) {
  const [nom, setNom] = useState("");
  const [isPending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nom.trim()) {
      setErreur("Veuillez saisir un nom pour l'escouade.");
      return;
    }
    setErreur(null);
    startTransition(async () => {
      const result = await createSquadWithDiscordRole(nom.trim());
      if (result.success) {
        setSucces(true);
        setTimeout(() => {
          router.refresh();
          onFermer();
        }, 1200);
      } else {
        setErreur(result.error);
      }
    });
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onFermer();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />

      <div className="relative w-full max-w-md rounded-2xl bg-[#081020] ring-1 ring-white/10 shadow-2xl overflow-hidden">
        {/* Accent top */}
        <div className="h-px w-full bg-gradient-to-r from-red-500/0 via-red-500/60 to-red-500/0" />

        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Créer une escouade</h2>
              <p className="text-xs text-white/35 mt-1">
                Un rôle Discord sera automatiquement créé et attribué.
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

          {succes ? (
            <div className="flex flex-col items-center py-6 gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 text-emerald-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
              <p className="text-emerald-400 font-semibold">Escouade créée avec succès !</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nom */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider">
                  Nom de l&apos;escouade
                </label>
                <input
                  type="text"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Ex : Équipe Gojo…"
                  maxLength={100}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 ring-1 ring-white/10 text-white text-sm placeholder:text-white/25 focus:outline-none focus:ring-red-500/50 transition-all"
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
                  onClick={onFermer}
                  disabled={isPending}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white/50 ring-1 ring-white/10 hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-red-600 to-orange-600 text-white hover:from-red-500 hover:to-orange-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isPending ? "Création…" : "Créer l'escouade"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Bouton d'ouverture (client) ──────────────────────────────────────────────

export function CreateEscouadeButton({ dejaMembreEscouade = false }: { dejaMembreEscouade?: boolean }) {
  const [modalOuvert, setModalOuvert] = useState(false);

  if (dejaMembreEscouade) {
    return (
      <span
        title="Vous êtes déjà membre d'une escouade. Quittez-la pour en créer une nouvelle."
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-white/30 text-sm font-semibold cursor-not-allowed ring-1 ring-white/10"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
        </svg>
        Déjà dans une escouade
      </span>
    );
  }

  return (
    <>
      <button
        onClick={() => setModalOuvert(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 text-white text-sm font-semibold hover:from-red-500 hover:to-orange-500 transition-all shadow-lg shadow-red-900/30"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
        </svg>
        Créer une escouade
      </button>
      {modalOuvert && (
        <CreateEscouadeModal
          onFermer={() => setModalOuvert(false)}
        />
      )}
    </>
  );
}
