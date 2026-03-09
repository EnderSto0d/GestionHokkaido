import type { ClanName } from "@/lib/discord/role-mappings";
import type { GradeRole, Grades, GradeSecondaire } from "@/types/database";

export type PingCible = {
  everyone?: boolean;
  eleve_exorciste?: boolean;
  escouadeIds?: string[];
  clans?: ClanName[];
  grades?: Grades[];
  gradeRoles?: GradeRole[];
  gradeSecondaires?: GradeSecondaire[];
  restreindre?: boolean;
};

/**
 * Convertit l'ancien format (discriminated union avec `type`) vers le nouveau format plat.
 * Permet la rétro-compatibilité avec les missions déjà en base.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizePingCible(raw: any): PingCible {
  if (!raw || typeof raw !== "object") return {};
  if ("type" in raw && typeof raw.type === "string") {
    const result: PingCible = { restreindre: raw.restreindre };
    switch (raw.type) {
      case "everyone": result.everyone = true; break;
      case "eleve_exorciste": result.eleve_exorciste = true; break;
      case "escouades": result.escouadeIds = raw.ids; break;
      case "clans": result.clans = raw.clans; break;
      case "grades": result.grades = raw.grades; break;
      case "grade_roles": result.gradeRoles = raw.gradeRoles; break;
      case "grade_secondaire": result.gradeSecondaires = raw.gradeSecondaires; break;
    }
    return result;
  }
  return raw as PingCible;
}

/** Génère un label lisible pour l'affichage du ping. */
export function getPingLabel(pingCible: PingCible): string {
  const parts: string[] = [];
  if (pingCible.everyone) parts.push("@everyone");
  if (pingCible.eleve_exorciste) parts.push("Élève Exorciste");
  if (pingCible.escouadeIds?.length) parts.push(`${pingCible.escouadeIds.length} escouade(s)`);
  if (pingCible.clans?.length) parts.push(pingCible.clans.join(", "));
  if (pingCible.grades?.length) parts.push(pingCible.grades.join(", "));
  if (pingCible.gradeRoles?.length) parts.push(pingCible.gradeRoles.join(", "));
  if (pingCible.gradeSecondaires?.length) parts.push(pingCible.gradeSecondaires.join(", "));
  return parts.length > 0 ? parts.join(" + ") : "Aucun";
}
