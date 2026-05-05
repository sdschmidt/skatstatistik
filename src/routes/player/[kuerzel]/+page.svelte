<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		Activity,
		Ellipse,
		Calendar as CalendarIcon,
		Club,
		Flame,
		Percent,
		Trophy
	} from 'lucide-svelte';
	import Avatar from '$lib/components/Avatar.svelte';
	import Calendar from '$lib/components/Calendar.svelte';
	import Chart from '$lib/components/Chart.svelte';
	import DateRangeFilter from '$lib/components/DateRangeFilter.svelte';
	import RangeSlider from '$lib/components/RangeSlider.svelte';
	import Trend from '$lib/components/Trend.svelte';
	import { formatDate, formatPercent } from '$lib/format';
	import { rowGoto } from '$lib/rowLink';
	import { theme } from '$lib/theme.svelte';
	import type { ApexOptions } from 'apexcharts';

	let { data } = $props();
	const { player } = $derived(data);
	const filters = $derived(data.filters);
	const bounds = $derived(data.bounds);
	const summary = $derived(data.summary);
	const summaryTrend = $derived(data.summaryTrend);
	const calendar = $derived(data.calendar);
	const ergebnisse = $derived(data.ergebnisse);

	const baseUrl = $derived(`/player/${encodeURIComponent(player.kuerzel)}`);

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

	const historyChart: ApexOptions = $derived({
		chart: { type: 'line', toolbar: { show: false }, fontFamily: 'inherit', zoom: { enabled: false } },
		series: [
			{
				name: 'Bommel/Runde (30-Runden-Mittel)',
				data: data.history.map((h) => ({
					x: h.datum,
					y: Number((h.bpr * 100).toFixed(1))
				}))
			}
		],
		stroke: { curve: 'smooth', width: 2 },
		markers: { size: 0, hover: { size: 4 } },
		xaxis: { type: 'datetime' },
		yaxis: { labels: { formatter: (v) => `${v}%` }, min: 0 },
		dataLabels: { enabled: false },
		colors: ['#1e40af']
	});

	function tabHref(year: number | 'all'): string {
		const p = new URLSearchParams();
		if (year !== 'all') {
			p.set('from', `${year}-01-01`);
			p.set('to', `${year}-12-31`);
		}
		// preserve any sort/dir; reset other range filters when switching tabs
		if (filters.sort && filters.sort !== 'date') p.set('sort', filters.sort);
		if (filters.dir === 'asc') p.set('dir', 'asc');
		return `${baseUrl}${p.size ? '?' + p.toString() : ''}`;
	}

	const activeYear = $derived.by<number | 'all' | null>(() => {
		const f = filters.from;
		const t = filters.to;
		if (!f && !t) return 'all';
		const m = /^(\d{4})-01-01$/.exec(f ?? '');
		if (m && t === `${m[1]}-12-31`) return Number(m[1]);
		return null; // some other custom range
	});

	const statistikHref = $derived.by(() => {
		if (activeYear === 'all') return '/?year=all';
		if (activeYear === null) return '/';
		return `/?year=${activeYear}`;
	});
	const statistikLabel = $derived(
		activeYear === 'all' ? 'Gesamt' : activeYear === null ? '' : `${activeYear}`
	);

	// Drill-down to /spieltage and /runden carrying just the active date range
	// (year tab → that year; Gesamt → no filter). The list pages don't filter
	// by player, so the link gives the player's spieltage in context, not in
	// isolation.
	const dateQs = $derived.by(() => {
		const p = new URLSearchParams();
		if (filters.from) p.set('from', filters.from);
		if (filters.to) p.set('to', filters.to);
		return p.size ? '?' + p.toString() : '';
	});
	const spieltageHref = $derived(`/spieltage${dateQs}`);
	const rundenHref = $derived(`/runden${dateQs}`);

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

