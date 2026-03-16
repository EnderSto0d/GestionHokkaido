"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: utilisateur } = await supabase
    .from("utilisateurs")
    .select("id, role, grade_role, grade_secondaire, site_id, pseudo")
    .eq("id", user.id)
    .single();

  if (!utilisateur) redirect("/login");
  return utilisateur as {
    id: string;
    role: string;
    grade_role: string | null;
    grade_secondaire: string | null;
    site_id: string | null;
    pseudo: string;
  };
}

const EXO_PRO_PLUS_ROLES = [
  "Exorciste Pro",
  "Professeur",
  "Professeur Principal",
  "Co-Directeur",
  "Directeur",
];

function isExoProPlus(gradeRole: string | null): boolean {
  return EXO_PRO_PLUS_ROLES.includes(gradeRole ?? "");
}

// ── Lecture ───────────────────────────────────────────────────────────────────

export async function getAgences() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: currentUser } = await supabase
    .from("utilisateurs")
    .select("site_id")
    .eq("id", user.id)
    .single();

  if (!currentUser) redirect("/login");

  const siteId = (currentUser as { site_id: string | null }).site_id;

  // Agences de l'école de l'utilisateur + toutes les agences inter-école
  const { data, error } = await supabase
    .from("agences")
    .select(
      `
      *,
      membres_agence(count),
      stagiaires_agence(count)
    `
    )
    .or(`site_id.eq.${siteId},est_inter_ecole.eq.true`)
    .order("cree_le", { ascending: false });

  if (error) return { agences: [], error: error.message };
  return { agences: data ?? [], error: null };
}

export async function getAgence(agenceId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: agence, error } = await supabase
    .from("agences")
    .select("*")
    .eq("id", agenceId)
    .single();

  if (error || !agence) {
    return {
      agence: null,
      membres: [],
      stagiaires: [],
      missions: [],
      error: "Agence introuvable",
    };
  }

  const [membresRes, stagiairesRes, missionsRes] = await Promise.all([
    supabase
      .from("membres_agence")
      .select(
        `
        *,
        utilisateurs(id, pseudo, avatar_url, grade_role, site_id)
      `
      )
      .eq("agence_id", agenceId)
      .order("role_agence", { ascending: true }),

    supabase
      .from("stagiaires_agence")
      .select(
        `
        *,
        utilisateurs!stagiaires_agence_utilisateur_id_fkey(id, pseudo, avatar_url, grade_secondaire, site_id),
        parrain:utilisateurs!stagiaires_agence_parrain_id_fkey(id, pseudo)
      `
      )
      .eq("agence_id", agenceId)
      .is("fin", null),

    supabase
      .from("missions")
      .select(
        "id, titre, statut, points_recompense, date_heure, cree_le, delegation_escouade_id"
      )
      .eq("agence_id", agenceId)
      .is("deleted_at", null)
      .order("cree_le", { ascending: false })
      .limit(20),
  ]);

  return {
    agence,
    membres: membresRes.data ?? [],
    stagiaires: stagiairesRes.data ?? [],
    missions: missionsRes.data ?? [],
    error: null,
  };
}

export async function getMonAgence() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("membres_agence")
    .select(
      `
      role_agence,
      agences(*)
    `
    )
    .eq("utilisateur_id", user.id)
    .single();

  return data ?? null;
}

export async function getMonStage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("stagiaires_agence")
    .select(
      `
      *,
      agences(id, nom, url_logo, est_inter_ecole)
    `
    )
    .eq("utilisateur_id", user.id)
    .is("fin", null)
    .single();

  return data ?? null;
}

