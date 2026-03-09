import "server-only";

// ╔══════════════════════════════════════════════════════════════════════╗
// ║  HOKKAIDO — ROLE MAPPINGS                                           ║
// ║  Tous les Discord Role IDs ci-dessous sont des PLACEHOLDERS.        ║
// ║  Remplacer chaque ID par ceux du serveur Discord Hokkaido           ║
// ║  une fois le serveur configuré.                                     ║
// ╚══════════════════════════════════════════════════════════════════════╝

import type { Grades, Divisions, GradeRole, GradeSecondaire, RoleDivision } from "@/types/database";

// ─── Discord Role IDs → Grade de combat ──────────────────────────────────────

export const DISCORD_GRADE_MAP: Record<string, Grades> = {
  "1460100847324106812": "Classe Apo",
  "1460100777782673554": "Classe S",
  "1460100661524828311": "Semi Classe S",
  "1460100596399869973": "Classe 1",
  "1460100508298510336": "Semi Classe 1",
  "1460100461221908561": "Classe 2",
  "1460100403222810798": "Semi Classe 2",
  "1460100261233037555": "Classe 3",
  "1460099598269022218": "Classe 4",
};

// Priorité des grades (index plus élevé = grade plus haut)
const GRADE_PRIORITY: Grades[] = [
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

// ─── Discord Role IDs → Rôle hiérarchique ────────────────────────────────────

export const DISCORD_ROLE_GRADE_MAP: Record<string, GradeRole> = {
  "1460101248148570122": "Élève Exorciste",
  "1460101369737248798": "Exorciste Pro",
  "1460101179726893108": "Professeur",
  "1460101093773021226": "Professeur Principal",
  "1476988002986098828": "Co-Directeur",
  "1460101031269634183": "Directeur",
};

const ROLE_GRADE_PRIORITY: GradeRole[] = [
  "Élève Exorciste",
  "Exorciste Pro",
  "Professeur",
  "Professeur Principal",
  "Co-Directeur",
  "Directeur",
];

// ─── Discord Role IDs → Division + Rôle dans la division ─────────────────────
// Chaque rôle Discord correspond à une division ET un rôle (superviseur ou membre).

export type DiscordDivisionEntry = {
  division: Divisions;
  role_division: RoleDivision;
};

export const DISCORD_DIVISION_MAP: Record<string, DiscordDivisionEntry> = {
  // Judiciaire
  "1460108877696864316": { division: "Judiciaire", role_division: "superviseur" },
  "1460101763733393535": { division: "Judiciaire", role_division: "membre" },
  // Médical
  "1460108878963413165": { division: "Médical", role_division: "superviseur" },
  "1460101854670360632": { division: "Médical", role_division: "membre" },
  // Académie
  "1474893464612110576": { division: "Académie", role_division: "superviseur" },
  "1474893483377561727": { division: "Académie", role_division: "membre" },
  // Scientifique
  "1460108879609462949": { division: "Scientifique", role_division: "superviseur" },
  "1460101982017818862": { division: "Scientifique", role_division: "membre" },
  // Disciplinaire
  "1460108880758440020": { division: "Disciplinaire", role_division: "superviseur" },
  "1460102317838827621": { division: "Disciplinaire", role_division: "membre" },
  // Stratégie
  "1473758986615390238": { division: "Stratégie", role_division: "superviseur" },
  "1473758651281047562": { division: "Stratégie", role_division: "membre" },
  // Diplomatie
  "1473758816540819750": { division: "Diplomatie", role_division: "superviseur" },
  "1473758954784821413": { division: "Diplomatie", role_division: "membre" },
  // Production et Logistique
  "1478972206188073084": { division: "Production et Logistique", role_division: "superviseur" },
  "1478972433062035497": { division: "Production et Logistique", role_division: "membre" },
};

// ─── Fonctions utilitaires ───────────────────────────────────────────────────

/** Retourne le grade de combat le plus élevé d'après les rôles Discord. */
export function getGradeFromDiscordRoles(roles: string[]): Grades | null {
  let bestGrade: Grades | null = null;
  let bestPriority = -1;

  for (const roleId of roles) {
    const grade = DISCORD_GRADE_MAP[roleId];
    if (grade) {
      const priority = GRADE_PRIORITY.indexOf(grade);
      if (priority > bestPriority) {
        bestGrade = grade;
        bestPriority = priority;
      }
    }
  }

  return bestGrade;
}

/** Retourne le rôle hiérarchique le plus élevé (Élève, Pro, Professeur…). */
export function getRoleGradeFromDiscordRoles(roles: string[]): GradeRole | null {
  let best: GradeRole | null = null;
  let bestPriority = -1;

  for (const roleId of roles) {
    const roleGrade = DISCORD_ROLE_GRADE_MAP[roleId];
    if (roleGrade) {
      const priority = ROLE_GRADE_PRIORITY.indexOf(roleGrade);
      if (priority > bestPriority) {
        best = roleGrade;
        bestPriority = priority;
      }
    }
  }

  return best;
}

/** Retourne toutes les divisions d'après les rôles Discord (multi-divisions). */
export function getDivisionsFromDiscordRoles(roles: string[]): DiscordDivisionEntry[] {
  const divisions: DiscordDivisionEntry[] = [];
  const seen = new Set<string>();

  for (const roleId of roles) {
    const entry = DISCORD_DIVISION_MAP[roleId];
    if (entry) {
      const key = `${entry.division}:${entry.role_division}`;
      if (!seen.has(key)) {
        seen.add(key);
        divisions.push(entry);
      }
    }
  }

  return divisions;
}

/** @deprecated Utiliser getDivisionsFromDiscordRoles pour le multi-divisions */
export function getDivisionFromDiscordRoles(roles: string[]): Divisions | null {
  for (const roleId of roles) {
    const entry = DISCORD_DIVISION_MAP[roleId];
    if (entry) return entry.division;
  }
  return null;
}

/** Retourne le rôle applicatif (eleve / professeur / admin). */
export function getAppRoleFromDiscordRoles(
  roles: string[]
): "eleve" | "professeur" | "admin" {
  // Superadmin de site → admin (toutes les permissions)
  for (const roleId of roles) {
    if (roleId === "1478990378701951058") {
      return "admin";
    }
  }
  // Directeur ou Co-Directeur → admin
  for (const roleId of roles) {
    if (
      roleId === "1460101031269634183" || // Directeur
      roleId === "1476988002986098828"    // Co-Directeur
    ) {
      return "admin";
    }
  }
  // Professeur Principal ou Professeur → professeur
  for (const roleId of roles) {
    if (
      roleId === "1460101093773021226" || // Professeur Principal
      roleId === "1460101179726893108"    // Professeur
    ) {
      return "professeur";
    }
  }
  return "eleve";
}

/** Retourne toutes les informations extraites des rôles Discord. */
export function resolveDiscordRoles(roles: string[]) {
  return {
    grade: getGradeFromDiscordRoles(roles),
    gradeRole: getRoleGradeFromDiscordRoles(roles),
    division: getDivisionFromDiscordRoles(roles),       // rétrocompat (première division trouvée)
    divisions: getDivisionsFromDiscordRoles(roles),     // toutes les divisions + rôles
    clans: getClansFromDiscordRoles(roles),             // clans + rôle dans le clan
    appRole: getAppRoleFromDiscordRoles(roles),
  };
}

// ─── Discord Role IDs → Clan ─────────────────────────────────────────────────

export type ClanName = "Kamo" | "Inumaki" | "Zenin" | "Gojo";
export type ClanRole = "membre" | "patriarche";

export type DiscordClanEntry = {
  clan: ClanName;
  role_clan: ClanRole;
  discord_role_id: string;
};

export const DISCORD_CLAN_MAP: Record<string, DiscordClanEntry> = {
  // Kamo
  "1460107696350036174": { clan: "Kamo",    role_clan: "membre",     discord_role_id: "1460107696350036174" },
  "1460101557692665916": { clan: "Kamo",    role_clan: "patriarche", discord_role_id: "1460101557692665916" },
  // Inumaki
  "1460107580121550940": { clan: "Inumaki", role_clan: "membre",     discord_role_id: "1460107580121550940" },
  "1460101704711274496": { clan: "Inumaki", role_clan: "patriarche", discord_role_id: "1460101704711274496" },
  // Zenin
  "1460107579240874005": { clan: "Zenin",   role_clan: "membre",     discord_role_id: "1460107579240874005" },
  "1460101640509198573": { clan: "Zenin",   role_clan: "patriarche", discord_role_id: "1460101640509198573" },
  // Gojo
  "1460107568411312331": { clan: "Gojo",    role_clan: "membre",     discord_role_id: "1460107568411312331" },
  "1460101447227146481": { clan: "Gojo",    role_clan: "patriarche", discord_role_id: "1460101447227146481" },
};

/** Rôle Discord pour chaque clan (inclut membre ET patriarche) */
export const CLAN_ROLE_IDS: Record<ClanName, { membre: string; patriarche: string }> = {
  Kamo:    { membre: "1460107696350036174", patriarche: "1460101557692665916" },
  Inumaki: { membre: "1460107580121550940", patriarche: "1460101704711274496" },
  Zenin:   { membre: "1460107579240874005", patriarche: "1460101640509198573" },
  Gojo:    { membre: "1460107568411312331", patriarche: "1460101447227146481" },
};

/** Retourne les clans (et rôle dans le clan) d'après les rôles Discord. */
export function getClansFromDiscordRoles(roles: string[]): DiscordClanEntry[] {
  const clans: DiscordClanEntry[] = [];
  const seen = new Set<string>();

  for (const roleId of roles) {
    const entry = DISCORD_CLAN_MAP[roleId];
    if (entry) {
      const key = `${entry.clan}:${entry.role_clan}`;
      if (!seen.has(key)) {
        seen.add(key);
        clans.push(entry);
      }
    }
  }

  return clans;
}

// ─── Lookup inversé : nom → rôle Discord ID (pour les pings) ─────────────────

/** Grade de combat → Discord Role ID */
export const GRADE_TO_ROLE_ID: Record<Grades, string> = {
  "Classe Apo":     "1460100847324106812",
  "Classe S":       "1460100777782673554",
  "Semi Classe S":  "1460100661524828311",
  "Classe 1":       "1460100596399869973",
  "Semi Classe 1":  "1460100508298510336",
  "Classe 2":       "1460100461221908561",
  "Semi Classe 2":  "1460100403222810798",
  "Classe 3":       "1460100261233037555",
  "Classe 4":       "1460099598269022218",
};

/** Rôle hiérarchique → Discord Role ID */
export const GRADE_ROLE_TO_ROLE_ID: Record<GradeRole, string> = {
  "Élève Exorciste":     "1460101248148570122",
  "Exorciste Pro":       "1460101369737248798",
  "Professeur":          "1460101179726893108",
  "Professeur Principal": "1460101093773021226",
  "Co-Directeur":        "1476988002986098828",
  "Directeur":           "1460101031269634183",
};

/** Grade scolaire → Discord Role ID */
export const GRADE_SECONDAIRE_TO_ROLE_ID: Record<GradeSecondaire, string> = {
  "Seconde":   "1478950002909777973",
  "Première":  "1478950113971015822",
  "Terminal":  "1478950028663062680",
};

// ─── Listes exportées (pour les sélecteurs UI) ──────────────────────────────

export const ALL_GRADES: Grades[] = [
  "Classe 4", "Classe 3", "Semi Classe 2", "Classe 2",
  "Semi Classe 1", "Classe 1", "Semi Classe S", "Classe S", "Classe Apo",
];

export const ALL_GRADE_ROLES: GradeRole[] = [
  "Élève Exorciste", "Exorciste Pro", "Professeur",
  "Professeur Principal", "Co-Directeur", "Directeur",
];

export const ALL_GRADES_SECONDAIRES: GradeSecondaire[] = [
  "Seconde", "Première", "Terminal",
];

// Grades secondaires valides (assignés par un prof à un Élève Exorciste)
export const GRADES_SECONDAIRES_VALIDES: GradeSecondaire[] = [
  "Seconde",
  "Première",
  "Terminal",
];

// ─── Discord Role IDs → Grade secondaire (school year) ───────────────────────

export const DISCORD_GRADE_SECONDAIRE_MAP: Record<string, GradeSecondaire> = {
  "1478950002909777973": "Seconde",
  "1478950113971015822": "Première",
  "1478950028663062680": "Terminal",
};

/**
 * Retourne le grade secondaire en fonction des rôles Discord.
 * Si l'utilisateur n'a PAS de rôle spécial (Professeur, Co-Directeur,
 * Directeur, Exorciste Pro) et n'a aucun rôle grade secondaire, renvoie
 * "Seconde" par défaut (nouvel élève).
 * Si l'utilisateur a un rôle spécial (prof/admin/exo pro), renvoie null.
 */
export function getGradeSecondaireFromDiscordRoles(roles: string[]): GradeSecondaire | null {
  // Vérifier si l'utilisateur a un rôle spécial qui exclut grade_secondaire
  const SPECIAL_ROLE_IDS = [
    "1460101179726893108", // Professeur
    "1460101093773021226", // Professeur Principal
    "1476988002986098828", // Co-Directeur
    "1460101031269634183", // Directeur
    "1460101369737248798", // Exorciste Pro
    "1478990378701951058", // Superadmin de site
  ];
  if (roles.some((r) => SPECIAL_ROLE_IDS.includes(r))) {
    return null;
  }

  // Check if they explicitly have a grade secondaire role
  for (const roleId of roles) {
    const gs = DISCORD_GRADE_SECONDAIRE_MAP[roleId];
    if (gs) return gs;
  }

  // Default: Élève without explicit grade → Seconde
  return "Seconde";
}
