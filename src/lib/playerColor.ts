// Per-player display colour. Deterministically derived from the kürzel — there
// is no per-player override. Used by Avatar pills and Statistik chart bars.

// Slots are walked through the Tailwind 600 hue wheel in steps of 5 (coprime
// with 16) instead of 1, so kürzels that hash to adjacent slots land on
// far-apart hues. djb2 with `(h * 33) ^ char` collapses to "XOR all chars
// mod 16" because 33 ≡ 1 (mod 16), so two-letter kürzels differing in one
// letter always land on adjacent slots — this scattering hides that.
export const PALETTE = [
	'#dc2626', // red
	'#16a34a', // green
	'#2563eb', // blue
	'#db2777', // pink
	'#65a30d', // lime
	'#0284c7', // sky
	'#c026d3', // fuchsia
	'#ca8a04', // yellow
	'#0891b2', // cyan
	'#9333ea', // purple
	'#d97706', // amber
	'#0d9488', // teal
	'#7c3aed', // violet
	'#ea580c', // orange
	'#059669', // emerald
	'#4f46e5' // indigo
];

export function paletteFor(kuerzel: string): string {
	let h = 5381;
	for (let i = 0; i < kuerzel.length; i++) h = (h * 33) ^ kuerzel.charCodeAt(i);
	return PALETTE[Math.abs(h) % PALETTE.length];
}

// White text doesn't read on the lighter palette entries (yellow, beige, mint…)
// so Avatar picks foreground based on the YIQ-style brightness of the bg.
export function textOn(bg: string): '#111' | '#fff' {
	const hex = bg.startsWith('#') ? bg.slice(1) : bg;
	const r = parseInt(hex.slice(0, 2), 16);
	const g = parseInt(hex.slice(2, 4), 16);
	const b = parseInt(hex.slice(4, 6), 16);
	const y = (r * 299 + g * 587 + b * 114) / 1000;
	return y > 145 ? '#111' : '#fff';
}
