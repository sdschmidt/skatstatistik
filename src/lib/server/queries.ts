import { and, asc, desc, eq, gte, lte, sql, type SQL } from 'drizzle-orm';
import { db } from './db';
import { ergebnisse, players, spieltage } from './schema';

export type SpieltageSort = 'date' | 'players' | 'runden';
export type SpieltageDir = 'asc' | 'desc';

export type SpieltageFilters = {
	from?: string;
	to?: string;
	minPlayers?: number;
	maxPlayers?: number;
	minRunden?: number;
	maxRunden?: number;
	sort?: SpieltageSort;
	dir?: SpieltageDir;
};

export async function listSpieltage(f: SpieltageFilters = {}) {
	const playerCountExpr = sql<number>`count(distinct ${ergebnisse.playerId})::int`;
	const rundenExpr = sql<number>`coalesce(sum(${ergebnisse.runden}), 0)::int`;

	const where = and(
		f.from ? gte(spieltage.datum, f.from) : undefined,
		f.to ? lte(spieltage.datum, f.to) : undefined
	);
	const having = and(
		f.minPlayers !== undefined
			? sql`count(distinct ${ergebnisse.playerId}) >= ${f.minPlayers}`
			: undefined,
		f.maxPlayers !== undefined
			? sql`count(distinct ${ergebnisse.playerId}) <= ${f.maxPlayers}`
			: undefined,
		f.minRunden !== undefined
			? sql`coalesce(sum(${ergebnisse.runden}), 0) >= ${f.minRunden}`
			: undefined,
		f.maxRunden !== undefined
			? sql`coalesce(sum(${ergebnisse.runden}), 0) <= ${f.maxRunden}`
			: undefined
	);

	const dirFn = f.dir === 'asc' ? asc : desc;
	const orderBy: SQL[] =
		f.sort === 'players'
			? [dirFn(playerCountExpr), desc(spieltage.datum)]
			: f.sort === 'runden'
				? [dirFn(rundenExpr), desc(spieltage.datum)]
				: [dirFn(spieltage.datum)];

	return db
		.select({
			datum: spieltage.datum,
			photoPath: spieltage.photoPath,
			notes: spieltage.notes,
			playerCount: playerCountExpr,
			runden: rundenExpr
		})
		.from(spieltage)
		.leftJoin(ergebnisse, eq(ergebnisse.datum, spieltage.datum))
		.where(where)
		.groupBy(spieltage.datum, spieltage.photoPath, spieltage.notes)
		.having(having)
		.orderBy(...orderBy);
}

export async function getSpieltag(datum: string) {
	const [s] = await db.select().from(spieltage).where(eq(spieltage.datum, datum));
	if (!s) return null;
	const rows = await db
		.select({
			playerId: ergebnisse.playerId,
			kuerzel: players.kuerzel,
			name: players.name,
			bommel: ergebnisse.bommel,
			runden: ergebnisse.runden
		})
		.from(ergebnisse)
		.innerJoin(players, eq(players.id, ergebnisse.playerId))
		.where(eq(ergebnisse.datum, datum))
		.orderBy(players.kuerzel);
	return { ...s, ergebnisse: rows };
}

export async function listPlayers() {
	return db
		.select({
			id: players.id,
			kuerzel: players.kuerzel,
			name: players.name,
			spieltage: sql<number>`count(distinct ${ergebnisse.datum})::int`
		})
		.from(players)
		.leftJoin(ergebnisse, eq(ergebnisse.playerId, players.id))
		.groupBy(players.id, players.kuerzel, players.name)
		.orderBy(players.kuerzel);
}

export async function ensurePlayer(kuerzel: string): Promise<string> {
	const k = kuerzel.trim();
	if (!k) throw new Error('Kürzel darf nicht leer sein.');
	const [existing] = await db.select().from(players).where(eq(players.kuerzel, k));
	if (existing) return existing.id;
	const [created] = await db.insert(players).values({ kuerzel: k }).returning();
	return created.id;
}

export async function renamePlayer(id: string, name: string | null): Promise<void> {
	await db.update(players).set({ name: name?.trim() || null }).where(eq(players.id, id));
}

export type SpieltagInput = {
	datum: string;
	photoPath: string | null;
	notes: string | null;
	players: { kuerzel: string; bommel: number; runden: number }[];
};

export async function upsertSpieltag(input: SpieltagInput): Promise<void> {
	await db.transaction(async (tx) => {
		// Ensure all players exist; create any unknown kuerzel with name = NULL.
		const existing = await tx.select().from(players);
		const idByKuerzel = new Map(existing.map((p) => [p.kuerzel, p.id]));
		const newKuerzel = input.players
			.map((p) => p.kuerzel.trim())
			.filter((k) => k && !idByKuerzel.has(k));
		const uniqueNew = [...new Set(newKuerzel)];
		if (uniqueNew.length) {
			const created = await tx
				.insert(players)
				.values(uniqueNew.map((kuerzel) => ({ kuerzel })))
				.returning();
			for (const p of created) idByKuerzel.set(p.kuerzel, p.id);
		}

		// Upsert spieltag
		await tx
			.insert(spieltage)
			.values({
				datum: input.datum,
				photoPath: input.photoPath,
				notes: input.notes
			})
			.onConflictDoUpdate({
				target: spieltage.datum,
				set: { photoPath: input.photoPath, notes: input.notes }
			});

		// Replace all ergebnisse for this date
		await tx.delete(ergebnisse).where(eq(ergebnisse.datum, input.datum));
		if (input.players.length) {
			await tx.insert(ergebnisse).values(
				input.players.map((p) => ({
					datum: input.datum,
					playerId: idByKuerzel.get(p.kuerzel.trim())!,
					bommel: p.bommel,
					runden: p.runden
				}))
			);
		}
	});
}

export async function deleteSpieltag(datum: string): Promise<void> {
	// ergebnisse cascade via FK; just drop the parent row.
	await db.delete(spieltage).where(eq(spieltage.datum, datum));
}

export async function statsByYear(year: number) {
	return db.execute<{
		year: number;
		player_id: string;
		kuerzel: string;
		name: string | null;
		spieltage: number;
		runden: number;
		bommel: number;
		bommel_per_runde: string | null;
		gewinnrate: string | null;
		anwesenheit: string | null;
	}>(
		sql`select * from player_stats_by_year where year = ${year} order by spieltage desc, kuerzel`
	);
}

export async function availableYears(): Promise<number[]> {
	const rows = await db.execute<{ year: number }>(
		sql`select distinct extract(year from datum)::int as year from spieltage order by year desc`
	);
	return rows.map((r) => r.year);
}

export type SpieltagListItem = Awaited<ReturnType<typeof listSpieltage>>[number];
export type SpieltagDetail = NonNullable<Awaited<ReturnType<typeof getSpieltag>>>;
export type PlayerListItem = Awaited<ReturnType<typeof listPlayers>>[number];