<div class="flex flex-wrap items-center justify-between gap-4">
	<h1 class="flex items-center gap-3 text-2xl font-semibold">
		<Avatar kuerzel={player.kuerzel} size={40} />
		{#if player.name}
			<span>{player.name}</span>
		{:else}
			<span class="text-sm text-gray-500">ohne Name</span>
		{/if}
	</h1>
	<div class="flex items-center gap-4 text-sm">
		<span class="inline-flex items-center gap-1.5" title="Aktuelle Serie">
			<Flame class="size-4 text-orange-500" />
			<span class="font-semibold tabular-nums">{data.streaks.current}</span>
			<span class="text-xs text-gray-500">aktuell</span>
		</span>
		<span class="inline-flex items-center gap-1.5" title="Längste Serie">
			<Flame class="size-4 text-rose-500" />
			<span class="font-semibold tabular-nums">{data.streaks.longest}</span>
			<span class="text-xs text-gray-500">längste</span>
		</span>
	</div>
</div>

{#if data.years.length > 0}
	<nav class="mt-4 flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-700">
		<a
			href={tabHref('all')}
			class="rounded-t border-b-2 px-3 py-2 text-sm
				{activeYear === 'all'
					? 'border-blue-600 font-medium text-blue-700 dark:text-blue-400'
					: 'border-transparent text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'}"
		>
			Gesamt
		</a>
		{#each data.years as y (y)}
			<a
				href={tabHref(y)}
				class="rounded-t border-b-2 px-3 py-2 text-sm
					{activeYear === y
						? 'border-blue-600 font-medium text-blue-700 dark:text-blue-400'
						: 'border-transparent text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'}"
			>
				{y}
			</a>
		{/each}
	</nav>
{/if}

<!-- stats strip -->
<dl class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
	<a
		href={spieltageHref}
		class="group block rounded border border-blue-300 p-3 no-underline transition hover:-translate-y-0.5 hover:border-blue-400 hover:bg-blue-50 hover:shadow-sm dark:border-blue-800 dark:hover:border-blue-500 dark:hover:bg-blue-950/60"
	>
		<dt class="flex items-center gap-1.5 text-xs text-blue-700 transition-colors group-hover:text-blue-800 dark:text-blue-300 dark:group-hover:text-blue-200">
			<CalendarIcon class="size-3.5" /> Spieltage
		</dt>
		<dd class="mt-1 text-lg font-semibold tabular-nums">
			{summary.spieltage}
			{#if summaryTrend?.kind === 'year'}
				<Trend prev={summaryTrend.spieltage} curr={summary.spieltage} format="count" />
			{/if}
		</dd>
	</a>
	<a
		href={rundenHref}
		class="group block rounded border border-amber-300 p-3 no-underline transition hover:-translate-y-0.5 hover:border-amber-400 hover:bg-amber-50 hover:shadow-sm dark:border-amber-800 dark:hover:border-amber-500 dark:hover:bg-amber-950/60"
	>
		<dt class="flex items-center gap-1.5 text-xs text-amber-700 transition-colors group-hover:text-amber-800 dark:text-amber-300 dark:group-hover:text-amber-200">
			<Club class="size-3.5" /> Runden
		</dt>
		<dd class="mt-1 text-lg font-semibold tabular-nums">
			{summary.runden}
			{#if summaryTrend?.kind === 'year'}
				<Trend prev={summaryTrend.runden} curr={summary.runden} format="count" />
			{/if}
		</dd>
	</a>
	<div class="group rounded border border-orange-300 p-3 transition hover:-translate-y-0.5 hover:border-orange-400 hover:bg-orange-50 hover:shadow-sm dark:border-orange-800 dark:hover:border-orange-500 dark:hover:bg-orange-950/60">
		<dt class="flex items-center gap-1.5 text-xs text-orange-700 transition-colors group-hover:text-orange-800 dark:text-orange-300 dark:group-hover:text-orange-200">
			<Ellipse class="size-3.5" /> Bommel
		</dt>
		<dd class="mt-1 text-lg font-semibold tabular-nums">
			{summary.bommel}
			{#if summaryTrend?.kind === 'year'}
				<Trend prev={summaryTrend.bommel} curr={summary.bommel} format="count" lowerIsBetter />
			{/if}
		</dd>
	</div>
	<div class="group rounded border border-rose-300 p-3 transition hover:-translate-y-0.5 hover:border-rose-400 hover:bg-rose-50 hover:shadow-sm dark:border-rose-800 dark:hover:border-rose-500 dark:hover:bg-rose-950/60">
		<dt class="flex items-center gap-1.5 text-xs text-rose-700 transition-colors group-hover:text-rose-800 dark:text-rose-300 dark:group-hover:text-rose-200">
			<Percent class="size-3.5" /> Bommel/R.
		</dt>
		<dd class="mt-1 text-lg font-semibold tabular-nums">
			{formatPercent(summary.bommelPerRunde)}
			{#if summaryTrend?.kind === 'year'}
				<Trend prev={summaryTrend.bommel_per_runde} curr={summary.bommelPerRunde} lowerIsBetter />
			{:else if summaryTrend?.kind === 'recent'}
				<Trend
					prev={summaryTrend.bpr_prev}
					curr={summaryTrend.bpr_curr}
					prevLabel="vorherige 50 Runden"
					lowerIsBetter
				/>
			{/if}
		</dd>
	</div>
	<div class="group rounded border border-emerald-300 p-3 transition hover:-translate-y-0.5 hover:border-emerald-400 hover:bg-emerald-50 hover:shadow-sm dark:border-emerald-800 dark:hover:border-emerald-500 dark:hover:bg-emerald-950/60">
		<dt class="flex items-center gap-1.5 text-xs text-emerald-700 transition-colors group-hover:text-emerald-800 dark:text-emerald-300 dark:group-hover:text-emerald-200">
			<Trophy class="size-3.5" /> Gewinn
		</dt>
		<dd class="mt-1 text-lg font-semibold tabular-nums">
			{formatPercent(summary.gewinnrate)}
			{#if summaryTrend?.kind === 'year'}
				<Trend prev={summaryTrend.gewinnrate} curr={summary.gewinnrate} />
			{:else if summaryTrend?.kind === 'recent'}
				<Trend
					prev={summaryTrend.gewinn_prev}
					curr={summaryTrend.gewinn_curr}
					prevLabel="vorherige 50 Runden"
				/>
			{/if}
		</dd>
	</div>
	<div class="group rounded border border-indigo-300 p-3 transition hover:-translate-y-0.5 hover:border-indigo-400 hover:bg-indigo-50 hover:shadow-sm dark:border-indigo-800 dark:hover:border-indigo-500 dark:hover:bg-indigo-950/60">
		<dt class="flex items-center gap-1.5 text-xs text-indigo-700 transition-colors group-hover:text-indigo-800 dark:text-indigo-300 dark:group-hover:text-indigo-200">
			<Activity class="size-3.5" /> Anwesenheit
		</dt>
		<dd class="mt-1 text-lg font-semibold tabular-nums">
			{formatPercent(summary.anwesenheit)}
			{#if summaryTrend?.kind === 'year'}
				<Trend prev={summaryTrend.anwesenheit} curr={summary.anwesenheit} />
			{:else if summaryTrend?.kind === 'recent'}
				<Trend
					prev={summaryTrend.anwesenheit_prev}
					curr={summaryTrend.anwesenheit_curr}
					prevLabel="vorherige 16 Spieltage"
				/>
			{/if}
		</dd>
		<dd class="text-[10px] text-gray-500">
			{summary.anwesenheitNumerator}/{summary.anwesenheitDenominator}
		</dd>
	</div>
</dl>

<!-- calendar -->
<section class="mt-6">
	<Calendar entries={calendar} from={data.calRange.from} to={data.calRange.to} />
</section>

{#if statistikLabel}
	<div class="mt-3 text-sm">
		<a class="text-blue-700 hover:underline dark:text-blue-400" href={statistikHref}>
			→ Statistik {statistikLabel}
		</a>
	</div>
{/if}

{#if data.history.length > 1}
	<section class="mt-6">
		<h2 class="text-sm font-medium">Bommel/Runde</h2>
		<p class="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
			gleitender Mittelwert (30 Runden)
		</p>
		<div class="mt-2">
			{#key `${activeYear}:${theme.isDark}`}
				<Chart options={historyChart} height={400} />
			{/key}
		</div>
	</section>
{/if}

<!-- filter -->
<div class="mt-6 text-sm">
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
				<!-- svelte-ignore a11y_click_events_have_key_events -->
				<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
				<tr
					class="cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-gray-800"
					onclick={rowGoto(`/spieltage/${e.datum}`)}
				>
					<td class="py-2">
						<a class="no-underline hover:underline" href="/spieltage/{e.datum}">
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

