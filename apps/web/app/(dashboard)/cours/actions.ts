"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { DISCORD_GUILD_ID } from "@/lib/discord/guild-member";
import {
  CLAN_ROLE_IDS,
  GRADE_TO_ROLE_ID,
  GRADE_ROLE_TO_ROLE_ID,
  GRADE_SECONDAIRE_TO_ROLE_ID,
} from "@/lib/discord/role-mappings";
import type { GradeRole, Grades, GradeSecondaire } from "@/types/database";
import type { ClanName } from "@/lib/discord/role-mappings";
import { normalizePingCible } from "@/app/(dashboard)/missions/mission-utils";
import type { PingCible } from "@/app/(dashboard)/missions/mission-utils";
export type { PingCible } from "@/app/(dashboard)/missions/mission-utils";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Canal Discord où les embeds de cours sont postés. */
const COURS_CHANNEL_ID = "1473348642155794512";

/** Points personnels par participant présent. */
const POINTS_PARTICIPANT = 5;

/** Points personnels pour le créateur du cours. */
const POINTS_CREATEUR = 15;

/** Nombre minimum de présents pour valider un cours. */
const MIN_PRESENTS = 5;

/** Rôle Discord "Élève Exorciste". */
const ELEVE_EXORCISTE_ROLE_ID = "1460101248148570122";

/** Grade-rôles autorisant la création de cours (Exo Pro ou supérieur). */
const COURS_CREATOR_GRADE_ROLES: GradeRole[] = [
  "Exorciste Pro",
  "Professeur",
  "Professeur Principal",
  "Co-Directeur",
  "Directeur",
];

/** Grades scolaires autorisés à créer un cours. */
const COURS_CREATOR_GRADE_SECONDAIRES: GradeSecondaire[] = ["Terminal"];

// ─── Types ────────────────────────────────────────────────────────────────────

export type CoursPayload = {
  titre: string;
  date_heure: string | null;
  capacite: number | null;
  ping_cible: PingCible;
  description: string;
};

export type CoursRow = {
  id: string;
  createur_id: string;
  titre: string;
  description: string | null;
  date_heure: string | null;
  capacite: number | null;
  ping_cible: PingCible;
  discord_message_id: string | null;
  statut: "active" | "termine" | "annule";
  cree_le: string;
  mis_a_jour_le: string;
};

export type EscouadeOption = {
  id: string;
  nom: string;
  url_logo: string | null;
  discord_role_id: string | null;
};

export type CoursParticipantRow = {
  id: string;
  utilisateur_id: string;
  pseudo: string;
  avatar_url: string | null;
  prenom_rp: string | null;
  nom_rp: string | null;
  grade_role: string | null;
  present: boolean;
};

export type ActionResult = { success: true } | { success: false; error: string };

export type CreateCoursResult =
  | { success: true; coursId: string }
  | { success: false; error: string };

// ─── Internal helpers ─────────────────────────────────────────────────────────

function getBotToken(): string | null {
  return process.env.DISCORD_BOT_TOKEN ?? null;
}

function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

/**
 * Vérifie que l'utilisateur courant peut créer un cours :
 *  1. Admin ou Professeur (rôle DB)
 *  2. Exorciste Pro ou supérieur (grade_role)
 *  3. Terminal (grade_secondaire)
 */
async function verifyCoursCreator(): Promise<
  { userId: string; discordId: string } | { error: string }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié." };

  const { data: u } = await supabase
    .from("utilisateurs")
    .select("role, grade_role, grade_secondaire, discord_id")
    .eq("id", user.id)
    .single();

  if (!u) return { error: "Utilisateur introuvable." };

  const uu = u as {
    role: string;
    grade_role: GradeRole | null;
    grade_secondaire: GradeSecondaire | null;
    discord_id: string | null;
  };

  // Admin ou professeur
  if (uu.role === "admin" || uu.role === "professeur") {
    return { userId: user.id, discordId: uu.discord_id ?? "" };
  }

  // Exo Pro ou supérieur
  if (uu.grade_role && COURS_CREATOR_GRADE_ROLES.includes(uu.grade_role)) {
    return { userId: user.id, discordId: uu.discord_id ?? "" };
  }

  // Terminal
  if (uu.grade_secondaire && COURS_CREATOR_GRADE_SECONDAIRES.includes(uu.grade_secondaire)) {
    return { userId: user.id, discordId: uu.discord_id ?? "" };
  }

  return { error: "Vous n'avez pas les permissions pour créer un cours." };
}

