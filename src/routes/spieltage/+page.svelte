<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import DateRangeFilter from '$lib/components/DateRangeFilter.svelte';
	import RangeSlider from '$lib/components/RangeSlider.svelte';
	import { formatDate } from '$lib/format';

	let { data } = $props();
	const filters = $derived(data.filters);
	const bounds = $derived(data.bounds);
	const canWrite = $derived(
		page.data.user && page.data.user.role !== 'pending'
	);

	function pushUrl(params: Record<string, string | number | undefined>) {
		const merged: Record<string, string | number | undefined> = {
			from: filters.from,
			to: filters.to,
			minPlayers: filters.minPlayers,
			maxPlayers: filters.maxPlayers,
			minRunden: filters.minRunden,
			maxRunden: filters.maxRunden,
			minBommel: filters.minBommel,
			maxBommel: filters.maxBommel,
			sort: filters.sort,
			dir: filters.dir,
			...params
		};
		const p = new URLSearchParams();
		for (const [k, v] of Object.entries(merged)) {
			if (v === undefined || v === null || v === '') continue;
			if (k === 'sort' && v === 'date') continue;
			if (k === 'dir' && (merged.sort === 'date' || !merged.sort) && v === 'desc') continue;
			p.set(k, String(v));
		}
		const url = `/spieltage${p.size ? '?' + p.toString() : ''}`;
		goto(url, { keepFocus: true, noScroll: true, replaceState: true });
	}

	let timer: ReturnType<typeof setTimeout> | null = null;
	function pushDebounced(params: Record<string, string | number | undefined>, ms = 250) {
		if (timer) clearTimeout(timer);
		timer = setTimeout(() => pushUrl(params), ms);
	}

	function onDateChange(v: { from?: string; to?: string }) {
		pushDebounced({ from: v.from, to: v.to });
	}
	function onPlayersChange(v: { from: number; to: number }) {
		pushDebounced({
			minPlayers: v.from === 0 ? undefined : v.from,
			maxPlayers: v.to === bounds.max_players ? undefined : v.to
		});
	}
	function onRundenChange(v: { from: number; to: number }) {
		pushDebounced({
			minRunden: v.from === 0 ? undefined : v.from,
			maxRunden: v.to === bounds.max_runden ? undefined : v.to
		});
	}
	function onBommelChange(v: { from: number; to: number }) {
		pushDebounced({
			minBommel: v.from === 0 ? undefined : v.from,
			maxBommel: v.to === bounds.max_bommel ? undefined : v.to
		});
	}

	function clearAll() {
		if (timer) {
			clearTimeout(timer);
			timer = null;
		}
		goto('/spieltage', { keepFocus: true, noScroll: true, replaceState: true });
	}

	function toggleSort(field: 'date' | 'players' | 'runden' | 'bommel'): string {
		const newDir = filters.sort === field && filters.dir === 'desc' ? 'asc' : 'desc';
		const p = new URLSearchParams();
		if (filters.from) p.set('from', filters.from);
		if (filters.to) p.set('to', filters.to);
		if (filters.minPlayers !== undefined) p.set('minPlayers', String(filters.minPlayers));
		if (filters.maxPlayers !== undefined) p.set('maxPlayers', String(filters.maxPlayers));
		if (filters.minRunden !== undefined) p.set('minRunden', String(filters.minRunden));
		if (filters.maxRunden !== undefined) p.set('maxRunden', String(filters.maxRunden));
		if (filters.minBommel !== undefined) p.set('minBommel', String(filters.minBommel));
		if (filters.maxBommel !== undefined) p.set('maxBommel', String(filters.maxBommel));
		if (field !== 'date') p.set('sort', field);
		if (newDir === 'asc') p.set('dir', 'asc');
		return `/spieltage${p.size ? '?' + p.toString() : ''}`;
	}
	function arrow(field: string): string {
		if (filters.sort !== field) return '';
		return filters.dir === 'asc' ? ' ↑' : ' ↓';
	}

	const isFiltered = $derived(
		Boolean(
			filters.from ||
				filters.to ||
				filters.minPlayers !== undefined ||
				filters.maxPlayers !== undefined ||
				filters.minRunden !== undefined ||
				filters.maxRunden !== undefined ||
				filters.minBommel !== undefined ||
				filters.maxBommel !== undefined
		)
	);
</script>

<div class="flex items-center justify-between">
	<h1 class="text-2xl font-semibold">Spieltage</h1>
	{#if canWrite}
		<a
			href="/spieltage/new"
			class="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
		>
			+ Neuer Spieltag
		</a>
	{/if}
</div>

<div class="mt-4 rounded border border-gray-200 p-4 text-sm dark:border-gray-700">
	<div class="flex items-center justify-between">
		<span class="font-medium">Filter</span>
		<button
			type="button"
			disabled={!isFiltered}
			onclick={clearAll}
			class="text-xs underline text-gray-600 hover:text-gray-900 disabled:cursor-default disabled:opacity-40 dark:text-gray-400"
		>
			Zurücksetzen
		</button>
	</div>

	<div class="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<div>
			<span class="block text-xs font-medium text-gray-500 dark:text-gray-400">
				Datum (von – bis)
			</span>
			<div class="mt-1">
				<DateRangeFilter from={filters.from} to={filters.to} onchange={onDateChange} />
			</div>
		</div>
		<div>
			<span class="block text-xs font-medium text-gray-500 dark:text-gray-400">
				Spieler ({filters.minPlayers ?? 0} – {filters.maxPlayers ?? bounds.max_players})
			</span>
			<div class="mt-3 px-2">
				<RangeSlider
					min={0}
					max={bounds.max_players}
					from={filters.minPlayers}
					to={filters.maxPlayers}
					fromLabel="min Spieler"
					toLabel="max Spieler"
					onchange={onPlayersChange}
				/>
			</div>
		</div>
		<div>
			<span class="block text-xs font-medium text-gray-500 dark:text-gray-400">
				Runden ({filters.minRunden ?? 0} – {filters.maxRunden ?? bounds.max_runden})
			</span>
			<div class="mt-3 px-2">
				<RangeSlider
					min={0}
					max={bounds.max_runden}
					from={filters.minRunden}
					to={filters.maxRunden}
					fromLabel="min Runden"
					toLabel="max Runden"
					onchange={onRundenChange}
				/>
			</div>
		</div>
		<div>
			<span class="block text-xs font-medium text-gray-500 dark:text-gray-400">
				Bommel ({filters.minBommel ?? 0} – {filters.maxBommel ?? bounds.max_bommel})
			</span>
			<div class="mt-3 px-2">
				<RangeSlider
					min={0}
					max={bounds.max_bommel}
					from={filters.minBommel}
					to={filters.maxBommel}
					fromLabel="min Bommel"
					toLabel="max Bommel"
					onchange={onBommelChange}
				/>
			</div>
		</div>
	</div>
</div>

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
				<th class="font-medium">
					<a href={toggleSort('bommel')} class="hover:underline">Bommel{arrow('bommel')}</a>
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
					<td class="tabular-nums">{s.playerCount}</td>
					<td class="tabular-nums">{s.runden}</td>
					<td class="tabular-nums">{s.bommel}</td>
					<td>{s.photoPath ? 'ja' : ''}</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}
