// See https://svelte.dev/docs/kit/types#app.d.ts for information about these interfaces

export type Role = 'pending' | 'user' | 'admin';

export type SessionUser = {
	id: string;
	email: string;
	name: string;
	role: Role;
};

declare global {
	namespace App {
		interface Locals {
			user: SessionUser | null;
		}
		interface PageData {
			user?: SessionUser | null;
		}
	}
}

export {};