export async function getEligibleStagiaires(agenceId: string) {
  // Retourne les étudiants Terminal qui ne sont pas déjà en stage
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: agence } = await supabase
    .from("agences")
    .select("site_id, est_inter_ecole")
    .eq("id", agenceId)
    .single();

  if (!agence) return [];

  const agenceTyped = agence as {
    site_id: string | null;
    est_inter_ecole: boolean;
  };

  // Récupérer les IDs des stagiaires actifs pour exclusion
  const { data: stagiairesActifs } = await supabase
    .from("stagiaires_agence")
    .select("utilisateur_id")
    .is("fin", null);

  const idsExclus = (stagiairesActifs ?? []).map(
    (s: { utilisateur_id: string }) => s.utilisateur_id
  );

  let baseQuery = supabase
    .from("utilisateurs")
    .select("id, pseudo, avatar_url, grade_secondaire, site_id")
    .eq("grade_secondaire", "Terminal");

  // Pour les agences d'école, restreindre au même site
  if (!agenceTyped.est_inter_ecole && agenceTyped.site_id) {
    baseQuery = baseQuery.eq("site_id", agenceTyped.site_id) as typeof baseQuery;
  }

  const { data: allTerminal } = await baseQuery.order("pseudo");

  // Filtrer côté JS pour éviter toute injection SQL via concaténation d'IDs
  const result = (allTerminal ?? []).filter(
    (u: { id: string }) => !idsExclus.includes(u.id)
  );
  return result;
}

export async function getExoProPlusForAdmin() {
  // Utilisé par les admins pour choisir un fondateur lors de la création d'une agence inter-école
  const utilisateur = await getCurrentUser();
  if (utilisateur.role !== "admin") return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("utilisateurs")
    .select("id, pseudo, grade_role, site_id")
    .in("grade_role", EXO_PRO_PLUS_ROLES)
    .order("pseudo");

  return data ?? [];
}

// ── Création ──────────────────────────────────────────────────────────────────

export async function creerAgence(data: {
  nom: string;
  description?: string;
  url_logo?: string;
}): Promise<{ success: boolean; agenceId?: string; error?: string }> {
  const utilisateur = await getCurrentUser();

  if (!isExoProPlus(utilisateur.grade_role)) {
    return {
      success: false,
      error: "Seuls les Exorcistes Pro et supérieurs peuvent créer une agence.",
    };
  }

  const supabase = await createClient();

  // Vérifier qu'il n'est pas déjà dans une agence
  const { data: existingMembership } = await supabase
    .from("membres_agence")
    .select("id")
    .eq("utilisateur_id", utilisateur.id)
    .single();

  if (existingMembership) {
    return { success: false, error: "Vous êtes déjà membre d'une agence." };
  }

  const nom = data.nom.trim();
  if (nom.length < 2 || nom.length > 100) {
    return {
      success: false,
      error: "Le nom doit contenir entre 2 et 100 caractères.",
    };
  }

  const adminClient = await createAdminClient();

  // Créer l'agence
  const { data: agence, error: agenceError } = await adminClient
    .from("agences")
    .insert({
      nom,
      description: data.description?.trim() || null,
      url_logo: data.url_logo?.trim() || null,
      fondateur_id: utilisateur.id,
      site_id: utilisateur.site_id,
      est_inter_ecole: false,
    })
    .select()
    .single();

  if (agenceError) {
    if (agenceError.code === "23505") {
      return { success: false, error: "Ce nom d'agence est déjà utilisé." };
    }
    return { success: false, error: "Erreur lors de la création de l'agence." };
  }

  // Ajouter le fondateur comme membre
  const { error: membreError } = await adminClient
    .from("membres_agence")
    .insert({
      agence_id: (agence as { id: string }).id,
      utilisateur_id: utilisateur.id,
      role_agence: "fondateur",
    });

  if (membreError) {
    // Rollback : supprimer l'agence créée
    await adminClient
      .from("agences")
      .delete()
      .eq("id", (agence as { id: string }).id);
    return {
      success: false,
      error: "Erreur lors de l'ajout du fondateur à l'agence.",
    };
  }

  revalidatePath("/agences");
  return { success: true, agenceId: (agence as { id: string }).id };
}

