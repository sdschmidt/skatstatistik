<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import DarkToggle from '$lib/components/DarkToggle.svelte';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>Skatstatistik</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-900 dark:text-gray-100">
	<header class="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
		<nav class="mx-auto flex max-w-5xl items-center gap-6 px-4 py-3 text-sm">
			<a href="/" class="font-semibold">Skatstatistik</a>
			<a href="/spieltage" class="hover:underline">Spieltage</a>
			<a href="/spieler" class="hover:underline">Spieler</a>
			<div class="ml-auto">
				<DarkToggle />
			</div>
		</nav>
	</header>

	<main class="mx-auto max-w-5xl px-4 py-6">
		{@render children()}
	</main>
</div>
