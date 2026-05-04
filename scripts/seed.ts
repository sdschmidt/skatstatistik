// One-time idempotent import of the Google Sheet's `Daten` and `Kürzel` tabs.
// Run with `pnpm seed`. Safe to re-run: ON CONFLICT DO NOTHING throughout.

import { readFileSync } from 'node:fs';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/lib/server/schema.ts';

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL is required (see .env.example)');
	process.exit(1);
}

function parseCSV(content: string): string[][] {
	const rows: string[][] = [];
	let row: string[] = [];
	let cell = '';
	let inQuotes = false;
	for (let i = 0; i < content.length; i++) {
		const c = content[i];
		if (inQuotes) {
			if (c === '"' && content[i + 1] === '"') {
				cell += '"';
				i++;
			} else if (c === '"') {
				inQuotes = false;
			} else {
				cell += c;
			}
		} else if (c === '"') {
			inQuotes = true;
		} else if (c === ',') {
			row.push(cell);
			cell = '';
		} else if (c === '\n') {
			row.push(cell);
			rows.push(row);
			row = [];
			cell = '';
		} else if (c !== '\r') {
			cell += c;
		}
	}
	if (cell || row.length) {
		row.push(cell);
		rows.push(row);
	}
	return rows.filter((r) => r.some((v) => v !== ''));
}

function toIso(d: string): string {
	const de = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(d);
	if (de) return `${de[3]}-${de[2]}-${de[1]}`;
	if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
	throw new Error(`unrecognised date format: ${d}`);
}

const datenCsv = parseCSV(readFileSync('seed/daten.csv', 'utf-8')).slice(1);
const kuerzelCsv = parseCSV(readFileSync('seed/kuerzel.csv', 'utf-8')).slice(1);

// Build kuerzel → name map (verbatim from sheet; later auto-add unknown kürzel from Daten).
const playerNameByKuerzel = new Map<string, string | null>();
for (const [k, n] of kuerzelCsv) {
	if (k) playerNameByKuerzel.set(k, n || null);
}
for (const [, k] of datenCsv) {
	if (k && !playerNameByKuerzel.has(k)) playerNameByKuerzel.set(k, null);
}

const client = postgres(url, { max: 1 });
const db = drizzle(client, { schema });

try {
	console.log(`importing ${playerNameByKuerzel.size} players, ${datenCsv.length} ergebnisse…`);

	// 1) players (idempotent)
	await db
		.insert(schema.players)
		.values([...playerNameByKuerzel].map(([kuerzel, name]) => ({ kuerzel, name })))
		.onConflictDoNothing({ target: schema.players.kuerzel });

	const allPlayers = await db.select().from(schema.players);
	const idByKuerzel = new Map(allPlayers.map((p) => [p.kuerzel, p.id]));

	// 2) spieltage — one per distinct datum
	const distinctDates = [...new Set(datenCsv.map((r) => toIso(r[0])))];
	await db
		.insert(schema.spieltage)
		.values(distinctDates.map((datum) => ({ datum })))
		.onConflictDoNothing();

	// 3) ergebnisse — chunked
	const ergebnisse = datenCsv.map(([datum, kuerzel, , bommel, runden]) => {
		const playerId = idByKuerzel.get(kuerzel);
		if (!playerId) throw new Error(`unknown kuerzel: ${kuerzel}`);
		return {
			datum: toIso(datum),
			playerId,
			bommel: parseInt(bommel || '0', 10),
			runden: parseInt(runden || '0', 10)
		};
	});
	for (let i = 0; i < ergebnisse.length; i += 200) {
		await db
			.insert(schema.ergebnisse)
			.values(ergebnisse.slice(i, i + 200))
			.onConflictDoNothing();
	}

	// 4) sanity assertion
	const [{ sp }] = await db
		.select({ sp: sql<number>`count(*)::int` })
		.from(schema.spieltage);
	const [{ erg }] = await db
		.select({ erg: sql<number>`count(*)::int` })
		.from(schema.ergebnisse);
	const [{ runden }] = await db
		.select({ runden: sql<number>`coalesce(sum(runden),0)::int` })
		.from(schema.ergebnisse);

	const expected = { spieltage: 85, ergebnisse: 604, runden: 2090 };
	const got = { spieltage: sp, ergebnisse: erg, runden };
	console.log('counts:', got);

	if (
		got.spieltage !== expected.spieltage ||
		got.ergebnisse !== expected.ergebnisse ||
		got.runden !== expected.runden
	) {
		console.error('Sanity check FAILED:', { expected, got });
		process.exit(1);
	}
	console.log('Sanity check ✓ — Spieltage, Ergebnisse, and Runden total match the sheet.');
} finally {
	await client.end();
}
