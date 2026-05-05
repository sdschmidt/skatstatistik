<script lang="ts">
	import { Datepicker } from 'flowbite-svelte';

	type Props = {
		from?: string; // ISO date YYYY-MM-DD
		to?: string;
		onchange?: (next: { from?: string; to?: string }) => void;
		placeholder?: string;
	};

	let { from, to, onchange, placeholder = 'Datum-Bereich' }: Props = $props();

	function isoOf(d: Date | undefined): string | undefined {
		if (!d) return undefined;
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		return `${y}-${m}-${day}`;
	}
	function dateOf(iso: string | undefined): Date | undefined {
		return iso ? new Date(`${iso}T00:00:00`) : undefined;
	}

	// svelte-ignore state_referenced_locally
	let rangeFrom = $state<Date | undefined>(dateOf(from));
	// svelte-ignore state_referenced_locally
	let rangeTo = $state<Date | undefined>(dateOf(to));

	// External prop sync: when the URL-driven `from` / `to` change (eg. clear
	// button or back-button), reset the internal Date state. Guard so this
	// effect doesn't fight with the user-input effect below.
	// svelte-ignore state_referenced_locally
	let lastPropFrom = from;
	// svelte-ignore state_referenced_locally
	let lastPropTo = to;
	$effect(() => {
		if (from === lastPropFrom && to === lastPropTo) return;
		lastPropFrom = from;
		lastPropTo = to;
		rangeFrom = dateOf(from);
		rangeTo = dateOf(to);
	});

	// User-input → notify parent.
	// svelte-ignore state_referenced_locally
	let lastEmittedFrom = from;
	// svelte-ignore state_referenced_locally
	let lastEmittedTo = to;
	$effect(() => {
		const f = isoOf(rangeFrom);
		const t = isoOf(rangeTo);
		if (f === lastEmittedFrom && t === lastEmittedTo) return;
		lastEmittedFrom = f;
		lastEmittedTo = t;
		onchange?.({ from: f, to: t });
	});
</script>

<Datepicker range bind:rangeFrom bind:rangeTo {placeholder} />
