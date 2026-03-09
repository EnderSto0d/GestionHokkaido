"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { transfererPropriete } from "@/app/(dashboard)/escouades/[id]/actions";
import {
  personnaliserEscouade,
  quitterEscouade,
  type EscouadeCustomData,
  type PhotoSettings,
  type PhotoSetting,
} from "@/app/(dashboard)/escouades/[id]/customisation-actions";
import { deleteSquadAndDiscordRole } from "@/app/(dashboard)/escouades/actions";
import { creerInvitation } from "@/app/(dashboard)/invitations/actions";
import { getHautsFaits, type HautFaitRow } from "@/app/(dashboard)/evaluation/actions";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Membre = {
  role_escouade: "chef" | "membre";
  utilisateur: {
    id: string;
    pseudo: string;
    display_name: string | null;
  };
};

export type EscouadeDetailProps = {
  escouade: {
    id: string;
    nom: string;
    description: string | null;
    url_logo: string | null;
    url_banniere: string | null;
    url_photo_1: string | null;
    url_photo_2: string | null;
    url_photo_3: string | null;
    photo_settings: PhotoSettings | null;
    points: number;
    proprietaire_id: string;
  };
  membres: Membre[];
  /** UUID de l'utilisateur courant (auth.uid), null si non connecté */
  utilisateurCourantId: string | null;
  utilisateursInvitables: { id: string; pseudo: string }[];
  estMembreCourant: boolean;
  /** L'utilisateur courant est admin + Directeur/Co-Directeur */
  estAdminDirecteur?: boolean;
};

// ─── Composant principal ──────────────────────────────────────────────────────

