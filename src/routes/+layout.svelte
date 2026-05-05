<script lang="ts">
	import '../app.css';
	import { goto } from '$app/navigation';
	import logo from '$lib/assets/logo.png';
	import { authClient } from '$lib/auth-client';
	import DarkToggle from '$lib/components/DarkToggle.svelte';

	let { data, children } = $props();

	async function handleSignOut() {
		await authClient.signOut();
		await goto('/');
	}
</script>

<svelte:head>
	<link rel="icon" type="image/png" href={logo} />
	<title>Skatstatistik</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
	<header class="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
		<nav class="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3 text-sm">
			<a href="/" class="flex items-center gap-2 font-semibold">
				<img src={logo} alt="" class="size-7 rounded" />
				Skatstatistik
			</a>
			<a href="/spieltage" class="hover:underline">Spieltage</a>
			<a href="/runden" class="hover:underline">Runden</a>
			<a href="/spieler" class="hover:underline">Spieler</a>
			{#if data.user?.role === 'admin'}
				<a href="/admin/users" class="hover:underline">Benutzer</a>
			{/if}
			<div class="ml-auto flex items-center gap-2">
				{#if data.user}
					<span class="hidden text-xs text-gray-500 sm:inline dark:text-gray-400">
						{data.user.name || data.user.email}
					</span>
					{#if data.user.role === 'pending'}
						<a
							href="/auth/pending"
							class="rounded border border-amber-300 px-2 py-1 text-xs text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950"
						>
							gesperrt
						</a>
					{/if}
					<button
						type="button"
						onclick={handleSignOut}
						class="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
					>
						Abmelden
					</button>
				{:else}
					<a
						href="/auth"
						class="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
					>
						Anmelden
					</a>
				{/if}
				<DarkToggle />
			</div>
		</nav>
	</header>

	<main class="mx-auto max-w-5xl px-4 py-6">
		{@render children()}
	</main>
</div>
