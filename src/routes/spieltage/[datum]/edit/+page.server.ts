import { error, fail, redirect } from '@sveltejs/kit';
import { getSpieltag, listPlayers } from '$server/queries';
import { handleSpieltagSubmit } from '$server/spieltagAction';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals, url }) => {
	if (!locals.user) redirect(303, '/auth?next=' + encodeURIComponent(url.pathname));
	if (locals.user.role === 'pending') redirect(303, `/spieltage/${params.datum}`);
	const spieltag = await getSpieltag(params.datum);
	if (!spieltag) error(404, 'Spieltag nicht gefunden');
	const players = await listPlayers();
	return {
		spieltag,
		allPlayers: players.map((p) => ({ kuerzel: p.kuerzel, name: p.name }))
	};
};

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		if (!locals.user || locals.user.role === 'pending') {
			return fail(403, { error: 'Nicht angemeldet.' });
		}
		return handleSpieltagSubmit(await request.formData(), params.datum);
	}
};
