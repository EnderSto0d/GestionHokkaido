/**
 * Configuration du système Production & Logistique.
 *
 * MAX_COUNTABLE_LOGISTICS_POINTS : plafond par défaut du bonus ajouté aux
 * points personnels. La valeur runtime est stockée dans app_config (DB).
 * Le bonus est : MIN(logistics_points × 0.05, plafond).
 *
 * ITEM_VALUES : catalogue de référence pour le seed SQL initial.
 * ⚠ La source de vérité des point values est désormais la table
 * `logistics_items` en DB, configurable par les admins.
 */

export const MAX_COUNTABLE_LOGISTICS_POINTS = 200;

// ─── Division & rôle centralisés ──────────────────────────────────────────────

/**
 * Nom exact de la division tel que stocké dans la base et les types TypeScript.
 * Utiliser cette constante partout au lieu de la chaîne en dur.
 */
export const DIVISION_PRODUCTION_LOGISTICS = "Production et Logistique" as const;

/**
 * Identifiant de rôle pour les membres de la division Production & Logistique.
 * Permet au frontend et backend de référencer ce rôle sans chaîne magique.
 */
export const ROLE_PRODUCTION_LOGISTICS_MEMBER = "Production_Logistics_Member" as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export type ItemCategory =
  | "Matières Premières"
  | "Blueprints"
  | "Objets Craftés - Tier 1 [C]"
  | "Objets Craftés - Tier 2 [B]"
  | "Objets Craftés - Tier 3 [A]"
  | "Objets Craftés - Tier 4 [S]";

export type ItemEntry = {
  label: string;
  category: ItemCategory;
  /** Valeur en points par unité. 0 = non configuré. */
  pointsPerUnit: number;
};

// ─── Catalogue complet des items ─────────────────────────────────────────────

