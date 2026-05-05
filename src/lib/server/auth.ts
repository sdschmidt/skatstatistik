import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { magicLink } from 'better-auth/plugins';
import { env } from '$env/dynamic/private';
import { db } from './db';
import { account, session, user, verification } from './schema';
import { sendMail } from './mail';

type AuthInstance = ReturnType<typeof betterAuth>;

// Build the auth instance lazily: env vars (BETTER_AUTH_SECRET in particular)
// aren't available during SvelteKit's build/analyse step (the Docker image
// doesn't ship .env), and better-auth throws at construction time when the
// secret is missing. Defer until first request — process.env is populated by
// then and the secret/baseURL/etc. are read correctly.
let _auth: AuthInstance | undefined;

function build(): AuthInstance {
	return betterAuth({
		database: drizzleAdapter(db, {
			provider: 'pg',
			schema: { user, session, account, verification }
		}),
		user: {
			additionalFields: {
				role: {
					type: 'string',
					defaultValue: 'pending',
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
}

function get(): AuthInstance {
	if (!_auth) _auth = build();
	return _auth;
}

export const auth = new Proxy({} as AuthInstance, {
	get(_t, prop) {
		return Reflect.get(get(), prop);
	}
});

export type Auth = AuthInstance;
