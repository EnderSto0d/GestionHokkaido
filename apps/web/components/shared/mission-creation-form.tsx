"use client";

import { useState, useTransition } from "react";
import { creerMission, type EscouadeOption, type PingCible } from "@/app/(dashboard)/missions/actions";
import { MAX_MISSION_POINTS, MAX_CUSTOM_MISSION_POINTS } from "@/lib/missions/config";

// ─── Difficulty levels ──────────────────────────────────────────────────────

type Difficulty = "classe4" | "classe3" | "semi-classe2" | "classe2" | "semi-classe1" | "classe1" | "custom";

const DIFFICULTIES: { key: Difficulty; label: string; points: number | null }[] = [
  { key: "classe4",      label: "Classe 4",       points: 5  },
  { key: "classe3",      label: "Classe 3",       points: 10 },
  { key: "semi-classe2", label: "Semi-Classe 2",  points: 20 },
  { key: "classe2",      label: "Classe 2",       points: 30 },
  { key: "semi-classe1", label: "Semi-Classe 1",  points: 45 },
  { key: "classe1",      label: "Classe 1",       points: 60 },
  { key: "custom",       label: "Custom",         points: null },
];
import type { ClanName } from "@/lib/discord/role-mappings";
import type { Grades, GradeRole, GradeSecondaire } from "@/types/database";

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  escouades: EscouadeOption[];
  onClose: () => void;
  onSuccess: (missionId: string) => void;
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

