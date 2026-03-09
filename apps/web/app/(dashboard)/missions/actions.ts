"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { DISCORD_GUILD_ID } from "@/lib/discord/guild-member";
import { MAX_MISSION_POINTS, MAX_CUSTOM_MISSION_POINTS } from "@/lib/missions/config";
import {
  CLAN_ROLE_IDS,
  GRADE_TO_ROLE_ID,
  GRADE_ROLE_TO_ROLE_ID,
  GRADE_SECONDAIRE_TO_ROLE_ID,
  DISCORD_GRADE_MAP,
  DISCORD_ROLE_GRADE_MAP,
  DISCORD_GRADE_SECONDAIRE_MAP,
} from "@/lib/discord/role-mappings";
import type { GradeRole, Grades, GradeSecondaire } from "@/types/database";
import type { ClanName } from "@/lib/discord/role-mappings";
import { normalizePingCible } from "./mission-utils";
import type { PingCible } from "./mission-utils";
export type { PingCible } from "./mission-utils";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Canal Discord où les embeds de mission sont postés. */
const MISSION_CHANNEL_ID = "1479038626749878335";

/**
 * Rôle Discord spécial permettant de créer des missions.
 * S'ajoute aux conditions grade_role et conseil.
 */
const MISSION_CREATOR_ROLE_ID = "1479039157769732106";

/** Rôle Discord "Élève Exorciste" (depuis role-mappings.ts). */
const ELEVE_EXORCISTE_ROLE_ID = "1460101248148570122";

/** Grade-rôles autorisant la création de missions (Exo Pro ou supérieur). */
const EXO_PRO_PLUS: GradeRole[] = [
  "Exorciste Pro",
  "Professeur",
  "Professeur Principal",
  "Co-Directeur",
  "Directeur",
];

// ─── Types ────────────────────────────────────────────────────────────────────

export type MissionPayload = {
  titre: string;
  date_heure: string | null;
  capacite: number | null; // null = illimité
  ping_cible: PingCible;
  points_recompense: number;
  synopsis: string;
};

export type MissionRow = {
  id: string;
  createur_id: string;
  titre: string;
  date_heure: string | null;
  capacite: number | null;
  ping_cible: PingCible;
  points_recompense: number;
  points_individuels: number;
  synopsis: string | null;
  discord_message_id: string | null;
  statut: "active" | "terminee" | "annulee";
  cree_le: string;
  mis_a_jour_le: string;
};

export type EscouadeOption = {
  id: string;
  nom: string;
  url_logo: string | null;
  discord_role_id: string | null;
};

export type ParticipantRow = {
  utilisateur_id: string;
  pseudo: string;
  avatar_url: string | null;
  prenom_rp: string | null;
  nom_rp: string | null;
  grade_role: string | null;
  escouade: {
    id: string;
    nom: string;
    url_logo: string | null;
  } | null;
};

export type SquadGroup = {
  escouadeId: string;
  nom: string;
  url_logo: string | null;
  participants: ParticipantRow[];
  totalSize: number;
  multiplier: number;
  /** Points bonus escouade = base × (multiplier - 1) × participantCount */
  pointsEarned: number;
};

export type ActionResult = { success: true } | { success: false; error: string };

export type CreateMissionResult =
  | { success: true; missionId: string }
  | { success: false; error: string };

export type MissionLogRow = {
  id: string;
  mission_id: string | null;
  mission_titre: string | null;
  utilisateur_id: string | null;
  utilisateur_pseudo: string | null;
  action: "creation" | "participation" | "depart" | "terminee" | "annulee";
  details: Record<string, unknown>;
  cree_le: string;
};

// ─── Reward Multiplier Logic ─────────────────────────────────────────────────

/**
 * Calcule le multiplicateur de récompense pour une escouade selon le nombre de
 * participants et la taille totale de l'escouade.
 *
 * Règles :
 *  - 5+ membres de la même escouade       → ×2.25
 *  - Toute l'escouade                      → ×2
 *  - 3+ membres (ou 2+ si escouade de 3)  → ×1.5
 *  - Sinon                                 → ×1
 *
 * Le bonus escouade = base × (multiplier - 1) par participant.
 * Les points personnels = base pour chaque participant (pas de multiplicateur).
 */