// ─── Discord Helpers ──────────────────────────────────────────────────────────

function buildPingString(
  pingCible: PingCible,
  escouadeRoles: Map<string, string>
): string {
  const parts: string[] = [];

  if (pingCible.everyone) parts.push("@everyone");
  if (pingCible.eleve_exorciste) parts.push(`<@&${ELEVE_EXORCISTE_ROLE_ID}>`);

  if (pingCible.escouadeIds?.length) {
    for (const id of pingCible.escouadeIds) {
      const roleId = escouadeRoles.get(id);
      if (roleId) parts.push(`<@&${roleId}>`);
    }
  }
  if (pingCible.clans?.length) {
    for (const clan of pingCible.clans) {
      parts.push(`<@&${CLAN_ROLE_IDS[clan].membre}>`);
    }
  }
  if (pingCible.grades?.length) {
    for (const g of pingCible.grades) {
      parts.push(`<@&${GRADE_TO_ROLE_ID[g]}>`);
    }
  }
  if (pingCible.gradeRoles?.length) {
    for (const gr of pingCible.gradeRoles) {
      parts.push(`<@&${GRADE_ROLE_TO_ROLE_ID[gr]}>`);
    }
  }
  if (pingCible.gradeSecondaires?.length) {
    for (const gs of pingCible.gradeSecondaires) {
      parts.push(`<@&${GRADE_SECONDAIRE_TO_ROLE_ID[gs]}>`);
    }
  }

  return parts.join(" ") || "@everyone";
}

async function getEscouadeDiscordRoles(
  ids: string[]
): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const admin = await createAdminClient();
  const { data } = await admin
    .from("escouades")
    .select("id, discord_role_id")
    .in("id", ids);
  const map = new Map<string, string>();
  if (data) {
    for (const row of data as { id: string; discord_role_id: string | null }[]) {
      if (row.discord_role_id) map.set(row.id, row.discord_role_id);
    }
  }
  return map;
}

function buildCoursEmbed(
  cours: CoursRow,
  participantCount: number,
  isUpdate = false
) {
  const dateText = cours.date_heure
    ? new Date(cours.date_heure).toLocaleString("fr-FR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Date non définie";

  const spotsValue =
    cours.capacite === null
      ? "Illimité"
      : isUpdate
      ? `${Math.max(0, cours.capacite - participantCount)} / ${cours.capacite}`
      : String(cours.capacite);

  const fields = [
    { name: "📅 Date / Heure", value: dateText, inline: false },
    {
      name: isUpdate ? "👥 Places restantes" : "👥 Places",
      value: spotsValue,
      inline: true,
    },
    {
      name: "⭐ Points participant",
      value: `${POINTS_PARTICIPANT} pts`,
      inline: true,
    },
    {
      name: "🎓 Points enseignant",
      value: `${POINTS_CREATEUR} pts`,
      inline: true,
    },
  ];

  if (isUpdate) {
    fields.push({
      name: "✅ Inscrits",
      value: String(participantCount),
      inline: true,
    });
  }

  return {
    title: `📚  ${cours.titre}`,
    color: isUpdate && participantCount > 0 ? 0x22c55e : 0x8b5cf6,
    description: cours.description
      ? cours.description.slice(0, 4000)
      : "Aucune description.",
    fields,
    footer: {
      text: `Min. ${MIN_PRESENTS} présents pour valider · Cliquez ci-dessous pour vous inscrire.`,
    },
    timestamp: new Date().toISOString(),
  };
}

function buildCoursComponents(coursId: string) {
  const siteUrl = getSiteUrl();
  return [
    {
      type: 1,
      components: [
        {
          type: 2,
          style: 5,
          label: "📋 Voir & S'inscrire au Cours",
          url: `${siteUrl}/cours/${coursId}`,
        },
      ],
    },
  ];
}

function buildCoursClosedEmbed(cours: CoursRow, presentCount: number) {
  return {
    title: `🏁  ${cours.titre} — Cours Terminé`,
    color: 0x6b7280,
    description: cours.description
      ? cours.description.slice(0, 4000)
      : "Aucune description.",
    fields: [
      { name: "👥 Présents", value: String(presentCount), inline: true },
    ],
    footer: { text: "Cours terminé." },
    timestamp: new Date().toISOString(),
  };
}

function buildCoursSummaryEmbed(
  cours: CoursRow,
  presentNames: string[],
  createurPseudo: string
) {
  const fields: { name: string; value: string; inline: boolean }[] = [];

  fields.push({
    name: "🎓 Enseignant",
    value: `**${createurPseudo}** — +${POINTS_CREATEUR} pts personnels`,
    inline: false,
  });

  if (presentNames.length > 0) {
    fields.push({
      name: `✅ Élèves présents (${presentNames.length})`,
      value: presentNames.join(", ").slice(0, 1024) + `\n\n**Gain :** +${POINTS_PARTICIPANT} pts personnels chacun`,
      inline: false,
    });
  }

  return {
    title: `📊 Résultats — ${cours.titre}`,
    color: 0x8b5cf6,
    description: `Le cours **${cours.titre}** est terminé ! Voici le récapitulatif des gains.\n*Aucun bonus d'escouade ne s'applique pour les cours.*`,
    fields,
    footer: { text: `${presentNames.length} présent(s) au total.` },
    timestamp: new Date().toISOString(),
  };
}

async function sendCoursEmbed(
  cours: CoursRow,
  pingStr: string
): Promise<string | null> {
  const botToken = getBotToken();
  if (!botToken) return null;

  try {
    const res = await fetch(
      `https://discord.com/api/v10/channels/${COURS_CHANNEL_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: pingStr || undefined,
          embeds: [buildCoursEmbed(cours, 0, false)],
          components: buildCoursComponents(cours.id),
        }),
        cache: "no-store",
      }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { id: string };
    return data.id;
  } catch {
    return null;
  }
}

async function patchCoursEmbed(
  discordMessageId: string,
  cours: CoursRow,
  participantCount: number
): Promise<void> {
  const botToken = getBotToken();
  if (!botToken) return;

  try {
    await fetch(
      `https://discord.com/api/v10/channels/${COURS_CHANNEL_ID}/messages/${discordMessageId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          embeds: [buildCoursEmbed(cours, participantCount, true)],
          components: buildCoursComponents(cours.id),
        }),
        cache: "no-store",
      }
    );
  } catch {
    // Ignorer silencieusement
  }
}

