<script lang="ts">
	import { TrendingDown, TrendingUp, Minus } from 'lucide-svelte';

	type Props = {
		prev: number | null;
		curr: number | null;
		// Smaller is better (e.g. Bommel/Runde, Bommel count)
		lowerIsBetter?: boolean;
		// 'percent' = values are 0..1 percentages (formatted as %); 'count' = raw integers.
		format?: 'percent' | 'count';
		// Threshold below which the change is treated as flat. Sensible default
		// per format.
		eps?: number;
		// Tooltip label for the comparison baseline (default 'Vorjahr').
		prevLabel?: string;
	};

	let {
		prev,
		curr,
		lowerIsBetter = false,
		format = 'percent',
		eps,
		prevLabel = 'Vorjahr'
	}: Props = $props();
	const epsValue = $derived(eps ?? (format === 'percent' ? 0.005 : 0.5));

	type Direction = 'flat' | 'up' | 'down';
	const dir: Direction = $derived.by(() => {
		if (prev === null || curr === null) return 'flat';
		const diff = curr - prev;
		if (Math.abs(diff) < epsValue) return 'flat';
		return diff > 0 ? 'up' : 'down';
	});

	const better = $derived(
		dir === 'flat' ? null : lowerIsBetter ? dir === 'down' : dir === 'up'
	);
	const colorClass = $derived(
		better === null
			? 'text-gray-400 dark:text-gray-500'
			: better
				? 'text-emerald-600 dark:text-emerald-400'
				: 'text-rose-600 dark:text-rose-400'
	);
	const tooltip = $derived.by(() => {
		if (prev === null) return `kein ${prevLabel}-Wert`;
		if (curr === null) return 'kein aktueller Wert';
		if (format === 'percent') {
			const diff = (curr - prev) * 100;
			const sign = diff > 0 ? '+' : '';
			return `${prevLabel} ${(prev * 100).toFixed(1)} % → ${sign}${diff.toFixed(1)} %`;
		}
		const diff = curr - prev;
		const sign = diff > 0 ? '+' : '';
		return `${prevLabel} ${prev} → ${sign}${diff}`;
	});
</script>

<span class="ml-1 inline-flex align-middle {colorClass}" title={tooltip}>
	{#if dir === 'up'}
		<TrendingUp class="size-3.5" />
	{:else if dir === 'down'}
		<TrendingDown class="size-3.5" />
	{:else}
		<Minus class="size-3.5" />
	{/if}
</span>
