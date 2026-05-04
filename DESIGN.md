# Skatstatistik — Design Document

Status: draft, pre-implementation. Decisions below are recommendations; nothing is built yet.

Reference: existing Google Sheets implementation at
<https://docs.google.com/spreadsheets/d/11onUP0lXANQfPYg49CLQLXRpRx8tVdZF6ZnlapiC3u4/edit>.

---

## 1. Domain

- **Spieltag** — one match day, identified by `datum`. Multiple players play multiple `runden` (rounds) and accrue `bommel` (penalty markers).
- **Player** — identified by `kürzel` (short handle, e.g. `SS`). Has an optional `name`.
- **Ergebnis** — one player's result on one Spieltag: `(bommel, runden)`.

### Aggregations (per year: 2023, 2024, 2025, current year)

Per player:

| Field | Definition |
| --- | --- |
| `kürzel` | from players |
| `name` | from players |
| `spieltage` | count of distinct `datum` the player participated in (in the year) |
| `runden` | sum of all `runden` (in the year) |
| `bommel/runde` | `sum(bommel) / sum(runden)` |
| `Anwesenheit` | player's `spieltage` ÷ total distinct `datum` in that year |

Designed to be filterable later (date range, subset of players, min rounds, etc.).

---

## 2. Data model

```
players
  id            uuid pk
  kürzel        text unique not null
  name          text                    -- nullable: kürzel can be added on the fly
  created_at    timestamptz default now()

spieltage
  id            uuid pk
  datum         date unique not null
  photo_path    text                    -- storage key, nullable
  notes         text
  created_at    timestamptz default now()

ergebnisse
  id            uuid pk
  spieltag_id   uuid fk -> spieltage(id) on delete cascade
  player_id     uuid fk -> players(id)  on delete restrict
  bommel        integer not null check (bommel >= 0)
  runden        integer not null check (runden  >= 0)
  unique(spieltag_id, player_id)
```

Notes:
- `datum` has a unique constraint — one Spieltag per calendar day. Loosen if needed.
- `name` is nullable so a kürzel can be created mid-entry and filled in later from the Players view.
- Cascade deletes from `spieltage` so a Spieltag deletion removes its results, but `restrict` on player deletion (you must reassign / delete results first).

### Aggregation as a SQL view

A view `player_stats_by_year(year, player_id, kürzel, name, spieltage, runden, bommel, bommel_per_runde, anwesenheit)` keeps all aggregation logic on the database side. Filter by `year` and join in the UI.

---

## 3. Backend options

| Option | Pros | Cons | Verdict |
| --- | --- | --- | --- |
| **Supabase** | Managed Postgres, auth (Google + email + magic link + ~15 OAuth providers), Storage for photos, RLS, generous free tier, self-hostable if needed | Some lock-in to client SDK conventions | **Recommended** |
| Firebase | Mature, Google-native auth, great mobile story | NoSQL (Firestore) is awkward for relational stats; Storage + Functions extra wiring | Skip for relational data |
| Pocketbase | Single Go binary, SQLite, OAuth + email built-in, file storage | Smaller community; less mature than Postgres tooling | Fine if you want self-host minimal |
| Custom (Hono/Fastify + Postgres + Lucia or Auth.js) | Total control | The most code to write and maintain for the smallest app | Skip unless you specifically want to build auth |

**Why Supabase:** all four pieces you asked for (Google OAuth, email auth, photo upload, persisted relational data) are first-class, Postgres views give you the year aggregations as a one-liner, and RLS handles the "only logged-in members can read/write" check without bespoke middleware.

---

## 4. Frontend options

| Option | Pros | Cons |
| --- | --- | --- |
| **SvelteKit** | Compact, fast, simple file-based routing, official Supabase auth helpers | Smaller component ecosystem than React |
| Next.js (App Router) | Largest ecosystem, `@supabase/ssr` first-class | Heavier than this app needs |
| Remix / React Router 7 | Web-platform-leaning, good form story | Smaller community |
| Vite + React (SPA) | Lean, no SSR tax | More wiring for protected routes |

**Recommended:** SvelteKit. **Alternative:** Next.js if you'd prefer the React ecosystem or already know it.

UI library suggestions: `shadcn-svelte` (or `shadcn/ui` for Next), or stay vanilla with TailwindCSS — this app has maybe 6 screens, so a heavy component lib is overkill.

---

## 5. Authentication

Supabase supports out of the box:

- **Google OAuth** — you asked for this.
- **Email + password**.
- **Email magic link** (passwordless; nicer UX, recommended over password).
- Also available with one config line each: Apple, GitHub, Microsoft/Azure, Discord, Facebook, Twitter/X, LinkedIn, Slack, Spotify, Twitch, Notion, Zoom, Bitbucket, GitLab, Figma, Kakao, Keycloak, WorkOS, Phone OTP (SMS), Anonymous, custom SAML SSO.

