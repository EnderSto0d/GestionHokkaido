# Mission System — Documentation

## Overview

The Mission System allows authorized users to create and manage missions on the website.
When a mission is created, a Discord embed is automatically posted to the server.
Participants register directly on the website, and the Discord embed updates in real-time.

---

## Permissions — Who Can Create a Mission?

A user can create a mission if **any** of the following conditions are met:

| # | Condition | Details |
|---|-----------|---------|
| 1 | **Admin or Professeur** role (DB) | Users with `role = 'admin'` or `role = 'professeur'` |
| 2 | **Exo Pro or higher** grade role | `grade_role` ∈ `{ "Exorciste Pro", "Professeur", "Professeur Principal", "Co-Directeur", "Directeur" }` |
| 3 | **Conseil des élèves** member | User has an entry in the `conseil_membres` table |
| 4 | **Special Discord role** | Discord role ID `1479039157769732106` (checked via Bot API) |

---

## Mission Fields

| Field | Type | Description |
|-------|------|-------------|
| **Nom** | Text (1–200 chars) | The mission's name |
| **Date / Heure** | DateTime (optional) | When the mission takes place |
| **Capacité** | Integer or `null` | Number of spots; `null` = unlimited |
| **Ping Discord** | Enum | `@everyone`, `Élève Exorciste`, or specific squad(s) |
| **Récompense** | Integer (0–`MAX_MISSION_POINTS`) | Squad points per participant |
| **Synopsis** | Text (optional) | Mission description |

### Configuration

The maximum allowed reward points is stored in:

```
apps/web/lib/missions/config.ts
```

```ts
export const MAX_MISSION_POINTS = 50; // ← change this value to adjust the cap
```

---

## Reward Multipliers

Squad points are multiplied based on group participation at mission completion.

| Condition | Multiplier |
|-----------|-----------|
| Default (individual) | ×1 |
| 3+ members of same squad *(or 2+ if squad has exactly 3 total members)* | ×1.5 |
| Entire squad participates | ×2 |
| 5+ members of same squad | ×2.25 |

> Multipliers are applied **per squad**, not per individual participant.  
> If multiple conditions are met, **the highest applicable multiplier wins**.

### Example

- Mission reward: **10 pts / participant**
- Squad "Gojo" has 5 total members, and 4 of them joined:
  - 4 >= 3 → **×1.5** → Squad receives **4 × 10 × 1.5 = 60 pts**
- Squad "Nanami" has 3 total members, and all 3 joined:
  - All members participated → **×2** → Squad receives **3 × 10 × 2 = 60 pts**
- Individual (no squad): receives base **10 pts** (not yet distributed to an escouade)

---

## Discord Integration

### Channel
All mission embeds are posted to channel ID: `1479038626749878335`

### Flow
1. Mission created on the website
2. A rich Discord embed is **automatically posted** via the Bot API
3. The embed includes a **link button** redirecting users to the mission page
4. Every time someone **joins or leaves** the mission on the site, the embed is **automatically updated** (spots remaining, total registered)

### Bot Requirements
The following environment variable must be set:

```env
DISCORD_BOT_TOKEN=your-bot-token
NEXT_PUBLIC_SITE_URL=https://your-site.com
```

The bot must have `SEND_MESSAGES` and `MANAGE_MESSAGES` permissions in the target channel.

---

## Database Tables

### `missions`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `createur_id` | UUID | FK → `utilisateurs.id` |
| `titre` | TEXT | Mission title |
| `date_heure` | TIMESTAMPTZ | Optional date/time |
| `capacite` | INTEGER | Max participants (`NULL` = unlimited) |
| `ping_cible` | JSONB | Ping type and targets |
| `points_recompense` | INTEGER | Base points per participant |
| `synopsis` | TEXT | Optional description |
| `discord_message_id` | TEXT | Stored Discord message ID for embed updates |
| `statut` | TEXT | `active` / `terminee` / `annulee` |

### `participations_mission`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `mission_id` | UUID | FK → `missions.id` |
| `utilisateur_id` | UUID | FK → `utilisateurs.id` |
| `cree_le` | TIMESTAMPTZ | Registration timestamp |

### Running the Migration

```sql
-- In your Supabase SQL editor or psql:
\i apps/SqlDB/migration_missions.sql
```

---

## Code Structure

```
apps/web/
├── lib/missions/
│   └── config.ts                          ← MAX_MISSION_POINTS constant
├── types/database.ts                      ← Added missions + participations_mission types
├── app/(dashboard)/missions/
│   ├── page.tsx                           ← Server component — list of missions
│   ├── missions-client.tsx                ← Client component — UI + create modal
│   ├── actions.ts                         ← All server actions + Discord integration
│   └── [id]/
│       └── page.tsx                       ← Mission detail page + creator dashboard
└── components/shared/
    ├── mission-creation-form.tsx          ← Creation modal form
    ├── mission-controls.tsx               ← JoinMissionButton + CreatorControls
    └── mission-participants.tsx           ← Participant dashboard (grouped by squad)
apps/SqlDB/
└── migration_missions.sql                 ← DB migration for new tables
```

---

## Completing a Mission

Only the mission creator (or an authorized user) can complete a mission.
When completed:
1. The `terminerMission` server action calculates multipliers per squad
2. Points are added directly to each participating squad's `escouades.points`
3. An entry is created in `hauts_faits_escouade` for each squad (visible in scoreboard history)
4. The mission status is updated to `terminee`
