<script lang="ts">
	import { onMount } from 'svelte';
	import type { ApexOptions } from 'apexcharts';

	type Props = { options: ApexOptions; height?: number };
	let { options, height = 320 }: Props = $props();

	let target = $state<HTMLDivElement | null>(null);
	type ApexInstance = {
		render: () => Promise<unknown>;
		updateOptions: (o: ApexOptions) => unknown;
		destroy: () => unknown;
	};
	let chart: ApexInstance | null = null;

	onMount(() => {
		let cancelled = false;
		(async () => {
			const ApexCharts = (await import('apexcharts')).default;
			if (cancelled || !target) return;
			chart = new ApexCharts(target, { ...options, chart: { ...(options.chart ?? {}), height } });
			chart.render();
		})();
		return () => {
			cancelled = true;
			chart?.destroy();
			chart = null;
		};
	});

	$effect(() => {
		if (chart) chart.updateOptions({ ...options, chart: { ...(options.chart ?? {}), height } });
	});
</script>

<div bind:this={target} style="height: {height}px;"></div>
