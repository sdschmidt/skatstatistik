import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '$env/dynamic/private';

let cached: Transporter | null = null;

function transport(): Transporter {
	if (cached) return cached;
	const port = parseInt(env.SMTP_PORT ?? '1025', 10);
	cached = nodemailer.createTransport({
		host: env.SMTP_HOST ?? 'localhost',
		port,
		secure: false,
		auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS ?? '' } : undefined,
		// Mailpit (and most no-auth dev relays) don't speak STARTTLS.
		ignoreTLS: !env.SMTP_USER
	});
	return cached;
}

export async function sendMail(opts: {
	to: string;
	subject: string;
	text?: string;
	html?: string;
}) {
	await transport().sendMail({
		from: env.SMTP_FROM ?? 'Skatstatistik <noreply@skatstatistik.local>',
		...opts
	});
}
