"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState } from "react";
import { upsertPersonnage } from "@/app/(dashboard)/personnages/actions";
import type { SortsInnes, Specialites, ArtsMartiaux, Grades, Divisions, GradeRole, GradeSecondaire } from "@/types/database";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

// ─── Options ────────────────────────────────────────────────────────────────

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

// ─── Zod Schema ─────────────────────────────────────────────────────────────

const SORT_VALUES = SORTS_INNES.map((s) => s.value) as [SortsInnes, ...SortsInnes[]];
const SPECIALITE_VALUES = SPECIALITES.map((s) => s.value) as [Specialites, ...Specialites[]];
const ART_VALUES = ARTS_MARTIAUX.map((a) => a.value) as [ArtsMartiaux, ...ArtsMartiaux[]];

const characterSheetSchema = z.object({
  nom: z
    .string()
    .min(2, { message: "Le nom doit contenir au moins 2 caractères." })
    .max(60, { message: "Le nom ne peut pas dépasser 60 caractères." }),
  sort_inne: z.enum(SORT_VALUES, { required_error: "Veuillez sélectionner un sort inné." }),
  specialite: z.enum(SPECIALITE_VALUES, { required_error: "Veuillez sélectionner une spécialité." }),
  art_martial: z.enum(ART_VALUES, { required_error: "Veuillez sélectionner un art martial." }),
  reliques: z.string().max(1000, {
    message: "Les reliques ne peuvent pas dépasser 1000 caractères.",
  }).optional().default(""),
  sub_jutsu: z.string().max(1000, {
    message: "Les Sub Jutsu ne peuvent pas dépasser 1000 caractères.",
  }).optional().default(""),
});

type CharacterSheetValues = z.infer<typeof characterSheetSchema>;

export type EditingCharacter = {
  id: string;
  nom: string;
  grade: Grades;
  sort_inne: SortsInnes;
  specialite: Specialites;
  art_martial: ArtsMartiaux;
  reliques: string | null;
  sub_jutsu: string | null;
};

// ─── Info utilisateur (grade, divisions, rôle depuis Discord) ────────────────

export type UserDiscordInfo = {
  grade: Grades | null;
  gradeRole: string | null;
  gradeSecondaire: string | null;
  divisions: { division: string; role_division: string }[];
  clans?: { clan: string; role_clan: string }[];
};

// ─── Component ──────────────────────────────────────────────────────────────

type CharacterSheetFormProps = {
  editingCharacter?: EditingCharacter;
  userInfo?: UserDiscordInfo;
  onSuccess?: (personnageId: string) => void;
};

