"use client";

import { useState, useTransition, useMemo } from "react";
import {
  updateLogisticsItem,
  updateGlobalBonusCap,
} from "@/app/(dashboard)/production-logistique/actions";
import type { LogisticsItemRow } from "@/app/(dashboard)/production-logistique/actions";

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  items: LogisticsItemRow[];
  globalBonusCap: number;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function LogisticsAdminConfig({ items, globalBonusCap }: Props) {
  const [values, setValues] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const item of items) {
      initial[item.id] = item.points_per_unit;
    }
    return initial;
  });

  const [cap, setCap] = useState(globalBonusCap);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Group items by category
  const categories = useMemo(() => {
    const map = new Map<string, LogisticsItemRow[]>();
    for (const item of items) {
      const group = map.get(item.category) ?? [];
      group.push(item);
      map.set(item.category, group);
    }
    return map;
  }, [items]);

  // Track which values differ from saved state
  const hasChanges =
    cap !== globalBonusCap ||
    items.some((item) => values[item.id] !== item.points_per_unit);

  function handleSave() {
    setResult(null);
    startTransition(async () => {
      try {
        // Update cap if changed
        if (cap !== globalBonusCap) {
          const capRes = await updateGlobalBonusCap(cap);
          if (!capRes.success) {
            setResult({ ok: false, message: capRes.error });
            return;
          }
        }
        // Update each changed item
        const changed = items.filter((item) => values[item.id] !== item.points_per_unit);
        for (const item of changed) {
          const res = await updateLogisticsItem(item.id, { points_per_unit: values[item.id] });
          if (!res.success) {
            setResult({ ok: false, message: `Erreur sur ${item.label}: ${res.error}` });
            return;
          }
        }
        setResult({
          ok: true,
          message: `Configuration sauvegardée (${changed.length} item${changed.length !== 1 ? "s" : ""} mis à jour).`,
        });
      } catch (err: unknown) {
        setResult({ ok: false, message: err instanceof Error ? err.message : "Erreur inconnue." });
      }
    });
  }

  // Apply same value to all items in a category
  function setBulkCategory(category: string, value: number) {
    setValues((prev) => {
      const next = { ...prev };
      for (const item of items) {
        if (item.category === category) {
          next[item.id] = value;
        }
      }
      return next;
    });
  }

  return (
    <div className="space-y-6">

      {/* ── Global Bonus Cap ─────────────────────────────────────── */}
      <div className="rounded-2xl bg-white/[0.03] border border-white/8 overflow-hidden">
        <div className="h-px w-full bg-gradient-to-r from-amber-500/0 via-amber-500/50 to-amber-500/0" />
        <div className="p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-amber-500/15 text-amber-400">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M10 2a.75.75 0 01.75.75v.258a33.186 33.186 0 016.668.83.75.75 0 01-.336 1.461 31.28 31.28 0 00-1.103-.232l1.702 7.545a.75.75 0 01-.387.832A4.981 4.981 0 0115 14c-.825 0-1.606-.2-2.294-.556a.75.75 0 01-.387-.832l1.77-7.849a31.743 31.743 0 00-3.339-.254v11.505a20.01 20.01 0 013.78.501.75.75 0 11-.339 1.462A18.558 18.558 0 0010 17.5c-1.442 0-2.845.165-4.191.477a.75.75 0 01-.338-1.462 20.01 20.01 0 013.779-.501V4.509c-1.129.026-2.243.112-3.34.254l1.771 7.85a.75.75 0 01-.387.83A4.981 4.981 0 015 14a4.981 4.981 0 01-2.294-.556.75.75 0 01-.387-.832L4.02 5.067c-.37.07-.738.148-1.103.232a.75.75 0 01-.336-1.462 33.186 33.186 0 016.668-.829V2.75A.75.75 0 0110 2z" clipRule="evenodd" />
              </svg>
            </span>
            Plafond du Bonus Global
          </h2>
          <p className="mt-1 text-sm text-white/40">
            Bonus = min(logistics_points × 5%, plafond). Reversé en
            points personnels uniquement.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min={0}
            max={100000}
            value={cap}
            onChange={(e) => setCap(parseInt(e.target.value, 10) || 0)}
            className="w-32 rounded-xl bg-white/[0.05] border border-white/10 text-white text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 disabled:opacity-50"
            disabled={isPending}
          />
          <span className="text-sm text-white/40">points maximum</span>
        </div>
        </div>
      </div>

      {/* ── Item Configs by Category ─────────────────────────────── */}
      {Array.from(categories.entries()).map(([category, catItems]) => (
        <div
          key={category}
          className="rounded-2xl bg-white/[0.03] border border-white/8 overflow-hidden"
        >
          <div className="h-px w-full bg-gradient-to-r from-amber-500/0 via-amber-500/30 to-amber-500/0" />
          <div className="p-6 space-y-3">
          {/* Category header with bulk action */}
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider">
              {category}
              <span className="ml-2 text-xs text-white/20 font-normal normal-case">
                ({catItems.length})
              </span>
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-white/30">Appliquer à tous :</span>
              <input
                type="number"
                min={0}
                placeholder="—"
                className="w-20 rounded-lg bg-white/[0.05] border border-white/10 text-white text-xs px-2.5 py-1.5 text-right focus:outline-none focus:ring-2 focus:ring-amber-500/50 placeholder:text-white/20 disabled:opacity-50"
                disabled={isPending}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const val = parseInt((e.target as HTMLInputElement).value, 10);
                    if (!isNaN(val) && val >= 0) {
                      setBulkCategory(category, val);
                      (e.target as HTMLInputElement).value = "";
                    }
                  }
                }}
              />
            </div>
          </div>

          {/* Separator */}
          <div className="h-px bg-white/5" />

          {/* Items list */}
          <div className="space-y-1">
            {catItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 py-1.5 px-1 rounded-lg hover:bg-white/[0.02] transition-colors"
              >
                <span className="text-sm text-white/70 truncate flex-1">
                  {item.label}
                </span>
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="number"
                    min={0}
                    max={10000}
                    value={values[item.id] ?? 0}
                    onChange={(e) =>
                      setValues((prev) => ({
                        ...prev,
                        [item.id]: parseInt(e.target.value, 10) || 0,
                      }))
                    }
                    className={`w-24 rounded-lg bg-white/[0.05] border text-sm px-3 py-1.5 text-right focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 disabled:opacity-50 ${
                      values[item.id] !== item.points_per_unit
                        ? "border-amber-500/40 text-amber-300"
                        : "border-white/10 text-white"
                    }`}
                    disabled={isPending}
                  />
                  <span className="text-xs text-white/30 w-8">pts</span>
                </div>
              </div>
            ))}
          </div>
          </div>
        </div>
      ))}

      {/* ── Feedback ─────────────────────────────────────────────── */}
      {result && (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            result.ok
              ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
              : "bg-red-500/10 border border-red-500/30 text-red-300"
          }`}
        >
          {result.ok ? `✓ ${result.message}` : `✕ ${result.message}`}
        </div>
      )}

      {/* ── Save button ──────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={isPending || !hasChanges}
          className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold text-white transition-colors shadow-lg shadow-amber-900/20"
        >
          {isPending ? "Enregistrement…" : "Sauvegarder la configuration"}
        </button>
        {hasChanges && !isPending && (
          <span className="text-xs text-amber-400/70">
            Modifications non sauvegardées
          </span>
        )}
      </div>
    </div>
  );
}