export async function creerAgenceInterEcole(data: {
  nom: string;
  description?: string;
  url_logo?: string;
  fondateurId: string;
}): Promise<{ success: boolean; agenceId?: string; error?: string }> {
  const utilisateur = await getCurrentUser();

  if (utilisateur.role !== "admin") {
    return {
      success: false,
      error:
        "Seuls les administrateurs peuvent créer une agence inter-école.",
    };
  }

  const supabase = await createClient();

  // Vérifier que le fondateur désigné est ExoPro+
  const { data: fondateur } = await supabase
    .from("utilisateurs")
    .select("id, grade_role")
    .eq("id", data.fondateurId)
    .single();

  const fondateurTyped = fondateur as {
    id: string;
    grade_role: string | null;
  } | null;

  if (!fondateurTyped || !isExoProPlus(fondateurTyped.grade_role)) {
    return {
      success: false,
      error:
        "Le fondateur désigné doit être Exorciste Pro ou supérieur.",
    };
  }

  // Vérifier que le fondateur n'est pas déjà dans une agence
  const { data: existingMembership } = await supabase
    .from("membres_agence")
    .select("id")
    .eq("utilisateur_id", data.fondateurId)
    .single();

  if (existingMembership) {
    return {
      success: false,
      error: "Ce membre est déjà dans une agence.",
    };
  }

  const nom = data.nom.trim();
  if (nom.length < 2 || nom.length > 100) {
    return {
      success: false,
      error: "Le nom doit contenir entre 2 et 100 caractères.",
    };
  }

  const adminClient = await createAdminClient();

  const { data: agence, error: agenceError } = await adminClient
    .from("agences")
    .insert({
      nom,
      description: data.description?.trim() || null,
      url_logo: data.url_logo?.trim() || null,
      fondateur_id: data.fondateurId,
      site_id: null, // inter-école = cross-faction
      est_inter_ecole: true,
    })
    .select()
    .single();

  if (agenceError) {
    if (agenceError.code === "23505") {
      return { success: false, error: "Ce nom d'agence est déjà utilisé." };
    }
    return { success: false, error: "Erreur lors de la création de l'agence." };
  }

  const { error: membreError } = await adminClient
    .from("membres_agence")
    .insert({
      agence_id: (agence as { id: string }).id,
      utilisateur_id: data.fondateurId,
      role_agence: "fondateur",
    });

  if (membreError) {
    await adminClient
      .from("agences")
      .delete()
      .eq("id", (agence as { id: string }).id);
    return {
      success: false,
      error: "Erreur lors de l'ajout du fondateur à l'agence.",
    };
  }

  revalidatePath("/agences");
  return { success: true, agenceId: (agence as { id: string }).id };
}

// ── Adhésion ──────────────────────────────────────────────────────────────────

export async function rejoindreAgence(
  agenceId: string
): Promise<{ success: boolean; error?: string }> {
  const utilisateur = await getCurrentUser();

  if (!isExoProPlus(utilisateur.grade_role)) {
    return {
      success: false,
      error:
        "Seuls les Exorcistes Pro et supérieurs peuvent rejoindre une agence.",
    };
  }

  const supabase = await createClient();

  // Vérifier qu'il n'est pas déjà dans une agence
  const { data: existingMembership } = await supabase
    .from("membres_agence")
    .select("id")
    .eq("utilisateur_id", utilisateur.id)
    .single();

  if (existingMembership) {
    return { success: false, error: "Vous êtes déjà membre d'une agence." };
  }

  const { data: agence } = await supabase
    .from("agences")
    .select("id, site_id, est_inter_ecole")
    .eq("id", agenceId)
    .single();

  const agenceTyped = agence as {
    id: string;
    site_id: string | null;
    est_inter_ecole: boolean;
  } | null;

  if (!agenceTyped) return { success: false, error: "Agence introuvable." };

  // Pour les agences d'école, vérifier même site
  if (!agenceTyped.est_inter_ecole && agenceTyped.site_id !== utilisateur.site_id) {
    return {
      success: false,
      error: "Vous ne pouvez rejoindre qu'une agence de votre école.",
    };
  }

  const adminClient = await createAdminClient();
  const { error } = await adminClient.from("membres_agence").insert({
    agence_id: agenceId,
    utilisateur_id: utilisateur.id,
    role_agence: "membre",
  });

  if (error) {
    return { success: false, error: "Erreur lors de l'adhésion à l'agence." };
  }

  revalidatePath(`/agences/${agenceId}`);
  revalidatePath("/agences");
  return { success: true };
}

