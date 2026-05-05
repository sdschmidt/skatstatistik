<script lang="ts">
	import SpieltagForm from '$lib/components/SpieltagForm.svelte';
	import { formatDate } from '$lib/format';
	let { data } = $props();
	const initialPlayers = $derived(
		data.spieltag.ergebnisse.map((e) => ({
			kuerzel: e.kuerzel,
			bommel: e.bommel,
			runden: e.runden
		}))
	);
</script>

<h1 class="text-2xl font-semibold">
	Spieltag <span class="font-mono">{formatDate(data.spieltag.datum)}</span> bearbeiten
</h1>

<div class="mt-6 max-w-2xl">
	<SpieltagForm
		initialDatum={data.spieltag.datum}
		initialNotes={data.spieltag.notes ?? ''}
		initialPhotoPath={data.spieltag.photoPath}
		{initialPlayers}
		allPlayers={data.allPlayers}
		submitLabel="Speichern"
	/>
</div>
