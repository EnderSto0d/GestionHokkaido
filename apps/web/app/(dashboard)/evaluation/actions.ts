"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { CompetenceKey } from "@/types/database";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EvaluationData = {
  maitrise_energie_occulte: number;
  sang_froid: number;
  discipline: number;
  intelligence_tactique: number;
  travail_equipe: number;
  premiers_soin: number;
  combat: number;
  initiative: number;
  connaissance_theorique: number;
  pedagogie: number;
};

export type EvaluationRow = EvaluationData & {
  id: string;
  utilisateur_id: string;
  evaluateur_id: string;
  cree_le: string;
  mis_a_jour_le: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function sanitize(data: EvaluationData): EvaluationData {
  return {
    maitrise_energie_occulte: clamp(data.maitrise_energie_occulte),
    sang_froid: clamp(data.sang_froid),
    discipline: clamp(data.discipline),
    intelligence_tactique: clamp(data.intelligence_tactique),
    travail_equipe: clamp(data.travail_equipe),
    premiers_soin: clamp(data.premiers_soin),
    combat: clamp(data.combat),
    initiative: clamp(data.initiative),
    connaissance_theorique: clamp(data.connaissance_theorique),
    pedagogie: clamp(data.pedagogie),
  };
}

const VALID_COMPETENCES: CompetenceKey[] = [
  "maitrise_energie_occulte",
  "sang_froid",
  "discipline",
  "intelligence_tactique",
  "travail_equipe",
  "premiers_soin",
  "combat",
  "initiative",
  "connaissance_theorique",
  "pedagogie",
];

// ─── Actions ──────────────────────────────────────────────────────────────────

/**
 * Récupère l'évaluation existante d'un professeur pour un élève donné.
 * Renvoie null si pas encore évalué.
 */
export async function getEvaluation(
  utilisateurId: string
): Promise<EvaluationData | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("evaluations")
    .select(
      "maitrise_energie_occulte, sang_froid, discipline, intelligence_tactique, travail_equipe, premiers_soin, combat, initiative, connaissance_theorique, pedagogie"
    )
    .eq("utilisateur_id", utilisateurId)
    .eq("evaluateur_id", user.id)
    .maybeSingle();

  return (data as unknown as EvaluationData) ?? null;
}

/**
 * Crée ou met à jour l'évaluation du prof connecté pour un élève.
 * Vérifie que l'appelant est professeur ou admin.
 */
export async function upsertEvaluation(
  utilisateurId: string,
  rawData: EvaluationData
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié." };

  // Vérification du rôle
  const { data: _role } = await supabase
    .from("utilisateurs")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = (_role as { role: string } | null)?.role;

  if (role !== "professeur" && role !== "admin") {
    return { success: false, error: "Permissions insuffisantes." };
  }

  const data = sanitize(rawData);

  // On utilise l'admin client pour bypasser RLS si nécessaire
  const admin = await createAdminClient();

  // Vérifier si une évaluation existe déjà
  const { data: existing } = await admin
    .from("evaluations")
    .select("id")
    .eq("utilisateur_id", utilisateurId)
    .eq("evaluateur_id", user.id)
    .maybeSingle();

  if (existing) {
    // Update
    const { error } = await admin
      .from("evaluations")
      .update(data)
      .eq("id", existing.id);

    if (error) return { success: false, error: error.message };
  } else {
    // Insert
    const { error } = await admin.from("evaluations").insert({
      utilisateur_id: utilisateurId,
      evaluateur_id: user.id,
      ...data,
    });

    if (error) return { success: false, error: error.message };
  }

  revalidatePath("/evaluation");
  revalidatePath("/profil");
  return { success: true };
}

// ─── Individual Evaluation (one skill at a time, with written comment) ────────

export type IndividualEvalPayload = {
  utilisateur_id: string;
  competence: CompetenceKey;
  note: number;
  commentaire: string;
};

