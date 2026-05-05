import {
	allTimeTotals,
	availableYears,
	maxDatumInYear,
	recentRoundsTrend,
	recentSpieltageTrend,
	rollingBpr,
	spieltageWithTotals,
	statsAllTime,
	statsByYear,
	statsForRange,
	yearTotals,
	type StatsSort
} from '$server/queries';
import type { PageServerLoad } from './$types';

const VALID_SORTS = new Set<StatsSort>([
	'kuerzel',
	'name',
	'spieltage',
	'runden',
	'bommel',
	'bommel_per_runde',
	'gewinnrate',
	'anwesenheit'
]);

export const load: PageServerLoad = async ({ url }) => {
	const years = await availableYears();
	const yearParam = url.searchParams.get('year');
	const isAll = yearParam === 'all';
	const requested = parseInt(yearParam ?? '', 10);
	const year = isAll ? null : years.includes(requested) ? requested : (years[0] ?? new Date().getFullYear());

	const sortRaw = url.searchParams.get('sort') as StatsSort | null;
	const sort: StatsSort = sortRaw && VALID_SORTS.has(sortRaw) ? sortRaw : 'spieltage';
	const dir: 'asc' | 'desc' = url.searchParams.get('dir') === 'asc' ? 'asc' : 'desc';

	// Gesamt's calendar is limited to the most recent year — full-history
	// activity in one strip would be repetitive and visually noisy.
	const calendarYear = isAll ? years[0] : (year as number);
	const [statsRows, totals, calendar] = isAll
		? await Promise.all([
				statsAllTime(sort, dir),
				allTimeTotals(),
				spieltageWithTotals(calendarYear)
			])
		: await Promise.all([
				statsByYear(year as number, sort, dir),
				yearTotals(year as number),
				spieltageWithTotals(year as number)
			]);

	// Prior-year lookup so the per-year tab can render trend arrows. Skipped on
	// Gesamt (no "previous Gesamt") and when this is the earliest year.
	const prevYear = !isAll && years.includes((year as number) - 1) ? (year as number) - 1 : null;
	const prevByPlayer = new Map<
		string,
		{
			spieltage: number;
			runden: number;
			bommel: number;
			bommel_per_runde: number | null;
			gewinnrate: number | null;
			anwesenheit: number | null;
		}
	>();
	if (prevYear !== null) {
		// Year-to-date alignment: take the latest spieltag in the *current* year
		// (e.g. 2026-05-04) and compare against the *previous* year up to the same
		// month-day (2025-01-01 … 2025-05-04). Counts (Spieltage / Runden /
		// Bommel) are otherwise inflated in the prev row simply because the prev
		// year is complete and the current isn't. For complete years (max date =
		// 12-31) this auto-collapses to a full-year comparison.
		const maxCurr = await maxDatumInYear(year as number);
		const prev = maxCurr
			? await statsForRange(`${prevYear}-01-01`, `${prevYear}-${maxCurr.slice(5)}`)
			: await statsByYear(prevYear, 'spieltage', 'desc');
		for (const r of prev) {
			prevByPlayer.set(r.player_id, {
				spieltage: r.spieltage,
				runden: r.runden,
				bommel: r.bommel,
				bommel_per_runde: r.bommel_per_runde === null ? null : Number(r.bommel_per_runde),
				gewinnrate: r.gewinnrate === null ? null : Number(r.gewinnrate),
				anwesenheit: r.anwesenheit === null ? null : Number(r.anwesenheit)
			});
		}
	}

	// Recent-window trend used only on Gesamt: last 50 rounds vs prior 50 rounds
	// (Bommel/Runde + Gewinn) and last 16 spieltage vs prior 16 (Anwesenheit).
	// On per-year tabs, prevYear handles trends instead.
	const [roundsTrend, spieltageTrend] = isAll
		? await Promise.all([recentRoundsTrend(50), recentSpieltageTrend(16)])
		: [null, null];

	const sparkData = await rollingBpr(30);

	// Verlauf sparkline range:
	//   - Gesamt: every point a player has.
	//   - Past complete year: just that year (Jan 1 → Dec 31).
	//   - Ongoing year (== today's calendar year): the last 12 months back from
	//     the latest spieltag, since "this year so far" might be just a few weeks.
	const todayYear = new Date().getFullYear();
	let sparkFrom: string | null = null;
	let sparkTo: string | null = null;
	if (!isAll && year !== null) {
		if (year === todayYear) {
			const maxIn = await maxDatumInYear(year);
			if (maxIn) {
				const d = new Date(`${maxIn}T12:00:00`);
				d.setFullYear(d.getFullYear() - 1);
				sparkFrom = d.toISOString().slice(0, 10);
				sparkTo = maxIn;
			}
		} else {
			sparkFrom = `${year}-01-01`;
			sparkTo = `${year}-12-31`;
		}
	}

	const stats = statsRows.map((row) => {
		let series = sparkData.get(row.player_id) ?? [];
		if (sparkFrom && sparkTo) {
			series = series.filter((p) => p.datum >= sparkFrom! && p.datum <= sparkTo!);
		}
		const rt = roundsTrend?.get(row.player_id) ?? null;
		const st = spieltageTrend?.get(row.player_id) ?? null;
		return {
			...row,
			prev: prevByPlayer.get(row.player_id) ?? null,
			recent:
				rt || st
					? {
							bpr_curr: rt?.bpr_curr ?? null,
							bpr_prev: rt?.bpr_prev ?? null,
							gewinn_curr: rt?.gewinn_curr ?? null,
							gewinn_prev: rt?.gewinn_prev ?? null,
							anwesenheit_curr: st?.anwesenheit_curr ?? null,
							anwesenheit_prev: st?.anwesenheit_prev ?? null
						}
					: null,
			spark: series.map((p) => p.bpr)
		};
	});

	return { years, year, isAll, sort, dir, stats, totals, calendar, calendarYear, prevYear };
};
