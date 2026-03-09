"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getGradeFromDiscordRoles } from "@/lib/discord/role-mappings";
import type { SortsInnes, Specialites, ArtsMartiaux, Grades } from "@/types/database";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PersonnageFormData = {
  id?: string; // si fourni = mise à jour, sinon = création
  nom: string;
  sort_inne: SortsInnes;
  specialite: Specialites;
  art_martial: ArtsMartiaux;
  reliques?: string | null;
  sub_jutsu?: string | null;
  // grade est déterminé automatiquement par les rôles Discord
};

export type ActionResult =
  | { success: true; personnageId: string }
  | { success: false; error: string };

// ─── Valeurs autorisées ───────────────────────────────────────────────────────

const SORTS_VALIDES: SortsInnes[] = [
  "Altération Absolue",
  "Animaux Fantastiques",
  "Boogie Woogie",
  "Bourrasque",
  "Clonage",
  "Corbeau",
  "Givre",
  "Intervalle",
  "Jardin Floral",
  "Venin",
  "Projection Occulte",
  "Rage Volcanique",
];

const SPECIALITES_VALIDES: Specialites[] = [
  "Assassin",
  "Combattant",
  "Support",
  "Tank",
];

const ARTS_MARTIAUX_VALIDES: ArtsMartiaux[] = ["CorpACorp", "Kenjutsu"];

const GRADES_VALIDES: Grades[] = [
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

// ─── Validation ───────────────────────────────────────────────────────────────

function validerPersonnage(data: PersonnageFormData): string | null {
  if (!data.nom || data.nom.trim().length < 2 || data.nom.trim().length > 60) {
    return "Le nom doit contenir entre 2 et 60 caractères.";
  }
  if (!SORTS_VALIDES.includes(data.sort_inne)) {
    return "Sort inné invalide.";
  }
  if (!SPECIALITES_VALIDES.includes(data.specialite)) {
    return "Spécialité invalide.";
  }
  if (!ARTS_MARTIAUX_VALIDES.includes(data.art_martial)) {
    return "Art martial invalide.";
  }
  if (data.reliques && data.reliques.length > 1000) {
    return "Les reliques ne peuvent pas dépasser 1000 caractères.";
  }
  if (data.sub_jutsu && data.sub_jutsu.length > 1000) {
    return "Les Sub Jutsu ne peuvent pas dépasser 1000 caractères.";
  }
  return null;
}

// ─── Upsert Personnage ───────────────────────────────────────────────────────

export async function upsertPersonnage(
  data: PersonnageFormData
): Promise<ActionResult> {
  const erreurValidation = validerPersonnage(data);
  if (erreurValidation) {
    return { success: false, error: erreurValidation };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: "Vous devez être connecté pour effectuer cette action.",
    };
  }

  // ── Déterminer le grade automatiquement depuis les rôles Discord ──
  const discordRoles = (user.user_metadata?.discord_roles as string[]) ?? [];
  const autoGrade = getGradeFromDiscordRoles(discordRoles);

  if (!autoGrade) {
    return {
      success: false,
      error: "Aucun grade de combat détecté sur votre profil Discord. Vérifiez vos rôles sur le serveur.",
    };
  }

  if (!GRADES_VALIDES.includes(autoGrade)) {
    return {
      success: false,
      error: "Le grade détecté depuis Discord est invalide.",
    };
  }

  const payload = {
    utilisateur_id: user.id,
    nom: data.nom.trim(),
    sort_inne: data.sort_inne,
    specialite: data.specialite,
    art_martial: data.art_martial,
    reliques: data.reliques?.trim() || null,
    sub_jutsu: data.sub_jutsu?.trim() || null,
    grade: autoGrade,
  };

  // ── Mise à jour d'un personnage existant ──
  if (data.id) {
    // Vérifier que le personnage appartient à l'utilisateur
    const { data: _existant, error: fetchError } = await supabase
      .from("personnages")
      .select("id, utilisateur_id")
      .eq("id", data.id)
      .single();
    const existant = _existant as { id: string; utilisateur_id: string } | null;

    if (fetchError || !existant) {
      return { success: false, error: "Personnage introuvable." };
    }

    if (existant.utilisateur_id !== user.id) {
      return {
        success: false,
        error: "Vous ne pouvez modifier que vos propres personnages.",
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase.from("personnages") as any)
      .update({
        nom: payload.nom,
        sort_inne: payload.sort_inne,
        specialite: payload.specialite,
        art_martial: payload.art_martial,
        reliques: payload.reliques,
        sub_jutsu: payload.sub_jutsu,
        grade: autoGrade,
        // Remettre en attente d'approbation après modification
        est_approuve: false,
      })
      .eq("id", data.id);

    if (updateError) {
      return {
        success: false,
        error: "Erreur lors de la mise à jour du personnage.",
      };
    }

    revalidatePath("/personnages");
    revalidatePath("/profil");
    return { success: true, personnageId: data.id };
  }

  // ── Création d'un nouveau personnage ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: _nouveau, error: insertError } = await (supabase.from("personnages") as any)
    .insert(payload)
    .select("id")
    .single();
  const nouveau = _nouveau as { id: string } | null;

  if (insertError || !nouveau) {
    if (insertError?.code === "23505") {
      return {
        success: false,
        error: "Vous possédez déjà un personnage portant ce nom.",
      };
    }
    return {
      success: false,
      error: "Erreur lors de la création du personnage.",
    };
  }

  revalidatePath("/personnages");
  revalidatePath("/profil");
  return { success: true, personnageId: nouveau.id };
}

// ─── Récupérer les personnages de l'utilisateur courant ──────────────────────

export async function getPersonnagesCourants() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("personnages")
    .select("*")
    .eq("utilisateur_id", user.id)
    .order("cree_le", { ascending: false });

  if (error) return [];
  return data ?? [];
}

// ─── Récupérer les infos Discord de l'utilisateur courant ────────────────────

export async function getUserDiscordInfo() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Lire depuis la table utilisateurs (synchronisé au login)
  const { data: utilisateur } = await supabase
    .from("utilisateurs")
    .select("grade, grade_role, grade_secondaire")
    .eq("id", user.id)
    .single();

  if (!utilisateur) {
    // Fallback : dériver depuis les metadata Supabase
    const discordRoles = (user.user_metadata?.discord_roles as string[]) ?? [];
    const grade = getGradeFromDiscordRoles(discordRoles);
    return { grade, gradeRole: null, gradeSecondaire: null, divisions: [] as { division: string; role_division: string }[] };
  }

  // Récupérer les divisions de l'utilisateur (multi-divisions)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: _divisions } = await (supabase.from("utilisateur_divisions") as any)
    .select("division, role_division")
    .eq("utilisateur_id", user.id)
    .order("division");

  const divisions = (_divisions ?? []) as { division: string; role_division: string }[];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const u = utilisateur as any;
  return {
    grade: u.grade ?? null,
    gradeRole: u.grade_role ?? null,
    gradeSecondaire: u.grade_secondaire ?? null,
    divisions,
  };
}