function calculateMultiplier(
  participantCount: number,
  totalSquadSize: number
): number {
  if (participantCount >= 5) return 2.25;
  if (participantCount >= totalSquadSize && totalSquadSize >= 2) return 2;
  if (participantCount >= 3) return 1.5;
  if (totalSquadSize === 3 && participantCount >= 2) return 1.5;
  return 1;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function getBotToken(): string | null {
  return process.env.DISCORD_BOT_TOKEN ?? null;
}

function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  // Domaine court (alias Vercel) — utilisé pour les embeds Discord
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  // Variables injectées automatiquement par Vercel côté serveur
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

/**
 * Vérifie que l'utilisateur courant est autorisé à créer une mission :
 *  1. Admin ou Professeur (rôle DB)
 *  2. Grade-rôle Exorciste Pro ou supérieur
 *  3. Membre du Conseil des élèves
 *  4. Rôle Discord MISSION_CREATOR_ROLE_ID
 */
async function verifyMissionCreator(): Promise<
  { userId: string; discordId: string } | { error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié." };

  const { data: u } = await supabase
    .from("utilisateurs")
    .select("role, grade_role, discord_id")
    .eq("id", user.id)
    .single();

  if (!u) return { error: "Utilisateur introuvable." };

  const uu = u as {
    role: string;
    grade_role: GradeRole | null;
    discord_id: string | null;
  };

  // Condition 1 : admin ou professeur
  if (uu.role === "admin" || uu.role === "professeur") {
    return { userId: user.id, discordId: uu.discord_id ?? "" };
  }

  // Condition 2 : Exo Pro ou supérieur
  if (uu.grade_role && EXO_PRO_PLUS.includes(uu.grade_role)) {
    return { userId: user.id, discordId: uu.discord_id ?? "" };
  }

  const adminClient = await createAdminClient();

  // Condition 3 : Membre du Conseil des élèves
  const { data: conseil } = await adminClient
    .from("conseil_membres")
    .select("id")
    .eq("utilisateur_id", user.id)
    .maybeSingle();

  if (conseil) return { userId: user.id, discordId: uu.discord_id ?? "" };

  // Condition 4 : Rôle Discord spécifique
  const botToken = getBotToken();
  if (botToken && uu.discord_id) {
    try {
      const res = await fetch(
        `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${uu.discord_id}`,
        {
          headers: { Authorization: `Bot ${botToken}` },
          cache: "no-store",
        }
      );
      if (res.ok) {
        const member = (await res.json()) as { roles: string[] };
        if (
          Array.isArray(member.roles) &&
          member.roles.includes(MISSION_CREATOR_ROLE_ID)
        ) {
          return { userId: user.id, discordId: uu.discord_id };
        }
      }
    } catch {
      // Ignorer les erreurs Discord – refuser l'accès par défaut
    }
  }

  return { error: "Vous n'avez pas les permissions pour créer une mission." };
}

// ─── Mission Log Helper ──────────────────────────────────────────────────────

type AdminClient = Awaited<ReturnType<typeof createAdminClient>>;

async function logMissionEvent(
  admin: AdminClient,
  params: {
    mission_id: string | null;
    mission_titre: string | null;
    utilisateur_id: string | null;
    utilisateur_pseudo: string | null;
    action: MissionLogRow["action"];
    details?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    await admin.from("mission_logs").insert({
      mission_id: params.mission_id,
      mission_titre: params.mission_titre,
      utilisateur_id: params.utilisateur_id,
      utilisateur_pseudo: params.utilisateur_pseudo,
      action: params.action,
      details: params.details ?? {},
    });
  } catch {
    // Les erreurs de log ne bloquent pas les actions principales
  }
}

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

function buildEmbed(
  mission: MissionRow,
  participantCount: number,
  isUpdate = false
) {
  const dateText = mission.date_heure
    ? new Date(mission.date_heure).toLocaleString("fr-FR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Date non définie";

  const spotsValue =
    mission.capacite === null
      ? "Illimité"
      : isUpdate
      ? `${Math.max(0, mission.capacite - participantCount)} / ${mission.capacite}`
      : String(mission.capacite);

  const fields = [
    { name: "📅 Date / Heure", value: dateText, inline: false },
    {
      name: isUpdate ? "👥 Places restantes" : "👥 Places",
      value: spotsValue,
      inline: true,
    },
    {
      name: "⭐ Points par participant",
      value: `${mission.points_recompense} pts`,
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
    title: `⚔️  ${mission.titre}`,
    color: isUpdate && participantCount > 0 ? 0x22c55e : 0x3b82f6,
    description: mission.synopsis
      ? mission.synopsis.slice(0, 4000)
      : "Aucune description.",
    fields,
    footer: {
      text: "Cliquez sur le bouton ci-dessous pour vous inscrire sur le site.",
    },
    timestamp: new Date().toISOString(),
  };
}

function buildComponents(missionId: string) {
  const siteUrl = getSiteUrl();
  return [
    {
      type: 1,
      components: [
        {
          type: 2,
          style: 5, // Link
          label: "📋 Voir & Rejoindre la Mission",
          url: `${siteUrl}/missions/${missionId}`,
        },
      ],
    },
  ];
}

function buildClosedEmbed(mission: MissionRow, participantCount: number) {
  return {
    title: `🏁  ${mission.titre} — Mission Clôturée`,
    color: 0x6b7280,
    description: mission.synopsis
      ? mission.synopsis.slice(0, 4000)
      : "Aucune description.",
    fields: [
      { name: "👥 Participants", value: String(participantCount), inline: true },
    ],
    footer: { text: "Mission terminée." },
    timestamp: new Date().toISOString(),
  };
}

function buildSummaryEmbed(
  mission: MissionRow,
  bySquad: SquadGroup[],
  solo: ParticipantRow[],
  newTotals: Map<string, number>
) {
  const fields: { name: string; value: string; inline: boolean }[] = [];

  for (const squad of bySquad) {
    const names = squad.participants
      .map((p) =>
        p.prenom_rp && p.nom_rp ? `${p.prenom_rp} ${p.nom_rp}` : p.pseudo
      )
      .join(", ");
    const newTotal = newTotals.get(squad.escouadeId) ?? 0;
    const bonusPerPerson = Math.floor(mission.points_recompense * (squad.multiplier - 1));
    const lines = [
      `**Membres :** ${names}`,
      `**Gain personnel :** +${mission.points_recompense} pts chacun`,
    ];
    if (squad.pointsEarned > 0) {
      lines.push(`**Bonus escouade :** +${squad.pointsEarned} pts (${squad.participants.length} × ${bonusPerPerson} pts, ×${squad.multiplier})`);
      lines.push(`**Total escouade :** ${newTotal} pts`);
    }
    const value = lines.join("\n").slice(0, 1024);
    fields.push({ name: `🏴 ${squad.nom}`.slice(0, 256), value, inline: false });
  }

  if (solo.length > 0) {
    const soloNames = solo
      .map((p) =>
        p.prenom_rp && p.nom_rp ? `${p.prenom_rp} ${p.nom_rp}` : p.pseudo
      )
      .join(", ");
    const soloValue = [`**Membres :** ${soloNames}`, `**Gain personnel :** +${mission.points_recompense} pts chacun`].join("\n").slice(0, 1024);
    fields.push({ name: "🧍 Sans escouade", value: soloValue, inline: false });
  }

  const totalParticipants =
    bySquad.reduce((acc, s) => acc + s.participants.length, 0) + solo.length;

  return {
    title: `📊 Résultats — ${mission.titre}`,
    color: 0xf59e0b,
    description: `La mission **${mission.titre}** est terminée ! Voici le récapitulatif des gains.`,
    fields,
    footer: { text: `${totalParticipants} participant(s) au total.` },
    timestamp: new Date().toISOString(),
  };
}

async function sendMissionSummaryEmbed(
  mission: MissionRow,
  bySquad: SquadGroup[],
  solo: ParticipantRow[],
  newTotals: Map<string, number>
): Promise<void> {
  const botToken = getBotToken();
  if (!botToken) return;

  try {
    await fetch(
      `https://discord.com/api/v10/channels/${MISSION_CHANNEL_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          embeds: [buildSummaryEmbed(mission, bySquad, solo, newTotals)],
        }),
        cache: "no-store",
      }
    );
  } catch {
    // Ignorer silencieusement les échecs Discord
  }
}

async function patchDiscordEmbedClosed(
  discordMessageId: string,
  mission: MissionRow,
  participantCount: number
): Promise<void> {
  const botToken = getBotToken();
  if (!botToken) return;

  try {
    await fetch(
      `https://discord.com/api/v10/channels/${MISSION_CHANNEL_ID}/messages/${discordMessageId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          embeds: [buildClosedEmbed(mission, participantCount)],
          components: [],
        }),
        cache: "no-store",
      }
    );
  } catch {
    // Ignorer silencieusement les échecs Discord
  }
}

