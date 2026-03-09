"use client";

import { useState, useTransition, useMemo } from "react";
import { getItemsByCategory } from "@/lib/logistics/config";
import { enregistrerRessource } from "@/app/(dashboard)/production-logistique/actions";
import type { LogisticsActionResult, UtilisateurOption, DonLogistique } from "@/app/(dashboard)/production-logistique/actions";

// ─── Constants ────────────────────────────────────────────────────────────────

const ITEMS_BY_CATEGORY = getItemsByCategory();

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {
  initialLogisticsPoints: number;
  initialBonusPersonnel: number;
  utilisateurs: UtilisateurOption[];
  initialDons: DonLogistique[];
  globalBonusCap?: number;
};

export function LogisticsForm({ initialLogisticsPoints, initialBonusPersonnel, utilisateurs, initialDons, globalBonusCap = 200 }: Props) {
  const [itemKey, setItemKey] = useState("");
  const [quantite, setQuantite] = useState("1");
  const [donneurId, setDonneurId] = useState("");
  const [donneurSearch, setDonneurSearch] = useState("");
  const [result, setResult] = useState<LogisticsActionResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [dons, setDons] = useState<DonLogistique[]>(initialDons);

  // After a successful submission reflect latest totals
  const [logisticsPoints, setLogisticsPoints] = useState(initialLogisticsPoints);
  const [bonusPersonnel, setBonusPersonnel] = useState(initialBonusPersonnel);

  // Filtered donor list based on search
  const filteredUtilisateurs = useMemo(() => {
    if (!donneurSearch.trim()) return utilisateurs;
    const q = donneurSearch.toLowerCase();
    return utilisateurs.filter((u) => u.pseudo.toLowerCase().includes(q));
  }, [donneurSearch, utilisateurs]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setResult(null);

    const qty = parseInt(quantite, 10);
    if (!itemKey) {
      setResult({ success: false, error: "Veuillez sélectionner un item." });
      return;
    }
    if (isNaN(qty) || qty <= 0) {
      setResult({ success: false, error: "La quantité doit être un entier positif." });
      return;
    }
    if (!donneurId) {
      setResult({ success: false, error: "Veuillez sélectionner un donneur." });
      return;
    }

    const selectedDonneur = utilisateurs.find((u) => u.id === donneurId);
    const selectedItem = Array.from(ITEMS_BY_CATEGORY.values())
      .flat()
      .find((i) => i.key === itemKey);

    startTransition(async () => {
      const res = await enregistrerRessource(itemKey, qty, donneurId);
      setResult(res);
      if (res.success) {
        setLogisticsPoints(res.logisticsTotal);
        setBonusPersonnel(Math.floor(Math.min(res.logisticsTotal * 0.1, globalBonusCap)));
        // Add the new donation to the top of the list
        setDons((prev) => [
          {
            id: crypto.randomUUID(),
            donneur_pseudo: selectedDonneur?.pseudo ?? "Inconnu",
            enregistre_par_pseudo: "Vous",
            item_label: selectedItem?.label ?? itemKey,
            quantite: qty,
            points_gagnes: res.pointsGained,
            created_at: new Date().toISOString(),
          },
          ...prev,
        ]);
        // Reset form
        setItemKey("");
        setQuantite("1");
        setDonneurId("");
        setDonneurSearch("");
      }
    });
  }

  return (
    <div className="space-y-8">

      {/* ── Stats cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 via-white/[0.03] to-transparent border border-amber-500/15 px-6 py-5">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full -translate-y-8 translate-x-8 blur-2xl" />
          <div className="relative">
            <p className="text-[11px] font-semibold text-amber-300/70 uppercase tracking-widest mb-1">
              Points Logistique
            </p>
            <p className="text-3xl font-bold text-white">
              {logisticsPoints.toLocaleString("fr-FR")}
            </p>
            <p className="mt-1 text-xs text-white/40">
              Plafond comptabilisable : {globalBonusCap} pts
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 via-white/[0.03] to-transparent border border-emerald-500/15 px-6 py-5">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -translate-y-8 translate-x-8 blur-2xl" />
          <div className="relative">
            <p className="text-[11px] font-semibold text-emerald-300/70 uppercase tracking-widest mb-1">
              Bonus Personnel (5 %)
            </p>
            <p className="text-3xl font-bold text-emerald-400">
              +{bonusPersonnel.toLocaleString("fr-FR")}
            </p>
            <p className="mt-1 text-xs text-white/40">
              Inclus dans vos points personnels
            </p>
          </div>
        </div>
      </div>

      {/* ── Form ───────────────────────────────────────────────────── */}
      <form
        onSubmit={handleSubmit}
        className="rounded-2xl bg-white/[0.03] border border-white/8 overflow-hidden"
      >
        <div className="h-px w-full bg-gradient-to-r from-amber-500/0 via-amber-500/50 to-amber-500/0" />
        <div className="p-6 space-y-6">
        <div>
          <h2 className="text-base font-semibold text-white">
            Enregistrer une réception
          </h2>
          <p className="mt-1 text-sm text-white/40">
            Sélectionnez la ressource reçue et renseignez la quantité.
            Les points sont calculés automatiquement.
          </p>
        </div>

        {/* Item select */}
        <div className="space-y-2">
          <label
            htmlFor="item-select"
            className="block text-sm font-medium text-white/70"
          >
            Ressource / Blueprint / Objet crafté
          </label>
          <select
            id="item-select"
            value={itemKey}
            onChange={(e) => setItemKey(e.target.value)}
            required
            className="w-full rounded-xl bg-white/[0.05] border border-white/10 text-white text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 [&>option]:bg-[#0d1529] [&>optgroup]:bg-[#0d1529] disabled:opacity-50"
            disabled={isPending}
          >
            <option value="" disabled>
              — Choisir un item —
            </option>
            {Array.from(ITEMS_BY_CATEGORY.entries()).map(([category, items]) => (
              <optgroup key={category} label={category}>
                {items.map(({ key, label }) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Quantity input */}
        <div className="space-y-2">
          <label
            htmlFor="quantite-input"
            className="block text-sm font-medium text-white/70"
          >
            Quantité reçue
          </label>
          <input
            id="quantite-input"
            type="number"
            min={1}
            max={9999}
            step={1}
            value={quantite}
            onChange={(e) => setQuantite(e.target.value)}
            required
            className="w-full rounded-xl bg-white/[0.05] border border-white/10 text-white text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 disabled:opacity-50"
            disabled={isPending}
          />
        </div>

        {/* Donor select with search */}
        <div className="space-y-2">
          <label
            htmlFor="donneur-search"
            className="block text-sm font-medium text-white/70"
          >
            Donneur (qui a donné la ressource)
          </label>
          <input
            id="donneur-search"
            type="text"
            placeholder="Rechercher un utilisateur…"
            value={donneurSearch}
            onChange={(e) => {
              setDonneurSearch(e.target.value);
              setDonneurId("");
            }}
            className="w-full rounded-xl bg-white/[0.05] border border-white/10 text-white text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 disabled:opacity-50"
            disabled={isPending}
          />
          {donneurId ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
              <span>✓ {utilisateurs.find((u) => u.id === donneurId)?.pseudo}</span>
              <button
                type="button"
                onClick={() => { setDonneurId(""); setDonneurSearch(""); }}
                className="ml-auto text-red-400 hover:text-white text-xs"
              >
                Changer
              </button>
            </div>
          ) : donneurSearch.trim() ? (
            <div className="max-h-40 overflow-y-auto rounded-xl bg-[#0d1529] border border-white/10">
              {filteredUtilisateurs.length === 0 ? (
                <p className="px-4 py-2 text-sm text-white/30">Aucun résultat</p>
              ) : (
                filteredUtilisateurs.slice(0, 20).map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => { setDonneurId(u.id); setDonneurSearch(u.pseudo); }}
                    className="w-full text-left px-4 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    {u.pseudo}
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>

        {/* Feedback */}
        {result && (
          <div
            className={`rounded-xl px-4 py-3 text-sm ${
              result.success
                ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                : "bg-red-500/10 border border-red-500/30 text-red-300"
            }`}
          >
            {result.success ? (
              <>
                ✓ Réception enregistrée.{" "}
                {result.pointsGained > 0 ? (
                  <span>
                    +{result.pointsGained} pts logistique attribués.
                  </span>
                ) : (
                  <span>
                    Aucun point attribué (valeur non encore configurée par
                    les admins).
                  </span>
                )}
              </>
            ) : (
              <>✕ {result.error}</>
            )}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isPending || !itemKey || !donneurId}
          className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold text-white transition-colors shadow-lg shadow-amber-900/20"
        >
          {isPending ? "Enregistrement…" : "Enregistrer la réception"}
        </button>
        </div>
      </form>

      {/* ── Donations history table ────────────────────────────────── */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/8 overflow-hidden">
        <div className="h-px w-full bg-gradient-to-r from-amber-500/0 via-amber-500/30 to-amber-500/0" />
        <div className="p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-white">
            Historique des dons
          </h2>
          <p className="mt-1 text-sm text-white/40">
            Les {dons.length} derniers dons enregistrés.
          </p>
        </div>

        {dons.length === 0 ? (
          <p className="text-sm text-white/30 py-4 text-center">
            Aucun don enregistré pour le moment.
          </p>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8">
                  <th className="text-left py-2 pr-4 text-[11px] font-semibold text-white/30 uppercase tracking-widest">Donneur</th>
                  <th className="text-left py-2 pr-4 text-[11px] font-semibold text-white/30 uppercase tracking-widest">Item</th>
                  <th className="text-right py-2 pr-4 text-[11px] font-semibold text-white/30 uppercase tracking-widest">Qté</th>
                  <th className="text-right py-2 pr-4 text-[11px] font-semibold text-white/30 uppercase tracking-widest">Points</th>
                  <th className="text-left py-2 pr-4 text-[11px] font-semibold text-white/30 uppercase tracking-widest">Enregistré par</th>
                  <th className="text-left py-2 text-[11px] font-semibold text-white/30 uppercase tracking-widest">Date</th>
                </tr>
              </thead>
              <tbody>
                {dons.map((don) => (
                  <tr key={don.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 pr-4 text-white/80 font-medium">{don.donneur_pseudo}</td>
                    <td className="py-2.5 pr-4 text-white/60">{don.item_label}</td>
                    <td className="py-2.5 pr-4 text-right text-white/60">{don.quantite}</td>
                    <td className="py-2.5 pr-4 text-right text-amber-400 font-medium">
                      {don.points_gagnes > 0 ? `+${don.points_gagnes}` : "0"}
                    </td>
                    <td className="py-2.5 pr-4 text-white/40">{don.enregistre_par_pseudo}</td>
                    <td className="py-2.5 text-white/30 whitespace-nowrap">
                      {new Date(don.created_at).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
