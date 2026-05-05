<script lang="ts">
	import { goto } from '$app/navigation';
	import { authClient } from '$lib/auth-client';

	let { data } = $props();

	async function handleSignOut() {
		await authClient.signOut();
		await goto('/auth');
	}
</script>

<div class="mx-auto mt-10 max-w-md space-y-4 text-center">
	<h1 class="text-xl font-semibold">Konto wartet auf Freigabe</h1>
	<p class="text-sm text-gray-600 dark:text-gray-400">
		{#if data.user}
			Dein Konto <strong>{data.user.email}</strong> muss von einem Admin freigegeben werden,
			bevor du Skatstatistik nutzen kannst.
		{:else}
			Dein Konto muss von einem Admin freigegeben werden, bevor du Skatstatistik nutzen kannst.
		{/if}
	</p>
	<button
		type="button"
		onclick={handleSignOut}
		class="text-sm text-gray-500 underline"
	>
		Abmelden
	</button>
</div>
