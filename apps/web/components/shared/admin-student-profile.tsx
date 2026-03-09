"use client";

import { useState, useEffect, useTransition } from "react";
import { RadarChart } from "./radar-chart";
import {
  getMoyenneEvaluations,
  getEvaluationsIndividuelles,
  supprimerEvaluationIndividuelleAdmin,
  type MoyenneEvaluations,
  type EvalIndividuelleRow,
} from "@/app/(dashboard)/administration/admin-actions";
import type { AdminStudent } from "./admin-panel";

// ─── Competence labels ────────────────────────────────────────────────────────

const COMPETENCE_LABELS: Record<string, string> = {
  maitrise_energie_occulte: "Maîtrise Énergie Occulte",
  sang_froid: "Sang Froid",
  discipline: "Discipline",
  intelligence_tactique: "Intelligence Tactique",
  travail_equipe: "Travail d'équipe",
  premiers_soin: "Premiers Soins",
  combat: "Combat",
  initiative: "Initiative",
  connaissance_theorique: "Connaissance Théorique",
  pedagogie: "Pédagogie",
};

const RADAR_LABELS = Object.values(COMPETENCE_LABELS);
const RADAR_KEYS = Object.keys(COMPETENCE_LABELS);

// ─── Component ────────────────────────────────────────────────────────────────

