import { fail, redirect } from '@sveltejs/kit';
import { listPlayers } from '$server/queries';
import { handleSpieltagSubmit } from '$server/spieltagAction';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user) redirect(303, '/auth?next=' + encodeURIComponent(url.pathname));
	if (locals.user.role === 'pending') redirect(303, '/spieltage');
	const players = await listPlayers();
	return {
		allPlayers: players.map((p) => ({ kuerzel: p.kuerzel, name: p.name }))
	};
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		if (!locals.user || locals.user.role === 'pending') {
			return fail(403, { error: 'Nicht angemeldet.' });
		}
		return handleSpieltagSubmit(await request.formData());
	}
};
