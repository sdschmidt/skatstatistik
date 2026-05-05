import { sql } from 'drizzle-orm';
import {
	boolean,
	check,
	date,
	integer,
	pgTable,
	primaryKey,
	text,
	timestamp,
	uuid
} from 'drizzle-orm/pg-core';

// ──────────────────────────────────────────────────────────────────────
// Domain
// ──────────────────────────────────────────────────────────────────────

export const players = pgTable('players', {
	id: uuid('id').primaryKey().defaultRandom(),
	// stored as ASCII `kuerzel` to keep raw SQL readable; UI label is "Kürzel"
	kuerzel: text('kuerzel').notNull().unique(),
	name: text('name'),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const spieltage = pgTable('spieltage', {
	datum: date('datum').primaryKey(),
	photoPath: text('photo_path'),
	notes: text('notes'),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const ergebnisse = pgTable(
	'ergebnisse',
	{
		datum: date('datum')
			.notNull()
			.references(() => spieltage.datum, { onDelete: 'cascade', onUpdate: 'cascade' }),
		playerId: uuid('player_id')
			.notNull()
			.references(() => players.id, { onDelete: 'restrict' }),
		bommel: integer('bommel').notNull(),
		runden: integer('runden').notNull()
	},
	(t) => [
		primaryKey({ columns: [t.datum, t.playerId] }),
		check('ergebnisse_bommel_nonneg', sql`${t.bommel} >= 0`),
		check('ergebnisse_runden_nonneg', sql`${t.runden} >= 0`)
	]
);

// ──────────────────────────────────────────────────────────────────────
// Auth — schema expected by better-auth's Drizzle adapter, plus a `role`
// column on `user` that we manage ourselves.
// ──────────────────────────────────────────────────────────────────────

export const user = pgTable(
	'user',
	{
		id: text('id').primaryKey(),
		name: text('name').notNull(),
		email: text('email').notNull().unique(),
		emailVerified: boolean('email_verified').notNull().default(false),
		image: text('image'),
		role: text('role').notNull().default('user'),
		createdAt: timestamp('created_at').notNull().defaultNow(),
		updatedAt: timestamp('updated_at').notNull().defaultNow()
	},
	(t) => [check('user_role_valid', sql`${t.role} in ('pending','user','admin')`)]
);

export const session = pgTable('session', {
	id: text('id').primaryKey(),
	expiresAt: timestamp('expires_at').notNull(),
	token: text('token').notNull().unique(),
	ipAddress: text('ip_address'),
	userAgent: text('user_agent'),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const account = pgTable('account', {
	id: text('id').primaryKey(),
	accountId: text('account_id').notNull(),
	providerId: text('provider_id').notNull(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	accessToken: text('access_token'),
	refreshToken: text('refresh_token'),
	idToken: text('id_token'),
	accessTokenExpiresAt: timestamp('access_token_expires_at'),
	refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
	scope: text('scope'),
	password: text('password'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const verification = pgTable('verification', {
	id: text('id').primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: timestamp('expires_at').notNull(),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export type Role = 'pending' | 'user' | 'admin';
export type Player = typeof players.$inferSelect;
export type Spieltag = typeof spieltage.$inferSelect;
export type Ergebnis = typeof ergebnisse.$inferSelect;
