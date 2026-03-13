"use client";

import { useState, useMemo, useCallback, Fragment } from "react";

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Types                                                                     */
/* ═══════════════════════════════════════════════════════════════════════════ */

type Access = "all" | "staff" | "admin";

interface WikiPage {
  id: string;
  title: string;
  icon: React.ReactNode;
  category: string;
  badge?: string;
  badgeColor?: string;
  keywords: string[];
  access: Access;
  content: (ctx: ContentCtx) => React.ReactNode;
}

interface ContentCtx {
  isProfOrAdmin: boolean;
  canSeeStaff: boolean;
  isAdmin: boolean;
}

interface GuideWikiProps {
  role: string;
  isStrategie: boolean;
  isProfOrAdmin: boolean;
  canSeeStaff: boolean;
  isAdmin: boolean;
  badgeLabel: string;
  badgeColor: string;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Icônes                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function IconBook() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
    </svg>
  );
}

function IconUser() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c-4.5 1.8-8 3-8 9 0 5.4 4.8 9 8 9s8-3.6 8-9c0-6-3.5-7.2-8-9Z" />
    </svg>
  );
}

function IconTrophy() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 18.75h-9m9 0a3 3 0 0 1 3 3h-15a3 3 0 0 1 3-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 0 1-.982-3.172M9.497 14.25a7.454 7.454 0 0 0 .981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 0 0 7.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M7.73 9.728a6.726 6.726 0 0 0 2.748 1.35m8.272-6.842V4.5c0 2.108-.966 3.99-2.48 5.228m2.48-5.492a46.32 46.32 0 0 1 2.916.52 6.003 6.003 0 0 1-5.395 4.972m0 0a6.726 6.726 0 0 1-2.749 1.35m0 0a6.772 6.772 0 0 1-3.044 0" />
    </svg>
  );
}

function IconCouncil() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
    </svg>
  );
}

function IconCog() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

function IconChart() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  );
}

function IconSword() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 4.5 7.5 7.5-7.5 7.5m-6-15 7.5 7.5-7.5 7.5" />
    </svg>
  );
}

function IconStar() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
    </svg>
  );
}

function IconPlusCircle() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function IconDiscord() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03Z" />
    </svg>
  );
}

function IconTransfer() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
  );
}

function IconMenu() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

function IconBack() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
    </svg>
  );
}

function IconHome() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  );
}

function IconBox() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Helper Components                                                         */
/* ═══════════════════════════════════════════════════════════════════════════ */

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-amber-500/[0.06] ring-1 ring-amber-500/[0.12] text-amber-200/70 text-xs leading-relaxed">
      <span className="mt-0.5 text-amber-400 flex-shrink-0">💡</span>
      <span>{children}</span>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 pl-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400/40 flex-shrink-0" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Categories                                                                */
/* ═══════════════════════════════════════════════════════════════════════════ */

const CATEGORIES = [
  { id: "general", label: "Général", color: "text-red-400" },
  { id: "gameplay", label: "Jeu & Compétition", color: "text-emerald-400" },
  { id: "staff", label: "Équipe Professorale", color: "text-purple-400" },
  { id: "admin", label: "Administrateur", color: "text-red-400" },
  { id: "reference", label: "Référence", color: "text-amber-400" },
] as const;

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Wiki pages data                                                           */
/* ═══════════════════════════════════════════════════════════════════════════ */

