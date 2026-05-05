// ISO date string ("2024-05-20") → German display ("20.05.2024").
export function formatDate(iso: string): string {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
	return m ? `${m[3]}.${m[2]}.${m[1]}` : iso;
}

// "2024-05-20" → "Montag, 20.05.2024". Anchored to noon to dodge any DST edge
// where new Date('2024-05-20') would interpret as UTC midnight and shift back.
export function formatLongDate(iso: string): string {
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
	if (!m) return iso;
	const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
	const weekday = d.toLocaleDateString('de-DE', { weekday: 'long' });
	return `${weekday}, ${formatDate(iso)}`;
}

export function todayIso(): string {
	const d = new Date();
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${y}-${m}-${day}`;
}

export function formatPercent(value: number | string | null, digits = 1): string {
	if (value === null || value === undefined) return '–';
	const n = typeof value === 'string' ? parseFloat(value) : value;
	if (!Number.isFinite(n)) return '–';
	return `${(n * 100).toFixed(digits)} %`;
}

export function formatNumber(value: number | string | null, digits = 0): string {
	if (value === null || value === undefined) return '–';
	const n = typeof value === 'string' ? parseFloat(value) : value;
	if (!Number.isFinite(n)) return '–';
	return n.toFixed(digits);
}