async function sendDiscordEmbed(
  mission: MissionRow,
  pingStr: string
): Promise<string | null> {
  const botToken = getBotToken();
  if (!botToken) return null;

  const body = {
    content: pingStr || undefined,
    embeds: [buildEmbed(mission, 0, false)],
    components: buildComponents(mission.id),
  };

  try {
    const res = await fetch(
      `https://discord.com/api/v10/channels/${MISSION_CHANNEL_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
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

async function patchDiscordEmbed(
  discordMessageId: string,
  mission: MissionRow,
  participantCount: number
): Promise<void> {
  const botToken = getBotToken();
  if (!botToken) return;

  try {
    await fetch(
      `https://discord.com/api/v10/channels/${MISSION_CHANNEL_ID}/messages/${discordMessageId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bot ${botToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          embeds: [buildEmbed(mission, participantCount, true)],
          components: buildComponents(mission.id),
        }),
        cache: "no-store",
      }
    );
  } catch {
    // Ignorer silencieusement les échecs de mise à jour Discord
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

/** Retourne toutes les missions actives (non supprimées, les plus récentes en premier). */
export async function getMissions(): Promise<MissionRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("missions")
    .select("*")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .is("deleted_at" as any, null)
    .order("cree_le", { ascending: false });
  const rows = (data as MissionRow[] | null) ?? [];
  return rows.map((r) => ({ ...r, ping_cible: normalizePingCible(r.ping_cible) }));
}

