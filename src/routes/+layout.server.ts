import { latestSpieltag } from '$server/queries';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	return {
		user: locals.user,
		latestSpieltag: await latestSpieltag()
	};
};
