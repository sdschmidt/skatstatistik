<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { authClient } from '$lib/auth-client';

	let { data } = $props();

	async function handleSignOut() {
		await authClient.signOut();
		await invalidateAll();
		await goto('/');
	}
</script>

<div class="mx-auto mt-10 max-w-md space-y-4 text-center">
	<h1 class="text-xl font-semibold">Konto gesperrt</h1>
	<p class="text-sm text-gray-600 dark:text-gray-400">
		{#if data.user}
			Dein Konto <strong>{data.user.email}</strong> wurde von einem Admin auf
			<code>pending</code> gesetzt — du kannst Spieltage und Spieler weiterhin ansehen,
			aber nichts hinzufügen oder ändern.
		{:else}
			Dein Konto wurde gesperrt — Lesezugriff bleibt, schreiben ist deaktiviert.
		{/if}
	</p>
	<div class="flex justify-center gap-3 text-sm">
		<a href="/" class="text-blue-700 underline dark:text-blue-400">Zur Statistik</a>
		<button type="button" onclick={handleSignOut} class="text-gray-500 underline">
			Abmelden
		</button>
	</div>
</div>