/** Retourne une mission par son ID (si non supprimée). */
export async function getMission(id: string): Promise<MissionRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("missions")
    .select("*")
    .eq("id", id)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .is("deleted_at" as any, null)
    .single();
  if (!data) return null;
  const row = data as MissionRow;
  return { ...row, ping_cible: normalizePingCible(row.ping_cible) };
}

/** Vérifie si l'utilisateur connecté peut créer une mission. */
export async function canCreateMission(): Promise<boolean> {
  const result = await verifyMissionCreator();
  return !("error" in result);
}

/** Vérifie si l'utilisateur connecté est inscrit à une mission. */
export async function isParticipant(missionId: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("participations_mission")
    .select("id")
    .eq("mission_id", missionId)
    .eq("utilisateur_id", user.id)
    .maybeSingle();

  return !!data;
}

/** Retourne les participants d'une mission, groupés par escouade. */
export async function getMissionParticipants(missionId: string): Promise<{
  solo: ParticipantRow[];
  bySquad: SquadGroup[];
  totalCount: number;
}> {
  const admin = await createAdminClient();

  // Récupérer les points de base de la mission
  const { data: missionData } = await admin
    .from("missions")
    .select("points_recompense")
    .eq("id", missionId)
    .single();
  const basePoints =
    (missionData as { points_recompense: number } | null)?.points_recompense ??
    0;

  // Participants avec infos utilisateur + escouade
  const { data: participants } = await admin
    .from("participations_mission")
    .select(
      `utilisateur_id,
       utilisateurs!inner(
         pseudo, avatar_url, prenom_rp, nom_rp, grade_role,
         membres_escouade(
           escouade_id,
           escouades(id, nom, url_logo)
         )
       )`
    )
    .eq("mission_id", missionId);

  if (!participants) return { solo: [], bySquad: [], totalCount: 0 };

  type RawMembre = {
    escouade_id: string;
    escouades: { id: string; nom: string; url_logo: string | null } | null;
  };
  type RawParticipant = {
    utilisateur_id: string;
    utilisateurs: {
      pseudo: string;
      avatar_url: string | null;
      prenom_rp: string | null;
      nom_rp: string | null;
      grade_role: string | null;
      // PostgREST v11+ retourne un objet (one-to-one via UNIQUE) au lieu d'un tableau
      membres_escouade: RawMembre[] | RawMembre | null;
    };
  };

  const rows = participants as unknown as RawParticipant[];
  const soloParticipants: ParticipantRow[] = [];
  const squadMap = new Map<
    string,
    {
      escouadeId: string;
      nom: string;
      url_logo: string | null;
      participants: ParticipantRow[];
    }
  >();

  for (const row of rows) {
    const u = row.utilisateurs;
    const membreRaw = u.membres_escouade;
    const firstMembre = Array.isArray(membreRaw) ? membreRaw[0] : membreRaw;
    const escouade = firstMembre?.escouades ?? null;

    const participant: ParticipantRow = {
      utilisateur_id: row.utilisateur_id,
      pseudo: u.pseudo,
      avatar_url: u.avatar_url,
      prenom_rp: u.prenom_rp,
      nom_rp: u.nom_rp,
      grade_role: u.grade_role,
      escouade: escouade
        ? { id: escouade.id, nom: escouade.nom, url_logo: escouade.url_logo }
        : null,
    };

    if (escouade) {
      if (!squadMap.has(escouade.id)) {
        squadMap.set(escouade.id, {
          escouadeId: escouade.id,
          nom: escouade.nom,
          url_logo: escouade.url_logo,
          participants: [],
        });
      }
      squadMap.get(escouade.id)!.participants.push(participant);
    } else {
      soloParticipants.push(participant);
    }
  }

  // Récupérer la taille totale de chaque escouade pour le multiplicateur
  const squadIds = [...squadMap.keys()];
  const squadSizes = new Map<string, number>();

  if (squadIds.length > 0) {
    const { data: memberCounts } = await admin
      .from("membres_escouade")
      .select("escouade_id")
      .in("escouade_id", squadIds);

    if (memberCounts) {
      for (const { escouade_id } of memberCounts as { escouade_id: string }[]) {
        squadSizes.set(escouade_id, (squadSizes.get(escouade_id) ?? 0) + 1);
      }
    }
  }

  const bySquad: SquadGroup[] = [...squadMap.values()]
    .map((sq) => {
      const totalSize = squadSizes.get(sq.escouadeId) ?? sq.participants.length;
      const multiplier = calculateMultiplier(sq.participants.length, totalSize);
      // Bonus escouade = base × (multiplier - 1) par participant
      const bonusPerParticipant = Math.floor(basePoints * (multiplier - 1));
      return {
        ...sq,
        totalSize,
        multiplier,
        pointsEarned: bonusPerParticipant * sq.participants.length,
      };
    })
    .sort((a, b) => b.participants.length - a.participants.length);

  return {
    solo: soloParticipants,
    bySquad,
    totalCount: rows.length,
  };
}

