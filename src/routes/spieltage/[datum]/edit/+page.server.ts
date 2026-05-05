import { error, fail, redirect } from '@sveltejs/kit';
import { getSpieltag, listPlayers } from '$server/queries';
import { handleSpieltagSubmit } from '$server/spieltagAction';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	if (locals.user?.role !== 'admin') redirect(303, `/spieltage/${params.datum}`);
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
		if (locals.user?.role !== 'admin') return fail(403, { error: 'Nur Admins.' });
		return handleSpieltagSubmit(await request.formData(), params.datum);
	}
};
