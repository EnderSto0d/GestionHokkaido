import "server-only";

// ╔══════════════════════════════════════════════════════════════════════╗
// ║  HOKKAIDO — ROLE MAPPINGS                                           ║
// ║  IDs configurés pour le serveur Discord Hokkaido.                   ║
// ╚══════════════════════════════════════════════════════════════════════╝

import type { Grades, Divisions, GradeRole, GradeSecondaire, RoleDivision } from "@/types/database";

// ─── Discord Role IDs → Grade de combat ──────────────────────────────────────

export const DISCORD_GRADE_MAP: Record<string, Grades> = {
  "1460103906435797039": "Classe Apo",
  "1460103906435797038": "Classe S",
  "1460103906435797037": "Semi Classe S",
  "1460103906435797036": "Classe 1",
  "1460103906435797035": "Semi Classe 1",
  "1460103906435797034": "Classe 2",
  "1460103906435797033": "Semi Classe 2",
  "1460103906435797032": "Classe 3",
  "1460103906418753759": "Classe 4",
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
  "1460103906418753754": "Élève Exorciste",
  "1460103906418753753": "Exorciste Pro",
  "1460103906418753755": "Professeur",
  // Pas de Professeur Principal sur Hokkaido
  "1470159960485920883": "Co-Directeur",
  "1460103906418753757": "Directeur",
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
// Note : Hokkaido n'a PAS de division "Académie"

export type DiscordDivisionEntry = {
  division: Divisions;
  role_division: RoleDivision;
};

export const DISCORD_DIVISION_MAP: Record<string, DiscordDivisionEntry> = {
  // Judiciaire
  "1460103906087665711": { division: "Judiciaire", role_division: "superviseur" },
  "1460108471830843605": { division: "Judiciaire", role_division: "membre" },
  // Médical
  "1460103906087665710": { division: "Médical", role_division: "superviseur" },
  "1460108472959111272": { division: "Médical", role_division: "membre" },
  // Scientifique
  "1460103906087665709": { division: "Scientifique", role_division: "superviseur" },
  "1460108474133254145": { division: "Scientifique", role_division: "membre" },
  // Disciplinaire
  "1460103906087665708": { division: "Disciplinaire", role_division: "superviseur" },
  "1460108475169505433": { division: "Disciplinaire", role_division: "membre" },
  // Stratégie
  "1470174078106341562": { division: "Stratégie", role_division: "superviseur" },
  "1470175127802089718": { division: "Stratégie", role_division: "membre" },
  // Diplomatie
  "1470174416007598263": { division: "Diplomatie", role_division: "superviseur" },
  "1470175130507542695": { division: "Diplomatie", role_division: "membre" },
  // Production et Logistique
  "1470174849149173901": { division: "Production et Logistique", role_division: "superviseur" },
  "1470175133829431316": { division: "Production et Logistique", role_division: "membre" },
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
    if (roleId === "1460103906494517304") {
      return "admin";
    }
  }
  // Directeur ou Co-Directeur → admin
  for (const roleId of roles) {
    if (
      roleId === "1460103906418753757" || // Directeur
      roleId === "1470159960485920883"    // Co-Directeur
    ) {
      return "admin";
    }
  }
  // Professeur → professeur (pas de PP sur Hokkaido)
  for (const roleId of roles) {
    if (
      roleId === "1460103906418753755"    // Professeur
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
// Hokkaido a des clans différents de Tokyo : Geto, Kenjaku, Shizu, Fujiwara

export type ClanName = "Geto" | "Kenjaku" | "Shizu" | "Fujiwara";
export type ClanRole = "membre" | "patriarche";

export type DiscordClanEntry = {
  clan: ClanName;
  role_clan: ClanRole;
  discord_role_id: string;
};

export const DISCORD_CLAN_MAP: Record<string, DiscordClanEntry> = {
  // Geto
  "1460105275288715562": { clan: "Geto",    role_clan: "membre",     discord_role_id: "1460105275288715562" },
  "1460103906418753751": { clan: "Geto",    role_clan: "patriarche", discord_role_id: "1460103906418753751" },
  // Kenjaku
  "1460105277184675842": { clan: "Kenjaku", role_clan: "membre",     discord_role_id: "1460105277184675842" },
  "1460103906087665713": { clan: "Kenjaku", role_clan: "patriarche", discord_role_id: "1460103906087665713" },
  // Shizu
  "1460105279117983867": { clan: "Shizu",   role_clan: "membre",     discord_role_id: "1460105279117983867" },
  "1460103906418753750": { clan: "Shizu",   role_clan: "patriarche", discord_role_id: "1460103906418753750" },
  // Fujiwara
  "1460105281064271945": { clan: "Fujiwara",    role_clan: "membre",     discord_role_id: "1460105281064271945" },
  "1460103906087665714": { clan: "Fujiwara",    role_clan: "patriarche", discord_role_id: "1460103906087665714" },
};

/** Rôle Discord pour chaque clan (inclut membre ET patriarche) */
export const CLAN_ROLE_IDS: Record<ClanName, { membre: string; patriarche: string }> = {
  Geto:    { membre: "1460105275288715562", patriarche: "1460103906418753751" },
  Kenjaku: { membre: "1460105277184675842", patriarche: "1460103906087665713" },
  Shizu:   { membre: "1460105279117983867", patriarche: "1460103906418753750" },
  Fujiwara:    { membre: "1460105281064271945", patriarche: "1460103906087665714" },
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
  "Classe Apo":     "1460103906435797039",
  "Classe S":       "1460103906435797038",
  "Semi Classe S":  "1460103906435797037",
  "Classe 1":       "1460103906435797036",
  "Semi Classe 1":  "1460103906435797035",
  "Classe 2":       "1460103906435797034",
  "Semi Classe 2":  "1460103906435797033",
  "Classe 3":       "1460103906435797032",
  "Classe 4":       "1460103906418753759",
};

/** Rôle hiérarchique → Discord Role ID */
export const GRADE_ROLE_TO_ROLE_ID: Record<GradeRole, string> = {
  "Élève Exorciste":     "1460103906418753754",
  "Exorciste Pro":       "1460103906418753753",
  "Professeur":          "1460103906418753755",
  "Professeur Principal": "",  // N'existe pas sur Hokkaido
  "Co-Directeur":        "1470159960485920883",
  "Directeur":           "1460103906418753757",
};

/** Grade scolaire → Discord Role ID */
export const GRADE_SECONDAIRE_TO_ROLE_ID: Record<GradeSecondaire, string> = {
  "Seconde":   "1470881572315070568",
  "Première":  "1470881582918140008",
  "Terminal":  "1470881585707352436",
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
  "1470881572315070568": "Seconde",
  "1470881582918140008": "Première",
  "1470881585707352436": "Terminal",
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
  // Note : pas de Professeur Principal sur Hokkaido
  const SPECIAL_ROLE_IDS = [
    "1460103906418753755", // Professeur
    // Pas de Professeur Principal sur Hokkaido
    "1470159960485920883", // Co-Directeur
    "1460103906418753757", // Directeur
    "1460103906418753753", // Exorciste Pro
    "1460103906494517304", // Superadmin de site
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
