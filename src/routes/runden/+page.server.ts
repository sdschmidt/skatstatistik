import { ergebnisseBounds, listErgebnisse, type ErgebnisseFilters } from '$server/queries';
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
		sort,
		dir
	};

	const [rows, bounds] = await Promise.all([listErgebnisse(filters), ergebnisseBounds()]);
	return { ergebnisse: rows, filters, bounds };
};
