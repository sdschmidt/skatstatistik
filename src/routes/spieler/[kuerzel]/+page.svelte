<script lang="ts">
	import { goto } from '$app/navigation';
	import Calendar from '$lib/components/Calendar.svelte';
	import DateRangeFilter from '$lib/components/DateRangeFilter.svelte';
	import RangeSlider from '$lib/components/RangeSlider.svelte';
	import { formatDate, formatPercent } from '$lib/format';

	let { data } = $props();
	const { player } = $derived(data);
	const filters = $derived(data.filters);
	const bounds = $derived(data.bounds);
	const summary = $derived(data.summary);
	const calendar = $derived(data.calendar);
	const ergebnisse = $derived(data.ergebnisse);

	const baseUrl = $derived(`/spieler/${encodeURIComponent(player.kuerzel)}`);

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
		goto(`${baseUrl}${p.size ? '?' + p.toString() : ''}`, {
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
		goto(baseUrl, { keepFocus: true, noScroll: true, replaceState: true });
	}

	function toggleSort(field: 'date' | 'bommel' | 'runden'): string {
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
		return `${baseUrl}${p.size ? '?' + p.toString() : ''}`;
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

<div class="flex items-baseline justify-between gap-4">
	<h1 class="text-2xl font-semibold">
		{#if player.name}
			{player.name} <span class="font-mono text-gray-500 dark:text-gray-400">({player.kuerzel})</span>
		{:else}
			<span class="font-mono">{player.kuerzel}</span>
			<span class="text-sm text-gray-500">— ohne Name</span>
		{/if}
	</h1>
	<a href="/spieler" class="text-xs text-gray-500 hover:underline">← alle Spieler</a>
</div>

<!-- stats strip -->
<dl class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
	<div class="rounded border border-gray-200 p-3 dark:border-gray-700">
		<dt class="text-xs text-gray-500">Spieltage</dt>
		<dd class="mt-1 text-lg font-semibold tabular-nums">{summary.spieltage}</dd>
	</div>
	<div class="rounded border border-gray-200 p-3 dark:border-gray-700">
		<dt class="text-xs text-gray-500">Runden</dt>
		<dd class="mt-1 text-lg font-semibold tabular-nums">{summary.runden}</dd>
	</div>
	<div class="rounded border border-gray-200 p-3 dark:border-gray-700">
		<dt class="text-xs text-gray-500">Bommel</dt>
		<dd class="mt-1 text-lg font-semibold tabular-nums">{summary.bommel}</dd>
	</div>
	<div class="rounded border border-gray-200 p-3 dark:border-gray-700">
		<dt class="text-xs text-gray-500">Bommel/R.</dt>
		<dd class="mt-1 text-lg font-semibold tabular-nums">{formatPercent(summary.bommelPerRunde)}</dd>
	</div>
	<div class="rounded border border-gray-200 p-3 dark:border-gray-700">
		<dt class="text-xs text-gray-500">Gewinn</dt>
		<dd class="mt-1 text-lg font-semibold tabular-nums">{formatPercent(summary.gewinnrate)}</dd>
	</div>
	<div class="rounded border border-gray-200 p-3 dark:border-gray-700">
		<dt class="text-xs text-gray-500">Anwesenheit</dt>
		<dd class="mt-1 text-lg font-semibold tabular-nums">{formatPercent(summary.anwesenheit)}</dd>
		<dd class="text-[10px] text-gray-500">
			{summary.anwesenheitNumerator}/{summary.anwesenheitDenominator}
		</dd>
	</div>
</dl>

<!-- calendar -->
<section class="mt-6">
	<h2 class="mb-3 text-sm font-medium">Aktivität</h2>
	<Calendar entries={calendar} from={data.calRange.from} to={data.calRange.to} />
</section>

<!-- filter -->
<div class="mt-6 rounded border border-gray-200 p-4 text-sm dark:border-gray-700">
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

	<div class="mt-3 grid gap-4 sm:grid-cols-3">
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

<!-- ergebnisse table -->
{#if ergebnisse.length === 0}
	<p class="mt-6 text-sm text-gray-500">Keine Runden für diesen Filter.</p>
{:else}
	<p class="mt-6 text-xs text-gray-500">
		{ergebnisse.length} Eintr{ergebnisse.length === 1 ? 'ag' : 'äge'}
	</p>
	<table class="mt-2 w-full text-sm">
		<thead>
			<tr class="border-b border-gray-200 text-left dark:border-gray-700">
				<th class="py-2 font-medium">
					<a href={toggleSort('date')} class="hover:underline">Spieltag{arrow('date')}</a>
				</th>
				<th class="font-medium">
					<a href={toggleSort('bommel')} class="hover:underline">Bommel{arrow('bommel')}</a>
				</th>
				<th class="font-medium">
					<a href={toggleSort('runden')} class="hover:underline">Runden{arrow('runden')}</a>
				</th>
				<th class="font-medium">Bommel/R.</th>
			</tr>
		</thead>
		<tbody>
			{#each ergebnisse as e (e.datum)}
				<tr
					class="border-b border-gray-100 hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-gray-800"
				>
					<td class="py-2">
						<a class="font-mono underline" href="/spieltage/{e.datum}">
							{formatDate(e.datum)}
						</a>
					</td>
					<td class="tabular-nums">{e.bommel}</td>
					<td class="tabular-nums">{e.runden}</td>
					<td class="tabular-nums">
						{formatPercent(e.runden ? e.bommel / e.runden : null)}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}
