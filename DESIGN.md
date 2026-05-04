# Skatstatistik — Design Document

Status: build spec. Stack and data model are locked. Implementation begins next.

Reference: existing Google Sheets implementation at
<https://docs.google.com/spreadsheets/d/11onUP0lXANQfPYg49CLQLXRpRx8tVdZF6ZnlapiC3u4/edit>.

---

## 1. Domain

- **Spieltag** — one match day, identified by `datum`. Multiple players each play `runden` (rounds) and accrue `bommel` (penalty markers).
- **Player** — identified by `kürzel`. Has an optional `name`. Players are never deleted through the UI (rename only). *Player ≠ user.*
- **Ergebnis** — one player's result on one Spieltag: `(bommel, runden)`.

### Per-year aggregation (2020 → current year)

Per player, in a given year:

| Field | Definition |
| --- | --- |
| `kürzel` | from players |
| `name` | from players (nullable) |
| `spieltage` | distinct `datum` the player participated in |
| `runden` | sum |
| `bommel` | sum |
| `bommel_per_runde` | `sum(bommel) / sum(runden)` |
| `gewinnrate` | `(sum(runden) − sum(bommel)) / sum(runden)` |
| `anwesenheit` | player's `spieltage` ÷ total distinct `datum` that year |

Computed in a Postgres view (`player_stats_by_year`); UI filters layer on top.

---

## 2. Data model

```
players
  id            uuid primary key default gen_random_uuid()
  kürzel        text unique not null
  name          text                       -- nullable; imported verbatim from sheet
  created_at    timestamptz default now()

spieltage
  datum         date primary key           -- one Spieltag per day, enforced by PK
  photo_path    text                       -- storage key, nullable
  notes         text
  created_at    timestamptz default now()

ergebnisse
  datum         date references spieltage(datum) on delete cascade
  player_id     uuid references players(id)     on delete restrict
  bommel        integer not null check (bommel >= 0)
  runden        integer not null check (runden  >= 0)
  primary key (datum, player_id)
```

Why this shape:
- `datum` as natural PK on `spieltage` — "one Spieltag per day" is enforced by the schema, no surrogate id needed.
- `(datum, player_id)` composite PK on `ergebnisse` — prevents double-entering a player on a Spieltag.
- `on delete cascade` from `spieltage` → `ergebnisse`: deleting a Spieltag removes its results.
- `on delete restrict` from `players` → `ergebnisse`: defensive; the UI never offers a Player-delete button anyway.

### Auth tables

`better-auth` manages `user`, `session`, `account`, `verification`. We extend the `user` table with a role column:

```sql
alter table "user" add column role text not null default 'pending'
  check (role in ('pending','user','admin'));
```

On first sign-in, the user whose email matches `ADMIN_EMAIL` is auto-promoted to `admin` (no approval flow needed).

### Aggregation view

```sql
create view player_stats_by_year as
select
  extract(year from e.datum)::int                                 as year,
  p.id                                                            as player_id,
  p.kürzel,
  p.name,
  count(distinct e.datum)                                         as spieltage,
  sum(e.runden)::int                                              as runden,
  sum(e.bommel)::int                                              as bommel,
  sum(e.bommel)::numeric / nullif(sum(e.runden), 0)               as bommel_per_runde,
  (sum(e.runden) - sum(e.bommel))::numeric
    / nullif(sum(e.runden), 0)                                    as gewinnrate,
  count(distinct e.datum)::numeric
    / nullif((select count(*) from spieltage s
              where extract(year from s.datum) = extract(year from e.datum)), 0)
                                                                  as anwesenheit
from ergebnisse e
join players p on p.id = e.player_id
group by 1, 2, 3, 4;
```

---

## 3. Stack (locked)

