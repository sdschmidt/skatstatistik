<script lang="ts">
	import { page } from '$app/state';
	import { Club, Ellipse, Users } from 'lucide-svelte';
	import Avatar from '$lib/components/Avatar.svelte';
	import { formatDate, formatLongDate, formatPercent } from '$lib/format';
	import { rowGoto } from '$lib/rowLink';
	let { data } = $props();
	const spieltag = $derived(data.spieltag);
	const spielerCount = $derived(spieltag.ergebnisse.length);
	const totalRunden = $derived(spieltag.ergebnisse.reduce((s, e) => s + e.runden, 0));
	const totalBommel = $derived(spieltag.ergebnisse.reduce((s, e) => s + e.bommel, 0));
	const seasonAvg = $derived(data.seasonAvgSpieler);
	const spielerDelta = $derived(seasonAvg === null ? null : spielerCount - seasonAvg);
	const isAdmin = $derived(page.data.user?.role === 'admin');
	const canWrite = $derived(page.data.user && page.data.user.role !== 'pending');
</script>

<div class="flex items-center justify-between gap-4">
	<h1 class="text-2xl font-semibold">{formatLongDate(spieltag.datum)}</h1>
	<div class="flex items-center gap-2 text-sm">
		{#if canWrite}
			<a
				href="/spieltage/{spieltag.datum}/edit"
				class="rounded border border-gray-300 px-3 py-1.5 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
			>
				Bearbeiten
			</a>
		{/if}
		{#if isAdmin}
			<form
				method="POST"
				action="?/delete"
				onsubmit={(e) => {
					if (!confirm(`Spieltag ${formatDate(spieltag.datum)} und alle Ergebnisse löschen?`))
						e.preventDefault();
				}}
			>
				<button class="rounded border border-red-300 px-3 py-1.5 text-red-600 hover:bg-red-50 dark:border-red-700 dark:hover:bg-red-950">
					Löschen
				</button>
			</form>
		{/if}
	</div>
</div>

<nav class="mt-4 flex flex-wrap gap-1 border-b border-gray-200 dark:border-gray-700">
	{#if data.adjacent.prev}
		<a
			href="/spieltage/{data.adjacent.prev}"
			rel="prev"
			class="rounded-t border-b-2 border-transparent px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
		>
			← <span class="font-mono">{formatDate(data.adjacent.prev)}</span>
		</a>
	{/if}
	<span
		aria-current="page"
		class="rounded-t border-b-2 border-blue-600 px-3 py-2 text-sm font-medium text-blue-700 dark:text-blue-400"
	>
		<span class="font-mono">{formatDate(spieltag.datum)}</span>
	</span>
	{#if data.adjacent.next}
		<a
			href="/spieltage/{data.adjacent.next}"
			rel="next"
			class="rounded-t border-b-2 border-transparent px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
		>
			<span class="font-mono">{formatDate(data.adjacent.next)}</span> →
		</a>
	{/if}
</nav>

<dl class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
	<div class="group rounded border border-teal-300 p-3 transition hover:-translate-y-0.5 hover:border-teal-400 hover:bg-teal-50 hover:shadow-sm dark:border-teal-800 dark:hover:border-teal-500 dark:hover:bg-teal-950/60">
		<dt class="flex items-center gap-1.5 text-xs text-teal-700 transition-colors group-hover:text-teal-800 dark:text-teal-300 dark:group-hover:text-teal-200">
			<Users class="size-3.5" /> Spieler
		</dt>
		<dd class="mt-1 text-lg font-semibold tabular-nums">{spielerCount}</dd>
		{#if spielerDelta !== null && seasonAvg !== null}
			<dd class="text-[10px] text-gray-500 dark:text-gray-400">
				{spielerDelta > 0 ? '+' : ''}{spielerDelta.toFixed(1).replace(/\.0$/, '')} vs Ø {seasonAvg.toFixed(1)}
			</dd>
		{/if}
	</div>
	<div class="group rounded border border-amber-300 p-3 transition hover:-translate-y-0.5 hover:border-amber-400 hover:bg-amber-50 hover:shadow-sm dark:border-amber-800 dark:hover:border-amber-500 dark:hover:bg-amber-950/60">
		<dt class="flex items-center gap-1.5 text-xs text-amber-700 transition-colors group-hover:text-amber-800 dark:text-amber-300 dark:group-hover:text-amber-200">
			<Club class="size-3.5" /> Runden
		</dt>
		<dd class="mt-1 text-lg font-semibold tabular-nums">{totalRunden}</dd>
	</div>
	<div class="group rounded border border-orange-300 p-3 transition hover:-translate-y-0.5 hover:border-orange-400 hover:bg-orange-50 hover:shadow-sm dark:border-orange-800 dark:hover:border-orange-500 dark:hover:bg-orange-950/60">
		<dt class="flex items-center gap-1.5 text-xs text-orange-700 transition-colors group-hover:text-orange-800 dark:text-orange-300 dark:group-hover:text-orange-200">
			<Ellipse class="size-3.5" /> Bommel
		</dt>
		<dd class="mt-1 text-lg font-semibold tabular-nums">{totalBommel}</dd>
	</div>
</dl>

{#if spieltag.photoPath}
	<a href="/api/photos/{spieltag.datum}" target="_blank" rel="noopener" class="mt-4 inline-block">
		<img
			src="/api/photos/{spieltag.datum}"
			alt="Spieltag {spieltag.datum}"
			class="max-h-64 rounded border border-gray-200 dark:border-gray-700"
		/>
	</a>
{/if}

{#if spieltag.notes}
	<p class="mt-4 whitespace-pre-line text-sm text-gray-700 dark:text-gray-300">{spieltag.notes}</p>
{/if}

<table class="mt-6 w-full max-w-xl text-sm">
	<thead>
		<tr class="border-b border-gray-200 text-left dark:border-gray-700">
			<th class="py-2 font-medium">Kürzel</th>
			<th class="font-medium">Name</th>
			<th class="font-medium">Bommel</th>
			<th class="font-medium">Runden</th>
			<th class="font-medium">Bommel/Runde</th>
		</tr>
	</thead>
	<tbody>
		{#each spieltag.ergebnisse as e (e.playerId)}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
			<tr
				class="cursor-pointer border-b border-gray-100 transition-colors hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-gray-800"
				onclick={rowGoto(`/player/${encodeURIComponent(e.kuerzel)}`)}
			>
				<td class="py-1">
					<a
						class="inline-flex items-center gap-2 no-underline"
						href="/player/{encodeURIComponent(e.kuerzel)}"
					>
						<Avatar kuerzel={e.kuerzel} size={22} />
					</a>
				</td>
				<td>{e.name ?? ''}</td>
				<td>{e.bommel}</td>
				<td>{e.runden}</td>
				<td>{formatPercent(e.runden ? e.bommel / e.runden : null)}</td>
			</tr>
		{/each}
		<tr class="border-t-2 border-gray-300 font-medium dark:border-gray-600">
			<td class="py-2">Σ</td>
			<td></td>
			<td>{totalBommel}</td>
			<td>{totalRunden}</td>
			<td>{formatPercent(totalRunden ? totalBommel / totalRunden : null)}</td>
		</tr>
	</tbody>
</table>

<div class="mt-3">
	<a
		href="/?year={spieltag.datum.slice(0, 4)}"
		class="text-sm text-blue-700 hover:underline dark:text-blue-400"
	>
		→ Statistik {spieltag.datum.slice(0, 4)}
	</a>
</div>
