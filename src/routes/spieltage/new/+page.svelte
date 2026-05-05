<script lang="ts">
	import SpieltagForm from '$lib/components/SpieltagForm.svelte';
	import { todayIso } from '$lib/format';
	let { data } = $props();
</script>

<h1 class="text-2xl font-semibold">Neuer Spieltag</h1>

<div class="mt-6 max-w-2xl">
	<SpieltagForm
		initialDatum={todayIso()}
		allPlayers={data.allPlayers}
		submitLabel="Spieltag anlegen"
	/>
</div>
