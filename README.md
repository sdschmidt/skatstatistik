# skatstatistik

A small web app for tracking Skat group results — Spieltage, Spieler, Bommel, Runden — with photo upload of the tally sheet and per-year statistics.

> Status: **design phase**. Nothing is built yet. See [`DESIGN.md`](./DESIGN.md) for the proposed architecture, data model, and open questions.

## What it will do

- Enter results per Spieltag: `datum`, players (`kürzel`), `bommel`, `runden`.
- Optional photo of the day's tally sheet, stored alongside the data.
- Manage players (`kürzel` ↔ `name`); add new kürzel on the fly while entering a Spieltag.
- Per-year statistics: `Spieltage`, `Runden`, `Bommel/Runde`, `Anwesenheit` — filterable.
- View, edit, delete a single Spieltag.
- Sign in with Google or via email magic link.

## Proposed stack

- **Backend:** [Supabase](https://supabase.com) — Postgres + Auth + Storage.
- **Frontend:** [SvelteKit](https://kit.svelte.dev) + TailwindCSS.
- **Auth:** Google OAuth + email magic link (Supabase).

Alternatives considered (Next.js, Pocketbase, Firebase, custom): see `DESIGN.md §3–§4`.

## Reference

The current implementation lives as a Google Sheet:
<https://docs.google.com/spreadsheets/d/11onUP0lXANQfPYg49CLQLXRpRx8tVdZF6ZnlapiC3u4/edit>

## Repository layout

```
.
├── DESIGN.md      design document, options, decisions, open questions
└── README.md      this file
```

Source code will land in subsequent commits once the stack choice is confirmed.

## Open questions

Before scaffolding starts, decide:

1. Stack: SvelteKit + Supabase as proposed?
2. Data scope: shared across Skat group, or per-user?
3. Auth providers in v1: Google + magic link only, or add password / others?
4. Hosting: Vercel + Supabase cloud, or self-host?
5. UI language: German throughout?

See `DESIGN.md §9` for the full list.
