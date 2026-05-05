<script lang="ts">
	import '../app.css';
	import { afterNavigate, goto, invalidateAll, onNavigate } from '$app/navigation';
	import { Menu, X } from 'lucide-svelte';
	import logoStylized from '$lib/assets/logo_stylized@4x.png';
	import cardHalf from '$lib/assets/card_half.png';
	import { authClient } from '$lib/auth-client';
	import DarkToggle from '$lib/components/DarkToggle.svelte';
	import Toaster from '$lib/components/Toaster.svelte';

	let { data, children } = $props();

	let mobileOpen = $state(false);

	afterNavigate(() => {
		mobileOpen = false;
	});

	// Smooth fade between route changes via the View Transitions API. No-op on
	// browsers that don't support it (Firefox today) — they just navigate as
	// normal.
	onNavigate((nav) => {
		if (typeof document === 'undefined' || !document.startViewTransition) return;
		return new Promise((resolve) => {
			document.startViewTransition(async () => {
				resolve();
				await nav.complete;
			});
		});
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
	<link rel="icon" type="image/png" href={logoStylized} />
	<title>Skatstatistik</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
	<header class="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
		<nav class="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3 text-sm">
			<a href="/" class="flex items-center gap-2 font-semibold">
				<img src={logoStylized} alt="" class="size-7" />
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
						<X class="size-5" />
					{:else}
						<Menu class="size-5" />
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

	<main class="mx-auto max-w-5xl px-4 pt-6">
		{@render children()}
		<footer class="mt-12 flex justify-center">
			<img src={cardHalf} alt="" class="block max-w-xs opacity-80" />
		</footer>
	</main>

	<Toaster />
</div>
