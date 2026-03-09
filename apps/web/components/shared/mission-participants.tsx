import type { SquadGroup, ParticipantRow } from "@/app/(dashboard)/missions/actions";

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  bySquad: SquadGroup[];
  solo: ParticipantRow[];
  totalCount: number;
  basePoints: number;
  isCreator: boolean;
};

// ─── Multiplier badge ─────────────────────────────────────────────────────────

function MultiplierBadge({ multiplier }: { multiplier: number }) {
  if (multiplier <= 1) return null;

  const colors =
    multiplier >= 2.25
      ? "bg-amber-500/20 text-amber-300 ring-amber-500/30"
      : multiplier >= 2
      ? "bg-purple-500/20 text-purple-300 ring-purple-500/30"
      : "bg-red-500/20 text-red-300 ring-red-500/30";

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ring-1 ${colors}`}
    >
      ×{multiplier}
    </span>
  );
}

// ─── Avatar ─────────────────────────────────────────────────────────────────

function Avatar({ participant }: { participant: ParticipantRow }) {
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
        <div className="w-8 h-8 rounded-full bg-red-600/30 ring-1 ring-red-500/30 flex items-center justify-center">
          <span className="text-xs font-semibold text-red-300">{initial}</span>
        </div>
      )}
    </div>
  );
}

// ─── Participant row ──────────────────────────────────────────────────────────

function ParticipantItem({ participant }: { participant: ParticipantRow }) {
  const displayName =
    participant.prenom_rp && participant.nom_rp
      ? `${participant.prenom_rp} ${participant.nom_rp}`
      : participant.pseudo;

  return (
    <div className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-white/[0.02] transition">
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
    </div>
  );
}

// ─── Squad logo ───────────────────────────────────────────────────────────────

function SquadLogo({ squad }: { squad: SquadGroup }) {
  if (squad.url_logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={squad.url_logo}
        alt={squad.nom}
        className="w-10 h-10 rounded-xl object-cover ring-1 ring-white/10"
      />
    );
  }
  return (
    <div className="w-10 h-10 rounded-xl bg-white/[0.06] ring-1 ring-white/10 flex items-center justify-center">
      <span className="text-sm font-bold text-white/50">
        {squad.nom[0]?.toUpperCase() ?? "?"}
      </span>
    </div>
  );
}

// ─── Squad card ───────────────────────────────────────────────────────────────

function SquadCard({
  squad,
  isCreator,
}: {
  squad: SquadGroup;
  isCreator: boolean;
}) {
  const participationRatio = `${squad.participants.length} / ${squad.totalSize}`;
  const isFullSquad = squad.participants.length >= squad.totalSize;

  return (
    <div
      className={`rounded-xl ring-1 overflow-hidden ${
        squad.multiplier >= 2.25
          ? "ring-amber-500/25 bg-amber-500/5"
          : squad.multiplier >= 2
          ? "ring-purple-500/25 bg-purple-500/5"
          : squad.multiplier > 1
          ? "ring-red-500/20 bg-red-500/5"
          : "ring-white/[0.06] bg-white/[0.02]"
      }`}
    >
      {/* Squad header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.05]">
        <SquadLogo squad={squad} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-white truncate">{squad.nom}</h3>
            {isFullSquad && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 ring-1 ring-green-500/30">
                ESCOUADE COMPLÈTE
              </span>
            )}
          </div>
          <p className="text-xs text-white/40 mt-0.5">
            {participationRatio} membres inscrits
          </p>
        </div>
        <MultiplierBadge multiplier={squad.multiplier} />
      </div>

      {/* Reward info (creator only) */}
      {isCreator && squad.pointsEarned > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 border-b border-white/[0.04] bg-white/[0.015]">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-3.5 h-3.5 text-amber-400 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.563.563 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
          </svg>
          <p className="text-xs text-white/50">
            Bonus escouade :&nbsp;
            <strong className="text-amber-300">+{squad.pointsEarned} pts</strong>
            <span className="text-white/30 ml-1">(×{squad.multiplier})</span>
          </p>
        </div>
      )}

      {/* Participant list */}
      <div className="divide-y divide-white/[0.04]">
        {squad.participants.map((p) => (
          <ParticipantItem key={p.utilisateur_id} participant={p} />
        ))}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MissionParticipants({
  bySquad,
  solo,
  totalCount,
  basePoints,
  isCreator,
}: Props) {
  if (totalCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-14 h-14 rounded-2xl bg-white/[0.03] ring-1 ring-white/10 flex items-center justify-center mx-auto mb-4">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="w-7 h-7 text-white/30">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
          </svg>
        </div>
        <p className="text-sm text-white/40">Aucun participant pour le moment.</p>
        <p className="text-xs text-white/25 mt-1">Soyez le premier à rejoindre cette mission !</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white/70">
          Participants
        </h2>
        <span className="text-xs text-white/40 bg-white/[0.04] px-2.5 py-1 rounded-full ring-1 ring-white/10">
          {totalCount} inscrit{totalCount > 1 ? "s" : ""}
        </span>
      </div>

      {/* Creator reward summary */}
      {isCreator && bySquad.length > 0 && (
        <div className="rounded-xl bg-amber-500/8 ring-1 ring-amber-500/20 px-4 py-3">
          <p className="text-xs font-semibold text-amber-300 mb-2">
            Récapitulatif des récompenses (à la clôture)
          </p>
          <div className="space-y-1">
            {bySquad.map((sq) => (
              <div key={sq.escouadeId} className="flex items-center justify-between text-xs">
                <span className="text-white/60">{sq.nom}</span>
                <div className="flex items-center gap-2">
                  <MultiplierBadge multiplier={sq.multiplier} />
                  <span className="text-amber-300 font-semibold">
                    {sq.pointsEarned} pts
                  </span>
                  <span className="text-white/30">
                    ({sq.participants.length} membres)
                  </span>
                </div>
              </div>
            ))}
            {solo.length > 0 && (
              <div className="flex items-center justify-between text-xs pt-1 border-t border-white/[0.06]">
                <span className="text-white/40 italic">Sans escouade</span>
                <span className="text-white/40">{solo.length} pers. — {basePoints} pts perso. chac.</span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-white/[0.06]">
              <span className="text-emerald-400/70 italic">Pts personnels (tous)</span>
              <span className="text-emerald-400/70">{basePoints} pts / participant</span>
            </div>
          </div>
        </div>
      )}

      {/* Squad groups */}
      {bySquad.length > 0 && (
        <div className="space-y-3">
          {bySquad.map((squad) => (
            <SquadCard key={squad.escouadeId} squad={squad} isCreator={isCreator} />
          ))}
        </div>
      )}

      {/* Solo / no-squad participants */}
      {solo.length > 0 && (
        <div className="rounded-xl ring-1 ring-white/[0.06] overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.05] bg-white/[0.02]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-white/40">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
            <h3 className="text-sm font-semibold text-white/70">Sans escouade</h3>
            <span className="ml-auto text-xs text-white/30">{solo.length}</span>
          </div>
          <div className="divide-y divide-white/[0.04]">
            {solo.map((p) => (
              <ParticipantItem key={p.utilisateur_id} participant={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
