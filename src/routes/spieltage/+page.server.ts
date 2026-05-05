import { listSpieltage, type SpieltageFilters } from '$server/queries';
import type { PageServerLoad } from './$types';

function intParam(v: string | null): number | undefined {
	if (!v) return undefined;
	const n = parseInt(v, 10);
	return Number.isFinite(n) && n >= 0 ? n : undefined;
}
function dateParam(v: string | null): string | undefined {
	return v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined;
}

export const load: PageServerLoad = async ({ url }) => {
	const p = url.searchParams;
	const sortRaw = p.get('sort');
	const sort: SpieltageFilters['sort'] =
		sortRaw === 'players' || sortRaw === 'runden' ? sortRaw : 'date';
	const dir: SpieltageFilters['dir'] = p.get('dir') === 'asc' ? 'asc' : 'desc';

	const filters: SpieltageFilters = {
		from: dateParam(p.get('from')),
		to: dateParam(p.get('to')),
		minPlayers: intParam(p.get('minPlayers')),
		maxPlayers: intParam(p.get('maxPlayers')),
		minRunden: intParam(p.get('minRunden')),
		maxRunden: intParam(p.get('maxRunden')),
		sort,
		dir
	};

	return {
		spieltage: await listSpieltage(filters),
		filters
	};
};
