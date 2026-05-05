<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Avatar from '$lib/components/Avatar.svelte';
	import { toast } from '$lib/toast';
	let { data, form } = $props();
	const canWrite = $derived(page.data.user && page.data.user.role !== 'pending');

	function withToast(label: string) {
		return () => async ({ result, update }: { result: { type: string; data?: unknown }; update: () => Promise<void> }) => {
			if (result.type === 'success') {
				toast(label);
				await update();
			} else if (result.type === 'failure') {
				const msg = (result.data as { error?: string } | undefined)?.error ?? 'Fehler';
				toast(msg, 'error');
				await update();
			} else {
				await update();
			}
		};
	}
</script>

<div class="flex items-center justify-between">
	<h1 class="text-2xl font-semibold">Spieler</h1>
	<span class="text-xs text-gray-500">{data.players.length} Spieler</span>
</div>

{#if canWrite}
	<section class="mt-4 text-sm">
		<h2 class="font-medium">Neuen Spieler anlegen</h2>
		<form
			method="POST"
			action="?/add"
			use:enhance={withToast('Spieler angelegt')}
			class="mt-2 flex flex-wrap items-end gap-2"
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
			<label class="flex flex-col">
				<span class="text-xs text-gray-500">Name</span>
				<input
					name="name"
					class="w-64 rounded border border-gray-300 p-1 dark:border-gray-700 dark:bg-gray-800"
				/>
			</label>
			<button class="rounded bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700">
				Hinzufügen
			</button>
		</form>
		{#if form && 'error' in form && form.error}
			<p class="mt-2 text-sm text-red-600">{form.error}</p>
		{/if}
	</section>
{/if}

<div class="mt-6 grid grid-cols-[max-content_1fr_max-content] items-center gap-x-3 text-sm">
	<div class="contents text-xs font-medium text-gray-500">
		<span class="border-b border-gray-200 py-2 dark:border-gray-700">Spieler</span>
		<span class="border-b border-gray-200 py-2 dark:border-gray-700">Name</span>
		<span class="border-b border-gray-200 py-2 text-right dark:border-gray-700">Spieltage</span>
	</div>

	{#each data.players as p (p.id)}
		<div class="relative col-span-full grid grid-cols-subgrid items-center border-b border-gray-100 transition-colors hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-gray-800">
			<a
				href="/spieler/{encodeURIComponent(p.kuerzel)}"
				class="flex items-center gap-2 py-2 no-underline before:absolute before:inset-0 before:content-['']"
			>
				<Avatar kuerzel={p.kuerzel} size={24} />
			</a>
			{#if canWrite}
				<form
					method="POST"
					action="?/rename"
					use:enhance={withToast('Spieler aktualisiert')}
					class="relative z-10 flex items-center gap-2 py-1.5"
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
				<span class="py-2">{p.name ?? ''}</span>
			{/if}
			<span class="py-2 text-right tabular-nums">{p.spieltage}</span>
		</div>
	{/each}
</div>

<p class="mt-4 text-xs text-gray-500">
	Spieler werden nicht gelöscht — nur umbenannt. Ein Spieler ist nicht dasselbe wie ein
	angemeldeter Benutzer.
</p>
