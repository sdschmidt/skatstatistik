import { and, asc, desc, eq, gte, lte, sql, type SQL } from 'drizzle-orm';
import { db } from './db';
import { ergebnisse, players, spieltage } from './schema';

export type SpieltageSort = 'date' | 'players' | 'runden' | 'bommel';
export type SpieltageDir = 'asc' | 'desc';

export type SpieltageFilters = {
	from?: string;
	to?: string;
	minPlayers?: number;
	maxPlayers?: number;
	minRunden?: number;
	maxRunden?: number;
	minBommel?: number;
	maxBommel?: number;
	sort?: SpieltageSort;
	dir?: SpieltageDir;
};

export async function listSpieltage(f: SpieltageFilters = {}) {
	const playerCountExpr = sql<number>`count(distinct ${ergebnisse.playerId})::int`;
	const rundenExpr = sql<number>`coalesce(sum(${ergebnisse.runden}), 0)::int`;
	const bommelExpr = sql<number>`coalesce(sum(${ergebnisse.bommel}), 0)::int`;

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
			: undefined,
		f.minBommel !== undefined
			? sql`coalesce(sum(${ergebnisse.bommel}), 0) >= ${f.minBommel}`
			: undefined,
		f.maxBommel !== undefined
			? sql`coalesce(sum(${ergebnisse.bommel}), 0) <= ${f.maxBommel}`
			: undefined
	);

	const dirFn = f.dir === 'asc' ? asc : desc;
	const orderBy: SQL[] =
		f.sort === 'players'
			? [dirFn(playerCountExpr), desc(spieltage.datum)]
			: f.sort === 'runden'
				? [dirFn(rundenExpr), desc(spieltage.datum)]
				: f.sort === 'bommel'
					? [dirFn(bommelExpr), desc(spieltage.datum)]
					: [dirFn(spieltage.datum)];

	return db
		.select({
			datum: spieltage.datum,
			photoPath: spieltage.photoPath,
			notes: spieltage.notes,
			playerCount: playerCountExpr,
			runden: rundenExpr,
			bommel: bommelExpr
		})
		.from(spieltage)
		.leftJoin(ergebnisse, eq(ergebnisse.datum, spieltage.datum))
		.where(where)
		.groupBy(spieltage.datum, spieltage.photoPath, spieltage.notes)
		.having(having)
		.orderBy(...orderBy);
}

export async function spieltageBounds() {
	const rows = await db.execute<{
		max_players: number;
		max_runden: number;
		max_bommel: number;
		min_date: string | null;
		max_date: string | null;
	}>(sql`
		select
			coalesce(max(player_count), 0)::int as max_players,
			coalesce(max(runden_sum),  0)::int as max_runden,
			coalesce(max(bommel_sum),  0)::int as max_bommel,
			(select min(datum)::text from spieltage) as min_date,
			(select max(datum)::text from spieltage) as max_date
		from (
			select count(distinct player_id) as player_count,
			       coalesce(sum(runden), 0) as runden_sum,
			       coalesce(sum(bommel), 0) as bommel_sum
			from ergebnisse
			group by datum
		) x
	`);
	return rows[0] ?? { max_players: 0, max_runden: 0, max_bommel: 0, min_date: null, max_date: null };
}

// ──────────────────────────────────────────────────────────────────────
// /runden — one row per ergebnis
// ──────────────────────────────────────────────────────────────────────

export type ErgebnisseSort = 'date' | 'kuerzel' | 'bommel' | 'runden';

export type ErgebnisseFilters = {
	from?: string;
	to?: string;
	minRunden?: number;
	maxRunden?: number;
	minBommel?: number;
	maxBommel?: number;
	playerId?: string;
	sort?: ErgebnisseSort;
	dir?: 'asc' | 'desc';
};