| Layer | Choice |
| --- | --- |
| Frontend & server | **SvelteKit** (Node adapter) |
| Database | **Postgres 16** |
| ORM | **Drizzle** |
| Migrations | **drizzle-kit** |
| Auth | **better-auth** — Google OAuth + email magic link, **no password** |
| Email | **Mailpit** in dev *and* prod (SMTP catcher). Mail is captured to its local web UI (`:8025`), **never relayed externally**. To enable real delivery later, swap `mailpit` for any SMTP relay via the same `SMTP_*` env vars — no app code change. |
| CSS | **TailwindCSS** |
| Components | **Flowbite Svelte** |
| Charts | **ApexCharts** (via Flowbite chart components) |
| File storage | docker volume `/data/photos`, served via SvelteKit endpoint with auth check |
| Containers | `app` + `db` (+ `mailpit` for dev) — single `docker compose up` |

UI is German throughout. Date format: `DD.MM.YYYY`.

---

## 4. Auth & roles

### Sign-up flow

1. User signs in with Google **or** requests an email magic link.
2. better-auth creates the user with `role = 'pending'`.
3. User sees a *„Warte auf Freigabe durch einen Admin"* screen.
4. An admin opens `/admin/users`, finds the pending user, clicks *Freigeben* → role becomes `user` (or `admin` if explicitly promoted).
5. The approved user is emailed *„Dein Konto wurde freigegeben."*
6. **Special case:** the email matching `ADMIN_EMAIL` is auto-promoted to `admin` on first sign-in — no approval needed.

### Magic-link delivery in prod

Because Mailpit is in use in prod, magic-link emails are captured locally and never reach external inboxes. The practical consequences:

- **Google OAuth is the only fully-functional sign-in path for end users.**
- Magic link only works if an admin reads the Mailpit web UI (`:8025`) and forwards the link by hand, or if users have direct access to the Mailpit UI.
- To enable normal magic-link delivery, replace the `mailpit` service with any SMTP relay (Resend / Postmark / SES / Mailgun / your own SMTP); only the `SMTP_*` env vars change.

### Permissions

| Action | pending | user | admin |
| --- | --- | --- | --- |
| Read everything | — | ✓ | ✓ |
| Create Spieltag | — | ✓ | ✓ |
| Add Player (kürzel) | — | ✓ | ✓ |
| Edit Spieltag | — | — | ✓ |
| Edit Player (rename) | — | — | ✓ |
| Delete Spieltag | — | — | ✓ |
| **Delete Player** | — | — | **— (not exposed in UI)** |
| Approve / promote / demote users | — | — | ✓ |

---

## 5. Photos

- Stored on docker volume `/data/photos`, one file per Spieltag at `/data/photos/<YYYY-MM-DD>.<ext>`.
- Persist only the relative path on `spieltage.photo_path`.
- Served via a SvelteKit endpoint that checks the request is authenticated and the user is not `pending`.
- Client-side downscale to ~2000 px long edge before upload to keep storage small.
- Accepted: JPEG, PNG, HEIC. Cap ~5 MB after downscale.

---

## 6. Screens (German UI)

### 6.1 `/spieltage/new` — Neuer Spieltag *(user, admin)*
Datum (default today) · Foto (optional, drag-drop with preview) · Notizen · Spieler-Tabelle: combobox by kürzel/name with inline *„+ neuen Spieler anlegen"* fallback, plus bommel/runden inputs per row · Submit creates Spieltag + Ergebnisse atomically.

### 6.2 `/spieltage/<datum>` — Spieltag-Detail *(read for all signed-in)*
Datum · Foto · Notizen · Tabelle der Ergebnisse. *Admins* see *Bearbeiten* and *Löschen* buttons.

### 6.3 `/spieltage` — Liste
Reverse-chronological. Datum, Anzahl Spieler, Σ Runden, Foto-Thumbnail. Click → detail.

### 6.4 `/` — Statistik
Year tabs (2020 → current). Sortable table from `player_stats_by_year`. Charts: Bommel/Runde per Spieler (Balken), Anwesenheit (Balken), trend over years (Linie). Filters added incrementally.

