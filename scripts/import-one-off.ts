// One-off import of the JSON sidecars under import_one_off/processed/.
//
// Behavior:
//   • For each unique Spieltag the sidecars cover, copy ONE photo to
//     data/photos/<datum>.<ext> and record photoPath on spieltage.
//   • If the Spieltag already exists in the DB (from the Google Sheet seed),
//     ergebnisse are NOT overwritten — the seed is treated as authoritative.
//     Only photoPath and notes are updated.
//   • If the Spieltag is new, ergebnisse are inserted from the JSON.
//   • Duplicate JSONs for the same Spieltag are merged: the one with the
//     most rows wins for ergebnisse, but its source_image is the chosen photo.
//
// Run:  pnpm tsx --env-file=.env scripts/import-one-off.ts

import { readdirSync, readFileSync, copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { sql, eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../src/lib/server/schema.ts';

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL is required');
	process.exit(1);
}

const PROCESSED_DIR = 'import_one_off/processed';
const PHOTOS_DIR = process.env.PHOTOS_DIR || './data/photos';

type Sidecar = {
	spieltag: string;
	spieltag_source: string;
	source_image: string;
	paper_date_raw?: string;
	results: { kuerzel: string; bommel: number; rounds: number; check?: boolean; note?: string }[];
	total_euro?: number;
	notes?: string;
};

// Load all sidecars
const sidecarFiles = readdirSync(PROCESSED_DIR).filter((f) => f.endsWith('.json'));
const sidecars: Sidecar[] = sidecarFiles.map((f) =>
	JSON.parse(readFileSync(join(PROCESSED_DIR, f), 'utf-8'))
);
console.log(`loaded ${sidecars.length} sidecars`);

// Group by Spieltag
const byDate = new Map<string, Sidecar[]>();
for (const s of sidecars) {
	const list = byDate.get(s.spieltag) ?? [];
	list.push(s);
	byDate.set(s.spieltag, list);
}
console.log(`${byDate.size} unique Spieltage`);

// For each date, pick the sidecar with the most rows as the primary
function pickPrimary(group: Sidecar[]): Sidecar {
	return [...group].sort((a, b) => b.results.length - a.results.length)[0];
}

// Build a notes string capturing the photo source(s) and any per-image notes
function buildNotes(group: Sidecar[]): string | null {
	const parts: string[] = [];
	for (const s of group) {
		const img = s.source_image;
		if (s.notes) parts.push(`[${img}] ${s.notes}`);
	}
	return parts.length ? parts.join('\n') : null;
}

const client = postgres(url, { max: 1 });
const db = drizzle(client, { schema });

mkdirSync(PHOTOS_DIR, { recursive: true });

let newCount = 0;
let photoOnlyCount = 0;
let skipNoPhoto = 0;
const conflicts: { datum: string; reason: string }[] = [];

try {
	// What's already in the DB?
	const existing = await db.execute<{ datum: string }>(
		sql`select datum::text from spieltage where datum >= '2024-01-01'`
	);
	const existingDates = new Set(existing.map((r) => r.datum));
	console.log(`DB already has ${existingDates.size} Spieltage in 2024+ range`);

	// Sort dates for deterministic output
	const dates = [...byDate.keys()].sort();

	for (const datum of dates) {
		const group = byDate.get(datum)!;
		const primary = pickPrimary(group);
		const isExisting = existingDates.has(datum);

		// Copy photo into data/photos/<datum>.<ext>
		const srcPath = join(PROCESSED_DIR, primary.source_image);
		const ext = extname(primary.source_image).toLowerCase() || '.jpg';
		const photoFilename = `${datum}${ext}`;
		const dstPath = join(PHOTOS_DIR, photoFilename);
		if (!existsSync(srcPath)) {
			console.warn(`  ! ${datum}: source image missing: ${srcPath} — skipping photo`);
			skipNoPhoto++;
			continue;
		}
		copyFileSync(srcPath, dstPath);

		const notes = buildNotes(group);

		if (isExisting) {
			// Update photo + notes only — preserve existing ergebnisse
			await db
				.update(schema.spieltage)
				.set({ photoPath: photoFilename, notes })
				.where(eq(schema.spieltage.datum, datum));
			photoOnlyCount++;
			console.log(`  ~ ${datum}: existing — added photo (${photoFilename}), preserved ergebnisse`);
		} else {
			// Full insert
			await db.transaction(async (tx) => {
				// Ensure all players exist
				const allPlayers = await tx.select().from(schema.players);
				const idByKuerzel = new Map(allPlayers.map((p) => [p.kuerzel, p.id]));
				const newKuerzel = [
					...new Set(
						primary.results
							.map((r) => r.kuerzel.trim())
							.filter((k) => k && !idByKuerzel.has(k))
					)
				];
				if (newKuerzel.length) {
					const created = await tx
						.insert(schema.players)
						.values(newKuerzel.map((kuerzel) => ({ kuerzel })))
						.returning();
					for (const p of created) idByKuerzel.set(p.kuerzel, p.id);
				}

				// Insert spieltag
				await tx.insert(schema.spieltage).values({
					datum,
					photoPath: photoFilename,
					notes
				});

				// Insert ergebnisse
				if (primary.results.length) {
					await tx.insert(schema.ergebnisse).values(
						primary.results.map((r) => ({
							datum,
							playerId: idByKuerzel.get(r.kuerzel.trim())!,
							bommel: r.bommel,
							runden: r.rounds
						}))
					);
				}
			});
			newCount++;
			console.log(
				`  + ${datum}: new — ${primary.results.length} ergebnisse, photo ${photoFilename}`
			);
		}
	}

	// Final counts
	const [{ sp }] = await db.select({ sp: sql<number>`count(*)::int` }).from(schema.spieltage);
	const [{ erg }] = await db.select({ erg: sql<number>`count(*)::int` }).from(schema.ergebnisse);
	const [{ pl }] = await db.select({ pl: sql<number>`count(*)::int` }).from(schema.players);
	const [{ ph }] = await db
		.select({ ph: sql<number>`count(*)::int` })
		.from(schema.spieltage)
		.where(sql`photo_path is not null`);

	console.log('\n=== Summary ===');
	console.log(`  new Spieltage inserted:        ${newCount}`);
	console.log(`  existing Spieltage photo-only: ${photoOnlyCount}`);
	console.log(`  skipped (no source photo):     ${skipNoPhoto}`);
	console.log(`  DB totals: ${sp} spieltage, ${erg} ergebnisse, ${pl} players, ${ph} with photoPath`);
	if (conflicts.length) {
		console.log(`  ${conflicts.length} conflicts:`);
		for (const c of conflicts) console.log(`    ${c.datum}: ${c.reason}`);
	}
} finally {
	await client.end();
}
