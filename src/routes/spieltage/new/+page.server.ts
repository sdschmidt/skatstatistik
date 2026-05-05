import { listPlayers } from '$server/queries';
import { handleSpieltagSubmit } from '$server/spieltagAction';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const players = await listPlayers();
	return {
		allPlayers: players.map((p) => ({ kuerzel: p.kuerzel, name: p.name }))
	};
};

export const actions: Actions = {
	default: async ({ request }) => {
		// TODO(auth): require role in {user, admin}
		return handleSpieltagSubmit(await request.formData());
	}
};
