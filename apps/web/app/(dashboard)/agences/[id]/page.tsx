import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getAgence } from "../actions";
import { AgenceDetail } from "./agence-detail";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("agences").select("nom").eq("id", id).single();
  return {
    title: data
      ? `${(data as { nom: string }).nom} — Agences · GestionHokkaido`
      : "Agence introuvable · GestionHokkaido",
  };
}

export default async function AgenceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { agence, membres, stagiaires, missions, error } = await getAgence(id);

  if (!agence || error === "Agence introuvable") {
    notFound();
  }

  const { data: _utilisateur } = await supabase
    .from("utilisateurs")
    .select("id, role, grade_role, grade_secondaire")
    .eq("id", user.id)
    .single();

  const utilisateur = _utilisateur as {
    id: string;
    role: string;
    grade_role: string | null;
    grade_secondaire: string | null;
  } | null;

  const EXO_PRO_PLUS_ROLES = [
    "Exorciste Pro",
    "Professeur",
    "Professeur Principal",
    "Co-Directeur",
    "Directeur",
  ];

  const isExoProPlus = EXO_PRO_PLUS_ROLES.includes(utilisateur?.grade_role ?? "");
  const isAdmin = utilisateur?.role === "admin";

  const monMembership = membres.find(
    (m: { utilisateur_id: string; role_agence: string }) => m.utilisateur_id === user.id
  );

  const estMembre = !!monMembership;
  const estFondateur = monMembership?.role_agence === "fondateur";

  return (
    <AgenceDetail
      agence={agence as {
        id: string;
        nom: string;
        description: string | null;
        url_logo: string | null;
        url_banniere: string | null;
        fondateur_id: string;
        site_id: string | null;
        est_inter_ecole: boolean;
        cree_le: string;
      }}
      membres={membres as Array<{
        id: string;
        agence_id: string;
        utilisateur_id: string;
        role_agence: string;
        cree_le: string;
        utilisateurs: {
          id: string;
          pseudo: string;
          avatar_url: string | null;
          grade_role: string | null;
          site_id: string | null;
        } | null;
      }>}
      stagiaires={stagiaires as Array<{
        id: string;
        agence_id: string;
        utilisateur_id: string;
        parrain_id: string;
        debut: string;
        fin: string | null;
        utilisateurs: {
          id: string;
          pseudo: string;
          avatar_url: string | null;
          grade_secondaire: string | null;
          site_id: string | null;
        } | null;
        parrain: {
          id: string;
          pseudo: string;
        } | null;
      }>}
      missions={missions as Array<{
        id: string;
        titre: string;
        statut: string;
        points_recompense: number;
        date_heure: string | null;
        cree_le: string;
        delegation_escouade_id: string | null;
      }>}
      userId={user.id}
      estMembre={estMembre}
      estFondateur={estFondateur}
      isExoProPlus={isExoProPlus}
      isAdmin={isAdmin}
    />
  );
}
