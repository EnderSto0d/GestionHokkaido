"use client";

import type { ConseilMembre } from "@/app/(dashboard)/conseil/actions";

// ─── Avatar Helper ────────────────────────────────────────────────────────────

function Avatar({
  url,
  pseudo,
  size = "md",
}: {
  url: string | null;
  pseudo: string;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const sizes = {
    sm: "w-8 h-8 text-xs",
    md: "w-12 h-12 text-sm",
    lg: "w-16 h-16 text-base",
    xl: "w-20 h-20 text-lg",
  };
  return (
    <div
      className={`${sizes[size]} rounded-full overflow-hidden bg-red-500/20 ring-2 ring-red-500/30 flex items-center justify-center flex-shrink-0`}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={pseudo} className="object-cover w-full h-full" />
      ) : (
        <span className="font-bold text-red-300 uppercase">
          {pseudo.charAt(0)}
        </span>
      )}
    </div>
  );
}

// ─── Seat Node ────────────────────────────────────────────────────────────────

type SeatType = "elu_eleve" | "elu_joker" | "classement_perso";

const SEAT_RING: Record<SeatType, string> = {
  elu_eleve:      "ring-orange-500/40 shadow-[0_0_14px_rgba(249,115,22,0.12)]",
  elu_joker:      "ring-purple-500/40 shadow-[0_0_14px_rgba(168,85,247,0.12)]",
  classement_perso: "ring-red-500/40 shadow-[0_0_14px_rgba(239,68,68,0.12)]",
};
const SEAT_BG: Record<SeatType, string> = {
  elu_eleve:      "bg-orange-500/[0.06]",
  elu_joker:      "bg-purple-500/[0.06]",
  classement_perso: "bg-red-500/[0.06]",
};
const SEAT_TEXT: Record<SeatType, string> = {
  elu_eleve:      "text-orange-400/40",
  elu_joker:      "text-purple-400/40",
  classement_perso: "text-red-400/40",
};
const SEAT_LABEL: Record<SeatType, string> = {
  elu_eleve:      "Siège Escouade",
  elu_joker:      "Siège Joker",
  classement_perso: "Siège Classement",
};

function SeatNode({
  membre,
  isChief,
  isEmpty,
  seatType,
  angle,
  radius,
  centerX,
  centerY,
}: {
  membre?: ConseilMembre;
  isChief?: boolean;
  isEmpty?: boolean;
  seatType?: SeatType;
  angle: number;
  radius: number;
  centerX: number;
  centerY: number;
}) {
  const x = centerX + radius * Math.cos(angle);
  const y = centerY - radius * Math.sin(angle);

  const nodeSize = isChief ? 96 : 72;
  const halfNode = nodeSize / 2;

  if (isEmpty) {
    const ringCls  = seatType ? SEAT_RING[seatType]  : "ring-white/10";
    const bgCls    = seatType ? SEAT_BG[seatType]    : "bg-white/[0.03]";
    const textCls  = seatType ? SEAT_TEXT[seatType]  : "text-white/15";
    const labelTxt = seatType ? SEAT_LABEL[seatType] : "Siège vacant";
    return (
      <div
        className="absolute flex flex-col items-center gap-1 transition-all duration-500"
        style={{
          left: `${x}px`,
          top: `${y}px`,
          transform: `translate(-50%, -50%)`,
          width: `${nodeSize}px`,
        }}
      >
        <div
          className={`rounded-full ${bgCls} ring-1 ring-dashed ${ringCls} flex items-center justify-center`}
          style={{ width: `${halfNode * 2 - 16}px`, height: `${halfNode * 2 - 16}px` }}
        >
          <span className={`${textCls} text-lg`}>?</span>
        </div>
        <span className={`text-[9px] ${textCls} text-center truncate max-w-full`}>
          {labelTxt}
        </span>
      </div>
    );
  }

  if (!membre) return null;

  const displayName =
    membre.prenom_rp && membre.nom_rp
      ? `${membre.prenom_rp} ${membre.nom_rp}`
      : membre.pseudo;

  const ringColor = isChief
    ? "ring-amber-400/60 shadow-[0_0_30px_rgba(251,191,36,0.15)]"
    : membre.type_siege === "classement_perso"
    ? "ring-red-500/60 shadow-[0_0_20px_rgba(239,68,68,0.15)]"
    : membre.type_siege === "elu_joker"
    ? "ring-purple-500/50"
    : "ring-orange-500/50";

  const badgeColor = isChief
    ? "bg-amber-500/20 text-amber-300"
    : membre.type_siege === "classement_perso"
    ? "bg-red-500/20 text-red-300"
    : membre.type_siege === "elu_joker"
    ? "bg-purple-500/15 text-purple-400/80"
    : "bg-orange-500/15 text-orange-400/80";

  const badgeLabel = isChief
    ? "Chef"
    : membre.type_siege === "classement_perso"
    ? "Classement"
    : membre.type_siege === "elu_joker"
    ? "Joker"
    : "Élu";

  return (
    <div
      className="absolute flex flex-col items-center gap-1 group transition-all duration-500"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        transform: `translate(-50%, -50%)`,
        width: `${nodeSize + 20}px`,
        zIndex: isChief ? 10 : 1,
      }}
    >
      {/* Glow for chief */}
      {isChief && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-24 h-24 rounded-full bg-amber-400/10 blur-xl animate-pulse" />
        </div>
      )}

      {/* Avatar */}
      <div className={`relative rounded-full ring-2 ${ringColor} overflow-hidden transition-all duration-300 group-hover:scale-110`}>
        <Avatar
          url={membre.avatar_url}
          pseudo={membre.pseudo}
          size={isChief ? "xl" : "lg"}
        />
      </div>

      {/* Name & Badge */}
      <div className="flex flex-col items-center gap-0.5 mt-0.5">
        <span
          className={`font-semibold text-white/90 text-center truncate max-w-full leading-tight ${
            isChief ? "text-xs" : "text-[10px]"
          }`}
        >
          {displayName}
        </span>
        <span
          className={`text-[8px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium ${badgeColor}`}
        >
          {badgeLabel}
        </span>
        {membre.grade && (
          <span className="text-[8px] text-white/20">{membre.grade}</span>
        )}
      </div>
    </div>
  );
}

