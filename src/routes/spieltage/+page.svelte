<script lang="ts">
	import { formatDate } from '$lib/format';

	let { data } = $props();
	const filters = $derived(data.filters);

	function buildUrl(overrides: Record<string, string | number | undefined>): string {
		const merged: Record<string, string | number | undefined> = {
			from: filters.from,
			to: filters.to,
			minPlayers: filters.minPlayers,
			maxPlayers: filters.maxPlayers,
			minRunden: filters.minRunden,
			maxRunden: filters.maxRunden,
			sort: filters.sort,
			dir: filters.dir,
			...overrides
		};
		const p = new URLSearchParams();
		for (const [k, v] of Object.entries(merged)) {
			if (v === undefined || v === null || v === '') continue;
			// drop defaults to keep URLs tidy
			if (k === 'sort' && v === 'date') continue;
			if (k === 'dir' && (merged.sort === 'date' || !merged.sort) && v === 'desc') continue;
			p.set(k, String(v));
		}
		return `/spieltage${p.size ? '?' + p.toString() : ''}`;
	}

	function toggleSort(field: 'date' | 'players' | 'runden'): string {
		const dir = filters.sort === field && filters.dir === 'desc' ? 'asc' : 'desc';
		return buildUrl({ sort: field, dir });
	}

	function arrow(field: string): string {
		if (filters.sort !== field) return '';
		return filters.dir === 'asc' ? ' ↑' : ' ↓';
	}
</script>

<div class="flex items-center justify-between">
	<h1 class="text-2xl font-semibold">Spieltage</h1>
	<a
		href="/spieltage/new"
		class="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
	>
		+ Neuer Spieltag
	</a>
</div>

<form
	method="GET"
	action="/spieltage"
	class="mt-4 grid grid-cols-1 gap-3 rounded border border-gray-200 p-3 text-sm sm:grid-cols-3 dark:border-gray-700"
>
	<div>
		<span class="block text-xs font-medium text-gray-500">Datum (von – bis)</span>
		<div class="mt-1 flex gap-1">
			<input
				type="date"
				name="from"
				value={filters.from ?? ''}
				class="w-full rounded border border-gray-300 p-1 dark:border-gray-700 dark:bg-gray-800"
			/>
			<input
				type="date"
				name="to"
				value={filters.to ?? ''}
				class="w-full rounded border border-gray-300 p-1 dark:border-gray-700 dark:bg-gray-800"
			/>
		</div>
	</div>
	<div>
		<span class="block text-xs font-medium text-gray-500">Spieler (min – max)</span>
		<div class="mt-1 flex gap-1">
			<input
				type="number"
				min="0"
				name="minPlayers"
				value={filters.minPlayers ?? ''}
				class="w-full rounded border border-gray-300 p-1 dark:border-gray-700 dark:bg-gray-800"
			/>
			<input
				type="number"
				min="0"
				name="maxPlayers"
				value={filters.maxPlayers ?? ''}
				class="w-full rounded border border-gray-300 p-1 dark:border-gray-700 dark:bg-gray-800"
			/>
		</div>
	</div>
	<div>
		<span class="block text-xs font-medium text-gray-500">Runden (min – max)</span>
		<div class="mt-1 flex gap-1">
			<input
				type="number"
				min="0"
				name="minRunden"
				value={filters.minRunden ?? ''}
				class="w-full rounded border border-gray-300 p-1 dark:border-gray-700 dark:bg-gray-800"
			/>
			<input
				type="number"
				min="0"
				name="maxRunden"
				value={filters.maxRunden ?? ''}
				class="w-full rounded border border-gray-300 p-1 dark:border-gray-700 dark:bg-gray-800"
			/>
		</div>
	</div>
	{#if filters.sort && filters.sort !== 'date'}<input type="hidden" name="sort" value={filters.sort} />{/if}
	{#if filters.dir === 'asc'}<input type="hidden" name="dir" value="asc" />{/if}
	<div class="flex justify-end gap-3 sm:col-span-3">
		<a href="/spieltage" class="self-center text-xs underline">Zurücksetzen</a>
		<button
			type="submit"
			class="rounded bg-gray-800 px-3 py-1 text-xs text-white hover:bg-gray-700"
		>
			Anwenden
		</button>
	</div>
</form>

{#if data.spieltage.length === 0}
	<p class="mt-6 text-sm text-gray-500">Keine Spieltage gefunden.</p>
{:else}
	<p class="mt-4 text-xs text-gray-500">
		{data.spieltage.length} Spieltag{data.spieltage.length === 1 ? '' : 'e'}
	</p>
	<table class="mt-2 w-full text-sm">
		<thead>
			<tr class="border-b border-gray-200 text-left dark:border-gray-700">
				<th class="py-2 font-medium">
					<a href={toggleSort('date')} class="hover:underline">Datum{arrow('date')}</a>
				</th>
				<th class="font-medium">
					<a href={toggleSort('players')} class="hover:underline">Spieler{arrow('players')}</a>
				</th>
				<th class="font-medium">
					<a href={toggleSort('runden')} class="hover:underline">Runden{arrow('runden')}</a>
				</th>
				<th class="font-medium">Foto</th>
			</tr>
		</thead>
		<tbody>
			{#each data.spieltage as s (s.datum)}
				<tr
					class="border-b border-gray-100 hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-gray-800"
				>
					<td class="py-2">
						<a class="font-mono underline" href="/spieltage/{s.datum}">
							{formatDate(s.datum)}
						</a>
					</td>
					<td>{s.playerCount}</td>
					<td>{s.runden}</td>
					<td>{s.photoPath ? 'ja' : ''}</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}
