# skatstatistik

A small web app for tracking Skat-group results — Spieltage, Spieler, Bommel, Runden — with photo upload of the daily tally sheet and per-year statistics.

> Status: **scaffolding next**. Stack and data model are locked. See [`DESIGN.md`](./DESIGN.md) for the full build spec.

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

## Repository layout

```
.
├── DESIGN.md      build spec — data model, stack, screens, import, roadmap
├── README.md      this file
└── .gitignore
```

Source code lands in subsequent commits.
