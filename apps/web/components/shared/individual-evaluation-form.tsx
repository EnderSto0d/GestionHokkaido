"use client";

import { useState, useMemo, useTransition } from "react";
import { creerEvaluationIndividuelle } from "@/app/(dashboard)/evaluation/actions";
import type { CompetenceKey } from "@/types/database";

// ─── Types ────────────────────────────────────────────────────────────────────

type Student = {
  id: string;
  pseudo: string;
  avatar_url: string | null;
  grade: string | null;
  grade_role: string | null;
  divisions: string[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

const COMPETENCES: { key: CompetenceKey; label: string; color: string }[] = [
  { key: "maitrise_energie_occulte", label: "Maîtrise Énergie Occulte", color: "bg-violet-500/15 text-violet-300 ring-violet-400/20" },
  { key: "sang_froid", label: "Sang Froid", color: "bg-red-500/15 text-orange-300 ring-orange-400/20" },
  { key: "discipline", label: "Discipline", color: "bg-orange-500/15 text-orange-300 ring-orange-400/20" },
  { key: "intelligence_tactique", label: "Intelligence Tactique", color: "bg-orange-500/15 text-orange-300 ring-orange-400/20" },
  { key: "travail_equipe", label: "Travail d'Équipe", color: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/20" },
  { key: "premiers_soin", label: "Premiers Soins", color: "bg-pink-500/15 text-pink-300 ring-pink-400/20" },
  { key: "combat", label: "Combat", color: "bg-red-500/15 text-red-300 ring-red-400/20" },
  { key: "initiative", label: "Initiative", color: "bg-yellow-500/15 text-yellow-300 ring-yellow-400/20" },
  { key: "connaissance_theorique", label: "Connaissance Théorique", color: "bg-indigo-500/15 text-indigo-300 ring-indigo-400/20" },
  { key: "pedagogie", label: "Pédagogie", color: "bg-teal-500/15 text-teal-300 ring-teal-400/20" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function IndividualEvaluationForm({ students }: { students: Student[] }) {
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedCompetence, setSelectedCompetence] = useState<CompetenceKey | null>(null);
  const [note, setNote] = useState(50);
  const [commentaire, setCommentaire] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [saving, startSave] = useTransition();

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

  const canSubmit =
    selectedStudent !== null &&
    selectedCompetence !== null &&
    commentaire.trim().length >= 3;

  function handleSubmit() {
    if (!canSubmit || !selectedCompetence) return;

    startSave(async () => {
      const result = await creerEvaluationIndividuelle({
        utilisateur_id: selectedStudent!.id,
        competence: selectedCompetence,
        note,
        commentaire: commentaire.trim(),
      });

      if (result.success) {
        setFeedback({ type: "success", msg: "Évaluation enregistrée avec succès !" });
        setCommentaire("");
        setSelectedCompetence(null);
        setNote(50);
      } else {
        setFeedback({ type: "error", msg: result.error ?? "Erreur inconnue." });
      }
      setTimeout(() => setFeedback(null), 4000);
    });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
      {/* ── Left: Student selection ─────────────────────────────────── */}
      <div className="lg:col-span-2 space-y-4">
        {/* Search */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white/30">
              <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
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
            <button onClick={() => setSearch("")} className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/30 hover:text-white/60">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          )}
        </div>

        <p className="text-[11px] text-white/30 uppercase tracking-widest font-medium">
          {filtered.length} élève{filtered.length !== 1 ? "s" : ""}
        </p>

        {/* Student list */}
        <div className="space-y-1.5 max-h-[520px] overflow-y-auto pr-1">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
              <p className="text-white/30 text-sm">Aucun élève trouvé.</p>
            </div>
          ) : (
            filtered.map((student) => (
              <button
                key={student.id}
                onClick={() => {
                  setSelectedStudent(student);
                  setSelectedCompetence(null);
                  setNote(50);
                  setCommentaire("");
                  setFeedback(null);
                }}
                className={`w-full text-left p-3 rounded-xl transition-all duration-150 ${
                  selectedStudent?.id === student.id
                    ? "bg-red-500/10 ring-1 ring-red-500/30"
                    : "bg-white/[0.02] ring-1 ring-white/5 hover:bg-white/[0.04] hover:ring-white/10"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-red-500/20 ring-1 ring-red-500/30 flex items-center justify-center flex-shrink-0">
                    {student.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={student.avatar_url} alt="" className="object-cover w-full h-full" />
                    ) : (
                      <span className="text-xs font-bold text-red-300 uppercase">{student.pseudo.charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{student.pseudo}</p>
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
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
                    className={`w-4 h-4 flex-shrink-0 transition-colors ${selectedStudent?.id === student.id ? "text-red-400" : "text-white/10"}`}>
                    <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                  </svg>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ── Right: Evaluation form ──────────────────────────────────── */}
      <div className="lg:col-span-3">
        {selectedStudent ? (
          <div className="rounded-2xl bg-white/[0.02] ring-1 ring-white/8 p-6 space-y-5 animate-fade-in">
            {/* Student header */}
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 rounded-full bg-red-500/20 blur-md" />
                <div className="relative w-14 h-14 rounded-full overflow-hidden ring-2 ring-red-500/30 bg-white/5 flex items-center justify-center">
                  {selectedStudent.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={selectedStudent.avatar_url} alt="" className="object-cover w-full h-full" />
                  ) : (
                    <span className="text-xl font-bold text-red-300 uppercase">{selectedStudent.pseudo.charAt(0)}</span>
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{selectedStudent.pseudo}</h3>
                <p className="text-xs text-white/40">Évaluation individuelle</p>
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-red-500/20 via-white/8 to-transparent" />

            {/* Step 1: Choose competence */}
            <div className="space-y-3">
              <h4 className="text-xs text-white/40 uppercase tracking-widest font-semibold">
                1. Choisissez une compétence
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {COMPETENCES.map((comp) => (
                  <button
                    key={comp.key}
                    onClick={() => setSelectedCompetence(comp.key)}
                    className={`flex items-center px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ring-1 text-left gap-2 ${
                      selectedCompetence === comp.key
                        ? `${comp.color} ring-current`
                        : "bg-white/[0.03] text-white/50 ring-white/8 hover:bg-white/[0.06]"
                    }`}
                  >
                    <span className="leading-snug">{comp.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Note /100 */}
            {selectedCompetence && (
              <div className="space-y-3 animate-fade-in">
                <h4 className="text-xs text-white/40 uppercase tracking-widest font-semibold">
                  2. Note <span className="normal-case text-white/20">/ 100</span>
                </h4>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={note}
                    onChange={(e) => setNote(Number(e.target.value))}
                    className="flex-1 accent-red-500"
                  />
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={note}
                    onChange={(e) => {
                      const v = parseInt(e.target.value);
                      if (!isNaN(v) && v >= 0 && v <= 100) setNote(v);
                    }}
                    className="w-20 text-center text-lg font-bold py-2 rounded-xl bg-white/[0.04] ring-1 ring-white/10 focus:outline-none focus:ring-red-500/40 transition-all text-red-300"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Comment (mandatory) */}
            {selectedCompetence && (
              <div className="space-y-3 animate-fade-in">
                <h4 className="text-xs text-white/40 uppercase tracking-widest font-semibold">
                  3. Commentaire <span className="normal-case text-white/20">(obligatoire, min. 3 caractères)</span>
                </h4>
                <textarea
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                  placeholder="Justification de cette évaluation…"
                  rows={3}
                  maxLength={2000}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.04] ring-1 ring-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-red-500/40 transition-all resize-none"
                />
                <p className="text-[10px] text-white/20">{commentaire.length}/2000 caractères</p>
              </div>
            )}

            {/* Summary */}
            {selectedCompetence && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 ring-1 ring-red-500/20 animate-fade-in">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-red-400 flex-shrink-0">
                  <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-300 font-medium">
                  <span className="font-bold">{COMPETENCES.find((c) => c.key === selectedCompetence)?.label}</span> — {note}/100
                </p>
              </div>
            )}

            {/* Feedback */}
            {feedback && (
              <div className={`text-sm px-3 py-2 rounded-lg ${feedback.type === "success" ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20" : "bg-red-500/10 text-red-400 ring-1 ring-red-500/20"}`}>
                {feedback.msg}
              </div>
            )}

            {/* Submit */}
            {selectedCompetence && (
              <button
                onClick={handleSubmit}
                disabled={saving || !canSubmit}
                className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold transition-colors"
              >
                {saving ? "Enregistrement…" : "Enregistrer l'évaluation"}
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4 rounded-2xl bg-white/[0.01] ring-1 ring-white/5">
            <div className="w-16 h-16 rounded-2xl bg-red-500/5 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-8 h-8 text-red-400/30">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
            </div>
            <div className="space-y-1">
              <p className="text-white/40 text-sm font-medium">Sélectionnez un élève</p>
              <p className="text-white/20 text-xs">Choisissez un élève, puis une compétence à évaluer.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