export function CharacterSheetForm({ editingCharacter, userInfo, onSuccess }: CharacterSheetFormProps = {}) {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<CharacterSheetValues>({
    resolver: zodResolver(characterSheetSchema),
    defaultValues: {
      nom: editingCharacter?.nom ?? "",
      sort_inne: editingCharacter?.sort_inne ?? undefined,
      specialite: editingCharacter?.specialite ?? undefined,
      art_martial: editingCharacter?.art_martial ?? undefined,
      reliques: editingCharacter?.reliques ?? "",
      sub_jutsu: editingCharacter?.sub_jutsu ?? "",
    },
  });

  async function onSubmit(values: CharacterSheetValues) {
    setServerError(null);
    const result = await upsertPersonnage({
      id: editingCharacter?.id ?? undefined,
      nom: values.nom,
      sort_inne: values.sort_inne,
      specialite: values.specialite,
      art_martial: values.art_martial,
      reliques: values.reliques || null,
      sub_jutsu: values.sub_jutsu || null,
    });
    if (result.success) {
      if (onSuccess) {
        onSuccess(result.personnageId);
      }
      setSubmitted(true);
    } else {
      setServerError(result.error);
    }
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center gap-4 animate-fade-in">
        {/* Cursed energy pulse */}
        <div className="relative flex items-center justify-center w-20 h-20 mb-2">
          <div className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
          <div className="absolute inset-2 rounded-full bg-red-600/30 animate-pulse" />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="relative z-10 text-red-400 w-9 h-9"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white">Fiche soumise !</h2>
        <p className="text-white/40 text-sm max-w-xs">
          La fiche de votre personnage a bien été enregistrée. L&apos;équipe
          professorale examinera votre candidature dans les plus brefs délais.
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => {
            setSubmitted(false);
            form.reset();
          }}
        >
          Créer un autre personnage
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* ── Section : Identité ─────────────────────────── */}
        <Section
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
            </svg>
          }
          title="Identité"
          description="Informations de base de votre personnage"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nom */}
            <FormField
              control={form.control}
              name="nom"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom du Personnage</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex : Ryomen Sukuna…"
                      autoComplete="off"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Grade (lecture seule — déterminé par Discord) */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70">Grade</label>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.04] ring-1 ring-white/10 min-h-[40px]">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4 text-red-400 flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
                <span className="text-sm text-white/80 font-medium">
                  {userInfo?.grade ?? editingCharacter?.grade ?? "Aucun grade détecté"}
                </span>
              </div>
              <p className="text-[11px] text-white/30">
                Déterminé automatiquement par vos rôles Discord.
              </p>
            </div>
          </div>

          {/* Info badges : Rôle, Divisions, Clans, Niveau */}
          {userInfo && (userInfo.gradeRole || userInfo.divisions.length > 0 || userInfo.gradeSecondaire || (userInfo.clans && userInfo.clans.length > 0)) && (
            <div className="flex flex-wrap gap-2 mt-4">
              {userInfo.gradeRole && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 ring-1 ring-red-500/20 text-xs font-medium text-red-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
                  {userInfo.gradeRole}
                </span>
              )}
              {userInfo.gradeSecondaire && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 ring-1 ring-amber-500/20 text-xs font-medium text-amber-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  {userInfo.gradeSecondaire}
                </span>
              )}
              {userInfo.divisions.map((ud) => (
                <span
                  key={`${ud.division}-${ud.role_division}`}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ring-1 text-xs font-medium ${
                    ud.role_division === "superviseur"
                      ? "bg-orange-500/10 ring-orange-500/20 text-orange-300"
                      : "bg-emerald-500/10 ring-emerald-500/20 text-emerald-300"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${ud.role_division === "superviseur" ? "bg-orange-400" : "bg-emerald-400"}`} />
                  {ud.role_division === "superviseur" ? "Sup." : "Div."} {ud.division}
                </span>
              ))}
              {userInfo.clans && userInfo.clans.map((uc) => (
                <span
                  key={`${uc.clan}-${uc.role_clan}`}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ring-1 text-xs font-medium ${
                    uc.role_clan === "patriarche"
                      ? "bg-purple-500/10 ring-purple-500/20 text-purple-300"
                      : "bg-violet-500/10 ring-violet-500/20 text-violet-300"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${uc.role_clan === "patriarche" ? "bg-purple-400" : "bg-violet-400"}`} />
                  {uc.role_clan === "patriarche" ? "Patriarche" : "Clan"} {uc.clan}
                </span>
              ))}
            </div>
          )}
        </Section>

        {/* ── Section : Capacités ───────────────────────── */}
        <Section
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
            </svg>
          }
          title="Capacités"
          description="Techniques maudites et voie de combat"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Sort Inné */}
            <FormField
              control={form.control}
              name="sort_inne"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sort Inné</FormLabel>
                  <FormControl>
                    <Select {...field}>
                      <SelectItem value="">— Sélectionner —</SelectItem>
                      {SORTS_INNES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Spécialité */}
            <FormField
              control={form.control}
              name="specialite"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Spécialité</FormLabel>
                  <FormControl>
                    <Select {...field}>
                      <SelectItem value="">— Sélectionner —</SelectItem>
                      {SPECIALITES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Art Martial */}
            <FormField
              control={form.control}
              name="art_martial"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Art Martial</FormLabel>
                  <FormControl>
                    <Select {...field}>
                      <SelectItem value="">— Sélectionner —</SelectItem>
                      {ARTS_MARTIAUX.map((a) => (
                        <SelectItem key={a.value} value={a.value}>
                          {a.label}
                        </SelectItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Section>

        {/* ── Section : Équipement & Techniques ─────────── */}
        <Section
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
            </svg>
          }
          title="Équipement & Techniques"
          description="Reliques maudites et sous-techniques maîtrisées"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Reliques */}
            <FormField
              control={form.control}
              name="reliques"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reliques</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Listez les outils ou reliques maudites de votre personnage…"
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Sub Jutsu */}
            <FormField
              control={form.control}
              name="sub_jutsu"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sub Jutsu</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Décrivez les techniques secondaires développées…"
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Section>

        {/* ── Submit ───────────────────────────────────────── */}
        {serverError && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 ring-1 ring-red-500/20 text-red-400">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4 flex-shrink-0 mt-0.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
            </svg>
            <span className="text-sm">{serverError}</span>
          </div>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => form.reset()}
            disabled={form.formState.isSubmitting}
          >
            Réinitialiser
          </Button>
          <Button
            type="submit"
            disabled={form.formState.isSubmitting}
            className="min-w-[160px]"
          >
            {form.formState.isSubmitting ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Envoi en cours…
              </span>
            ) : editingCharacter ? (
              "Enregistrer les modifications"
            ) : (
              "Soumettre la Fiche"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}

// ─── Section wrapper ────────────────────────────────────────────────────────

function Section({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      {/* Coloured top border accent */}
      <div className="h-px w-full bg-gradient-to-r from-red-500/0 via-red-500/60 to-red-500/0" />
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-red-500/15 text-red-400 ring-1 ring-red-500/20">
            {icon}
          </div>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription className="mt-0.5 text-xs">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
