"use client";

import { useState, useMemo, useEffect, useTransition } from "react";
import { RadarChart } from "./radar-chart";
import {
  getEvaluation,
  upsertEvaluation,
  type EvaluationData,
} from "@/app/(dashboard)/evaluation/actions";

// ─── Types ────────────────────────────────────────────────────────────────────

type Student = {
  id: string;
  pseudo: string;
  avatar_url: string | null;
  grade: string | null;
  grade_role: string | null;
  divisions: string[];
};

type Props = {
  students: Student[];
};

// ─── Radar axes (JJK themed) ─────────────────────────────────────────────────

const STAT_KEYS: (keyof EvaluationData)[] = [
  "maitrise_energie_occulte",
  "sang_froid",
  "discipline",
  "intelligence_tactique",
  "travail_equipe",
  "premiers_soin",
  "combat",
  "initiative",
  "connaissance_theorique",
  "pedagogie",
];

const AXES_LABELS = [
  "Maîtrise Énergie Occulte",
  "Sang Froid",
  "Discipline",
  "Intelligence Tactique",
  "Travail d'équipe",
  "Premiers Soins",
  "Combat",
  "Initiative",
  "Connaissance Théorique",
  "Pédagogie",
];

const DEFAULT_EVALUATION: EvaluationData = {
  maitrise_energie_occulte: 10,
  sang_froid: 10,
  discipline: 10,
  intelligence_tactique: 10,
  travail_equipe: 10,
  premiers_soin: 10,
  combat: 10,
  initiative: 10,
  connaissance_theorique: 10,
  pedagogie: 10,
};

// ─── Component ────────────────────────────────────────────────────────────────