export function StudentProfilePanel({
  student,
  canViewEvalHistory = true,
}: {
  student: AdminStudent;
  canViewEvalHistory?: boolean;
}) {
  const [moyenne, setMoyenne] = useState<MoyenneEvaluations | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [history, setHistory] = useState<EvalIndividuelleRow[]>([]);
  const [loadingMoyenne, setLoadingMoyenne] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Fetch average evaluations
  useEffect(() => {
    let cancelled = false;
    setLoadingMoyenne(true);
    setHistoryOpen(false);
    setHistory([]);

    getMoyenneEvaluations(student.id).then((data) => {
      if (!cancelled) {
        setMoyenne(data);
        setLoadingMoyenne(false);
      }
    });

    return () => { cancelled = true; };
  }, [student.id]);

  function handleOpenHistory() {
    setHistoryOpen(true);
    setLoadingHistory(true);

    startTransition(async () => {
      const data = await getEvaluationsIndividuelles(student.id);
      setHistory(data);
      setLoadingHistory(false);
    });
  }

  function handleDeleteEval(evalId: string) {
    setDeletingId(evalId);
    startTransition(async () => {
      const result = await supprimerEvaluationIndividuelleAdmin(evalId);
      if (result.success) {
        setHistory((prev) => prev.filter((e) => e.id !== evalId));
      }
      setDeletingId(null);
    });
  }

  const rpName = [student.prenom_rp, student.nom_rp].filter(Boolean).join(" ");

  const radarValues = moyenne
    ? RADAR_KEYS.map((k) => moyenne[k as keyof MoyenneEvaluations] as number)
    : null;

  // ── Info rows ───────────────────────────────────────────────────────
  const infoRows: [string, string | null][] = [
    ["Nom RP", rpName || null],
    ["Grade", student.grade],
    ["Rôle", student.grade_role],
    ["Niveau académique", student.grade_secondaire],
    ["Divisions", student.divisions.length > 0 ? student.divisions.join(", ") : null],
    ["Sort Inné", student.sort_inne],
    ["Spécialité", student.specialite],
    ["Art Martial", student.art_martial],
    ["Reliques", student.reliques],
    ["Sub-Jutsu", student.sub_jutsu],
    ["Style de combat", student.style_combat],
  ];

  return (
    <div className="rounded-2xl bg-white/[0.02] ring-1 ring-white/8 p-6 space-y-5 animate-fade-in">
      {/* ── Student header ─────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0">
          <div className="absolute inset-0 rounded-full bg-red-500/20 blur-md" />
          <div className="relative w-14 h-14 rounded-full overflow-hidden ring-2 ring-red-500/30 bg-white/5 flex items-center justify-center">
            {student.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={student.avatar_url} alt="" className="object-cover w-full h-full" />
            ) : (
              <span className="text-xl font-bold text-red-300 uppercase">{student.pseudo.charAt(0)}</span>
            )}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-white">{student.pseudo}</h3>
          {rpName && <p className="text-xs text-white/40">{rpName}</p>}
          <div className="flex flex-wrap gap-1.5 mt-1">
            {student.grade && (
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-red-500/10 text-red-300 ring-1 ring-red-400/15 font-semibold">
                {student.grade}
              </span>
            )}
            {student.grade_role && (
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 ring-1 ring-purple-400/15 font-semibold">
                {student.grade_role}
              </span>
            )}
            {student.grade_secondaire && (
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/15 font-semibold">
                {student.grade_secondaire}
              </span>
            )}
            {student.divisions.map((div) => (
              <span key={div} className="text-[10px] px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-300 ring-1 ring-orange-400/15 font-semibold">
                Div. {div}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="h-px bg-gradient-to-r from-red-500/20 via-white/8 to-transparent" />

      {/* ── Student info grid ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
        {infoRows.map(([label, value]) => (
          <div key={label} className="flex justify-between py-1.5 border-b border-white/5">
            <span className="text-xs text-white/40">{label}</span>
            <span className="text-xs text-white/80 font-medium text-right max-w-[60%] truncate">
              {value ?? <span className="text-white/20">—</span>}
            </span>
          </div>
        ))}
      </div>

      <div className="h-px bg-gradient-to-r from-red-500/20 via-white/8 to-transparent" />

      {/* ── Average evaluation score ───────────────────────────────── */}
      {!canViewEvalHistory ? (
        <div className="text-center py-6">
          <p className="text-white/30 text-sm">Accès aux évaluations réservé à l'équipe professorale.</p>
        </div>
      ) : loadingMoyenne ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-5 h-5 rounded-full border-2 border-red-400 border-t-transparent animate-spin" />
        </div>
      ) : moyenne ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs text-white/40 uppercase tracking-widest font-semibold">
              Moyenne des évaluations
            </h4>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-red-300">{moyenne.moyenne_globale * 5}/100</span>
              <span className="text-[10px] text-white/30">({moyenne.nombre_evaluations} éval.)</span>
            </div>
          </div>

          {/* Radar chart */}
          {radarValues && <RadarChart labels={RADAR_LABELS} values={radarValues} />}

          {/* Stat bars */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {RADAR_KEYS.map((key, i) => (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white/40">{RADAR_LABELS[i]}</span>
                  <span className="text-[10px] font-bold text-red-300 tabular-nums">
                    {(moyenne[key as keyof MoyenneEvaluations] as number) * 5}/100
                  </span>
                </div>
                <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-red-600 to-orange-500 transition-all duration-500"
                    style={{ width: `${(moyenne[key as keyof MoyenneEvaluations] as number) * 5}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-6">
          <p className="text-white/30 text-sm">Aucune évaluation radar enregistrée.</p>
        </div>
      )}

      {canViewEvalHistory && (
        <>
          <div className="h-px bg-gradient-to-r from-red-500/20 via-white/8 to-transparent" />

          {/* ── View evaluation history button ─────────────────────────── */}
          {!historyOpen ? (
            <button
          onClick={handleOpenHistory}
          className="w-full py-2.5 rounded-xl bg-red-600/20 hover:bg-red-600/30 text-red-300 text-sm font-semibold transition-colors ring-1 ring-red-500/20 flex items-center justify-center gap-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Zm2.25 8.5a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Zm0 3a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Z" clipRule="evenodd" />
          </svg>
          Voir l&apos;historique des évaluations
        </button>
      ) : (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h4 className="text-xs text-white/40 uppercase tracking-widest font-semibold">
              Historique des évaluations individuelles
            </h4>
            <button
              onClick={() => setHistoryOpen(false)}
              className="text-xs text-white/30 hover:text-white/60 transition-colors"
            >
              Fermer
            </button>
          </div>

          {loadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 rounded-full border-2 border-red-400 border-t-transparent animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-white/30 text-sm text-center py-4">
              Aucune évaluation individuelle enregistrée.
            </p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {history.map((ev) => (
                <div
                  key={ev.id}
                  className="p-3 rounded-xl bg-white/[0.03] ring-1 ring-white/5 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/10 text-red-300 ring-1 ring-red-400/15 font-semibold">
                        {COMPETENCE_LABELS[ev.competence] ?? ev.competence}
                      </span>
                      <span className="text-sm font-bold text-red-300">{ev.note * 5}/100</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-white/30">
                        {new Date(ev.cree_le).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      {canViewEvalHistory && (
                        <button
                          onClick={() => handleDeleteEval(ev.id)}
                          disabled={deletingId === ev.id}
                          title="Supprimer cette évaluation"
                          className="p-1 rounded-lg bg-red-500/10 text-red-400/60 hover:bg-red-500/20 hover:text-red-400 ring-1 ring-red-500/20 transition-all disabled:opacity-40"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3">
                            <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.711Z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                  {ev.commentaire && (
                    <p className="text-xs text-white/60 leading-relaxed">{ev.commentaire}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full overflow-hidden bg-red-500/20 flex items-center justify-center flex-shrink-0">
                      {ev.evaluateur.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={ev.evaluateur.avatar_url} alt="" className="object-cover w-full h-full" />
                      ) : (
                        <span className="text-[8px] font-bold text-red-300 uppercase">
                          {ev.evaluateur.pseudo.charAt(0)}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-white/40">
                      Évalué par {ev.evaluateur.pseudo}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
        </>
      )}
    </div>
  );
}
