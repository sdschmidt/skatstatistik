// Shared form-handling logic for /spieltage/new and /spieltage/[datum]/edit.
// Both routes funnel into upsertSpieltag with the same field shape.

import { fail, redirect } from '@sveltejs/kit';
import { upsertSpieltag } from './queries';
import { savePhoto, deletePhoto } from './photos';
import { db } from './db';
import { spieltage } from './schema';
import { eq } from 'drizzle-orm';

export async function handleSpieltagSubmit(formData: FormData, originalDatum?: string) {
	const datum = String(formData.get('datum') ?? '');
	if (!/^\d{4}-\d{2}-\d{2}$/.test(datum)) {
		return fail(400, { error: 'Ungültiges Datum.' });
	}

	// Date moved? Rename the row first; FK ON UPDATE CASCADE moves ergebnisse
	// rows along with it, then upsertSpieltag updates the rest of the fields.
	if (originalDatum && originalDatum !== datum) {
		const [conflict] = await db
			.select({ datum: spieltage.datum })
			.from(spieltage)
			.where(eq(spieltage.datum, datum));
		if (conflict) {
			return fail(400, { error: `Spieltag ${datum} existiert bereits.` });
		}
		await db.update(spieltage).set({ datum }).where(eq(spieltage.datum, originalDatum));
	}

	let players: { kuerzel: string; bommel: number; runden: number }[];
	try {
		players = JSON.parse(String(formData.get('players') ?? '[]'));
	} catch {
		return fail(400, { error: 'Ungültige Spielerdaten.' });
	}
	if (!Array.isArray(players) || players.length === 0) {
		return fail(400, { error: 'Mindestens ein Spieler erforderlich.' });
	}
	for (const p of players) {
		if (!p.kuerzel?.trim()) return fail(400, { error: 'Kürzel darf nicht leer sein.' });
		if (!Number.isInteger(p.bommel) || p.bommel < 0)
			return fail(400, { error: `Ungültige Bommel-Anzahl bei ${p.kuerzel}.` });
		if (!Number.isInteger(p.runden) || p.runden < 0)
			return fail(400, { error: `Ungültige Runden-Anzahl bei ${p.kuerzel}.` });
	}

	const notes = (formData.get('notes') as string | null)?.trim() || null;

	// Photo handling: optional new upload replaces existing; "removePhoto" deletes.
	const [existing] = await db
		.select({ photoPath: spieltage.photoPath })
		.from(spieltage)
		.where(eq(spieltage.datum, datum));
	let photoPath: string | null = existing?.photoPath ?? null;

	const newPhoto = formData.get('photo');
	if (newPhoto instanceof File && newPhoto.size > 0) {
		if (existing?.photoPath && existing.photoPath !== `${datum}.jpg`) {
			await deletePhoto(existing.photoPath);
		}
		photoPath = await savePhoto(datum, newPhoto);
	} else if (formData.get('removePhoto') === '1' && existing?.photoPath) {
		await deletePhoto(existing.photoPath);
		photoPath = null;
	}

	await upsertSpieltag({ datum, photoPath, notes, players });

	redirect(303, `/spieltage/${datum}`);
}
