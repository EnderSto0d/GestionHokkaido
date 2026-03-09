"use client";

import { useState, useTransition, useMemo, useCallback, useEffect, useRef } from "react";
import type { StudentDonationSummary, DonLogistique } from "@/app/(dashboard)/production-logistique/actions";
import { getDonsForStudent } from "@/app/(dashboard)/production-logistique/actions";

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  students: StudentDonationSummary[];
};

type SortKey = "pseudo" | "logistics_points" | "total_dons" | "total_points_donnes";
type SortDir = "asc" | "desc";

// ─── Component ────────────────────────────────────────────────────────────────

export function DonationHistoryTable({ students }: Props) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("pseudo");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Modal state
  const [selectedStudent, setSelectedStudent] = useState<StudentDonationSummary | null>(null);
  const [studentDons, setStudentDons] = useState<DonLogistique[]>([]);
  const [isLoadingDons, startLoadingDons] = useTransition();
  const modalRef = useRef<HTMLDivElement>(null);

  // Filter students by search
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const list = q
      ? students.filter(
          (s) =>
            s.pseudo.toLowerCase().includes(q) ||
            (s.grade ?? "").toLowerCase().includes(q)
        )
      : students;

    // Sort
    return [...list].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "pseudo":
          cmp = a.pseudo.localeCompare(b.pseudo, "fr");
          break;
        case "logistics_points":
          cmp = a.logistics_points - b.logistics_points;
          break;
        case "total_dons":
          cmp = a.total_dons - b.total_dons;
          break;
        case "total_points_donnes":
          cmp = a.total_points_donnes - b.total_points_donnes;
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [students, search, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "pseudo" ? "asc" : "desc");
    }
  }

  const openStudentModal = useCallback(
    (student: StudentDonationSummary) => {
      setSelectedStudent(student);
      setStudentDons([]);
      startLoadingDons(async () => {
        const dons = await getDonsForStudent(student.id);
        setStudentDons(dons);
      });
    },
    []
  );

  function closeModal() {
    setSelectedStudent(null);
    setStudentDons([]);
  }

  // Close modal on Escape
  useEffect(() => {
    if (!selectedStudent) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeModal();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedStudent]);

  // Close modal on backdrop click
  function handleBackdropClick(e: React.MouseEvent) {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      closeModal();
    }
  }

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return <span className="text-white/15 ml-1">↕</span>;
    return <span className="text-red-400 ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  return (
    <>
      <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-6 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-white">
              Historique par étudiant
            </h2>
            <p className="mt-1 text-sm text-white/40">
              {filtered.length} étudiant{filtered.length !== 1 ? "s" : ""} — cliquez pour voir le détail des dons.
            </p>
          </div>
          {/* Search */}
          <input
            type="text"
            placeholder="Rechercher un étudiant…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-64 rounded-xl bg-white/[0.05] border border-white/10 text-white text-sm px-4 py-2 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 placeholder:text-white/25"
          />
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <p className="text-sm text-white/30 py-6 text-center">
            Aucun étudiant trouvé.
          </p>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8">
                  <th
                    onClick={() => toggleSort("pseudo")}
                    className="text-left py-2 pr-4 text-[11px] font-semibold text-white/30 uppercase tracking-widest cursor-pointer hover:text-white/50 select-none"
                  >
                    Étudiant{sortIcon("pseudo")}
                  </th>
                  <th className="text-left py-2 pr-4 text-[11px] font-semibold text-white/30 uppercase tracking-widest hidden sm:table-cell">
                    Grade
                  </th>
                  <th
                    onClick={() => toggleSort("logistics_points")}
                    className="text-right py-2 pr-4 text-[11px] font-semibold text-white/30 uppercase tracking-widest cursor-pointer hover:text-white/50 select-none"
                  >
                    Pts Logistique{sortIcon("logistics_points")}
                  </th>
                  <th
                    onClick={() => toggleSort("total_dons")}
                    className="text-right py-2 pr-4 text-[11px] font-semibold text-white/30 uppercase tracking-widest cursor-pointer hover:text-white/50 select-none hidden md:table-cell"
                  >
                    Nb Dons{sortIcon("total_dons")}
                  </th>
                  <th
                    onClick={() => toggleSort("total_points_donnes")}
                    className="text-right py-2 text-[11px] font-semibold text-white/30 uppercase tracking-widest cursor-pointer hover:text-white/50 select-none"
                  >
                    Pts Donnés{sortIcon("total_points_donnes")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr
                    key={s.id}
                    onClick={() => openStudentModal(s)}
                    className="border-b border-white/5 hover:bg-white/[0.03] transition-colors cursor-pointer group"
                  >
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-red-500/10 ring-1 ring-red-400/20 flex items-center justify-center text-[10px] font-bold text-red-300 flex-shrink-0 overflow-hidden">
                          {s.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={s.avatar_url} alt="" className="object-cover w-full h-full" />
                          ) : (
                            s.pseudo.charAt(0).toUpperCase()
                          )}
                        </div>
                        <span className="text-white/80 font-medium group-hover:text-red-300 transition-colors truncate max-w-[160px]">
                          {s.pseudo}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 hidden sm:table-cell">
                      {s.grade ? (
                        <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-red-500/10 text-red-300 ring-1 ring-red-400/15">
                          {s.grade}
                        </span>
                      ) : (
                        <span className="text-white/20">—</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-right text-white/60 font-mono text-xs">
                      {s.logistics_points.toLocaleString("fr-FR")}
                    </td>
                    <td className="py-2.5 pr-4 text-right text-white/50 hidden md:table-cell">
                      {s.total_dons}
                    </td>
                    <td className="py-2.5 text-right text-amber-400 font-medium font-mono text-xs">
                      {s.total_points_donnes > 0 ? `+${s.total_points_donnes.toLocaleString("fr-FR")}` : "0"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Student Detail Modal ──────────────────────────────────────── */}
      {selectedStudent && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={handleBackdropClick}
        >
          <div
            ref={modalRef}
            className="relative w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl bg-[#0a1628] border border-white/10 shadow-2xl flex flex-col"
          >
            {/* Modal header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-white/8 flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-red-500/10 ring-1 ring-red-400/20 flex items-center justify-center text-sm font-bold text-red-300 flex-shrink-0 overflow-hidden">
                {selectedStudent.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selectedStudent.avatar_url} alt="" className="object-cover w-full h-full" />
                ) : (
                  selectedStudent.pseudo.charAt(0).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-white truncate">
                  {selectedStudent.pseudo}
                </h3>
                <p className="text-xs text-white/40">
                  {selectedStudent.grade ?? "Aucun grade"} — {selectedStudent.total_dons} don{selectedStudent.total_dons !== 1 ? "s" : ""} enregistré{selectedStudent.total_dons !== 1 ? "s" : ""}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>

            {/* Stats summary */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 px-6 py-4 border-b border-white/8 flex-shrink-0">
              <div className="rounded-xl bg-white/[0.03] border border-white/6 px-4 py-3">
                <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest">Pts Logistique</p>
                <p className="text-xl font-bold text-white mt-0.5">
                  {selectedStudent.logistics_points.toLocaleString("fr-FR")}
                </p>
              </div>
              <div className="rounded-xl bg-white/[0.03] border border-white/6 px-4 py-3">
                <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest">Bonus Personnel</p>
                <p className="text-xl font-bold text-emerald-400 mt-0.5">
                  +{selectedStudent.bonus_personnel.toLocaleString("fr-FR")}
                </p>
              </div>
              <div className="rounded-xl bg-white/[0.03] border border-white/6 px-4 py-3 col-span-2 sm:col-span-1">
                <p className="text-[10px] font-semibold text-white/25 uppercase tracking-widest">Total Pts Donnés</p>
                <p className="text-xl font-bold text-amber-400 mt-0.5">
                  +{selectedStudent.total_points_donnes.toLocaleString("fr-FR")}
                </p>
              </div>
            </div>

            {/* Donations list */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {isLoadingDons ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-5 h-5 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                  <span className="ml-3 text-sm text-white/40">Chargement…</span>
                </div>
              ) : studentDons.length === 0 ? (
                <p className="text-sm text-white/30 py-8 text-center">
                  Aucun don enregistré pour cet étudiant.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/8">
                      <th className="text-left py-2 pr-3 text-[11px] font-semibold text-white/30 uppercase tracking-widest">Item</th>
                      <th className="text-right py-2 pr-3 text-[11px] font-semibold text-white/30 uppercase tracking-widest">Qté</th>
                      <th className="text-right py-2 pr-3 text-[11px] font-semibold text-white/30 uppercase tracking-widest">Points</th>
                      <th className="text-left py-2 pr-3 text-[11px] font-semibold text-white/30 uppercase tracking-widest hidden sm:table-cell">Enregistré par</th>
                      <th className="text-left py-2 text-[11px] font-semibold text-white/30 uppercase tracking-widest">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentDons.map((don) => (
                      <tr key={don.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="py-2 pr-3 text-white/70">{don.item_label}</td>
                        <td className="py-2 pr-3 text-right text-white/50">{don.quantite}</td>
                        <td className="py-2 pr-3 text-right text-amber-400 font-medium">
                          {don.points_gagnes > 0 ? `+${don.points_gagnes}` : "0"}
                        </td>
                        <td className="py-2 pr-3 text-white/40 hidden sm:table-cell">{don.enregistre_par_pseudo}</td>
                        <td className="py-2 text-white/30 whitespace-nowrap text-xs">
                          {new Date(don.created_at).toLocaleDateString("fr-FR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
