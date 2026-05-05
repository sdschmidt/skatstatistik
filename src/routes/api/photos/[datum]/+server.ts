import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$server/db';
import { spieltage } from '$server/schema';
import { loadPhoto } from '$server/photos';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	// TODO(auth): require an authenticated, non-pending session
	const [s] = await db
		.select({ photoPath: spieltage.photoPath })
		.from(spieltage)
		.where(eq(spieltage.datum, params.datum));
	if (!s?.photoPath) error(404);

	const { buffer, type } = await loadPhoto(s.photoPath);
	return new Response(new Blob([new Uint8Array(buffer)], { type }), {
		headers: { 'Cache-Control': 'private, max-age=300' }
	});
};
