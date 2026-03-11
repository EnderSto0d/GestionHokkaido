"use client";

import { useState, useTransition } from "react";
import {
  toggleMissionPresence,
  marquerTousPresentsMission,
} from "@/app/(dashboard)/missions/actions";
import type { ParticipantRow } from "@/app/(dashboard)/missions/actions";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  missionId: string;
  participants: ParticipantRow[];
  canDoAppel: boolean;
  isActive: boolean;
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function MissionAttendance({
  missionId,
  participants,
  canDoAppel,
  isActive,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const router = useRouter();

  const presentCount = participants.filter((p) => p.present).length;
  const totalCount = participants.length;

  function handleToggle(utilisateurId: string) {
    setTogglingId(utilisateurId);
    startTransition(async () => {
      await toggleMissionPresence(missionId, utilisateurId);
      setTogglingId(null);
      router.refresh();
    });
  }

  function handleMarkAll() {
    startTransition(async () => {
      await marquerTousPresentsMission(missionId);
      router.refresh();
    });
  }

  if (totalCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="text-sm text-white/40">Aucun participant inscrit.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white/70">Appel</h3>
        <span className="text-xs text-white/40 bg-white/[0.04] px-2.5 py-1 rounded-full ring-1 ring-white/10">
          {presentCount} / {totalCount} présent{presentCount > 1 ? "s" : ""}
        </span>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              presentCount >= totalCount
                ? "bg-green-500"
                : "bg-blue-500"
            }`}
            style={{ width: `${totalCount > 0 ? (presentCount / totalCount) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Mark all button */}
      {canDoAppel && isActive && presentCount < totalCount && (
        <button
          onClick={handleMarkAll}
          disabled={isPending}
          className="w-full py-2 rounded-lg bg-blue-600/15 ring-1 ring-blue-500/30 text-blue-300 text-xs font-medium hover:bg-blue-600/25 transition disabled:opacity-50"
        >
          {isPending && !togglingId ? "Mise à jour…" : "Tout marquer présent"}
        </button>
      )}

      {/* Participant list */}
      <div className="space-y-1">
        {participants.map((p) => {
          const displayName =
            p.prenom_rp && p.nom_rp
              ? `${p.prenom_rp} ${p.nom_rp}`
              : p.pseudo;
          const initial = p.pseudo?.[0]?.toUpperCase() ?? "?";
          const isToggling = togglingId === p.utilisateur_id;

          return (
            <div
              key={p.utilisateur_id}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg ring-1 transition ${
                p.present
                  ? "bg-green-500/8 ring-green-500/20"
                  : "bg-white/[0.02] ring-white/[0.06]"
              }`}
            >
              {/* Avatar */}
              {p.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.avatar_url}
                  alt={p.pseudo}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-blue-600/30 ring-1 ring-blue-500/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-semibold text-blue-300">{initial}</span>
                </div>
              )}

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/90 font-medium truncate">{displayName}</p>
                {p.prenom_rp && (
                  <p className="text-xs text-white/40 truncate">@{p.pseudo}</p>
                )}
              </div>

              {/* Toggle or status */}
              {canDoAppel && isActive ? (
                <button
                  onClick={() => handleToggle(p.utilisateur_id)}
                  disabled={isPending}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ring-1 transition disabled:opacity-50 flex-shrink-0 ${
                    p.present
                      ? "bg-green-500/20 ring-green-500/40 text-green-300 hover:bg-green-500/30"
                      : "bg-white/[0.04] ring-white/10 text-white/50 hover:text-white/70 hover:bg-white/[0.06]"
                  }`}
                >
                  {isToggling ? "…" : p.present ? "Présent" : "Absent"}
                </button>
              ) : (
                <span
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold ring-1 flex-shrink-0 ${
                    p.present
                      ? "bg-green-500/20 ring-green-500/40 text-green-300"
                      : "bg-white/[0.04] ring-white/10 text-white/40"
                  }`}
                >
                  {p.present ? "Présent" : "Absent"}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
