"use client";

import { useState, useTransition } from "react";
import { accepterInvitation, refuserInvitation } from "@/app/(dashboard)/invitations/actions";
import { useRouter } from "next/navigation";

type InvitationCardProps = {
  invitationId: string;
  escouadeNom: string;
  escouadeLogo: string | null;
  personnageNom: string;
};

export function InvitationActionCard({
  invitationId,
  escouadeNom,
  escouadeLogo,
  personnageNom,
}: InvitationCardProps) {
  const [isPending, startTransition] = useTransition();
  const [done, setDone] = useState<"accepted" | "refused" | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const router = useRouter();

  function handleAction(action: "accept" | "refuse") {
    setErreur(null);
    startTransition(async () => {
      const result =
        action === "accept"
          ? await accepterInvitation(invitationId)
          : await refuserInvitation(invitationId);

      if (result.success) {
        setDone(action === "accept" ? "accepted" : "refused");
        setTimeout(() => router.refresh(), 800);
      } else {
        setErreur(result.error);
      }
    });
  }

  if (done === "accepted") {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/5 ring-1 ring-emerald-500/15 animate-fade-in">
        <span className="text-emerald-400 text-sm font-medium">
          ✅ Invitation acceptée — vous avez rejoint {escouadeNom}
        </span>
      </div>
    );
  }

  if (done === "refused") {
    return (
      <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.02] ring-1 ring-white/5 animate-fade-in opacity-50">
        <span className="text-white/40 text-sm">Invitation refusée.</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-amber-500/5 ring-1 ring-amber-400/15">
      <div className="flex items-center gap-3">
        {/* Logo escouade */}
        <div className="w-10 h-10 rounded-lg bg-red-500/10 ring-1 ring-red-400/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {escouadeLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={escouadeLogo} alt={escouadeNom} className="object-cover w-full h-full" />
          ) : (
            <span className="text-sm font-bold text-red-300 uppercase">
              {escouadeNom.charAt(0)}
            </span>
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-white">{escouadeNom}</p>
          <p className="text-xs text-white/40">Personnage invité : {personnageNom}</p>
          {erreur && (
            <p className="text-xs text-red-400 mt-1">{erreur}</p>
          )}
        </div>
      </div>

      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => handleAction("refuse")}
          disabled={isPending}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-500/10 text-red-400 ring-1 ring-red-500/20 hover:bg-red-500/20 transition-colors disabled:opacity-50"
        >
          {isPending ? "…" : "Refuser"}
        </button>
        <button
          onClick={() => handleAction("accept")}
          disabled={isPending}
          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
        >
          {isPending ? "…" : "Accepter"}
        </button>
      </div>
    </div>
  );
}
