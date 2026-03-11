"use client";

import { useState, useTransition } from "react";
import { creerCours, type EscouadeOption } from "@/app/(dashboard)/cours/actions";
import type { PingCible } from "@/app/(dashboard)/missions/mission-utils";
import type { ClanName } from "@/lib/discord/role-mappings";
import type { Grades, GradeRole, GradeSecondaire } from "@/types/database";

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  escouades: EscouadeOption[];
  onClose: () => void;
  onSuccess: (coursId: string) => void;
};

type PingType = "everyone" | "eleve_exorciste" | "escouades" | "clans" | "grades" | "grade_roles" | "grade_secondaire";

const CLANS: ClanName[] = ["Kamo", "Inumaki", "Zenin", "Gojo"];

const ALL_GRADES: Grades[] = [
  "Classe 4", "Classe 3", "Semi Classe 2", "Classe 2",
  "Semi Classe 1", "Classe 1", "Semi Classe S", "Classe S", "Classe Apo",
];

const ALL_GRADE_ROLES: GradeRole[] = [
  "Élève Exorciste", "Exorciste Pro", "Professeur",
  "Professeur Principal", "Co-Directeur", "Directeur",
];

const ALL_GRADES_SECONDAIRES: GradeSecondaire[] = [
  "Seconde", "Première", "Terminal",
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function CoursCreationForm({ escouades, onClose, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [titre, setTitre] = useState("");
  const [dateHeure, setDateHeure] = useState("");
  const [capaciteType, setCapaciteType] = useState<"number" | "unlimited">("unlimited");
  const [capacite, setCapacite] = useState<string>("30");
  const [activePingTypes, setActivePingTypes] = useState<Set<PingType>>(new Set(["eleve_exorciste"]));
  const [selectedSquads, setSelectedSquads] = useState<string[]>([]);
  const [selectedClans, setSelectedClans] = useState<ClanName[]>([]);
  const [selectedGrades, setSelectedGrades] = useState<Grades[]>([]);
  const [selectedGradeRoles, setSelectedGradeRoles] = useState<GradeRole[]>([]);
  const [selectedGradeSecondaires, setSelectedGradeSecondaires] = useState<GradeSecondaire[]>([]);
  const [restreindre, setRestreindre] = useState(false);
  const [description, setDescription] = useState("");

  function toggleSquad(id: string) {
    setSelectedSquads((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }
  function toggleClan(clan: ClanName) {
    setSelectedClans((prev) =>
      prev.includes(clan) ? prev.filter((c) => c !== clan) : [...prev, clan]
    );
  }
  function toggleGrade(g: Grades) {
    setSelectedGrades((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    );
  }
  function toggleGradeRole(gr: GradeRole) {
    setSelectedGradeRoles((prev) =>
      prev.includes(gr) ? prev.filter((x) => x !== gr) : [...prev, gr]
    );
  }
  function toggleGradeSecondaire(gs: GradeSecondaire) {
    setSelectedGradeSecondaires((prev) =>
      prev.includes(gs) ? prev.filter((x) => x !== gs) : [...prev, gs]
    );
  }

  function togglePingType(type: PingType) {
    if (type === "everyone") {
      if (activePingTypes.has("everyone")) {
        setActivePingTypes((prev) => { const next = new Set(prev); next.delete("everyone"); return next; });
      } else {
        const confirmed = window.confirm("Êtes-vous sûr de vouloir ping le serveur entier ?");
        if (confirmed) {
          setActivePingTypes(new Set(["everyone"]));
        }
      }
    } else {
      setActivePingTypes((prev) => {
        const next = new Set(prev);
        next.delete("everyone");
        if (next.has(type)) {
          next.delete(type);
        } else {
          next.add(type);
        }
        return next;
      });
    }
  }

  function buildPingCible(): PingCible {
    const cible: PingCible = { restreindre };
    if (activePingTypes.has("everyone")) cible.everyone = true;
    if (activePingTypes.has("eleve_exorciste")) cible.eleve_exorciste = true;
    if (activePingTypes.has("escouades")) cible.escouadeIds = selectedSquads;
    if (activePingTypes.has("clans")) cible.clans = selectedClans;
    if (activePingTypes.has("grades")) cible.grades = selectedGrades;
    if (activePingTypes.has("grade_roles")) cible.gradeRoles = selectedGradeRoles;
    if (activePingTypes.has("grade_secondaire")) cible.gradeSecondaires = selectedGradeSecondaires;
    return cible;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const parsedCapacite =
      capaciteType === "unlimited" ? null : parseInt(capacite, 10);

    startTransition(async () => {
      const result = await creerCours({
        titre: titre.trim(),
        date_heure: dateHeure || null,
        capacite: parsedCapacite,
        ping_cible: buildPingCible(),
        description,
      });

      if (result.success) {
        onSuccess(result.coursId);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#08101f] ring-1 ring-white/10 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-[#08101f] border-b border-white/[0.06]">
          <div>
            <h2 className="text-lg font-bold text-white">Créer un cours</h2>
            <p className="text-xs text-white/40 mt-0.5">
              L&apos;embed sera envoyé sur Discord après la création.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

          {/* Titre */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-white/80">
              Titre du cours <span className="text-purple-400">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={200}
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="Ex : Introduction au Jujutsu inversé"
              className="w-full px-3 py-2 rounded-lg bg-white/[0.04] ring-1 ring-white/10 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition"
            />
          </div>

          {/* Date & Time */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-white/80">
              Date / Heure
            </label>
            <input
              type="datetime-local"
              value={dateHeure}
              onChange={(e) => setDateHeure(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.04] ring-1 ring-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition [color-scheme:dark]"
            />
            <p className="text-xs text-white/30">Laisser vide si la date n&apos;est pas encore définie.</p>
          </div>

          {/* Capacité */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-white/80">
              Capacité
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCapaciteType("number")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ring-1 transition ${
                  capaciteType === "number"
                    ? "bg-purple-600/20 ring-purple-500/50 text-purple-300"
                    : "bg-white/[0.03] ring-white/10 text-white/50 hover:text-white/70"
                }`}
              >
                Nombre fixe
              </button>
              <button
                type="button"
                onClick={() => setCapaciteType("unlimited")}
                className={`flex-1 py-2 rounded-lg text-sm font-medium ring-1 transition ${
                  capaciteType === "unlimited"
                    ? "bg-purple-600/20 ring-purple-500/50 text-purple-300"
                    : "bg-white/[0.03] ring-white/10 text-white/50 hover:text-white/70"
                }`}
              >
                Illimité
              </button>
            </div>
            {capaciteType === "number" && (
              <input
                type="number"
                min={1}
                value={capacite}
                onChange={(e) => setCapacite(e.target.value)}
                placeholder="30"
                className="w-full px-3 py-2 rounded-lg bg-white/[0.04] ring-1 ring-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition"
              />
            )}
          </div>

          {/* Ping Target */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-white/80">
              Ping Discord <span className="text-purple-400">*</span>
            </label>
            <p className="text-xs text-white/40 mb-2">
              Sélectionnez une ou plusieurs catégories à mentionner :
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(
                [
                  ["eleve_exorciste", "Élève Exorciste"],
                  ["escouades", "Escouades"],
                  ["clans", "Clans"],
                  ["grades", "Grades de combat"],
                  ["grade_roles", "Rôle hiérarchique"],
                  ["grade_secondaire", "Niveau scolaire"],
                  ["everyone", "@everyone"],
                ] as [PingType, string][]
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => togglePingType(value)}
                  className={`py-2 px-3 rounded-lg text-xs font-medium ring-1 text-center transition ${
                    activePingTypes.has(value)
                      ? value === "everyone"
                        ? "bg-red-600/20 ring-red-500/50 text-red-300"
                        : "bg-purple-600/20 ring-purple-500/50 text-purple-300"
                      : value === "everyone"
                        ? "bg-white/[0.03] ring-red-900/30 text-red-400/60 hover:text-red-400/90"
                        : "bg-white/[0.03] ring-white/10 text-white/50 hover:text-white/70"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {activePingTypes.has("escouades") && (
              <div className="mt-2 space-y-1.5">
                <p className="text-xs text-white/40">Sélectionnez une ou plusieurs escouades :</p>
                {escouades.length === 0 ? (
                  <p className="text-xs text-white/30 italic">Aucune escouade disponible.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
                    {escouades.map((sq) => (
                      <button
                        key={sq.id}
                        type="button"
                        onClick={() => toggleSquad(sq.id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg ring-1 text-left text-sm transition ${
                          selectedSquads.includes(sq.id)
                            ? "bg-purple-600/20 ring-purple-500/50 text-purple-200"
                            : "bg-white/[0.03] ring-white/10 text-white/60 hover:text-white/80"
                        }`}
                      >
                        {sq.url_logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={sq.url_logo} alt="" className="w-5 h-5 rounded-full object-cover" />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
                            <span className="text-[9px] text-white/50">{sq.nom[0]}</span>
                          </div>
                        )}
                        <span className="truncate">{sq.nom}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activePingTypes.has("clans") && (
              <div className="mt-2 space-y-1.5">
                <p className="text-xs text-white/40">Sélectionnez un ou plusieurs clans :</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {CLANS.map((clan) => (
                    <button
                      key={clan}
                      type="button"
                      onClick={() => toggleClan(clan)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg ring-1 text-left text-sm transition ${
                        selectedClans.includes(clan)
                          ? "bg-purple-600/20 ring-purple-500/50 text-purple-200"
                          : "bg-white/[0.03] ring-white/10 text-white/60 hover:text-white/80"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${selectedClans.includes(clan) ? "bg-purple-400" : "bg-white/20"}`} />
                      Clan {clan}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activePingTypes.has("grades") && (
              <div className="mt-2 space-y-1.5">
                <p className="text-xs text-white/40">Sélectionnez un ou plusieurs grades de combat :</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {ALL_GRADES.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => toggleGrade(g)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg ring-1 text-left text-sm transition ${
                        selectedGrades.includes(g)
                          ? "bg-cyan-600/20 ring-cyan-500/50 text-cyan-200"
                          : "bg-white/[0.03] ring-white/10 text-white/60 hover:text-white/80"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${selectedGrades.includes(g) ? "bg-cyan-400" : "bg-white/20"}`} />
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activePingTypes.has("grade_roles") && (
              <div className="mt-2 space-y-1.5">
                <p className="text-xs text-white/40">Sélectionnez un ou plusieurs rôles hiérarchiques :</p>
                <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {ALL_GRADE_ROLES.map((gr) => (
                    <button
                      key={gr}
                      type="button"
                      onClick={() => toggleGradeRole(gr)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg ring-1 text-left text-sm transition ${
                        selectedGradeRoles.includes(gr)
                          ? "bg-rose-600/20 ring-rose-500/50 text-rose-200"
                          : "bg-white/[0.03] ring-white/10 text-white/60 hover:text-white/80"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${selectedGradeRoles.includes(gr) ? "bg-rose-400" : "bg-white/20"}`} />
                      {gr}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activePingTypes.has("grade_secondaire") && (
              <div className="mt-2 space-y-1.5">
                <p className="text-xs text-white/40">Sélectionnez un ou plusieurs niveaux scolaires :</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {ALL_GRADES_SECONDAIRES.map((gs) => (
                    <button
                      key={gs}
                      type="button"
                      onClick={() => toggleGradeSecondaire(gs)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg ring-1 text-left text-sm transition ${
                        selectedGradeSecondaires.includes(gs)
                          ? "bg-amber-600/20 ring-amber-500/50 text-amber-200"
                          : "bg-white/[0.03] ring-white/10 text-white/60 hover:text-white/80"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${selectedGradeSecondaires.includes(gs) ? "bg-amber-400" : "bg-white/20"}`} />
                      {gs}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Restriction */}
            {!(activePingTypes.size === 1 && activePingTypes.has("everyone")) && activePingTypes.size > 0 && (
              <button
                type="button"
                onClick={() => setRestreindre((v) => !v)}
                className={`mt-2 w-full flex items-center gap-3 px-3 py-2.5 rounded-lg ring-1 text-left text-xs transition ${
                  restreindre
                    ? "bg-amber-600/15 ring-amber-500/40 text-amber-300"
                    : "bg-white/[0.03] ring-white/10 text-white/50 hover:text-white/70"
                }`}
              >
                <span className={`relative flex-shrink-0 w-8 h-4 rounded-full transition-colors ${restreindre ? "bg-amber-500" : "bg-white/20"}`}>
                  <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white transition-transform ${restreindre ? "translate-x-4" : "translate-x-0"}`} />
                </span>
                <span className="font-medium">
                  Réserver l&apos;inscription aux personnes pinguées
                </span>
              </button>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-white/80">
              Description du cours
            </label>
            <textarea
              rows={4}
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez le contenu du cours, les pré-requis éventuels..."
              className="w-full px-3 py-2 rounded-lg bg-white/[0.04] ring-1 ring-white/10 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition resize-none"
            />
            <p className="text-xs text-white/30 text-right">{description.length} / 2000</p>
          </div>

          {/* Info card */}
          <div className="rounded-xl bg-purple-950/30 ring-1 ring-purple-500/20 px-4 py-3">
            <p className="text-xs font-semibold text-purple-300 mb-1.5">Récompenses</p>
            <div className="space-y-1 text-xs text-purple-200/60">
              <p>• Chaque participant présent reçoit <strong className="text-purple-300">5 pts personnels</strong></p>
              <p>• L&apos;enseignant (créateur) reçoit <strong className="text-purple-300">15 pts personnels</strong></p>
              <p>• Minimum <strong className="text-purple-300">5 présents</strong> pour valider le cours</p>
              <p className="text-purple-400/50 italic">Aucun bonus d&apos;escouade ne s&apos;applique pour les cours.</p>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-red-500/10 ring-1 ring-red-500/30 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 py-2.5 rounded-xl ring-1 ring-white/10 text-sm text-white/60 hover:text-white hover:bg-white/[0.04] transition disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending || !titre.trim() || activePingTypes.size === 0 || (activePingTypes.has("escouades") && selectedSquads.length === 0) || (activePingTypes.has("clans") && selectedClans.length === 0) || (activePingTypes.has("grades") && selectedGrades.length === 0) || (activePingTypes.has("grade_roles") && selectedGradeRoles.length === 0) || (activePingTypes.has("grade_secondaire") && selectedGradeSecondaires.length === 0)}
              className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-sm font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Création en cours…
                </>
              ) : (
                "Créer le cours"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
