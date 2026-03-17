"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { creerAgence, rejoindreAgence } from "./actions";

// ─── Types ────────────────────────────────────────────────────────────────────

type AgenceRow = {
  id: string;
  nom: string;
  description: string | null;
  url_logo: string | null;
  url_banniere: string | null;
  fondateur_id: string;
  site_id: string | null;
  est_inter_ecole: boolean;
  cree_le: string;
  membres_agence: { count: number }[];
  stagiaires_agence: { count: number }[];
};

type MonAgence = {
  role_agence: string;
  agences: {
    id: string;
    nom: string;
    url_logo: string | null;
    est_inter_ecole: boolean;
  } | null;
} | null;

type MonStage = {
  id: string;
  agences: {
    id: string;
    nom: string;
    url_logo: string | null;
    est_inter_ecole: boolean;
  } | null;
} | null;

type Props = {
  agences: AgenceRow[];
  error: string | null;
  userId: string;
  dejaMembreAgence: boolean;
  monAgence: MonAgence;
  monStage: MonStage;
  isExoProPlus: boolean;
  isAdmin: boolean;
  isTerminal: boolean;
};

type Filtre = "toutes" | "ecole" | "inter";

// ─── Modal création d'agence ──────────────────────────────────────────────────

function CreateAgenceModal({ onFermer }: { onFermer: () => void }) {
  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [urlLogo, setUrlLogo] = useState("");
  const [isPending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nom.trim() || nom.trim().length < 2) {
      setErreur("Le nom doit contenir au moins 2 caractères.");
      return;
    }
    setErreur(null);
    startTransition(async () => {
      const result = await creerAgence({
        nom: nom.trim(),
        description: description.trim() || undefined,
        url_logo: urlLogo.trim() || undefined,
      });
      if (result.success) {
        setSucces(true);
        setTimeout(() => {
          router.refresh();
          if (result.agenceId) {
            router.push(`/agences/${result.agenceId}`);
          }
          onFermer();
        }, 1200);
      } else {
        setErreur(result.error ?? "Une erreur est survenue.");
      }
    });
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onFermer();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />

      <div className="relative w-full max-w-md rounded-2xl bg-[#081020] ring-1 ring-white/10 shadow-2xl overflow-hidden">
        <div className="h-px w-full bg-gradient-to-r from-violet-500/0 via-violet-500/60 to-violet-500/0" />

        <div className="p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Créer une agence</h2>
              <p className="text-xs text-white/35 mt-1">
                Réservé aux Exorcistes Pro et supérieurs.
              </p>
            </div>
            <button
              onClick={onFermer}
              className="text-white/30 hover:text-white/70 transition-colors p-1 rounded-lg hover:bg-white/5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {succes ? (
            <div className="flex flex-col items-center py-6 gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6 text-emerald-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
              <p className="text-emerald-400 font-semibold">Agence créée avec succès !</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider">
                  Nom de l&apos;agence <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Ex : Agence Nanami…"
                  maxLength={100}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 ring-1 ring-white/10 text-white text-sm placeholder:text-white/25 focus:outline-none focus:ring-violet-500/50 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Décrivez l'agence et ses missions…"
                  maxLength={2000}
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/5 ring-1 ring-white/10 text-white text-sm placeholder:text-white/25 focus:outline-none focus:ring-violet-500/50 transition-all resize-none"
                />
              </div>

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

              {erreur && (
                <p className="text-sm text-red-400 bg-red-500/10 ring-1 ring-red-500/20 rounded-lg px-3 py-2">
                  {erreur}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={onFermer}
                  disabled={isPending}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-white/50 ring-1 ring-white/10 hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-indigo-700 text-white hover:from-violet-500 hover:to-indigo-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isPending ? "Création…" : "Créer l'agence"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Bouton rejoindre ─────────────────────────────────────────────────────────

function RejoindreButton({
  agenceId,
  dejaMembreAgence,
  isExoProPlus,
}: {
  agenceId: string;
  dejaMembreAgence: boolean;
  isExoProPlus: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [succes, setSucces] = useState(false);
  const router = useRouter();

  if (!isExoProPlus) return null;
  if (dejaMembreAgence) return null;

  function handleRejoindre() {
    setErreur(null);
    startTransition(async () => {
      const result = await rejoindreAgence(agenceId);
      if (result.success) {
        setSucces(true);
        setTimeout(() => {
          router.refresh();
        }, 800);
      } else {
        setErreur(result.error ?? "Erreur");
      }
    });
  }

  if (succes) {
    return (
      <span className="text-xs font-semibold text-emerald-400">
        Rejoint !
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleRejoindre}
        disabled={isPending}
        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-violet-600/20 text-violet-300 ring-1 ring-violet-500/30 hover:bg-violet-600/30 transition-all disabled:opacity-50"
      >
        {isPending ? "…" : "Rejoindre"}
      </button>
      {erreur && (
        <p className="text-[10px] text-red-400 max-w-[160px] text-right">{erreur}</p>
      )}
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function AgencesClient({
  agences,
  error,
  userId,
  dejaMembreAgence,
  monAgence,
  monStage,
  isExoProPlus,
  isAdmin,
  isTerminal,
}: Props) {
  const [modalOuvert, setModalOuvert] = useState(false);
  const [filtre, setFiltre] = useState<Filtre>("toutes");

  const monAgenceData = monAgence?.agences as {
    id: string;
    nom: string;
    url_logo: string | null;
    est_inter_ecole: boolean;
  } | null;

  const agencesFiltrees = agences.filter((a) => {
    if (filtre === "ecole") return !a.est_inter_ecole;
    if (filtre === "inter") return a.est_inter_ecole;
    return true;
  });

  const peutCreer = (isExoProPlus || isAdmin) && !dejaMembreAgence;

  const siteLabel = (siteId: string | null, estInterEcole: boolean) => {
    if (estInterEcole) return "Cross-faction";
    if (siteId === "tokyo") return "Tokyo";
    if (siteId === "hokkaido") return "Hokkaido";
    return "École";
  };

  return (
    <>
      {/* Bannière stage actif */}
      {monStage && monStage.agences && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-500/5 ring-1 ring-amber-500/20 flex items-center gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-amber-500/10 ring-1 ring-amber-500/20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5 text-amber-400">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 3.741-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-300">Stage en cours</p>
            <p className="text-xs text-white/50 truncate">
              Vous effectuez un stage chez{" "}
              <Link href={`/agences/${monStage.agences.id}`} className="text-amber-400 hover:underline">
                {monStage.agences.nom}
              </Link>
            </p>
          </div>
          <Link
            href={`/agences/${monStage.agences.id}`}
            className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20 hover:bg-amber-500/20 transition-all"
          >
            Voir
          </Link>
        </div>
      )}

      {/* Bannière mon agence */}
      {dejaMembreAgence && monAgenceData && (
        <div className="mb-6 p-4 rounded-2xl bg-violet-500/5 ring-1 ring-violet-500/20 flex items-center gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl overflow-hidden bg-violet-500/10 ring-1 ring-violet-500/20 flex items-center justify-center">
            {monAgenceData.url_logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={monAgenceData.url_logo} alt={monAgenceData.nom} className="w-full h-full object-cover" />
            ) : (
              <span className="text-sm font-bold text-violet-300 uppercase">
                {monAgenceData.nom.charAt(0)}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-violet-300">Mon agence</p>
            <p className="text-xs text-white/50 truncate">{monAgenceData.nom}</p>
          </div>
          <Link
            href={`/agences/${monAgenceData.id}`}
            className="flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg bg-violet-600/20 text-violet-300 ring-1 ring-violet-500/30 hover:bg-violet-600/30 transition-all"
          >
            Voir mon agence
          </Link>
        </div>
      )}

      {/* Hint Terminal sans stage */}
      {isTerminal && !monStage && !dejaMembreAgence && (
        <div className="mb-6 p-4 rounded-2xl bg-indigo-500/5 ring-1 ring-indigo-500/20 flex items-start gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
          </svg>
          <div>
            <p className="text-sm font-semibold text-indigo-300">Stages disponibles</p>
            <p className="text-xs text-white/40 mt-0.5">
              En tant qu&apos;élève de Terminal, vous pouvez être pris en stage par un membre d&apos;une agence. Consultez les agences ci-dessous.
            </p>
          </div>
        </div>
      )}

      {/* Barre d'actions : filtres + créer */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        {/* Filtres */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.03] ring-1 ring-white/10">
          {(["toutes", "ecole", "inter"] as Filtre[]).map((f) => (
            <button
              key={f}
              onClick={() => setFiltre(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filtre === f
                  ? "bg-violet-600/30 text-violet-300 ring-1 ring-violet-500/30"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              {f === "toutes" ? "Toutes" : f === "ecole" ? "Mon école" : "Inter-école"}
            </button>
          ))}
        </div>

        {/* Bouton créer */}
        {peutCreer && (
          <button
            onClick={() => setModalOuvert(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-700 text-white text-sm font-semibold hover:from-violet-500 hover:to-indigo-600 transition-all shadow-lg shadow-violet-900/30"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
            </svg>
            Créer une agence
          </button>
        )}
      </div>

      {/* Erreur */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 ring-1 ring-red-500/20 text-red-400 text-sm">
          Impossible de charger les agences : {error}
        </div>
      )}

      {/* Grille des agences */}
      {agencesFiltrees.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-8 h-8 text-violet-400/40">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
            </svg>
          </div>
          <p className="text-white/30 text-sm">Aucune agence trouvée.</p>
          {filtre !== "toutes" && (
            <button onClick={() => setFiltre("toutes")} className="text-violet-400 text-xs hover:underline">
              Voir toutes les agences
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agencesFiltrees.map((agence) => {
            const nbMembres = agence.membres_agence?.[0]?.count ?? 0;
            const nbStagiaires = agence.stagiaires_agence?.[0]?.count ?? 0;
            const estMonAgence = monAgenceData?.id === agence.id;

            return (
              <div
                key={agence.id}
                className={`group relative overflow-hidden flex flex-col rounded-2xl bg-white/[0.02] ring-1 transition-all duration-200 ${
                  estMonAgence
                    ? "ring-violet-500/40 bg-violet-500/[0.03]"
                    : "ring-white/8 hover:ring-violet-500/30 hover:bg-white/[0.04] hover:scale-[1.01]"
                }`}
              >
                <div className="h-px w-full bg-gradient-to-r from-violet-500/0 via-violet-500/60 to-violet-500/0" />

                <div className="relative p-5 flex-1 flex flex-col gap-4">
                  {/* Logo + Nom + Badges */}
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-violet-500/10 ring-1 ring-violet-400/20 flex items-center justify-center flex-shrink-0">
                      {agence.url_logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={agence.url_logo} alt={`Logo ${agence.nom}`} className="object-cover w-full h-full" />
                      ) : (
                        <span className="text-lg font-bold text-violet-300 uppercase">
                          {agence.nom.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white truncate group-hover:text-violet-300 transition-colors">
                        {agence.nom}
                      </p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {agence.est_inter_ecole && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20">
                            ✦ Inter-école
                          </span>
                        )}
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 ring-1 ring-violet-500/20">
                          {siteLabel(agence.site_id, agence.est_inter_ecole)}
                        </span>
                        {estMonAgence && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
                            Mon agence
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {agence.description && (
                    <p className="text-xs text-white/40 line-clamp-2 leading-relaxed">
                      {agence.description}
                    </p>
                  )}

                  {/* Stats + actions */}
                  <div className="mt-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-xs text-white/30">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                          <path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM1.49 15.326a.78.78 0 0 1-.358-.442 3 3 0 0 1 4.308-3.516 6.484 6.484 0 0 0-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 0 1-2.07-.655ZM16.44 15.98a4.97 4.97 0 0 0 2.07-.654.78.78 0 0 0 .357-.442 3 3 0 0 0-4.308-3.517 6.484 6.484 0 0 1 1.907 3.96 2.32 2.32 0 0 1-.026.654ZM18 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM5.304 16.19a.844.844 0 0 1-.277-.71 5 5 0 0 1 9.947 0 .843.843 0 0 1-.277.71A6.975 6.975 0 0 1 10 18a6.974 6.974 0 0 1-4.696-1.81Z" />
                        </svg>
                        {nbMembres} membre{nbMembres !== 1 ? "s" : ""}
                      </div>
                      {nbStagiaires > 0 && (
                        <div className="flex items-center gap-1 text-xs text-amber-400/60">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                            <path d="M10.75 16.82A7.462 7.462 0 0 1 10 17c-.34 0-.678-.023-1.01-.07L6.978 19H4a1 1 0 0 1-1-1v-2.292a7.474 7.474 0 0 1-.584-7.424A7.42 7.42 0 0 1 4 6.5V5a2 2 0 0 1 2-2h.278a7.472 7.472 0 0 1 9.144 2.972 7.488 7.488 0 0 1-4.672 10.848Z" />
                          </svg>
                          {nbStagiaires} stagiaire{nbStagiaires !== 1 ? "s" : ""}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <RejoindreButton
                        agenceId={agence.id}
                        dejaMembreAgence={dejaMembreAgence}
                        isExoProPlus={isExoProPlus}
                      />
                      <Link
                        href={`/agences/${agence.id}`}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/5 text-white/50 ring-1 ring-white/10 hover:bg-white/10 hover:text-white/80 transition-all"
                      >
                        Voir
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal création */}
      {modalOuvert && (
        <CreateAgenceModal onFermer={() => setModalOuvert(false)} />
      )}
    </>
  );
}
