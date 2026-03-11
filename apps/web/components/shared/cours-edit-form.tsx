"use client";

import { useState, useTransition } from "react";
import { modifierCours } from "@/app/(dashboard)/cours/actions";
import type { CoursRow } from "@/app/(dashboard)/cours/actions";

type Props = {
  cours: CoursRow;
  onClose: () => void;
  onSuccess: () => void;
};

export default function CoursEditForm({ cours, onClose, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [titre, setTitre] = useState(cours.titre);
  const [dateHeure, setDateHeure] = useState(cours.date_heure?.slice(0, 16) ?? "");
  const [capaciteType, setCapaciteType] = useState<"number" | "unlimited">(
    cours.capacite === null ? "unlimited" : "number"
  );
  const [capacite, setCapacite] = useState<string>(String(cours.capacite ?? 10));
  const [description, setDescription] = useState(cours.description ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsedCapacite =
      capaciteType === "unlimited" ? null : parseInt(capacite, 10);

    startTransition(async () => {
      const result = await modifierCours(cours.id, {
        titre: titre.trim(),
        date_heure: dateHeure || null,
        capacite: parsedCapacite,
        description,
      });

      if (result.success) {
        onSuccess();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#08101f] ring-1 ring-white/10 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-[#08101f] border-b border-white/[0.06]">
          <div>
            <h2 className="text-lg font-bold text-white">Modifier le cours</h2>
            <p className="text-xs text-white/40 mt-0.5">
              L&apos;embed Discord sera mis à jour automatiquement.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Titre */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-white/80">
              Nom du cours <span className="text-purple-400">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={200}
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.04] ring-1 ring-white/10 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition"
            />
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-white/80">Date / Heure</label>
            <input
              type="datetime-local"
              value={dateHeure}
              onChange={(e) => setDateHeure(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.04] ring-1 ring-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition [color-scheme:dark]"
            />
          </div>

          {/* Capacité */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-white/80">Capacité</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCapaciteType("number")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ring-1 transition ${
                  capaciteType === "number"
                    ? "bg-purple-600/20 ring-purple-500/50 text-purple-300"
                    : "bg-white/[0.03] ring-white/10 text-white/50 hover:text-white/70"
                }`}
              >
                Nombre fixe
              </button>
              <button
                type="button"
                onClick={() => setCapaciteType("unlimited")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ring-1 transition ${
                  capaciteType === "unlimited"
                    ? "bg-purple-600/20 ring-purple-500/50 text-purple-300"
                    : "bg-white/[0.03] ring-white/10 text-white/50 hover:text-white/70"
                }`}
              >
                Illimité
              </button>
            </div>
            {capaciteType === "number" && (
              <input
                type="number"
                min={1}
                value={capacite}
                onChange={(e) => setCapacite(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white/[0.04] ring-1 ring-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition"
              />
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-white/80">Description</label>
            <textarea
              rows={4}
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.04] ring-1 ring-white/10 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition resize-none"
            />
            <p className="text-xs text-white/30 text-right">{description.length} / 2000</p>
          </div>

          {error && (
            <div className="rounded-lg bg-red-500/10 ring-1 ring-red-500/30 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium ring-1 ring-white/10 text-white/60 hover:text-white/80 hover:bg-white/[0.04] transition disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-purple-600 hover:bg-purple-500 text-white transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Modification…
                </>
              ) : (
                "Enregistrer les modifications"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
