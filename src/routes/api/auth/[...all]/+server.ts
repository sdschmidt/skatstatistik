// better-auth handles every /api/auth/* route — sign-in, sign-out, the
// OAuth callback, and the magic-link verification all flow through here.
import { auth } from '$lib/server/auth';
import type { RequestHandler } from './$types';

const handler: RequestHandler = ({ request }) => auth.handler(request);

export const GET = handler;
export const POST = handler;
