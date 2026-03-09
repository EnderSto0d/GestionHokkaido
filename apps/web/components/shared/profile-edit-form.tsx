"use client";

import { useState } from "react";
import { updateProfile } from "@/app/(dashboard)/profil/actions";
import type { SortsInnes, Specialites, ArtsMartiaux } from "@/types/database";

// ─── Options ──────────────────────────────────────────────────────────────────

const SORTS_INNES: { value: SortsInnes; label: string }[] = [
  { value: "Altération Absolue", label: "Altération Absolue" },
  { value: "Animaux Fantastiques", label: "Animaux Fantastiques" },
  { value: "Boogie Woogie", label: "Boogie Woogie" },
  { value: "Bourrasque", label: "Bourrasque" },
  { value: "Clonage", label: "Clonage" },
  { value: "Corbeau", label: "Corbeau" },
  { value: "Givre", label: "Givre" },
  { value: "Intervalle", label: "Intervalle" },
  { value: "Jardin Floral", label: "Jardin Floral" },
  { value: "Venin", label: "Venin" },
  { value: "Projection Occulte", label: "Projection Occulte" },
  { value: "Rage Volcanique", label: "Rage Volcanique" },
];

const SPECIALITES: { value: Specialites; label: string }[] = [
  { value: "Assassin", label: "Assassin" },
  { value: "Combattant", label: "Combattant" },
  { value: "Support", label: "Support" },
  { value: "Tank", label: "Tank" },
];

