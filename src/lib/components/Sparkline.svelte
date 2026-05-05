<script lang="ts">
	// Tiny pure-SVG sparkline. Renders ~50 of these on a page is no-op compared
	// to ApexCharts, which would mount 50 separate chart instances.

	type Props = {
		values: (number | null)[];
		width?: number;
		height?: number;
		color?: string;
	};

	let { values, width = 60, height = 18, color }: Props = $props();

	const cleaned = $derived(values.map((v) => (v === null || !Number.isFinite(v) ? null : v)));
	const finiteValues = $derived(cleaned.filter((v): v is number => v !== null));

	const min = $derived(finiteValues.length ? Math.min(...finiteValues, 0) : 0);
	const max = $derived(finiteValues.length ? Math.max(...finiteValues) : 1);
	const range = $derived(max - min || 1);

	const points = $derived.by(() => {
		const n = cleaned.length;
		if (n < 2) return '';
		// build polyline, skipping null gaps
		return cleaned
			.map((v, i) => {
				if (v === null) return null;
				const x = (i / (n - 1)) * width;
				const y = height - ((v - min) / range) * (height - 2) - 1;
				return `${x.toFixed(1)},${y.toFixed(1)}`;
			})
			.filter((p): p is string => p !== null)
			.join(' ');
	});

	const stroke = $derived(color ?? 'currentColor');
	const lastPoint = $derived.by(() => {
		const n = cleaned.length;
		for (let i = n - 1; i >= 0; i--) {
			const v = cleaned[i];
			if (v === null) continue;
			const x = (i / (n - 1)) * width;
			const y = height - ((v - min) / range) * (height - 2) - 1;
			return { x, y };
		}
		return null;
	});
</script>

{#if cleaned.length >= 2 && points}
	<svg
		viewBox="0 0 {width} {height}"
		{width}
		{height}
		class="inline-block align-middle text-blue-600 dark:text-blue-400"
		aria-hidden="true"
	>
		<polyline {points} fill="none" stroke={stroke} stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" />
		{#if lastPoint}
			<circle cx={lastPoint.x} cy={lastPoint.y} r="1.6" fill={stroke} />
		{/if}
	</svg>
{:else}
	<span class="text-xs text-gray-300 dark:text-gray-600">–</span>
{/if}