/**
 * Crée une nouvelle mission, l'enregistre en base et envoie l'embed Discord.
 */
export async function creerMission(
  payload: MissionPayload
): Promise<CreateMissionResult> {
  const auth = await verifyMissionCreator();
  if ("error" in auth) return { success: false, error: auth.error };

  // Validation des entrées
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
  if (
    !Number.isInteger(payload.points_recompense) ||
    payload.points_recompense < 0 ||
    payload.points_recompense > MAX_CUSTOM_MISSION_POINTS
  ) {
    return {
      success: false,
      error: `Les points doivent être entre 0 et ${MAX_CUSTOM_MISSION_POINTS}.`,
    };
  }
  if (payload.ping_cible.escouadeIds?.length === 0) {
    return { success: false, error: "Sélectionnez au moins une escouade." };
  }
  if (payload.ping_cible.clans?.length === 0) {
    return { success: false, error: "Sélectionnez au moins un clan." };
  }
  if (payload.ping_cible.grades?.length === 0) {
    return { success: false, error: "Sélectionnez au moins un grade de combat." };
  }
  if (payload.ping_cible.gradeRoles?.length === 0) {
    return { success: false, error: "Sélectionnez au moins un rôle hiérarchique." };
  }
  if (payload.ping_cible.gradeSecondaires?.length === 0) {
    return { success: false, error: "Sélectionnez au moins un grade scolaire." };
  }
  // Au moins une catégorie de ping doit être sélectionnée
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

  const { data: missionData, error: insertError } = await admin
    .from("missions")
    .insert({
      createur_id: auth.userId,
      titre,
      date_heure: payload.date_heure || null,
      capacite: payload.capacite,
      ping_cible: payload.ping_cible,
      points_recompense: payload.points_recompense,
      points_individuels: payload.points_recompense,
      synopsis: payload.synopsis.trim() || null,
      statut: "active",
    })
    .select()
    .single();

  if (insertError || !missionData) {
    return {
      success: false,
      error: insertError?.message ?? "Échec de la création.",
    };
  }

  const mission = missionData as MissionRow;

  // Construction du ping Discord
  let escouadeRoles = new Map<string, string>();
  if (payload.ping_cible.escouadeIds?.length) {
    escouadeRoles = await getEscouadeDiscordRoles(payload.ping_cible.escouadeIds);
  }
  const pingStr = buildPingString(payload.ping_cible, escouadeRoles);

  // Envoi de l'embed Discord
  const discordMessageId = await sendDiscordEmbed(mission, pingStr);
  if (discordMessageId) {
    await admin
      .from("missions")
      .update({ discord_message_id: discordMessageId })
      .eq("id", mission.id);
  }

  // Journalisation création
  const { data: creator } = await admin
    .from("utilisateurs")
    .select("pseudo")
    .eq("id", auth.userId)
    .single();
  await logMissionEvent(admin, {
    mission_id: mission.id,
    mission_titre: mission.titre,
    utilisateur_id: auth.userId,
    utilisateur_pseudo: (creator as { pseudo: string } | null)?.pseudo ?? null,
    action: "creation",
    details: { points_recompense: mission.points_recompense, capacite: mission.capacite },
  });

  revalidatePath("/missions");
  return { success: true, missionId: mission.id };
}

/**
 * Vérifie si un utilisateur est éligible à rejoindre une mission avec restriction.
 * L'utilisateur est éligible s'il correspond à AU MOINS UN critère parmi les
 * catégories sélectionnées (logique OU).
 * Retourne null si éligible, ou un message d'erreur sinon.
 */