export async function quitterAgence(
  agenceId: string
): Promise<{ success: boolean; error?: string }> {
  const utilisateur = await getCurrentUser();

  const supabase = await createClient();
  const { data: membership } = await supabase
    .from("membres_agence")
    .select("role_agence")
    .eq("agence_id", agenceId)
    .eq("utilisateur_id", utilisateur.id)
    .single();

  const membershipTyped = membership as { role_agence: string } | null;

  if (!membershipTyped) {
    return {
      success: false,
      error: "Vous n'êtes pas membre de cette agence.",
    };
  }

  if (membershipTyped.role_agence === "fondateur") {
    return {
      success: false,
      error:
        "Le fondateur ne peut pas quitter l'agence. Transférez d'abord la direction.",
    };
  }

  const adminClient = await createAdminClient();
  const { error } = await adminClient
    .from("membres_agence")
    .delete()
    .eq("agence_id", agenceId)
    .eq("utilisateur_id", utilisateur.id);

  if (error) {
    return { success: false, error: "Erreur lors du départ de l'agence." };
  }

  // Terminer les stages actifs parrainés par cet utilisateur dans cette agence
  await adminClient
    .from("stagiaires_agence")
    .update({ fin: new Date().toISOString() })
    .eq("agence_id", agenceId)
    .eq("parrain_id", utilisateur.id)
    .is("fin", null);

  revalidatePath(`/agences/${agenceId}`);
  revalidatePath("/agences");
  return { success: true };
}

// ── Gestion de l'agence ───────────────────────────────────────────────────────

export async function supprimerAgence(
  agenceId: string
): Promise<{ success: boolean; error?: string }> {
  const utilisateur = await getCurrentUser();

  const supabase = await createClient();
  const { data: agence } = await supabase
    .from("agences")
    .select("fondateur_id")
    .eq("id", agenceId)
    .single();

  if (!agence) return { success: false, error: "Agence introuvable." };

  const isFondateur =
    (agence as { fondateur_id: string }).fondateur_id === utilisateur.id;
  const isAdmin = utilisateur.role === "admin";

  if (!isFondateur && !isAdmin) {
    return {
      success: false,
      error:
        "Seul le fondateur ou un administrateur peut supprimer cette agence.",
    };
  }

  const adminClient = await createAdminClient();
  const { error } = await adminClient
    .from("agences")
    .delete()
    .eq("id", agenceId);

  if (error) {
    return { success: false, error: "Erreur lors de la suppression de l'agence." };
  }

  revalidatePath("/agences");
  return { success: true };
}

export async function transfererDirection(
  agenceId: string,
  nouveauFondateurId: string
): Promise<{ success: boolean; error?: string }> {
  const utilisateur = await getCurrentUser();

  const supabase = await createClient();
  const { data: agence } = await supabase
    .from("agences")
    .select("fondateur_id")
    .eq("id", agenceId)
    .single();

  if (!agence) return { success: false, error: "Agence introuvable." };

  const isFondateur =
    (agence as { fondateur_id: string }).fondateur_id === utilisateur.id;
  const isAdmin = utilisateur.role === "admin";

  if (!isFondateur && !isAdmin) {
    return {
      success: false,
      error:
        "Seul le fondateur ou un administrateur peut transférer la direction.",
    };
  }

  // Vérifier que le nouveau fondateur est bien membre de l'agence
  const { data: newMembership } = await supabase
    .from("membres_agence")
    .select("utilisateur_id, role_agence")
    .eq("agence_id", agenceId)
    .eq("utilisateur_id", nouveauFondateurId)
    .single();

  if (!newMembership) {
    return {
      success: false,
      error: "Ce membre ne fait pas partie de l'agence.",
    };
  }

  const adminClient = await createAdminClient();

  // Rétrograder l'ancien fondateur
  await adminClient
    .from("membres_agence")
    .update({ role_agence: "membre" })
    .eq("agence_id", agenceId)
    .eq("utilisateur_id", utilisateur.id);

  // Promouvoir le nouveau fondateur
  await adminClient
    .from("membres_agence")
    .update({ role_agence: "fondateur" })
    .eq("agence_id", agenceId)
    .eq("utilisateur_id", nouveauFondateurId);

  // Mettre à jour l'agence
  await adminClient
    .from("agences")
    .update({
      fondateur_id: nouveauFondateurId,
      mis_a_jour_le: new Date().toISOString(),
    })
    .eq("id", agenceId);

  revalidatePath(`/agences/${agenceId}`);
  return { success: true };
}

