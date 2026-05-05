import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { magicLink } from 'better-auth/plugins';
import { env } from '$env/dynamic/private';
import { db } from './db';
import { account, session, user, verification } from './schema';
import { sendMail } from './mail';

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: 'pg',
		schema: { user, session, account, verification }
	}),
	user: {
		// Surfaces `role` on session.user so hooks/pages can read it without an
		// extra query. better-auth never sets this column itself; we manage it.
		additionalFields: {
			role: {
				type: 'string',
				defaultValue: 'user',
				input: false
			}
		}
	},
	emailAndPassword: {
		enabled: false
	},
	socialProviders: env.GOOGLE_CLIENT_ID
		? {
				google: {
					clientId: env.GOOGLE_CLIENT_ID,
					clientSecret: env.GOOGLE_CLIENT_SECRET ?? ''
				}
			}
		: undefined,
	plugins: [
		magicLink({
			expiresIn: 15 * 60,
			sendMagicLink: async ({ email, url }) => {
				await sendMail({
					to: email,
					subject: 'Skatstatistik – Anmelden',
					text: `Klicke auf diesen Link, um dich anzumelden:\n\n${url}\n\nDer Link läuft in 15 Minuten ab.\nFalls du das nicht angefordert hast, kannst du diese E-Mail ignorieren.`,
					html: `<p>Klicke auf diesen Link, um dich bei <strong>Skatstatistik</strong> anzumelden:</p>
<p><a href="${url}">${url}</a></p>
<p style="color:#666;font-size:0.9em">Der Link läuft in 15 Minuten ab. Falls du das nicht angefordert hast, kannst du diese E-Mail ignorieren.</p>`
				});
			}
		})
	],
	secret: env.BETTER_AUTH_SECRET,
	baseURL: env.BETTER_AUTH_URL,
	trustedOrigins: env.BETTER_AUTH_URL ? [env.BETTER_AUTH_URL] : undefined
});

export type Auth = typeof auth;
