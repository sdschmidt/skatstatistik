<script lang="ts">
	import Calendar from '$lib/components/Calendar.svelte';
	import Chart from '$lib/components/Chart.svelte';
	import { formatPercent } from '$lib/format';
	import type { ApexOptions } from 'apexcharts';

	let { data } = $props();
	const { years, year, isAll, sort, dir, stats, totals, calendar } = $derived(data);

	function buildUrl(overrides: { year?: number | 'all'; sort?: string; dir?: string }): string {
		const merged = {
			year: isAll ? 'all' : year,
			sort,
			dir,
			...overrides
		} as { year?: number | 'all' | null; sort?: string; dir?: string };
		const p = new URLSearchParams();
		if (merged.year) p.set('year', String(merged.year));
		if (merged.sort && merged.sort !== 'spieltage') p.set('sort', merged.sort);
		if (merged.dir === 'asc') p.set('dir', 'asc');
		return `/?${p.toString()}`;
	}

	function toggleSort(field: string): string {
		const newDir = sort === field && dir === 'desc' ? 'asc' : 'desc';
		return buildUrl({ sort: field, dir: newDir });
	}

	function arrow(field: string): string {
		if (sort !== field) return '';
		return dir === 'asc' ? ' ↑' : ' ↓';
	}

	const chartLabels = $derived(stats.map((s) => s.kuerzel));
	const heading = $derived(isAll ? 'Gesamt' : `Jahr ${year}`);

	const bommelChart: ApexOptions = $derived({
		chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
		series: [
			{
				name: 'Bommel/Runde',
				data: stats.map((s) =>
					s.bommel_per_runde ? Number((parseFloat(s.bommel_per_runde) * 100).toFixed(1)) : 0
				)
			}
		],
		xaxis: { categories: chartLabels },
		yaxis: { labels: { formatter: (v) => `${v}%` } },
		dataLabels: { enabled: false },
		colors: ['#dc2626'],
		title: { text: 'Bommel pro Runde', align: 'left', style: { fontSize: '14px' } }
	});

	const anwesenheitChart: ApexOptions = $derived({
		chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
		series: [
			{
				name: 'Anwesenheit',
				data: stats.map((s) =>
					s.anwesenheit ? Number((parseFloat(s.anwesenheit) * 100).toFixed(1)) : 0
				)
			}
		],
		xaxis: { categories: chartLabels },
		yaxis: { labels: { formatter: (v) => `${v}%` }, max: 100 },
		dataLabels: { enabled: false },
		colors: ['#2563eb'],
		title: { text: 'Anwesenheit', align: 'left', style: { fontSize: '14px' } }
	});
</script>

<h1 class="text-2xl font-semibold">Statistik</h1>

