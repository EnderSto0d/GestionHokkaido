"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type Toast = {
  id: string;
  escouadeNom: string;
};

export function InvitationToastListener({ userId }: { userId: string }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const router = useRouter();

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("invitation-notifs")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "invitations_escouade",
          filter: `utilisateur_id=eq.${userId}`,
        },
        async (payload) => {
          const row = payload.new as {
            id: string;
            escouade_id: string;
            statut: string;
          };

          if (row.statut !== "en_attente") return;

          // Fetch escouade name
          const { data: escouade } = await supabase
            .from("escouades")
            .select("nom")
            .eq("id", row.escouade_id)
            .single();

          const newToast: Toast = {
            id: row.id,
            escouadeNom: (escouade as { nom: string } | null)?.nom ?? "une escouade",
          };

          setToasts((prev) => [newToast, ...prev]);

          // Auto-dismiss after 8 seconds
          setTimeout(() => dismiss(newToast.id), 8000);

          // Refresh server data (for badge count + profil page)
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, dismiss, router]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto animate-toast-in flex items-start gap-3 p-4 rounded-xl bg-[#0a1628]/95 backdrop-blur-xl ring-1 ring-amber-400/20 shadow-lg shadow-amber-500/5"
        >
          {/* Icon */}
          <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-amber-500/10 ring-1 ring-amber-400/20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4 text-amber-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-300">Nouvelle invitation</p>
            <p className="text-xs text-white/50 mt-0.5 truncate">
              <span className="text-white/70 font-medium">{toast.escouadeNom}</span> vous invite à rejoindre leur escouade
            </p>
          </div>

          {/* Close button */}
          <button
            onClick={() => dismiss(toast.id)}
            className="flex-shrink-0 p-1 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
