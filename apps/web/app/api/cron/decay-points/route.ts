import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * GET /api/cron/decay-points
 *
 * Décroissance hebdomadaire : divise par 2 les points de chaque escouade.
 * Appelé chaque lundi à 04:00 UTC par Vercel Cron.
 *
 * Protégé par CRON_SECRET (header Authorization: Bearer <secret>).
 *
 * ⚠️  RESET PROTECTION : ce cron appelle uniquement
 * `appliquer_decroissance_points_escouade` qui ne modifie que `escouades.points`.
 * `utilisateurs.logistics_points` ne doit JAMAIS être affecté par ce cron.
 */
export async function GET(req: NextRequest) {
  // Vérifier le secret cron
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const admin = await createAdminClient();

  // Appeler la fonction SQL qui divise les points par 2
  const { data, error } = await admin.rpc(
    "appliquer_decroissance_points_escouade" as never
  );

  if (error) {
    console.error("[cron/decay-points] Erreur :", error);
    return NextResponse.json(
      { error: "Erreur lors de la décroissance des points.", details: error.message },
      { status: 500 }
    );
  }

  const nbUpdated = typeof data === "number" ? data : 0;

  console.log(
    `[cron/decay-points] Décroissance appliquée — ${nbUpdated} escouade(s) mise(s) à jour.`
  );

  return NextResponse.json({
    success: true,
    message: `Décroissance de 50 % appliquée à ${nbUpdated} escouade(s).`,
  });
}