export const ITEM_VALUES: Record<string, ItemEntry> = {
  // ── Matières Premières ──────────────────────────────────────────────────
  titane: {
    label: "Titane",
    category: "Matières Premières",
    pointsPerUnit: 0,
  },
  plastique: {
    label: "Plastique",
    category: "Matières Premières",
    pointsPerUnit: 0,
  },
  papier: {
    label: "Papier",
    category: "Matières Premières",
    pointsPerUnit: 0,
  },
  metal_occulte: {
    label: "Metal occulte",
    category: "Matières Premières",
    pointsPerUnit: 0,
  },
  laine: {
    label: "Laine",
    category: "Matières Premières",
    pointsPerUnit: 0,
  },
  fer: {
    label: "Fer",
    category: "Matières Premières",
    pointsPerUnit: 0,
  },
  cuivre: {
    label: "Cuivre",
    category: "Matières Premières",
    pointsPerUnit: 0,
  },
  cuir: {
    label: "Cuir",
    category: "Matières Premières",
    pointsPerUnit: 0,
  },
  bois: {
    label: "Bois",
    category: "Matières Premières",
    pointsPerUnit: 0,
  },
  argent: {
    label: "Argent",
    category: "Matières Premières",
    pointsPerUnit: 0,
  },

  // ── Blueprints Tier 1 [C] ──────────────────────────────────────────────
  bp_c_pantalon_t1: {
    label: "Blueprint de [C] Pantalon T1",
    category: "Blueprints",
    pointsPerUnit: 0,
  },
  bp_c_collier_t1: {
    label: "Blueprint de [C] Collier T1",
    category: "Blueprints",
    pointsPerUnit: 0,
  },
  bp_c_bottes_tenacite_t1: {
    label: "Blueprint de [C] Bottes Ténacité T1",
    category: "Blueprints",
    pointsPerUnit: 0,
  },
  bp_c_bottes_ap_t1: {
    label: "Blueprint de [C] Bottes AP T1",
    category: "Blueprints",
    pointsPerUnit: 0,
  },
  bp_c_bottes_ad_t1: {
    label: "Blueprint de [C] Bottes AD T1",
    category: "Blueprints",
    pointsPerUnit: 0,
  },
  bp_c_armure_ap_t1: {
    label: "Blueprint de [C] Armure AP T1",
    category: "Blueprints",
    pointsPerUnit: 0,
  },
  bp_c_armure_ad_t1: {
    label: "Blueprint de [C] Armure AD T1",
    category: "Blueprints",
    pointsPerUnit: 0,
  },

  // ── Blueprints Tier 2 [B] ──────────────────────────────────────────────
  bp_b_pantalon_t2: {
    label: "Blueprint de [B] Pantalon T2",
    category: "Blueprints",
    pointsPerUnit: 0,
  },
  bp_b_collier_t2: {
    label: "Blueprint de [B] Collier T2",
    category: "Blueprints",
    pointsPerUnit: 0,
  },
  bp_b_bottes_tenacite_t2: {
    label: "Blueprint de [B] Bottes Ténacité T2",
    category: "Blueprints",
    pointsPerUnit: 0,
  },
  bp_b_bottes_ap_t2: {
    label: "Blueprint de [B] Bottes AP T2",
    category: "Blueprints",
    pointsPerUnit: 0,
  },
  bp_b_bottes_ad_t2: {
    label: "Blueprint de [B] Bottes AD T2",
    category: "Blueprints",
    pointsPerUnit: 0,
  },
  bp_b_armure_ap_t2: {
    label: "Blueprint de [B] Armure AP T2",
    category: "Blueprints",
    pointsPerUnit: 0,
  },
  bp_b_armure_ad_t2: {
    label: "Blueprint de [B] Armure AD T2",
    category: "Blueprints",
    pointsPerUnit: 0,
  },

  // ── Blueprints Tier 3 [A] ──────────────────────────────────────────────
  bp_a_pantalon_t3: {
    label: "Blueprint de [A] Pantalon T3",
    category: "Blueprints",
    pointsPerUnit: 0,
  },
  bp_a_collier_t3: {
    label: "Blueprint de [A] Collier T3",
    category: "Blueprints",
    pointsPerUnit: 0,
  },
  bp_a_bottes_tenacite_t3: {
    label: "Blueprint de [A] Bottes Ténacité T3",
    category: "Blueprints",
    pointsPerUnit: 0,
  },
  bp_a_bottes_ap_t3: {
    label: "Blueprint de [A] Bottes AP T3",
    category: "Blueprints",
    pointsPerUnit: 0,
  },
  bp_a_bottes_ad_t3: {
    label: "Blueprint de [A] Bottes AD T3",
    category: "Blueprints",
    pointsPerUnit: 0,
  },
  bp_a_armure_ap_t3: {
    label: "Blueprint de [A] Armure AP T3",
    category: "Blueprints",
    pointsPerUnit: 0,
  },
  bp_a_armure_ad_t3: {
    label: "Blueprint de [A] Armure AD T3",
    category: "Blueprints",
    pointsPerUnit: 0,
  },

  // ── Blueprints Tier 4 [S] ──────────────────────────────────────────────
  bp_s_pantalon_t4: {
    label: "Blueprint de [S] Pantalon T4",
    category: "Blueprints",
    pointsPerUnit: 0,
  },
  bp_s_collier_t4: {
    label: "Blueprint de [S] Collier T4",
    category: "Blueprints",
    pointsPerUnit: 0,
  },
  bp_s_bottes_tenacite_t4: {
    label: "Blueprint de [S] Bottes Ténacité T4",
    category: "Blueprints",
    pointsPerUnit: 0,
  },
  bp_s_bottes_ap_t4: {
    label: "Blueprint de [S] Bottes AP T4",
    category: "Blueprints",
    pointsPerUnit: 0,
  },
  bp_s_bottes_ad_t4: {
    label: "Blueprint de [S] Bottes AD T4",
    category: "Blueprints",
    pointsPerUnit: 0,
  },
  bp_s_armure_ap_t4: {
    label: "Blueprint de [S] Armure AP T4",
    category: "Blueprints",
    pointsPerUnit: 0,
  },
  bp_s_armure_ad_t4: {
    label: "Blueprint de [S] Armure AD T4",
    category: "Blueprints",
    pointsPerUnit: 0,
  },

  // ── Objets Craftés - Tier 1 [C] ───────────────────────────────────────
  c_pantalon_t1: {
    label: "[C] Pantalon T1",
    category: "Objets Craftés - Tier 1 [C]",
    pointsPerUnit: 0,
  },
  c_collier_t1: {
    label: "[C] Collier T1",
    category: "Objets Craftés - Tier 1 [C]",
    pointsPerUnit: 0,
  },
  c_bottes_tenacite_t1: {
    label: "[C] Bottes Ténacité T1",
    category: "Objets Craftés - Tier 1 [C]",
    pointsPerUnit: 0,
  },
  c_bottes_ap_t1: {
    label: "[C] Bottes AP T1",
    category: "Objets Craftés - Tier 1 [C]",
    pointsPerUnit: 0,
  },
  c_bottes_ad_t1: {
    label: "[C] Bottes AD T1",
    category: "Objets Craftés - Tier 1 [C]",
    pointsPerUnit: 0,
  },
  c_armure_ap_t1: {
    label: "[C] Armure AP T1",
    category: "Objets Craftés - Tier 1 [C]",
    pointsPerUnit: 0,
  },
  c_armure_ad_t1: {
    label: "[C] Armure AD T1",
    category: "Objets Craftés - Tier 1 [C]",
    pointsPerUnit: 0,
  },

  // ── Objets Craftés - Tier 2 [B] ───────────────────────────────────────
  b_pantalon_t2: {
    label: "[B] Pantalon T2",
    category: "Objets Craftés - Tier 2 [B]",
    pointsPerUnit: 0,
  },
  b_collier_t2: {
    label: "[B] Collier T2",
    category: "Objets Craftés - Tier 2 [B]",
    pointsPerUnit: 0,
  },
  b_bottes_tenacite_t2: {
    label: "[B] Bottes Ténacité T2",
    category: "Objets Craftés - Tier 2 [B]",
    pointsPerUnit: 0,
  },
  b_bottes_ap_t2: {
    label: "[B] Bottes AP T2",
    category: "Objets Craftés - Tier 2 [B]",
    pointsPerUnit: 0,
  },
  b_bottes_ad_t2: {
    label: "[B] Bottes AD T2",
    category: "Objets Craftés - Tier 2 [B]",
    pointsPerUnit: 0,
  },
  b_armure_ap_t2: {
    label: "[B] Armure AP T2",
    category: "Objets Craftés - Tier 2 [B]",
    pointsPerUnit: 0,
  },
  b_armure_ad_t2: {
    label: "[B] Armure AD T2",
    category: "Objets Craftés - Tier 2 [B]",
    pointsPerUnit: 0,
  },

  // ── Objets Craftés - Tier 3 [A] ───────────────────────────────────────
  a_pantalon_t3: {
    label: "[A] Pantalon T3",
    category: "Objets Craftés - Tier 3 [A]",
    pointsPerUnit: 0,
  },
  a_collier_t3: {
    label: "[A] Collier T3",
    category: "Objets Craftés - Tier 3 [A]",
    pointsPerUnit: 0,
  },
  a_bottes_tenacite_t3: {
    label: "[A] Bottes Ténacité T3",
    category: "Objets Craftés - Tier 3 [A]",
    pointsPerUnit: 0,
  },
  a_bottes_ap_t3: {
    label: "[A] Bottes AP T3",
    category: "Objets Craftés - Tier 3 [A]",
    pointsPerUnit: 0,
  },
  a_bottes_ad_t3: {
    label: "[A] Bottes AD T3",
    category: "Objets Craftés - Tier 3 [A]",
    pointsPerUnit: 0,
  },
  a_armure_ap_t3: {
    label: "[A] Armure AP T3",
    category: "Objets Craftés - Tier 3 [A]",
    pointsPerUnit: 0,
  },
  a_armure_ad_t3: {
    label: "[A] Armure AD T3",
    category: "Objets Craftés - Tier 3 [A]",
    pointsPerUnit: 0,
  },

  // ── Objets Craftés - Tier 4 [S] ───────────────────────────────────────
  s_pantalon_t4: {
    label: "[S] Pantalon T4",
    category: "Objets Craftés - Tier 4 [S]",
    pointsPerUnit: 0,
  },
  s_collier_t4: {
    label: "[S] Collier T4",
    category: "Objets Craftés - Tier 4 [S]",
    pointsPerUnit: 0,
  },
  s_bottes_tenacite_t4: {
    label: "[S] Bottes Ténacité T4",
    category: "Objets Craftés - Tier 4 [S]",
    pointsPerUnit: 0,
  },
  s_bottes_ap_t4: {
    label: "[S] Bottes AP T4",
    category: "Objets Craftés - Tier 4 [S]",
    pointsPerUnit: 0,
  },
  s_bottes_ad_t4: {
    label: "[S] Bottes AD T4",
    category: "Objets Craftés - Tier 4 [S]",
    pointsPerUnit: 0,
  },
  s_armure_ap_t4: {
    label: "[S] Armure AP T4",
    category: "Objets Craftés - Tier 4 [S]",
    pointsPerUnit: 0,
  },
  s_armure_ad_t4: {
    label: "[S] Armure AD T4",
    category: "Objets Craftés - Tier 4 [S]",
    pointsPerUnit: 0,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Retourne les items groupés par catégorie (utile pour le <select> groupé). */
export function getItemsByCategory(): Map<ItemCategory, Array<{ key: string; label: string }>> {
  const map = new Map<ItemCategory, Array<{ key: string; label: string }>>();
  for (const [key, entry] of Object.entries(ITEM_VALUES)) {
    const group = map.get(entry.category) ?? [];
    group.push({ key, label: entry.label });
    map.set(entry.category, group);
  }
  return map;
}

/**
 * Calcule le bonus de points personnels apporté par un total de logistics_points.
 * Formule : floor( min(logisticsPoints × 0.05, cap) )
 *
 * @param cap — Plafond global. Par défaut MAX_COUNTABLE_LOGISTICS_POINTS (200).
 *              Passer la valeur lue depuis app_config pour un calcul exact.
 */
export function calculateLogisticsBonus(
  logisticsPoints: number,
  cap: number = MAX_COUNTABLE_LOGISTICS_POINTS
): number {
  return Math.floor(Math.min(logisticsPoints * 0.05, cap));
}

/**
 * Calcule les points personnels totaux d'un utilisateur.
 * Personal Points = standardPoints + min(logisticsPoints × 0.05, cap)
 */
export function calculatePersonalPoints(
  standardPoints: number,
  logisticsPoints: number,
  cap: number = MAX_COUNTABLE_LOGISTICS_POINTS
): number {
  return standardPoints + calculateLogisticsBonus(logisticsPoints, cap);
}