export async function creerEvaluationIndividuelle(
  payload: IndividualEvalPayload
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié." };

  // Role check — prof/admin OR membre du conseil
  const { data: _role } = await supabase
    .from("utilisateurs")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = (_role as { role: string } | null)?.role;
  const isProfOrAdmin = role === "professeur" || role === "admin";

  const admin = await createAdminClient();

  let isConseilMember = false;
  if (!isProfOrAdmin) {
    const { data: _conseil } = await admin
      .from("conseil_membres")
      .select("id")
      .eq("utilisateur_id", user.id)
      .maybeSingle();
    isConseilMember = !!_conseil;
  }

  if (!isProfOrAdmin && !isConseilMember) {
    return { success: false, error: "Permissions insuffisantes." };
  }

  // Validate
  if (!VALID_COMPETENCES.includes(payload.competence)) {
    return { success: false, error: "Compétence invalide." };
  }

  // Commentaire obligatoire pour les membres du conseil
  if (isConseilMember && !isProfOrAdmin) {
    if (!payload.commentaire || payload.commentaire.trim().length === 0) {
      return { success: false, error: "Un commentaire est obligatoire pour les membres du conseil." };
    }
  }

  if (payload.commentaire && payload.commentaire.length > 2000) {
    return { success: false, error: "Le commentaire ne peut pas dépasser 2000 caractères." };
  }

  const note = clamp(payload.note);

  const { error } = await admin.from("evaluations_individuelles").insert({
    utilisateur_id: payload.utilisateur_id,
    evaluateur_id: user.id,
    competence: payload.competence,
    note,
    commentaire: payload.commentaire?.trim() ?? "",
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/evaluation");
  revalidatePath("/administration");
  return { success: true };
}

// ─── Squad Evaluation (Hauts Faits — award/remove points with justification) ──

export type HautFaitPayload = {
  escouade_id: string;
  points: number;
  raison: string;
};

export async function creerHautFait(
  payload: HautFaitPayload
): Promise<{ success: boolean; nouveauxPoints?: number; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié." };

  // Role check
  const { data: _role } = await supabase
    .from("utilisateurs")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = (_role as { role: string } | null)?.role;

  if (role !== "professeur" && role !== "admin") {
    return { success: false, error: "Permissions insuffisantes." };
  }

  // Validate
  if (payload.raison && payload.raison.length > 2000) {
    return { success: false, error: "La justification ne peut pas dépasser 2000 caractères." };
  }

  if (!Number.isInteger(payload.points) || payload.points === 0 || Math.abs(payload.points) > 1000) {
    return { success: false, error: "Les points doivent être un entier non nul (max ±1000)." };
  }

  const admin = await createAdminClient();

  // Get current points
  const { data: _escouade, error: fetchErr } = await admin
    .from("escouades")
    .select("points")
    .eq("id", payload.escouade_id)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const escouade = _escouade as any;

  if (fetchErr || !escouade) {
    return { success: false, error: "Escouade introuvable." };
  }

  const nouveauxPoints = escouade.points + payload.points;

  // Update squad points
  const { error: updateErr } = await admin
    .from("escouades")
    .update({ points: nouveauxPoints })
    .eq("id", payload.escouade_id);

  if (updateErr) {
    return { success: false, error: "Erreur lors de la mise à jour des points." };
  }

  // Create haut fait entry
  const { error: insertErr } = await admin.from("hauts_faits_escouade").insert({
    escouade_id: payload.escouade_id,
    attribue_par: user.id,
    points: payload.points,
    raison: payload.raison.trim(),
  });

  if (insertErr) {
    console.error("[evaluation] Erreur insertion haut fait:", insertErr);
    // Points are already updated, log but don't fail
  }

  revalidatePath("/evaluation");
  revalidatePath("/administration");
  revalidatePath(`/escouades/${payload.escouade_id}`);
  return { success: true, nouveauxPoints };
}

// ─── Fetch hauts faits for a squad ────────────────────────────────────────────

export type HautFaitRow = {
  id: string;
  points: number;
  raison: string;
  cree_le: string;
  attribue_par_pseudo: string;
};

export async function getHautsFaits(
  escouadeId: string
): Promise<HautFaitRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("hauts_faits_escouade")
    .select(`
      id,
      points,
      raison,
      cree_le,
      utilisateurs!hauts_faits_escouade_attribue_par_fkey (
        pseudo
      )
    `)
    .eq("escouade_id", escouadeId)
    .order("cree_le", { ascending: false });

  if (error || !data) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data as any[]).map((row) => ({
    id: row.id,
    points: row.points,
    raison: row.raison,
    cree_le: row.cree_le,
    attribue_par_pseudo: row.utilisateurs?.pseudo ?? "Inconnu",
  }));
}

