/**
 * Configuration du site (Tokyo ou Hokkaido).
 * Contrôlé par la variable d'environnement NEXT_PUBLIC_SITE_ID.
 */

export type SiteId = "tokyo" | "hokkaido";

export const SITE_ID: SiteId =
  (process.env.NEXT_PUBLIC_SITE_ID as SiteId) ?? "hokkaido";