{#if years.length === 0}
	<p class="mt-4 text-sm text-gray-500">Noch keine Daten.</p>
{:else}
	<nav class="mt-4 flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-700">
		<a
			href={buildUrl({ year: 'all' })}
			class="rounded-t border-b-2 px-3 py-2 text-sm
				{isAll
					? 'border-blue-600 font-medium text-blue-700 dark:text-blue-400'
					: 'border-transparent text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'}"
		>
			Gesamt
		</a>
		{#each years as y (y)}
			<a
				href={buildUrl({ year: y })}
				class="rounded-t border-b-2 px-3 py-2 text-sm
					{!isAll && y === year
						? 'border-blue-600 font-medium text-blue-700 dark:text-blue-400'
						: 'border-transparent text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'}"
			>
				{y}
			</a>
		{/each}
	</nav>

	<p class="mt-3 text-sm text-gray-600 dark:text-gray-400">
		<strong>{totals.spieltage}</strong>
		{totals.spieltage === 1 ? 'Spieltag' : 'Spieltage'} ·
		<strong>{totals.runden}</strong> Spieler-Runden
		{isAll ? 'gesamt' : `gesamt im Jahr ${year}`}
		<span class="text-xs">(Summe der pro Spieler erfassten Runden)</span>.
	</p>

	{#if calendar.length > 0}
		<section class="mt-4">
			<Calendar entries={calendar} />
		</section>
	{/if}

	{#if stats.length === 0}
		<p class="mt-4 text-sm text-gray-500">Keine Daten in {heading}.</p>
	{:else}
		<div class="-mx-4 mt-4 overflow-x-auto px-4">
			<table class="min-w-full text-sm whitespace-nowrap">
				<thead>
					<tr class="border-b border-gray-200 text-left dark:border-gray-700">
						<th class="py-2 pr-4 font-medium">
							<a href={toggleSort('kuerzel')} class="hover:underline">Kürzel{arrow('kuerzel')}</a>
						</th>
						<th class="pr-4 font-medium">
							<a href={toggleSort('name')} class="hover:underline">Name{arrow('name')}</a>
						</th>
						<th class="pr-4 font-medium">
							<a href={toggleSort('spieltage')} class="hover:underline">
								<span class="hidden sm:inline">Spieltage</span><span class="sm:hidden">Tage</span>{arrow('spieltage')}
							</a>
						</th>
						<th class="pr-4 font-medium">
							<a href={toggleSort('runden')} class="hover:underline">Runden{arrow('runden')}</a>
						</th>
						<th class="pr-4 font-medium">
							<a href={toggleSort('bommel')} class="hover:underline">Bommel{arrow('bommel')}</a>
						</th>
						<th class="pr-4 font-medium">
							<a href={toggleSort('bommel_per_runde')} class="hover:underline">
								<span class="hidden sm:inline">Bommel/R.</span><span class="sm:hidden">B/R</span>{arrow('bommel_per_runde')}
							</a>
						</th>
						<th class="pr-4 font-medium">
							<a href={toggleSort('gewinnrate')} class="hover:underline">Gewinn{arrow('gewinnrate')}</a>
						</th>
						<th class="pr-2 font-medium">
							<a href={toggleSort('anwesenheit')} class="hover:underline">
								<span class="hidden sm:inline">Anwesenh.</span><span class="sm:hidden">Anw.</span>{arrow('anwesenheit')}
							</a>
						</th>
					</tr>
				</thead>
				<tbody>
					{#each stats as s (s.player_id)}
						<tr class="border-b border-gray-100 dark:border-gray-800">
							<td class="py-1 pr-4">
								<a
									class="font-mono hover:underline"
									href="/spieler/{encodeURIComponent(s.kuerzel)}"
								>
									{s.kuerzel}
								</a>
							</td>
							<td class="pr-4">
								{#if s.name}
									<a class="hover:underline" href="/spieler/{encodeURIComponent(s.kuerzel)}">
										{s.name}
									</a>
								{/if}
							</td>
							<td class="pr-4 tabular-nums">{s.spieltage}</td>
							<td class="pr-4 tabular-nums">{s.runden}</td>
							<td class="pr-4 tabular-nums">{s.bommel}</td>
							<td class="pr-4 tabular-nums">{formatPercent(s.bommel_per_runde)}</td>
							<td class="pr-4 tabular-nums">{formatPercent(s.gewinnrate)}</td>
							<td class="pr-2 tabular-nums">{formatPercent(s.anwesenheit)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		{@const drillFrom = isAll ? '' : `${year}-01-01`}
		{@const drillTo = isAll ? '' : `${year}-12-31`}
		{@const drillQs = isAll ? '' : `?from=${drillFrom}&to=${drillTo}`}
		<div class="mt-3 flex gap-4 text-sm">
			<a class="text-blue-700 hover:underline dark:text-blue-400" href="/spieltage{drillQs}">
				→ Alle Spieltage{isAll ? '' : ` ${year}`}
			</a>
			<a class="text-blue-700 hover:underline dark:text-blue-400" href="/runden{drillQs}">
				→ Alle Runden{isAll ? '' : ` ${year}`}
			</a>
		</div>

		<div class="mt-8 grid gap-6 lg:grid-cols-2">
			<div class="rounded border border-gray-200 p-3 dark:border-gray-700 dark:bg-gray-900">
				{#key heading}
					<Chart options={bommelChart} />
				{/key}
			</div>
			<div class="rounded border border-gray-200 p-3 dark:border-gray-700 dark:bg-gray-900">
				{#key heading}
					<Chart options={anwesenheitChart} />
				{/key}
			</div>
		</div>
	{/if}
{/if}