async function patchCoursEmbedClosed(
  discordMessageId: string,
  cours: CoursRow,
  presentCount: number
): Promise<void> {
  const botToken = getBotToken();
  if (!botToken) return;

  try {
    await fetch(
      `https://discord.com/api/v10/channels/${COURS_CHANNEL_ID}/messages/${discordMessageId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          embeds: [buildCoursClosedEmbed(cours, presentCount)],
          components: [],
        }),
        cache: "no-store",
      }
    );
  } catch {
    // Ignorer silencieusement
  }
}

async function sendCoursSummaryEmbed(
  cours: CoursRow,
  presentNames: string[],
  createurPseudo: string
): Promise<void> {
  const botToken = getBotToken();
  if (!botToken) return;

  try {
    await fetch(
      `https://discord.com/api/v10/channels/${COURS_CHANNEL_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          embeds: [buildCoursSummaryEmbed(cours, presentNames, createurPseudo)],
        }),
        cache: "no-store",
      }
    );
  } catch {
    // Ignorer silencieusement
  }
}

// ─── Public Server Actions ────────────────────────────────────────────────────

/** Retourne la liste de toutes les escouades (pour le dropdown de création). */
export async function getEscouadesOptions(): Promise<EscouadeOption[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("escouades")
    .select("id, nom, url_logo, discord_role_id")
    .order("nom");
  return (data as EscouadeOption[] | null) ?? [];
}

/** Retourne tous les cours (non supprimés). */
export async function getCours(): Promise<CoursRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cours")
    .select("*")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .is("deleted_at" as any, null)
    .order("cree_le", { ascending: false });
  const rows = (data as CoursRow[] | null) ?? [];
  return rows.map((r) => ({ ...r, ping_cible: normalizePingCible(r.ping_cible) }));
}

/** Retourne un cours par son ID. */
export async function getCoursById(id: string): Promise<CoursRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cours")
    .select("*")
    .eq("id", id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .is("deleted_at" as any, null)
    .single();
  if (!data) return null;
  const row = data as CoursRow;
  return { ...row, ping_cible: normalizePingCible(row.ping_cible) };
}

/** Retourne si l'utilisateur peut créer un cours. */
export async function canCreateCours(): Promise<boolean> {
  const result = await verifyCoursCreator();
  return !("error" in result);
}

