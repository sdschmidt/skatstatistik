import { redirect, type Handle } from '@sveltejs/kit';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { eq } from 'drizzle-orm';
import { building } from '$app/environment';
import { env } from '$env/dynamic/private';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { user as userTbl } from '$lib/server/schema';
import type { Role } from './app';

const PUBLIC_PATH = (path: string) => path === '/auth' || path.startsWith('/auth/');

export const handle: Handle = async ({ event, resolve }) => {
	// /api/auth/* is owned by better-auth — sign-in / sign-out / OAuth callback /
	// magic-link verification all live here.
	if (event.url.pathname.startsWith('/api/auth')) {
		return svelteKitHandler({ event, resolve, auth, building });
	}

	const session = await auth.api.getSession({ headers: event.request.headers });
	const sessionUser = session?.user as
		| { id: string; email: string; name: string; role?: Role }
		| undefined;

	let role: Role = (sessionUser?.role as Role | undefined) ?? 'pending';

	// ADMIN_EMAIL bootstrap: the configured email is auto-promoted to admin on
	// its first authenticated request. Idempotent — a no-op once promoted.
	if (
		sessionUser &&
		role === 'pending' &&
		env.ADMIN_EMAIL &&
		sessionUser.email.toLowerCase() === env.ADMIN_EMAIL.toLowerCase()
	) {
		await db.update(userTbl).set({ role: 'admin' }).where(eq(userTbl.id, sessionUser.id));
		role = 'admin';
	}

	event.locals.user = sessionUser
		? { id: sessionUser.id, email: sessionUser.email, name: sessionUser.name, role }
		: null;

	const path = event.url.pathname;
	const onAuth = PUBLIC_PATH(path);
	const onPending = path === '/auth/pending' || path.startsWith('/auth/pending');

	if (!event.locals.user) {
		if (!onAuth) {
			redirect(302, '/auth?next=' + encodeURIComponent(path + event.url.search));
		}
		return resolve(event);
	}

	if (event.locals.user.role === 'pending') {
		if (!onPending) redirect(302, '/auth/pending');
		return resolve(event);
	}

	// Approved user / admin
	if (onAuth) redirect(302, '/');
	if (path.startsWith('/admin') && event.locals.user.role !== 'admin') {
		redirect(302, '/');
	}

	return resolve(event);
};
