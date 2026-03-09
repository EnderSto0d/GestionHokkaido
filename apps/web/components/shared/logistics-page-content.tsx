"use client";

import { useState } from "react";
import { LogisticsForm } from "@/components/shared/logistics-form";
import { LogisticsAdminConfig } from "@/components/shared/logistics-admin-config";
import type { UtilisateurOption, DonLogistique, LogisticsItemRow } from "@/app/(dashboard)/production-logistique/actions";

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  isAdmin: boolean;
  // Donation form props
  initialLogisticsPoints: number;
  initialBonusPersonnel: number;
  utilisateurs: UtilisateurOption[];
  initialDons: DonLogistique[];
  globalBonusCap: number;
  // Admin config props (only loaded when isAdmin)
  allItems: LogisticsItemRow[];
};

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = "dons" | "config";

export function LogisticsPageContent({
  isAdmin,
  initialLogisticsPoints,
  initialBonusPersonnel,
  utilisateurs,
  initialDons,
  globalBonusCap,
  allItems,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("dons");

  return (
    <div className="space-y-6">

      {/* Tab switcher — only visible for admins */}
      {isAdmin && (
        <div className="flex gap-1 rounded-xl bg-white/[0.03] border border-white/8 p-1">
          <TabButton
            active={activeTab === "dons"}
            onClick={() => setActiveTab("dons")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
            </svg>
            Enregistrement
          </TabButton>
          <TabButton
            active={activeTab === "config"}
            onClick={() => setActiveTab("config")}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
            Configuration
          </TabButton>
        </div>
      )}

      {/* Tab content */}
      {activeTab === "dons" ? (
        <LogisticsForm
          initialLogisticsPoints={initialLogisticsPoints}
          initialBonusPersonnel={initialBonusPersonnel}
          utilisateurs={utilisateurs}
          initialDons={initialDons}
          globalBonusCap={globalBonusCap}
        />
      ) : isAdmin ? (
        <LogisticsAdminConfig
          items={allItems}
          globalBonusCap={globalBonusCap}
        />
      ) : null}
    </div>
  );
}

// ─── Tab button sub-component ─────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
        active
          ? "bg-amber-500/15 text-amber-200 shadow-sm shadow-amber-900/10 border border-amber-500/20"
          : "text-white/40 hover:text-white/60 hover:bg-white/[0.03] border border-transparent"
      }`}
    >
      {children}
    </button>
  );
}