export async function listErgebnisse(f: ErgebnisseFilters = {}) {
	const where = and(
		f.from ? gte(ergebnisse.datum, f.from) : undefined,
		f.to ? lte(ergebnisse.datum, f.to) : undefined,
		f.minBommel !== undefined ? gte(ergebnisse.bommel, f.minBommel) : undefined,
		f.maxBommel !== undefined ? lte(ergebnisse.bommel, f.maxBommel) : undefined,
		f.minRunden !== undefined ? gte(ergebnisse.runden, f.minRunden) : undefined,
		f.maxRunden !== undefined ? lte(ergebnisse.runden, f.maxRunden) : undefined,
		f.playerId ? eq(ergebnisse.playerId, f.playerId) : undefined
	);

	const dirFn = f.dir === 'asc' ? asc : desc;
	const orderBy: SQL[] =
		f.sort === 'kuerzel'
			? [dirFn(players.kuerzel), desc(ergebnisse.datum)]
			: f.sort === 'bommel'
				? [dirFn(ergebnisse.bommel), desc(ergebnisse.datum), asc(players.kuerzel)]
				: f.sort === 'runden'
					? [dirFn(ergebnisse.runden), desc(ergebnisse.datum), asc(players.kuerzel)]
					: [dirFn(ergebnisse.datum), asc(players.kuerzel)];

	return db
		.select({
			datum: ergebnisse.datum,
			kuerzel: players.kuerzel,
			name: players.name,
			bommel: ergebnisse.bommel,
			runden: ergebnisse.runden
		})
		.from(ergebnisse)
		.innerJoin(players, eq(players.id, ergebnisse.playerId))
		.where(where)
		.orderBy(...orderBy);
}

// ──────────────────────────────────────────────────────────────────────
// Per-player page (/spieler/[kuerzel])
// ──────────────────────────────────────────────────────────────────────

export async function getPlayerByKuerzel(kuerzel: string) {
	const [row] = await db.select().from(players).where(eq(players.kuerzel, kuerzel));
	return row ?? null;
}

export type PlayerSummaryFilters = {
	from?: string;
	to?: string;
	minBommel?: number;
	maxBommel?: number;
	minRunden?: number;
	maxRunden?: number;
};

export async function playerSummary(playerId: string, f: PlayerSummaryFilters) {
	// Bommel/Runden sums respect ALL filters (date + bommel/runden ranges).
	const aggRows = await db.execute<{ runden: number; bommel: number; spieltage_filtered: number }>(
		sql`select
		      coalesce(sum(runden), 0)::int     as runden,
		      coalesce(sum(bommel), 0)::int     as bommel,
		      count(distinct datum)::int        as spieltage_filtered
		    from ergebnisse
		    where player_id = ${playerId}
		      ${f.from ? sql`and datum >= ${f.from}` : sql``}
		      ${f.to ? sql`and datum <= ${f.to}` : sql``}
		      ${f.minBommel !== undefined ? sql`and bommel >= ${f.minBommel}` : sql``}
		      ${f.maxBommel !== undefined ? sql`and bommel <= ${f.maxBommel}` : sql``}
		      ${f.minRunden !== undefined ? sql`and runden >= ${f.minRunden}` : sql``}
		      ${f.maxRunden !== undefined ? sql`and runden <= ${f.maxRunden}` : sql``}`
	);
	const agg = aggRows[0] ?? { runden: 0, bommel: 0, spieltage_filtered: 0 };

	// Anwesenheit uses only the DATE filter — it's about presence, not the
	// shape of the rounds played that day.
	const anwRows = await db.execute<{ played: number; total: number }>(
		sql`select
		      (select count(distinct e.datum)::int
		         from ergebnisse e
		         where e.player_id = ${playerId}
		           ${f.from ? sql`and e.datum >= ${f.from}` : sql``}
		           ${f.to ? sql`and e.datum <= ${f.to}` : sql``}
		      ) as played,
		      (select count(*)::int from spieltage s
		         where 1=1
		           ${f.from ? sql`and s.datum >= ${f.from}` : sql``}
		           ${f.to ? sql`and s.datum <= ${f.to}` : sql``}
		      ) as total`
	);
	const anw = anwRows[0] ?? { played: 0, total: 0 };

	return {
		runden: agg.runden,
		bommel: agg.bommel,
		spieltage: agg.spieltage_filtered,
		bommelPerRunde: agg.runden ? agg.bommel / agg.runden : null,
		gewinnrate: agg.runden ? (agg.runden - agg.bommel) / agg.runden : null,
		anwesenheitNumerator: anw.played,
		anwesenheitDenominator: anw.total,
		anwesenheit: anw.total ? anw.played / anw.total : null
	};
}