**Recommended starter set:** Google + magic link. Add password if some users don't have Google accounts.

### Authorization model — open question

Two reasonable shapes:

1. **Shared data, group of users.** Anyone signed in can read; admins (a `members` table with a role) can write. Best if your Skat group all want to see the same stats. *Default assumption.*
2. **Per-user data.** Each authenticated user has their own private dataset. RLS scoped by `auth.uid()`. Best if you're building this as a multi-tenant SaaS.

I've drafted this for option 1. Tell me if you want option 2.

---

## 6. Photos

- Bucket: `spieltag-photos` in Supabase Storage.
- One photo per Spieltag, stored at `spieltage/<spieltag_id>.<ext>`.
- Persist only the storage path on `spieltage.photo_path`; resolve to a signed URL at read time.
- No OCR for now (per spec). Photo is just a visual record of the day's tally sheet.
- Max ~5 MB, accept JPEG/PNG/HEIC, downscale on the client to ~2000 px long edge before upload to keep storage small.

---

## 7. Screens / UX

### 7.1 New Spieltag (`/spieltage/new`)
- **Datum** (date picker, default today)
- **Foto** (optional; drag-drop or file input; preview)
- **Notizen** (optional)
- **Spieler** section — one row per participant:
  - Combobox: filterable by kürzel or name. Bottom of the list: *"+ neuen Spieler anlegen: '<typed text>'"* — creates a player with that kürzel and `name = null` inline. Can be filled in later from Players view.
  - `bommel` (number)
  - `runden` (number)
  - Remove-row button
- **+ Spieler** button to add a row.
- Submit creates the Spieltag and its Ergebnisse atomically.

### 7.2 Spieltag detail (`/spieltage/[id]`)
- Datum, Foto (if any), Notizen, table of players' results.
- "Bearbeiten" → edit form (same as new, preloaded).
- "Löschen" → confirmation dialog → deletes Spieltag + results.

### 7.3 Spieltag list (`/spieltage`)
- Reverse-chronological table. Date, # players, total Runden, thumbnail. Click → detail.

### 7.4 Statistik (`/`)
- Year tabs: **2023**, **2024**, **2025**, **2026** (current).
- Table from `player_stats_by_year`. Sortable columns. Filter inputs (player multi-select, min Spieltage, etc.) on the side — added incrementally.

### 7.5 Spieler (`/spieler`)
- List of players: kürzel, name, total Spieltage all-time.
- Inline edit name.
- Add new player.
- Delete (only if no results).

### 7.6 Auth (`/auth`)
- "Mit Google anmelden" button.
- Email field → "Magic Link senden".
- Optional password fallback.

---

## 8. Architecture feedback

Things worth flagging now:

- **Aggregations belong in SQL.** Year filters, per-player joins, and ratios all collapse to a single view. Doing this in JavaScript is fine for 100 Spieltage but starts to bite the moment you want filters.
- **Surrogate IDs over natural keys.** `spieltage.id` (uuid) + unique on `datum` keeps you flexible if you ever want two events the same day, and avoids fragile foreign keys to a date.
- **Unique constraint `(spieltag_id, player_id)`** prevents accidentally double-entering a player on a Spieltag.
- **Photo upload latency.** Client-side downscale before upload — a phone shot is 4 MB+, and you don't need that resolution.
- **Anwesenheit denominator.** "All distinct dates" should be all `spieltage.datum` in the selected year — not all dates a player ever attended. Make this explicit in the view definition; it's the easy thing to get wrong.
- **Auth scope.** Decide question §5 before writing RLS policies — getting it wrong later means a data migration.
- **Time zone.** `datum` is `date` (no time, no zone) — fine, but make sure form submission doesn't accidentally shift via UTC conversion. Stick to local-date strings end to end.
- **Don't over-engineer.** Six screens, one user group, a few hundred rows. SvelteKit + Supabase + a couple of forms is the whole app. Resist adding TanStack Query, state machines, etc. until you feel pain.
- **One Postgres view per concern**, not one giant view. `player_stats_by_year` is one; if you later add `bommel_streaks`, that's a separate view.

---

## 9. Open decisions before implementation

1. Stack: SvelteKit + Supabase (default) or substitute? **→ confirm**
2. Auth scope: shared group data (default) or per-user? **→ confirm**
3. Auth providers to enable in v1: Google + magic link (default), add password? **→ confirm**
4. Hosting: Vercel (SvelteKit) + Supabase cloud, or self-host? **→ confirm**
5. Language of UI: German throughout (matches the domain terms)? **→ confirm**

---

## 10. Roadmap

- **v0** — repo, design doc, README *(this commit)*.
- **v1** — schema migrations, auth, Spieltag CRUD with photo, Players view, year stats table.
- **v1.1** — filters on the stats page, sortable columns.
- **v2** — additional aggregations (per-month, head-to-head), CSV export, OCR for photos if useful.
