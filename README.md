# skatstatistik

A small web app for tracking Skat-group results — Spieltage, Spieler, Bommel, Runden — with photo upload of the daily tally sheet and per-year statistics.

> Status: **work in progress.** Foundation, schema, sheet import and Spieltage CRUD are in. Auth, Spieler and Statistik screens follow.

## What it does

- Enter results per Spieltag: `datum`, players (`kürzel`), `bommel`, `runden`.
- Optional photo of the day's tally sheet, downscaled client-side and stored alongside the data.
- Manage players (`kürzel` ↔ `name`); add a new kürzel on the fly while entering a Spieltag.
- Per-year statistics: `Spieltage`, `Runden`, `Bommel/Runde`, `Gewinnrate`, `Anwesenheit` — filterable, with charts.
- View, edit, delete a single Spieltag (admin only for edit/delete).
- Sign in with Google or via email magic link. New accounts need admin approval.

## Stack

| Layer | Choice |
| --- | --- |
| Frontend & server | SvelteKit (Node adapter, Svelte 5 runes) |
| Database | Postgres 16 |
| ORM | Drizzle + drizzle-kit |
| Auth | better-auth — Google OAuth + email magic link |
| Email (dev *and* prod) | Mailpit (SMTP catcher; mail stays in the local web UI). Swap for any SMTP relay via env vars to enable real delivery. |
| CSS | TailwindCSS v4 |
| Components | Flowbite Svelte |
| Charts | ApexCharts |
| Photo storage | docker volume `/data/photos` |
| Containers | `app` + `db` + `mailpit`, single `docker compose up` |

UI is German throughout. Hosting / TLS is out of scope — the project ships as a Compose stack.

## Reference

The current implementation lives as a Google Sheet:
<https://docs.google.com/spreadsheets/d/11onUP0lXANQfPYg49CLQLXRpRx8tVdZF6ZnlapiC3u4/edit>

604 raw entries from its `Daten` tab and 32 player rows from its `Kürzel` tab are imported as a one-time idempotent seed.

## Roles

| Role | Can do |
| --- | --- |
| `pending` | Wait for admin approval |
| `user` | Read everything · create Spieltage and Players |
| `admin` | Everything above · edit / delete Spieltage · rename Players · approve and promote users |

Player **deletion** is intentionally not exposed in the UI — players are renamed-only.

## Setup

```sh
cp .env.example .env
# Fill in: BETTER_AUTH_SECRET (openssl rand -base64 32), GOOGLE_CLIENT_ID,
# GOOGLE_CLIENT_SECRET, ADMIN_EMAIL. Defaults are fine for everything else.

pnpm install
```

## Run

Two modes are supported. Pick one.

### Dev iteration (host SvelteKit + dockerised infra)

Best for editing code — Vite hot-reloads, infra runs in containers.

```sh
docker compose up -d db mailpit         # Postgres :5432, Mailpit UI :8025
pnpm db:migrate                         # apply schema (one-time)
pnpm dev                                # http://localhost:5173
```

When you're done:

```sh
docker compose down                     # stops db + mailpit; pgdata volume persists
```

### Production-shaped (everything in containers)

```sh
docker compose up --build               # → http://localhost:3000
```

Migrations run automatically on container start (idempotent).

## Seed historical data

The CSVs in [`seed/`](./seed/) come from the existing Google sheet. The seed script imports them into the empty database; safe to re-run.

```sh
pnpm seed
# imports 32 players, 85 Spieltage, 604 Ergebnisse, 2090 Runden total
```

The seed runs from the host — it talks to the dockerised db via `localhost:5432`, so make sure the `db` container is up. Cross-checked end of the run: per-player numbers match the sheet exactly (e.g. `AA` 2024: 9 Spieltage / 12 Bommel / 37 Runden / 67.6 % Gewinnrate).

> One source-side typo (Spieltag dated `02.12.1924` rather than `02.12.2024`) is preserved verbatim. Fix it later via the UI.

## Useful URLs

| URL | What |
| --- | --- |
| `http://localhost:3000/spieltage` | List of all Spieltage |
| `http://localhost:3000/spieltage/2024-05-20` | One Spieltag detail |
| `http://localhost:3000/spieltage/new` | Create a new Spieltag |
| `http://localhost:8025` | Mailpit web UI (captured magic-link emails land here) |

In dev mode, swap `:3000` for `:5173`.

## Required env vars

See [`.env.example`](./.env.example). At minimum:

- `BETTER_AUTH_SECRET` — `openssl rand -base64 32`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google Cloud Console → OAuth 2.0; authorised redirect URI is `${BETTER_AUTH_URL}/api/auth/callback/google`
- `ADMIN_EMAIL` — first admin, auto-promoted on first sign-in
- `DATABASE_URL`, `SMTP_*`, `PHOTOS_DIR` — sensible defaults for both compose and `pnpm dev`

## Useful scripts

| Script | What |
| --- | --- |
| `pnpm dev` | SvelteKit dev server with HMR |
| `pnpm build` | Production build to `build/` |
| `pnpm start` | Run the production build (`node build/index.js`) |
| `pnpm check` | TypeScript + Svelte checks |
| `pnpm db:generate` | drizzle-kit — generate a migration from schema diff |
| `pnpm db:migrate` | Apply migrations against the configured DB |
| `pnpm db:studio` | drizzle-kit studio — browse the database |
| `pnpm seed` | Import the Google sheet CSVs (idempotent) |

## Repository layout

```
.
├── DESIGN.md                  build spec — data model, stack, screens, roadmap
├── README.md                  this file
├── .env.example               all env vars documented
├── docker-compose.yml         app + db + mailpit
├── Dockerfile                 multi-stage build (deps → build → runtime)
├── drizzle.config.ts          ORM config
├── drizzle/                   generated SQL migrations + custom view
├── scripts/                   migrate.js · seed.ts
├── seed/                      committed CSVs from the Google sheet
├── package.json               scripts and deps
└── src/
    ├── app.css                Tailwind v4 + Flowbite imports
    ├── app.html               document shell (German lang)
    ├── lib/
    │   ├── format.ts          DD.MM.YYYY, percent, number formatters
    │   ├── components/        SpieltagForm.svelte etc.
    │   └── server/            schema · db · queries · photos · spieltagAction
    └── routes/                pages and endpoints
        ├── +layout.svelte     header nav
        ├── +page.svelte       Statistik (placeholder until milestone 8)
        ├── spieltage/         list / new / [datum] / [datum]/edit
        └── api/photos/        auth-gated photo serving
```