export function EscouadeDetail({
  escouade,
  membres,
  utilisateurCourantId,
  utilisateursInvitables,
  estMembreCourant,
  estAdminDirecteur = false,
}: EscouadeDetailProps) {
  const estProprietaire = utilisateurCourantId === escouade.proprietaire_id;
  const estMembre = estMembreCourant && !estProprietaire;

  const membresEligibles = membres.filter(
    (m) => m.utilisateur.id !== utilisateurCourantId
  );

  const [modal, setModal] = useState<
    "transfert" | "personnaliser" | "inviter" | "supprimer" | "quitter" | null
  >(null);

  const photos = [escouade.url_photo_1, escouade.url_photo_2, escouade.url_photo_3].filter(Boolean) as string[];
  const photoKeys: (keyof PhotoSettings)[] = ["photo_1", "photo_2", "photo_3"];
  const photoSettings = escouade.photo_settings ?? {};

  // ── Hauts faits ──────────────────────────────────────────────────────
  const [hautsFaits, setHautsFaits] = useState<HautFaitRow[]>([]);
  const [loadingHf, setLoadingHf] = useState(true);

  const loadHautsFaits = useCallback(async () => {
    setLoadingHf(true);
    const hf = await getHautsFaits(escouade.id);
    setHautsFaits(hf);
    setLoadingHf(false);
  }, [escouade.id]);

  useEffect(() => {
    loadHautsFaits();
  }, [loadHautsFaits]);

  return (
    <div className="relative min-h-screen bg-[#0a0505] overflow-hidden pb-16">
      {/* ── Arrière-plan ambiant ─────────────────────────────────────────── */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 select-none"
      >
        <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-red-700/15 blur-[120px] animate-cursed-glow" />
        <div className="absolute -bottom-40 -right-16 w-[520px] h-[520px] rounded-full bg-orange-600/10 blur-[140px] animate-cursed-glow" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-red-900/10 blur-[100px]" />
      </div>

      {/* ── Texture bruit ────────────────────────────────────────────────── */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundRepeat: "repeat",
          backgroundSize: "160px",
        }}
      />

      {/* ── Bannière ────────────────────────────────────────────────────── */}
      <div className="relative w-full h-48 sm:h-64 overflow-hidden">
        {escouade.url_banniere ? (
          <img
            src={escouade.url_banniere}
            alt={`Bannière de ${escouade.nom}`}
            className="absolute inset-0 w-full h-full object-cover"
            loading="eager"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-red-900/40 via-red-900/20 to-[#0a0505]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0505] via-[#0a0505]/60 to-transparent" />
      </div>

      {/* ── Contenu ──────────────────────────────────────────────────────── */}
      <div className="relative z-10 mx-auto max-w-4xl px-4 -mt-20 sm:px-6 lg:px-8 space-y-8 animate-fade-in">

        {/* Fil d'Ariane + lien liste */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-white/25 uppercase tracking-widest font-medium">
            École d&apos;Exorcisme de Hokkaido&nbsp;&nbsp;/&nbsp;&nbsp;Escouades
          </p>
          <Link
            href="/escouades?list"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/[0.04] ring-1 ring-white/10 hover:ring-red-500/30 hover:bg-white/[0.07] text-xs font-medium text-white/60 hover:text-red-300 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M6 4.75A.75.75 0 0 1 6.75 4h10.5a.75.75 0 0 1 0 1.5H6.75A.75.75 0 0 1 6 4.75ZM6 10a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H6.75A.75.75 0 0 1 6 10Zm0 5.25a.75.75 0 0 1 .75-.75h10.5a.75.75 0 0 1 0 1.5H6.75a.75.75 0 0 1-.75-.75ZM1.99 4.75a1 1 0 0 1 1-1h.01a1 1 0 0 1 0 2h-.01a1 1 0 0 1-1-1Zm1 5.25a1 1 0 0 0-1 1v.01a1 1 0 0 0 2 0V11a1 1 0 0 0-1-1Zm-1 6.25a1 1 0 0 1 1-1h.01a1 1 0 0 1 0 2h-.01a1 1 0 0 1-1-1Z" clipRule="evenodd" />
            </svg>
            Toutes les escouades
          </Link>
        </div>

        {/* ── En-tête escouade ─────────────────────────────────────────── */}
        <header className="flex flex-col sm:flex-row items-start gap-6">
          <div className="relative flex-shrink-0 -mt-2">
            <div className="absolute inset-0 rounded-2xl bg-red-500/25 blur-xl" />
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden ring-2 ring-red-500/40 bg-[#081020] flex items-center justify-center shadow-2xl">
              {escouade.url_logo ? (
                <img
                  src={escouade.url_logo}
                  alt={`Logo de ${escouade.nom}`}
                  className="absolute inset-0 w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <ShieldIcon />
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0 pt-2">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                <span className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
                  {escouade.nom}
                </span>
              </h1>
              {estProprietaire && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/20 uppercase tracking-wide">
                  Propriétaire
                </span>
              )}
            </div>

            {escouade.description && (
              <p className="text-sm text-white/50 max-w-2xl leading-relaxed mb-3">
                {escouade.description}
              </p>
            )}

            <div className="flex items-center gap-3 flex-wrap">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 ring-1 ring-red-400/20">
                <StarIcon />
                <span className="text-sm font-semibold text-red-300 font-mono">
                  {escouade.points.toLocaleString("fr-FR")} pts d&apos;escouade
                </span>
              </div>
              <span className="text-xs text-white/30">
                {membres.length} membre{membres.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        </header>

        <div className="h-px bg-gradient-to-r from-red-500/30 via-white/10 to-transparent" />

        {/* ── Actions ─────────────────────────────────────────────────── */}
        {(estProprietaire || estMembre || estAdminDirecteur) && (
          <section className="flex flex-wrap gap-2">
            {estProprietaire && (
              <>
                <ActionBtn onClick={() => setModal("personnaliser")} variant="blue" icon={<EditIcon />}>
                  Personnaliser
                </ActionBtn>
                {utilisateursInvitables.length > 0 && (
                  <ActionBtn onClick={() => setModal("inviter")} variant="sky" icon={<UserPlusIcon />}>
                    Inviter
                  </ActionBtn>
                )}
                {membresEligibles.length > 0 && (
                  <ActionBtn onClick={() => setModal("transfert")} variant="amber" icon={<ArrowSwapIcon />}>
                    Transférer
                  </ActionBtn>
                )}
                <ActionBtn onClick={() => setModal("supprimer")} variant="red" icon={<TrashIcon />}>
                  Supprimer
                </ActionBtn>
              </>
            )}
            {!estProprietaire && estAdminDirecteur && (
              <ActionBtn onClick={() => setModal("supprimer")} variant="red" icon={<TrashIcon />}>
                Supprimer (Admin)
              </ActionBtn>
            )}
            {estMembre && !estAdminDirecteur && (
              <ActionBtn onClick={() => setModal("quitter")} variant="red" icon={<LogoutIcon />}>
                Quitter l&apos;escouade
              </ActionBtn>
            )}
            {estMembre && estAdminDirecteur && (
              <>
                <ActionBtn onClick={() => setModal("quitter")} variant="red" icon={<LogoutIcon />}>
                  Quitter l&apos;escouade
                </ActionBtn>
                <ActionBtn onClick={() => setModal("supprimer")} variant="red" icon={<TrashIcon />}>
                  Supprimer (Admin)
                </ActionBtn>
              </>
            )}
          </section>
        )}

        {/* ── Galerie photos ───────────────────────────────────────────── */}
        {photos.length > 0 && (
          <section>
            <h2 className="text-xs text-white/30 uppercase tracking-widest font-medium mb-4">
              Galerie
            </h2>
            <div className={`grid gap-3 ${photos.length === 1 ? "" : photos.length === 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
              {[escouade.url_photo_1, escouade.url_photo_2, escouade.url_photo_3].map((url, i) => {
                if (!url) return null;
                const key = photoKeys[i];
                const s = photoSettings[key];
                const scale = s?.scale ?? 100;
                const posX = s?.posX ?? 50;
                const posY = s?.posY ?? 50;
                return (
                  <div key={i} className="relative aspect-video rounded-xl overflow-hidden ring-1 ring-white/10 bg-white/5">
                    <img
                      src={url}
                      alt={`Photo ${i + 1} de ${escouade.nom}`}
                      className="absolute inset-0 w-full h-full object-cover"
                      style={{
                        objectPosition: `${posX}% ${posY}%`,
                        transform: scale !== 100 ? `scale(${scale / 100})` : undefined,
                      }}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Liste des membres ────────────────────────────────────────── */}
        <section>
          <h2 className="text-xs text-white/30 uppercase tracking-widest font-medium mb-4">
            Membres <span className="text-red-400">({membres.length})</span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {membres.length === 0 ? (
              <p className="text-white/30 text-sm col-span-2">
                Aucun membre dans cette escouade.
              </p>
            ) : (
              membres.map((m) => (
                <MembreCard
                  key={m.utilisateur.id}
                  membre={m}
                  estProprietaire={
                    m.utilisateur.id === escouade.proprietaire_id
                  }
                />
              ))
            )}
          </div>
        </section>

        {/* ── Hauts Faits (historique points) ──────────────────────────── */}
        <section>
          <h2 className="text-xs text-white/30 uppercase tracking-widest font-medium mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-amber-400/50">
              <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clipRule="evenodd" />
            </svg>
            Hauts Faits
          </h2>

          {loadingHf ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
            </div>
          ) : hautsFaits.length === 0 ? (
            <div className="rounded-xl bg-white/[0.02] ring-1 ring-white/5 p-6 text-center">
              <p className="text-sm text-white/25">Aucun haut fait enregistré pour cette escouade.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {hautsFaits.map((hf) => (
                <div
                  key={hf.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] ring-1 ring-white/5"
                >
                  <div className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold ${
                    hf.points > 0
                      ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/20"
                      : "bg-red-500/15 text-red-300 ring-1 ring-red-400/20"
                  }`}>
                    {hf.points > 0 ? `+${hf.points}` : hf.points}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/80">{hf.raison}</p>
                    <p className="text-[10px] text-white/25 mt-1">
                      par {hf.attribue_par_pseudo} · {new Date(hf.cree_le).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── Modals ───────────────────────────────────────────────────────── */}
      {modal === "transfert" && (
        <ModalTransfert
          escouadeId={escouade.id}
          membresEligibles={membresEligibles}
          onFermer={() => setModal(null)}
        />
      )}
      {modal === "personnaliser" && (
        <ModalPersonnaliser
          escouade={escouade}
          onFermer={() => setModal(null)}
        />
      )}
      {modal === "inviter" && (
        <ModalInviter
          escouadeId={escouade.id}
          utilisateursInvitables={utilisateursInvitables}
          onFermer={() => setModal(null)}
        />
      )}
      {modal === "supprimer" && (
        <ModalSupprimer
          escouadeId={escouade.id}
          escouadeNom={escouade.nom}
          onFermer={() => setModal(null)}
        />
      )}
      {modal === "quitter" && estMembreCourant && (
        <ModalQuitter
          escouadeId={escouade.id}
          escouadeNom={escouade.nom}
          onFermer={() => setModal(null)}
        />
      )}
    </div>
  );
}

// ─── Action Button ────────────────────────────────────────────────────────────

function ActionBtn({
  children,
  onClick,
  variant,
  icon,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant: "blue" | "sky" | "amber" | "red";
  icon?: React.ReactNode;
}) {
  const styles = {
    blue: "bg-red-500/10 text-red-300 ring-red-400/20 hover:bg-red-500/20",
    sky: "bg-red-500/10 text-orange-300 ring-orange-400/20 hover:bg-red-500/20",
    amber: "bg-amber-500/10 text-amber-300 ring-amber-400/20 hover:bg-amber-500/20",
    red: "bg-red-500/10 text-red-400 ring-red-500/20 hover:bg-red-500/20",
  };
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ring-1 transition-all ${styles[variant]}`}
    >
      {icon}
      {children}
    </button>
  );
}

// ─── Carte membre ─────────────────────────────────────────────────────────────

function MembreCard({ membre, estProprietaire }: { membre: Membre; estProprietaire: boolean }) {
  const displayName = membre.utilisateur.display_name ?? membre.utilisateur.pseudo;
  const roleLabel = membre.role_escouade === "chef" ? "Chef" : "Membre";

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ring-1 transition-colors ${estProprietaire ? "bg-amber-500/5 ring-amber-400/15" : "bg-white/[0.03] ring-white/8 hover:bg-white/[0.055]"}`}>
      <div className={`flex-shrink-0 w-9 h-9 rounded-full ring-1 flex items-center justify-center text-sm font-bold uppercase select-none ${estProprietaire ? "bg-amber-500/20 text-amber-300 ring-amber-400/25" : "bg-gradient-to-br from-red-600/40 to-red-700/30 ring-white/10 text-red-300"}`}>
        {displayName.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white/90 truncate">{displayName}</p>
        <p className="text-xs text-white/35 truncate">@{membre.utilisateur.pseudo}</p>
      </div>
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {estProprietaire && (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-500/15 text-amber-300 ring-1 ring-amber-400/20 uppercase tracking-wide">
            👑
          </span>
        )}
        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide ring-1 ${membre.role_escouade === "chef" ? "bg-red-500/15 text-red-300 ring-red-400/20" : "bg-white/5 text-white/40 ring-white/10"}`}>
          {roleLabel}
        </span>
      </div>
    </div>
  );
}

// ─── Modal Personnaliser ──────────────────────────────────────────────────────

function ModalPersonnaliser({
  escouade,
  onFermer,
}: {
  escouade: EscouadeDetailProps["escouade"];
  onFermer: () => void;
}) {
  const defaultSetting: PhotoSetting = { scale: 100, posX: 50, posY: 50 };
  const initialSettings: PhotoSettings = escouade.photo_settings ?? {};

  const [data, setData] = useState<EscouadeCustomData>({
    description: escouade.description ?? "",
    url_logo: escouade.url_logo ?? "",
    url_banniere: escouade.url_banniere ?? "",
    url_photo_1: escouade.url_photo_1 ?? "",
    url_photo_2: escouade.url_photo_2 ?? "",
    url_photo_3: escouade.url_photo_3 ?? "",
    photo_settings: {
      photo_1: { ...defaultSetting, ...initialSettings.photo_1 },
      photo_2: { ...defaultSetting, ...initialSettings.photo_2 },
      photo_3: { ...defaultSetting, ...initialSettings.photo_3 },
    },
  });
  const [isPending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);
  const router = useRouter();

  function updatePhotoSetting(photo: keyof PhotoSettings, field: keyof PhotoSetting, value: number) {
    setData((d) => ({
      ...d,
      photo_settings: {
        ...d.photo_settings,
        [photo]: {
          ...defaultSetting,
          ...d.photo_settings?.[photo],
          [field]: value,
        },
      },
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    startTransition(async () => {
      const payload: EscouadeCustomData = {
        description: data.description || null,
        url_logo: data.url_logo || null,
        url_banniere: data.url_banniere || null,
        url_photo_1: data.url_photo_1 || null,
        url_photo_2: data.url_photo_2 || null,
        url_photo_3: data.url_photo_3 || null,
        photo_settings: data.photo_settings,
      };
      const result = await personnaliserEscouade(escouade.id, payload);
      if (result.success) {
        setSucces(true);
        setTimeout(() => { router.refresh(); onFermer(); }, 900);
      } else {
        setErreur(result.error);
      }
    });
  }

  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onFermer();
  }

  const photoFields: { key: keyof PhotoSettings; label: string; urlKey: keyof EscouadeCustomData }[] = [
    { key: "photo_1", label: "Photo 1", urlKey: "url_photo_1" },
    { key: "photo_2", label: "Photo 2", urlKey: "url_photo_2" },
    { key: "photo_3", label: "Photo 3", urlKey: "url_photo_3" },
  ];

  return (
    <ModalWrapper onBackdrop={handleBackdrop}>
      <div className="h-px w-full bg-gradient-to-r from-red-500/0 via-red-500/60 to-red-500/0" />
      <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
        <ModalHeader titre="Personnaliser l'escouade" description="Modifiez l'apparence et les informations de votre escouade." onFermer={onFermer} />
        {succes ? (
          <SuccesMsg message="Escouade mise à jour !" />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <FieldTextarea label="Description" value={data.description ?? ""} onChange={(v) => setData((d) => ({ ...d, description: v }))} placeholder="Décrivez votre escouade…" rows={3} />
            <FieldInput label="URL du logo" value={data.url_logo ?? ""} onChange={(v) => setData((d) => ({ ...d, url_logo: v }))} placeholder="https://…" />
            <FieldInput label="URL de la bannière" value={data.url_banniere ?? ""} onChange={(v) => setData((d) => ({ ...d, url_banniere: v }))} placeholder="https://…" />

            {photoFields.map(({ key, label, urlKey }) => {
              const url = (data[urlKey] as string) ?? "";
              const s = data.photo_settings?.[key] ?? defaultSetting;
              return (
                <div key={key} className="space-y-2 rounded-xl bg-white/[0.02] ring-1 ring-white/8 p-3">
                  <FieldInput label={label} value={url} onChange={(v) => setData((d) => ({ ...d, [urlKey]: v }))} placeholder="https://…" />
                  {url && (
                    <>
                      {/* Preview */}
                      <div className="relative aspect-video rounded-lg overflow-hidden ring-1 ring-white/10 bg-white/5">
                        <img
                          src={url}
                          alt={`Aperçu ${label}`}
                          className="absolute inset-0 w-full h-full object-cover"
                          style={{
                            objectPosition: `${s.posX}% ${s.posY}%`,
                            transform: s.scale !== 100 ? `scale(${s.scale / 100})` : undefined,
                          }}
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      {/* Controls */}
                      <FieldSlider label="Zoom" value={s.scale} min={50} max={200} onChange={(v) => updatePhotoSetting(key, "scale", v)} suffix="%" />
                      <FieldSlider label="Position X" value={s.posX} min={0} max={100} onChange={(v) => updatePhotoSetting(key, "posX", v)} suffix="%" />
                      <FieldSlider label="Position Y" value={s.posY} min={0} max={100} onChange={(v) => updatePhotoSetting(key, "posY", v)} suffix="%" />
                    </>
                  )}
                </div>
              );
            })}

            {erreur && <ErreurMsg message={erreur} />}
            <ModalActions onFermer={onFermer} isPending={isPending} labelConfirmer="Enregistrer" />
          </form>
        )}
      </div>
    </ModalWrapper>
  );
}

// ─── Modal Inviter ────────────────────────────────────────────────────────────

function ModalInviter({
  escouadeId,
  utilisateursInvitables,
  onFermer,
}: {
  escouadeId: string;
  utilisateursInvitables: { id: string; pseudo: string }[];
  onFermer: () => void;
}) {
  const [selectedId, setSelectedId] = useState("");
  const [recherche, setRecherche] = useState("");
  const [isPending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);

  const filtres = utilisateursInvitables.filter((u) =>
    u.pseudo.toLowerCase().includes(recherche.toLowerCase())
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setErreur(null);
    startTransition(async () => {
      const result = await creerInvitation(escouadeId, selectedId);
      if (result.success) {
        setSucces(true);
        setTimeout(onFermer, 1200);
      } else {
        setErreur(result.error);
      }
    });
  }

  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onFermer();
  }

  return (
    <ModalWrapper onBackdrop={handleBackdrop}>
      <div className="h-px w-full bg-gradient-to-r from-red-500/0 via-red-500/50 to-red-500/0" />
      <div className="p-6 space-y-5">
        <ModalHeader titre="Inviter un utilisateur" description="Envoyez une invitation à un utilisateur pour rejoindre votre escouade." onFermer={onFermer} />
        {succes ? (
          <SuccesMsg message="Invitation envoyée !" />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Barre de recherche */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider">Rechercher un utilisateur</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <SearchIcon />
                </div>
                <input
                  type="text"
                  value={recherche}
                  onChange={(e) => { setRecherche(e.target.value); setSelectedId(""); }}
                  placeholder="Tapez un pseudo…"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/5 ring-1 ring-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:ring-orange-400/40 transition-all"
                  autoFocus
                />
              </div>
            </div>

            {/* Liste filtrée */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider">
                {recherche ? `Résultats (${filtres.length})` : `Tous les utilisateurs (${utilisateursInvitables.length})`}
              </label>
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1 scrollbar-thin">
                {filtres.length === 0 ? (
                  <p className="text-sm text-white/30 py-3 text-center">Aucun utilisateur trouvé.</p>
                ) : (
                  filtres.map((u) => {
                    const isSelected = selectedId === u.id;
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setSelectedId(u.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl ring-1 text-left transition-all ${
                          isSelected
                            ? "bg-red-500/15 ring-orange-400/30 text-white"
                            : "bg-white/[0.03] ring-white/8 text-white/60 hover:text-white/80 hover:bg-white/[0.055]"
                        }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold uppercase flex-shrink-0 ${
                            isSelected
                              ? "bg-red-500/30 text-orange-300"
                              : "bg-white/5 text-white/40"
                          }`}
                        >
                          {u.pseudo.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">@{u.pseudo}</p>
                        </div>
                        {isSelected && <CheckIcon />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {erreur && <ErreurMsg message={erreur} />}
            <ModalActions onFermer={onFermer} isPending={isPending || !selectedId} labelConfirmer="Envoyer l'invitation" />
          </form>
        )}
      </div>
    </ModalWrapper>
  );
}

// ─── Modal Supprimer ──────────────────────────────────────────────────────────

function ModalSupprimer({
  escouadeId,
  escouadeNom,
  onFermer,
}: {
  escouadeId: string;
  escouadeNom: string;
  onFermer: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const router = useRouter();

  const confirmationValide = confirmation.trim().toLowerCase() === escouadeNom.trim().toLowerCase();

  function handleConfirmer() {
    if (!confirmationValide) return;
    startTransition(async () => {
      const result = await deleteSquadAndDiscordRole(escouadeId);
      if (result.success) {
        router.push("/escouades");
      } else {
        setErreur(result.error);
      }
    });
  }

  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onFermer();
  }

  return (
    <ModalWrapper onBackdrop={handleBackdrop}>
      <div className="h-px w-full bg-gradient-to-r from-red-500/0 via-red-500/50 to-red-500/0" />
      <div className="p-6 space-y-5">
        <ModalHeader titre="Supprimer l'escouade" description="" onFermer={onFermer} />
        <div className="flex gap-3 p-3 rounded-xl bg-red-500/5 ring-1 ring-red-500/15 text-sm text-red-400">
          <WarningIcon />
          <span>Supprimer <strong>{escouadeNom}</strong> est irréversible. Tous les membres, invitations et le rôle Discord seront supprimés.</span>
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider">
            Tapez <strong className="text-red-400">{escouadeNom}</strong> pour confirmer
          </label>
          <input
            type="text"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder={escouadeNom}
            className="w-full px-3 py-2.5 rounded-xl bg-white/5 ring-1 ring-white/10 text-white text-sm placeholder:text-white/15 focus:outline-none focus:ring-red-400/40 transition-all"
            autoFocus
          />
        </div>
        {erreur && <ErreurMsg message={erreur} />}
        <div className="flex gap-3">
          <button type="button" onClick={onFermer} disabled={isPending} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white/50 ring-1 ring-white/10 hover:bg-white/5 transition-colors disabled:opacity-50">Annuler</button>
          <button type="button" onClick={handleConfirmer} disabled={isPending || !confirmationValide} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-500/20 text-red-400 ring-1 ring-red-500/30 hover:bg-red-500/30 transition-colors disabled:opacity-50">
            {isPending ? "Suppression…" : "Supprimer définitivement"}
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
}

// ─── Modal Quitter ────────────────────────────────────────────────────────────

function ModalQuitter({
  escouadeId,
  escouadeNom,
  onFermer,
}: {
  escouadeId: string;
  escouadeNom: string;
  onFermer: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const router = useRouter();

  function handleConfirmer() {
    startTransition(async () => {
      const result = await quitterEscouade(escouadeId);
      if (result.success) {
        router.push("/escouades");
      } else {
        setErreur(result.error);
      }
    });
  }

  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onFermer();
  }

  return (
    <ModalWrapper onBackdrop={handleBackdrop}>
      <div className="p-6 space-y-5">
        <ModalHeader titre="Quitter l'escouade" description="" onFermer={onFermer} />
        <p className="text-sm text-white/50">
          Êtes-vous sûr de vouloir quitter <strong className="text-white">{escouadeNom}</strong> ? Vous devrez être réinvité pour rejoindre à nouveau.
        </p>
        <div className="rounded-lg bg-red-500/10 ring-1 ring-red-500/25 px-4 py-3">
          <p className="text-xs font-semibold text-red-400 mb-1">⚠️ Pénalité de départ</p>
          <p className="text-xs text-red-300/70">
            Quitter une escouade entraîne une <strong className="text-red-300">pénalité sur les points d&apos;escouade</strong> (fraction déduite de la réserve). Vos points personnels sont conservés à 100%. Cette action est irréversible.
          </p>
        </div>
        {erreur && <ErreurMsg message={erreur} />}
        <div className="flex gap-3">
          <button type="button" onClick={onFermer} disabled={isPending} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white/50 ring-1 ring-white/10 hover:bg-white/5 transition-colors disabled:opacity-50">Annuler</button>
          <button type="button" onClick={handleConfirmer} disabled={isPending} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-500/20 text-red-400 ring-1 ring-red-500/30 hover:bg-red-500/30 transition-colors disabled:opacity-50">
            {isPending ? "En cours…" : "Quitter"}
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
}

// ─── Modal Transfert ──────────────────────────────────────────────────────────

function ModalTransfert({
  escouadeId,
  membresEligibles,
  onFermer,
}: {
  escouadeId: string;
  membresEligibles: Membre[];
  onFermer: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);
  const router = useRouter();

  function handleConfirmer() {
    if (!selectedId) { setErreur("Sélectionnez un membre."); return; }
    setErreur(null);
    startTransition(async () => {
      const result = await transfererPropriete(escouadeId, selectedId);
      if (result.success) {
        setSucces(true);
        setTimeout(() => { router.refresh(); onFermer(); }, 1200);
      } else {
        setErreur(result.error);
      }
    });
  }

  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onFermer();
  }

  return (
    <ModalWrapper onBackdrop={handleBackdrop}>
      <div className="h-px w-full bg-gradient-to-r from-amber-500/0 via-amber-500/50 to-amber-500/0" />
      <div className="p-6 space-y-5">
        <ModalHeader titre="Transférer la propriété" description="Cette action est irréversible." onFermer={onFermer} />
        {succes ? (
          <SuccesMsg message="Propriété transférée !" />
        ) : (
          <>
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {membresEligibles.map((m) => {
                const uid = m.utilisateur.id;
                const displayName = m.utilisateur.display_name ?? m.utilisateur.pseudo;
                const isSelected = selectedId === uid;
                return (
                  <button key={m.utilisateur.id} type="button" onClick={() => setSelectedId(uid)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl ring-1 text-left transition-all ${isSelected ? "bg-red-500/15 ring-red-400/30 text-white" : "bg-white/[0.03] ring-white/8 text-white/60 hover:text-white/80"}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold uppercase flex-shrink-0 ${isSelected ? "bg-red-500/30 text-red-300" : "bg-white/5 text-white/40"}`}>
                      {displayName.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{displayName}</p>
                      <p className="text-[11px] text-white/35">@{m.utilisateur.pseudo}</p>
                    </div>
                    {isSelected && <CheckIcon />}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2 p-3 rounded-lg bg-amber-500/5 ring-1 ring-amber-400/15 text-xs text-amber-300/80">
              <WarningIcon />
              <span>Vous perdrez tous les droits sur cette escouade après le transfert.</span>
            </div>
            {erreur && <ErreurMsg message={erreur} />}
            <div className="flex gap-3">
              <button type="button" onClick={onFermer} disabled={isPending} className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold text-white/50 ring-1 ring-white/10 hover:bg-white/5 transition-colors disabled:opacity-50">Annuler</button>
              <button type="button" onClick={handleConfirmer} disabled={isPending || !selectedId || succes} className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold bg-amber-500/20 text-amber-300 ring-1 ring-amber-400/30 hover:bg-amber-500/30 transition-colors disabled:opacity-50">
                {isPending ? "Transfert…" : "Confirmer"}
              </button>
            </div>
          </>
        )}
      </div>
    </ModalWrapper>
  );
}

// ─── Shared modal helpers ─────────────────────────────────────────────────────

function ModalWrapper({ children, onBackdrop }: { children: React.ReactNode; onBackdrop: (e: React.MouseEvent<HTMLDivElement>) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onBackdrop}>
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
      <div className="relative w-full max-w-md rounded-2xl bg-[#081020] ring-1 ring-white/10 shadow-2xl overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function ModalHeader({ titre, description, onFermer }: { titre: string; description: string; onFermer: () => void }) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h2 className="text-lg font-bold text-white tracking-tight">{titre}</h2>
        {description && <p className="text-xs text-white/35 mt-1">{description}</p>}
      </div>
      <button onClick={onFermer} className="text-white/30 hover:text-white/70 transition-colors p-1 rounded-lg hover:bg-white/5">
        <CloseIcon />
      </button>
    </div>
  );
}

function ModalActions({ onFermer, isPending, labelConfirmer }: { onFermer: () => void; isPending: boolean; labelConfirmer: string }) {
  return (
    <div className="flex gap-3 pt-1">
      <button type="button" onClick={onFermer} disabled={isPending} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white/50 ring-1 ring-white/10 hover:bg-white/5 transition-colors disabled:opacity-50">Annuler</button>
      <button type="submit" disabled={isPending} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-red-600 to-orange-600 text-white hover:from-red-500 hover:to-orange-500 transition-all disabled:opacity-40">
        {isPending ? "En cours…" : labelConfirmer}
      </button>
    </div>
  );
}

function SuccesMsg({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3 py-4 text-emerald-400">
      <div className="w-10 h-10 rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20 flex items-center justify-center flex-shrink-0">
        <CheckIcon />
      </div>
      <span className="font-medium">{message}</span>
    </div>
  );
}

function ErreurMsg({ message }: { message: string }) {
  return (
    <p className="text-sm text-red-400 bg-red-500/10 ring-1 ring-red-500/20 rounded-lg px-3 py-2">{message}</p>
  );
}

function FieldInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 rounded-xl bg-white/5 ring-1 ring-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none transition-all" />
    </div>
  );
}

function FieldTextarea({ label, value, onChange, placeholder, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        className="w-full px-3 py-2 rounded-xl bg-white/5 ring-1 ring-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none transition-all resize-none" />
    </div>
  );
}

function FieldSlider({ label, value, min, max, onChange, suffix = "" }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-[10px] font-semibold text-white/40 uppercase tracking-wider w-20 flex-shrink-0">{label}</label>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 h-1.5 rounded-full appearance-none bg-white/10 accent-red-500 cursor-pointer [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-red-400 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(59,130,246,0.5)]"
      />
      <span className="text-[10px] font-mono text-white/40 w-10 text-right">{value}{suffix}</span>
    </div>
  );
}

// ─── Icônes SVG inline ────────────────────────────────────────────────────────

function ShieldIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-12 h-12 text-red-400/30"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3c-4.5 1.8-8 3-8 9 0 5.4 4.8 9 8 9s8-3.6 8-9c0-6-3.5-7.2-8-9Z" /></svg>;
}

function StarIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-red-400"><path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354l-4.543 2.826c-.995.608-2.23-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" /></svg>;
}

function EditIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" /><path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" /></svg>;
}

function UserPlusIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M11 5a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM2.046 15.253c-.332 1.19.49 2.247 1.69 2.247h9.228c1.199 0 2.022-1.057 1.689-2.247L13.346 9.5a3.876 3.876 0 0 0-7.692 0l-1.608 5.753Z" /><path d="M15.5 5a.75.75 0 0 1 .75.75v2h2a.75.75 0 0 1 0 1.5h-2v2a.75.75 0 0 1-1.5 0v-2h-2a.75.75 0 0 1 0-1.5h2v-2A.75.75 0 0 1 15.5 5Z" /></svg>;
}

function ArrowSwapIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M13.2 2.24a.75.75 0 0 0 .04 1.06l2.1 1.95H6.75a.75.75 0 0 0 0 1.5h8.59l-2.1 1.95a.75.75 0 1 0 1.02 1.1l3.5-3.25a.75.75 0 0 0 0-1.1l-3.5-3.25a.75.75 0 0 0-1.06.04Zm-6.4 8a.75.75 0 0 0-1.06-.04l-3.5 3.25a.75.75 0 0 0 0 1.1l3.5 3.25a.75.75 0 1 0 1.02-1.1l-2.1-1.95h8.59a.75.75 0 0 0 0-1.5H4.66l2.1-1.95a.75.75 0 0 0 .04-1.06Z" clipRule="evenodd" /></svg>;
}

function TrashIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" /></svg>;
}

function LogoutIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M3 4.25A2.25 2.25 0 0 1 5.25 2h5.5A2.25 2.25 0 0 1 13 4.25v2a.75.75 0 0 1-1.5 0v-2a.75.75 0 0 0-.75-.75h-5.5a.75.75 0 0 0-.75.75v11.5c0 .414.336.75.75.75h5.5a.75.75 0 0 0 .75-.75v-2a.75.75 0 0 1 1.5 0v2A2.25 2.25 0 0 1 10.75 18h-5.5A2.25 2.25 0 0 1 3 15.75V4.25Z" clipRule="evenodd" /><path fillRule="evenodd" d="M19 10a.75.75 0 0 0-.75-.75H8.704l1.048-.943a.75.75 0 1 0-1.004-1.114l-2.5 2.25a.75.75 0 0 0 0 1.114l2.5 2.25a.75.75 0 1 0 1.004-1.114l-1.048-.943h9.546A.75.75 0 0 0 19 10Z" clipRule="evenodd" /></svg>;
}

function CheckIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-400"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" /></svg>;
}

function SearchIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white/30"><path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" /></svg>;
}

function CloseIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" /></svg>;
}

function WarningIcon() {
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0 mt-0.5"><path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" /></svg>;
}