export async function personnaliserAgence(
  agenceId: string,
  data: {
    description?: string;
    url_logo?: string;
    url_banniere?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const utilisateur = await getCurrentUser();

  const supabase = await createClient();
  const { data: membership } = await supabase
    .from("membres_agence")
    .select("role_agence")
    .eq("agence_id", agenceId)
    .eq("utilisateur_id", utilisateur.id)
    .single();

  const isAdmin = utilisateur.role === "admin";
  const isFondateur =
    (membership as { role_agence: string } | null)?.role_agence === "fondateur";

  if (!isFondateur && !isAdmin) {
    return {
      success: false,
      error: "Seul le fondateur ou un administrateur peut modifier l'agence.",
    };
  }

  const adminClient = await createAdminClient();
  const { error } = await adminClient
    .from("agences")
    .update({
      description: data.description?.trim() || null,
      url_logo: data.url_logo?.trim() || null,
      url_banniere: data.url_banniere?.trim() || null,
      mis_a_jour_le: new Date().toISOString(),
    })
    .eq("id", agenceId);

  if (error) {
    return { success: false, error: "Erreur lors de la mise à jour de l'agence." };
  }

  revalidatePath(`/agences/${agenceId}`);
  return { success: true };
}

export async function expulserMembre(
  agenceId: string,
  membreId: string
): Promise<{ success: boolean; error?: string }> {
  const utilisateur = await getCurrentUser();

  const supabase = await createClient();
  const { data: membership } = await supabase
    .from("membres_agence")
    .select("role_agence")
    .eq("agence_id", agenceId)
    .eq("utilisateur_id", utilisateur.id)
    .single();

  const isAdmin = utilisateur.role === "admin";
  const isFondateur =
    (membership as { role_agence: string } | null)?.role_agence === "fondateur";

  if (!isFondateur && !isAdmin) {
    return {
      success: false,
      error: "Seul le fondateur peut expulser un membre.",
    };
  }

  if (membreId === utilisateur.id) {
    return {
      success: false,
      error: "Vous ne pouvez pas vous expulser vous-même.",
    };
  }

  const adminClient = await createAdminClient();
  await adminClient
    .from("membres_agence")
    .delete()
    .eq("agence_id", agenceId)
    .eq("utilisateur_id", membreId);

  // Terminer les stages actifs parrainés par le membre expulsé
  await adminClient
    .from("stagiaires_agence")
    .update({ fin: new Date().toISOString() })
    .eq("agence_id", agenceId)
    .eq("parrain_id", membreId)
    .is("fin", null);

  revalidatePath(`/agences/${agenceId}`);
  return { success: true };
}

// ── Stages ────────────────────────────────────────────────────────────────────

export async function prendreStagiaire(
  agenceId: string,
  stagiaireId: string
): Promise<{ success: boolean; error?: string }> {
  const utilisateur = await getCurrentUser();

  if (!isExoProPlus(utilisateur.grade_role)) {
    return {
      success: false,
      error:
        "Seuls les Exorcistes Pro et supérieurs peuvent prendre des stagiaires.",
    };
  }

  const supabase = await createClient();

  // Vérifier que le parrain est membre de l'agence
  const { data: membership } = await supabase
    .from("membres_agence")
    .select("agence_id")
    .eq("agence_id", agenceId)
    .eq("utilisateur_id", utilisateur.id)
    .single();

  if (!membership) {
    return {
      success: false,
      error: "Vous n'êtes pas membre de cette agence.",
    };
  }

  // Vérifier que le stagiaire est en Terminal
  const { data: stagiaire } = await supabase
    .from("utilisateurs")
    .select("id, grade_secondaire, pseudo")
    .eq("id", stagiaireId)
    .single();

  const stagiaireTyped = stagiaire as {
    id: string;
    grade_secondaire: string | null;
    pseudo: string;
  } | null;

  if (!stagiaireTyped) {
    return { success: false, error: "Utilisateur introuvable." };
  }

  if (stagiaireTyped.grade_secondaire !== "Terminal") {
    return {
      success: false,
      error: "Seuls les étudiants en Terminal peuvent effectuer un stage.",
    };
  }

  // Vérifier qu'il n'est pas déjà en stage
  const { data: existingStage } = await supabase
    .from("stagiaires_agence")
    .select("id")
    .eq("utilisateur_id", stagiaireId)
    .is("fin", null)
    .single();

  if (existingStage) {
    return {
      success: false,
      error: "Cet étudiant est déjà en stage dans une agence.",
    };
  }

  const adminClient = await createAdminClient();
  const { error } = await adminClient.from("stagiaires_agence").insert({
    agence_id: agenceId,
    utilisateur_id: stagiaireId,
    parrain_id: utilisateur.id,
  });

  if (error) {
    return { success: false, error: "Erreur lors de l'ajout du stagiaire." };
  }

  revalidatePath(`/agences/${agenceId}`);
  return { success: true };
}

export async function terminerStage(
  stagiaireAgenceId: string
): Promise<{ success: boolean; error?: string }> {
  const utilisateur = await getCurrentUser();

  const supabase = await createClient();
  const { data: stage } = await supabase
    .from("stagiaires_agence")
    .select("agence_id, parrain_id")
    .eq("id", stagiaireAgenceId)
    .is("fin", null)
    .single();

  const stageTyped = stage as {
    agence_id: string;
    parrain_id: string;
  } | null;

  if (!stageTyped) {
    return { success: false, error: "Stage introuvable ou déjà terminé." };
  }

  // Seul le parrain, le fondateur de l'agence ou un admin peut terminer le stage
  const { data: membership } = await supabase
    .from("membres_agence")
    .select("role_agence")
    .eq("agence_id", stageTyped.agence_id)
    .eq("utilisateur_id", utilisateur.id)
    .single();

  const isAdmin = utilisateur.role === "admin";
  const isParrain = stageTyped.parrain_id === utilisateur.id;
  const isFondateur =
    (membership as { role_agence: string } | null)?.role_agence === "fondateur";

  if (!isParrain && !isFondateur && !isAdmin) {
    return {
      success: false,
      error:
        "Seul le parrain, le fondateur ou un administrateur peut terminer ce stage.",
    };
  }

  const adminClient = await createAdminClient();
  const { error } = await adminClient
    .from("stagiaires_agence")
    .update({ fin: new Date().toISOString() })
    .eq("id", stagiaireAgenceId);

  if (error) {
    return { success: false, error: "Erreur lors de la clôture du stage." };
  }

  revalidatePath(`/agences/${stageTyped.agence_id}`);
  return { success: true };
}

// ── Délégation de mission ─────────────────────────────────────────────────────

export async function deleguerMissionAEscouade(
  missionId: string,
  escouadeId: string | null
): Promise<{ success: boolean; error?: string }> {
  const utilisateur = await getCurrentUser();

  const supabase = await createClient();
  const { data: mission } = await supabase
    .from("missions")
    .select("agence_id, createur_id")
    .eq("id", missionId)
    .is("deleted_at", null)
    .single();

  const missionTyped = mission as {
    agence_id: string | null;
    createur_id: string;
  } | null;

  if (!missionTyped) return { success: false, error: "Mission introuvable." };
  if (!missionTyped.agence_id) {
    return {
      success: false,
      error: "Cette mission n'est pas une mission d'agence.",
    };
  }

  // Doit être fondateur de l'agence, créateur de la mission ou admin
  const { data: membership } = await supabase
    .from("membres_agence")
    .select("role_agence")
    .eq("agence_id", missionTyped.agence_id)
    .eq("utilisateur_id", utilisateur.id)
    .single();

  const isAdmin = utilisateur.role === "admin";
  const isCreateur = missionTyped.createur_id === utilisateur.id;
  const isFondateur =
    (membership as { role_agence: string } | null)?.role_agence === "fondateur";

  if (!isCreateur && !isFondateur && !isAdmin) {
    return {
      success: false,
      error: "Vous n'avez pas la permission de déléguer cette mission.",
    };
  }

  const adminClient = await createAdminClient();
  const { error } = await adminClient
    .from("missions")
    .update({ delegation_escouade_id: escouadeId })
    .eq("id", missionId);

  if (error) {
    return { success: false, error: "Erreur lors de la délégation." };
  }

  revalidatePath("/missions");
  return { success: true };
}
