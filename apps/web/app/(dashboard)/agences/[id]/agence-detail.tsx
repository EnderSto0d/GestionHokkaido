"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  quitterAgence,
  expulserMembre,
  supprimerAgence,
  transfererDirection,
  personnaliserAgence,
  terminerStage,
} from "../actions";
import { StagiaireModal } from "./stagiaire-modal";

// ─── Types ────────────────────────────────────────────────────────────────────

type Agence = {
  id: string;
  nom: string;
  description: string | null;
  url_logo: string | null;
  url_banniere: string | null;
  fondateur_id: string;
  site_id: string | null;
  est_inter_ecole: boolean;
  cree_le: string;
};

type Membre = {
  id: string;
  agence_id: string;
  utilisateur_id: string;
  role_agence: string;
  cree_le: string;
  utilisateurs: {
    id: string;
    pseudo: string;
    avatar_url: string | null;
    grade_role: string | null;
    site_id: string | null;
  } | null;
};

type Stagiaire = {
  id: string;
  agence_id: string;
  utilisateur_id: string;
  parrain_id: string;
  debut: string;
  fin: string | null;
  utilisateurs: {
    id: string;
    pseudo: string;
    avatar_url: string | null;
    grade_secondaire: string | null;
    site_id: string | null;
  } | null;
  parrain: {
    id: string;
    pseudo: string;
  } | null;
};

type Mission = {
  id: string;
  titre: string;
  statut: string;
  points_recompense: number;
  date_heure: string | null;
  cree_le: string;
  delegation_escouade_id: string | null;
};

type Props = {
  agence: Agence;
  membres: Membre[];
  stagiaires: Stagiaire[];
  missions: Mission[];
  userId: string;
  estMembre: boolean;
  estFondateur: boolean;
  isExoProPlus: boolean;
  isAdmin: boolean;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(dateStr));
}

function SiteBadge({ siteId, estInterEcole }: { siteId: string | null; estInterEcole: boolean }) {
  if (estInterEcole) {
    return (
      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20">
        ✦ Inter-école
      </span>
    );
  }
  const label = siteId === "tokyo" ? "Tokyo" : siteId === "hokkaido" ? "Hokkaido" : "École";
  return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 ring-1 ring-violet-500/20">
      {label}
    </span>
  );
}