// ─── Supprimer une évaluation individuelle ────────────────────────────────────

/**
 * Supprime une évaluation individuelle.
 * Autorisé si l'appelant est l'évaluateur (créateur) OU un admin/professeur.
 */
export async function supprimerEvaluationIndividuelle(
  evalId: string
): Promise<{ success: boolean; error?: string }> {
  if (!evalId || typeof evalId !== "string") {
    return { success: false, error: "Identifiant invalide." };
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié." };

  const admin = await createAdminClient();

  // Fetch the eval to verify ownership
  const { data: _eval, error: fetchErr } = await admin
    .from("evaluations_individuelles")
    .select("id, evaluateur_id, utilisateur_id")
    .eq("id", evalId)
    .maybeSingle();

  if (fetchErr || !_eval) {
    return { success: false, error: "Évaluation introuvable." };
  }

  const evalRow = _eval as { id: string; evaluateur_id: string; utilisateur_id: string };

  // Check permissions: creator OR prof/admin
  const isCreator = evalRow.evaluateur_id === user.id;
  if (!isCreator) {
    const { data: _role } = await supabase
      .from("utilisateurs")
      .select("role")
      .eq("id", user.id)
      .single();
    const role = (_role as { role: string } | null)?.role;
    if (role !== "professeur" && role !== "admin") {
      return { success: false, error: "Permissions insuffisantes." };
    }
  }

  const { error: deleteErr } = await admin
    .from("evaluations_individuelles")
    .delete()
    .eq("id", evalId);

  if (deleteErr) return { success: false, error: deleteErr.message };

  revalidatePath("/evaluation");
  revalidatePath("/administration");
  return { success: true };
}

// ─── Attribution de Points Personnels (Prof/Admin) ────────────────────────────

export type AttribuerPointsPayload = {
  utilisateur_id: string;
  points: number;
  justification: string;
};

export async function attribuerPointsPersonnels(
  payload: AttribuerPointsPayload
): Promise<{ success: boolean; nouveauxPoints?: number; error?: string }> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié." };

  // Vérification du rôle
  const { data: _role } = await supabase
    .from("utilisateurs")
    .select("role")
    .eq("id", user.id)
    .single();
  const role = (_role as { role: string } | null)?.role;

  if (role !== "professeur" && role !== "admin") {
    return { success: false, error: "Permissions insuffisantes." };
  }

  // Validation
  if (
    !Number.isInteger(payload.points) ||
    payload.points <= 0 ||
    payload.points > 1000
  ) {
    return {
      success: false,
      error: "Les points doivent être un entier positif (max 1000).",
    };
  }

  if (payload.justification && payload.justification.length > 2000) {
    return {
      success: false,
      error: "La justification ne peut pas dépasser 2000 caractères.",
    };
  }

  const admin = await createAdminClient();

  // Appeler la RPC pour attribuer les points
  const { error: rpcError } = await admin.rpc(
    "attribuer_points_personnels" as never,
    {
      p_user_id: payload.utilisateur_id,
      p_points: payload.points,
      p_attribue_par: user.id,
      p_justification: payload.justification?.trim() ?? "",
    } as never
  );

  if (rpcError) {
    return { success: false, error: rpcError.message };
  }

  // Récupérer le nouveau total
  const { data: _updated } = await admin
    .from("utilisateurs")
    .select("points_personnels")
    .eq("id", payload.utilisateur_id)
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nouveauxPoints = (_updated as any)?.points_personnels ?? 0;

  revalidatePath("/evaluation");
  revalidatePath("/profil");
  revalidatePath("/classement/personnel");
  return { success: true, nouveauxPoints };
}
