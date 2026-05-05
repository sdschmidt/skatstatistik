<script lang="ts">
	import { authClient } from '$lib/auth-client';

	let { data } = $props();

	let email = $state('');
	let busy = $state(false);
	let sent = $state(false);
	let error = $state<string | null>(null);

	async function withGoogle() {
		busy = true;
		error = null;
		const { error: err } = await authClient.signIn.social({
			provider: 'google',
			callbackURL: data.next
		});
		busy = false;
		if (err) error = err.message ?? 'Anmeldung fehlgeschlagen.';
	}

	async function withMagicLink() {
		if (!email) return;
		busy = true;
		error = null;
		const { error: err } = await authClient.signIn.magicLink({
			email,
			callbackURL: data.next
		});
		busy = false;
		if (err) {
			error = err.message ?? 'Konnte den Anmeldelink nicht senden.';
		} else {
			sent = true;
		}
	}
</script>

<div class="mx-auto mt-10 max-w-sm space-y-5">
	<h1 class="text-center text-2xl font-semibold">Anmelden</h1>

	{#if data.hasGoogle}
		<button
			type="button"
			onclick={withGoogle}
			disabled={busy}
			class="flex w-full items-center justify-center gap-2 rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
		>
			<svg viewBox="0 0 48 48" class="size-4" aria-hidden="true">
				<path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
				<path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 18.9 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
				<path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
				<path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.2 5.2C40.7 35.5 44 30.2 44 24c0-1.3-.1-2.3-.4-3.5z"/>
			</svg>
			Mit Google anmelden
		</button>

		<div class="flex items-center gap-3 text-xs text-gray-500">
			<span class="h-px flex-1 bg-gray-200 dark:bg-gray-700"></span>
			oder
			<span class="h-px flex-1 bg-gray-200 dark:bg-gray-700"></span>
		</div>
	{/if}

	{#if sent}
		<div class="rounded border border-green-300 bg-green-50 p-3 text-sm text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
			Anmeldelink wurde an <strong>{email}</strong> gesendet. Schaue im Posteingang nach.
		</div>
		<button
			type="button"
			onclick={() => {
				sent = false;
				email = '';
			}}
			class="text-xs text-gray-500 underline"
		>
			Andere E-Mail verwenden
		</button>
	{:else}
		<form
			class="space-y-2"
			onsubmit={(e) => {
				e.preventDefault();
				withMagicLink();
			}}
		>
			<label class="block">
				<span class="text-xs text-gray-500">E-Mail</span>
				<input
					type="email"
					required
					autocomplete="email"
					bind:value={email}
					class="mt-1 w-full rounded border border-gray-300 p-2 text-sm dark:border-gray-700 dark:bg-gray-800"
				/>
			</label>
			<button
				type="submit"
				disabled={busy || !email}
				class="w-full rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
			>
				{busy ? 'Sende…' : 'Anmeldelink senden'}
			</button>
		</form>
	{/if}

	{#if error}
		<p class="text-sm text-red-600 dark:text-red-400">{error}</p>
	{/if}

	<p class="text-center text-xs text-gray-500 dark:text-gray-400">
		Lesezugriff ist offen. Neue Konten müssen von einem Admin freigegeben werden,
		bevor sie Spieltage oder Spieler ändern können.
	</p>
</div>
