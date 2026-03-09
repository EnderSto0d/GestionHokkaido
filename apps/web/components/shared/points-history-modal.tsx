"use client";

import { useState } from "react";

type HistoryEntry = {
  id: string;
  points: number;
  justification: string;
  source: string;
  cree_le: string;
  attribue_par_pseudo: string | null;
};

const SOURCE_LABELS: Record<string, { label: string; cls: string }> = {
  manuel: { label: "Professeur", cls: "bg-purple-500/15 text-purple-300 ring-purple-400/20" },
  logistique: { label: "Logistique", cls: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/20" },
  mission: { label: "Mission", cls: "bg-red-500/15 text-red-300 ring-red-400/20" },
};

function getSourceBadge(source: string) {
  return SOURCE_LABELS[source] ?? { label: source, cls: "bg-white/10 text-white/50 ring-white/15" };
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PointsHistoryModal({ history }: { history: HistoryEntry[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-amber-500/10 text-amber-300 ring-1 ring-amber-400/20 hover:bg-amber-500/20 transition-colors cursor-pointer"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
          <path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z" clipRule="evenodd" />
        </svg>
        Voir l&apos;historique
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Modal */}
          <div className="relative w-full max-w-lg max-h-[80vh] flex flex-col rounded-2xl bg-[#0a1628] ring-1 ring-white/10 shadow-2xl animate-fade-in">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-400">
                    <path fillRule="evenodd" d="M5.75 2a.75.75 0 0 1 .75.75V4h7V2.75a.75.75 0 0 1 1.5 0V4h.25A2.75 2.75 0 0 1 18 6.75v8.5A2.75 2.75 0 0 1 15.25 18H4.75A2.75 2.75 0 0 1 2 15.25v-8.5A2.75 2.75 0 0 1 4.75 4H5V2.75A.75.75 0 0 1 5.75 2Zm-1 5.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75Z" clipRule="evenodd" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-white">
                  Historique des Points Personnels
                </h3>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white/70 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-white/20">
                      <path fillRule="evenodd" d="M2 3.75A.75.75 0 0 1 2.75 3h11.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 3.75ZM2 7.5a.75.75 0 0 1 .75-.75h6.365a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 7.5ZM14 7a.75.75 0 0 1 .55.24l3.25 3.5a.75.75 0 1 1-1.1 1.02L14.75 9.56V17.25a.75.75 0 0 1-1.5 0V9.56L11.3 11.76a.75.75 0 1 1-1.1-1.02l3.25-3.5A.75.75 0 0 1 14 7ZM2 11.25a.75.75 0 0 1 .75-.75H7A.75.75 0 0 1 7 12H2.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-sm text-white/30">Aucun historique de points pour le moment.</p>
                </div>
              ) : (
                history.map((entry) => {
                  const badge = getSourceBadge(entry.source);
                  return (
                    <div
                      key={entry.id}
                      className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] ring-1 ring-white/5 hover:bg-white/[0.04] transition-colors"
                    >
                      {/* Points */}
                      <div className="flex-shrink-0 min-w-[52px] text-right">
                        <span className="text-base font-bold text-amber-400">
                          +{entry.points}
                        </span>
                      </div>

                      {/* Détails */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-md ring-1 ${badge.cls}`}>
                            {badge.label}
                          </span>
                          <span className="text-[10px] text-white/25">
                            {formatDate(entry.cree_le)}
                          </span>
                        </div>
                        {entry.justification && (
                          <p className="mt-1 text-xs text-white/50 leading-relaxed">
                            {entry.justification}
                          </p>
                        )}
                        {entry.attribue_par_pseudo && (
                          <p className="mt-0.5 text-[10px] text-white/25">
                            par {entry.attribue_par_pseudo}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-white/8 flex items-center justify-between">
              <p className="text-[10px] text-white/25">
                {history.length} entrée{history.length !== 1 ? "s" : ""}
              </p>
              <button
                onClick={() => setOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
