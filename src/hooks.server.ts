import { redirect, type Handle } from '@sveltejs/kit';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { eq } from 'drizzle-orm';
import { building } from '$app/environment';
import { env } from '$env/dynamic/private';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { user as userTbl } from '$lib/server/schema';
import type { Role } from './app';

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

	let role: Role = (sessionUser?.role as Role | undefined) ?? 'user';

	// ADMIN_EMAIL bootstrap: the configured email is auto-promoted to admin on
	// its first authenticated request. Idempotent — a no-op once promoted.
	if (
		sessionUser &&
		role !== 'admin' &&
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

	// Read access is public for everyone (including anonymous). Only /admin/*
	// requires the admin role. Pending users keep read access; their writes are
	// blocked by per-action role checks instead of a global redirect.
	if (event.locals.user) {
		if (path === '/auth') redirect(302, '/');
		if (path.startsWith('/admin') && event.locals.user.role !== 'admin') {
			redirect(302, '/');
		}
	} else if (path.startsWith('/admin')) {
		redirect(302, '/auth?next=' + encodeURIComponent(path + event.url.search));
	}

	return resolve(event);
};