// ─── Semi-Circle Layout ──────────────────────────────────────────────────────

export function ConseilSemicircle({ membres }: { membres: ConseilMembre[] }) {
  // Find the chief
  const chef = membres.find((m) => m.est_chef);
  const nonChiefMembers = membres.filter((m) => !m.est_chef);

  // Fixed seat-type order for the arc:
  //   4 escouade (orange) · 2 joker (violet) · 1 classement (rouge)
  //   When a chief is present he takes the centre and one orange seat is freed.
  const arcSeatTypes: SeatType[] = chef
    ? ["elu_eleve", "elu_eleve", "elu_eleve", "elu_joker", "elu_joker", "classement_perso"]
    : ["elu_eleve", "elu_eleve", "elu_eleve", "elu_eleve", "elu_joker", "elu_joker", "classement_perso"];

  // Match each seat to a member of the same type (first-come first-served)
  const remaining = [...nonChiefMembers];
  const allArcItems = arcSeatTypes.map((seatType) => {
    const idx = remaining.findIndex((m) => m.type_siege === seatType);
    if (idx >= 0) {
      const [membre] = remaining.splice(idx, 1);
      return { membre, isEmpty: false, seatType };
    }
    return { isEmpty: true, seatType };
  });

  // Layout dimensions
  const width = 700;
  const height = 420;
  const centerX = width / 2;
  const centerY = height - 40;
  const radius = 260;

  // Distribute evenly across the arc
  const startAngle = Math.PI * 0.9;
  const endAngle = Math.PI * 0.1;
  const arcSpan = startAngle - endAngle;
  const arcSeatCount = allArcItems.length;
  const step = arcSeatCount > 1 ? arcSpan / (arcSeatCount - 1) : 0;

  return (
    <div className="relative w-full overflow-hidden">
      {/* SVG Arc line */}
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="absolute inset-0 w-full h-full pointer-events-none"
        preserveAspectRatio="xMidYMax meet"
      >
        <defs>
          <linearGradient id="arc-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(251,191,36,0.15)" />
            <stop offset="33%" stopColor="rgba(249,115,22,0.25)" />
            <stop offset="66%" stopColor="rgba(168,85,247,0.2)" />
            <stop offset="100%" stopColor="rgba(239,68,68,0.2)" />
          </linearGradient>
        </defs>
        {/* Arc path */}
        <path
          d={describeArc(centerX, centerY, radius, endAngle, startAngle)}
          fill="none"
          stroke="url(#arc-grad)"
          strokeWidth="1.5"
          strokeDasharray="6 4"
          opacity="0.5"
        />
        {/* Center connector lines to each seat */}
        {allArcItems.map((_, idx) => {
          const angle = startAngle - idx * step;
          const sx = centerX + radius * Math.cos(angle);
          const sy = centerY - radius * Math.sin(angle);
          return (
            <line
              key={idx}
              x1={centerX}
              y1={centerY}
              x2={sx}
              y2={sy}
              stroke="rgba(255,255,255,0.04)"
              strokeWidth="1"
            />
          );
        })}
      </svg>

      {/* Container with proper aspect ratio */}
      <div className="relative mx-auto" style={{ width: `${width}px`, height: `${height}px`, maxWidth: "100%" }}>
        {/* Chief at the focal center — only when elected */}
        {chef && (
          <SeatNode
            membre={chef}
            isChief
            angle={Math.PI / 2}
            radius={0}
            centerX={centerX}
            centerY={centerY}
          />
        )}

        {/* Arc seats */}
        {allArcItems.map((item, idx) => {
          const angle = startAngle - idx * step;
          return (
            <SeatNode
              key={idx}
              membre={item.membre}
              isEmpty={item.isEmpty}
              seatType={item.seatType}
              angle={angle}
              radius={radius}
              centerX={centerX}
              centerY={centerY}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── SVG Arc Helper ──────────────────────────────────────────────────────────

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
): string {
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy - r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy - r * Math.sin(endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 0 ${x2} ${y2}`;
}
