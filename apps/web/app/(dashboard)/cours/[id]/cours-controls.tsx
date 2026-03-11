"use client";

import { useState, useTransition } from "react";
import {
  toggleCoursParticipation,
  terminerCours,
  annulerCours,
  supprimerCours,
} from "@/app/(dashboard)/cours/actions";
import type { CoursRow } from "@/app/(dashboard)/cours/actions";
import { useRouter } from "next/navigation";
import CoursEditForm from "@/components/shared/cours-edit-form";

// ─── Edit Cours button ────────────────────────────────────────────────────────

type EditButtonProps = {
  cours: CoursRow;
};

export function EditCoursButton({ cours }: EditButtonProps) {
  const [showForm, setShowForm] = useState(false);
  const router = useRouter();

  return (
    <>
      <button
        onClick={() => setShowForm(true)}
        className="w-full py-2.5 rounded-xl text-sm font-medium transition ring-1 bg-purple-600/15 ring-purple-500/30 text-purple-300 hover:bg-purple-600/25 flex items-center justify-center gap-2"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
        </svg>
        Modifier le cours
      </button>
      {showForm && (
        <CoursEditForm
          cours={cours}
          onClose={() => setShowForm(false)}
          onSuccess={() => {
            setShowForm(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

// ─── Join / Leave button ──────────────────────────────────────────────────────

type JoinButtonProps = {
  coursId: string;
  isRegistered: boolean;
  isFull: boolean;
  isActive: boolean;
};

export function CoursJoinButton({
  coursId,
  isRegistered,
  isFull,
  isActive,
}: JoinButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [localRegistered, setLocalRegistered] = useState(isRegistered);
  const router = useRouter();

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await toggleCoursParticipation(coursId);
      if (result.success) {
        setLocalRegistered((prev) => !prev);
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  if (!isActive) return null;

  const disabled = isPending || (isFull && !localRegistered);

  return (
    <div className="space-y-2">
      <button
        onClick={handleClick}
        disabled={disabled}
        className={`w-full py-3 rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2 ${
          localRegistered
            ? "bg-red-600/20 ring-1 ring-red-500/40 text-red-300 hover:bg-red-600/30"
            : isFull
            ? "bg-white/[0.03] ring-1 ring-white/10 text-white/40 cursor-not-allowed"
            : "bg-purple-600 hover:bg-purple-500 text-white"
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
          "Se désinscrire du cours"
        ) : isFull ? (
          "Cours complet"
        ) : (
          "📚 S'inscrire au cours"
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
  coursId: string;
  presentCount: number;
};

export function CoursCreatorControls({ coursId, presentCount }: CreatorControlsProps) {
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
          ? await terminerCours(coursId)
          : await annulerCours(coursId);

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
      {presentCount < 5 && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-500/8 ring-1 ring-amber-500/20 text-xs text-amber-300/80">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 shrink-0 mt-0.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <span>{presentCount}/5 présents — Il faut au moins 5 présents pour valider le cours.</span>
        </div>
      )}
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
            : "Annuler le cours"}
        </button>
      </div>
    </div>
  );
}

// ─── Delete button ────────────────────────────────────────────────────────────

type DeleteButtonProps = {
  coursId: string;
};

export function CoursDeleteButton({ coursId }: DeleteButtonProps) {
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
      const result = await supprimerCours(coursId);
      if (result.success) {
        router.push("/cours");
        router.refresh();
      } else {
        setError(result.error);
        setConfirm(false);
      }
    });
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-xs text-red-400 text-center">{error}</p>}
      <button
        onClick={handleDelete}
        disabled={isPending}
        className={`w-full py-2 rounded-xl text-sm font-medium transition ring-1 disabled:opacity-50 ${
          confirm
            ? "bg-red-600 ring-red-500 text-white hover:bg-red-500"
            : "bg-red-600/10 ring-red-500/20 text-red-400/60 hover:text-red-300"
        }`}
      >
        {isPending
          ? "Suppression…"
          : confirm
          ? "✓ Confirmer la suppression"
          : "Supprimer le cours"}
      </button>
    </div>
  );
}
