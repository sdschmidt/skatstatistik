<script lang="ts">
	// Dual-thumb numeric range slider, Svelte 5 + Tailwind. The look mimics
	// mhkeller/svelte-double-range-slider but with our (Flowbite-blue) palette
	// and dark-mode support. One-way data flow: parent passes `from`/`to`
	// (or undefined for "no constraint") and listens for `onchange`.

	type Props = {
		min: number;
		max: number;
		step?: number;
		from?: number;
		to?: number;
		fromLabel?: string;
		toLabel?: string;
		onchange?: (next: { from: number; to: number }) => void;
	};

	let {
		min,
		max,
		step = 1,
		from,
		to,
		fromLabel = 'min',
		toLabel = 'max',
		onchange
	}: Props = $props();

	// Internal state for immediate visual response to drags. Initial values are
	// taken once from the props; subsequent prop changes are picked up by the
	// effect below.
	// svelte-ignore state_referenced_locally
	let lo = $state(from ?? min);
	// svelte-ignore state_referenced_locally
	let hi = $state(to ?? max);

	// Keep internal state in sync when the parent resets externally (URL change).
	// svelte-ignore state_referenced_locally
	let lastFrom = from;
	// svelte-ignore state_referenced_locally
	let lastTo = to;
	$effect(() => {
		if (from === lastFrom && to === lastTo) return;
		lastFrom = from;
		lastTo = to;
		lo = from ?? min;
		hi = to ?? max;
	});

	const range = $derived(Math.max(max - min, 1));
	const loPct = $derived(((lo - min) / range) * 100);
	const hiPct = $derived(((hi - min) / range) * 100);

	let track = $state<HTMLDivElement | null>(null);

	function clamp(v: number, a: number, b: number) {
		return Math.max(a, Math.min(b, v));
	}
	function valueAt(clientX: number): number {
		if (!track) return min;
		const r = track.getBoundingClientRect();
		const p = clamp((clientX - r.left) / r.width, 0, 1);
		const raw = min + p * (max - min);
		return clamp(Math.round(raw / step) * step, min, max);
	}

	function startDrag(which: 'from' | 'to', e: PointerEvent) {
		e.preventDefault();
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		const move = (ev: PointerEvent) => {
			const v = valueAt(ev.clientX);
			if (which === 'from') lo = clamp(v, min, hi);
			else hi = clamp(v, lo, max);
			onchange?.({ from: lo, to: hi });
		};
		const up = () => {
			window.removeEventListener('pointermove', move);
			window.removeEventListener('pointerup', up);
			window.removeEventListener('pointercancel', up);
		};
		window.addEventListener('pointermove', move);
		window.addEventListener('pointerup', up);
		window.addEventListener('pointercancel', up);
	}

	function nudge(which: 'from' | 'to', delta: number) {
		if (which === 'from') lo = clamp(lo + delta, min, hi);
		else hi = clamp(hi + delta, lo, max);
		onchange?.({ from: lo, to: hi });
	}
</script>

<div class="select-none">
	<div class="mb-1 flex justify-between text-xs text-gray-500 dark:text-gray-400">
		<span class="tabular-nums">{lo}</span>
		<span class="tabular-nums">{hi}</span>
	</div>
	<div bind:this={track} class="relative h-2 rounded-full bg-gray-200 dark:bg-gray-700">
		<div
			class="absolute h-2 rounded-full bg-blue-600 dark:bg-blue-500"
			style:left={`${loPct}%`}
			style:width={`${Math.max(hiPct - loPct, 0)}%`}
		></div>
		<div
			role="slider"
			tabindex="0"
			class="absolute -top-1.5 size-5 -translate-x-1/2 cursor-grab rounded-full border border-gray-400 bg-white shadow active:cursor-grabbing dark:border-gray-500 dark:bg-gray-200"
			style:left={`${loPct}%`}
			aria-label={fromLabel}
			aria-valuemin={min}
			aria-valuemax={hi}
			aria-valuenow={lo}
			onpointerdown={(e) => startDrag('from', e)}
			onkeydown={(e) => {
				if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') nudge('from', -step);
				else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') nudge('from', step);
			}}
		></div>
		<div
			role="slider"
			tabindex="0"
			class="absolute -top-1.5 size-5 -translate-x-1/2 cursor-grab rounded-full border border-gray-400 bg-white shadow active:cursor-grabbing dark:border-gray-500 dark:bg-gray-200"
			style:left={`${hiPct}%`}
			aria-label={toLabel}
			aria-valuemin={lo}
			aria-valuemax={max}
			aria-valuenow={hi}
			onpointerdown={(e) => startDrag('to', e)}
			onkeydown={(e) => {
				if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') nudge('to', -step);
				else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') nudge('to', step);
			}}
		></div>
	</div>
</div>
