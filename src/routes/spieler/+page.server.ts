import { fail } from '@sveltejs/kit';
import { ensurePlayer, listPlayers, renamePlayer } from '$server/queries';
import { db } from '$server/db';
import { players } from '$server/schema';
import { eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	return { players: await listPlayers() };
};

export const actions: Actions = {
	add: async ({ request, locals }) => {
		if (!locals.user || locals.user.role === 'pending') {
			return fail(403, { error: 'Nicht angemeldet.' });
		}
		const data = await request.formData();
		const kuerzel = String(data.get('kuerzel') ?? '').trim();
		const name = String(data.get('name') ?? '').trim() || null;
		if (!kuerzel) return fail(400, { error: 'Kürzel darf nicht leer sein.', kuerzel, name });
		const id = await ensurePlayer(kuerzel);
		if (name && locals.user.role === 'admin') await renamePlayer(id, name);
		return { ok: true };
	},

	rename: async ({ request, locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: 'Nur Admins.' });
		const data = await request.formData();
		const id = String(data.get('id') ?? '');
		const name = String(data.get('name') ?? '').trim() || null;
		if (!id) return fail(400, { error: 'Spieler-ID fehlt.' });
		const [exists] = await db.select({ id: players.id }).from(players).where(eq(players.id, id));
		if (!exists) return fail(404, { error: 'Spieler nicht gefunden.' });
		await renamePlayer(id, name);
		return { ok: true };
	}
};
