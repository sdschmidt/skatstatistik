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

	// Detect dark-mode by checking the .dark class on <html> and re-render the
	// chart when it flips, so labels stay legible after the user toggles.
	let isDark = $state(false);

	function applyTheme(opts: ApexOptions, dark: boolean): ApexOptions {
		return {
			...opts,
			chart: {
				...(opts.chart ?? {}),
				height,
				foreColor: dark ? '#e5e7eb' : '#374151', // gray-200 / gray-700
				background: 'transparent'
			},
			grid: {
				...(opts.grid ?? {}),
				borderColor: dark ? '#374151' : '#e5e7eb'
			},
			tooltip: {
				...(opts.tooltip ?? {}),
				theme: dark ? 'dark' : 'light'
			}
		};
	}

	onMount(() => {
		isDark = document.documentElement.classList.contains('dark');
		const obs = new MutationObserver(() => {
			const next = document.documentElement.classList.contains('dark');
			if (next !== isDark) isDark = next;
		});
		obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

		let cancelled = false;
		(async () => {
			const ApexCharts = (await import('apexcharts')).default;
			if (cancelled || !target) return;
			chart = new ApexCharts(target, applyTheme(options, isDark));
			chart.render();
		})();
		return () => {
			cancelled = true;
			obs.disconnect();
			chart?.destroy();
			chart = null;
		};
	});

	$effect(() => {
		if (chart) chart.updateOptions(applyTheme(options, isDark));
	});
</script>

<div bind:this={target} style="height: {height}px;"></div>
