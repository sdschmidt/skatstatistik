import { error } from '@sveltejs/kit';
import {
	availableYears,
	ergebnisseBounds,
	getPlayerByKuerzel,
	listErgebnisse,
	maxDatumInYear,
	playerCalendar,
	playerLatestYear,
	playerStreaks,
	playerSummary,
	recentRoundsTrend,
	recentSpieltageTrend,
	rollingBpr,
	statsForRange,
	type ErgebnisseFilters
} from '$server/queries';
import type { PageServerLoad } from './$types';

function intParam(v: string | null): number | undefined {
	if (!v) return undefined;
	const n = parseInt(v, 10);
	return Number.isFinite(n) && n >= 0 ? n : undefined;
}
function dateParam(v: string | null): string | undefined {
	return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined;
}

export const load: PageServerLoad = async ({ params, url }) => {
	const player = await getPlayerByKuerzel(params.kuerzel);
	if (!player) error(404, `Spieler ${params.kuerzel} nicht gefunden`);

	const p = url.searchParams;
	const sortRaw = p.get('sort');
	const sort: ErgebnisseFilters['sort'] =
		sortRaw === 'kuerzel' || sortRaw === 'bommel' || sortRaw === 'runden' ? sortRaw : 'date';
	const dir: ErgebnisseFilters['dir'] = p.get('dir') === 'asc' ? 'asc' : 'desc';

	const filters: ErgebnisseFilters = {
		from: dateParam(p.get('from')),
		to: dateParam(p.get('to')),
		minRunden: intParam(p.get('minRunden')),
		maxRunden: intParam(p.get('maxRunden')),
		minBommel: intParam(p.get('minBommel')),
		maxBommel: intParam(p.get('maxBommel')),
		playerId: player.id,
		sort,
		dir
	};

	const [latest, allYears] = await Promise.all([
		playerLatestYear(player.id),
		availableYears()
	]);

	// Calendar default: show only the player's most recent year of activity
	// (falling back to the overall most recent year if they've never played).
	// Date filter overrides this.
	let calFrom = filters.from;
	let calTo = filters.to;
	if (!calFrom && !calTo) {
		const defaultYear = latest ?? allYears[0];
		if (defaultYear !== undefined) {
			calFrom = `${defaultYear}-01-01`;
			calTo = `${defaultYear}-12-31`;
		}
	}

	// Trend mode: Gesamt (no date filter) → recent-window comparison;
	// year tab → YTD-aligned prior-year comparison; otherwise no trend.
	const isAll = !filters.from && !filters.to;
	const yearMatch = filters.from && filters.to ? /^(\d{4})-01-01$/.exec(filters.from) : null;
	const tabYear =
		yearMatch && filters.to === `${yearMatch[1]}-12-31` ? Number(yearMatch[1]) : null;

	const [ergebnisse, summary, calendar, bounds, streaks, rolling, recentRounds, recentSpieltage] =
		await Promise.all([
			listErgebnisse(filters),
			playerSummary(player.id, filters),
			playerCalendar(player.id, calFrom, calTo),
			ergebnisseBounds(),
			playerStreaks(player.id),
			rollingBpr(30),
			isAll ? recentRoundsTrend(50) : Promise.resolve(null),
			isAll ? recentSpieltageTrend(16) : Promise.resolve(null)
		]);

	type SummaryTrend =
		| {
				kind: 'year';
				spieltage: number;
				runden: number;
				bommel: number;
				bommel_per_runde: number | null;
				gewinnrate: number | null;
				anwesenheit: number | null;
		  }
		| {
				kind: 'recent';
				bpr_curr: number | null;
				bpr_prev: number | null;
				gewinn_curr: number | null;
				gewinn_prev: number | null;
				anwesenheit_curr: number | null;
				anwesenheit_prev: number | null;
		  };
	let summaryTrend: SummaryTrend | null = null;
	if (isAll) {
		const r = recentRounds?.get(player.id);
		const s = recentSpieltage?.get(player.id);
		if (r || s) {
			summaryTrend = {
				kind: 'recent',
				bpr_curr: r?.bpr_curr ?? null,
				bpr_prev: r?.bpr_prev ?? null,
				gewinn_curr: r?.gewinn_curr ?? null,
				gewinn_prev: r?.gewinn_prev ?? null,
				anwesenheit_curr: s?.anwesenheit_curr ?? null,
				anwesenheit_prev: s?.anwesenheit_prev ?? null
			};
		}
	} else if (tabYear !== null && allYears.includes(tabYear - 1)) {
		const prevYear = tabYear - 1;
		const maxCurr = await maxDatumInYear(tabYear);
		if (maxCurr) {
			const prevRows = await statsForRange(
				`${prevYear}-01-01`,
				`${prevYear}-${maxCurr.slice(5)}`
			);
			const p = prevRows.find((row) => row.player_id === player.id);
			if (p) {
				summaryTrend = {
					kind: 'year',
					spieltage: p.spieltage,
					runden: p.runden,
					bommel: p.bommel,
					bommel_per_runde: p.bommel_per_runde === null ? null : Number(p.bommel_per_runde),
					gewinnrate: p.gewinnrate === null ? null : Number(p.gewinnrate),
					anwesenheit: p.anwesenheit === null ? null : Number(p.anwesenheit)
				};
			}
		}
	}

	// Restrict the rolling-mean chart the same way the Statistik Verlauf works:
	//   Gesamt / no year tab → full history
	//   past year tab        → that year only
	//   ongoing year tab     → last 12 months ending at the latest spieltag in
	//                          that year (so e.g. 2026-tab shows ~ 2025-05 …
	//                          2026-05 instead of 5 weeks of 2026)
	const todayYear = new Date().getFullYear();
	let chartFrom = filters.from;
	let chartTo = filters.to;
	if (filters.from && filters.to) {
		const m = /^(\d{4})-01-01$/.exec(filters.from);
		if (m && filters.to === `${m[1]}-12-31`) {
			const tabYear = Number(m[1]);
			if (tabYear === todayYear) {
				const maxIn = await maxDatumInYear(tabYear);
				if (maxIn) {
					const d = new Date(`${maxIn}T12:00:00`);
					d.setFullYear(d.getFullYear() - 1);
					chartFrom = d.toISOString().slice(0, 10);
					chartTo = maxIn;
				}
			}
		}
	}
	const fullHistory = rolling.get(player.id) ?? [];
	const history =
		chartFrom && chartTo
			? fullHistory.filter((p) => p.datum >= chartFrom! && p.datum <= chartTo!)
			: fullHistory;

	return {
		player,
		years: allYears,
		streaks,
		history,
		ergebnisse,
		summary,
		summaryTrend,
		calendar,
		calRange: { from: calFrom, to: calTo },
		filters,
		bounds
	};
};
