import { error, fail, redirect } from '@sveltejs/kit';
import { adjacentSpieltage, deleteSpieltag, getSpieltag } from '$server/queries';
import { deletePhoto } from '$server/photos';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
	const [spieltag, adjacent] = await Promise.all([
		getSpieltag(params.datum),
		adjacentSpieltage(params.datum)
	]);
	if (!spieltag) error(404, 'Spieltag nicht gefunden');
	return { spieltag, adjacent };
};

export const actions: Actions = {
	delete: async ({ params, locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: 'Nur Admins.' });
		const sp = await getSpieltag(params.datum);
		if (!sp) return fail(404);
		if (sp.photoPath) await deletePhoto(sp.photoPath);
		await deleteSpieltag(params.datum);
		redirect(303, '/spieltage');
	}
};
