import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import GuideWiki from "./guide-wiki";

export const metadata: Metadata = {
  title: "Guide du Site — GestionHokkaido",
  description: "Guide complet du fonctionnement de l'Intranet de l'École d'Exorcisme de Hokkaido.",
};

/* ─── Role badge mapping ────────────────────────────────────────────────────── */

function roleBadge(role: string) {
  switch (role) {
    case "admin":
      return { label: "Administrateur", color: "bg-red-500/20 text-red-300 ring-red-500/20" };
    case "professeur":
      return { label: "Professeur", color: "bg-purple-500/20 text-purple-300 ring-purple-500/20" };
    default:
      return { label: "Élève", color: "bg-emerald-500/20 text-emerald-300 ring-emerald-500/20" };
  }
}

/* ─── Page ──────────────────────────────────────────────────────────────────── */

export default async function InfoPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: utilisateur } = await supabase
    .from("utilisateurs")
    .select("pseudo, role")
    .eq("id", user.id)
    .single();

  const role = (utilisateur as { pseudo: string; role: string } | null)?.role ?? "eleve";

  // Vérifier si l'utilisateur fait partie de la division Stratégie
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: divStrategie } = await (supabase.from("utilisateur_divisions") as any)
    .select("id")
    .eq("utilisateur_id", user.id)
    .eq("division", "Stratégie")
    .limit(1);

  const isStrategie = (divStrategie?.length ?? 0) > 0;
  const isProfOrAdmin = role === "professeur" || role === "admin";
  const canSeeStaff = isProfOrAdmin || isStrategie;
  const isAdmin = role === "admin";

  const badge = roleBadge(role);

  return (
    <GuideWiki
      role={role}
      isStrategie={isStrategie}
      isProfOrAdmin={isProfOrAdmin}
      canSeeStaff={canSeeStaff}
      isAdmin={isAdmin}
      badgeLabel={badge.label}
      badgeColor={badge.color}
    />
  );
}
