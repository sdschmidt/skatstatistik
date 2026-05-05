<script lang="ts">
	import { Calendar as CalendarIcon, Club } from 'lucide-svelte';
	import Trend from '$lib/components/Trend.svelte';
	import Avatar from '$lib/components/Avatar.svelte';
	import Calendar from '$lib/components/Calendar.svelte';
	import Chart from '$lib/components/Chart.svelte';
	import Sparkline from '$lib/components/Sparkline.svelte';
	import { formatPercent } from '$lib/format';
	import { paletteFor } from '$lib/playerColor';
	import { rowGoto } from '$lib/rowLink';
	import { theme } from '$lib/theme.svelte';
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
	const chartColors = $derived(stats.map((s) => paletteFor(s.kuerzel)));
	const heading = $derived(isAll ? 'Gesamt' : `Jahr ${year}`);

	const bommelChart: ApexOptions = $derived({
		chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
		plotOptions: { bar: { distributed: true } },
		legend: { show: false },
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
		colors: chartColors
	});

	const anwesenheitChart: ApexOptions = $derived({
		chart: { type: 'bar', toolbar: { show: false }, fontFamily: 'inherit' },
		plotOptions: { bar: { distributed: true } },
		legend: { show: false },
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
		colors: chartColors
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

	<p class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-400">
		<span class="inline-flex items-center gap-1.5">
			<CalendarIcon class="size-4" />
			<strong>{totals.spieltage}</strong>
			{totals.spieltage === 1 ? 'Spieltag' : 'Spieltage'}
		</span>
		<span class="inline-flex items-center gap-1.5">
			<Club class="size-4" />
			<strong>{totals.runden}</strong> Spieler-Runden
		</span>
		<span class="text-xs">
			{isAll ? 'gesamt' : `im Jahr ${year}`} (Summe der pro Spieler erfassten Runden)
		</span>
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
						<th class="pr-4 font-medium">
							<a href={toggleSort('anwesenheit')} class="hover:underline">
								<span class="hidden sm:inline">Anwesenh.</span><span class="sm:hidden">Anw.</span>{arrow('anwesenheit')}
							</a>
						</th>
						<th class="pr-2 font-medium" title="Bommel/Runde-Verlauf über alle Jahre">
							Verlauf
						</th>
					</tr>
				</thead>
				<tbody>
					{#each stats as s (s.player_id)}
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
						<tr
							class="cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-gray-800"
							onclick={rowGoto(`/spieler/${encodeURIComponent(s.kuerzel)}`)}
						>
							<td class="py-1 pr-4">
								<a
									class="inline-flex items-center gap-2 no-underline"
									href="/spieler/{encodeURIComponent(s.kuerzel)}"
								>
									<Avatar kuerzel={s.kuerzel} size={22} />
								</a>
							</td>
							<td class="pr-4">{s.name ?? ''}</td>
							<td class="pr-4 tabular-nums">{s.spieltage} <Trend prev={s.prev?.spieltage ?? null} curr={s.spieltage} format="count" /></td>
							<td class="pr-4 tabular-nums">{s.runden} <Trend prev={s.prev?.runden ?? null} curr={s.runden} format="count" /></td>
							<td class="pr-4 tabular-nums">{s.bommel} <Trend prev={s.prev?.bommel ?? null} curr={s.bommel} format="count" lowerIsBetter /></td>
							<td class="pr-4 tabular-nums">{formatPercent(s.bommel_per_runde)} {#if isAll}<Trend prev={s.recent?.bpr_prev ?? null} curr={s.recent?.bpr_curr ?? null} prevLabel="vorherige 50 Runden" lowerIsBetter />{:else}<Trend prev={s.prev?.bommel_per_runde ?? null} curr={s.bommel_per_runde === null ? null : Number(s.bommel_per_runde)} lowerIsBetter />{/if}</td>
							<td class="pr-4 tabular-nums">{formatPercent(s.gewinnrate)} {#if isAll}<Trend prev={s.recent?.gewinn_prev ?? null} curr={s.recent?.gewinn_curr ?? null} prevLabel="vorherige 50 Runden" />{:else}<Trend prev={s.prev?.gewinnrate ?? null} curr={s.gewinnrate === null ? null : Number(s.gewinnrate)} />{/if}</td>
							<td class="pr-4 tabular-nums">{formatPercent(s.anwesenheit)} {#if isAll}<Trend prev={s.recent?.anwesenheit_prev ?? null} curr={s.recent?.anwesenheit_curr ?? null} prevLabel="vorherige 16 Spieltage" />{:else}<Trend prev={s.prev?.anwesenheit ?? null} curr={s.anwesenheit === null ? null : Number(s.anwesenheit)} />{/if}</td>
							<td class="pr-2"><Sparkline values={s.spark} /></td>
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
			<div>
				<h2 class="text-sm font-medium">Bommel pro Runde</h2>
				<div class="mt-2">
					{#key `${heading}:${theme.isDark}`}
						<Chart options={bommelChart} />
					{/key}
				</div>
			</div>
			<div>
				<h2 class="text-sm font-medium">Anwesenheit</h2>
				<div class="mt-2">
					{#key `${heading}:${theme.isDark}`}
						<Chart options={anwesenheitChart} />
					{/key}
				</div>
			</div>
		</div>
	{/if}
{/if}
