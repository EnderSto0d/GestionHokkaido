import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/shared/logout-button";
import { DIVISION_PRODUCTION_LOGISTICS } from "@/lib/logistics/config";

// ─── Types ────────────────────────────────────────────────────────────────────

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  badge?: number;
};

type NavSection = {
  label: string;
  items: NavItem[];
};

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconUser() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  );
}

function IconScroll() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c-4.5 1.8-8 3-8 9 0 5.4 4.8 9 8 9s8-3.6 8-9c0-6-3.5-7.2-8-9Z" />
    </svg>
  );
}

function IconTrophy() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0" />
    </svg>
  );
}

function IconSword() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 4.5 7.5 7.5-7.5 7.5m-6-15 7.5 7.5-7.5 7.5" />
    </svg>
  );
}

function IconCouncil() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
    </svg>
  );
}

function IconCog() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

function IconChart() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  );
}

function IconInfo() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
    </svg>
  );
}

function IconCrate() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
    </svg>
  );
}

// ─── Composant NavLink (client pour activer le style actif) ──────────────────

import { NavLink } from "@/components/shared/nav-link";
import { InvitationToastListener } from "@/components/shared/invitation-toast";
import { RealtimeRefresh } from "@/components/shared/realtime-refresh";
import { PostAuthRedirect } from "@/components/shared/post-auth-redirect";