async function checkParticipationEligibility(
  userId: string,
  pingCible: PingCible,
  admin: AdminClient
): Promise<string | null> {
  // @everyone ⇒ tout le monde est éligible
  if (pingCible.everyone) return null;

  // Vérif élève exorciste
  if (pingCible.eleve_exorciste) {
    const { data: u } = await admin
      .from("utilisateurs")
      .select("grade_role")
      .eq("id", userId)
      .single();
    const gradeRole = (u as { grade_role: string | null } | null)?.grade_role;
    if (gradeRole === "Élève Exorciste") return null;
  }

  // Vérif escouade
  if (pingCible.escouadeIds?.length) {
    const { data: membre } = await admin
      .from("membres_escouade")
      .select("escouade_id")
      .eq("utilisateur_id", userId)
      .maybeSingle();
    const escouadeId = (membre as { escouade_id: string } | null)?.escouade_id;
    if (escouadeId && pingCible.escouadeIds.includes(escouadeId)) return null;
  }

  // Vérif rôles Discord (clans, grades, grade_roles, grade_secondaire)
  const needsDiscord =
    (pingCible.clans?.length ?? 0) > 0 ||
    (pingCible.grades?.length ?? 0) > 0 ||
    (pingCible.gradeRoles?.length ?? 0) > 0 ||
    (pingCible.gradeSecondaires?.length ?? 0) > 0;

  if (needsDiscord) {
    const { data: u } = await admin
      .from("utilisateurs")
      .select("discord_id")
      .eq("id", userId)
      .single();
    const discordId = (u as { discord_id: string | null } | null)?.discord_id;
    if (!discordId) {
      // Pas de discord_id → ne peut pas vérifier les rôles, non éligible pour ces critères
    } else {
      const botToken = getBotToken();
      if (botToken) {
        try {
          const res = await fetch(
            `https://discord.com/api/v10/guilds/${DISCORD_GUILD_ID}/members/${discordId}`,
            {
              headers: { Authorization: `Bot ${botToken}` },
              cache: "no-store",
            }
          );
          if (res.ok) {
            const member = (await res.json()) as { roles: string[] };
            const userRoles = new Set(member.roles);

            if (pingCible.clans?.some((clan) => {
              const cr = CLAN_ROLE_IDS[clan];
              return userRoles.has(cr.membre) || userRoles.has(cr.patriarche);
            })) return null;

            if (pingCible.grades?.some((g) => {
              const roleId = GRADE_TO_ROLE_ID[g];
              return roleId && userRoles.has(roleId);
            })) return null;

            if (pingCible.gradeRoles?.some((gr) => {
              const roleId = GRADE_ROLE_TO_ROLE_ID[gr];
              return roleId && userRoles.has(roleId);
            })) return null;

            if (pingCible.gradeSecondaires?.some((gs) => {
              const roleId = GRADE_SECONDAIRE_TO_ROLE_ID[gs];
              return roleId && userRoles.has(roleId);
            })) return null;
          }
        } catch {
          return null; // En cas d'erreur réseau, on laisse passer
        }
      } else {
        return null; // Pas de bot token → on laisse passer
      }
    }
  }

  // Aucun critère ne correspondait
  // Mais s'il n'y avait que everyone/eleve_exorciste de coché et qu'on est arrivé ici,
  // c'est que l'utilisateur ne match pas
  return "Vous n'êtes pas éligible à cette mission (critères non remplis).";
}

/**
 * Toggle l'inscription d'un utilisateur à une mission.
 * Rejoint si non inscrit, quitte si déjà inscrit.
 * Met à jour l'embed Discord après chaque changement.
 */
