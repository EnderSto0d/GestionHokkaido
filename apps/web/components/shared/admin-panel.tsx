"use client";

import { useState, useMemo, useTransition } from "react";
import { StudentProfilePanel } from "./admin-student-profile";
import {
  changerGradeSecondaire,
  promouvoirExorcistePro,
  retrograderEleve,
  setAllSansGradeEnSeconde,
  syncGradesFromDiscord,
} from "@/app/(dashboard)/administration/admin-actions";
import type { GradeSecondaire } from "@/types/database";

// ─── Types ────────────────────────────────────────────────────────────────────

export type AdminStudent = {
  id: string;
  pseudo: string;
  avatar_url: string | null;
  grade: string | null;
  grade_role: string | null;
  grade_secondaire: string | null;
  divisions: string[];
  sort_inne: string | null;
  specialite: string | null;
  art_martial: string | null;
  prenom_rp: string | null;
  nom_rp: string | null;
  reliques: string | null;
  sub_jutsu: string | null;
  style_combat: string | null;
  discord_id: string;
  clan?: string | null;
};

type Tab = "search" | "list";

type SortKey = "pseudo" | "grade" | "grade_secondaire" | "sort_inne" | "specialite" | "grade_role" | "clan";

// ─── Grade power order (ascending) ──────────────────────────────────────────────

const GRADE_POWER_ORDER: string[] = [
  "Classe 4",
  "Classe 3",
  "Semi Classe 2",
  "Classe 2",
  "Semi Classe 1",
  "Classe 1",
  "Semi Classe S",
  "Classe S",
  "Classe Apo",
];

// ─── Grade role importance order (ascending: least → most important) ──────────

const GRADE_ROLE_ORDER: string[] = [
  "Élève Exorciste",
  "Exorciste Pro",
  "Professeur",
  "Professeur Principal",
  "Co-Directeur",
  "Directeur",
];

// ─── Grade secondaire ordered levels for level-up/down ────────────────────────

const GRADE_SECONDAIRE_ORDER: GradeSecondaire[] = ["Seconde", "Première", "Terminal"];

function getNextGrade(current: GradeSecondaire | null): GradeSecondaire | null {
  if (!current) return "Première";
  const idx = GRADE_SECONDAIRE_ORDER.indexOf(current);
  if (idx < 0 || idx >= GRADE_SECONDAIRE_ORDER.length - 1) return null;
  return GRADE_SECONDAIRE_ORDER[idx + 1];
}

