<script lang="ts">
	import { paletteFor, textOn } from '$lib/playerColor';

	type Props = {
		kuerzel: string;
		// Height of the pill in px; horizontal padding adapts so longer kürzel
		// (e.g. "MT2", "HE2") aren't truncated.
		size?: number;
	};
	let { kuerzel, size = 24 }: Props = $props();

	const bg = $derived(paletteFor(kuerzel));
	const fg = $derived(textOn(bg));
	const fontSize = $derived(Math.round(size * 0.46));
	const padX = $derived(Math.round(size * 0.4));
</script>

<span
	class="inline-flex items-center justify-center rounded-full font-mono font-medium tracking-wide shadow-sm select-none"
	style:background-color={bg}
	style:color={fg}
	style:height="{size}px"
	style:padding-left="{padX}px"
	style:padding-right="{padX}px"
	style:font-size="{fontSize}px"
	title={kuerzel}
>
	{kuerzel}
</span>
