import { availableYears, statsByYear, yearTotals, type StatsSort } from '$server/queries';
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
	const requested = parseInt(url.searchParams.get('year') ?? '', 10);
	const year = years.includes(requested)
		? requested
		: years[0] ?? new Date().getFullYear();

	const sortRaw = url.searchParams.get('sort') as StatsSort | null;
	const sort: StatsSort = sortRaw && VALID_SORTS.has(sortRaw) ? sortRaw : 'spieltage';
	const dir: 'asc' | 'desc' = url.searchParams.get('dir') === 'asc' ? 'asc' : 'desc';

	const [stats, totals] = await Promise.all([statsByYear(year, sort, dir), yearTotals(year)]);

	return { years, year, sort, dir, stats, totals };
};
