import { env } from '$env/dynamic/private';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ url }) => {
	const next = url.searchParams.get('next') ?? '/';
	return {
		next,
		hasGoogle: Boolean(env.GOOGLE_CLIENT_ID)
	};
};
