import {
	allTimeTotals,
	availableYears,
	spieltageWithTotals,
	statsAllTime,
	statsByYear,
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

	const [stats, totals, calendar] = isAll
		? await Promise.all([statsAllTime(sort, dir), allTimeTotals(), spieltageWithTotals()])
		: await Promise.all([
				statsByYear(year as number, sort, dir),
				yearTotals(year as number),
				spieltageWithTotals(year as number)
			]);

	return { years, year, isAll, sort, dir, stats, totals, calendar };
};
