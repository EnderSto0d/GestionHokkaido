"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/server";

// ─── Fetch Global Bonus Cap ──────────────────────────────────────────────────

/**
 * Fetches the MAX_COUNTABLE_LOGISTICS_POINTS cap from the app_config table.
 * Falls back to 200 if the config row is missing or invalid.
 */
export async function getGlobalBonusCap(): Promise<number> {
  const admin = await createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from("app_config")
    .select("value")
    .eq("key", "MAX_COUNTABLE_LOGISTICS_POINTS")
    .single();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parsed = parseInt((data as any)?.value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 200;
}

// ─── Pure Calculation ────────────────────────────────────────────────────────

/**
 * Calculates the logistics bonus for a given logistics point total and cap.
 * Formula: floor( min(logisticsPoints × 0.05, cap) )
 */
export async function calculateBonusWithCap(logisticsPoints: number, cap: number): Promise<number> {
  return Math.floor(Math.min(logisticsPoints * 0.05, cap));
}

// ─── Recalculate Single User ─────────────────────────────────────────────────

export type RecalculateResult =
  | { success: true; userId: string; oldBonus: number; newBonus: number; delta: number }
  | { success: false; error: string };

/**
 * Recalculates the logistics bonus for a single user.
 *
 * Compares expected bonus (from current logistics_points + DB cap) against
 * what was previously applied (logistics_bonus_applied).
 * Applies the delta to points_personnels and the user's current squad.
 *
 * Safe to call multiple times — idempotent when no delta exists.
 * Handles cap changes (both increases and decreases) and squad changes.
 */
export async function recalculateUserLogisticsBonus(
  userId: string
): Promise<RecalculateResult> {
  try {
    if (!userId) {
      return { success: false, error: "ID utilisateur requis." };
    }

    const admin = await createAdminClient();

    // Read current state BEFORE recalculation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: before } = await (admin as any)
      .from("utilisateurs")
      .select("logistics_points, logistics_bonus_applied")
      .eq("id", userId)
      .single();

    if (!before) {
      return { success: false, error: "Utilisateur introuvable." };
    }

    const oldBonus: number = (before as any).logistics_bonus_applied ?? 0;

    // Call the SQL RPC (atomic recalculation)
    await (admin.rpc as Function)("recalculer_bonus_logistique", {
      p_user_id: userId,
    });

    // Read updated state
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: after } = await (admin as any)
      .from("utilisateurs")
      .select("logistics_bonus_applied")
      .eq("id", userId)
      .single();

    const newBonus: number = (after as any)?.logistics_bonus_applied ?? 0;
    const delta = newBonus - oldBonus;

    revalidatePath("/classement");
    revalidatePath("/classement/personnel");
    revalidatePath("/production-logistique");

    return { success: true, userId, oldBonus, newBonus, delta };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue.";
    return { success: false, error: message };
  }
}

// ─── Recalculate All Users ───────────────────────────────────────────────────

export type RecalculateAllResult =
  | { success: true; processed: number; adjusted: number }
  | { success: false; error: string };

/**
 * Recalculates the logistics bonus for ALL users who have logistics_points > 0.
 *
 * This is an admin utility to run after changing the global cap or to fix
 * any desync issues (e.g. after squad changes, manual corrections).
 *
 * Each user is recalculated atomically via the SQL RPC.
 * Only calls the RPC for users whose bonus is actually out of sync.
 */
export async function recalculateAllLogisticsBonuses(): Promise<RecalculateAllResult> {
  try {
    const admin = await createAdminClient();

    // Fetch all users with logistics activity
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: users } = await (admin as any)
      .from("utilisateurs")
      .select("id, logistics_points, logistics_bonus_applied")
      .gt("logistics_points", 0);

    if (!users || users.length === 0) {
      return { success: true, processed: 0, adjusted: 0 };
    }

    const cap = await getGlobalBonusCap();
    let adjusted = 0;

    for (const user of users as any[]) {
      const expected = await calculateBonusWithCap(user.logistics_points, cap);
      const currentApplied: number = user.logistics_bonus_applied ?? 0;

      // Only call RPC if there's an actual mismatch
      if (expected !== currentApplied) {
        await (admin.rpc as Function)("recalculer_bonus_logistique", {
          p_user_id: user.id,
        });
        adjusted++;
      }
    }

    revalidatePath("/classement");
    revalidatePath("/classement/personnel");
    revalidatePath("/production-logistique");

    return { success: true, processed: users.length, adjusted };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur inconnue.";
    return { success: false, error: message };
  }
}