export async function playerCalendar(playerId: string, from?: string, to?: string) {
	// Every Spieltag in the date range, with this player's runden if they were
	// there (NULL if they weren't). The calendar respects the date filter only;
	// bommel/runden range filters narrow the table below, not the activity grid.
	return db.execute<{ datum: string; runden: number | null }>(
		sql`select s.datum::text as datum, e.runden as runden
		    from spieltage s
		    left join ergebnisse e on e.datum = s.datum and e.player_id = ${playerId}
		    where 1=1
		      ${from ? sql`and s.datum >= ${from}` : sql``}
		      ${to ? sql`and s.datum <= ${to}` : sql``}
		    order by s.datum`
	);
}

export async function ergebnisseBounds() {
	const rows = await db.execute<{
		max_runden: number;
		max_bommel: number;
		min_date: string | null;
		max_date: string | null;
	}>(sql`
		select coalesce(max(runden), 0)::int as max_runden,
		       coalesce(max(bommel), 0)::int as max_bommel,
		       (select min(datum)::text from spieltage) as min_date,
		       (select max(datum)::text from spieltage) as max_date
		from ergebnisse
	`);
	return rows[0] ?? { max_runden: 0, max_bommel: 0, min_date: null, max_date: null };
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

export type StatsRow = {
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
};

export type StatsSort =
	| 'kuerzel'
	| 'name'
	| 'spieltage'
	| 'runden'
	| 'bommel'
	| 'bommel_per_runde'
	| 'gewinnrate'
	| 'anwesenheit';

const STATS_SORT_FRAGMENTS: Record<StatsSort, ReturnType<typeof sql>> = {
	kuerzel: sql`kuerzel`,
	name: sql`name`,
	spieltage: sql`spieltage`,
	runden: sql`runden`,
	bommel: sql`bommel`,
	bommel_per_runde: sql`bommel_per_runde`,
	gewinnrate: sql`gewinnrate`,
	anwesenheit: sql`anwesenheit`
};

export async function statsByYear(
	year: number,
	sort: StatsSort = 'spieltage',
	dir: 'asc' | 'desc' = 'desc'
) {
	const sortFrag = STATS_SORT_FRAGMENTS[sort] ?? STATS_SORT_FRAGMENTS.spieltage;
	const dirFrag = dir === 'asc' ? sql`asc` : sql`desc`;
	return db.execute<StatsRow>(
		sql`select * from player_stats_by_year
		    where year = ${year}
		    order by ${sortFrag} ${dirFrag} nulls last, kuerzel asc`
	);
}

export async function statsAllTime(
	sort: StatsSort = 'spieltage',
	dir: 'asc' | 'desc' = 'desc'
) {
	const sortFrag = STATS_SORT_FRAGMENTS[sort] ?? STATS_SORT_FRAGMENTS.spieltage;
	const dirFrag = dir === 'asc' ? sql`asc` : sql`desc`;
	return db.execute<StatsRow>(
		sql`select * from player_stats_all_time
		    order by ${sortFrag} ${dirFrag} nulls last, kuerzel asc`
	);
}

export async function allTimeTotals() {
	const rows = await db.execute<{ spieltage: number; runden: number }>(
		sql`select count(distinct s.datum)::int as spieltage,
		           coalesce(sum(e.runden), 0)::int as runden
		    from spieltage s
		    left join ergebnisse e on e.datum = s.datum`
	);
	return rows[0] ?? { spieltage: 0, runden: 0 };
}

export async function yearTotals(year: number) {
	const rows = await db.execute<{ spieltage: number; runden: number }>(
		sql`select count(distinct s.datum)::int as spieltage,
		           coalesce(sum(e.runden), 0)::int as runden
		    from spieltage s
		    left join ergebnisse e on e.datum = s.datum
		    where extract(year from s.datum)::int = ${year}`
	);
	return rows[0] ?? { spieltage: 0, runden: 0 };
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
