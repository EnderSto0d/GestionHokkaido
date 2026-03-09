"use client";

import { useState } from "react";
import { IndividualEvaluationForm } from "./individual-evaluation-form";
import { SquadEvaluation } from "./squad-evaluation";
import { PersonalPointsForm } from "./personal-points-form";

// ─── Types ────────────────────────────────────────────────────────────────────

type Student = {
  id: string;
  pseudo: string;
  avatar_url: string | null;
  grade: string | null;
  grade_role: string | null;
  divisions: string[];
};

type Escouade = {
  id: string;
  nom: string;
  points: number;
  url_logo: string | null;
};

type Tab = "individual" | "squad" | "personal-points";

// ─── Component ────────────────────────────────────────────────────────────────

export function EvaluationTabsClient({
  students,
  escouades,
}: {
  students: Student[];
  escouades: Escouade[];
}) {
  const [tab, setTab] = useState<Tab>("individual");

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    {
      key: "individual",
      label: "Évaluation Individuelle",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path d="M10 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.465 14.493a1.23 1.23 0 0 0 .41 1.412A9.957 9.957 0 0 0 10 18c2.31 0 4.438-.784 6.131-2.1.43-.333.604-.903.408-1.41a7.002 7.002 0 0 0-13.074.003Z" />
        </svg>
      ),
    },
    {
      key: "squad",
      label: "Évaluation Escouade",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path d="M10 1a6 6 0 0 0-3.815 10.631C7.237 12.5 8 13.443 8 14.5v.5h4v-.5c0-1.057.763-2 1.815-2.869A6 6 0 0 0 10 1ZM8.5 18a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1H9a.5.5 0 0 1-.5-.5ZM8 16.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5Z" />
        </svg>
      ),
    },
    {
      key: "personal-points",
      label: "Points Personnels",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path d="M10.75 10.818v2.614A3.13 3.13 0 0 0 11.888 13c.482-.315.612-.648.612-.875 0-.227-.13-.56-.612-.875a3.13 3.13 0 0 0-1.138-.432ZM8.33 8.62c.053.055.115.11.184.164.208.16.46.284.736.363V6.603c-.482.315-.612.648-.612.875 0 .227.13.56.612.875a2.94 2.94 0 0 0-.184.164.996.996 0 0 0-.736.103ZM10 2a.75.75 0 0 1 .75.75v.217a4.63 4.63 0 0 1 2.415 1.12.75.75 0 1 1-1.005 1.114 3.13 3.13 0 0 0-1.41-.674v2.55a4.63 4.63 0 0 1 2.415 1.12.75.75 0 0 1 0 1.06 4.63 4.63 0 0 1-2.415 1.12v2.55c.541-.16 1.017-.417 1.41-.674a.75.75 0 1 1 1.005 1.114 4.63 4.63 0 0 1-2.415 1.12v.217a.75.75 0 0 1-1.5 0v-.217a4.63 4.63 0 0 1-2.415-1.12.75.75 0 1 1 1.005-1.114c.393.257.87.514 1.41.674v-2.55a4.63 4.63 0 0 1-2.415-1.12.75.75 0 0 1 0-1.06 4.63 4.63 0 0 1 2.415-1.12v-2.55A3.13 3.13 0 0 0 8.17 5.2a.75.75 0 1 1-1.005-1.114A4.63 4.63 0 0 1 9.25 2.967V2.75A.75.75 0 0 1 10 2Z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Tab bar */}
      <div className="flex gap-2 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
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

      {/* Tab content */}
      {tab === "individual" && (
        <div className="animate-fade-in">
          <IndividualEvaluationForm students={students} />
        </div>
      )}

      {tab === "squad" && (
        <div className="animate-fade-in">
          <SquadEvaluation escouades={escouades} />
        </div>
      )}

      {tab === "personal-points" && (
        <div className="animate-fade-in">
          <PersonalPointsForm students={students} />
        </div>
      )}
    </div>
  );
}
