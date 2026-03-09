# @gestiontokyo/web

Plateforme web de l'**École d'Exorcisme de Tokyo**.

## Stack

- **Next.js 15** (App Router) — SSR, Server Actions, API Routes
- **Supabase** — Base de données PostgreSQL, authentification OAuth Discord, Storage
- **Tailwind CSS + shadcn/ui** — Interface utilisateur

## Démarrage rapide

```bash
# Depuis la racine du monorepo
npm run dev

# Ou directement depuis ce dossier
npm run dev
```

L'application tourne sur **http://localhost:3000**

## Variables d'environnement

Remplissez `.env.local` à la racine du monorepo. Variables utilisées par cette app :

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXTAUTH_URL` + `NEXTAUTH_SECRET`
- `DISCORD_CLIENT_ID` + `DISCORD_CLIENT_SECRET`
- `DISCORD_BOT_TOKEN`

## Structure

```
apps/web/
├── app/
│   ├── (auth)/login/         ← Page de connexion Discord
│   ├── (dashboard)/          ← Interface de gestion (protégée)
│   │   ├── personnages/
│   │   ├── missions/
│   │   └── administration/
│   └── api/auth/callback/    ← Callback OAuth2 Supabase
├── components/
│   ├── ui/                   ← Composants shadcn/ui
│   └── shared/               ← Composants métier
├── lib/
│   ├── supabase/client.ts    ← Client navigateur
│   └── supabase/server.ts    ← Client serveur + admin
└── types/database.ts         ← Types Supabase (auto-générés)
```
