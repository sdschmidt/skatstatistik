<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	let { data, form } = $props();
	const isAdmin = $derived(page.data.user?.role === 'admin');
</script>

<div class="flex items-center justify-between">
	<h1 class="text-2xl font-semibold">Spieler</h1>
	<span class="text-xs text-gray-500">{data.players.length} Spieler</span>
</div>

<section class="mt-4 rounded border border-gray-200 p-3 dark:border-gray-700">
	<h2 class="text-sm font-medium">Neuen Spieler anlegen</h2>
	<form
		method="POST"
		action="?/add"
		use:enhance
		class="mt-2 flex flex-wrap items-end gap-2 text-sm"
	>
		<label class="flex flex-col">
			<span class="text-xs text-gray-500">Kürzel *</span>
			<input
				name="kuerzel"
				required
				autocomplete="off"
				class="w-32 rounded border border-gray-300 p-1 uppercase dark:border-gray-700 dark:bg-gray-800"
			/>
		</label>
		{#if isAdmin}
			<label class="flex flex-col">
				<span class="text-xs text-gray-500">Name</span>
				<input
					name="name"
					class="w-64 rounded border border-gray-300 p-1 dark:border-gray-700 dark:bg-gray-800"
				/>
			</label>
		{/if}
		<button class="rounded bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700">
			Hinzufügen
		</button>
	</form>
	{#if form && 'error' in form && form.error}
		<p class="mt-2 text-sm text-red-600">{form.error}</p>
	{/if}
</section>

<div class="mt-6 grid grid-cols-[max-content_1fr_max-content] items-center gap-x-3 text-sm">
	<div class="contents text-xs font-medium text-gray-500">
		<span class="border-b border-gray-200 py-2 dark:border-gray-700">Kürzel</span>
		<span class="border-b border-gray-200 py-2 dark:border-gray-700">Name</span>
		<span class="border-b border-gray-200 py-2 text-right dark:border-gray-700">Spieltage</span>
	</div>

	{#each data.players as p (p.id)}
		<div class="contents border-b border-gray-100 dark:border-gray-800">
			<a
				href="/spieler/{encodeURIComponent(p.kuerzel)}"
				class="border-b border-gray-100 py-2 font-mono hover:underline dark:border-gray-800"
			>
				{p.kuerzel}
			</a>
			{#if isAdmin}
				<form
					method="POST"
					action="?/rename"
					use:enhance
					class="flex items-center gap-2 border-b border-gray-100 py-1.5 dark:border-gray-800"
				>
					<input type="hidden" name="id" value={p.id} />
					<input
						name="name"
						value={p.name ?? ''}
						placeholder="Name (optional)"
						class="w-full max-w-md rounded border border-gray-300 p-1 dark:border-gray-700 dark:bg-gray-800"
					/>
					<button
						class="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
					>
						Speichern
					</button>
				</form>
			{:else}
				<span class="border-b border-gray-100 py-2 dark:border-gray-800">
					{p.name ?? ''}
				</span>
			{/if}
			<span
				class="border-b border-gray-100 py-2 text-right tabular-nums dark:border-gray-800"
			>
				{p.spieltage}
			</span>
		</div>
	{/each}
</div>

<p class="mt-4 text-xs text-gray-500">
	Spieler werden nicht gelöscht — nur umbenannt. Ein Spieler ist nicht dasselbe wie ein
	angemeldeter Benutzer.
</p>