const ARTS_MARTIAUX: { value: ArtsMartiaux; label: string }[] = [
  { value: "CorpACorp", label: "Corps à Corps" },
  { value: "Kenjutsu", label: "Kenjutsu" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProfileData = {
  pseudo: string;
  prenom_rp: string | null;
  nom_rp: string | null;
  sort_inne: SortsInnes | null;
  specialite: Specialites | null;
  art_martial: ArtsMartiaux | null;
  reliques: string | null;
  sub_jutsu: string | null;
  style_combat: string | null;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ProfileEditForm({ profile }: { profile: ProfileData }) {
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pseudo, setPseudo] = useState(profile.pseudo);
  const [prenomRp, setPrenomRp] = useState(profile.prenom_rp ?? "");
  const [nomRp, setNomRp] = useState(profile.nom_rp ?? "");
  const [sortInne, setSortInne] = useState<SortsInnes | "">(profile.sort_inne ?? "");
  const [specialite, setSpecialite] = useState<Specialites | "">(profile.specialite ?? "");
  const [artMartial, setArtMartial] = useState<ArtsMartiaux | "">(profile.art_martial ?? "");
  const [reliques, setReliques] = useState(profile.reliques ?? "");
  const [subJutsu, setSubJutsu] = useState(profile.sub_jutsu ?? "");
  const [styleCombat, setStyleCombat] = useState(profile.style_combat ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    const result = await updateProfile({
      pseudo: pseudo !== profile.pseudo ? pseudo : null,
      prenom_rp: prenomRp || null,
      nom_rp: nomRp || null,
      sort_inne: sortInne || null,
      specialite: specialite || null,
      art_martial: artMartial || null,
      reliques: reliques || null,
      sub_jutsu: subJutsu || null,
      style_combat: styleCombat || null,
    });

    setSaving(false);
    if (result.success) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setError(result.error);
    }
  }

  const inputCls =
    "w-full px-3 py-2.5 rounded-xl bg-white/[0.04] ring-1 ring-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-red-500/40 transition-all";
  const labelCls = "block text-xs text-white/50 uppercase tracking-widest font-semibold mb-1.5";
  const selectCls =
    "w-full px-3 py-2.5 rounded-xl bg-[#0a1128] ring-1 ring-white/10 text-sm text-white focus:outline-none focus:ring-red-500/40 transition-all appearance-none [&>option]:bg-[#0a1128] [&>option]:text-white";

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* ── Section : Identité RP ──────────────────────────────── */}
      <div className="space-y-4">
        <SectionHeader
          title="Identité RP"
          desc="Prénom et nom de votre personnage"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Prénom RP</label>
            <input
              type="text"
              value={prenomRp}
              onChange={(e) => setPrenomRp(e.target.value)}
              placeholder="Prénom du personnage"
              maxLength={60}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Nom RP</label>
            <input
              type="text"
              value={nomRp}
              onChange={(e) => setNomRp(e.target.value)}
              placeholder="Nom du personnage"
              maxLength={60}
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className={labelCls}>
            Pseudo (surcharge Discord)
          </label>
          <input
            type="text"
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            placeholder="Pseudo affiché"
            maxLength={60}
            className={inputCls}
          />
          <p className="text-[10px] text-white/25 mt-1">
            Modifier ce champ empêchera la synchronisation automatique avec votre pseudo Discord.
          </p>
        </div>
      </div>

      {/* ── Section : Compétences ──────────────────────────────── */}
      <div className="space-y-4">
        <SectionHeader
          title="Compétences"
          desc="Sort inné, spécialité et style de combat"
        />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Sort Inné</label>
            <select
              value={sortInne}
              onChange={(e) => setSortInne(e.target.value as SortsInnes | "")}
              className={selectCls}
            >
              <option value="">— Aucun —</option>
              {SORTS_INNES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Spécialité</label>
            <select
              value={specialite}
              onChange={(e) => setSpecialite(e.target.value as Specialites | "")}
              className={selectCls}
            >
              <option value="">— Aucune —</option>
              {SPECIALITES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Style de Combat</label>
            <select
              value={artMartial}
              onChange={(e) => setArtMartial(e.target.value as ArtsMartiaux | "")}
              className={selectCls}
            >
              <option value="">— Aucun —</option>
              {ARTS_MARTIAUX.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Style de combat (description libre)</label>
          <input
            type="text"
            value={styleCombat}
            onChange={(e) => setStyleCombat(e.target.value)}
            placeholder="Ex : Combat rapproché et esquive"
            maxLength={200}
            className={inputCls}
          />
        </div>
      </div>

      {/* ── Section : Équipement & Techniques ──────────────────── */}
      <div className="space-y-4">
        <SectionHeader
          title="Équipement & Techniques"
          desc="Reliques, outils maudits et sub jutsu"
        />

        <div>
          <label className={labelCls}>Relique / Outil Maudit</label>
          <textarea
            value={reliques}
            onChange={(e) => setReliques(e.target.value)}
            placeholder="Décrivez votre relique ou outil maudit…"
            maxLength={1000}
            rows={3}
            className={inputCls + " resize-none"}
          />
        </div>

        <div>
          <label className={labelCls}>Sub Jutsu</label>
          <textarea
            value={subJutsu}
            onChange={(e) => setSubJutsu(e.target.value)}
            placeholder="Décrivez votre sub jutsu…"
            maxLength={1000}
            rows={3}
            className={inputCls + " resize-none"}
          />
        </div>
      </div>

      {/* ── Section : Missions (WIP) ───────────────────────────── */}
      <div className="space-y-4">
        <SectionHeader
          title="Missions Complétées"
          desc=""
        />
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/[0.06] ring-1 ring-amber-500/15">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5 text-amber-400 flex-shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
          </svg>
          <div>
            <p className="text-sm text-amber-300 font-medium">En cours de développement</p>
            <p className="text-xs text-white/40 mt-0.5">
              Le suivi des missions complétées sera disponible dans une prochaine mise à jour.
            </p>
          </div>
        </div>
      </div>

      {/* ── Submit ──────────────────────────────────────────────── */}
      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 ring-1 ring-red-500/20 text-sm text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 rounded-xl bg-emerald-500/10 ring-1 ring-emerald-500/20 text-sm text-emerald-400">
          ✅ Profil mis à jour avec succès !
        </div>
      )}
      <button
        type="submit"
        disabled={saving}
        className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? "Enregistrement…" : "Enregistrer les modifications"}
      </button>
    </form>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-gradient-to-r from-red-500/20 via-white/8 to-transparent" />
      <div className="text-center">
        <p className="text-xs text-red-400/70 uppercase tracking-widest font-semibold">
          {title}
        </p>
        {desc && <p className="text-[10px] text-white/25 mt-0.5">{desc}</p>}
      </div>
      <div className="h-px flex-1 bg-gradient-to-l from-red-500/20 via-white/8 to-transparent" />
    </div>
  );
}