function buildPages(): WikiPage[] {
  return [
    /* ── Général ── */
    {
      id: "connexion",
      title: "Connexion & Discord",
      icon: <IconDiscord />,
      category: "general",
      badge: "Tous",
      badgeColor: "bg-red-500/20 text-red-300",
      keywords: ["discord", "connexion", "login", "authentification", "sync", "synchronisation", "rôle", "avatar", "pseudo"],
      access: "all",
      content: () => (
        <>
          <p>
            L&apos;intranet utilise <strong className="text-white/70">Discord</strong> comme méthode d&apos;authentification unique.
            Lors de votre première connexion, un compte est automatiquement créé avec votre pseudo et avatar Discord.
          </p>
          <BulletList items={[
            "Cliquez sur « Se connecter avec Discord » depuis la page d'accueil.",
            "Autorisez l'application à accéder à vos informations Discord.",
            "Vous êtes redirigé vers votre profil. C'est tout !",
          ]} />
          <p className="font-medium text-white/60">Synchronisation Discord :</p>
          <BulletList items={[
            "Vos rôles Discord (grade, grade RP, classe, divisions) sont synchronisés automatiquement chaque jour via un job automatique.",
            "Vous pouvez lancer la synchronisation manuellement depuis votre profil avec le bouton « Sync Discord ».",
            "Si vous définissez un pseudo personnalisé ou un avatar personnalisé, la sync Discord ne les écrasera pas (flags pseudo_custom / avatar_custom).",
          ]} />
          <Tip>
            La synchronisation met à jour : rôle applicatif (élève/prof/admin), grade de puissance, grade-role hiérarchique, année scolaire, et toutes vos divisions.
          </Tip>
        </>
      ),
    },
    {
      id: "profil",
      title: "Mon Profil",
      icon: <IconUser />,
      category: "general",
      badge: "Tous",
      badgeColor: "bg-red-500/20 text-red-300",
      keywords: ["profil", "personnage", "avatar", "pseudo", "fiche", "radar", "compétences", "sort", "spécialité", "art martial", "relique", "points personnels", "historique points"],
      access: "all",
      content: () => (
        <>
          <p>
            Votre profil rassemble toutes les informations de votre personnage au sein de l&apos;école.
          </p>
          <p className="font-medium text-white/60">Informations affichées :</p>
          <BulletList items={[
            "En-tête : avatar, nom RP (ou pseudo), badge de rôle (Élève / Professeur / Professeur Principal / Co-Directeur / Directeur / Administrateur).",
            "Badges : grade de puissance, grade-role hiérarchique, année scolaire, et toutes vos divisions (avec distinction Membre / Superviseur).",
            "Graphique radar : moyenne de vos évaluations sur 6 compétences (Énergie Occulte, Force Physique, Agilité, Intelligence Tactique, Maîtrise du Sort, Travail d'Équipe) — échelle 0 à 20.",
            "Carte escouade : si vous êtes dans une escouade, elle s'affiche avec votre rôle (Chef / Membre) et les points.",
            "Invitations en attente : acceptez ou déclinez les invitations d'escouades directement depuis votre profil.",
            "Points personnels : votre total de points personnels est visible sur votre profil. Cliquez sur « Historique » pour consulter l'ensemble des points reçus (source, montant, attributeur, date) dans une fenêtre dédiée.",
          ]} />
          <p className="font-medium text-white/60">Modifier mon personnage :</p>
          <BulletList items={[
            "Pseudo personnalisé : modifiez votre pseudo sans qu'il soit écrasé par la sync Discord.",
            "Fiche RP : prénom, nom, sort inné, spécialité, art martial, reliques, sub-jutsu, style de combat.",
            "Avatar personnalisé : si vous définissez un avatar custom, il est protégé de la synchronisation Discord.",
          ]} />
          <Tip>
            Toutes les modifications RP sont instantanées. Le pseudo personnalisé et l&apos;avatar personnalisé sont protégés de la synchronisation automatique Discord — vous gardez le contrôle.
          </Tip>
        </>
      ),
    },

    /* ── Jeu & Compétition ── */
    {
      id: "escouades",
      title: "Escouades",
      icon: <IconShield />,
      category: "gameplay",
      badge: "Tous",
      badgeColor: "bg-emerald-500/20 text-emerald-300",
      keywords: ["escouade", "équipe", "chef", "membre", "créer", "inviter", "exclure", "transférer", "supprimer", "rôle discord", "officielle"],
      access: "all",
      content: ({ isProfOrAdmin, isAdmin }) => (
        <>
          <p>
            Les escouades sont des équipes de joueurs qui collaborent ensemble. Elles sont au cœur de la compétition entre élèves.
          </p>
          <p className="font-medium text-white/60">Création & Règles :</p>
          <BulletList items={[
            "Cliquez sur « Créer une escouade », choisissez un nom unique. Un rôle Discord est automatiquement créé et vous est attribué.",
            "Vous devenez automatiquement le chef de l'escouade.",
            "Chaque utilisateur ne peut être que dans 1 escouade à la fois.",
            "Maximum 5 membres par escouade.",
            "Minimum 3 membres pour être « officielle » et apparaître dans le classement.",
            "Les escouades avec moins de 3 membres sont visibles dans une section « en formation ».",
          ]} />
          <p className="font-medium text-white/60">Actions du Chef :</p>
          <BulletList items={[
            "Inviter des membres (recherche parmi les utilisateurs qui ne sont pas déjà dans une escouade).",
            "Exclure des membres de l'escouade.",
            "Transférer la propriété à un autre membre de l'escouade.",
            "Personnaliser l'escouade : description (max 2000 caractères), logo, bannière, et 3 photos de galerie (via URL).",
            "Supprimer l'escouade (confirmation par saisie du nom requise). Le rôle Discord est supprimé automatiquement.",
          ]} />
          <p className="font-medium text-white/60">Actions des Membres :</p>
          <BulletList items={[
            "Quitter l'escouade librement (le chef doit transférer la propriété avant de quitter). Une pénalité est déduite des points d'escouade (fraction proportionnelle), mais vos points personnels sont conservés à 100%.",
            "Accepter ou refuser les invitations depuis la page profil.",
          ]} />
          <p>
            <strong className="text-white/70">Page de détail :</strong> en cliquant sur une escouade, vous accédez à sa page complète avec bannière, galerie photos, description, liste des membres et points.
          </p>
          {(isProfOrAdmin || isAdmin) && (
            <Tip>
              Les administrateurs Directeurs et Co-Directeurs peuvent aussi supprimer n&apos;importe quelle escouade depuis sa page de détail.
            </Tip>
          )}
          <Tip>
            Lorsqu&apos;un joueur rejoint ou quitte une escouade, le rôle Discord de l&apos;escouade est automatiquement ajouté ou retiré.
          </Tip>
        </>
      ),
    },
    {
      id: "invitations",
      title: "Système d'Invitations",
      icon: <IconTransfer />,
      category: "gameplay",
      badge: "Tous",
      badgeColor: "bg-emerald-500/20 text-emerald-300",
      keywords: ["invitation", "inviter", "accepter", "refuser", "recruter", "escouade"],
      access: "all",
      content: () => (
        <>
          <p>
            Les invitations permettent au chef d&apos;une escouade de recruter de nouveaux membres.
          </p>
          <BulletList items={[
            "Le chef envoie une invitation à un utilisateur qui n'est pas déjà dans une escouade.",
            "Le destinataire voit l'invitation sur sa page Profil dans la section « Invitations en attente ».",
            "Accepter : l'utilisateur rejoint l'escouade et reçoit le rôle Discord. Refusé si l'escouade est pleine (5 membres max) ou s'il est déjà dans une autre escouade.",
            "Refuser : l'invitation est marquée comme refusée. Les anciennes invitations refusées sont automatiquement nettoyées.",
            "Impossible de s'inviter soi-même ou d'envoyer un doublon d'invitation en attente.",
          ]} />
        </>
      ),
    },
    {
      id: "classement",
      title: "Classement",
      icon: <IconTrophy />,
      category: "gameplay",
      badge: "Tous",
      badgeColor: "bg-emerald-500/20 text-emerald-300",
      keywords: ["classement", "points", "podium", "escouade", "médaille", "score", "compétition", "lundi"],
      access: "all",
      content: () => (
        <>
          <p>
            Le classement affiche toutes les escouades officielles (3+ membres) triées par <strong className="text-white/70">Points totaux</strong>, du plus élevé au plus bas.
          </p>

          <p className="font-medium text-white/60">Trois types de points :</p>
          <BulletList items={[
            "Points personnels — liés à votre compte. Ils ne diminuent JAMAIS. Sources : participation aux missions (pts individuels, sans multiplicateur), attribution manuelle par les professeurs (raisons prédéfinies ou personnalisées), et bonus logistique (5% de vos points logistiques, plafonné à +200 pts max).",
            "Points d'escouade — liés à l'escouade (réserve collective). Sources : missions (points de base × multiplicateur × nb de membres de l'escouade ayant participé), hauts faits attribués par les professeurs. Divisés par 2 chaque lundi à 4h (UTC).",
            "Points totaux = somme des points personnels de tous les membres actuels + points d'escouade. C'est ce score qui détermine le classement.",
          ]} />

          <p className="font-medium text-white/60">Classement des escouades :</p>
          <BulletList items={[
            "Podium : les 3 premières escouades sont mises en avant avec des médailles (🥇 🥈 🥉).",
            "Les autres escouades sont listées avec une barre de progression relative au meilleur score.",
            "Minimum 500 pts totaux pour figurer dans le classement principal.",
          ]} />
          <p className="font-medium text-white/60">Classement personnel :</p>
          <BulletList items={[
            "Un classement individuel (Top 20) est disponible dans l'onglet « Classement Personnel ».",
            "Classé par points personnels (qui ne diminuent jamais).",
            "Le 1er du classement personnel occupe automatiquement un siège au Conseil des Élèves (après 24h en 1ère position). S'il perd la 1ère place, il a 24h pour la récupérer.",
          ]} />
          <Tip>
            Chaque lundi à 4h du matin (UTC), les <strong className="text-white/70">points d&apos;escouade</strong> sont divisés par 2 (arrondis vers zéro). Vos points personnels ne sont jamais affectés. Restez actifs pour maintenir votre position !
          </Tip>
        </>
      ),
    },
    {
      id: "conseil",
      title: "Conseil des Élèves",
      icon: <IconCouncil />,
      category: "gameplay",
      badge: "Tous",
      badgeColor: "bg-emerald-500/20 text-emerald-300",
      keywords: ["conseil", "élection", "vote", "siège", "chef", "proposition", "rétrogradation", "veto", "joker", "élu"],
      access: "all",
      content: ({ canSeeStaff }) => (
        <>
          <p>
            Le Conseil des Élèves est l&apos;organe de gouvernance étudiante. Il est composé de <strong className="text-white/70">7 sièges</strong> :
            3 sièges <strong className="text-orange-300">Élu Escouade</strong> (élus par les membres du top 3 escouades),
            1 siège <strong className="text-red-300">Classement Personnel</strong> (1er au classement individuel, après 24h en 1ère position),
            3 sièges <strong className="text-purple-300">Joker</strong> (nommés par le staff),
            et 1 <strong className="text-amber-300">Chef du conseil</strong> élu en interne.
          </p>
          <p>
            La page du Conseil est divisée en <strong className="text-white/70">4 onglets</strong> :
          </p>
          <p className="font-medium text-white/60">1. Conseil (Vue d&apos;ensemble) :</p>
          <BulletList items={[
            "Visualisation en demi-cercle des 7 sièges (rouge = classement perso, orange = escouade, violet = joker, ambre = chef). Il faut minimum 3 escouades dans le top 3 pour lancer une élection.",
            "Liste des membres avec nom, grade, type de siège (Élu / Joker) et badge de chef.",
            "Si une élection est en cours, les votes apparaissent directement sous forme de cartes.",
          ]} />
          <p className="font-medium text-white/60">2. Propositions :</p>
          <BulletList items={[
            "Les membres du conseil peuvent soumettre des propositions : « Générale » ou « Rétrogradation ».",
            "Votes possibles : Pour, Contre, Neutre.",
            "Tampon de 1 heure : après le vote final, un délai d'1 heure s'écoule avant l'exécution. Pendant ce temps, un membre peut changer son vote pour bloquer la proposition.",
            "Proposition de rétrogradation : peut bannir un utilisateur de toute montée en rang scolaire (Seconde → Première → Terminal) pendant 1 à 168 heures (7 jours max). Le conseil ne peut pas modifier les grades de puissance (Classe 4, Classe 3, etc.).",
            "Droit de veto du Directeur sur les propositions.",
            "Veto collectif des Professeurs Principaux : si tous les PP votent contre, la proposition est bloquée.",
            "Historique complet de toutes les propositions passées et liste des bans actifs.",
          ]} />
          <p className="font-medium text-white/60">3. Élections :</p>
          <BulletList items={[
            "Élection du Chef : les membres du conseil élisent un chef parmi eux. Minimum 5 membres actifs requis. Délai de 7 jours entre deux élections.",
            "Le chef est automatiquement déposé s'il est promu Exorciste Pro ou si le nombre de membres tombe sous 5.",
            "Élection Élu Élève : seuls les membres du top 3 de chaque escouade officielle peuvent voter (jusqu'à 3 votes). Il faut minimum 3 escouades dans le top 3.",
            "Élection Élu Joker : les professeurs et admins votent pour nommer les 3 sièges joker (3 votes chacun).",
          ]} />
          {canSeeStaff && (
            <>
              <p className="font-medium text-white/60">4. Gestion (Prof/Admin uniquement) :</p>
              <BulletList items={[
                "Lancer une nouvelle élection (Élu Élève ou Élu Joker).",
                "Nomination directe d'un membre à un siège (avec recherche par nom).",
                "Révoquer un membre du conseil.",
                "Système d'annulation d'élection avec 3 voies :",
              ]} />
              <div className="pl-5 mt-1 space-y-1">
                <BulletList items={[
                  "Vote de 75% de tous les professeurs/admins.",
                  "Unanimité de tous les Professeurs Principaux.",
                  "Annulation immédiate par le Directeur ou Co-Directeur.",
                ]} />
              </div>
            </>
          )}
          <Tip>
            Lorsqu&apos;un membre est élu ou révoqué du conseil, le rôle Discord « Conseil » est automatiquement ajouté ou retiré.
          </Tip>
        </>
      ),
    },
    {
      id: "missions",
      title: "Missions",
      icon: <IconSword />,
      category: "gameplay",
      badge: "Tous",
      badgeColor: "bg-emerald-500/20 text-emerald-300",
      keywords: ["mission", "quête", "RP", "participer", "rejoindre", "points", "escouade", "discord", "embed", "inscription", "récompense", "multiplicateur", "historique"],
      access: "all",
      content: () => (
        <>
          <p>
            Les missions sont des événements RP organisés par des utilisateurs autorisés. Participer à une mission
            rapporte des <strong className="text-white/70">points personnels</strong> et des <strong className="text-white/70">points d&apos;escouade</strong> distribués à la clôture.
          </p>

          <p className="font-medium text-white/60">Parcourir les missions :</p>
          <BulletList items={[
            "La page Missions liste toutes les missions actives en cours.",
            "Chaque carte affiche : titre, date/heure prévue, points par participant, capacité maximale et nombre d'inscrits.",
            "Cliquez sur une mission pour accéder à sa page de détail avec le synopsis complet et la liste des participants groupés par escouade.",
            "Un lien « Historique » permet de consulter les missions passées (terminées et annulées) — accessible aux professeurs, administrateurs et membres du conseil.",
          ]} />

          <p className="font-medium text-white/60">Rejoindre & quitter :</p>
          <BulletList items={[
            "Sur la page de détail, cliquez sur « ✦ Rejoindre la mission » pour vous inscrire.",
            "Conditions : la mission doit être active et des places doivent être disponibles (si la capacité est limitée).",
            "Cliquez sur « Se désinscrire de la mission » pour annuler votre inscription à tout moment.",
            "L'embed Discord de la mission est mis à jour automatiquement après chaque inscription ou désinscription.",
          ]} />

          <p className="font-medium text-white/60">Statuts de mission :</p>
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: "Active", color: "bg-red-500/10 ring-red-500/20 text-red-300" },
              { label: "Terminée", color: "bg-green-500/10 ring-green-500/20 text-green-300" },
              { label: "Annulée", color: "bg-white/[0.04] ring-white/[0.08] text-white/40" },
            ].map(({ label, color }) => (
              <span key={label} className={`px-2.5 py-0.5 rounded-md ring-1 text-xs font-medium ${color}`}>{label}</span>
            ))}
          </div>

          <p className="font-medium text-white/60 mt-4">Récompenses :</p>
          <BulletList items={[
            "Points personnels — chaque participant reçoit les points individuels de la mission directement sur son compte (sans multiplicateur). Ces points ne diminuent jamais.",
            "Points d'escouade — l'escouade reçoit : points de base × multiplicateur × nombre de ses membres ayant participé. Plus il y a de membres de la même escouade dans la mission, plus le multiplicateur est élevé.",
            "Multiplicateurs : ×1 (participant seul), ×1.5 (3+ membres, ou 2+ pour une escouade de 3), ×2 (escouade au grand complet), ×2.25 (5 membres ou plus présents).",
            "Les participants sans escouade reçoivent leurs points personnels mais ne génèrent pas de points d'escouade.",
          ]} />

          <Tip>
            Exemple : mission à 50 pts, 3 membres d&apos;une escouade de 5 participent → chacun reçoit <strong className="text-white/70">50 pts personnels</strong>, et l&apos;escouade gagne <strong className="text-white/70">50 × 1.5 × 3 = 225 pts d&apos;escouade</strong> (multiplicateur ×1.5 pour 3 participants).
          </Tip>

          <p className="font-medium text-white/60">Intégration Discord :</p>
          <BulletList items={[
            "Chaque mission créée génère automatiquement un embed dans le canal Discord dédié.",
            "L'embed contient : titre, date/heure, places disponibles, points de récompense et un bouton « Voir & Rejoindre la Mission ».",
            "Selon la configuration, un ping est envoyé aux cibles définies par le créateur (@everyone, Élève Exorciste, escouades spécifiques, etc.).",
            "L'embed se met à jour en temps réel (places restantes, total des inscrits).",
            "À la clôture, un embed récapitulatif est publié avec les gains de points de chaque escouade.",
          ]} />
        </>
      ),
    },
    {
      id: "creer-mission",
      title: "Créer une Mission",
      icon: <IconPlusCircle />,
      category: "gameplay",
      badge: "Autorisés",
      badgeColor: "bg-amber-500/20 text-amber-300",
      keywords: ["créer", "mission", "formulaire", "ping", "discord", "embed", "capacité", "points", "synopsis", "clôturer", "annuler", "créateur", "restreindre", "clan", "grade"],
      access: "all",
      content: () => (
        <>
          <p className="font-medium text-white/60">Qui peut créer une mission ?</p>
          <p className="text-sm text-white/50 mb-2">
            La création est ouverte si <em>au moins une</em> des conditions suivantes est remplie :
          </p>
          <BulletList items={[
            "Avoir le rôle Professeur ou Administrateur (dans la base de données).",
            "Avoir un grade-rôle Exorciste Pro ou supérieur (Professeur, Professeur Principal, Co-Directeur, Directeur).",
            "Être membre actif du Conseil des Élèves.",
            "Détenir le rôle Discord spécial accordé par les administrateurs.",
          ]} />

          <p className="font-medium text-white/60">Créer la mission :</p>
          <BulletList items={[
            "Cliquez sur « + Créer une mission » en haut de la page Missions — ce bouton est visible uniquement pour les utilisateurs autorisés.",
            "Un formulaire modal s'ouvre. Remplissez les champs souhaités puis soumettez.",
          ]} />

          <p className="font-medium text-white/60">Champs du formulaire :</p>
          <BulletList items={[
            "Nom (obligatoire, max 200 caractères) — le titre affiché partout.",
            "Date / Heure (optionnel) — date et heure prévues pour le déroulement.",
            "Capacité — nombre maximum de participants ou « Illimité » pour n'imposer aucune limite.",
            "Points d'escouade — de 0 à 50 pts par participant (maximum : 50 pts). Ces points servent de base aux calculs de multiplicateurs et sont attribués aux escouades.",
            "Points individuels — de 0 à 50 pts par participant (maximum : 50 pts). Ces points sont attribués directement au compteur personnel de chaque participant (sans multiplicateur).",
            "Synopsis (optionnel) — description narrative ou directives RP de la mission.",
          ]} />

          <p className="font-medium text-white/60">Ping Discord :</p>
          <p className="text-sm text-white/50 mb-2">
            Définissez qui sera notifié sur Discord lors de la publication (options cumulables) :
          </p>
          <BulletList items={[
            "@everyone — ping le serveur entier (une confirmation est demandée).",
            "Élève Exorciste — tous les élèves du serveur.",
            "Escouades spécifiques — sélectionnez une ou plusieurs escouades dans la liste.",
            "Clans — Kamo, Inumaki, Zenin, Gojo.",
            "Grades de puissance — Classe 4, Classe 3, …, Classe Apo.",
            "Grades-rôles — Élève Exorciste, Exorciste Pro, Professeur, …, Directeur.",
            "Année scolaire — Seconde, Première, Terminal.",
          ]} />
          <Tip>
            Option <strong className="text-white/70">« Restreindre »</strong> : si activée, seuls les utilisateurs correspondant aux cibles du ping peuvent s&apos;inscrire. Sans cette option, tout le monde peut participer quelle que soit la cible de ping choisie.
          </Tip>

          <p className="font-medium text-white/60">Après la création :</p>
          <BulletList items={[
            "Un embed Discord est automatiquement posté dans le canal dédié avec un bouton de lien vers la page de la mission.",
            "L'embed se met à jour à chaque inscription ou désinscription (places restantes, total des inscrits).",
            "Vous êtes redirigé vers la page de détail de la mission créée.",
          ]} />

          <p className="font-medium text-white/60">Contrôles du créateur :</p>
          <p className="text-sm text-white/50 mb-2">
            Sur la page de détail d&apos;une mission que vous avez créée, deux boutons apparaissent (visibles uniquement par vous) :
          </p>
          <BulletList items={[
            "« Clôturer & distribuer les points » — termine la mission et distribue les points d'escouade (avec multiplicateurs) et les points individuels (sans multiplicateur) à tous les participants. Un embed récapitulatif est publié sur Discord.",
            "« Annuler la mission » — annule sans distribuer aucun point. L'embed Discord est mis à jour pour indiquer la clôture.",
          ]} />
          <Tip>
            Chaque bouton nécessite une <strong className="text-white/70">double confirmation</strong> : le premier clic change le bouton en mode confirmation (couleur + nouveau libellé), le second clic exécute l&apos;action.
          </Tip>
        </>
      ),
    },
    {
      id: "divisions",
      title: "Divisions",
      icon: <IconStar />,
      category: "gameplay",
      badge: "Tous",
      badgeColor: "bg-emerald-500/20 text-emerald-300",
      keywords: ["division", "judiciaire", "médical", "académie", "scientifique", "disciplinaire", "stratégie", "diplomatie", "production", "superviseur"],
      access: "all",
      content: () => (
        <>
          <p>
            Chaque utilisateur peut appartenir à une ou plusieurs <strong className="text-white/70">divisions</strong> de l&apos;école.
            Les divisions sont synchronisées depuis vos rôles Discord.
          </p>
          <BulletList items={[
            "8 divisions : Judiciaire, Médical, Académie, Scientifique, Disciplinaire, Stratégie, Diplomatie, Production et Logistique.",
            "Un utilisateur peut appartenir à plusieurs divisions simultanément.",
            "Au sein de chaque division, vous pouvez être Membre ou Superviseur (affiché avec des badges différents sur votre profil).",
            "La division Stratégie donne accès aux pages Administration et Évaluation, même pour les élèves (accès en lecture).",
          ]} />
          <Tip>
            Les divisions sont synchronisées via la correspondance avec les rôles Discord. Chaque rôle Discord de division est mappé automatiquement lors de la synchronisation.
          </Tip>
        </>
      ),
    },

    {
      id: "logistique",
      title: "Production & Logistique",
      icon: <IconBox />,
      category: "gameplay",
      badge: "P&L",
      badgeColor: "bg-orange-500/20 text-orange-300",
      keywords: ["logistique", "production", "don", "items", "points", "bonus", "catalogue", "contribution", "matériaux", "p&l"],
      access: "all",
      content: () => (
        <>
          <p>
            La section Production &amp; Logistique permet de suivre les contributions des membres aux ressources de l&apos;école.
            Les dons enregistrés génèrent des <strong className="text-white/70">points logistiques</strong> qui se convertissent en bonus sur vos points personnels.
          </p>
          <p className="font-medium text-white/60">Fonctionnement des points logistiques :</p>
          <BulletList items={[
            "Chaque don est associé à un item du catalogue et à une quantité. Les points logistiques s'accumulent avec chaque enregistrement.",
            "Un bonus de 5% de vos points logistiques est automatiquement converti en points personnels, plafonné à 200 pts de bonus maximum.",
            "Formule : Bonus = floor( min( points_logistiques × 0.05, 200 ) )",
            "Ces points personnels bonus NE diminuent pas (contrairement aux points d'escouade).",
          ]} />
          <p className="font-medium text-white/60">Catalogue d&apos;items :</p>
          <BulletList items={[
            "Le catalogue est configuré par les administrateurs : chaque item possède un nom, une catégorie et une valeur en points par unité.",
            "Les items sont regroupés par catégorie pour faciliter la sélection lors d'un don.",
            "Seuls les items actifs apparaissent dans le formulaire de don.",
          ]} />
          <p className="font-medium text-white/60">Enregistrer un don :</p>
          <BulletList items={[
            "Sélectionnez l'item dans le catalogue et indiquez la quantité donnée.",
            "Recherchez le donneur parmi les membres (saisie automatique).",
            "Le don est enregistré et les points logistiques du donneur sont mis à jour immédiatement.",
            "Le bonus de points personnels est recalculé automatiquement.",
          ]} />
          <p className="font-medium text-white/60">Historique des dons :</p>
          <BulletList items={[
            "Un tableau récapitulatif liste tous les dons par donneur (triable et filtrable).",
            "Cliquez sur un donneur pour afficher son historique de dons détaillé avec les dates et montants.",
          ]} />
          <Tip>
            Les points logistiques ne comptent PAS directement dans le classement — seul le bonus (5%, max +200 pts) est ajouté à vos points personnels. L&apos;accès à cette section est réservé aux membres de la division Production &amp; Logistique, aux Directeurs et aux administrateurs.
          </Tip>
        </>
      ),
    },

    /* ── Staff ── */
    {
      id: "administration",
      title: "Administration",
      icon: <IconCog />,
      category: "staff",
      badge: "Staff",
      badgeColor: "bg-purple-500/20 text-purple-300",
      keywords: ["administration", "admin", "utilisateur", "grade", "promotion", "exorciste", "rétrogradation", "année", "gestion"],
      access: "staff",
      content: ({ isProfOrAdmin }) => (
        <>
          <p>
            La page Administration vous permet de gérer l&apos;ensemble des utilisateurs de l&apos;école.
          </p>
          <p className="font-medium text-white/60">Consultation :</p>
          <BulletList items={[
            "Liste complète des utilisateurs avec recherche et filtres.",
            "Profil détaillé de chaque élève : fiche personnage RP, historique des évaluations individuelles, et graphique radar de compétences.",
          ]} />
          <p className="font-medium text-white/60">Gestion des points d&apos;escouade :</p>
          <BulletList items={[
            "Un tableau de bord des escouades affiche leur score actuel avec un podium pour le top 3.",
            "Utilisez les boutons +10 / −10 pour ajuster rapidement les points d'une escouade (mise à jour optimiste avec annulation en cas d'erreur).",
          ]} />
          {isProfOrAdmin ? (
            <>
              <p className="font-medium text-white/60">Actions de gestion (Prof/Admin) :</p>
              <BulletList items={[
                "Modifier l'année scolaire d'un élève (Seconde → Première → Terminal). Les rôles Discord sont mis à jour automatiquement.",
                "Promouvoir un élève au rang d'Exorciste Pro — effets en cascade :",
              ]} />
              <div className="pl-5 mt-1 space-y-1">
                <BulletList items={[
                  "L'élève est automatiquement retiré de son escouade. S'il était chef, la propriété est transférée au membre le plus ancien.",
                  "L'élève est retiré du conseil des élèves (le cas échéant).",
                  "Ses rôles Discord sont mis à jour (suppression rôle élève/escouade, ajout rôle Exorciste Pro).",
                ]} />
              </div>
              <BulletList items={[
                "Rétrograder un utilisateur au rang d'Élève Exorciste + Seconde. Cette action ne s'applique qu'aux élèves dont le rang scolaire est Seconde, Première ou Terminal. Le Directeur / Co-Directeur peut rétrograder au-delà du rang Exorciste Pro. Impossible de rétrograder un Directeur.",
              ]} />
              <Tip>
                La promotion en Exorciste Pro est une action majeure et irréversible depuis cette interface. L&apos;élève perd définitivement son escouade et son siège au conseil.
              </Tip>
            </>
          ) : (
            <Tip>
              En tant que membre de la division Stratégie, vous avez un accès en lecture seule. Les actions de modification de grade ne sont disponibles que pour les professeurs et administrateurs.
            </Tip>
          )}
        </>
      ),
    },
    {
      id: "evaluation",
      title: "Évaluation",
      icon: <IconChart />,
      category: "staff",
      badge: "Staff",
      badgeColor: "bg-purple-500/20 text-purple-300",
      keywords: ["évaluation", "note", "compétence", "radar", "hauts faits", "points", "escouade", "individuel"],
      access: "staff",
      content: () => (
        <>
          <p>
            Le système d&apos;évaluation permet de noter les élèves individuellement et d&apos;attribuer des points aux escouades.
          </p>
          <p className="font-medium text-white/60">Évaluation individuelle (Radar) :</p>
          <BulletList items={[
            "Sélectionnez un élève et notez-le sur 6 compétences (note de 0 à 20) :",
            "Énergie Occulte — Force Physique — Agilité — Intelligence Tactique — Maîtrise du Sort — Travail d'Équipe.",
            "Chaque évaluateur n'a qu'une seule évaluation radar active par élève. Si elle existe déjà, elle est mise à jour.",
            "Les notes de tous les évaluateurs sont moyennées et affichées sur le radar du profil de l'élève.",
          ]} />
          <p className="font-medium text-white/60">Évaluation individuelle (Compétence) :</p>
          <BulletList items={[
            "Notez un élève sur une compétence spécifique avec un commentaire détaillé.",
            "Ces évaluations individuelles sont consultables dans le profil admin de l'élève (historique complet).",
          ]} />
          <p className="font-medium text-white/60">Hauts Faits d&apos;escouade :</p>
          <BulletList items={[
            "Attribuez ou retirez des points à une escouade officielle (3+ membres), entre -1000 et +1000 par action.",
            "Chaque modification est accompagnée d'une raison obligatoire et enregistrée dans un journal d'audit (Hauts Faits).",
            "L'historique des points est consultable pour chaque escouade.",
            "Les points contribuent au classement général des escouades.",
          ]} />
          <p className="font-medium text-white/60">Attribution de points personnels :</p>
          <BulletList items={[
            "Sélectionnez un élève et choisissez parmi 9 raisons prédéfinies avec montants fixes (ex : Assiduité en cours +5, Très impactant lors de scène importante +30).",
            "Une option « Raison personnalisée » permet de saisir librement la justification et le nombre de points.",
            "Chaque attribution est enregistrée dans l'historique des points personnels de l'élève (consultable depuis son profil).",
          ]} />
          <Tip>
            Les points d&apos;escouade subissent une décroissance de 50% chaque lundi (arrondi vers zéro). Les évaluations individuelles et les points personnels, eux, restent permanents.
          </Tip>
        </>
      ),
    },

    /* ── Admin ── */
    {
      id: "droits-admin",
      title: "Droits Administrateur",
      icon: <IconCog />,
      category: "admin",
      badge: "Admin",
      badgeColor: "bg-red-500/20 text-red-300",
      keywords: ["admin", "administrateur", "supprimer", "veto", "élection", "nomination", "directeur"],
      access: "admin",
      content: () => (
        <>
          <p>
            En tant qu&apos;administrateur, vous disposez de droits supplémentaires sur l&apos;ensemble du système.
          </p>
          <BulletList items={[
            "Supprimer des comptes utilisateurs (action irréversible).",
            "Supprimer n'importe quelle escouade (Directeur / Co-Directeur).",
            "Accéder à toutes les fonctionnalités professeurs sans restriction.",
            "Nommer directement des membres aux sièges du Conseil (Élu Élève ou Élu Joker).",
            "Lancer et annuler les élections du Conseil.",
            "Révoquer des membres du Conseil.",
            "Droit de veto sur les propositions du Conseil (en tant que Directeur).",
            "Annulation immédiate d'élection (Directeur / Co-Directeur).",
            "Toutes les actions de grade et de promotion sans restriction de grade-role.",
          ]} />
          <Tip>
            Le rôle admin est le plus puissant du système. Les actions de suppression sont irréversibles — utilisez-les avec précaution.
          </Tip>
        </>
      ),
    },

    /* ── Référence ── */
    {
      id: "grades",
      title: "Grades & Hiérarchie",
      icon: <IconStar />,
      category: "reference",
      badge: "Référence",
      badgeColor: "bg-amber-500/20 text-amber-300",
      keywords: ["grade", "classe", "puissance", "hiérarchie", "rôle", "année", "spécialité", "art martial", "sort inné", "seconde", "première", "terminal"],
      access: "all",
      content: () => (
        <>
          <p className="font-medium text-white/60">Grades de puissance (du plus faible au plus fort) :</p>
          <div className="flex flex-wrap gap-1.5">
            {["Classe 4", "Classe 3", "Semi Classe 2", "Classe 2", "Semi Classe 1", "Classe 1", "Semi Classe S", "Classe S", "Classe Apo"].map((g, i) => (
              <span key={g} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.04] ring-1 ring-white/[0.06] text-xs text-white/50">
                <span className="text-[10px] text-white/20">{i + 1}.</span>
                {g}
              </span>
            ))}
          </div>
          <p className="font-medium text-white/60 mt-4">Rôles hiérarchiques RP :</p>
          <div className="flex flex-wrap gap-1.5">
            {["Élève Exorciste", "Exorciste Pro", "Professeur", "Professeur Principal", "Co-Directeur", "Directeur"].map((g, i) => (
              <span key={g} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.04] ring-1 ring-white/[0.06] text-xs text-white/50">
                <span className="text-[10px] text-white/20">{i + 1}.</span>
                {g}
              </span>
            ))}
          </div>
          <p className="font-medium text-white/60 mt-4">Année scolaire :</p>
          <div className="flex flex-wrap gap-1.5">
            {["Seconde", "Première", "Terminal"].map((s) => (
              <span key={s} className="px-2 py-0.5 rounded-md bg-amber-500/[0.06] ring-1 ring-amber-500/[0.1] text-xs text-amber-300/60">
                {s}
              </span>
            ))}
          </div>
          <p className="font-medium text-white/60 mt-4">Spécialités :</p>
          <div className="flex flex-wrap gap-1.5">
            {["Assassin", "Combattant", "Support", "Tank"].map((s) => (
              <span key={s} className="px-2 py-0.5 rounded-md bg-white/[0.04] ring-1 ring-white/[0.06] text-xs text-white/50">
                {s}
              </span>
            ))}
          </div>
          <p className="font-medium text-white/60 mt-4">Arts Martiaux :</p>
          <div className="flex flex-wrap gap-1.5">
            {["Corps à Corps", "Kenjutsu"].map((s) => (
              <span key={s} className="px-2 py-0.5 rounded-md bg-white/[0.04] ring-1 ring-white/[0.06] text-xs text-white/50">
                {s}
              </span>
            ))}
          </div>
          <p className="font-medium text-white/60 mt-4">Sorts Innés :</p>
          <div className="flex flex-wrap gap-1.5">
            {[
              "Altération Absolue", "Animaux Fantastiques", "Boogie Woogie", "Bourrasque",
              "Clonage", "Corbeau", "Givre", "Intervalle",
              "Jardin Floral", "Venin", "Projection Occulte", "Rage Volcanique",
            ].map((s) => (
              <span key={s} className="px-2 py-0.5 rounded-md bg-red-500/[0.06] ring-1 ring-red-500/[0.1] text-xs text-red-300/60">
                {s}
              </span>
            ))}
          </div>
        </>
      ),
    },
  ];
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Main Component                                                            */
/* ═══════════════════════════════════════════════════════════════════════════ */

