import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { DIVISION_PRODUCTION_LOGISTICS } from "@/lib/logistics/config";
import type { RolesUtilisateur, GradeRole } from "@/types/database";

/**
 * POST /api/production-logistique
 *
 * Enregistre un don de ressource/blueprint/objet crafté.
 * Réservé aux membres de la division "Production et Logistique",
 * aux admins et aux directeurs.
 *
 * Body JSON : { itemKey: string, quantity: number, donneurId: string }
 *
 * ⚠ CORRECTION ARCHITECTURALE : les points vont au DONNEUR,
 *   pas au membre logistique qui enregistre le don.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Authentification
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }

    // 2. Vérification du rôle Production & Logistique
    const { data: utilisateur } = await supabase
      .from("utilisateurs")
      .select("role, grade_role")
      .eq("id", user.id)
      .single();

    const u = utilisateur as { role: RolesUtilisateur; grade_role: GradeRole | null } | null;
    const isAdminOrDirector =
      u?.role === "admin" ||
      u?.grade_role === "Directeur" ||
      u?.grade_role === "Co-Directeur";

    if (!isAdminOrDirector) {
      const { data: divRow } = await supabase
        .from("utilisateur_divisions")
        .select("id")
        .eq("utilisateur_id", user.id)
        .eq("division", DIVISION_PRODUCTION_LOGISTICS)
        .limit(1);

      if (!divRow || divRow.length === 0) {
        return NextResponse.json(
          { error: "Accès refusé : vous n'êtes pas membre de la division Production & Logistique." },
          { status: 403 }
        );
      }
    }

    // 3. Parse et validation du body
    const body = await req.json();
    const { itemKey, quantity, donneurId } = body as {
      itemKey: unknown;
      quantity: unknown;
      donneurId: unknown;
    };

    if (typeof itemKey !== "string" || !itemKey) {
      return NextResponse.json({ error: "Item requis." }, { status: 400 });
    }

    if (
      typeof quantity !== "number" ||
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      return NextResponse.json(
        { error: "La quantité doit être un entier strictement positif." },
        { status: 400 }
      );
    }

    if (quantity > 9_999) {
      return NextResponse.json(
        { error: "La quantité ne peut pas dépasser 9 999." },
        { status: 400 }
      );
    }

    if (typeof donneurId !== "string" || !donneurId) {
      return NextResponse.json(
        { error: "Veuillez fournir un donneurId valide." },
        { status: 400 }
      );
    }

    // 4. Charger l'item depuis la DB (source de vérité)
    const admin = await createAdminClient();

    const { data: itemRow } = await admin
      .from("logistics_items")
      .select("id, key, label, points_per_unit, actif")
      .eq("key", itemKey)
      .single();

    if (!itemRow) {
      return NextResponse.json({ error: "Item inconnu." }, { status: 400 });
    }
    if (!itemRow.actif) {
      return NextResponse.json({ error: "Cet item est désactivé." }, { status: 400 });
    }

    const pointsGained = itemRow.points_per_unit * quantity;

    // 5. Appel RPC — crédite le DONNEUR (pas le membre logistique)
    const { error: rpcError } = await admin.rpc(
      "enregistrer_points_logistique",
      { p_user_id: donneurId, p_points_gained: pointsGained }
    );

    if (rpcError) {
      console.error("[api/production-logistique] RPC error:", rpcError);
      return NextResponse.json(
        { error: "Erreur lors de l'enregistrement des points." },
        { status: 500 }
      );
    }

    // 6. Enregistrer le don dans l'historique (avec FK vers logistics_items)
    await admin.from("dons_logistique").insert({
      donneur_id: donneurId,
      enregistre_par: user.id,
      item_id: itemRow.id,
      item_key: itemRow.key,
      item_label: itemRow.label,
      quantite: quantity,
      points_gagnes: pointsGained,
    });

    // 7. Récupérer le nouveau solde du DONNEUR
    const { data: donneur } = await admin
      .from("utilisateurs")
      .select("logistics_points")
      .eq("id", donneurId)
      .single();

    const logisticsTotal: number = donneur?.logistics_points ?? 0;

    return NextResponse.json({
      success: true,
      pointsGained,
      logisticsTotal,
    });
  } catch (err: unknown) {
    console.error("[api/production-logistique] Unexpected error:", err);
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 }
    );
  }
}
