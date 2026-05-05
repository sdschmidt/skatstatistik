<script lang="ts">
	import { formatDate } from '$lib/format';
	let { data } = $props();
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

{#if data.spieltage.length === 0}
	<p class="mt-6 text-sm text-gray-500">Noch keine Spieltage erfasst.</p>
{:else}
	<table class="mt-6 w-full text-sm">
		<thead>
			<tr class="border-b border-gray-200 text-left dark:border-gray-700">
				<th class="py-2 font-medium">Datum</th>
				<th class="font-medium">Spieler</th>
				<th class="font-medium">Runden</th>
				<th class="font-medium">Foto</th>
			</tr>
		</thead>
		<tbody>
			{#each data.spieltage as s (s.datum)}
				<tr class="border-b border-gray-100 hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-gray-800">
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