### 6.5 `/spieler` — Spieler verwalten
List: kürzel, name, all-time Spieltage. *Admins* can rename. *Users* can add new kürzel. **No delete.**

### 6.6 `/admin/users` — Benutzer verwalten *(admin only)*
Pending-Liste mit *Freigeben*. Aktive Benutzer mit Rollenwechsel.

### 6.7 `/auth` — Anmelden
„Mit Google anmelden" · E-Mail-Feld → „Magic Link senden". Pending-Screen wenn anwendbar.

---

## 7. Sheet import

One-time seed driven by the existing Google Sheet:

- **604 raw entries** from the `Daten` tab → `spieltage` (one row per distinct `datum`) + `ergebnisse` (one row per `(datum, kürzel)`).
- **32 player rows** from the `Kürzel` tab → `players`. `name` imported **verbatim** — even when it's a date or `?` placeholder. You can rename later in `/spieler`.
- Any kürzel appearing in `Daten` but missing from `Kürzel` is auto-added to `players` with `name = NULL`.
- Date formats `DD.MM.YYYY` and `YYYY-MM-DD` (sheet has both) are normalised to ISO.
- The CSVs of `Daten` and `Kürzel` are checked in to `seed/` so import is reproducible without re-fetching the Sheet.
- `pnpm seed` is **idempotent** — safe to run multiple times.

Sanity assertion at the end of the seed: **85 distinct dates, 604 ergebnisse, 2090 runden total**. (One Spieltag is dated `1924-12-02` — a typo in the source sheet for `2024-12-02`. Imported as-is; rename via the UI when convenient. The Daten tab's printed `530 / 1801` header was a stale filter-formula cache, not the actual totals.)

---

## 8. Dev / runtime

```yaml
# docker-compose.yml (sketch)
services:
  app:      # SvelteKit Node server, exposes :3000
  db:       # postgres:16, volume pgdata
  mailpit:  # dev profile only — SMTP :1025, web UI :8025
volumes:
  pgdata:
  photos:
```

`pnpm dev` runs SvelteKit's dev server natively and talks to dockerized `db` + `mailpit`. `docker compose up` (no profile) for a prod-shaped run.

### Required env vars

| Var | Notes |
| --- | --- |
| `DATABASE_URL` | `postgres://…` |
| `BETTER_AUTH_SECRET` | random 32+ bytes |
| `BETTER_AUTH_URL` | public origin, e.g. `http://localhost:3000` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | from Google Cloud Console |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM` | mailpit in dev; any relay in prod |
| `ADMIN_EMAIL` | first admin, auto-promoted on sign-in |

A committed `.env.example` documents all of them.

---

## 9. Architecture notes

- **Aggregations live in SQL.** Year filters, ratios, and Anwesenheit collapse to one view; client-side aggregation invites bugs.
- **`datum` denominator pitfall.** `Anwesenheit` divides by *all* distinct dates in the year (from `spieltage`), not the player's own dates. Encoded explicitly in the view.
- **Time zone.** `datum` is `date` (no time, no zone). Form submissions stay as local-date strings; never convert through UTC.
- **No premature flexibility.** Six screens, ~30 players, low-hundreds Spieltage. SvelteKit + a few forms is the whole app — resist TanStack Query, Zustand, microservices, etc.
- **Lock-in.** Self-hosted on Docker; data is plain Postgres + a volume. Move anywhere with `pg_dump` + `cp -r /data/photos`.

---

## 10. Roadmap

- **v0** — design doc, README, gitignore *(committed: `100fb2d`)*.
- **v1** — repo scaffold, Docker compose, schema migrations, auth + role gates, Spieltag CRUD with photo, Players view, year-stats table + charts, sheet import seed.
- **v1.1** — filters and sortable columns on stats, more chart types.
- **v2** — head-to-head, per-month aggregations, CSV export, OCR for the photos if useful.
