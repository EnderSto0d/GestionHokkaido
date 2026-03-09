"use client";

import { useState, useTransition, useCallback } from "react";
import { creerHautFait, getHautsFaits } from "@/app/(dashboard)/evaluation/actions";
import type { HautFaitRow } from "@/app/(dashboard)/evaluation/actions";

// ─── Types ────────────────────────────────────────────────────────────────────

type Escouade = {
  id: string;
  nom: string;
  points: number;
  url_logo: string | null;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function SquadEvaluation({ escouades }: { escouades: Escouade[] }) {
  const [selected, setSelected] = useState<Escouade | null>(null);
  const [points, setPoints] = useState<number>(0);
  const [raison, setRaison] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [saving, startSave] = useTransition();

  // Hauts faits log
  const [hautsFaits, setHautsFaits] = useState<HautFaitRow[]>([]);
  const [loadingHf, setLoadingHf] = useState(false);

  const loadHautsFaits = useCallback(async (escouadeId: string) => {
    setLoadingHf(true);
    const hf = await getHautsFaits(escouadeId);
    setHautsFaits(hf);
    setLoadingHf(false);
  }, []);

  function selectSquad(e: Escouade) {
    setSelected(e);
    setPoints(0);
    setRaison("");
    setFeedback(null);
    loadHautsFaits(e.id);
  }

  function handleSubmit() {
    if (!selected || points === 0) return;

    startSave(async () => {
      const result = await creerHautFait({
        escouade_id: selected.id,
        points,
        raison,
      });

      if (result.success) {
        setFeedback({ type: "success", msg: `Points attribués ! Nouveau total : ${result.nouveauxPoints}` });
        setPoints(0);
        setRaison("");
        // Update local state
        setSelected((prev) => (prev ? { ...prev, points: result.nouveauxPoints ?? prev.points } : null));
        loadHautsFaits(selected.id);
      } else {
        setFeedback({ type: "error", msg: result.error ?? "Erreur inconnue." });
      }
      setTimeout(() => setFeedback(null), 5000);
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
      {/* ── Left: Squad selection ──────────────────────────────────── */}
      <div className="lg:col-span-2 space-y-4">
        <p className="text-[11px] text-white/30 uppercase tracking-widest font-medium">
          {escouades.length} escouade{escouades.length !== 1 ? "s" : ""}
        </p>

        <div className="space-y-2">
          {escouades.map((e) => (
            <button
              key={e.id}
              onClick={() => selectSquad(e)}
              className={`w-full text-left p-4 rounded-xl transition-all duration-150 ${
                selected?.id === e.id
                  ? "bg-amber-500/10 ring-1 ring-amber-500/30"
                  : "bg-white/[0.02] ring-1 ring-white/5 hover:bg-white/[0.04] hover:ring-white/10"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-amber-500/10 ring-1 ring-amber-500/20 flex items-center justify-center flex-shrink-0">
                  {e.url_logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={e.url_logo} alt="" className="object-cover w-full h-full" />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-amber-400/50">
                      <path d="M10 1a6 6 0 0 0-3.815 10.631C7.237 12.5 8 13.443 8 14.5v.5h4v-.5c0-1.057.763-2 1.815-2.869A6 6 0 0 0 10 1ZM8.5 18a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1H9a.5.5 0 0 1-.5-.5ZM8 16.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5Z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{e.nom}</p>
                  <p className="text-xs text-white/40">
                    <span className="text-amber-300 font-semibold">{selected?.id === e.id ? (selected.points) : e.points}</span> points
                  </p>
                </div>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
                  className={`w-4 h-4 flex-shrink-0 transition-colors ${selected?.id === e.id ? "text-amber-400" : "text-white/10"}`}>
                  <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Right: Award form + history ────────────────────────────── */}
      <div className="lg:col-span-3 space-y-6">
        {selected ? (
          <>
            {/* Form card */}
            <div className="rounded-2xl bg-white/[0.02] ring-1 ring-white/8 p-6 space-y-5 animate-fade-in">
              {/* Header */}
              <div className="flex items-center gap-4">
                <div className="relative flex-shrink-0">
                  <div className="absolute inset-0 rounded-lg bg-amber-500/20 blur-md" />
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden ring-2 ring-amber-500/30 bg-white/5 flex items-center justify-center">
                    {selected.url_logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={selected.url_logo} alt="" className="object-cover w-full h-full" />
                    ) : (
                      <span className="text-lg font-bold text-amber-300 uppercase">{selected.nom.charAt(0)}</span>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{selected.nom}</h3>
                  <p className="text-xs text-white/40">
                    Points actuels : <span className="text-amber-300 font-semibold">{selected.points}</span>
                  </p>
                </div>
              </div>

              <div className="h-px bg-gradient-to-r from-amber-500/20 via-white/8 to-transparent" />

              {/* Points input */}
              <div className="space-y-3">
                <h4 className="text-xs text-white/40 uppercase tracking-widest font-semibold">
                  Points à attribuer
                </h4>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setPoints(Math.max(-1000, points - 10))}
                    className="p-2 rounded-lg bg-red-500/10 ring-1 ring-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M4 10a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H4.75A.75.75 0 0 1 4 10Z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setPoints(Math.max(-1000, points - 1))}
                    className="p-2 rounded-lg bg-red-500/5 ring-1 ring-red-500/10 text-red-400/70 hover:bg-red-500/15 transition-colors text-xs font-medium"
                  >
                    −1
                  </button>

                  <input
                    type="number"
                    value={points}
                    onChange={(e) => {
                      const v = parseInt(e.target.value);
                      if (!isNaN(v) && Math.abs(v) <= 1000) setPoints(v);
                    }}
                    className={`w-24 text-center text-2xl font-bold py-2 rounded-xl bg-white/[0.04] ring-1 ring-white/10 focus:outline-none focus:ring-amber-500/40 transition-all ${
                      points > 0 ? "text-emerald-300" : points < 0 ? "text-red-400" : "text-white/50"
                    }`}
                  />

                  <button
                    onClick={() => setPoints(Math.min(1000, points + 1))}
                    className="p-2 rounded-lg bg-emerald-500/5 ring-1 ring-emerald-500/10 text-emerald-400/70 hover:bg-emerald-500/15 transition-colors text-xs font-medium"
                  >
                    +1
                  </button>
                  <button
                    onClick={() => setPoints(Math.min(1000, points + 10))}
                    className="p-2 rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                    </svg>
                  </button>
                </div>

                {/* Quick presets */}
                <div className="flex flex-wrap gap-1.5">
                  {[-50, -20, -10, -5, 5, 10, 20, 50].map((v) => (
                    <button
                      key={v}
                      onClick={() => setPoints(v)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ring-1 ${
                        points === v
                          ? v > 0
                            ? "bg-emerald-500/15 text-emerald-300 ring-emerald-400/20"
                            : "bg-red-500/15 text-red-300 ring-red-400/20"
                          : "bg-white/[0.03] text-white/40 ring-white/5 hover:bg-white/[0.06]"
                      }`}
                    >
                      {v > 0 ? `+${v}` : v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Justification */}
              <div className="space-y-3">
                <h4 className="text-xs text-white/40 uppercase tracking-widest font-semibold">
                  Justification
                </h4>
                <textarea
                  value={raison}
                  onChange={(e) => setRaison(e.target.value)}
                  placeholder="Décrivez la raison de cette attribution de points (visible par les élèves)…"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.04] ring-1 ring-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-amber-500/40 transition-all resize-none"
                />
                <p className="text-[10px] text-white/20">
                  {raison.length}/2000 caractères — Ce texte sera visible par les membres de l&apos;escouade.
                </p>
              </div>

              {/* Feedback */}
              {feedback && (
                <div className={`text-sm px-3 py-2 rounded-lg ${feedback.type === "success" ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20" : "bg-red-500/10 text-red-400 ring-1 ring-red-500/20"}`}>
                  {feedback.msg}
                </div>
              )}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={saving || points === 0}
                className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
              >
                {saving ? "Attribution…" : points > 0 ? `Attribuer +${points} points` : `Retirer ${Math.abs(points)} points`}
              </button>
            </div>

            {/* History */}
            <div className="rounded-2xl bg-white/[0.02] ring-1 ring-white/8 p-6 space-y-4">
              <h4 className="text-xs text-white/40 uppercase tracking-widest font-semibold flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                  <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clipRule="evenodd" />
                </svg>
                Historique des hauts faits
              </h4>

              {loadingHf ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                </div>
              ) : hautsFaits.length === 0 ? (
                <p className="text-sm text-white/20 text-center py-6">Aucun haut fait enregistré.</p>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                  {hautsFaits.map((hf) => (
                    <div
                      key={hf.id}
                      className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] ring-1 ring-white/5"
                    >
                      {/* Points badge */}
                      <div className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold ${
                        hf.points > 0
                          ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/20"
                          : "bg-red-500/15 text-red-300 ring-1 ring-red-400/20"
                      }`}>
                        {hf.points > 0 ? `+${hf.points}` : hf.points}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white/80">{hf.raison}</p>
                        <p className="text-[10px] text-white/25 mt-1">
                          par {hf.attribue_par_pseudo} · {new Date(hf.cree_le).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4 rounded-2xl bg-white/[0.01] ring-1 ring-white/5">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/5 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-8 h-8 text-amber-400/30">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
              </svg>
            </div>
            <div className="space-y-1">
              <p className="text-white/40 text-sm font-medium">Sélectionnez une escouade</p>
              <p className="text-white/20 text-xs">Choisissez une escouade pour attribuer ou retirer des points avec justification.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
