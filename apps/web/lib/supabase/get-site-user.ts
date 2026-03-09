import "server-only";
import { SITE_ID } from "@/lib/site-config";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Résout l'ID utilisateur du site courant à partir de l'auth_user_id (auth.uid()).
 * Pour Tokyo : id == auth_user_id (backward compatible).
 * Pour Hokkaido : id est un UUID distinct, auth_user_id == auth.uid().
 */
export async function getSiteUserId(
  supabase: SupabaseClient<Database>,
  authUserId: string
): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from("utilisateurs") as any)
    .select("id")
    .eq("auth_user_id", authUserId)
    .eq("site", SITE_ID)
    .single();

  return data?.id ?? null;
}

/**
 * Résout le profil complet de l'utilisateur pour le site courant.
 */
export async function getSiteUser(
  supabase: SupabaseClient<Database>,
  authUserId: string
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from("utilisateurs") as any)
    .select("*")
    .eq("auth_user_id", authUserId)
    .eq("site", SITE_ID)
    .single();

  return data;
}
