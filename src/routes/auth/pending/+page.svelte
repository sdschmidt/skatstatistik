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
	<h1 class="text-xl font-semibold">Konto inaktiv</h1>
	<p class="text-sm text-gray-600 dark:text-gray-400">
		{#if data.user}
			Dein Konto <strong>{data.user.email}</strong> ist inaktiv und muss von einem Admin
			freigegeben werden, bevor du Spieltage oder Spieler hinzufügen oder bearbeiten kannst.
			Lesezugriff (Statistik, Spieltage, Spieler) ist offen.
		{:else}
			Dein Konto ist inaktiv. Lesezugriff bleibt, schreiben ist erst nach Freigabe durch
			einen Admin möglich.
		{/if}
	</p>
	<div class="flex justify-center gap-3 text-sm">
		<a href="/" class="text-blue-700 underline dark:text-blue-400">Zur Statistik</a>
		<button type="button" onclick={handleSignOut} class="text-gray-500 underline">
			Abmelden
		</button>
	</div>
</div>
