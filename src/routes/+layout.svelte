<script lang="ts">
	import '../app.css';
	import { afterNavigate, goto, invalidateAll } from '$app/navigation';
	import logo from '$lib/assets/logo.png';
	import { authClient } from '$lib/auth-client';
	import DarkToggle from '$lib/components/DarkToggle.svelte';

	let { data, children } = $props();

	let mobileOpen = $state(false);

	afterNavigate(() => {
		mobileOpen = false;
	});

	async function handleSignOut() {
		mobileOpen = false;
		await authClient.signOut();
		// goto('/') is a no-op when we're already on /, so the layout's
		// load() doesn't re-run and data.user stays stale. invalidateAll()
		// forces every load to re-run with the now-cleared session cookie.
		await invalidateAll();
		await goto('/');
	}
</script>

<svelte:head>
	<link rel="icon" type="image/png" href={logo} />
	<title>Skatstatistik</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
	<header class="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
		<nav class="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3 text-sm">
			<a href="/" class="flex items-center gap-2 font-semibold">
				<img src={logo} alt="" class="size-7 rounded" />
				Skatstatistik
			</a>

			<!-- Desktop links (hidden < md) -->
			<div class="hidden flex-1 items-center gap-6 md:flex">
				<a href="/spieltage" class="hover:underline">Spieltage</a>
				<a href="/runden" class="hover:underline">Runden</a>
				<a href="/spieler" class="hover:underline">Spieler</a>
				{#if data.user?.role === 'admin'}
					<a href="/admin/users" class="hover:underline">Benutzer</a>
				{/if}

				<div class="ml-auto flex items-center gap-2">
					{#if data.user}
						<span class="hidden text-xs text-gray-500 lg:inline dark:text-gray-400">
							{data.user.name || data.user.email}
						</span>
						{#if data.user.role === 'pending'}
							<a
								href="/auth/pending"
								class="rounded border border-amber-300 px-2 py-1 text-xs text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950"
							>
								inaktiv
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
				</div>
			</div>

			<!-- Always-visible: theme toggle -->
			<div class="ml-auto flex items-center gap-1 md:ml-0">
				<DarkToggle />
				<!-- Burger (visible < md) -->
				<button
					type="button"
					aria-label={mobileOpen ? 'Menü schließen' : 'Menü öffnen'}
					aria-expanded={mobileOpen}
					onclick={() => (mobileOpen = !mobileOpen)}
					class="rounded p-1.5 hover:bg-gray-100 md:hidden dark:hover:bg-gray-800"
				>
					{#if mobileOpen}
						<svg class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M6 6l12 12M6 18L18 6" />
						</svg>
					{:else}
						<svg class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
						</svg>
					{/if}
				</button>
			</div>
		</nav>

		<!-- Mobile drawer -->
		{#if mobileOpen}
			<div class="border-t border-gray-200 bg-white px-4 py-3 md:hidden dark:border-gray-800 dark:bg-gray-900">
				<div class="flex flex-col gap-1 text-sm">
					<a
						href="/spieltage"
						class="rounded px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-800"
					>
						Spieltage
					</a>
					<a href="/runden" class="rounded px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-800">
						Runden
					</a>
					<a href="/spieler" class="rounded px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-800">
						Spieler
					</a>
					{#if data.user?.role === 'admin'}
						<a
							href="/admin/users"
							class="rounded px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-800"
						>
							Benutzer
						</a>
					{/if}

					<hr class="my-2 border-gray-200 dark:border-gray-800" />

					{#if data.user}
						<div class="px-2 pb-1 text-xs text-gray-500 dark:text-gray-400">
							{data.user.name || data.user.email}
							{#if data.user.role === 'pending'}<span class="ml-1 rounded bg-amber-100 px-1.5 text-[10px] text-amber-800 dark:bg-amber-900 dark:text-amber-200">inaktiv</span>{/if}
						</div>
						<button
							type="button"
							onclick={handleSignOut}
							class="rounded px-2 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800"
						>
							Abmelden
						</button>
					{:else}
						<a
							href="/auth"
							class="rounded px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-800"
						>
							Anmelden
						</a>
					{/if}
				</div>
			</div>
		{/if}
	</header>

	<main class="mx-auto max-w-5xl px-4 py-6">
		{@render children()}
	</main>
</div>
