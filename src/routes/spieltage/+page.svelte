<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { Calendar as CalendarIcon, Club, Ellipse, Users } from 'lucide-svelte';
	import DateRangeFilter from '$lib/components/DateRangeFilter.svelte';
	import RangeSlider from '$lib/components/RangeSlider.svelte';
	import { formatDate } from '$lib/format';
	import { rowGoto } from '$lib/rowLink';

	let { data } = $props();
	const filters = $derived(data.filters);
	const bounds = $derived(data.bounds);
	const canWrite = $derived(
		page.data.user && page.data.user.role !== 'pending'
	);

	const totals = $derived.by(() => {
		const rows = data.spieltage;
		let runden = 0;
		let bommel = 0;
		let players = 0;
		for (const r of rows) {
			runden += r.runden;
			bommel += r.bommel;
			players += r.playerCount;
		}
		return {
			spieltage: rows.length,
			kuerzel: data.kuerzelCount,
			runden,
			bommel,
			players
		};
	});
	const avgSpieler = $derived(totals.spieltage ? totals.players / totals.spieltage : null);
	const avgRunden = $derived(totals.spieltage ? totals.runden / totals.spieltage : null);

	// Cross-link to /runden carrying the common filters. minPlayers/maxPlayers
	// don't apply on /runden, so we drop them.
	const rundenHref = $derived.by(() => {
		const p = new URLSearchParams();
		if (filters.from) p.set('from', filters.from);
		if (filters.to) p.set('to', filters.to);
		if (filters.minRunden !== undefined) p.set('minRunden', String(filters.minRunden));
		if (filters.maxRunden !== undefined) p.set('maxRunden', String(filters.maxRunden));
		if (filters.minBommel !== undefined) p.set('minBommel', String(filters.minBommel));
		if (filters.maxBommel !== undefined) p.set('maxBommel', String(filters.maxBommel));
		return `/runden${p.size ? '?' + p.toString() : ''}`;
	});

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

<dl class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
	<div class="group rounded border border-blue-300 p-3 transition hover:-translate-y-0.5 hover:border-blue-400 hover:bg-blue-50 hover:shadow-sm dark:border-blue-800 dark:hover:border-blue-500 dark:hover:bg-blue-950/60">
		<dt class="flex items-center gap-1.5 text-xs text-blue-700 transition-colors group-hover:text-blue-800 dark:text-blue-300 dark:group-hover:text-blue-200">
			<CalendarIcon class="size-3.5" /> Spieltage
		</dt>
		<dd class="mt-1 text-lg font-semibold tabular-nums">{totals.spieltage}</dd>
	</div>
	<a
		href="/player"
		class="group block rounded border border-teal-300 p-3 no-underline transition hover:-translate-y-0.5 hover:border-teal-400 hover:bg-teal-50 hover:shadow-sm dark:border-teal-800 dark:hover:border-teal-500 dark:hover:bg-teal-950/60"
	>
		<dt class="flex items-center gap-1.5 text-xs text-teal-700 transition-colors group-hover:text-teal-800 dark:text-teal-300 dark:group-hover:text-teal-200">
			<Users class="size-3.5" /> Kürzel
		</dt>
		<dd class="mt-1 text-lg font-semibold tabular-nums">{totals.kuerzel}</dd>
		{#if avgSpieler !== null}
			<dd class="text-[10px] text-gray-500 dark:text-gray-400">
				Ø {avgSpieler.toFixed(1)} / Spieltag
			</dd>
		{/if}
	</a>
	<a
		href={rundenHref}
		class="group block rounded border border-amber-300 p-3 no-underline transition hover:-translate-y-0.5 hover:border-amber-400 hover:bg-amber-50 hover:shadow-sm dark:border-amber-800 dark:hover:border-amber-500 dark:hover:bg-amber-950/60"
	>
		<dt class="flex items-center gap-1.5 text-xs text-amber-700 transition-colors group-hover:text-amber-800 dark:text-amber-300 dark:group-hover:text-amber-200">
			<Club class="size-3.5" /> Runden
		</dt>
		<dd class="mt-1 text-lg font-semibold tabular-nums">{totals.runden}</dd>
		{#if avgRunden !== null}
			<dd class="text-[10px] text-gray-500 dark:text-gray-400">
				Ø {avgRunden.toFixed(1)} / Spieltag
			</dd>
		{/if}
	</a>
	<div class="group rounded border border-orange-300 p-3 transition hover:-translate-y-0.5 hover:border-orange-400 hover:bg-orange-50 hover:shadow-sm dark:border-orange-800 dark:hover:border-orange-500 dark:hover:bg-orange-950/60">
		<dt class="flex items-center gap-1.5 text-xs text-orange-700 transition-colors group-hover:text-orange-800 dark:text-orange-300 dark:group-hover:text-orange-200">
			<Ellipse class="size-3.5" /> Bommel
		</dt>
		<dd class="mt-1 text-lg font-semibold tabular-nums">{totals.bommel}</dd>
	</div>
</dl>

<div class="mt-4 text-sm">
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
				Kürzel ({filters.minPlayers ?? 0} – {filters.maxPlayers ?? bounds.max_players})
			</span>
			<div class="mt-3 px-2">
				<RangeSlider
					min={0}
					max={bounds.max_players}
					from={filters.minPlayers}
					to={filters.maxPlayers}
					fromLabel="min Kürzel"
					toLabel="max Kürzel"
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

<div class="mt-4">
	<a href={rundenHref} class="text-sm text-blue-700 hover:underline dark:text-blue-400">
		→ Runden
	</a>
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
					<a href={toggleSort('players')} class="hover:underline">Kürzel{arrow('players')}</a>
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
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
				<tr
					class="cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-gray-800"
					onclick={rowGoto(`/spieltage/${s.datum}`)}
				>
					<td class="py-2">
						<a class="no-underline hover:underline" href="/spieltage/{s.datum}">
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
