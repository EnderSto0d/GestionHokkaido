"use client";

import { useState, useTransition, useMemo } from "react";
import { retirerPointsLogistique } from "@/app/(dashboard)/production-logistique/actions";
import type { MalusResult, UtilisateurOption } from "@/app/(dashboard)/production-logistique/actions";

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  utilisateurs: UtilisateurOption[];
};

// ─── Component ────────────────────────────────────────────────────────────────

export function LogisticsRemovePoints({ utilisateurs }: Props) {
  const [targetId, setTargetId] = useState("");
  const [targetSearch, setTargetSearch] = useState("");
  const [points, setPoints] = useState("1");
  const [raison, setRaison] = useState("");
  const [result, setResult] = useState<MalusResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredUtilisateurs = useMemo(() => {
    if (!targetSearch.trim()) return utilisateurs;
    const q = targetSearch.toLowerCase();
    return utilisateurs.filter((u) => u.pseudo.toLowerCase().includes(q));
  }, [targetSearch, utilisateurs]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setResult(null);

    const pts = parseInt(points, 10);
    if (!targetId) {
      setResult({ success: false, error: "Veuillez sélectionner un utilisateur." });
      return;
    }
    if (isNaN(pts) || pts <= 0) {
      setResult({ success: false, error: "Le nombre de points doit être un entier strictement positif." });
      return;
    }

    startTransition(async () => {
      const res = await retirerPointsLogistique(targetId, pts, raison || undefined);
      setResult(res);
      if (res.success) {
        setPoints("1");
        setRaison("");
        setTargetId("");
        setTargetSearch("");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl bg-white/[0.03] border border-red-500/15 overflow-hidden"
    >
      <div className="h-px w-full bg-gradient-to-r from-red-500/0 via-red-500/50 to-red-500/0" />
      <div className="p-6 space-y-6">

        {/* Header */}
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-red-500/15 text-red-400">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clipRule="evenodd" />
              </svg>
            </span>
            Appliquer un malus logistique
          </h2>
          <p className="mt-1 text-sm text-white/40">
            Retire des points logistique à un utilisateur. Le delta de bonus (5 %) est
            répercuté sur ses points personnels <span className="text-red-400/70">sans plancher</span> — les points personnels peuvent devenir négatifs.
          </p>
        </div>

        {/* Utilisateur cible */}
        <div className="space-y-2">
          <label htmlFor="malus-target-search" className="block text-sm font-medium text-white/70">
            Utilisateur ciblé
          </label>
          <input
            id="malus-target-search"
            type="text"
            placeholder="Rechercher un utilisateur…"
            value={targetSearch}
            onChange={(e) => {
              setTargetSearch(e.target.value);
              setTargetId("");
            }}
            className="w-full rounded-xl bg-white/[0.05] border border-white/10 text-white text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 disabled:opacity-50"
            disabled={isPending}
          />
          {targetId ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
              <span>✓ {utilisateurs.find((u) => u.id === targetId)?.pseudo}</span>
              <button
                type="button"
                onClick={() => { setTargetId(""); setTargetSearch(""); }}
                className="ml-auto text-red-400 hover:text-white text-xs"
              >
                Changer
              </button>
            </div>
          ) : targetSearch.trim() ? (
            <div className="max-h-40 overflow-y-auto rounded-xl bg-[#0d1529] border border-white/10">
              {filteredUtilisateurs.length === 0 ? (
                <p className="px-4 py-2 text-sm text-white/30">Aucun résultat</p>
              ) : (
                filteredUtilisateurs.slice(0, 20).map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => { setTargetId(u.id); setTargetSearch(u.pseudo); }}
                    className="w-full text-left px-4 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    {u.pseudo}
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>

        {/* Points à retirer */}
        <div className="space-y-2">
          <label htmlFor="malus-points-input" className="block text-sm font-medium text-white/70">
            Points logistique à retirer
          </label>
          <input
            id="malus-points-input"
            type="number"
            min={1}
            max={999999}
            step={1}
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            required
            className="w-full rounded-xl bg-white/[0.05] border border-white/10 text-white text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 disabled:opacity-50"
            disabled={isPending}
          />
          <p className="text-xs text-white/30">
            L&apos;impact sur les points personnels sera de −{Math.floor(parseInt(points, 10) * 0.05) || 0} pts minimum (5&nbsp;%).
          </p>
        </div>

        {/* Raison */}
        <div className="space-y-2">
          <label htmlFor="malus-raison-input" className="block text-sm font-medium text-white/70">
            Raison <span className="text-white/30 font-normal">(optionnel)</span>
          </label>
          <input
            id="malus-raison-input"
            type="text"
            placeholder="Ex. : Sanction disciplinaire…"
            value={raison}
            onChange={(e) => setRaison(e.target.value)}
            maxLength={200}
            className="w-full rounded-xl bg-white/[0.05] border border-white/10 text-white text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 disabled:opacity-50 placeholder:text-white/20"
            disabled={isPending}
          />
        </div>

        {/* Feedback */}
        {result && (
          <div
            className={`rounded-xl px-4 py-3 text-sm ${
              result.success
                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                : "bg-red-500/10 border border-red-500/30 text-red-300"
            }`}
          >
            {result.success ? (
              <>
                ✓ Malus appliqué. −{result.pointsRetires} pts logistique.{" "}
                Impact personnel :{" "}
                <span className={result.deltaPersonnel < 0 ? "text-red-400" : "text-white/60"}>
                  {result.deltaPersonnel > 0 ? "+" : ""}{result.deltaPersonnel} pts
                </span>
                {". "}Nouveau total logistique : {result.newLogisticsTotal.toLocaleString("fr-FR")}.
              </>
            ) : (
              <>✕ {result.error}</>
            )}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isPending || !targetId || !points || parseInt(points, 10) <= 0}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold text-white transition-colors shadow-lg shadow-red-900/20"
        >
          {isPending ? "Application…" : "Appliquer le malus"}
        </button>
      </div>
    </form>
  );
}