export default function MissionCreationForm({ escouades, onClose, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [titre, setTitre] = useState("");
  const [dateHeure, setDateHeure] = useState("");
  const [capaciteType, setCapaciteType] = useState<"number" | "unlimited">("number");
  const [capacite, setCapacite] = useState<string>("10");
  const [activePingTypes, setActivePingTypes] = useState<Set<PingType>>(new Set(["eleve_exorciste"]));
  const [selectedSquads, setSelectedSquads] = useState<string[]>([]);
  const [selectedClans, setSelectedClans] = useState<ClanName[]>([]);
  const [selectedGrades, setSelectedGrades] = useState<Grades[]>([]);
  const [selectedGradeRoles, setSelectedGradeRoles] = useState<GradeRole[]>([]);
  const [selectedGradeSecondaires, setSelectedGradeSecondaires] = useState<GradeSecondaire[]>([]);
  const [restreindre, setRestreindre] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty>("classe4");
  const [customPoints, setCustomPoints] = useState<string>("10");
  const [synopsis, setSynopsis] = useState("");

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

    const selectedDiff = DIFFICULTIES.find((d) => d.key === difficulty)!;
    const parsedPoints = difficulty === "custom"
      ? parseInt(customPoints, 10)
      : selectedDiff.points!;
    const parsedCapacite =
      capaciteType === "unlimited" ? null : parseInt(capacite, 10);

    startTransition(async () => {
      const result = await creerMission({
        titre: titre.trim(),
        date_heure: dateHeure || null,
        capacite: parsedCapacite,
        ping_cible: buildPingCible(),
        points_recompense: Number.isNaN(parsedPoints) ? 0 : parsedPoints,
        synopsis,
      });

      if (result.success) {
        onSuccess(result.missionId);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    /* ── Modal overlay ─────────────────────────────────────────────────────── */
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#08101f] ring-1 ring-white/10 shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-[#08101f] border-b border-white/[0.06]">
          <div>
            <h2 className="text-lg font-bold text-white">Créer une mission</h2>
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

          {/* Mission Name */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-white/80">
              Nom de la mission <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={200}
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="Ex : Purification du district de Shibuya"
              className="w-full px-3 py-2 rounded-lg bg-white/[0.04] ring-1 ring-white/10 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 transition"
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
              className="w-full px-3 py-2 rounded-lg bg-white/[0.04] ring-1 ring-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 transition [color-scheme:dark]"
            />
            <p className="text-xs text-white/30">Laisser vide si la date n&apos;est pas encore définie.</p>
          </div>

          {/* Capacity */}
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
                    ? "bg-red-600/20 ring-red-500/50 text-red-300"
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
                    ? "bg-red-600/20 ring-red-500/50 text-red-300"
                    : "bg-white/[0.03] ring-white/10 text-white/50 hover:text-white/70"
                }`}
              >
                Illimité / Général
              </button>
            </div>
            {capaciteType === "number" && (
              <input
                type="number"
                min={1}
                value={capacite}
                onChange={(e) => setCapacite(e.target.value)}
                placeholder="10"
                className="w-full px-3 py-2 rounded-lg bg-white/[0.04] ring-1 ring-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 transition"
              />
            )}
          </div>

          {/* Ping Target */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-white/80">
              Ping Discord <span className="text-red-400">*</span>
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
                        : "bg-red-600/20 ring-red-500/50 text-red-300"
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
                <p className="text-xs text-white/40">
                  Sélectionnez une ou plusieurs escouades à mentionner :
                </p>
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
                            ? "bg-red-600/20 ring-red-500/50 text-red-200"
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
                <p className="text-xs text-white/40">
                  Sélectionnez un ou plusieurs clans à mentionner :
                </p>
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
                <p className="text-xs text-white/40">
                  Sélectionnez un ou plusieurs grades de combat :
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-1">
                  {ALL_GRADES.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => toggleGrade(g)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg ring-1 text-left text-sm transition ${
                        selectedGrades.includes(g)
                          ? "bg-orange-600/20 ring-orange-500/50 text-orange-200"
                          : "bg-white/[0.03] ring-white/10 text-white/60 hover:text-white/80"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${selectedGrades.includes(g) ? "bg-orange-400" : "bg-white/20"}`} />
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activePingTypes.has("grade_roles") && (
              <div className="mt-2 space-y-1.5">
                <p className="text-xs text-white/40">
                  Sélectionnez un ou plusieurs rôles hiérarchiques :
                </p>
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
                <p className="text-xs text-white/40">
                  Sélectionnez un ou plusieurs niveaux scolaires :
                </p>
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

            {/* Restriction d'accès */}
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

          {/* Difficulté */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-white/80">
              Difficulté <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {DIFFICULTIES.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => setDifficulty(d.key)}
                  className={`flex flex-col items-center py-2.5 px-2 rounded-lg ring-1 text-center text-xs font-medium transition ${
                    difficulty === d.key
                      ? d.key === "custom"
                        ? "bg-purple-600/20 ring-purple-500/50 text-purple-300"
                        : "bg-red-600/20 ring-red-500/50 text-red-300"
                      : "bg-white/[0.03] ring-white/10 text-white/50 hover:text-white/70"
                  }`}
                >
                  <span className="font-semibold">{d.label}</span>
                  {d.points !== null && (
                    <span className={`mt-0.5 text-[11px] ${
                      difficulty === d.key ? "text-red-400" : "text-white/30"
                    }`}>{d.points} pts</span>
                  )}
                  {d.key === "custom" && (
                    <span className={`mt-0.5 text-[11px] ${
                      difficulty === d.key ? "text-purple-400" : "text-white/30"
                    }`}>personnalisé</span>
                  )}
                </button>
              ))}
            </div>
            {difficulty === "custom" && (
              <div className="flex items-center gap-3 mt-2">
                <input
                  type="number"
                  min={1}
                  max={MAX_CUSTOM_MISSION_POINTS}
                  value={customPoints}
                  onChange={(e) => setCustomPoints(e.target.value)}
                  placeholder="Points"
                  className="w-32 px-3 py-2 rounded-lg bg-white/[0.04] ring-1 ring-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition"
                />
                <span className="text-sm text-white/40">
                  pts (max&nbsp;<span className="font-semibold text-purple-400">{MAX_CUSTOM_MISSION_POINTS}</span>)
                </span>
              </div>
            )}
            <p className="text-xs text-white/30">
              Chaque participant gagne ces points en personnel. Si plusieurs membres d&apos;une même escouade participent, un bonus escouade s&apos;ajoute.
            </p>
          </div>

          {/* Synopsis */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-white/80">
              Synopsis
            </label>
            <textarea
              rows={4}
              maxLength={2000}
              value={synopsis}
              onChange={(e) => setSynopsis(e.target.value)}
              placeholder="Décrivez la mission, ses enjeux et ses objectifs..."
              className="w-full px-3 py-2 rounded-lg bg-white/[0.04] ring-1 ring-white/10 text-white placeholder:text-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 transition resize-none"
            />
            <p className="text-xs text-white/30 text-right">
              {synopsis.length} / 2000
            </p>
          </div>

          {/* Multiplier reminder */}
          <div className="rounded-xl bg-red-950/30 ring-1 ring-red-500/20 px-4 py-3">
            <p className="text-xs font-semibold text-red-300 mb-1.5">Bonus escouade</p>
            <p className="text-xs text-red-200/60 mb-1.5">
              Chaque participant reçoit les points en personnel. Un bonus escouade s&apos;ajoute quand plusieurs membres participent :
            </p>
            <div className="space-y-1 text-xs text-red-200/60">
              <p>• 3+ membres (ou 2+ si escouade de 3) → <strong className="text-red-300">+50%</strong> en pts escouade</p>
              <p>• Escouade complète → <strong className="text-red-300">+100%</strong> en pts escouade</p>
              <p>• 5+ membres → <strong className="text-red-300">+125%</strong> en pts escouade</p>
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
              className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-sm font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                "Créer la mission"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
