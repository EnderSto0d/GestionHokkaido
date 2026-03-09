import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getMissionHistory,
  canViewMissionHistory,
} from "../actions";
import type { MissionLogRow } from "../actions";

export const metadata: Metadata = {
  title: "Historique des missions — GestionHokkaido",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ACTION_CONFIG: Record<
  MissionLogRow["action"],
  { label: string; icon: string; cls: string; dotCls: string }
> = {
  creation: {
    label: "Création",
    icon: "M12 4.5v15m7.5-7.5h-15",
    cls: "bg-red-500/10 text-red-300 ring-red-500/20",
    dotCls: "bg-red-400",
  },
  participation: {
    label: "Inscription",
    icon: "M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z",
    cls: "bg-green-500/10 text-green-300 ring-green-500/20",
    dotCls: "bg-green-400",
  },
  depart: {
    label: "Départ",
    icon: "M22 10.5h-6m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z",
    cls: "bg-orange-500/10 text-orange-300 ring-orange-500/20",
    dotCls: "bg-orange-400",
  },
  terminee: {
    label: "Clôturée",
    icon: "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
    cls: "bg-white/5 text-white/50 ring-white/10",
    dotCls: "bg-white/40",
  },
  annulee: {
    label: "Annulée",
    icon: "m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
    cls: "bg-red-500/10 text-red-300 ring-red-500/20",
    dotCls: "bg-red-400",
  },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Spam detection ──────────────────────────────────────────────────────────

/**
 * Returns a set of log entry IDs that are part of a suspicious pattern:
 * a user who joined and then left (or left and joined) the same mission
 * within 10 minutes — repeated at least twice.
 */
function detectSpam(logs: MissionLogRow[]): Set<string> {
  // Group participation/départ events by user
  type Entry = { id: string; missionId: string | null; action: string; ts: number };
  const byUser = new Map<string, Entry[]>();

  for (const log of logs) {
    if (log.action !== "participation" && log.action !== "depart") continue;
    const key = log.utilisateur_id ?? log.utilisateur_pseudo ?? "unknown";
    if (!byUser.has(key)) byUser.set(key, []);
    byUser.get(key)!.push({
      id: log.id,
      missionId: log.mission_id,
      action: log.action,
      ts: new Date(log.cree_le).getTime(),
    });
  }

  const suspicious = new Set<string>();

  for (const entries of byUser.values()) {
    // Sort by time ascending
    entries.sort((a, b) => a.ts - b.ts);

    // Sliding window: count join→leave or leave→join pairs on same mission within 10 min
    const perMission = new Map<string | null, Entry[]>();
    for (const e of entries) {
      if (!perMission.has(e.missionId)) perMission.set(e.missionId, []);
      perMission.get(e.missionId)!.push(e);
    }

    for (const mEntries of perMission.values()) {
      if (mEntries.length < 4) continue; // need at least 2 full cycles
      let cycles = 0;
      let i = 0;
      while (i < mEntries.length - 1) {
        const a = mEntries[i];
        const b = mEntries[i + 1];
        if (
          a.action !== b.action &&
          Math.abs(b.ts - a.ts) < 10 * 60 * 1000
        ) {
          cycles++;
          i += 2;
        } else {
          i++;
        }
      }
      if (cycles >= 2) {
        for (const e of mEntries) suspicious.add(e.id);
      }
    }
  }

  return suspicious;
}

// ─── Stats ────────────────────────────────────────────────────────────────────

function computeStats(logs: MissionLogRow[]) {
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const recentLogs = logs.filter((l) => new Date(l.cree_le).getTime() > weekAgo);

  const created = recentLogs.filter((l) => l.action === "creation").length;
  const joined = recentLogs.filter((l) => l.action === "participation").length;
  const left = recentLogs.filter((l) => l.action === "depart").length;
  const closed = recentLogs.filter((l) => l.action === "terminee").length;

  // Top users by participation this week
  const joinCounts = new Map<string, { pseudo: string; count: number }>();
  for (const log of recentLogs) {
    if (log.action !== "participation") continue;
    const key = log.utilisateur_id ?? log.utilisateur_pseudo ?? "?";
    const pseudo = log.utilisateur_pseudo ?? "Inconnu";
    if (!joinCounts.has(key)) joinCounts.set(key, { pseudo, count: 0 });
    joinCounts.get(key)!.count++;
  }
  const topParticipants = [...joinCounts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return { created, joined, left, closed, topParticipants };
}

// ─── Components ───────────────────────────────────────────────────────────────

function ActionBadge({ action }: { action: MissionLogRow["action"] }) {
  const cfg = ACTION_CONFIG[action];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ring-1 whitespace-nowrap ${cfg.cls}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dotCls}`} />
      {cfg.label}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function MissionHistoriquePage() {
  const allowed = await canViewMissionHistory();
  if (!allowed) redirect("/missions");

  const logs = await getMissionHistory(300);
  const spamIds = detectSpam(logs);
  const stats = computeStats(logs);

  const hasSpam = spamIds.size > 0;

  return (
    <div className="relative min-h-screen bg-[#0a0505] overflow-hidden">
      {/* Ambient glows */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 select-none">
        <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-red-700/15 blur-[120px]" />
        <div className="absolute -bottom-40 -right-16 w-[520px] h-[520px] rounded-full bg-orange-600/10 blur-[140px]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link
            href="/missions"
            className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Retour aux missions
          </Link>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            <span className="bg-gradient-to-r from-red-400 to-orange-300 bg-clip-text text-transparent">
              Historique des missions
            </span>
          </h1>
          <p className="text-sm text-white/40 mt-1">
            {logs.length} événement{logs.length !== 1 ? "s" : ""} · 300 derniers
          </p>
        </div>

        {/* Spam alert */}
        {hasSpam && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-500/10 ring-1 ring-red-500/30 text-sm text-red-300">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-5 h-5 shrink-0 mt-0.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <div>
              <span className="font-semibold">Comportement suspect détecté</span>
              <span className="text-red-400/70 ml-2">
                ({spamIds.size} entrée{spamIds.size !== 1 ? "s" : ""} suspecte{spamIds.size !== 1 ? "s" : ""} — mises en évidence en rouge)
              </span>
              <p className="text-red-400/60 text-xs mt-0.5">
                Un ou plusieurs utilisateurs ont effectué plusieurs cycles inscription/départ rapides sur la même mission.
              </p>
            </div>
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Créées (7j)", value: stats.created, cls: "text-red-300" },
            { label: "Inscriptions (7j)", value: stats.joined, cls: "text-green-300" },
            { label: "Départs (7j)", value: stats.left, cls: "text-orange-300" },
            { label: "Clôturées (7j)", value: stats.closed, cls: "text-white/60" },
          ].map(({ label, value, cls }) => (
            <div
              key={label}
              className="rounded-xl bg-white/[0.03] ring-1 ring-white/10 px-4 py-3 text-center"
            >
              <p className={`text-2xl font-bold ${cls}`}>{value}</p>
              <p className="text-xs text-white/40 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Top participants this week */}
        {stats.topParticipants.length > 0 && (
          <div className="rounded-xl bg-white/[0.025] ring-1 ring-white/10 px-5 py-4 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-white/40">
              Top inscriptions cette semaine
            </h2>
            <div className="flex flex-wrap gap-2">
              {stats.topParticipants.map(({ pseudo, count }) => (
                <span
                  key={pseudo}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/[0.05] ring-1 ring-white/10 text-white/70"
                >
                  {pseudo}
                  <span className="bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                    ×{count}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Log table */}
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-white/40 text-sm">Aucun événement enregistré pour le moment.</p>
            <p className="text-white/25 text-xs mt-1">
              Les événements apparaîtront ici dès la prochaine action sur une mission.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-white/[0.025] ring-1 ring-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left text-xs font-semibold uppercase tracking-wider text-white/30 px-4 py-3">
                      Date
                    </th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wider text-white/30 px-4 py-3">
                      Action
                    </th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wider text-white/30 px-4 py-3">
                      Utilisateur
                    </th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wider text-white/30 px-4 py-3">
                      Mission
                    </th>
                    <th className="text-left text-xs font-semibold uppercase tracking-wider text-white/30 px-4 py-3">
                      Détails
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {logs.map((log) => {
                    const isSpam = spamIds.has(log.id);
                    return (
                      <tr
                        key={log.id}
                        className={
                          isSpam
                            ? "bg-red-500/[0.07] hover:bg-red-500/[0.12] transition"
                            : "hover:bg-white/[0.02] transition"
                        }
                      >
                        {/* Date */}
                        <td className="px-4 py-3 text-white/40 whitespace-nowrap text-xs">
                          {isSpam && (
                            <svg
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.75"
                              className="w-3.5 h-3.5 text-red-400 inline mr-1.5 mb-0.5"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                              />
                            </svg>
                          )}
                          {formatDate(log.cree_le)}
                        </td>

                        {/* Action */}
                        <td className="px-4 py-3">
                          <ActionBadge action={log.action} />
                        </td>

                        {/* User */}
                        <td className="px-4 py-3 text-white/70 font-medium whitespace-nowrap">
                          {log.utilisateur_pseudo ?? (
                            <span className="text-white/25 italic">Inconnu</span>
                          )}
                        </td>

                        {/* Mission */}
                        <td className="px-4 py-3 max-w-[220px]">
                          {log.mission_id ? (
                            <Link
                              href={`/missions/${log.mission_id}`}
                              className="text-red-300/80 hover:text-red-200 truncate block transition text-xs"
                            >
                              {log.mission_titre ?? log.mission_id}
                            </Link>
                          ) : (
                            <span className="text-white/25 italic text-xs">
                              {log.mission_titre ?? "Supprimée"}
                            </span>
                          )}
                        </td>

                        {/* Details */}
                        <td className="px-4 py-3 text-white/35 text-xs whitespace-nowrap">
                          {log.action === "creation" && (
                            <span>
                              {(log.details as { points_recompense?: number }).points_recompense ?? 0} pts
                              {(log.details as { capacite?: number | null }).capacite
                                ? ` · ${(log.details as { capacite: number }).capacite} places`
                                : " · illimité"}
                            </span>
                          )}
                          {(log.action === "participation" || log.action === "depart") && (
                            <span>
                              {(log.details as { points_recompense?: number }).points_recompense ?? 0} pts / pers.
                            </span>
                          )}
                          {log.action === "terminee" && (
                            <span>
                              {(log.details as { nb_participants?: number }).nb_participants ?? 0} participants
                              {" · "}
                              {(log.details as { total_points?: number }).total_points ?? 0} pts distribués
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