function StatutMissionBadge({ statut }: { statut: string }) {
  const styles = {
    active: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
    terminee: "bg-white/5 text-white/40 ring-white/10",
    annulee: "bg-red-500/10 text-red-400 ring-red-500/20",
  };
  const labels = {
    active: "Active",
    terminee: "Terminée",
    annulee: "Annulée",
  };
  const style = styles[statut as keyof typeof styles] ?? styles.terminee;
  const label = labels[statut as keyof typeof labels] ?? statut;

  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ring-1 ${style}`}>
      {label}
    </span>
  );
}

// ─── Section personnalisation ─────────────────────────────────────────────────

function PersonnalisationSection({ agence }: { agence: Agence }) {
  const [description, setDescription] = useState(agence.description ?? "");
  const [urlLogo, setUrlLogo] = useState(agence.url_logo ?? "");
  const [urlBanniere, setUrlBanniere] = useState(agence.url_banniere ?? "");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await personnaliserAgence(agence.id, {
        description: description.trim() || undefined,
        url_logo: urlLogo.trim() || undefined,
        url_banniere: urlBanniere.trim() || undefined,
      });
      if (result.success) {
        setMessage({ type: "success", text: "Agence mise à jour avec succès." });
        router.refresh();
      } else {
        setMessage({ type: "error", text: result.error ?? "Erreur lors de la mise à jour." });
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Décrivez l'agence et ses missions…"
          maxLength={2000}
          rows={4}
          className="w-full px-3 py-2.5 rounded-xl bg-white/5 ring-1 ring-white/10 text-white text-sm placeholder:text-white/25 focus:outline-none focus:ring-violet-500/50 transition-all resize-none"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider">
            URL du logo
          </label>
          <input
            type="url"
            value={urlLogo}
            onChange={(e) => setUrlLogo(e.target.value)}
            placeholder="https://…"
            className="w-full px-3 py-2.5 rounded-xl bg-white/5 ring-1 ring-white/10 text-white text-sm placeholder:text-white/25 focus:outline-none focus:ring-violet-500/50 transition-all"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider">
            URL de la bannière
          </label>
          <input
            type="url"
            value={urlBanniere}
            onChange={(e) => setUrlBanniere(e.target.value)}
            placeholder="https://…"
            className="w-full px-3 py-2.5 rounded-xl bg-white/5 ring-1 ring-white/10 text-white text-sm placeholder:text-white/25 focus:outline-none focus:ring-violet-500/50 transition-all"
          />
        </div>
      </div>

      {message && (
        <p className={`text-sm px-3 py-2 rounded-lg ring-1 ${
          message.type === "success"
            ? "text-emerald-400 bg-emerald-500/10 ring-emerald-500/20"
            : "text-red-400 bg-red-500/10 ring-red-500/20"
        }`}>
          {message.text}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-indigo-700 text-white hover:from-violet-500 hover:to-indigo-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isPending ? "Enregistrement…" : "Enregistrer les modifications"}
      </button>
    </form>
  );
}

// ─── Section transfert ────────────────────────────────────────────────────────

function TransfertSection({ agence, membres, userId }: { agence: Agence; membres: Membre[]; userId: string }) {
  const [selectedId, setSelectedId] = useState("");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const router = useRouter();

  const membresCibles = membres.filter(
    (m) => m.utilisateur_id !== userId && m.role_agence !== "fondateur"
  );

  function handleTransfert() {
    if (!selectedId) return;
    setMessage(null);
    startTransition(async () => {
      const result = await transfererDirection(agence.id, selectedId);
      if (result.success) {
        setMessage({ type: "success", text: "Direction transférée avec succès." });
        setTimeout(() => router.refresh(), 800);
      } else {
        setMessage({ type: "error", text: result.error ?? "Erreur" });
      }
    });
  }

  if (membresCibles.length === 0) {
    return (
      <p className="text-sm text-white/30 italic">
        Aucun autre membre disponible pour le transfert.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-white/40">
        Sélectionnez un membre à qui transférer la direction de l&apos;agence.
      </p>
      <div className="flex gap-3">
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className="flex-1 px-3 py-2.5 rounded-xl bg-white/5 ring-1 ring-white/10 text-white text-sm focus:outline-none focus:ring-violet-500/50 transition-all"
        >
          <option value="">— Choisir un membre —</option>
          {membresCibles.map((m) => (
            <option key={m.utilisateur_id} value={m.utilisateur_id}>
              {m.utilisateurs?.pseudo ?? "Inconnu"}
            </option>
          ))}
        </select>
        <button
          onClick={handleTransfert}
          disabled={isPending || !selectedId}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20 hover:bg-amber-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isPending ? "…" : "Transférer"}
        </button>
      </div>
      {message && (
        <p className={`text-sm px-3 py-2 rounded-lg ring-1 ${
          message.type === "success"
            ? "text-emerald-400 bg-emerald-500/10 ring-emerald-500/20"
            : "text-red-400 bg-red-500/10 ring-red-500/20"
        }`}>
          {message.text}
        </p>
      )}
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function AgenceDetail({
  agence,
  membres,
  stagiaires,
  missions,
  userId,
  estMembre,
  estFondateur,
  isExoProPlus,
  isAdmin,
}: Props) {
  const router = useRouter();
  const [isPendingQuitter, startTransitionQuitter] = useTransition();
  const [isPendingSupprimer, startTransitionSupprimer] = useTransition();
  const [confirmerSupprimer, setConfirmerSupprimer] = useState(false);
  const [expulserPending, setExpulserPending] = useState<string | null>(null);
  const [expulserErreur, setExpulserErreur] = useState<string | null>(null);
  const [terminerStagePending, setTerminerStagePending] = useState<string | null>(null);
  const [stagiaireModalOuvert, setStagiaireModalOuvert] = useState(false);
  const [erreurQuitter, setErreurQuitter] = useState<string | null>(null);
  const [erreurSupprimer, setErreurSupprimer] = useState<string | null>(null);
  const [settingsOuvert, setSettingsOuvert] = useState(false);

  const peutGerer = estFondateur || isAdmin;
  const peutRejoindre = isExoProPlus && !estMembre;
  const fondateurInfo = membres.find((m) => m.role_agence === "fondateur");

  const siteLabel = (siteId: string | null, estInterEcole: boolean) => {
    if (estInterEcole) return "Cross-faction";
    if (siteId === "tokyo") return "Tokyo";
    if (siteId === "hokkaido") return "Hokkaido";
    return "École";
  };

  function handleQuitter() {
    setErreurQuitter(null);
    startTransitionQuitter(async () => {
      const result = await quitterAgence(agence.id);
      if (result.success) {
        router.push("/agences");
      } else {
        setErreurQuitter(result.error ?? "Erreur");
      }
    });
  }

  function handleSupprimer() {
    if (!confirmerSupprimer) {
      setConfirmerSupprimer(true);
      return;
    }
    setErreurSupprimer(null);
    startTransitionSupprimer(async () => {
      const result = await supprimerAgence(agence.id);
      if (result.success) {
        router.push("/agences");
      } else {
        setErreurSupprimer(result.error ?? "Erreur");
        setConfirmerSupprimer(false);
      }
    });
  }

  async function handleExpulser(membreId: string) {
    setExpulserErreur(null);
    setExpulserPending(membreId);
    const result = await expulserMembre(agence.id, membreId);
    setExpulserPending(null);
    if (result.success) {
      router.refresh();
    } else {
      setExpulserErreur(result.error ?? "Erreur");
    }
  }

  async function handleTerminerStage(stagiaireId: string) {
    setTerminerStagePending(stagiaireId);
    const result = await terminerStage(stagiaireId);
    setTerminerStagePending(null);
    if (result.success) {
      router.refresh();
    }
  }

  return (
    <div className="relative min-h-screen bg-[#050a18] overflow-hidden">
      {/* Blobs */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 select-none">
        <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-violet-700/15 blur-[120px]" />
        <div className="absolute -bottom-40 -right-16 w-[520px] h-[520px] rounded-full bg-indigo-600/10 blur-[140px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-violet-900/10 blur-[100px]" />
      </div>

      {/* Noise */}
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

      <div className="relative z-10 mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8 animate-fade-in">

        {/* Breadcrumb */}
        <p className="text-xs text-white/25 uppercase tracking-widest mb-5 font-medium">
          École d&apos;Exorcisme de Hokkaido&nbsp;&nbsp;/&nbsp;&nbsp;
          <Link href="/agences" className="hover:text-white/50 transition-colors">Agences</Link>
          &nbsp;&nbsp;/&nbsp;&nbsp;{agence.nom}
        </p>

        {/* ── Bannière ────────────────────────────────────────────────────── */}
        <div className="relative rounded-2xl overflow-hidden mb-8 ring-1 ring-white/10">
          {/* Bannière ou dégradé de secours */}
          <div className="h-48 sm:h-56 relative">
            {agence.url_banniere ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={agence.url_banniere}
                alt={`Bannière ${agence.nom}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-violet-900/40 via-indigo-900/30 to-[#050a18]" />
            )}
            {/* Overlay gradient bottom */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#050a18] via-[#050a18]/40 to-transparent" />
          </div>

          {/* Logo + nom superposés */}
          <div className="absolute bottom-0 left-0 right-0 p-6 flex items-end gap-4">
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 rounded-2xl overflow-hidden bg-violet-500/20 ring-2 ring-violet-500/40 flex items-center justify-center shadow-xl">
                {agence.url_logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={agence.url_logo} alt={`Logo ${agence.nom}`} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-black text-violet-300 uppercase">
                    {agence.nom.charAt(0)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <SiteBadge siteId={agence.site_id} estInterEcole={agence.est_inter_ecole} />
                {estMembre && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
                    Membre
                  </span>
                )}
                {estFondateur && (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20">
                    ♛ Fondateur
                  </span>
                )}
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight truncate">
                {agence.nom}
              </h1>
              {fondateurInfo?.utilisateurs && (
                <p className="text-xs text-white/40 mt-0.5">
                  Fondateur&nbsp;:&nbsp;{fondateurInfo.utilisateurs.pseudo}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {agence.description && (
          <div className="mb-8 p-5 rounded-2xl bg-white/[0.03] ring-1 ring-white/10">
            <p className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap">{agence.description}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Colonne principale ───────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Membres */}
            <section className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 overflow-hidden">
              <div className="h-px w-full bg-gradient-to-r from-violet-500/0 via-violet-500/60 to-violet-500/0" />
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-white/70 uppercase tracking-widest flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-violet-400">
                      <path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM1.49 15.326a.78.78 0 0 1-.358-.442 3 3 0 0 1 4.308-3.516 6.484 6.484 0 0 0-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 0 1-2.07-.655ZM16.44 15.98a4.97 4.97 0 0 0 2.07-.654.78.78 0 0 0 .357-.442 3 3 0 0 0-4.308-3.517 6.484 6.484 0 0 1 1.907 3.96 2.32 2.32 0 0 1-.026.654ZM18 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM5.304 16.19a.844.844 0 0 1-.277-.71 5 5 0 0 1 9.947 0 .843.843 0 0 1-.277.71A6.975 6.975 0 0 1 10 18a6.974 6.974 0 0 1-4.696-1.81Z" />
                    </svg>
                    Membres
                    <span className="text-xs text-white/25 normal-case font-normal">({membres.length})</span>
                  </h2>
                </div>

                {expulserErreur && (
                  <p className="mb-3 text-sm text-red-400 bg-red-500/10 ring-1 ring-red-500/20 rounded-lg px-3 py-2">
                    {expulserErreur}
                  </p>
                )}

                <div className="grid gap-2 sm:grid-cols-2">
                  {membres.map((m) => {
                    const u = m.utilisateurs;
                    const isFondateur = m.role_agence === "fondateur";
                    const isSelf = m.utilisateur_id === userId;

                    return (
                      <div
                        key={m.utilisateur_id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] ring-1 ring-white/10 hover:ring-violet-500/20 transition-all"
                      >
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-violet-500/20 ring-1 ring-white/10 flex items-center justify-center">
                            {u?.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={u.avatar_url} alt={u.pseudo} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs font-bold text-violet-300 uppercase">
                                {u?.pseudo?.charAt(0) ?? "?"}
                              </span>
                            )}
                          </div>
                          {isFondateur && (
                            <span className="absolute -top-1 -right-1 text-[10px]">♛</span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {u?.pseudo ?? "Inconnu"}
                            {isSelf && <span className="ml-1.5 text-[10px] text-violet-400">(vous)</span>}
                          </p>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {u?.grade_role && (
                              <span className="text-[10px] text-white/40">{u.grade_role}</span>
                            )}
                            {isFondateur && (
                              <span className="text-[10px] text-amber-400">Fondateur</span>
                            )}
                            {u?.site_id === "tokyo" && (
                              <span className="text-[10px] text-violet-400/60">Tokyo</span>
                            )}
                            {u?.site_id === "hokkaido" && (
                              <span className="text-[10px] text-red-400/60">Hokkaido</span>
                            )}
                          </div>
                        </div>

                        {/* Bouton expulser (fondateur/admin, pas sur soi-même et pas sur le fondateur) */}
                        {peutGerer && !isSelf && !isFondateur && (
                          <button
                            onClick={() => handleExpulser(m.utilisateur_id)}
                            disabled={expulserPending === m.utilisateur_id}
                            className="flex-shrink-0 p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
                            title="Expulser ce membre"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                              <path fillRule="evenodd" d="M3.636 3.636a.75.75 0 0 1 1.06 0l9.192 9.192-1.06 1.06L3.636 4.697a.75.75 0 0 1 0-1.06ZM3.636 16.364a.75.75 0 0 0 1.06 0l9.192-9.192-1.06-1.06-9.192 9.192a.75.75 0 0 0 0 1.06Z" clipRule="evenodd" />
                            </svg>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Actions membre */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {estMembre && !estFondateur && (
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={handleQuitter}
                        disabled={isPendingQuitter}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-400 bg-red-500/10 ring-1 ring-red-500/20 hover:bg-red-500/20 transition-all disabled:opacity-50"
                      >
                        {isPendingQuitter ? "Départ en cours…" : "Quitter l'agence"}
                      </button>
                      {erreurQuitter && (
                        <p className="text-xs text-red-400">{erreurQuitter}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Stagiaires */}
            <section className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 overflow-hidden">
              <div className="h-px w-full bg-gradient-to-r from-violet-500/0 via-violet-500/60 to-violet-500/0" />
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-white/70 uppercase tracking-widest flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-400">
                      <path d="M10.75 16.82A7.462 7.462 0 0 1 10 17c-.34 0-.678-.023-1.01-.07L6.978 19H4a1 1 0 0 1-1-1v-2.292a7.474 7.474 0 0 1-.584-7.424A7.42 7.42 0 0 1 4 6.5V5a2 2 0 0 1 2-2h.278a7.472 7.472 0 0 1 9.144 2.972 7.488 7.488 0 0 1-4.672 10.848Z" />
                    </svg>
                    Stagiaires actifs
                    <span className="text-xs text-white/25 normal-case font-normal">({stagiaires.length})</span>
                  </h2>
                  {/* Bouton prendre un stagiaire */}
                  {estMembre && isExoProPlus && (
                    <button
                      onClick={() => setStagiaireModalOuvert(true)}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20 hover:bg-amber-500/20 transition-all"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                        <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                      </svg>
                      Prendre un stagiaire
                    </button>
                  )}
                </div>

                {stagiaires.length === 0 ? (
                  <div className="flex flex-col items-center py-8 gap-2 text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-8 h-8 text-white/15">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 3.741-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
                    </svg>
                    <p className="text-sm text-white/25">Aucun stagiaire actif</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {stagiaires.map((s) => {
                      const u = s.utilisateurs;
                      const peutTerminer =
                        isAdmin || estFondateur || s.parrain_id === userId;

                      return (
                        <div
                          key={s.id}
                          className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] ring-1 ring-white/10"
                        >
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-amber-500/20 ring-1 ring-amber-500/20 flex items-center justify-center flex-shrink-0">
                            {u?.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={u.avatar_url} alt={u.pseudo} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs font-bold text-amber-300 uppercase">
                                {u?.pseudo?.charAt(0) ?? "?"}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{u?.pseudo ?? "Inconnu"}</p>
                            <p className="text-xs text-white/40">
                              Parrain&nbsp;: {s.parrain?.pseudo ?? "Inconnu"} · Depuis le {formatDate(s.debut)}
                            </p>
                          </div>
                          {peutTerminer && (
                            <button
                              onClick={() => handleTerminerStage(s.id)}
                              disabled={terminerStagePending === s.id}
                              className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 ring-1 ring-red-500/20 hover:bg-red-500/20 transition-all disabled:opacity-50"
                            >
                              {terminerStagePending === s.id ? "…" : "Terminer"}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

            {/* Missions */}
            <section className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 overflow-hidden">
              <div className="h-px w-full bg-gradient-to-r from-violet-500/0 via-violet-500/60 to-violet-500/0" />
              <div className="p-5">
                <h2 className="text-sm font-semibold text-white/70 uppercase tracking-widest flex items-center gap-2 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-indigo-400">
                    <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-5.5-2.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0ZM10 12a5.99 5.99 0 0 0-4.793 2.39A6.483 6.483 0 0 0 10 16.5a6.483 6.483 0 0 0 4.793-2.11A5.99 5.99 0 0 0 10 12Z" clipRule="evenodd" />
                  </svg>
                  Missions de l&apos;agence
                  <span className="text-xs text-white/25 normal-case font-normal">({missions.length})</span>
                </h2>

                {missions.length === 0 ? (
                  <p className="text-sm text-white/25 text-center py-6 italic">
                    Aucune mission assignée à cette agence.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {missions.map((m) => (
                      <Link
                        key={m.id}
                        href={`/missions/${m.id}`}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] ring-1 ring-white/10 hover:ring-violet-500/20 hover:bg-white/[0.05] transition-all group"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white group-hover:text-violet-300 transition-colors truncate">
                            {m.titre}
                          </p>
                          <p className="text-xs text-white/40">
                            {m.points_recompense} pts · {formatDate(m.cree_le)}
                          </p>
                        </div>
                        <StatutMissionBadge statut={m.statut} />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* ── Colonne latérale ─────────────────────────────────────────── */}
          <div className="space-y-6">

            {/* Infos */}
            <section className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 overflow-hidden">
              <div className="h-px w-full bg-gradient-to-r from-violet-500/0 via-violet-500/60 to-violet-500/0" />
              <div className="p-5 space-y-3">
                <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest">
                  Informations
                </h3>
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/40">Type</span>
                    <SiteBadge siteId={agence.site_id} estInterEcole={agence.est_inter_ecole} />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/40">Membres</span>
                    <span className="text-white/70 font-medium">{membres.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/40">Stagiaires</span>
                    <span className="text-white/70 font-medium">{stagiaires.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/40">Créée le</span>
                    <span className="text-white/70 font-medium">{formatDate(agence.cree_le)}</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Rejoindre */}
            {peutRejoindre && (
              <section className="rounded-2xl bg-violet-500/5 ring-1 ring-violet-500/20 overflow-hidden">
                <div className="h-px w-full bg-gradient-to-r from-violet-500/0 via-violet-500/60 to-violet-500/0" />
                <div className="p-5 space-y-3">
                  <p className="text-xs text-white/50">
                    Vous êtes Exorciste Pro ou supérieur. Vous pouvez rejoindre cette agence.
                  </p>
                  <RejoindreButton agenceId={agence.id} />
                </div>
              </section>
            )}

            {/* Paramètres (fondateur/admin) */}
            {peutGerer && (
              <section className="rounded-2xl bg-white/[0.03] ring-1 ring-white/10 overflow-hidden">
                <div className="h-px w-full bg-gradient-to-r from-violet-500/0 via-violet-500/60 to-violet-500/0" />
                <div className="p-5">
                  <button
                    onClick={() => setSettingsOuvert(!settingsOuvert)}
                    className="w-full flex items-center justify-between text-sm font-semibold text-white/70 hover:text-white transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-violet-400">
                        <path fillRule="evenodd" d="M7.84 1.804A1 1 0 0 1 8.82 1h2.36a1 1 0 0 1 .98.804l.331 1.652a6.993 6.993 0 0 1 1.929 1.115l1.598-.54a1 1 0 0 1 1.186.447l1.18 2.044a1 1 0 0 1-.205 1.251l-1.267 1.113a7.047 7.047 0 0 1 0 2.228l1.267 1.113a1 1 0 0 1 .206 1.25l-1.18 2.045a1 1 0 0 1-1.187.447l-1.598-.54a6.993 6.993 0 0 1-1.929 1.115l-.33 1.652a1 1 0 0 1-.98.804H8.82a1 1 0 0 1-.98-.804l-.331-1.652a6.993 6.993 0 0 1-1.929-1.115l-1.598.54a1 1 0 0 1-1.186-.447l-1.18-2.044a1 1 0 0 1 .205-1.251l1.267-1.114a7.05 7.05 0 0 1 0-2.227L1.821 7.773a1 1 0 0 1-.206-1.25l1.18-2.045a1 1 0 0 1 1.187-.447l1.598.54A6.992 6.992 0 0 1 7.51 3.456l.33-1.652Z" clipRule="evenodd" />
                        <path fillRule="evenodd" d="M10 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" />
                      </svg>
                      Paramètres
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 transition-transform ${settingsOuvert ? "rotate-180" : ""}`}>
                      <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                    </svg>
                  </button>

                  {settingsOuvert && (
                    <div className="mt-5 space-y-6">
                      {/* Personnalisation */}
                      <div>
                        <h4 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">
                          Personnalisation
                        </h4>
                        <PersonnalisationSection agence={agence} />
                      </div>

                      <div className="h-px bg-gradient-to-r from-violet-500/30 via-white/10 to-transparent" />

                      {/* Transfert */}
                      {estFondateur && (
                        <div>
                          <h4 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">
                            Transférer la direction
                          </h4>
                          <TransfertSection agence={agence} membres={membres} userId={userId} />
                        </div>
                      )}

                      {estFondateur && <div className="h-px bg-gradient-to-r from-violet-500/30 via-white/10 to-transparent" />}

                      {/* Supprimer */}
                      <div>
                        <h4 className="text-xs font-semibold text-red-400/50 uppercase tracking-widest mb-3">
                          Zone dangereuse
                        </h4>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={handleSupprimer}
                            disabled={isPendingSupprimer}
                            className={`w-full px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                              confirmerSupprimer
                                ? "bg-red-600/30 text-red-400 ring-1 ring-red-500/40 hover:bg-red-600/50"
                                : "bg-red-500/10 text-red-400/70 ring-1 ring-red-500/20 hover:bg-red-500/20"
                            }`}
                          >
                            {isPendingSupprimer
                              ? "Suppression…"
                              : confirmerSupprimer
                              ? "Confirmer la suppression définitive"
                              : "Supprimer l'agence"}
                          </button>
                          {confirmerSupprimer && (
                            <button
                              onClick={() => setConfirmerSupprimer(false)}
                              className="text-xs text-white/30 hover:text-white/50 transition-colors"
                            >
                              Annuler
                            </button>
                          )}
                          {erreurSupprimer && (
                            <p className="text-xs text-red-400">{erreurSupprimer}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>

      {/* Modal stagiaire */}
      {stagiaireModalOuvert && (
        <StagiaireModal
          agenceId={agence.id}
          onFermer={() => setStagiaireModalOuvert(false)}
        />
      )}
    </div>
  );
}

// ─── Bouton rejoindre (inline) ────────────────────────────────────────────────

function RejoindreButton({ agenceId }: { agenceId: string }) {
  const [isPending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);
  const router = useRouter();

  function handleRejoindre() {
    setErreur(null);
    startTransition(async () => {
      const { rejoindreAgence } = await import("../actions");
      const result = await rejoindreAgence(agenceId);
      if (result.success) {
        setSucces(true);
        setTimeout(() => router.refresh(), 800);
      } else {
        setErreur(result.error ?? "Erreur");
      }
    });
  }

  if (succes) {
    return <p className="text-sm font-semibold text-emerald-400 text-center">Vous avez rejoint l&apos;agence !</p>;
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleRejoindre}
        disabled={isPending}
        className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-indigo-700 text-white hover:from-violet-500 hover:to-indigo-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isPending ? "Adhésion en cours…" : "Rejoindre l'agence"}
      </button>
      {erreur && <p className="text-xs text-red-400 text-center">{erreur}</p>}
    </div>
  );
}
