import { error, fail, redirect } from '@sveltejs/kit';
import { deleteSpieltag, getSpieltag } from '$server/queries';
import { deletePhoto } from '$server/photos';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const spieltag = await getSpieltag(params.datum);
	if (!spieltag) error(404, 'Spieltag nicht gefunden');
	return { spieltag };
};

export const actions: Actions = {
	delete: async ({ params }) => {
		// TODO(auth): require role === 'admin'
		const sp = await getSpieltag(params.datum);
		if (!sp) return fail(404);
		if (sp.photoPath) await deletePhoto(sp.photoPath);
		await deleteSpieltag(params.datum);
		redirect(303, '/spieltage');
	}
};