export async function toggleParticipation(
  missionId: string
): Promise<ActionResult> {
  if (!missionId || typeof missionId !== "string") {
    return { success: false, error: "ID de mission invalide." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié." };

  const admin = await createAdminClient();

  const { data: missionData } = await admin
    .from("missions")
    .select("id, titre, capacite, discord_message_id, statut, points_recompense, ping_cible")
    .eq("id", missionId)
    .single();

  const mission = missionData as {
    id: string;
    titre: string;
    capacite: number | null;
    discord_message_id: string | null;
    statut: string;
    points_recompense: number;
    ping_cible: PingCible | null;
  } | null;

  if (!mission) return { success: false, error: "Mission introuvable." };
  if (mission.statut !== "active") {
    return { success: false, error: "Cette mission n'est plus active." };
  }

  const { data: existing } = await admin
    .from("participations_mission")
    .select("id")
    .eq("mission_id", missionId)
    .eq("utilisateur_id", user.id)
    .maybeSingle();

  const logAction: "participation" | "depart" = existing ? "depart" : "participation";

  if (existing) {
    // Désinscription
    await admin
      .from("participations_mission")
      .delete()
      .eq("mission_id", missionId)
      .eq("utilisateur_id", user.id);
  } else {
    // ── Vérification d'éligibilité (restreindre_aux_pings) ────────────────
    const pingCible = mission.ping_cible ? normalizePingCible(mission.ping_cible) : null;
    if (pingCible?.restreindre) {
      const eligibilityError = await checkParticipationEligibility(
        user.id,
        pingCible,
        admin
      );
      if (eligibilityError) return { success: false, error: eligibilityError };
    }

    // Vérification de la capacité
    if (mission.capacite !== null) {
      const { count } = await admin
        .from("participations_mission")
        .select("id", { count: "exact", head: true })
        .eq("mission_id", missionId);
      if ((count ?? 0) >= mission.capacite) {
        return { success: false, error: "La mission est complète." };
      }
    }
    // Inscription
    const { error } = await admin
      .from("participations_mission")
      .insert({ mission_id: missionId, utilisateur_id: user.id });
    if (error) return { success: false, error: error.message };
  }

  // Journalisation participation / départ
  const { data: participantRow } = await admin
    .from("utilisateurs")
    .select("pseudo")
    .eq("id", user.id)
    .single();
  await logMissionEvent(admin, {
    mission_id: missionId,
    mission_titre: mission.titre,
    utilisateur_id: user.id,
    utilisateur_pseudo: (participantRow as { pseudo: string } | null)?.pseudo ?? null,
    action: logAction,
    details: { points_recompense: mission.points_recompense },
  });

  // Mise à jour de l'embed Discord
  if (mission.discord_message_id) {
    const { count: newCount } = await admin
      .from("participations_mission")
      .select("id", { count: "exact", head: true })
      .eq("mission_id", missionId);

    const { data: fullMission } = await admin
      .from("missions")
      .select("*")
      .eq("id", missionId)
      .single();

    if (fullMission) {
      await patchDiscordEmbed(
        mission.discord_message_id,
        fullMission as MissionRow,
        newCount ?? 0
      );
    }
  }

  revalidatePath(`/missions/${missionId}`);
  revalidatePath("/missions");
  return { success: true };
}

/**
 * Termine une mission, applique les multiplicateurs et attribue les points
 * aux escouades participantes via hauts_faits_escouade.
 */
export async function terminerMission(missionId: string): Promise<ActionResult> {
  const auth = await verifyMissionCreator();
  if ("error" in auth) return { success: false, error: auth.error };

  const admin = await createAdminClient();

  const { data: missionData } = await admin
    .from("missions")
    .select("*")
    .eq("id", missionId)
    .single();

  if (!missionData) return { success: false, error: "Mission introuvable." };
  const mission = missionData as MissionRow;

  if (mission.statut !== "active") {
    return { success: false, error: "Mission déjà terminée ou annulée." };
  }

  // Récupérer les groupes de participants pour calculer les multiplicateurs
  const { bySquad, solo, totalCount } = await getMissionParticipants(missionId);

  // Attribuer les points à chaque escouade participante
  const newTotals = new Map<string, number>();

  for (const squad of bySquad) {
    // Récupérer les points actuels
    const { data: escouadeData } = await admin
      .from("escouades")
      .select("points")
      .eq("id", squad.escouadeId)
      .single();

    const currentPoints =
      (escouadeData as { points: number } | null)?.points ?? 0;

    if (squad.pointsEarned > 0) {
      // Mettre à jour les points
      await admin
        .from("escouades")
        .update({ points: currentPoints + squad.pointsEarned })
        .eq("id", squad.escouadeId);

      // Créer une entrée dans le journal (hauts_faits_escouade)
      const bonusPerPerson = Math.floor(mission.points_recompense * (squad.multiplier - 1));
      const raison = `Mission : ${mission.titre} — ${squad.participants.length} membre(s) × ${bonusPerPerson} pts bonus (×${squad.multiplier})`;

      await admin.from("hauts_faits_escouade").insert({
        escouade_id: squad.escouadeId,
        attribue_par: auth.userId,
        points: squad.pointsEarned,
        raison: raison.slice(0, 500),
      });
    }

    newTotals.set(squad.escouadeId, currentPoints + squad.pointsEarned);
  }

  // Marquer la mission comme terminée
  await admin
    .from("missions")
    .update({ statut: "terminee" })
    .eq("id", missionId);

  // Attribuer les points personnels à tous les participants
  // Chaque participant reçoit points_recompense en points personnels
  const allParticipantIds = [
    ...bySquad.flatMap((sq) => sq.participants.map((p) => p.utilisateur_id)),
    ...solo.map((p) => p.utilisateur_id),
  ];

  const individualPoints = mission.points_recompense;
  if (allParticipantIds.length > 0 && individualPoints > 0) {
    await admin.rpc("incrementer_points_personnels_batch" as never, {
      user_ids: allParticipantIds,
      increment_amount: individualPoints,
    } as never);
  }

  // Mettre à jour l'embed Discord original (mission clôturée) et envoyer le résumé
  if (mission.discord_message_id) {
    await patchDiscordEmbedClosed(mission.discord_message_id, mission, totalCount);
  }
  await sendMissionSummaryEmbed(mission, bySquad, solo, newTotals);

  // Journalisation clôture
  const { data: closer } = await admin
    .from("utilisateurs")
    .select("pseudo")
    .eq("id", auth.userId)
    .single();
  const nbParticipants = bySquad.reduce((acc, sq) => acc + sq.participants.length, 0);
  const totalPoints = bySquad.reduce((acc, sq) => acc + sq.pointsEarned, 0);
  await logMissionEvent(admin, {
    mission_id: missionId,
    mission_titre: mission.titre,
    utilisateur_id: auth.userId,
    utilisateur_pseudo: (closer as { pseudo: string } | null)?.pseudo ?? null,
    action: "terminee",
    details: { nb_participants: nbParticipants, total_points: totalPoints },
  });

  revalidatePath(`/missions/${missionId}`);
  revalidatePath("/missions");
  return { success: true };
}

/** Annule une mission (réservé aux créateurs et admins). */
export async function annulerMission(missionId: string): Promise<ActionResult> {
  const auth = await verifyMissionCreator();
  if ("error" in auth) return { success: false, error: auth.error };

  const admin = await createAdminClient();

  const { data } = await admin
    .from("missions")
    .select("createur_id, statut, titre")
    .eq("id", missionId)
    .single();

  if (!data) return { success: false, error: "Mission introuvable." };
  const row = data as { createur_id: string; statut: string; titre: string };

  if (row.statut !== "active") {
    return { success: false, error: "Mission déjà terminée ou annulée." };
  }

  await admin
    .from("missions")
    .update({ statut: "annulee" })
    .eq("id", missionId);

  // Journalisation annulation
  const { data: canceller } = await admin
    .from("utilisateurs")
    .select("pseudo")
    .eq("id", auth.userId)
    .single();
  await logMissionEvent(admin, {
    mission_id: missionId,
    mission_titre: row.titre,
    utilisateur_id: auth.userId,
    utilisateur_pseudo: (canceller as { pseudo: string } | null)?.pseudo ?? null,
    action: "annulee",
    details: {},
  });

  revalidatePath(`/missions/${missionId}`);
  revalidatePath("/missions");
  return { success: true };
}

// ─── Mission History (Professeur+) ────────────────────────────────────────────

/** Grades professeur et supérieur pouvant consulter l'historique. */
const PROF_HISTORY_GRADES: GradeRole[] = [
  "Professeur",
  "Professeur Principal",
  "Co-Directeur",
  "Directeur",
];

/** Vérifie si l'utilisateur courant peut consulter l'historique des missions. */
export async function canViewMissionHistory(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const admin = await createAdminClient();
  const { data: u } = await admin
    .from("utilisateurs")
    .select("role, grade_role")
    .eq("id", user.id)
    .single();

  if (!u) return false;
  const uu = u as { role: string; grade_role: GradeRole | null };
  return (
    uu.role === "admin" ||
    uu.role === "professeur" ||
    (uu.grade_role !== null && PROF_HISTORY_GRADES.includes(uu.grade_role))
  );
}

/** Retourne l'historique des événements de mission (réservé aux profs+). */
export async function getMissionHistory(limit = 300): Promise<MissionLogRow[]> {
  const allowed = await canViewMissionHistory();
  if (!allowed) return [];

  const admin = await createAdminClient();
  const { data } = await admin
    .from("mission_logs")
    .select("*")
    .order("cree_le", { ascending: false })
    .limit(limit);

  return (data as MissionLogRow[] | null) ?? [];
}

// ─── Soft-delete d'une mission (Exo Pro+) ─────────────────────────────────────

/**
 * Supprime une mission de façon douce (soft-delete) en posant `deleted_at`.
 * La mission n'apparaîtra plus dans les listes mais reste en base.
 * Autorisé pour : créateur de la mission, Exo Pro ou supérieur, admin/prof.
 */
export async function supprimerMission(missionId: string): Promise<ActionResult> {
  if (!missionId || typeof missionId !== "string") {
    return { success: false, error: "ID de mission invalide." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifié." };

  const admin = await createAdminClient();

  // Fetch mission + caller info in parallel
  const [missionRes, callerRes] = await Promise.all([
    admin.from("missions").select("id, createur_id, titre, statut").eq("id", missionId).single(),
    admin.from("utilisateurs").select("role, grade_role").eq("id", user.id).single(),
  ]);

  const mission = missionRes.data as { id: string; createur_id: string; titre: string; statut: string } | null;
  if (!mission) return { success: false, error: "Mission introuvable." };

  const caller = callerRes.data as { role: string; grade_role: GradeRole | null } | null;
  if (!caller) return { success: false, error: "Utilisateur introuvable." };

  const isCreator = mission.createur_id === user.id;
  const isAdminOrProf = caller.role === "admin" || caller.role === "professeur";
  const isExoProPlus = caller.grade_role !== null && EXO_PRO_PLUS.includes(caller.grade_role);

  if (!isCreator && !isAdminOrProf && !isExoProPlus) {
    return { success: false, error: "Permissions insuffisantes pour supprimer cette mission." };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin.from("missions") as any)
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", missionId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/missions");
  revalidatePath(`/missions/${missionId}`);
  return { success: true };
}
