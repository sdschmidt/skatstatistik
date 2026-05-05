<script lang="ts">
	import { page } from '$app/state';
	import { formatDate, formatPercent } from '$lib/format';
	let { data } = $props();
	const spieltag = $derived(data.spieltag);
	const totalRunden = $derived(spieltag.ergebnisse.reduce((s, e) => s + e.runden, 0));
	const totalBommel = $derived(spieltag.ergebnisse.reduce((s, e) => s + e.bommel, 0));
	const isAdmin = $derived(page.data.user?.role === 'admin');
</script>

<div class="flex items-center justify-between gap-4">
	<h1 class="text-2xl font-semibold">
		Spieltag <span class="font-mono">{formatDate(spieltag.datum)}</span>
	</h1>
	{#if isAdmin}
		<div class="flex items-center gap-2 text-sm">
			<a
				href="/spieltage/{spieltag.datum}/edit"
				class="rounded border border-gray-300 px-3 py-1.5 hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
			>
				Bearbeiten
			</a>
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
		</div>
	{/if}
</div>

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
			<tr class="border-b border-gray-100 dark:border-gray-800">
				<td class="py-1">
					<a
						class="font-mono hover:underline"
						href="/spieler/{encodeURIComponent(e.kuerzel)}"
					>
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
