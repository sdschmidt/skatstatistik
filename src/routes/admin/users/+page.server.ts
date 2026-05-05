import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$server/db';
import { user as userTbl } from '$server/schema';
import { sendMail } from '$server/mail';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const users = await db
		.select({
			id: userTbl.id,
			name: userTbl.name,
			email: userTbl.email,
			role: userTbl.role,
			createdAt: userTbl.createdAt
		})
		.from(userTbl)
		.orderBy(userTbl.createdAt);
	return { users };
};

const VALID_ROLES = new Set(['pending', 'user', 'admin']);

export const actions: Actions = {
	setRole: async ({ request, locals }) => {
		if (locals.user?.role !== 'admin') return fail(403, { error: 'Nur Admins.' });
		const data = await request.formData();
		const id = String(data.get('id') ?? '');
		const role = String(data.get('role') ?? '');
		if (!id) return fail(400, { error: 'ID fehlt.' });
		if (!VALID_ROLES.has(role)) return fail(400, { error: 'Ungültige Rolle.' });

		// Don't let an admin demote themselves out of admin — too easy to lock the
		// app out by accident.
		if (id === locals.user.id && role !== 'admin') {
			return fail(400, { error: 'Du kannst deine eigene Admin-Rolle nicht entfernen.' });
		}

		const [target] = await db
			.select({ email: userTbl.email, role: userTbl.role, name: userTbl.name })
			.from(userTbl)
			.where(eq(userTbl.id, id));
		if (!target) return fail(404, { error: 'Benutzer nicht gefunden.' });

		await db.update(userTbl).set({ role }).where(eq(userTbl.id, id));

		// Email the user the first time they get approved (pending → user/admin).
		if (target.role === 'pending' && role !== 'pending') {
			try {
				await sendMail({
					to: target.email,
					subject: 'Skatstatistik – Konto freigegeben',
					text: `Hallo${target.name ? ' ' + target.name : ''},\n\ndein Konto bei Skatstatistik wurde freigegeben. Du kannst dich jetzt anmelden.\n`,
					html: `<p>Hallo${target.name ? ' ' + target.name : ''},</p>
<p>dein Konto bei <strong>Skatstatistik</strong> wurde freigegeben. Du kannst dich jetzt anmelden.</p>`
				});
			} catch (e) {
				console.error('approval mail failed:', e);
				// Don't fail the action over a flaky mailer — the role is already set.
			}
		}

		return { ok: true };
	}
};
