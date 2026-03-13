import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogisticsPageContent } from "@/components/shared/logistics-page-content";
import { DonationHistoryTable } from "@/components/shared/donation-history-table";
import {
  getLogisticsPageData,
  getUtilisateursOptions,
  getDonsLogistique,
  getStudentsWithDonationStats,
  getAllLogisticsItems,
  getGlobalBonusCap,
} from "./actions";
import { DIVISION_PRODUCTION_LOGISTICS } from "@/lib/logistics/config";
import { isConseilMember } from "@/app/(dashboard)/conseil/conseil-actions";

// ─── Page ─────────────────────────────────────────────────────────────────────

export const metadata = {
  title: "Production & Logistique",
};

export default async function ProductionLogistiquePage() {
  const supabase = await createClient();

  // 1. Auth guard
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 2. Division guard — réservé aux membres de "Production et Logistique", admins, et directeurs
  const { data: utilisateur } = await supabase
    .from("utilisateurs")
    .select("role, grade_role")
    .eq("id", user.id)
    .single();

  const isAdminOrDirector =
    (utilisateur as any)?.role === "admin" ||
    (utilisateur as any)?.grade_role === "Directeur" ||
    (utilisateur as any)?.grade_role === "Co-Directeur";

  // Check P&L division membership (needed for page access, admin tab, supervision)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: divRow } = await (supabase.from("utilisateur_divisions") as any)
    .select("id, role_division")
    .eq("utilisateur_id", user.id)
    .eq("division", DIVISION_PRODUCTION_LOGISTICS)
    .limit(1);

  const isProdLogMember = (divRow?.length ?? 0) > 0;
  const isProdLogSuperviseur =
    isProdLogMember && (divRow?.[0] as any)?.role_division === "superviseur";

  // Vérifier si l'utilisateur est membre du conseil (accès lecture seule)
  const isConseil = await isConseilMember(user.id);

  if (!isAdminOrDirector && !isProdLogMember && !isConseil) {
    redirect("/profil");
  }

  // 3. Logistics Admin check — Admin, Directeur, Co-Directeur, Professeur+P&L, ou Superviseur P&L
  const isLogisticsAdmin =
    isAdminOrDirector ||
    ((utilisateur as any)?.role === "professeur" && isProdLogMember) ||
    isProdLogSuperviseur;

  // 4. Supervision P&L — Directeur, Co-Directeur, ou Superviseur P&L
  const isSupervisionPL = isAdminOrDirector || isProdLogSuperviseur;

  // 5. Données initiales (config admin chargée uniquement si autorisé)
  const [{ logisticsPoints, bonusPersonnel }, utilisateurs, dons, studentStats, globalBonusCap, allItems] =
    await Promise.all([
      getLogisticsPageData(),
      getUtilisateursOptions(),
      getDonsLogistique(),
      getStudentsWithDonationStats(),
      getGlobalBonusCap(),
      isLogisticsAdmin ? getAllLogisticsItems() : Promise.resolve([]),
    ]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="relative min-h-screen bg-[#0a0505] overflow-hidden">
      {/* Ambient glows */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 select-none">
        <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-amber-700/10 blur-[120px]" />
        <div className="absolute -bottom-40 -right-16 w-[520px] h-[520px] rounded-full bg-emerald-600/8 blur-[140px]" />
      </div>

      {/* Noise */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundRepeat: "repeat",
          backgroundSize: "160px",
        }}
      />

    <main className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-fade-in">

      {/* Breadcrumb */}
      <p className="text-xs text-white/25 uppercase tracking-widest font-medium">
        École d&apos;Exorcisme de Hokkaido&nbsp;&nbsp;/&nbsp;&nbsp;Production &amp; Logistique
      </p>

      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
            {/* Crate / box icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              className="w-4 h-4 text-amber-400"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            <span className="bg-gradient-to-r from-amber-400 to-emerald-400 bg-clip-text text-transparent">
              Production
            </span>
            {" "}&amp; Logistique
          </h1>
        </div>
        <p className="text-sm text-white/40 ml-11">
          Enregistrez les ressources, blueprints et objets craftés reçus des
          étudiants. Chaque soumission accumule vos points logistique, dont 5 %
          (plafonné à {globalBonusCap} pts) sont reversés à vos points personnels.
        </p>
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-amber-500/30 via-white/10 to-transparent" />

      {/* Form + stats (tabbed with admin config if authorized) */}
      <LogisticsPageContent
        isAdmin={isLogisticsAdmin}
        isSupervision={isSupervisionPL}
        initialLogisticsPoints={logisticsPoints}
        initialBonusPersonnel={bonusPersonnel}
        utilisateurs={utilisateurs}
        initialDons={dons}
        globalBonusCap={globalBonusCap}
        allItems={allItems}
      />

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-amber-500/30 via-white/10 to-transparent" />

      {/* Student donation history */}
      <DonationHistoryTable students={studentStats} />
    </main>
    </div>
  );
}
