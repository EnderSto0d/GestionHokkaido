"use client";

import { useState, useTransition } from "react";
import {
  toggleParticipation,
  terminerMission,
  annulerMission,
  supprimerMission,
} from "@/app/(dashboard)/missions/actions";
import { useRouter } from "next/navigation";

// ─── Join / Leave button ──────────────────────────────────────────────────────

type JoinButtonProps = {
  missionId: string;
  isRegistered: boolean;
  isFull: boolean;
  isActive: boolean;
  isRestricted?: boolean;
  isEligible?: boolean;
  pingLabel?: string;
};

export function JoinMissionButton({
  missionId,
  isRegistered,
  isFull,
  isActive,
  isRestricted = false,
  isEligible = true,
  pingLabel,
}: JoinButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [localRegistered, setLocalRegistered] = useState(isRegistered);
  const router = useRouter();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await toggleParticipation(missionId);
      if (result.success) {
        setLocalRegistered((prev) => !prev);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  if (!isActive) return null;

  const ineligible = isRestricted && !isEligible && !localRegistered;
  const disabled = isPending || (isFull && !localRegistered) || ineligible;

  return (
    <div className="space-y-2">
      {/* Restriction banner */}
      {isRestricted && !localRegistered && (
        <div className={`flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl text-xs ring-1 ${
          isEligible
            ? "bg-amber-500/8 ring-amber-500/20 text-amber-300/80"
            : "bg-red-500/8 ring-red-500/20 text-red-400/80"
        }`}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 shrink-0 mt-0.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
          <div>
            <p className="font-semibold">
              {isEligible ? "Mission restreinte — vous êtes éligible" : "Mission restreinte — non éligible"}
            </p>
            {pingLabel && (
              <p className="mt-0.5 text-[11px] opacity-70">
                Réservée à : {pingLabel}
              </p>
            )}
          </div>
        </div>
      )}

      <button
        onClick={handleClick}
        disabled={disabled}
        className={`w-full py-3 rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2 ${
          localRegistered
            ? "bg-red-600/20 ring-1 ring-red-500/40 text-red-300 hover:bg-red-600/30"
            : ineligible
            ? "bg-white/[0.02] ring-1 ring-red-500/20 text-red-400/50 cursor-not-allowed"
            : isFull
            ? "bg-white/[0.03] ring-1 ring-white/10 text-white/40 cursor-not-allowed"
            : "bg-red-600 hover:bg-red-500 text-white"
        } disabled:opacity-60`}
      >
        {isPending ? (
          <>
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Mise à jour…
          </>
        ) : localRegistered ? (
          "Se désinscrire de la mission"
        ) : ineligible ? (
          "Non éligible"
        ) : isFull ? (
          "Mission complète"
        ) : (
          "✦ Rejoindre la mission"
        )}
      </button>
      {error && (
        <p className="text-xs text-red-400 text-center">{error}</p>
      )}
      {localRegistered && !isPending && (
        <p className="text-xs text-green-400/70 text-center">
          Vous êtes inscrit(e). Cliquer à nouveau pour vous désinscrire.
        </p>
      )}
    </div>
  );
}

// ─── Creator controls (Complete / Cancel) ────────────────────────────────────

type CreatorControlsProps = {
  missionId: string;
};

export function CreatorControls({ missionId }: CreatorControlsProps) {
  const [isPending, startTransition] = useTransition();
  const [action, setAction] = useState<"terminer" | "annuler" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<"terminer" | "annuler" | null>(null);
  const router = useRouter();

  function handleAction(type: "terminer" | "annuler") {
    if (confirm !== type) {
      setConfirm(type);
      return;
    }
    setError(null);
    setAction(type);
    startTransition(async () => {
      const result =
        type === "terminer"
          ? await terminerMission(missionId)
          : await annulerMission(missionId);

      if (result.success) {
        router.refresh();
      } else {
        setError(result.error);
        setAction(null);
        setConfirm(null);
      }
    });
  }

  return (
    <div className="space-y-2">
      {error && (
        <p className="text-xs text-red-400 text-center px-2">{error}</p>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => handleAction("terminer")}
          disabled={isPending}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ring-1 disabled:opacity-50 ${
            confirm === "terminer"
              ? "bg-green-600 ring-green-500 text-white hover:bg-green-500"
              : "bg-green-600/15 ring-green-500/30 text-green-300 hover:bg-green-600/25"
          }`}
        >
          {action === "terminer" ? (
            <span className="flex items-center justify-center gap-1.5">
              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Traitement…
            </span>
          ) : confirm === "terminer" ? (
            "✓ Confirmer la clôture"
          ) : (
            "Clôturer & distribuer les points"
          )}
        </button>
        <button
          onClick={() => handleAction("annuler")}
          disabled={isPending}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition ring-1 disabled:opacity-50 ${
            confirm === "annuler"
              ? "bg-red-600 ring-red-500 text-white hover:bg-red-500"
              : "bg-red-600/10 ring-red-500/20 text-red-400/70 hover:text-red-300 hover:bg-red-600/15"
          }`}
        >
          {action === "annuler"
            ? "Annulation…"
            : confirm === "annuler"
            ? "✓ Confirmer l'annulation"
            : "Annuler la mission"}
        </button>
      </div>
      {confirm && (
        <p className="text-xs text-amber-400/70 text-center">
          Cliquez à nouveau pour confirmer.
        </p>
      )}
    </div>
  );
}

// ─── Delete button (soft-delete for past missions) ───────────────────────────

type DeleteButtonProps = {
  missionId: string;
};

export function DeleteMissionButton({ missionId }: DeleteButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const router = useRouter();

  function handleDelete() {
    if (!confirm) {
      setConfirm(true);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await supprimerMission(missionId);
      if (result.success) {
        router.push("/missions");
        router.refresh();
      } else {
        setError(result.error);
        setConfirm(false);
      }
    });
  }

  return (
    <div className="space-y-2">
      {error && (
        <p className="text-xs text-red-400 text-center px-2">{error}</p>
      )}
      <button
        onClick={handleDelete}
        disabled={isPending}
        className={`w-full py-2.5 rounded-xl text-sm font-medium transition ring-1 disabled:opacity-50 flex items-center justify-center gap-2 ${
          confirm
            ? "bg-red-600 ring-red-500 text-white hover:bg-red-500"
            : "bg-red-600/10 ring-red-500/20 text-red-400/70 hover:text-red-300 hover:bg-red-600/15"
        }`}
      >
        {isPending ? (
          <span className="flex items-center justify-center gap-1.5">
            <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Suppression…
          </span>
        ) : confirm ? (
          "✓ Confirmer la suppression"
        ) : (
          <>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
            Supprimer la mission
          </>
        )}
      </button>
      {confirm && !isPending && (
        <p className="text-xs text-amber-400/70 text-center">
          Cliquez à nouveau pour confirmer la suppression.
        </p>
      )}
    </div>
  );
}
