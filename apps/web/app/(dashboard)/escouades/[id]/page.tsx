import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { EscouadeDetail, type Membre } from "@/components/shared/escouade-detail";

// ─── Explicit query result types (bypass PostgREST select-parser inference) ───
type PhotoSetting = { scale: number; posX: number; posY: number };
type PhotoSettings = {
  photo_1?: PhotoSetting;
  photo_2?: PhotoSetting;
  photo_3?: PhotoSetting;
};
type EscouadeRow = {
  id: string;
  nom: string;
  description: string | null;
  url_logo: string | null;
  url_banniere: string | null;
  url_photo_1: string | null;
  url_photo_2: string | null;
  url_photo_3: string | null;
  photo_settings: PhotoSettings | null;
  proprietaire_id: string;
  points: number;
};
type EscouadeNomRow = { nom: string };
type MembreRaw = {
  role_escouade: string;
  utilisateur_id: string;
  utilisateurs: {
    id: string;
    pseudo: string;
    avatar_url: string | null;
    prenom_rp: string | null;
    nom_rp: string | null;
  } | null;
};

// ─── Métadonnées dynamiques ───────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: _data } = await supabase
    .from("escouades")
    .select("nom")
    .eq("id", id)
    .single();
  const data = _data as EscouadeNomRow | null;

  return {
    title: data?.nom
      ? `${data.nom} — Escouades · GestionHokkaido`
      : "Escouade introuvable · GestionHokkaido",
  };
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function EscouadePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // ── Vérifier la session ─────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // ── Récupérer l'escouade ────────────────────────────────────────────────
  const { data: _escouade, error: escouadeError } = await supabase
    .from("escouades")
    .select("id, nom, description, url_logo, url_banniere, url_photo_1, url_photo_2, url_photo_3, photo_settings, proprietaire_id, points")
    .eq("id", id)
    .single();
  const escouade = _escouade as EscouadeRow | null;

  if (escouadeError || !escouade) {
    notFound();
  }

  // ── Récupérer les membres avec utilisateurs directement ─────────────────
  const { data: _membresRaw, error: membresError } = await supabase
    .from("membres_escouade")
    .select(
      `
      role_escouade,
      utilisateur_id,
      utilisateurs (
        id,
        pseudo,
        avatar_url,
        prenom_rp,
        nom_rp
      )
    `
    )
    .eq("escouade_id", id)
    .order("role_escouade", { ascending: true });
  const membresRaw = _membresRaw as MembreRaw[] | null;

  if (membresError) {
    console.error("[EscouadePage] Erreur lors du chargement des membres :", membresError);
  }

  // ── Normalisation des données ────────────────────────────────────────────
  const membres: Membre[] = (membresRaw ?? [])
    .filter((m) => m.utilisateurs !== null)
    .map((m) => {
      const u = m.utilisateurs!;
      const displayName = [u.prenom_rp, u.nom_rp].filter(Boolean).join(" ") || u.pseudo;
      return {
        role_escouade: (m.role_escouade === "chef" ? "chef" : "membre") as "chef" | "membre",
        utilisateur: {
          id: u.id,
          pseudo: u.pseudo,
          display_name: displayName,
        },
      };
    });

  // ── Utilisateurs invitables (pas déjà membres de cette escouade) ────────
  const membreUtilisateurIds = membres.map((m) => m.utilisateur.id);
  let utilisateursInvitables: { id: string; pseudo: string }[] = [];
  if (user.id === escouade.proprietaire_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: _uInvitables } = await (supabase as any)
      .from("utilisateurs")
      .select("id, pseudo")
      .not("id", "in", membreUtilisateurIds.length > 0 ? `(${membreUtilisateurIds.join(",")})` : "(null)")
      .order("pseudo");
    utilisateursInvitables = (_uInvitables ?? []) as { id: string; pseudo: string }[];
  }

  // ── L'utilisateur courant est-il membre ? ───────────────────────────────
  const estMembreCourant = membreUtilisateurIds.includes(user.id);

  // ── Vérifier si l'utilisateur est admin/directeur/co-directeur ──────────
  const { data: _utilisateurRole } = await supabase
    .from("utilisateurs")
    .select("role, grade_role")
    .eq("id", user.id)
    .single();
  const utilisateurRole = _utilisateurRole as { role: string; grade_role: string | null } | null;
  const estAdminDirecteur = utilisateurRole?.role === "admin";

  return (
    <EscouadeDetail
      escouade={{
        id: escouade.id,
        nom: escouade.nom,
        description: escouade.description,
        url_logo: escouade.url_logo,
        url_banniere: escouade.url_banniere,
        url_photo_1: escouade.url_photo_1,
        url_photo_2: escouade.url_photo_2,
        url_photo_3: escouade.url_photo_3,
        photo_settings: escouade.photo_settings,
        points: escouade.points,
        proprietaire_id: escouade.proprietaire_id,
      }}
      membres={membres}
      utilisateurCourantId={user.id}
      utilisateursInvitables={utilisateursInvitables}
      estMembreCourant={estMembreCourant}
      estAdminDirecteur={estAdminDirecteur}
    />
  );
}