/** Retourne si l'utilisateur est inscrit à un cours. */
export async function isCoursParticipant(coursId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("participations_cours")
    .select("id")
    .eq("cours_id", coursId)
    .eq("utilisateur_id", user.id)
    .maybeSingle();

  return !!data;
}

/** Retourne les participants d'un cours. */
export async function getCoursParticipants(
  coursId: string
): Promise<CoursParticipantRow[]> {
  const admin = await createAdminClient();

  const { data: participants } = await admin
    .from("participations_cours")
    .select(
      `id, utilisateur_id, present,
       utilisateurs!inner(pseudo, avatar_url, prenom_rp, nom_rp, grade_role)`
    )
    .eq("cours_id", coursId);

  if (!participants) return [];

  type RawRow = {
    id: string;
    utilisateur_id: string;
    present: boolean;
    utilisateurs: {
      pseudo: string;
      avatar_url: string | null;
      prenom_rp: string | null;
      nom_rp: string | null;
      grade_role: string | null;
    };
  };

  return (participants as unknown as RawRow[]).map((row) => ({
    id: row.id,
    utilisateur_id: row.utilisateur_id,
    pseudo: row.utilisateurs.pseudo,
    avatar_url: row.utilisateurs.avatar_url,
    prenom_rp: row.utilisateurs.prenom_rp,
    nom_rp: row.utilisateurs.nom_rp,
    grade_role: row.utilisateurs.grade_role,
    present: row.present,
  }));
}

/** Crée un nouveau cours et envoie l'embed Discord. */
export async function creerCours(
  payload: CoursPayload
): Promise<CreateCoursResult> {
  const auth = await verifyCoursCreator();
  if ("error" in auth) return { success: false, error: auth.error };

  const titre = payload.titre.trim();
  if (!titre || titre.length > 200) {
    return { success: false, error: "Titre invalide (1–200 caractères)." };
  }
  if (
    payload.capacite !== null &&
    (!Number.isInteger(payload.capacite) || payload.capacite < 1)
  ) {
    return { success: false, error: "Capacité invalide." };
  }

  // Au moins un ping
  const pc = payload.ping_cible;
  const hasAnyPing =
    pc.everyone || pc.eleve_exorciste ||
    (pc.escouadeIds && pc.escouadeIds.length > 0) ||
    (pc.clans && pc.clans.length > 0) ||
    (pc.grades && pc.grades.length > 0) ||
    (pc.gradeRoles && pc.gradeRoles.length > 0) ||
    (pc.gradeSecondaires && pc.gradeSecondaires.length > 0);
  if (!hasAnyPing) {
    return { success: false, error: "Sélectionnez au moins une cible de ping." };
  }

  const admin = await createAdminClient();

  const { data: coursData, error: insertError } = await admin
    .from("cours")
    .insert({
      createur_id: auth.userId,
      titre,
      description: payload.description.trim() || null,
      date_heure: payload.date_heure || null,
      capacite: payload.capacite,
      ping_cible: payload.ping_cible,
      statut: "active",
    })
    .select()
    .single();

  if (insertError || !coursData) {
    return {
      success: false,
      error: insertError?.message ?? "Échec de la création.",
    };
  }

  const cours = coursData as CoursRow;

  // Discord ping
  let escouadeRoles = new Map<string, string>();
  if (payload.ping_cible.escouadeIds?.length) {
    escouadeRoles = await getEscouadeDiscordRoles(payload.ping_cible.escouadeIds);
  }
  let pingStr = buildPingString(payload.ping_cible, escouadeRoles);
  if (auth.discordId) pingStr = `<@${auth.discordId}> ${pingStr}`;

  const discordMessageId = await sendCoursEmbed(cours, pingStr);
  if (discordMessageId) {
    await admin
      .from("cours")
      .update({ discord_message_id: discordMessageId })
      .eq("id", cours.id);
  }

  revalidatePath("/cours");
  return { success: true, coursId: cours.id };
}

