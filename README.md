# skatstatistik

A small web app for tracking Skat-group results — Spieltage, Spieler, Bommel, Runden — with photo upload of the daily tally sheet and per-year statistics.

> Status: **work in progress**. Scaffold + Docker stack are in; schema, auth and screens land in follow-up commits. See [`DESIGN.md`](./DESIGN.md) for the full build spec.

## What it does

- Enter results per Spieltag: `datum`, players (`kürzel`), `bommel`, `runden`.
- Optional photo of the day's tally sheet, stored alongside the data.
- Manage players (`kürzel` ↔ `name`); add a new kürzel on the fly while entering a Spieltag.
- Per-year statistics: `Spieltage`, `Runden`, `Bommel/Runde`, `Gewinnrate`, `Anwesenheit` — filterable, with charts.
- View, edit, delete a single Spieltag (admins only for edit/delete).
- Sign in with Google or via email magic link. New accounts need admin approval.

## Stack

| Layer | Choice |
| --- | --- |
| Frontend & server | SvelteKit (Node adapter) |
| Database | Postgres 16 |
| ORM | Drizzle + drizzle-kit |
| Auth | better-auth — Google OAuth + email magic link |
| Email (dev *and* prod) | Mailpit (SMTP catcher; mail stays in the local web UI). Swap for any SMTP relay via env vars to enable real delivery. |
| CSS | TailwindCSS |
| Components | Flowbite Svelte |
| Charts | ApexCharts |
| Storage | docker volume `/data/photos` |
| Containers | `app` + `db` (+ `mailpit` for dev), single `docker compose up` |

UI is German throughout. Hosting / TLS is out of scope — the project ships as a Compose stack.

## Reference

The current implementation lives as a Google Sheet:
<https://docs.google.com/spreadsheets/d/11onUP0lXANQfPYg49CLQLXRpRx8tVdZF6ZnlapiC3u4/edit>

The 607 raw entries from its `Daten` tab and the 33 player rows from its `Kürzel` tab will be imported as a one-time seed.

## Roles

| Role | Can do |
| --- | --- |
| `pending` | Wait for admin approval |
| `user` | Read everything · create Spieltage and Players |
| `admin` | Everything above · edit / delete Spieltage · rename Players · approve and promote users |

Player **deletion** is intentionally not exposed in the UI — players are renamed-only.

## Quick start

```sh
cp .env.example .env                    # fill in BETTER_AUTH_SECRET, GOOGLE_*, ADMIN_EMAIL
pnpm install
docker compose up -d db mailpit         # Postgres on :5432, Mailpit UI on :8025
pnpm dev                                # http://localhost:5173
```

Production-shaped run (everything in containers):

```sh
docker compose up --build
# app on :3000, mailpit web UI on :8025
```

Seed historical data from the existing Google sheet (one-time, idempotent — safe to re-run):

```sh
pnpm seed
# imports 32 players, 85 Spieltage, 604 Ergebnisse, 2090 Runden total
```

## Required env vars

See [`.env.example`](./.env.example). At minimum:

- `BETTER_AUTH_SECRET` — `openssl rand -base64 32`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google Cloud Console, OAuth 2.0
- `ADMIN_EMAIL` — first admin, auto-promoted on first sign-in
- `DATABASE_URL`, `SMTP_*` — sensible defaults for the docker stack

## Repository layout

```
.
├── DESIGN.md           build spec — data model, stack, screens, roadmap
├── README.md           this file
├── .env.example        all env vars documented
├── docker-compose.yml  app + db + mailpit
├── Dockerfile          multi-stage build (deps → build → runtime)
├── drizzle.config.ts   ORM config (schema, output dir, dialect)
├── package.json        scripts: dev / build / db:* / seed
├── src/                SvelteKit app
│   ├── app.css         Tailwind v4 + Flowbite imports
│   ├── lib/            shared modules (server-only under lib/server)
│   └── routes/         pages and endpoints
├── drizzle/            generated migrations (filled in milestone 3)
├── scripts/            seed and other one-off scripts (milestone 4)
└── seed/               committed CSVs from the Google sheet (milestone 4)
```
