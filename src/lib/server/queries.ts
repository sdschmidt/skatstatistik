import { and, asc, desc, eq, gt, gte, lt, lte, sql, type SQL } from 'drizzle-orm';
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

export async function playerLatestYear(playerId: string): Promise<number | null> {
	const rows = await db.execute<{ y: number | null }>(
		sql`select extract(year from max(datum))::int as y
		    from ergebnisse where player_id = ${playerId}`
	);
	return rows[0]?.y ?? null;
}

export async function playerStreaks(
	playerId: string
): Promise<{ current: number; longest: number }> {
	const rows = await db.execute<{ played: boolean }>(
		sql`select e.player_id is not null as played
		    from spieltage s
		    left join ergebnisse e on e.datum = s.datum and e.player_id = ${playerId}
		    order by s.datum`
	);
	let longest = 0;
	let run = 0;
	for (const r of rows) {
		if (r.played) {
			run++;
			if (run > longest) longest = run;
		} else {
			run = 0;
		}
	}
	let current = 0;
	for (let i = rows.length - 1; i >= 0; i--) {
		if (rows[i].played) current++;
		else break;
	}
	return { current, longest };
}

export async function playerMonthlyHistory(playerId: string) {
	return db.execute<{ month: string; bommel: number; runden: number }>(
		sql`select to_char(date_trunc('month', datum), 'YYYY-MM') as month,
		           sum(bommel)::int as bommel,
		           sum(runden)::int as runden
		    from ergebnisse
		    where player_id = ${playerId}
		    group by date_trunc('month', datum)
		    order by month`
	);
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

// Used by the activity calendar on the Statistik page. Each row is one Spieltag
// with the day's total runden — drives the colour scale.
// Per-player rolling Bommel/Runde over a sliding window of `windowRounds`
// rounds. Each spieltag in the player's history yields one point: the
// fraction of bommel/runden in the window ending at that date.
//
// Drives:
//   • the inline Sparkline on the Statistik table (values only),
//   • the line chart on /spieler/[kuerzel] (datum + value).
export async function rollingBpr(
	windowRounds = 30
): Promise<Map<string, { datum: string; bpr: number }[]>> {
	const rows = await db.execute<{
		player_id: string;
		datum: string;
		bommel: number;
		runden: number;
	}>(
		sql`select player_id, datum::text as datum, bommel, runden
		    from ergebnisse
		    order by player_id, datum`
	);
	const out = new Map<string, { datum: string; bpr: number }[]>();
	let curr: string | null = null;
	let buf: { b: number; r: number }[] = [];
	let wB = 0;
	let wR = 0;
	for (const row of rows) {
		if (row.player_id !== curr) {
			curr = row.player_id;
			buf = [];
			wB = 0;
			wR = 0;
			out.set(curr, []);
		}
		buf.push({ b: row.bommel, r: row.runden });
		wB += row.bommel;
		wR += row.runden;
		// Shrink window from the front while dropping the oldest still leaves at
		// least `windowRounds` runden in the window. After the loop the window
		// contains the most recent ~windowRounds rounds.
		while (buf.length > 1 && wR - buf[0].r >= windowRounds) {
			const oldest = buf.shift()!;
			wB -= oldest.b;
			wR -= oldest.r;
		}
		// Only emit a point once the player has accumulated at least
		// `windowRounds` rounds. Earlier samples are too noisy to be a
		// meaningful "rolling 30-round mean".
		if (wR >= windowRounds) {
			out.get(curr)!.push({ datum: row.datum, bpr: wB / wR });
		}
	}
	return out;
}

// Recent-window trend for Bommel/Runde and Gewinnrate. For each player, walks
// ergebnisse from newest to oldest, accumulates rounds into a "current" window
// until at least `windowRounds` are reached, then accumulates the next
// `windowRounds` into a "previous" window. Used on Statistik Gesamt where a
// year-over-year comparison doesn't apply but we still want a directional
// signal ("how is this player doing recently?").
export async function recentRoundsTrend(
	windowRounds = 50
): Promise<
	Map<
		string,
		{
			bpr_curr: number | null;
			bpr_prev: number | null;
			gewinn_curr: number | null;
			gewinn_prev: number | null;
		}
	>
> {
	const rows = await db.execute<{
		player_id: string;
		bommel: number;
		runden: number;
	}>(
		sql`select player_id, bommel, runden
		    from ergebnisse
		    order by player_id, datum desc`
	);
	const out = new Map<
		string,
		{
			bpr_curr: number | null;
			bpr_prev: number | null;
			gewinn_curr: number | null;
			gewinn_prev: number | null;
		}
	>();
	let curr: string | null = null;
	let cR = 0;
	let cB = 0;
	let pR = 0;
	let pB = 0;
	let phase: 0 | 1 | 2 = 0;

	const flush = (pid: string) => {
		const cFull = cR >= windowRounds;
		const pFull = pR >= windowRounds;
		out.set(pid, {
			bpr_curr: cFull ? cB / cR : null,
			bpr_prev: pFull ? pB / pR : null,
			gewinn_curr: cFull ? (cR - cB) / cR : null,
			gewinn_prev: pFull ? (pR - pB) / pR : null
		});
	};

	for (const row of rows) {
		if (row.player_id !== curr) {
			if (curr !== null) flush(curr);
			curr = row.player_id;
			cR = cB = pR = pB = 0;
			phase = 0;
		}
		if (phase === 2) continue;
		if (phase === 0) {
			cR += row.runden;
			cB += row.bommel;
			if (cR >= windowRounds) phase = 1;
		} else {
			pR += row.runden;
			pB += row.bommel;
			if (pR >= windowRounds) phase = 2;
		}
	}
	if (curr !== null) flush(curr);
	return out;
}

// Recent-window Anwesenheit trend. Takes the latest `windowSpieltage` actual
// spieltage and the `windowSpieltage` before that as the prior window. For
// each player, anwesenheit = (# of those spieltage they appeared in) / window
// size. Used alongside recentRoundsTrend on Statistik Gesamt.
export async function recentSpieltageTrend(
	windowSpieltage = 16
): Promise<
	Map<string, { anwesenheit_curr: number | null; anwesenheit_prev: number | null }>
> {
	const dates = await db.execute<{ datum: string }>(
		sql`select datum::text as datum from spieltage
		    order by datum desc
		    limit ${windowSpieltage * 2}`
	);
	const out = new Map<
		string,
		{ anwesenheit_curr: number | null; anwesenheit_prev: number | null }
	>();
	if (dates.length === 0) return out;
	const currDates = dates.slice(0, windowSpieltage).map((r) => r.datum);
	const prevDates = dates.slice(windowSpieltage, windowSpieltage * 2).map((r) => r.datum);
	const currFrom = currDates[currDates.length - 1];
	const currTo = currDates[0];
	const havePrev = prevDates.length === windowSpieltage;
	const prevFrom = havePrev ? prevDates[prevDates.length - 1] : null;
	const prevTo = havePrev ? prevDates[0] : null;
	const rangeFrom = prevFrom ?? currFrom;
	const rangeTo = currTo;

	const rows = await db.execute<{
		player_id: string;
		curr_count: number;
		prev_count: number;
	}>(
		sql`select
		      player_id,
		      count(*) filter (where datum between ${currFrom} and ${currTo})::int as curr_count,
		      count(*) filter (where ${havePrev ? sql`datum between ${prevFrom} and ${prevTo}` : sql`false`})::int as prev_count
		    from ergebnisse
		    where datum between ${rangeFrom} and ${rangeTo}
		    group by player_id`
	);
	for (const r of rows) {
		out.set(r.player_id, {
			anwesenheit_curr: Number(r.curr_count) / windowSpieltage,
			anwesenheit_prev: havePrev ? Number(r.prev_count) / windowSpieltage : null
		});
	}
	return out;
}

// LEGACY — kept for symmetry with the old per-year sparkline. Unused after the
// rolling-window refactor; safe to delete in a follow-up.
export async function bommelPerRundeByPlayerByYear(): Promise<Map<string, (number | null)[]>> {
	const rows = await db.execute<{ player_id: string; year: number; bpr: number | null }>(
		sql`select player_id,
		           year,
		           bommel_per_runde::float8 as bpr
		    from player_stats_by_year
		    order by player_id, year`
	);
	const out = new Map<string, (number | null)[]>();
	const yearsSeen = new Set<number>();
	for (const r of rows) yearsSeen.add(r.year);
	const sortedYears = [...yearsSeen].sort((a, b) => a - b);
	const yearIdx = new Map(sortedYears.map((y, i) => [y, i]));
	for (const r of rows) {
		if (!out.has(r.player_id)) {
			out.set(r.player_id, new Array<number | null>(sortedYears.length).fill(null));
		}
		const arr = out.get(r.player_id)!;
		const idx = yearIdx.get(r.year);
		if (idx !== undefined) arr[idx] = r.bpr ?? null;
	}
	return out;
}

export async function spieltageWithTotals(year?: number) {
	return db.execute<{ datum: string; runden: number }>(
		sql`select s.datum::text as datum,
		           coalesce(sum(e.runden), 0)::int as runden
		    from spieltage s
		    left join ergebnisse e on e.datum = s.datum
		    where 1=1
		      ${year !== undefined ? sql`and extract(year from s.datum)::int = ${year}` : sql``}
		    group by s.datum
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

export async function adjacentSpieltage(
	datum: string
): Promise<{ prev: string | null; next: string | null }> {
	const [prev] = await db
		.select({ datum: spieltage.datum })
		.from(spieltage)
		.where(lt(spieltage.datum, datum))
		.orderBy(desc(spieltage.datum))
		.limit(1);
	const [next] = await db
		.select({ datum: spieltage.datum })
		.from(spieltage)
		.where(gt(spieltage.datum, datum))
		.orderBy(asc(spieltage.datum))
		.limit(1);
	return { prev: prev?.datum ?? null, next: next?.datum ?? null };
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

// Same shape as statsByYear but for an arbitrary date range. Used to compute
// year-over-year trends fairly: the current year may be partial (e.g. May), so
// we compare against the same partial slice of the previous year, not its
// full 12 months.
export async function statsForRange(fromIso: string, toIso: string) {
	return db.execute<StatsRow>(
		sql`select
		      ${0}::int                                                                          as year,
		      p.id                                                                              as player_id,
		      p.kuerzel,
		      p.name,
		      count(distinct e.datum)::int                                                      as spieltage,
		      sum(e.runden)::int                                                                as runden,
		      sum(e.bommel)::int                                                                as bommel,
		      sum(e.bommel)::numeric / nullif(sum(e.runden), 0)                                 as bommel_per_runde,
		      (sum(e.runden) - sum(e.bommel))::numeric / nullif(sum(e.runden), 0)               as gewinnrate,
		      count(distinct e.datum)::numeric / nullif(
		        (select count(*)::numeric from spieltage where datum between ${fromIso} and ${toIso}), 0
		      )                                                                                 as anwesenheit
		    from ergebnisse e
		    join players p on p.id = e.player_id
		    where e.datum between ${fromIso} and ${toIso}
		    group by p.id, p.kuerzel, p.name`
	);
}

// Latest spieltag in a given year (or null if no data). Used to decide where
// the YTD cutoff is for trend comparisons.
export async function maxDatumInYear(year: number): Promise<string | null> {
	const rows = await db.execute<{ d: string | null }>(
		sql`select max(datum)::text as d from spieltage
		    where extract(year from datum)::int = ${year}`
	);
	return rows[0]?.d ?? null;
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
