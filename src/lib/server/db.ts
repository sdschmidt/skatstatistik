import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '$env/dynamic/private';
import * as schema from './schema';

// Lazy connection: env vars aren't available at SvelteKit's build/analyse step
// (the .env isn't shipped in the docker image), so we must not throw or open
// sockets at module load. The first query triggers postgres-js's lazy connect.
let _client: ReturnType<typeof postgres> | undefined;
let _db: ReturnType<typeof drizzle<typeof schema>> | undefined;

function get() {
	if (_db) return _db;
	if (!env.DATABASE_URL) {
		throw new Error('DATABASE_URL is required at runtime (see .env.example)');
	}
	_client = postgres(env.DATABASE_URL, { max: 10 });
	_db = drizzle(_client, { schema });
	return _db;
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
	get(_t, prop) {
		const target = get();
		const value = (target as unknown as Record<string | symbol, unknown>)[prop as string];
		return typeof value === 'function' ? value.bind(target) : value;
	}
});

export type DB = typeof db;
