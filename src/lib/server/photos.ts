import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { env } from '$env/dynamic/private';

const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.heic', '.webp']);

function dir() {
	return env.PHOTOS_DIR || './data/photos';
}

async function ensureDir() {
	await mkdir(dir(), { recursive: true });
}

export async function savePhoto(datum: string, file: File): Promise<string> {
	const ext = extname(file.name).toLowerCase() || '.jpg';
	if (!ALLOWED_EXT.has(ext)) {
		throw new Error(`Bildformat ${ext} wird nicht unterstützt.`);
	}
	const filename = `${datum}${ext}`;
	const buf = Buffer.from(await file.arrayBuffer());
	await ensureDir();
	await writeFile(join(dir(), filename), buf);
	return filename;
}

export async function loadPhoto(filename: string): Promise<{ buffer: Buffer; type: string }> {
	const buffer = await readFile(join(dir(), filename));
	const ext = extname(filename).toLowerCase();
	const type =
		ext === '.png'
			? 'image/png'
			: ext === '.webp'
				? 'image/webp'
				: ext === '.heic'
					? 'image/heic'
					: 'image/jpeg';
	return { buffer, type };
}

export async function deletePhoto(filename: string): Promise<void> {
	try {
		await unlink(join(dir(), filename));
	} catch (e) {
		if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
	}
}
