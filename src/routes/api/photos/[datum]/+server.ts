import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$server/db';
import { spieltage } from '$server/schema';
import { loadPhoto } from '$server/photos';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const [s] = await db
		.select({ photoPath: spieltage.photoPath })
		.from(spieltage)
		.where(eq(spieltage.datum, params.datum));
	if (!s?.photoPath) error(404);

	const photo = await loadPhoto(s.photoPath);
	// DB row references a file that's not on disk — treat as 404, not 500.
	if (!photo) error(404);

	return new Response(new Blob([new Uint8Array(photo.buffer)], { type: photo.type }), {
		headers: { 'Cache-Control': 'private, max-age=300' }
	});
};