export default function GuideWiki({
  role,
  isStrategie,
  isProfOrAdmin,
  canSeeStaff,
  isAdmin,
  badgeLabel,
  badgeColor,
}: GuideWikiProps) {
  const allPages = useMemo(() => buildPages(), []);
  const [activePage, setActivePage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const ctx: ContentCtx = useMemo(
    () => ({ isProfOrAdmin, canSeeStaff, isAdmin }),
    [isProfOrAdmin, canSeeStaff, isAdmin],
  );

  // Filter pages based on user access
  const visiblePages = useMemo(() => {
    return allPages.filter((p) => {
      if (p.access === "all") return true;
      if (p.access === "staff") return canSeeStaff;
      if (p.access === "admin") return isAdmin;
      return false;
    });
  }, [allPages, canSeeStaff, isAdmin]);

  // Filter pages based on search
  const filteredPages = useMemo(() => {
    if (!search.trim()) return visiblePages;
    const q = search.toLowerCase().trim();
    return visiblePages.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.keywords.some((k) => k.toLowerCase().includes(q)) ||
        p.category.toLowerCase().includes(q),
    );
  }, [visiblePages, search]);

  // Group filtered pages by category
  const grouped = useMemo(() => {
    const map = new Map<string, WikiPage[]>();
    for (const p of filteredPages) {
      const arr = map.get(p.category) || [];
      arr.push(p);
      map.set(p.category, arr);
    }
    return map;
  }, [filteredPages]);

  // Visible categories
  const visibleCategories = useMemo(
    () => CATEGORIES.filter((c) => grouped.has(c.id)),
    [grouped],
  );

  const currentPage = activePage ? visiblePages.find((p) => p.id === activePage) : null;

  const navigateTo = useCallback(
    (id: string | null) => {
      setActivePage(id);
      setSidebarOpen(false);
      // Scroll to top
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    [],
  );

  /* ═══════════════ RENDER ═══════════════ */

  return (
    <div className="relative min-h-screen bg-[#0a0505] overflow-hidden">
      {/* Background blobs */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 select-none">
        <div className="absolute -top-32 -left-32 w-[480px] h-[480px] rounded-full bg-red-700/15 blur-[120px]" />
        <div className="absolute -bottom-40 -right-16 w-[520px] h-[520px] rounded-full bg-orange-600/10 blur-[140px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full bg-red-900/10 blur-[100px]" />
      </div>
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

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="relative z-10 flex min-h-screen">
        {/* ═══════════ SIDEBAR ═══════════ */}
        <aside
          className={`
            fixed top-0 left-0 z-50 h-full w-72 bg-[#070d20]/95 backdrop-blur-xl
            border-r border-white/[0.06] flex flex-col
            transition-transform duration-300 ease-in-out
            lg:relative lg:translate-x-0 lg:z-10
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          `}
        >
          {/* Sidebar header */}
          <div className="flex items-center gap-3 px-5 pt-6 pb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/10 ring-1 ring-white/10 text-red-400">
              <IconBook />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-white tracking-tight truncate">Guide Wiki</h1>
              <p className="text-[10px] text-white/30 uppercase tracking-wider">École de Hokkaido</p>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg hover:bg-white/[0.05] text-white/40 hover:text-white/70 transition-colors"
            >
              <IconClose />
            </button>
          </div>

          {/* Role badge */}
          <div className="mx-5 mb-4">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] ring-1 ring-white/[0.06]">
              <span className="text-[10px] text-white/40">Rôle :</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ${badgeColor}`}>
                {badgeLabel}
              </span>
              {isStrategie && !isProfOrAdmin && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 bg-indigo-500/20 text-indigo-300 ring-indigo-500/20">
                  Stratégie
                </span>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="px-5 mb-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/30">
                <IconSearch />
              </div>
              <input
                type="text"
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setActivePage(null);
                }}
                className="w-full pl-9 pr-3 py-2 bg-white/[0.04] ring-1 ring-white/[0.08] rounded-xl text-sm text-white/80 placeholder:text-white/25
                  focus:outline-none focus:ring-red-500/30 focus:bg-white/[0.06] transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/30 hover:text-white/60"
                >
                  <IconClose />
                </button>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 pb-6 space-y-4 scrollbar-thin">
            {/* Home button */}
            <button
              onClick={() => navigateTo(null)}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                ${!activePage
                  ? "bg-red-500/10 text-red-300 ring-1 ring-red-500/20"
                  : "text-white/50 hover:text-white/70 hover:bg-white/[0.04]"
                }
              `}
            >
              <IconHome />
              <span>Accueil</span>
            </button>

            {visibleCategories.map((cat) => (
              <div key={cat.id}>
                <p className={`px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] ${cat.color} opacity-60`}>
                  {cat.label}
                </p>
                <div className="space-y-0.5">
                  {grouped.get(cat.id)!.map((page) => (
                    <button
                      key={page.id}
                      onClick={() => navigateTo(page.id)}
                      className={`
                        w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all duration-200
                        ${activePage === page.id
                          ? "bg-white/[0.07] text-white ring-1 ring-white/[0.1] font-medium"
                          : "text-white/45 hover:text-white/70 hover:bg-white/[0.04]"
                        }
                      `}
                    >
                      <span className={`flex-shrink-0 ${activePage === page.id ? "text-red-400" : "text-white/30"}`}>
                        {page.icon}
                      </span>
                      <span className="truncate">{page.title}</span>
                      {page.badge && (
                        <span className={`ml-auto px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${page.badgeColor}`}>
                          {page.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-white/[0.04]">
            <p className="text-[10px] text-white/15 text-center">
              GestionHokkaido — Intranet
            </p>
          </div>
        </aside>

        {/* ═══════════ MAIN CONTENT ═══════════ */}
        <main className="flex-1 min-w-0">
          {/* Top bar (mobile) */}
          <div className="sticky top-0 z-30 lg:hidden flex items-center gap-3 px-4 py-3 bg-[#0a0505]/80 backdrop-blur-xl border-b border-white/[0.06]">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-xl hover:bg-white/[0.05] text-white/50 hover:text-white/80 transition-colors"
            >
              <IconMenu />
            </button>
            <span className="text-sm font-medium text-white/70 truncate">
              {currentPage ? currentPage.title : "Guide Wiki"}
            </span>
          </div>

          <div className="max-w-3xl mx-auto px-4 py-8 sm:px-6 lg:px-8 lg:py-10 animate-fade-in">
            {currentPage ? (
              /* ─── Single page view ─── */
              <div>
                {/* Back button */}
                <button
                  onClick={() => navigateTo(null)}
                  className="flex items-center gap-2 mb-6 text-sm text-white/40 hover:text-white/70 transition-colors group"
                >
                  <span className="p-1 rounded-lg bg-white/[0.04] group-hover:bg-white/[0.08] transition-colors">
                    <IconBack />
                  </span>
                  <span>Retour à l&apos;accueil</span>
                </button>

                {/* Page header */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/[0.05] ring-1 ring-white/[0.08] text-red-400">
                    {currentPage.icon}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">
                      {currentPage.title}
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-white/30">
                        {CATEGORIES.find((c) => c.id === currentPage.category)?.label}
                      </span>
                      {currentPage.badge && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${currentPage.badgeColor}`}>
                          {currentPage.badge}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Page content */}
                <div className="rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06] p-6">
                  <div className="text-sm text-white/50 leading-relaxed space-y-3">
                    {currentPage.content(ctx)}
                  </div>
                </div>

                {/* Navigation between pages */}
                <PageNavigation
                  pages={visiblePages}
                  currentId={currentPage.id}
                  onNavigate={navigateTo}
                />
              </div>
            ) : (
              /* ─── Home / Grid view ─── */
              <div>
                {/* Header */}
                <header className="mb-8">
                  <p className="text-xs text-white/25 uppercase tracking-widest mb-4 font-medium">
                    École d&apos;Exorcisme de Hokkaido&nbsp;&nbsp;/&nbsp;&nbsp;Guide
                  </p>
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/10 ring-1 ring-white/10 text-red-400">
                      <IconBook />
                    </div>
                    <div>
                      <h1 className="text-3xl font-bold text-white tracking-tight">
                        Guide de l&apos;Intranet
                      </h1>
                      <p className="text-sm text-white/40 mt-1">
                        Sélectionnez un sujet pour en savoir plus
                      </p>
                    </div>
                  </div>
                </header>

                {/* Search bar (desktop, in main area when on home) */}
                <div className="mb-8 lg:hidden">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/30">
                      <IconSearch />
                    </div>
                    <input
                      type="text"
                      placeholder="Rechercher un sujet..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-white/[0.04] ring-1 ring-white/[0.08] rounded-2xl text-sm text-white/80 placeholder:text-white/25
                        focus:outline-none focus:ring-red-500/30 focus:bg-white/[0.06] transition-all"
                    />
                  </div>
                </div>

                {/* Categories + cards grid */}
                {search && filteredPages.length === 0 ? (
                  <div className="text-center py-16">
                    <p className="text-white/30 text-sm">Aucun résultat pour &laquo;&nbsp;{search}&nbsp;&raquo;</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {visibleCategories.map((cat) => (
                      <div key={cat.id}>
                        {/* Category header */}
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-1.5 h-5 rounded-full ${cat.color.replace("text-", "bg-")} opacity-40`} />
                          <h2 className={`text-xs font-semibold uppercase tracking-[0.15em] ${cat.color}`}>
                            {cat.label}
                          </h2>
                          <div className="flex-1 h-px bg-white/[0.04]" />
                        </div>

                        {/* Cards grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {grouped.get(cat.id)!.map((page) => (
                            <button
                              key={page.id}
                              onClick={() => navigateTo(page.id)}
                              className="group relative flex items-start gap-3 p-4 rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06]
                                hover:ring-white/[0.12] hover:bg-white/[0.05] transition-all duration-300 text-left"
                            >
                              {/* Hover glow */}
                              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl overflow-hidden">
                                <div className="absolute -top-10 -right-10 w-24 h-24 rounded-full bg-red-500/5 blur-2xl" />
                              </div>

                              <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-white/[0.05] ring-1 ring-white/[0.08] text-white/40 group-hover:text-red-400 transition-colors flex-shrink-0">
                                {page.icon}
                              </div>
                              <div className="relative flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors truncate">
                                    {page.title}
                                  </span>
                                  {page.badge && (
                                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold flex-shrink-0 ${page.badgeColor}`}>
                                      {page.badge}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-white/25 mt-0.5 truncate">
                                  {page.keywords.slice(0, 4).join(" · ")}
                                </p>
                              </div>
                              {/* Arrow */}
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"
                                className="relative w-4 h-4 mt-1 text-white/15 group-hover:text-white/40 transition-colors flex-shrink-0">
                                <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z" clipRule="evenodd" />
                              </svg>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div className="pt-10 text-center">
                  <p className="text-[11px] text-white/15">
                    GestionHokkaido — Intranet de l&apos;École d&apos;Exorcisme de Hokkaido
                  </p>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Page navigation (prev/next)                                               */
/* ═══════════════════════════════════════════════════════════════════════════ */

function PageNavigation({
  pages,
  currentId,
  onNavigate,
}: {
  pages: WikiPage[];
  currentId: string;
  onNavigate: (id: string) => void;
}) {
  const idx = pages.findIndex((p) => p.id === currentId);
  const prev = idx > 0 ? pages[idx - 1] : null;
  const next = idx < pages.length - 1 ? pages[idx + 1] : null;

  if (!prev && !next) return null;

  return (
    <div className="flex items-stretch gap-3 mt-8">
      {prev ? (
        <button
          onClick={() => onNavigate(prev.id)}
          className="flex-1 flex items-center gap-3 p-4 rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06]
            hover:ring-white/[0.12] hover:bg-white/[0.05] transition-all text-left group"
        >
          <span className="text-white/20 group-hover:text-white/50 transition-colors">
            <IconBack />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] text-white/25 uppercase tracking-wider">Précédent</p>
            <p className="text-sm text-white/60 group-hover:text-white/80 transition-colors truncate">{prev.title}</p>
          </div>
        </button>
      ) : (
        <div className="flex-1" />
      )}
      {next ? (
        <button
          onClick={() => onNavigate(next.id)}
          className="flex-1 flex items-center justify-end gap-3 p-4 rounded-2xl bg-white/[0.03] ring-1 ring-white/[0.06]
            hover:ring-white/[0.12] hover:bg-white/[0.05] transition-all text-right group"
        >
          <div className="min-w-0">
            <p className="text-[10px] text-white/25 uppercase tracking-wider">Suivant</p>
            <p className="text-sm text-white/60 group-hover:text-white/80 transition-colors truncate">{next.title}</p>
          </div>
          <span className="text-white/20 group-hover:text-white/50 transition-colors rotate-180">
            <IconBack />
          </span>
        </button>
      ) : (
        <div className="flex-1" />
      )}
    </div>
  );
}