function getPrevGrade(current: GradeSecondaire | null): GradeSecondaire | null {
  if (!current) return null;
  const idx = GRADE_SECONDAIRE_ORDER.indexOf(current);
  if (idx <= 0) return null;
  return GRADE_SECONDAIRE_ORDER[idx - 1];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AdminPanel({
  students,
  canManageLevels = true,
  canViewAll = false,
  isDirector = false,
  currentUserRole = "eleve",
  currentUserGradeRole = null,
}: {
  students: AdminStudent[];
  canManageLevels?: boolean;
  canViewAll?: boolean;
  isDirector?: boolean;
  currentUserRole?: string;
  currentUserGradeRole?: string | null;
}) {
  // Permissions for points history — canViewAll allows read-only access (e.g. conseil members)
  const canViewPointsHistory = canManageLevels || canViewAll;
  const canCancelPoints =
    currentUserRole === "admin" ||
    currentUserGradeRole === "Professeur Principal" ||
    currentUserGradeRole === "Directeur" ||
    currentUserGradeRole === "Co-Directeur";
  const [tab, setTab] = useState<Tab>("search");
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<AdminStudent | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("pseudo");
  const [sortAsc, setSortAsc] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // ── Local mutable state for optimistic updates ──────────────────────
  const [localStudents, setLocalStudents] = useState(students);

  // ── Search filter ───────────────────────────────────────────────────
  const filteredStudents = useMemo(() => {
    if (!search.trim()) return localStudents;
    const term = search.toLowerCase();
    return localStudents.filter(
      (s) =>
        s.pseudo.toLowerCase().includes(term) ||
        s.prenom_rp?.toLowerCase().includes(term) ||
        s.nom_rp?.toLowerCase().includes(term) ||
        s.grade?.toLowerCase().includes(term) ||
        s.sort_inne?.toLowerCase().includes(term) ||
        s.divisions.some((d) => d.toLowerCase().includes(term)) ||
        s.specialite?.toLowerCase().includes(term) ||
        s.clan?.toLowerCase().includes(term)
    );
  }, [localStudents, search]);

  // ── Sorted for list tab ─────────────────────────────────────────────
  const sortedStudents = useMemo(() => {
    const arr = [...filteredStudents];
    arr.sort((a, b) => {
      let cmp: number;
      if (sortKey === "grade") {
        const aIdx = GRADE_POWER_ORDER.indexOf(a.grade ?? "");
        const bIdx = GRADE_POWER_ORDER.indexOf(b.grade ?? "");
        // Unknown grades go to the end
        const aN = aIdx === -1 ? GRADE_POWER_ORDER.length : aIdx;
        const bN = bIdx === -1 ? GRADE_POWER_ORDER.length : bIdx;
        cmp = aN - bN;
      } else if (sortKey === "grade_role") {
        const aIdx = GRADE_ROLE_ORDER.indexOf(a.grade_role ?? "");
        const bIdx = GRADE_ROLE_ORDER.indexOf(b.grade_role ?? "");
        const aN = aIdx === -1 ? GRADE_ROLE_ORDER.length : aIdx;
        const bN = bIdx === -1 ? GRADE_ROLE_ORDER.length : bIdx;
        cmp = aN - bN;
      } else if (sortKey === "clan") {
        const aVal = a.clan ?? "";
        const bVal = b.clan ?? "";
        cmp = aVal.localeCompare(bVal, "fr");
      } else {
        const aVal = (a[sortKey] ?? "") as string;
        const bVal = (b[sortKey] ?? "") as string;
        cmp = aVal.localeCompare(bVal, "fr");
      }
      return sortAsc ? cmp : -cmp;
    });
    return arr;
  }, [filteredStudents, sortKey, sortAsc]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  function showFeedback(type: "success" | "error", msg: string) {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 4000);
  }

  // ── Bulk: set tous les sans grade en Seconde ───────────────────────

  function handleSetAllSansGrade() {
    const sansGrade = localStudents.filter((s) => !s.grade_secondaire && (s.grade_role === "Élève Exorciste" || !s.grade_role));
    if (sansGrade.length === 0) {
      showFeedback("error", "Aucun utilisateur sans grade académique.");
      return;
    }
    if (!confirm(`Mettre ${sansGrade.length} utilisateur(s) sans grade académique en Seconde ?`)) return;

    // Optimistic update
    setLocalStudents((prev) =>
      prev.map((s) =>
        !s.grade_secondaire && (s.grade_role === "Élève Exorciste" || !s.grade_role)
          ? { ...s, grade_secondaire: "Seconde" }
          : s
      )
    );

    startTransition(async () => {
      const result = await setAllSansGradeEnSeconde();
      if (!result.success) {
        // Rollback
        setLocalStudents(students);
        showFeedback("error", result.error);
      } else {
        showFeedback("success", `${result.count ?? sansGrade.length} utilisateur(s) mis en Seconde.`);
      }
    });
  }

  // ── Bulk: sync all grades from Discord roles ──────────────────────

  function handleSyncGradesFromDiscord() {
    if (!confirm("Synchroniser les grades secondaires (Seconde/Première/Terminal) de TOUS les utilisateurs avec leurs rôles Discord ?\n\nLes grades seront ajoutés, modifiés ou retirés selon les rôles Discord actuels.")) return;

    startTransition(async () => {
      const result = await syncGradesFromDiscord();
      if (!result.success) {
        showFeedback("error", result.error);
      } else {
        const parts: string[] = [];
        if (result.synced) parts.push(`${result.synced} mis à jour`);
        if (result.removed) parts.push(`${result.removed} retiré(s)`);
        if (result.errors) parts.push(`${result.errors} erreur(s)`);
        showFeedback("success", parts.length > 0 ? `Sync terminée : ${parts.join(", ")}.` : "Tous les grades sont déjà à jour.");
        // Refresh local state
        window.location.reload();
      }
    });
  }

  // ── Level management actions ────────────────────────────────────────

  function handleLevelUp(student: AdminStudent) {
    const current = student.grade_secondaire as GradeSecondaire | null;
    const next = getNextGrade(current);
    if (!next) return;

    // Optimistic update
    setLocalStudents((prev) =>
      prev.map((s) => (s.id === student.id ? { ...s, grade_secondaire: next } : s))
    );

    startTransition(async () => {
      const result = await changerGradeSecondaire(student.id, next);
      if (!result.success) {
        // Rollback
        setLocalStudents((prev) =>
          prev.map((s) => (s.id === student.id ? { ...s, grade_secondaire: current } : s))
        );
        showFeedback("error", result.error);
      } else {
        showFeedback("success", `${student.pseudo} promu(e) en ${next}.`);
      }
    });
  }

  function handleLevelDown(student: AdminStudent) {
    const current = student.grade_secondaire as GradeSecondaire | null;
    const prev = getPrevGrade(current);
    if (!prev) return;

    setLocalStudents((prevStudents) =>
      prevStudents.map((s) => (s.id === student.id ? { ...s, grade_secondaire: prev } : s))
    );

    startTransition(async () => {
      const result = await changerGradeSecondaire(student.id, prev);
      if (!result.success) {
        setLocalStudents((prevStudents) =>
          prevStudents.map((s) => (s.id === student.id ? { ...s, grade_secondaire: current } : s))
        );
        showFeedback("error", result.error);
      } else {
        showFeedback("success", `${student.pseudo} rétrogradé(e) en ${prev}.`);
      }
    });
  }

  function handlePromoteExoPro(student: AdminStudent) {
    setLocalStudents((prev) =>
      prev.map((s) =>
        s.id === student.id
          ? { ...s, grade_role: "Exorciste Pro", grade_secondaire: null }
          : s
      )
    );

    startTransition(async () => {
      const result = await promouvoirExorcistePro(student.id);
      if (!result.success) {
        setLocalStudents((prev) =>
          prev.map((s) =>
            s.id === student.id
              ? { ...s, grade_role: student.grade_role, grade_secondaire: student.grade_secondaire }
              : s
          )
        );
        showFeedback("error", result.error);
      } else {
        showFeedback("success", `${student.pseudo} promu(e) Exorciste Pro !`);
      }
    });
  }

  function handleDemoteToStudent(student: AdminStudent) {
    setLocalStudents((prev) =>
      prev.map((s) =>
        s.id === student.id
          ? { ...s, grade_role: "Élève Exorciste", grade_secondaire: "Seconde" }
          : s
      )
    );

    startTransition(async () => {
      const result = await retrograderEleve(student.id);
      if (!result.success) {
        setLocalStudents((prev) =>
          prev.map((s) =>
            s.id === student.id
              ? { ...s, grade_role: student.grade_role, grade_secondaire: student.grade_secondaire }
              : s
          )
        );
        showFeedback("error", result.error);
      } else {
        showFeedback("success", `${student.pseudo} rétrogradé(e) en Élève Exorciste.`);
      }
    });
  }

  // ─── Tabs UI ──────────────────────────────────────────────────────────

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    {
      key: "search",
      label: "Recherche Profil",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
        </svg>
      ),
    },
    {
      key: "list",
      label: "Liste Élèves",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path fillRule="evenodd" d="M6 4.75A.75.75 0 0 1 6.75 4h10.5a.75.75 0 0 1 0 1.5H6.75A.75.75 0 0 1 6 4.75ZM6 10a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H6.75A.75.75 0 0 1 6 10Zm0 5.25a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H6.75a.75.75 0 0 1-.75-.75ZM1.99 4.75a1 1 0 0 1 1-1h.01a1 1 0 0 1 0 2h-.01a1 1 0 0 1-1-1Zm1 5.25a1 1 0 0 0-1 1v.01a1 1 0 0 0 2 0V11a1 1 0 0 0-1-1Zm-1 6.25a1 1 0 0 1 1-1h.01a1 1 0 0 1 0 2h-.01a1 1 0 0 1-1-1Z" clipRule="evenodd" />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Tab bar ────────────────────────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              setTab(t.key);
              setSelectedStudent(null);
            }}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              tab === t.key
                ? "bg-red-600/20 text-red-300 ring-1 ring-red-500/30"
                : "bg-white/[0.03] text-white/50 ring-1 ring-white/5 hover:bg-white/[0.06] hover:text-white/70"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Global feedback ────────────────────────────────────────────── */}
      {feedback && (
        <div
          className={`text-sm px-4 py-2.5 rounded-xl animate-fade-in ${
            feedback.type === "success"
              ? "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20"
              : "bg-red-500/10 text-red-400 ring-1 ring-red-500/20"
          }`}
        >
          {feedback.msg}
        </div>
      )}

      {/* ── TAB: Student Profile Search ────────────────────────────────── */}
      {tab === "search" && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 animate-fade-in">
          {/* Left: Search */}
          <div className="lg:col-span-2 space-y-4">
            <SearchBar value={search} onChange={setSearch} />

            <p className="text-[11px] text-white/30 uppercase tracking-widest font-medium">
              {filteredStudents.length} utilisateur{filteredStudents.length !== 1 ? "s" : ""}
              {search.trim() ? " trouvé" + (filteredStudents.length !== 1 ? "s" : "") : ""}
            </p>

            <div className="space-y-1.5 max-h-[580px] overflow-y-auto pr-1">
              {filteredStudents.length === 0 ? (
                <EmptyState message="Aucun utilisateur trouvé." />
              ) : (
                filteredStudents.map((s) => (
                  <StudentCard
                    key={s.id}
                    student={s}
                    selected={selectedStudent?.id === s.id}
                    onClick={() => setSelectedStudent(s)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Right: Student profile detail */}
          <div className="lg:col-span-3">
            {selectedStudent ? (
              <StudentProfilePanel student={selectedStudent} canViewEvalHistory={canManageLevels || canViewAll} canViewPointsHistory={canViewPointsHistory} canCancelPoints={canCancelPoints} />
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-center gap-4 rounded-2xl bg-white/[0.01] ring-1 ring-white/5">
                <div className="w-16 h-16 rounded-2xl bg-red-500/5 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-8 h-8 text-red-400/30">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <p className="text-white/40 text-sm font-medium">Sélectionnez un élève</p>
                  <p className="text-white/20 text-xs">Choisissez un élève pour consulter son profil complet et son historique d&apos;évaluations.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: Student List with Level Management ────────────────────── */}
      {tab === "list" && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex-1">
              <SearchBar value={search} onChange={setSearch} />
            </div>
            {canManageLevels && (
              <button
                onClick={handleSetAllSansGrade}
                disabled={isPending}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20 hover:bg-emerald-500/20 disabled:opacity-50 transition-all whitespace-nowrap"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-4 h-4">
                  <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
                </svg>
                Set sans grade → Seconde
              </button>
            )}
            {canManageLevels && (
              <button
                onClick={handleSyncGradesFromDiscord}
                disabled={isPending}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium bg-[#5865F2]/10 text-[#8b9dff] ring-1 ring-[#5865F2]/20 hover:bg-[#5865F2]/20 disabled:opacity-50 transition-all whitespace-nowrap"
              >
                {isPending ? (
                  <div className="w-4 h-4 rounded-full border-2 border-[#8b9dff] border-t-transparent animate-spin" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                  </svg>
                )}
                {isPending ? "Synchronisation…" : "Sync grades Discord"}
              </button>
            )}
          </div>

          <p className="text-[11px] text-white/30 uppercase tracking-widest font-medium">
            {sortedStudents.length} utilisateur{sortedStudents.length !== 1 ? "s" : ""}
          </p>

          {/* Table */}
          <div className="rounded-xl ring-1 ring-white/8 bg-white/[0.02] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-white/8">
                    {([
                      ["pseudo", "Pseudo"],
                      ["grade", "Grade"],
                      ["grade_role", "Rôle"],
                      ["grade_secondaire", "Niveau"],
                    ] as [SortKey, string][]).map(([key, label]) => (
                      <th
                        key={key}
                        onClick={() => toggleSort(key)}
                        className="px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-widest cursor-pointer hover:text-white/70 transition-colors select-none whitespace-nowrap"
                      >
                        <div className="flex items-center gap-1">
                          {label}
                          {sortKey === key && (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className={`w-3 h-3 text-red-400 transition-transform ${!sortAsc ? "rotate-180" : ""}`}>
                              <path fillRule="evenodd" d="M11.78 9.78a.75.75 0 0 1-1.06 0L8 7.06 5.28 9.78a.75.75 0 0 1-1.06-1.06l3.25-3.25a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06Z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-widest whitespace-nowrap">
                      Actions
                    </th>
                    {([
                      ["clan", "Clan"],
                      ["sort_inne", "Sort Inné"],
                      ["specialite", "Spécialité"],
                    ] as [SortKey, string][]).map(([key, label]) => (
                      <th
                        key={key}
                        onClick={() => toggleSort(key)}
                        className="px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-widest cursor-pointer hover:text-white/70 transition-colors select-none whitespace-nowrap"
                      >
                        <div className="flex items-center gap-1">
                          {label}
                          {sortKey === key && (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className={`w-3 h-3 text-red-400 transition-transform ${!sortAsc ? "rotate-180" : ""}`}>
                              <path fillRule="evenodd" d="M11.78 9.78a.75.75 0 0 1-1.06 0L8 7.06 5.28 9.78a.75.75 0 0 1-1.06-1.06l3.25-3.25a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06Z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-xs font-semibold text-white/40 uppercase tracking-widest whitespace-nowrap">
                      Divisions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStudents.map((student) => {
                    const isEleve = student.grade_role === "Élève Exorciste" || !student.grade_role;
                    const isExoPro = student.grade_role === "Exorciste Pro";
                    const isDirecteurOrCo = student.grade_role === "Directeur" || student.grade_role === "Co-Directeur";
                    const isProfesseur = student.grade_role === "Professeur";
                    const currentGrade = student.grade_secondaire as GradeSecondaire | null;
                    const canLevelUp = isEleve && getNextGrade(currentGrade) !== null;
                    const canLevelDown = isEleve && getPrevGrade(currentGrade) !== null;
                    const canPromoteExoPro = isEleve && currentGrade === "Terminal";
                    // Directeur/Co-Directeur can demote anyone except other directors
                    const canDemote = isDirector
                      ? (isExoPro || isProfesseur || (isEleve && currentGrade !== "Seconde"))
                      : isExoPro;
                    const showLevelActions = canManageLevels;

                    return (
                      <tr key={student.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full overflow-hidden bg-red-500/20 ring-1 ring-red-500/30 flex items-center justify-center flex-shrink-0">
                              {student.avatar_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={student.avatar_url} alt="" className="object-cover w-full h-full" />
                              ) : (
                                <span className="text-[10px] font-bold text-red-300 uppercase">{student.pseudo.charAt(0)}</span>
                              )}
                            </div>
                            <span className="text-white font-medium truncate max-w-[140px]">{student.pseudo}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {student.grade ? (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/10 text-red-300 ring-1 ring-red-400/15 font-semibold whitespace-nowrap">
                              {student.grade}
                            </span>
                          ) : (
                            <span className="text-white/20">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {student.grade_role ? (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 ring-1 ring-purple-400/15 font-semibold whitespace-nowrap">
                              {student.grade_role}
                            </span>
                          ) : (
                            <span className="text-white/20">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {student.grade_secondaire ? (
                            <span className={`text-[10px] px-2 py-0.5 rounded font-semibold whitespace-nowrap ${
                              student.grade_secondaire === "Terminal"
                                ? "bg-amber-500/10 text-amber-300 ring-1 ring-amber-400/15"
                                : student.grade_secondaire === "Première"
                                ? "bg-orange-500/10 text-orange-300 ring-1 ring-orange-400/15"
                                : "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/15"
                            }`}>
                              {student.grade_secondaire}
                            </span>
                          ) : (
                            <span className="text-white/20">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {/* Level up */}
                            {showLevelActions && canLevelUp && (
                              <button
                                onClick={() => handleLevelUp(student)}
                                disabled={isPending}
                                title={`Promouvoir en ${getNextGrade(currentGrade)}`}
                                className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20 hover:bg-emerald-500/20 disabled:opacity-50 transition-all"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                                  <path fillRule="evenodd" d="M11.78 9.78a.75.75 0 0 1-1.06 0L8 7.06 5.28 9.78a.75.75 0 0 1-1.06-1.06l3.25-3.25a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06Z" clipRule="evenodd" />
                                </svg>
                              </button>
                            )}

                            {/* Level down */}
                            {showLevelActions && canLevelDown && (
                              <button
                                onClick={() => handleLevelDown(student)}
                                disabled={isPending}
                                title={`Rétrograder en ${getPrevGrade(currentGrade)}`}
                                className="p-1.5 rounded-lg bg-red-500/10 text-red-400 ring-1 ring-red-500/20 hover:bg-red-500/20 disabled:opacity-50 transition-all"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 rotate-180">
                                  <path fillRule="evenodd" d="M11.78 9.78a.75.75 0 0 1-1.06 0L8 7.06 5.28 9.78a.75.75 0 0 1-1.06-1.06l3.25-3.25a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06Z" clipRule="evenodd" />
                                </svg>
                              </button>
                            )}

                            {/* Promote to Exorciste Pro */}
                            {showLevelActions && canPromoteExoPro && (
                              <button
                                onClick={() => handlePromoteExoPro(student)}
                                disabled={isPending}
                                title="Promouvoir Exorciste Pro"
                                className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20 hover:bg-amber-500/20 disabled:opacity-50 transition-all"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                                  <path d="M7.628 1.099a.75.75 0 0 1 .744 0l5.25 3a.75.75 0 0 1 0 1.302l-5.25 3a.75.75 0 0 1-.744 0l-5.25-3a.75.75 0 0 1 0-1.302l5.25-3Z" />
                                  <path d="m2.57 7.75-.32.183a.75.75 0 0 0 0 1.302l5.25 3a.75.75 0 0 0 .744 0l5.25-3a.75.75 0 0 0 0-1.302l-.32-.183-4.558 2.605a1.75 1.75 0 0 1-1.736 0L2.57 7.749Z" />
                                </svg>
                              </button>
                            )}

                            {/* Demote from Exorciste Pro */}
                            {showLevelActions && canDemote && (
                              <button
                                onClick={() => handleDemoteToStudent(student)}
                                disabled={isPending}
                                title="Rétrograder en Élève"
                                className="p-1.5 rounded-lg bg-red-500/10 text-red-400 ring-1 ring-red-500/20 hover:bg-red-500/20 disabled:opacity-50 transition-all"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 rotate-180">
                                  <path d="M7.628 1.099a.75.75 0 0 1 .744 0l5.25 3a.75.75 0 0 1 0 1.302l-5.25 3a.75.75 0 0 1-.744 0l-5.25-3a.75.75 0 0 1 0-1.302l5.25-3Z" />
                                  <path d="m2.57 7.75-.32.183a.75.75 0 0 0 0 1.302l5.25 3a.75.75 0 0 0 .744 0l5.25-3a.75.75 0 0 0 0-1.302l-.32-.183-4.558 2.605a1.75 1.75 0 0 1-1.736 0L2.57 7.749Z" />
                                </svg>
                              </button>
                            )}

                            {/* View profile button */}
                            <button
                              onClick={() => {
                                setSelectedStudent(student);
                                setTab("search");
                              }}
                              title="Voir le profil"
                              className="p-1.5 rounded-lg bg-red-500/10 text-red-400 ring-1 ring-red-500/20 hover:bg-red-500/20 transition-all"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5">
                                <path d="M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
                                <path fillRule="evenodd" d="M1.38 8.28a.87.87 0 0 1 0-.566 7.003 7.003 0 0 1 13.24.002.87.87 0 0 1 0 .566A7.003 7.003 0 0 1 1.38 8.28ZM11 8a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {student.clan ? (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 ring-1 ring-rose-400/15 font-semibold whitespace-nowrap">
                              {student.clan}
                            </span>
                          ) : (
                            <span className="text-white/20">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-white/60 text-xs whitespace-nowrap">{student.sort_inne ?? "—"}</td>
                        <td className="px-4 py-3 text-white/60 text-xs whitespace-nowrap">{student.specialite ?? "—"}</td>
                        <td className="px-4 py-3 text-white/60 text-xs whitespace-nowrap">{student.divisions.length > 0 ? student.divisions.join(", ") : "\u2014"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white/30">
          <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
        </svg>
      </div>
      <input
        type="text"
        placeholder="Rechercher par nom, grade, sort inné, division…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.04] ring-1 ring-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-red-500/40 transition-all"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/30 hover:text-white/60"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      )}
    </div>
  );
}

function StudentCard({
  student,
  selected,
  onClick,
}: {
  student: AdminStudent;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl transition-all duration-150 ${
        selected
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
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-300 ring-1 ring-red-400/15">{student.grade}</span>
            )}
            {student.grade_role && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-300 ring-1 ring-purple-400/15">{student.grade_role}</span>
            )}
            {student.grade_secondaire && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-400/15">{student.grade_secondaire}</span>
            )}
            {student.divisions.map((div) => (
              <span key={div} className="text-[9px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-300 ring-1 ring-orange-400/15">{div}</span>
            ))}
          </div>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`w-4 h-4 flex-shrink-0 transition-colors ${selected ? "text-red-400" : "text-white/10"}`}
        >
          <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
        </svg>
      </div>
    </button>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-6 h-6 text-white/20">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
        </svg>
      </div>
      <p className="text-white/30 text-sm">{message}</p>
    </div>
  );
}
