"use client";

import { useTransition, useState } from "react";
import Image from "next/image";
import { modifierPoints } from "@/app/(dashboard)/administration/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EscouadeLeaderboard {
  id: string;
  nom: string;
  points: number;
  url_logo: string | null;
}

interface Props {
  escouadesInitiales: EscouadeLeaderboard[];
}

// ─── Couleurs du podium ───────────────────────────────────────────────────────

const PODIUM_STYLES: Record<number, { ring: string; badge: string; label: string }> = {
  0: {
    ring: "ring-2 ring-amber-400/60",
    badge: "bg-amber-400/20 text-amber-300 border border-amber-400/30",
    label: "1er",
  },
  1: {
    ring: "ring-2 ring-slate-400/50",
    badge: "bg-slate-400/20 text-slate-300 border border-slate-400/30",
    label: "2ème",
  },
  2: {
    ring: "ring-2 ring-amber-700/50",
    badge: "bg-amber-700/20 text-amber-600 border border-amber-700/30",
    label: "3ème",
  },
};

// ─── Composant principal ──────────────────────────────────────────────────────

export function LeaderboardProfesseur({ escouadesInitiales }: Props) {
  // Copie locale triée pour mise à jour optimiste sans rechargement de page
  const [escouades, setEscouades] = useState<EscouadeLeaderboard[]>(() =>
    [...escouadesInitiales].sort((a, b) => b.points - a.points)
  );

  // Notifications d'erreur par escouade
  const [erreurs, setErreurs] = useState<Record<string, string>>({});

  // isPending nous permet de désactiver les boutons pendant la transition
  const [isPending, startTransition] = useTransition();

  // ── Gestionnaire de modification de points ──────────────────────────────
  function handleModifierPoints(escouadeId: string, delta: number) {
    // Mise à jour optimiste : on applique le delta avant la réponse serveur
    setEscouades((prev) => {
      const updated = prev.map((e) =>
        e.id === escouadeId ? { ...e, points: e.points + delta } : e
      );
      return [...updated].sort((a, b) => b.points - a.points);
    });

    startTransition(async () => {
      const result = await modifierPoints(escouadeId, delta);

      if (!result.success) {
        // Annuler la mise à jour optimiste en cas d'erreur
        setEscouades((prev) => {
          const reverted = prev.map((e) =>
            e.id === escouadeId ? { ...e, points: e.points - delta } : e
          );
          return [...reverted].sort((a, b) => b.points - a.points);
        });
        setErreurs((prev) => ({ ...prev, [escouadeId]: result.error }));
        // Effacer l'erreur après 4 secondes
        setTimeout(
          () => setErreurs((prev) => ({ ...prev, [escouadeId]: "" })),
          4000
        );
      } else {
        // Synchroniser avec la valeur réelle renvoyée par le serveur
        setEscouades((prev) => {
          const synced = prev.map((e) =>
            e.id === escouadeId
              ? { ...e, points: result.nouveauxPoints }
              : e
          );
          return [...synced].sort((a, b) => b.points - a.points);
        });
        setErreurs((prev) => ({ ...prev, [escouadeId]: "" }));
      }
    });
  }

  // ── Rendu ───────────────────────────────────────────────────────────────
  if (escouades.length === 0) {
    return (
      <p className="text-center text-white/40 py-16 text-sm">
        Aucune escouade n&apos;a encore été créée.
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {escouades.map((escouade, index) => {
        const podium = PODIUM_STYLES[index];
        const erreur = erreurs[escouade.id];

        return (
          <li key={escouade.id}>
            <Card
              className={[
                "transition-all duration-300",
                podium ? podium.ring : "ring-1 ring-white/5",
              ].join(" ")}
            >
              <CardContent className="flex items-center gap-4 p-4">
                {/* ── Rang ─────────────────────────────────────────── */}
                <div className="flex-shrink-0 w-10 text-center">
                  {podium ? (
                    <span
                      className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold ${podium.badge}`}
                    >
                      {podium.label}
                    </span>
                  ) : (
                    <span className="text-white/30 text-sm font-mono">
                      {index + 1}
                    </span>
                  )}
                </div>

                {/* ── Logo ─────────────────────────────────────────── */}
                <div className="flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden bg-white/5 ring-1 ring-white/10 flex items-center justify-center">
                  {escouade.url_logo ? (
                    <Image
                      src={escouade.url_logo}
                      alt={`Logo de ${escouade.nom}`}
                      width={40}
                      height={40}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      className="w-5 h-5 text-white/20"
                    >
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  )}
                </div>

                {/* ── Nom & erreur ──────────────────────────────────── */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">{escouade.nom}</p>
                  {erreur && (
                    <p className="text-xs text-red-400 mt-0.5 animate-fade-in">
                      {erreur}
                    </p>
                  )}
                </div>

                {/* ── Points & contrôles ────────────────────────────── */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  {/* Bouton – */}
                  <Button
                    variant="outline"
                    size="icon"
                    title="Retirer 10 points"
                    disabled={isPending}
                    onClick={() => handleModifierPoints(escouade.id, -10)}
                    className="h-8 w-8 text-red-400 hover:text-red-300 hover:border-red-500/40 hover:bg-red-500/10 border-white/10"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      className="w-4 h-4"
                    >
                      <path d="M5 12h14" />
                    </svg>
                    <span className="sr-only">Retirer 10 points</span>
                  </Button>

                  {/* Compteur de points */}
                  <div className="min-w-[72px] text-center">
                    <span
                      className={[
                        "tabular-nums font-bold text-lg",
                        escouade.points > 0
                          ? "text-red-300"
                          : escouade.points < 0
                          ? "text-red-400"
                          : "text-white/40",
                      ].join(" ")}
                    >
                      {escouade.points > 0 ? "+" : ""}
                      {escouade.points.toLocaleString("fr-FR")}
                    </span>
                    <p className="text-[10px] text-white/30 font-medium uppercase tracking-widest">
                      pts escouade
                    </p>
                  </div>

                  {/* Bouton + */}
                  <Button
                    variant="outline"
                    size="icon"
                    title="Ajouter 10 points"
                    disabled={isPending}
                    onClick={() => handleModifierPoints(escouade.id, +10)}
                    className="h-8 w-8 text-emerald-400 hover:text-emerald-300 hover:border-emerald-500/40 hover:bg-emerald-500/10 border-white/10"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      className="w-4 h-4"
                    >
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    <span className="sr-only">Ajouter 10 points</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </li>
        );
      })}
    </ol>
  );
}
