"use client";

import { useState, useTransition } from "react";
import { toggleCoursPresence, marquerTousPresents } from "@/app/(dashboard)/cours/actions";
import type { CoursParticipantRow } from "@/app/(dashboard)/cours/actions";
import { useRouter } from "next/navigation";

type Props = {
  coursId: string;
  participants: CoursParticipantRow[];
  canDoAppel: boolean;
  isActive: boolean;
};

function Avatar({ participant }: { participant: CoursParticipantRow }) {
  const initial = participant.pseudo?.[0]?.toUpperCase() ?? "?";
  return (
    <div className="relative flex-shrink-0">
      {participant.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={participant.avatar_url}
          alt={participant.pseudo}
          className="w-8 h-8 rounded-full object-cover"
        />
      ) : (
        <div className="w-8 h-8 rounded-full bg-purple-600/30 ring-1 ring-purple-500/30 flex items-center justify-center">
          <span className="text-xs font-semibold text-purple-300">{initial}</span>
        </div>
      )}
    </div>
  );
}

function ParticipantItem({
  participant,
  canDoAppel,
  isActive,
  coursId,
}: {
  participant: CoursParticipantRow;
  canDoAppel: boolean;
  isActive: boolean;
  coursId: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [localPresent, setLocalPresent] = useState(participant.present);
  const router = useRouter();

  const displayName =
    participant.prenom_rp && participant.nom_rp
      ? `${participant.prenom_rp} ${participant.nom_rp}`
      : participant.pseudo;

  function handleToggle() {
    startTransition(async () => {
      const result = await toggleCoursPresence(coursId, participant.utilisateur_id);
      if (result.success) {
        setLocalPresent((prev) => !prev);
        router.refresh();
      }
    });
  }

  return (
    <div className={`flex items-center gap-3 py-2.5 px-3 rounded-lg transition ${
      localPresent ? "bg-green-500/5" : "hover:bg-white/[0.02]"
    }`}>
      <Avatar participant={participant} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white/90 font-medium truncate">{displayName}</p>
        {participant.prenom_rp && (
          <p className="text-xs text-white/40 truncate">@{participant.pseudo}</p>
        )}
      </div>
      {participant.grade_role && (
        <span className="hidden sm:block text-xs text-white/30 shrink-0">
          {participant.grade_role}
        </span>
      )}
      {/* Presence indicator / toggle */}
      {canDoAppel && isActive ? (
        <button
          onClick={handleToggle}
          disabled={isPending}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ring-1 transition disabled:opacity-50 ${
            localPresent
              ? "bg-green-600/20 ring-green-500/40 text-green-300 hover:bg-green-600/30"
              : "bg-white/[0.03] ring-white/10 text-white/50 hover:text-white/70 hover:bg-white/[0.05]"
          }`}
        >
          {isPending ? (
            <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : localPresent ? (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              Présent
            </>
          ) : (
            "Absent"
          )}
        </button>
      ) : (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ${
          localPresent
            ? "bg-green-500/15 text-green-400 ring-green-500/30"
            : "bg-white/5 text-white/40 ring-white/10"
        }`}>
          {localPresent ? (
            <>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              Présent
            </>
          ) : "Absent"}
        </span>
      )}
    </div>
  );
}

export default function CoursAttendance({
  coursId,
  participants,
  canDoAppel,
  isActive,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const presentCount = participants.filter((p) => p.present).length;

  function handleMarkAll() {
    startTransition(async () => {
      const result = await marquerTousPresents(coursId);
      if (result.success) {
        router.refresh();
      }
    });
  }

  if (participants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-white/[0.03] ring-1 ring-white/10 flex items-center justify-center mx-auto mb-4">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="w-7 h-7 text-white/30">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
          </svg>
        </div>
        <p className="text-sm text-white/40">Aucun inscrit pour le moment.</p>
        <p className="text-xs text-white/25 mt-1">Soyez le premier à vous inscrire à ce cours !</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white/70">
          Appel — {presentCount} / {participants.length} présent{presentCount !== 1 ? "s" : ""}
        </h2>
        {canDoAppel && isActive && (
          <button
            onClick={handleMarkAll}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600/15 ring-1 ring-green-500/30 text-green-300 hover:bg-green-600/25 transition disabled:opacity-50"
          >
            {isPending ? (
              <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            )}
            Tout marquer présent
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            presentCount >= 5 ? "bg-green-500" : "bg-amber-500"
          }`}
          style={{ width: `${Math.min(100, (presentCount / Math.max(participants.length, 5)) * 100)}%` }}
        />
      </div>
      {presentCount < 5 && (
        <p className="text-xs text-amber-300/60">
          Encore {5 - presentCount} présent{5 - presentCount > 1 ? "s" : ""} nécessaire{5 - presentCount > 1 ? "s" : ""} pour valider le cours.
        </p>
      )}

      {/* Participant list */}
      <div className="divide-y divide-white/[0.04]">
        {participants.map((p) => (
          <ParticipantItem
            key={p.id}
            participant={p}
            canDoAppel={canDoAppel}
            isActive={isActive}
            coursId={coursId}
          />
        ))}
      </div>
    </div>
  );
}