// ─── Layout principal ─────────────────────────────────────────────────────────

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: _utilisateur } = await supabase
    .from("utilisateurs")
    .select("pseudo, avatar_url, role, grade_role")
    .eq("id", user.id)
    .single();

  const utilisateur = _utilisateur as {
    pseudo: string;
    avatar_url: string | null;
    role: string;
    grade_role: string | null;
  } | null;

  const isProfOrAdmin =
    utilisateur?.role === "professeur" || utilisateur?.role === "admin";

  // Vérifier si l'utilisateur fait partie de la division Stratégie (multi-divisions)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: divStrategie } = await (supabase.from("utilisateur_divisions") as any)
    .select("id")
    .eq("utilisateur_id", user.id)
    .eq("division", "Stratégie")
    .limit(1);

  const isStrategie = (divStrategie?.length ?? 0) > 0;
  const canSeeStaffSection = isProfOrAdmin || isStrategie;

  // Vérifier si l'utilisateur fait partie de la division Production et Logistique
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: divProdLog } = await (supabase.from("utilisateur_divisions") as any)
    .select("id")
    .eq("utilisateur_id", user.id)
    .eq("division", DIVISION_PRODUCTION_LOGISTICS)
    .limit(1);

  const isAdminOrDirector =
    utilisateur?.role === "admin" ||
    utilisateur?.grade_role === "Directeur" ||
    utilisateur?.grade_role === "Co-Directeur";

  const isProductionLogistique = (divProdLog?.length ?? 0) > 0 || isAdminOrDirector;

  // Compter les invitations en attente
  const { count: pendingInvitations } = await supabase
    .from("invitations_escouade")
    .select("id", { count: "exact", head: true })
    .eq("utilisateur_id", user.id)
    .eq("statut", "en_attente");

  // ── Navigation groupée par sections ──────────────────────────────────
  const navSections: NavSection[] = [
    {
      label: "Navigation",
      items: [
        { href: "/profil", label: "Mon Profil", icon: <IconUser />, badge: pendingInvitations ?? 0 },
        { href: "/escouades", label: "Escouades", icon: <IconShield /> },
        { href: "/classement", label: "Classement", icon: <IconTrophy /> },
        { href: "/conseil", label: "Conseil", icon: <IconCouncil /> },
        { href: "/missions", label: "Missions", icon: <IconSword /> },
        { href: "/info", label: "Guide", icon: <IconInfo /> },
      ],
    },
    ...(canSeeStaffSection
      ? [
          {
            label: "Équipe Professorale",
            items: [
              { href: "/administration", label: "Administration", icon: <IconCog />, adminOnly: true },
              { href: "/evaluation", label: "Évaluation", icon: <IconChart />, adminOnly: true },
            ],
          },
        ]
      : []),
    ...(isProductionLogistique
      ? [
          {
            label: "Division",
            items: [
              { href: "/production-logistique", label: "Production & Logistique", icon: <IconCrate /> },
            ],
          },
        ]
      : []),
  ];

  // Flat list for mobile nav
  const allNavItems = navSections.flatMap((s) => s.items);

  return (
    <div className="relative min-h-screen bg-[#0a0505] flex">

      {/* ── Sidebar desktop ─────────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 fixed top-0 left-0 h-full z-20 bg-[#0a0505]/80 backdrop-blur-xl border-r border-white/5">

        {/* Logo TJH */}
        <div className="px-5 py-5 border-b border-white/5">
          <Link href="/profil" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-red-500/30 blur-md" />
              <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-red-500/50 to-orange-600/30 ring-1 ring-white/10 flex items-center justify-center">
                <span className="text-sm font-black text-red-300 tracking-tighter">TJH</span>
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-white tracking-tight group-hover:text-red-300 transition-colors">Hokkaido Jujutsu High</p>
              <p className="text-[10px] text-white/30 uppercase tracking-widest">Intranet Scolaire</p>
            </div>
          </Link>
        </div>

        {/* Navigation sectionnée */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-5">
          {navSections.map((section) => (
            <div key={section.label}>
              <p className="px-3 mb-2 text-[10px] font-semibold text-white/20 uppercase tracking-[0.15em]">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink key={item.href} href={item.href} adminOnly={item.adminOnly} badge={item.badge}>
                    {item.icon}
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Séparateur décoratif */}
        <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />

        {/* Utilisateur + logout */}
        <div className="px-3 py-4 space-y-2">
          <Link href="/profil" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.03] transition-all group">
            <div className="relative flex-shrink-0">
              <div className="relative w-9 h-9 rounded-full overflow-hidden bg-red-500/20 ring-2 ring-red-500/30 flex items-center justify-center">
                {utilisateur?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={utilisateur.avatar_url}
                    alt="Avatar"
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <span className="text-xs font-bold text-red-300 uppercase">
                    {utilisateur?.pseudo?.charAt(0) ?? "?"}
                  </span>
                )}
              </div>
              {/* Online indicator */}
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-red-500 ring-2 ring-[#0a0505]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white/80 truncate group-hover:text-white transition-colors">
                {utilisateur?.pseudo ?? "Utilisateur"}
              </p>
              <p className="text-[10px] text-white/30 uppercase tracking-wide">
                {utilisateur?.role === "admin"
                  ? "Administrateur"
                  : utilisateur?.role === "professeur"
                  ? "Professeur"
                  : "Élève"}
              </p>
            </div>
          </Link>
          <LogoutButton />
        </div>
      </aside>

      {/* ── Toast notifications for new invitations ──────────────────── */}
      <InvitationToastListener userId={user.id} />

      {/* ── Post-auth redirect (fallback sessionStorage) ─────────────── */}
      <PostAuthRedirect />

      {/* ── Realtime : rafraîchit la page sur tout changement en BDD ── */}
      <RealtimeRefresh />

      {/* ── Main content ────────────────────────────────────────────────── */}
      <div className="flex-1 lg:pl-64 pb-20 lg:pb-0">
        {children}
      </div>

      {/* ── Bottom nav mobile ────────────────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-20 bg-[#0a0505]/90 backdrop-blur-xl border-t border-white/5 flex items-center justify-around px-1 py-2 safe-area-pb">
        {allNavItems.slice(0, canSeeStaffSection ? 7 : 5).map((item) => (
          <NavLink key={item.href} href={item.href} mobile adminOnly={item.adminOnly} badge={item.badge}>
            {item.icon}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