/** Toggle l'inscription d'un utilisateur à un cours. */
export async function toggleCoursParticipation(
  coursId: string
): Promise<ActionResult> {
  if (!coursId || typeof coursId !== "string") {
    return { success: false, error: "ID de cours invalide." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié." };

  const admin = await createAdminClient();

  const { data: coursData } = await admin
    .from("cours")
    .select("id, titre, capacite, discord_message_id, statut, ping_cible")
    .eq("id", coursId)
    .single();

  const cours = coursData as {
    id: string;
    titre: string;
    capacite: number | null;
    discord_message_id: string | null;
    statut: string;
    ping_cible: PingCible | null;
  } | null;

  if (!cours) return { success: false, error: "Cours introuvable." };
  if (cours.statut !== "active") {
    return { success: false, error: "Ce cours n'est plus actif." };
  }

  const { data: existing } = await admin
    .from("participations_cours")
    .select("id")
    .eq("cours_id", coursId)
    .eq("utilisateur_id", user.id)
    .maybeSingle();

  if (existing) {
    await admin
      .from("participations_cours")
      .delete()
      .eq("cours_id", coursId)
      .eq("utilisateur_id", user.id);
  } else {
    // Vérification capacité
    if (cours.capacite !== null) {
      const { count } = await admin
        .from("participations_cours")
        .select("id", { count: "exact", head: true })
        .eq("cours_id", coursId);
      if ((count ?? 0) >= cours.capacite) {
        return { success: false, error: "Le cours est complet." };
      }
    }
    const { error } = await admin
      .from("participations_cours")
      .insert({ cours_id: coursId, utilisateur_id: user.id });
    if (error) return { success: false, error: error.message };
  }

  // Mise à jour embed Discord
  if (cours.discord_message_id) {
    const { count: newCount } = await admin
      .from("participations_cours")
      .select("id", { count: "exact", head: true })
      .eq("cours_id", coursId);

    const { data: fullCours } = await admin
      .from("cours")
      .select("*")
      .eq("id", coursId)
      .single();

    if (fullCours) {
      await patchCoursEmbed(
        cours.discord_message_id,
        fullCours as CoursRow,
        newCount ?? 0
      );
    }
  }

  revalidatePath(`/cours/${coursId}`);
  revalidatePath("/cours");
  return { success: true };
}

/** Marquer un participant comme présent ou absent (appel). */
export async function toggleCoursPresence(
  coursId: string,
  participantUserId: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié." };

  const admin = await createAdminClient();

  // Vérifier que c'est le créateur du cours
  const { data: coursData } = await admin
    .from("cours")
    .select("createur_id, statut")
    .eq("id", coursId)
    .single();

  if (!coursData) return { success: false, error: "Cours introuvable." };
  const cours = coursData as { createur_id: string; statut: string };

  if (cours.createur_id !== user.id) {
    // Vérifier aussi admin/prof
    const { data: caller } = await admin
      .from("utilisateurs")
      .select("role")
      .eq("id", user.id)
      .single();
    const callerRole = (caller as { role: string } | null)?.role;
    if (callerRole !== "admin" && callerRole !== "professeur") {
      return { success: false, error: "Seul le créateur du cours peut faire l'appel." };
    }
  }

  if (cours.statut !== "active") {
    return { success: false, error: "Ce cours n'est plus actif." };
  }

  // Toggle presence
  const { data: participation } = await admin
    .from("participations_cours")
    .select("id, present")
    .eq("cours_id", coursId)
    .eq("utilisateur_id", participantUserId)
    .maybeSingle();

  if (!participation) {
    return { success: false, error: "Ce participant n'est pas inscrit." };
  }

  const part = participation as { id: string; present: boolean };
  await admin
    .from("participations_cours")
    .update({ present: !part.present })
    .eq("id", part.id);

  revalidatePath(`/cours/${coursId}`);
  return { success: true };
}

/** Marquer tous les participants comme présents. */
export async function marquerTousPresents(coursId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié." };

  const admin = await createAdminClient();

  const { data: coursData } = await admin
    .from("cours")
    .select("createur_id, statut")
    .eq("id", coursId)
    .single();

  if (!coursData) return { success: false, error: "Cours introuvable." };
  const cours = coursData as { createur_id: string; statut: string };

  if (cours.createur_id !== user.id) {
    const { data: caller } = await admin
      .from("utilisateurs")
      .select("role")
      .eq("id", user.id)
      .single();
    const callerRole = (caller as { role: string } | null)?.role;
    if (callerRole !== "admin" && callerRole !== "professeur") {
      return { success: false, error: "Seul le créateur du cours peut faire l'appel." };
    }
  }

  if (cours.statut !== "active") {
    return { success: false, error: "Ce cours n'est plus actif." };
  }

  await admin
    .from("participations_cours")
    .update({ present: true })
    .eq("cours_id", coursId);

  revalidatePath(`/cours/${coursId}`);
  return { success: true };
}

// ─── Modifier un cours ────────────────────────────────────────────────────────

export type CoursEditPayload = {
  titre: string;
  date_heure: string | null;
  capacite: number | null;
  description: string;
};

/**
 * Modifie un cours actif (titre, date, capacité, description).
 * Met à jour l'embed Discord après modification.
 */
export async function modifierCours(
  coursId: string,
  payload: CoursEditPayload
): Promise<ActionResult> {
  if (!coursId || typeof coursId !== "string") {
    return { success: false, error: "ID de cours invalide." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié." };

  // Validation
  const titre = payload.titre.trim();
  if (!titre || titre.length > 200) {
    return { success: false, error: "Titre invalide (1–200 caractères)." };
  }
  if (
    payload.capacite !== null &&
    (!Number.isInteger(payload.capacite) || payload.capacite < 1)
  ) {
    return { success: false, error: "Capacité invalide." };
  }

  const admin = await createAdminClient();

  // Vérifier que le cours existe et est actif
  const { data: existing } = await admin
    .from("cours")
    .select("id, createur_id, statut, discord_message_id")
    .eq("id", coursId)
    .single();

  if (!existing) return { success: false, error: "Cours introuvable." };
  const cours = existing as { id: string; createur_id: string; statut: string; discord_message_id: string | null };

  if (cours.statut !== "active") {
    return { success: false, error: "Seul un cours actif peut être modifié." };
  }

  // Vérifier permissions (créateur ou admin/prof)
  if (cours.createur_id !== user.id) {
    const { data: caller } = await admin
      .from("utilisateurs")
      .select("role")
      .eq("id", user.id)
      .single();
    const callerRole = (caller as { role: string } | null)?.role;
    if (callerRole !== "admin" && callerRole !== "professeur") {
      return { success: false, error: "Permissions insuffisantes pour modifier ce cours." };
    }
  }

  // Mise à jour en base
  const { error: updateError } = await admin
    .from("cours")
    .update({
      titre,
      date_heure: payload.date_heure || null,
      capacite: payload.capacite,
      description: payload.description.trim() || null,
    })
    .eq("id", coursId);

  if (updateError) return { success: false, error: updateError.message };

  // Mettre à jour l'embed Discord
  if (cours.discord_message_id) {
    const { data: updatedCours } = await admin
      .from("cours")
      .select("*")
      .eq("id", coursId)
      .single();

    const { count: participantCount } = await admin
      .from("participations_cours")
      .select("id", { count: "exact", head: true })
      .eq("cours_id", coursId);

    if (updatedCours) {
      await patchCoursEmbed(
        cours.discord_message_id,
        updatedCours as CoursRow,
        participantCount ?? 0
      );
    }
  }

  revalidatePath(`/cours/${coursId}`);
  revalidatePath("/cours");
  return { success: true };
}

/** Termine un cours et distribue les points. */
export async function terminerCours(coursId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié." };

  const admin = await createAdminClient();

  const { data: coursData } = await admin
    .from("cours")
    .select("*")
    .eq("id", coursId)
    .single();

  if (!coursData) return { success: false, error: "Cours introuvable." };
  const cours = coursData as CoursRow;

  // Vérifier créateur ou admin/prof
  if (cours.createur_id !== user.id) {
    const { data: caller } = await admin
      .from("utilisateurs")
      .select("role")
      .eq("id", user.id)
      .single();
    const callerRole = (caller as { role: string } | null)?.role;
    if (callerRole !== "admin" && callerRole !== "professeur") {
      return { success: false, error: "Seul le créateur du cours peut le clôturer." };
    }
  }

  if (cours.statut !== "active") {
    return { success: false, error: "Cours déjà terminé ou annulé." };
  }

  // Récupérer les participants marqués présents
  const { data: presentParticipants } = await admin
    .from("participations_cours")
    .select("utilisateur_id")
    .eq("cours_id", coursId)
    .eq("present", true);

  const presentIds = (presentParticipants as { utilisateur_id: string }[] | null)?.map(
    (p) => p.utilisateur_id
  ) ?? [];

  if (presentIds.length < MIN_PRESENTS) {
    return {
      success: false,
      error: `Il faut au minimum ${MIN_PRESENTS} personnes présentes pour valider le cours. Actuellement : ${presentIds.length}.`,
    };
  }

  // Distribuer les points aux présents
  if (presentIds.length > 0) {
    await admin.rpc("incrementer_points_personnels_batch" as never, {
      user_ids: presentIds,
      increment_amount: POINTS_PARTICIPANT,
    } as never);
  }

  // Points au créateur
  await admin.rpc("incrementer_points_personnels_batch" as never, {
    user_ids: [cours.createur_id],
    increment_amount: POINTS_CREATEUR,
  } as never);

  // Marquer comme terminé
  await admin
    .from("cours")
    .update({ statut: "termine" })
    .eq("id", coursId);

  // Préparer les noms pour le résumé Discord
  const { data: presentUsers } = await admin
    .from("utilisateurs")
    .select("id, pseudo, prenom_rp, nom_rp")
    .in("id", presentIds);

  const presentNames = (presentUsers as { id: string; pseudo: string; prenom_rp: string | null; nom_rp: string | null }[] | null)?.map(
    (u) => (u.prenom_rp && u.nom_rp ? `${u.prenom_rp} ${u.nom_rp}` : u.pseudo)
  ) ?? [];

  const { data: creator } = await admin
    .from("utilisateurs")
    .select("pseudo, prenom_rp, nom_rp")
    .eq("id", cours.createur_id)
    .single();
  const creatorInfo = creator as { pseudo: string; prenom_rp: string | null; nom_rp: string | null } | null;
  const createurPseudo = creatorInfo
    ? (creatorInfo.prenom_rp && creatorInfo.nom_rp ? `${creatorInfo.prenom_rp} ${creatorInfo.nom_rp}` : creatorInfo.pseudo)
    : "Inconnu";

  // Discord : fermer l'embed et envoyer le résumé
  if (cours.discord_message_id) {
    await patchCoursEmbedClosed(cours.discord_message_id, cours, presentIds.length);
  }
  await sendCoursSummaryEmbed(cours, presentNames, createurPseudo);

  revalidatePath(`/cours/${coursId}`);
  revalidatePath("/cours");
  return { success: true };
}

/** Annule un cours. */
export async function annulerCours(coursId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié." };

  const admin = await createAdminClient();

  const { data } = await admin
    .from("cours")
    .select("createur_id, statut")
    .eq("id", coursId)
    .single();

  if (!data) return { success: false, error: "Cours introuvable." };
  const row = data as { createur_id: string; statut: string };

  if (row.statut !== "active") {
    return { success: false, error: "Cours déjà terminé ou annulé." };
  }

  // Vérifier créateur ou admin/prof
  if (row.createur_id !== user.id) {
    const { data: caller } = await admin
      .from("utilisateurs")
      .select("role")
      .eq("id", user.id)
      .single();
    const callerRole = (caller as { role: string } | null)?.role;
    if (callerRole !== "admin" && callerRole !== "professeur") {
      return { success: false, error: "Permissions insuffisantes." };
    }
  }

  await admin
    .from("cours")
    .update({ statut: "annule" })
    .eq("id", coursId);

  revalidatePath(`/cours/${coursId}`);
  revalidatePath("/cours");
  return { success: true };
}

/** Supprime un cours (soft-delete). */
export async function supprimerCours(coursId: string): Promise<ActionResult> {
  if (!coursId || typeof coursId !== "string") {
    return { success: false, error: "ID de cours invalide." };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié." };

  const admin = await createAdminClient();

  const [coursRes, callerRes] = await Promise.all([
    admin.from("cours").select("id, createur_id, statut").eq("id", coursId).single(),
    admin.from("utilisateurs").select("role, grade_role").eq("id", user.id).single(),
  ]);

  const cours = coursRes.data as { id: string; createur_id: string; statut: string } | null;
  if (!cours) return { success: false, error: "Cours introuvable." };

  const caller = callerRes.data as { role: string; grade_role: GradeRole | null } | null;
  if (!caller) return { success: false, error: "Utilisateur introuvable." };

  const isCreator = cours.createur_id === user.id;
  const isAdminOrProf = caller.role === "admin" || caller.role === "professeur";

  if (!isCreator && !isAdminOrProf) {
    return { success: false, error: "Permissions insuffisantes." };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from("cours") as any)
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", coursId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/cours");
  revalidatePath(`/cours/${coursId}`);
  return { success: true };
}
