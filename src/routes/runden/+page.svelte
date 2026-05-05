<script lang="ts">
	import { goto } from '$app/navigation';
	import DateRangeFilter from '$lib/components/DateRangeFilter.svelte';
	import RangeSlider from '$lib/components/RangeSlider.svelte';
	import { formatDate } from '$lib/format';

	let { data } = $props();
	const filters = $derived(data.filters);
	const bounds = $derived(data.bounds);

	function pushUrl(params: Record<string, string | number | undefined>) {
		const merged: Record<string, string | number | undefined> = {
			from: filters.from,
			to: filters.to,
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
		goto(`/runden${p.size ? '?' + p.toString() : ''}`, {
			keepFocus: true,
			noScroll: true,
			replaceState: true
		});
	}

	let timer: ReturnType<typeof setTimeout> | null = null;
	function pushDebounced(params: Record<string, string | number | undefined>, ms = 250) {
		if (timer) clearTimeout(timer);
		timer = setTimeout(() => pushUrl(params), ms);
	}

	function onDateChange(v: { from?: string; to?: string }) {
		pushDebounced({ from: v.from, to: v.to });
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
		goto('/runden', { keepFocus: true, noScroll: true, replaceState: true });
	}

	function toggleSort(field: 'date' | 'kuerzel' | 'bommel' | 'runden'): string {
		const newDir = filters.sort === field && filters.dir === 'desc' ? 'asc' : 'desc';
		const p = new URLSearchParams();
		if (filters.from) p.set('from', filters.from);
		if (filters.to) p.set('to', filters.to);
		if (filters.minRunden !== undefined) p.set('minRunden', String(filters.minRunden));
		if (filters.maxRunden !== undefined) p.set('maxRunden', String(filters.maxRunden));
		if (filters.minBommel !== undefined) p.set('minBommel', String(filters.minBommel));
		if (filters.maxBommel !== undefined) p.set('maxBommel', String(filters.maxBommel));
		if (field !== 'date') p.set('sort', field);
		if (newDir === 'asc') p.set('dir', 'asc');
		return `/runden${p.size ? '?' + p.toString() : ''}`;
	}
	function arrow(field: string): string {
		if (filters.sort !== field) return '';
		return filters.dir === 'asc' ? ' ↑' : ' ↓';
	}

	const isFiltered = $derived(
		Boolean(
			filters.from ||
				filters.to ||
				filters.minRunden !== undefined ||
				filters.maxRunden !== undefined ||
				filters.minBommel !== undefined ||
				filters.maxBommel !== undefined
		)
	);
</script>

<div class="flex items-center justify-between">
	<h1 class="text-2xl font-semibold">Runden</h1>
	<span class="text-xs text-gray-500">eine Zeile pro Spieler · pro Spieltag</span>
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

	<div class="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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

{#if data.ergebnisse.length === 0}
	<p class="mt-6 text-sm text-gray-500">Keine Runden gefunden.</p>
{:else}
	<p class="mt-4 text-xs text-gray-500">
		{data.ergebnisse.length} Eintr{data.ergebnisse.length === 1 ? 'ag' : 'äge'}
	</p>
	<table class="mt-2 w-full text-sm">
		<thead>
			<tr class="border-b border-gray-200 text-left dark:border-gray-700">
				<th class="py-2 font-medium">
					<a href={toggleSort('date')} class="hover:underline">Spieltag{arrow('date')}</a>
				</th>
				<th class="font-medium">
					<a href={toggleSort('kuerzel')} class="hover:underline">Kürzel{arrow('kuerzel')}</a>
				</th>
				<th class="font-medium">Name</th>
				<th class="font-medium">
					<a href={toggleSort('bommel')} class="hover:underline">Bommel{arrow('bommel')}</a>
				</th>
				<th class="font-medium">
					<a href={toggleSort('runden')} class="hover:underline">Runden{arrow('runden')}</a>
				</th>
			</tr>
		</thead>
		<tbody>
			{#each data.ergebnisse as e (e.datum + e.kuerzel)}
				<tr
					class="border-b border-gray-100 hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-gray-800"
				>
					<td class="py-2">
						<a class="font-mono underline" href="/spieltage/{e.datum}">
							{formatDate(e.datum)}
						</a>
					</td>
					<td>
						<a class="font-mono underline" href="/spieler/{encodeURIComponent(e.kuerzel)}">
							{e.kuerzel}
						</a>
					</td>
					<td>
						{#if e.name}
							<a class="hover:underline" href="/spieler/{encodeURIComponent(e.kuerzel)}">
								{e.name}
							</a>
						{/if}
					</td>
					<td class="tabular-nums">{e.bommel}</td>
					<td class="tabular-nums">{e.runden}</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}