export function TeacherStudentEvaluation({ students }: Props) {
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [evaluation, setEvaluation] = useState<EvaluationData>(DEFAULT_EVALUATION);
  const [loading, setLoading] = useState(false);
  const [saving, startSave] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return students;
    const term = search.toLowerCase();
    return students.filter(
      (s) =>
        s.pseudo.toLowerCase().includes(term) ||
        s.grade?.toLowerCase().includes(term) ||
        s.divisions.some((d) => d.toLowerCase().includes(term))
    );
  }, [students, search]);

  // Charger l'évaluation existante quand on sélectionne un élève
  useEffect(() => {
    if (!selectedStudent) return;
    let cancelled = false;
    setLoading(true);
    setFeedback(null);
    getEvaluation(selectedStudent.id).then((data) => {
      if (cancelled) return;
      setEvaluation(data ?? DEFAULT_EVALUATION);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [selectedStudent]);

  const radarValues = STAT_KEYS.map((k) => evaluation[k]);

  function handleSliderChange(key: keyof EvaluationData, value: number) {
    setEvaluation((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    if (!selectedStudent) return;
    startSave(async () => {
      const result = await upsertEvaluation(selectedStudent.id, evaluation);
      if (result.success) {
        setFeedback({ type: "success", msg: "Évaluation enregistrée !" });
      } else {
        setFeedback({ type: "error", msg: result.error ?? "Erreur inconnue." });
      }
      setTimeout(() => setFeedback(null), 4000);
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
      {/* ── Left panel: Search + Student list ──────────────────────────── */}
      <div className="lg:col-span-2 space-y-4">
        {/* Search bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4 text-white/30"
            >
              <path
                fillRule="evenodd"
                d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Rechercher un élève…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] ring-1 ring-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-red-500/40 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/30 hover:text-white/60"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          )}
        </div>

        {/* Count */}
        <p className="text-[11px] text-white/30 uppercase tracking-widest font-medium">
          {filtered.length} élève{filtered.length !== 1 ? "s" : ""}
          {search.trim() ? " trouvé" + (filtered.length !== 1 ? "s" : "") : ""}
        </p>

        {/* Student list */}
        <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-6 h-6 text-white/20">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
              </div>
              <p className="text-white/30 text-sm">Aucun élève trouvé.</p>
            </div>
          ) : (
            filtered.map((student) => (
              <button
                key={student.id}
                onClick={() => setSelectedStudent(student)}
                className={`w-full text-left p-3 rounded-xl transition-all duration-150 ${
                  selectedStudent?.id === student.id
                    ? "bg-red-500/10 ring-1 ring-red-500/30"
                    : "bg-white/[0.02] ring-1 ring-white/5 hover:bg-white/[0.04] hover:ring-white/10"
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-red-500/20 ring-1 ring-red-500/30 flex items-center justify-center flex-shrink-0">
                    {student.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={student.avatar_url}
                        alt=""
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <span className="text-xs font-bold text-red-300 uppercase">
                        {student.pseudo.charAt(0)}
                      </span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {student.pseudo}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {student.grade && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-300 ring-1 ring-red-400/15">
                          {student.grade}
                        </span>
                      )}
                      {student.divisions.map((div) => (
                        <span key={div} className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/15">
                          {div}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Chevron */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className={`w-4 h-4 flex-shrink-0 transition-colors ${
                      selectedStudent?.id === student.id
                        ? "text-red-400"
                        : "text-white/10"
                    }`}
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Right panel: Radar chart + sliders ─────────────────────────── */}
      <div className="lg:col-span-3">
        {selectedStudent ? (
          loading ? (
            <div className="flex items-center justify-center py-24 rounded-2xl bg-white/[0.01] ring-1 ring-white/5">
              <div className="w-6 h-6 rounded-full border-2 border-red-400 border-t-transparent animate-spin" />
            </div>
          ) : (
            <div className="rounded-2xl bg-white/[0.02] ring-1 ring-white/8 p-6 space-y-5 animate-fade-in">
              {/* Student header */}
              <div className="flex items-center gap-4">
                <div className="relative flex-shrink-0">
                  <div className="absolute inset-0 rounded-full bg-red-500/20 blur-md" />
                  <div className="relative w-14 h-14 rounded-full overflow-hidden ring-2 ring-red-500/30 bg-white/5 flex items-center justify-center">
                    {selectedStudent.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={selectedStudent.avatar_url}
                        alt=""
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <span className="text-xl font-bold text-red-300 uppercase">
                        {selectedStudent.pseudo.charAt(0)}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {selectedStudent.pseudo}
                  </h3>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {selectedStudent.grade && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-red-500/10 text-red-300 ring-1 ring-red-400/15 font-semibold">
                        {selectedStudent.grade}
                      </span>
                    )}
                    {selectedStudent.grade_role && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 ring-1 ring-purple-400/15 font-semibold">
                        {selectedStudent.grade_role}
                      </span>
                    )}
                    {selectedStudent.divisions.map((div) => (
                      <span key={div} className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/15 font-semibold">
                        Div. {div}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Separator */}
              <div className="h-px bg-gradient-to-r from-red-500/20 via-white/8 to-transparent" />

              {/* Radar Chart */}
              <div className="py-2">
                <h4 className="text-xs text-white/40 uppercase tracking-widest font-semibold mb-4 text-center">
                  Évaluation des compétences
                </h4>
                <RadarChart labels={AXES_LABELS} values={radarValues} />
              </div>

              {/* Stat sliders */}
              <div className="space-y-4">
                {STAT_KEYS.map((key, i) => (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs text-white/50 font-medium">{AXES_LABELS[i]}</label>
                      <span className="text-sm font-bold text-red-300 tabular-nums w-8 text-right">{evaluation[key]}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={20}
                      step={1}
                      value={evaluation[key]}
                      onChange={(e) => handleSliderChange(key, Number(e.target.value))}
                      className="w-full h-1.5 rounded-full appearance-none bg-white/10 accent-red-500 cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-400 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-red-500/30"
                    />
                  </div>
                ))}
              </div>

              {/* Feedback */}
              {feedback && (
                <div className={`text-sm px-3 py-2 rounded-lg ${feedback.type === "success" ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20" : "bg-red-500/10 text-red-400 ring-1 ring-red-500/20"}`}>
                  {feedback.msg}
                </div>
              )}

              {/* Save button */}
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
              >
                {saving ? "Enregistrement…" : "Enregistrer l'évaluation"}
              </button>
            </div>
          )
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4 rounded-2xl bg-white/[0.01] ring-1 ring-white/5">
            <div className="w-16 h-16 rounded-2xl bg-red-500/5 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                className="w-8 h-8 text-red-400/30"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
                />
              </svg>
            </div>
            <div className="space-y-1">
              <p className="text-white/40 text-sm font-medium">
                Sélectionnez un élève
              </p>
              <p className="text-white/20 text-xs">
                Choisissez un élève dans la liste pour évaluer ses compétences.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
