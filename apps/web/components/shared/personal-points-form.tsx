"use client";

import { useState, useTransition } from "react";
import { attribuerPointsPersonnels } from "@/app/(dashboard)/evaluation/actions";

// ─── Types ────────────────────────────────────────────────────────────────────

type Student = {
  id: string;
  pseudo: string;
  avatar_url: string | null;
  grade: string | null;
  grade_role: string | null;
  divisions: string[];
};

// ─── Predefined reasons ───────────────────────────────────────────────────────

const PREDEFINED_REASONS = [
  { label: "Assiduité en cours", points: 5 },
  { label: "Assiduité en entraînement dans l'école", points: 5 },
  { label: "Assiduité lors de sorties hors école", points: 15 },
  { label: "Bon comportement à l'école", points: 1 },
  { label: "Lors de mission avec profs, si élément fort", points: 20 },
  { label: "Très impactant lors de scène importante", points: 30 },
  { label: "Bon combattant lors de batailles", points: 15 },
  { label: "Implication dans la section", points: 20 },
  { label: "Bon lors des examens", points: 10 },
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function PersonalPointsForm({ students }: { students: Student[] }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Student | null>(null);
  const [selectedReason, setSelectedReason] = useState<number | "custom" | null>(null);
  const [customPoints, setCustomPoints] = useState<number>(10);
  const [customLabel, setCustomLabel] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [saving, startSave] = useTransition();

  const resolvedPoints =
    selectedReason === "custom"
      ? customPoints
      : selectedReason !== null
        ? PREDEFINED_REASONS[selectedReason].points
        : 0;

  const resolvedJustification =
    selectedReason === "custom"
      ? customLabel.trim()
      : selectedReason !== null
        ? PREDEFINED_REASONS[selectedReason].label
        : "";

  const filtered = search.trim()
    ? students.filter((s) =>
        s.pseudo.toLowerCase().includes(search.toLowerCase())
      )
    : students;

  function handleSubmit() {
    if (!selected || resolvedPoints <= 0 || selectedReason === null) return;

    startSave(async () => {
      const result = await attribuerPointsPersonnels({
        utilisateur_id: selected.id,
        points: resolvedPoints,
        justification: resolvedJustification,
      });

      if (result.success) {
        setFeedback({
          type: "success",
          msg: `+${resolvedPoints} pts attribués ! Nouveau total : ${result.nouveauxPoints}`,
        });
        setSelectedReason(null);
        setCustomPoints(10);
        setCustomLabel("");
      } else {
        setFeedback({ type: "error", msg: result.error ?? "Erreur inconnue." });
      }
      setTimeout(() => setFeedback(null), 5000);
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
      {/* ── Left: Student selection ── */}
      <div className="lg:col-span-2 space-y-4">
        <div className="relative">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25"
          >
            <path
              fillRule="evenodd"
              d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
              clipRule="evenodd"
            />
          </svg>
          <input
            type="text"
            placeholder="Rechercher un élève…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/[0.04] ring-1 ring-white/10 text-sm text-white placeholder:text-white/25 focus:outline-none focus:ring-red-500/40 transition-all"
          />
        </div>

        <p className="text-[11px] text-white/30 uppercase tracking-widest font-medium">
          {filtered.length} élève{filtered.length !== 1 ? "s" : ""}
        </p>

        <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
          {filtered.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setSelected(s);
                setFeedback(null);
              }}
              className={`w-full text-left p-3 rounded-xl transition-all duration-150 ${
                selected?.id === s.id
                  ? "bg-red-500/10 ring-1 ring-red-500/30"
                  : "bg-white/[0.02] ring-1 ring-white/5 hover:bg-white/[0.04] hover:ring-white/10"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-red-500/10 ring-1 ring-red-500/20 flex items-center justify-center flex-shrink-0">
                  {s.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.avatar_url}
                      alt=""
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <span className="text-xs font-bold text-red-300 uppercase">
                      {s.pseudo.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">
                    {s.pseudo}
                  </p>
                  {s.grade_role && (
                    <p className="text-[10px] text-white/30">{s.grade_role}</p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Right: Award form ── */}
      <div className="lg:col-span-3 space-y-6">
        {selected ? (
          <div className="rounded-2xl bg-white/[0.02] ring-1 ring-white/8 p-6 space-y-5 animate-fade-in">
            {/* Header */}
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 rounded-lg bg-red-500/20 blur-md" />
                <div className="relative w-12 h-12 rounded-lg overflow-hidden ring-2 ring-red-500/30 bg-white/5 flex items-center justify-center">
                  {selected.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selected.avatar_url}
                      alt=""
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <span className="text-lg font-bold text-red-300 uppercase">
                      {selected.pseudo.charAt(0)}
                    </span>
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  {selected.pseudo}
                </h3>
                <p className="text-xs text-white/40">
                  {selected.grade_role ?? "Élève"}
                  {selected.divisions.length > 0 &&
                    ` — ${selected.divisions.join(", ")}`}
                </p>
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-red-500/20 via-white/8 to-transparent" />

            {/* Reason selection */}
            <div className="space-y-3">
              <h4 className="text-xs text-white/40 uppercase tracking-widest font-semibold">
                Raison de l&apos;attribution
              </h4>
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                {PREDEFINED_REASONS.map((reason, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedReason(idx)}
                    className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-150 flex items-center justify-between ring-1 ${
                      selectedReason === idx
                        ? "bg-emerald-500/10 ring-emerald-500/30"
                        : "bg-white/[0.02] ring-white/5 hover:bg-white/[0.04] hover:ring-white/10"
                    }`}
                  >
                    <span className={`text-sm ${selectedReason === idx ? "text-emerald-200 font-medium" : "text-white/70"}`}>
                      {reason.label}
                    </span>
                    <span className={`text-sm font-bold ml-3 flex-shrink-0 px-2.5 py-0.5 rounded-lg ${
                      selectedReason === idx
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-white/[0.04] text-white/40"
                    }`}>
                      +{reason.points} pts
                    </span>
                  </button>
                ))}

                {/* Custom reason */}
                <button
                  onClick={() => setSelectedReason("custom")}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-150 flex items-center justify-between ring-1 ${
                    selectedReason === "custom"
                      ? "bg-red-500/10 ring-red-500/30"
                      : "bg-white/[0.02] ring-white/5 hover:bg-white/[0.04] hover:ring-white/10"
                  }`}
                >
                  <span className={`text-sm ${selectedReason === "custom" ? "text-red-200 font-medium" : "text-white/70"}`}>
                    ✏️ Raison personnalisée
                  </span>
                  <span className={`text-sm font-bold ml-3 flex-shrink-0 px-2.5 py-0.5 rounded-lg ${
                    selectedReason === "custom"
                      ? "bg-red-500/20 text-red-300"
                      : "bg-white/[0.04] text-white/40"
                  }`}>
                    perso
                  </span>
                </button>
              </div>
            </div>

            {/* Custom reason fields */}
            {selectedReason === "custom" && (
              <div className="space-y-3 animate-fade-in">
                <div className="space-y-2">
                  <label className="text-xs text-white/40 uppercase tracking-widest font-semibold">
                    Points à attribuer
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setCustomPoints(Math.max(1, customPoints - 5))}
                      className="p-2 rounded-lg bg-white/[0.04] ring-1 ring-white/10 text-white/50 hover:bg-white/[0.08] transition-colors text-xs font-medium"
                    >
                      −5
                    </button>
                    <button
                      onClick={() => setCustomPoints(Math.max(1, customPoints - 1))}
                      className="p-2 rounded-lg bg-white/[0.04] ring-1 ring-white/10 text-white/50 hover:bg-white/[0.08] transition-colors text-xs font-medium"
                    >
                      −1
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      value={customPoints}
                      onChange={(e) => {
                        const v = parseInt(e.target.value);
                        if (!isNaN(v) && v >= 1 && v <= 1000) setCustomPoints(v);
                      }}
                      className="w-24 text-center text-2xl font-bold py-2 rounded-xl bg-white/[0.04] ring-1 ring-white/10 focus:outline-none focus:ring-red-500/40 transition-all text-emerald-300"
                    />
                    <button
                      onClick={() => setCustomPoints(Math.min(1000, customPoints + 1))}
                      className="p-2 rounded-lg bg-emerald-500/5 ring-1 ring-emerald-500/10 text-emerald-400/70 hover:bg-emerald-500/15 transition-colors text-xs font-medium"
                    >
                      +1
                    </button>
                    <button
                      onClick={() => setCustomPoints(Math.min(1000, customPoints + 5))}
                      className="p-2 rounded-lg bg-emerald-500/10 ring-1 ring-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-colors text-xs font-medium"
                    >
                      +5
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-white/40 uppercase tracking-widest font-semibold">
                    Raison personnalisée
                  </label>
                  <textarea
                    value={customLabel}
                    onChange={(e) => setCustomLabel(e.target.value)}
                    placeholder="Décrivez la raison…"
                    maxLength={2000}
                    rows={2}
                    className="w-full px-4 py-3 rounded-xl bg-white/[0.04] ring-1 ring-white/10 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-red-500/40 transition-all resize-none"
                  />
                </div>
              </div>
            )}

            {/* Feedback */}
            {feedback && (
              <div
                className={`px-4 py-3 rounded-xl text-sm font-medium animate-fade-in ${
                  feedback.type === "success"
                    ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20"
                    : "bg-red-500/10 text-red-300 ring-1 ring-red-500/20"
                }`}
              >
                {feedback.msg}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={saving || selectedReason === null || resolvedPoints <= 0 || (selectedReason === "custom" && !customLabel.trim())}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-red-600 to-orange-600 text-white font-semibold text-sm hover:from-red-500 hover:to-orange-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {saving
                ? "Attribution en cours…"
                : selectedReason !== null
                  ? `Attribuer +${resolvedPoints} pts personnels`
                  : "Sélectionnez une raison"}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4 rounded-2xl bg-white/[0.02] ring-1 ring-white/5">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                className="w-7 h-7 text-red-400/40"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                />
              </svg>
            </div>
            <p className="text-white/30 text-sm">
              Sélectionnez un élève pour lui attribuer des points personnels.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
