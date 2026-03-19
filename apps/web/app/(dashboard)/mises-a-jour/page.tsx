import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mises à jour · GestionHokkaido",
};

// ─── Types ────────────────────────────────────────────────────────────────────

type EntreeChangelog = {
  date: string;
  label: string;
  couleur: "blue" | "violet" | "emerald" | "amber" | "red" | "sky";
  items: {
    titre: string;
    description: string;
  }[];
};

// ─── Données ──────────────────────────────────────────────────────────────────

const CHANGELOG: EntreeChangelog[] = [
  {
    date: "17 mars 2026",
    label: "Mise à jour",
    couleur: "emerald",
    items: [
      {
        titre: "Système de Cours",
        description:
          "Nouvelle section « Cours » accessible depuis la navigation. Les membres qualifiés (Exo Pro+, Terminal, Classe 2+, prof/admin) peuvent créer des cours avec date, capacité et ping Discord. Les participants s'inscrivent directement depuis la page du cours.",
      },
      {
        titre: "Appel & Présences",
        description:
          "Le créateur fait l'appel manuellement en marquant les présents. Le bouton « Tout marquer présents » valide tous les inscrits en un clic. Minimum 5 présents requis pour valider un cours et distribuer les points.",
      },
      {
        titre: "Points personnels pour les cours",
        description:
          "+5 pts personnels pour chaque élève présent, +15 pts pour l'enseignant. Aucun multiplicateur d'escouade ne s'applique. Un récapitulatif est posté sur Discord à la clôture.",
      },
      {
        titre: "Wiki — Page Cours",
        description:
          "Le guide interactif (/info) inclut désormais une page dédiée aux cours détaillant les conditions d'accès, l'inscription, le déroulement de l'appel et les points distribués.",
      },
      {
        titre: "Wiki — Rôles Custom d'Escouade",
        description:
          "La page Escouades du guide a été mise à jour pour documenter les rôles personnalisés : création (10 max), 4 permissions granulaires, badges colorés sur les cartes membres.",
      },
      {
        titre: "Page Mises à jour",
        description:
          "Cette page répertorie toutes les mises à jour du site dans l'ordre chronologique inverse.",
      },
    ],
  },
];

// ─── Helpers couleurs ─────────────────────────────────────────────────────────

const COULEUR_STYLES = {
  blue:    { badge: "bg-blue-500/15 text-blue-300 ring-blue-400/20",    dot: "bg-blue-400",    bar: "from-blue-500/60 to-transparent" },
  violet:  { badge: "bg-violet-500/15 text-violet-300 ring-violet-400/20", dot: "bg-violet-400", bar: "from-violet-500/60 to-transparent" },
  emerald: { badge: "bg-emerald-500/15 text-emerald-300 ring-emerald-400/20", dot: "bg-emerald-400", bar: "from-emerald-500/60 to-transparent" },
  amber:   { badge: "bg-amber-500/15 text-amber-300 ring-amber-400/20",  dot: "bg-amber-400",   bar: "from-amber-500/60 to-transparent" },
  red:     { badge: "bg-red-500/15 text-red-300 ring-red-400/20",        dot: "bg-red-400",     bar: "from-red-500/60 to-transparent" },
  sky:     { badge: "bg-sky-500/15 text-sky-300 ring-sky-400/20",        dot: "bg-sky-400",     bar: "from-sky-500/60 to-transparent" },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MisesAJourPage() {
  return (
    <div className="relative min-h-screen bg-[#0a0505] pb-16 overflow-hidden">
      {/* Ambiance */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 select-none">
        <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-red-700/10 blur-[120px]" />
        <div className="absolute -bottom-40 -right-16 w-[520px] h-[520px] rounded-full bg-orange-600/8 blur-[140px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl px-4 pt-12 sm:px-6 lg:px-8 space-y-12 animate-fade-in">

        {/* En-tête */}
        <header className="space-y-2">
          <p className="text-xs text-white/25 uppercase tracking-widest font-medium">
            École d&apos;Exorcisme de Hokkaido&nbsp;&nbsp;/&nbsp;&nbsp;Mises à jour
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
              Journal des modifications
            </span>
          </h1>
          <p className="text-sm text-white/35">
            Historique des mises à jour du site GestionHokkaido.
          </p>
        </header>

        <div className="h-px bg-gradient-to-r from-red-500/30 via-white/10 to-transparent" />

        {/* Entries */}
        <div className="space-y-10">
          {CHANGELOG.map((entree, idx) => {
            const styles = COULEUR_STYLES[entree.couleur];
            return (
              <article key={idx} className="relative space-y-5">
                {/* Barre latérale colorée */}
                <div className={`absolute -left-4 top-0 bottom-0 w-px bg-gradient-to-b ${styles.bar} opacity-40`} />

                {/* Header de la version */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${styles.dot} shadow-lg`} />
                  <time className="text-sm font-bold text-white/80 tracking-tight">{entree.date}</time>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ring-1 uppercase tracking-wide ${styles.badge}`}>
                    {entree.label}
                  </span>
                </div>

                {/* Items */}
                <div className="ml-5 space-y-3">
                  {entree.items.map((item, i) => (
                    <div
                      key={i}
                      className="rounded-xl bg-white/[0.025] ring-1 ring-white/6 p-4 space-y-1 hover:bg-white/[0.04] transition-colors"
                    >
                      <p className="text-sm font-semibold text-white/90">{item.titre}</p>
                      <p className="text-xs text-white/45 leading-relaxed">{item.description}</p>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-4 text-center">
          <p className="text-xs text-white/15">GestionHokkaido · École d&apos;Exorcisme Jujutsu</p>
        </div>
      </div>
    </div>
  );
}
