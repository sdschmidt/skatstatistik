import { error } from '@sveltejs/kit';
import {
	availableYears,
	ergebnisseBounds,
	getPlayerByKuerzel,
	listErgebnisse,
	playerCalendar,
	playerLatestYear,
	playerSummary,
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

	// Calendar default: show only the player's most recent year of activity
	// (falling back to the overall most recent year if they've never played).
	// Date filter overrides this.
	let calFrom = filters.from;
	let calTo = filters.to;
	if (!calFrom && !calTo) {
		const [latest, allYears] = await Promise.all([playerLatestYear(player.id), availableYears()]);
		const defaultYear = latest ?? allYears[0];
		if (defaultYear !== undefined) {
			calFrom = `${defaultYear}-01-01`;
			calTo = `${defaultYear}-12-31`;
		}
	}

	const [ergebnisse, summary, calendar, bounds] = await Promise.all([
		listErgebnisse(filters),
		playerSummary(player.id, filters),
		playerCalendar(player.id, calFrom, calTo),
		ergebnisseBounds()
	]);

	return {
		player,
		ergebnisse,
		summary,
		calendar,
		calRange: { from: calFrom, to: calTo },
		filters,
		bounds
	};
};
