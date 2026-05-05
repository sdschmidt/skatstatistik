<script lang="ts">
	// GitHub-activity-style yearly grid. One column per ISO week, 7 rows
	// (Mon-Sun). Each cell is one day. Color scales with `runden` played
	// that day; days where there was a Spieltag but the player didn't show
	// up get a faint outline; idle days are blank.

	import { formatDate } from '$lib/format';

	type Entry = { datum: string; runden: number | null };
	type Props = {
		entries: Entry[];
		from?: string;
		to?: string;
		// Optional explicit maximum to scale the color buckets against. Defaults
		// to the largest `runden` in `entries` (or 1 if all are null/0).
		maxValue?: number;
		// When true (default), Spieltag cells are clickable links to the detail page.
		linkSpieltage?: boolean;
	};

	let { entries, from, to, maxValue, linkSpieltage = true }: Props = $props();

	function parseIso(s: string): Date {
		const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
		if (!m) return new Date(NaN);
		return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
	}
	function isoOf(d: Date): string {
		const y = d.getFullYear();
		const m = String(d.getMonth() + 1).padStart(2, '0');
		const day = String(d.getDate()).padStart(2, '0');
		return `${y}-${m}-${day}`;
	}

	const byDate = $derived(new Map(entries.map((e) => [e.datum, e.runden])));

	const range = $derived.by(() => {
		const dates = entries.map((e) => e.datum).sort();
		const startIso = from ?? dates[0];
		const endIso = to ?? dates[dates.length - 1];
		if (!startIso || !endIso) {
			const now = new Date();
			return { start: new Date(now.getFullYear(), 0, 1), end: new Date(now.getFullYear(), 11, 31) };
		}
		return { start: parseIso(startIso), end: parseIso(endIso) };
	});

	const years = $derived.by(() => {
		const out: number[] = [];
		for (let y = range.start.getFullYear(); y <= range.end.getFullYear(); y++) out.push(y);
		return out;
	});

	type Cell =
		| { kind: 'empty' }
		| { kind: 'day'; date: string; runden: number | null; isSpieltag: boolean };

	function yearCells(year: number): Cell[] {
		const rangeStart = range.start;
		const rangeEnd = range.end;
		const start = year === rangeStart.getFullYear() ? rangeStart : new Date(year, 0, 1);
		const end = year === rangeEnd.getFullYear() ? rangeEnd : new Date(year, 11, 31);
		const cells: Cell[] = [];
		const startWeekday = (start.getDay() + 6) % 7; // Mon=0
		for (let i = 0; i < startWeekday; i++) cells.push({ kind: 'empty' });
		const cur = new Date(start);
		while (cur <= end) {
			const iso = isoOf(cur);
			const isSpieltag = byDate.has(iso);
			const runden = byDate.get(iso) ?? null;
			cells.push({ kind: 'day', date: iso, runden, isSpieltag });
			cur.setDate(cur.getDate() + 1);
		}
		const endWeekday = (end.getDay() + 6) % 7;
		for (let i = endWeekday + 1; i < 7; i++) cells.push({ kind: 'empty' });
		return cells;
	}

	const calMax = $derived(
		maxValue ?? Math.max(1, ...entries.map((e) => e.runden ?? 0))
	);

	function cellClass(c: Cell): string {
		if (c.kind === 'empty') return '';
		if (!c.isSpieltag) return 'bg-gray-100 dark:bg-gray-800';
		if (c.runden === null) {
			// Spieltag happened but player didn't play
			return 'bg-gray-200 ring-1 ring-gray-300 dark:bg-gray-700 dark:ring-gray-600';
		}
		const r = c.runden;
		if (r <= 0) return 'bg-blue-50 dark:bg-blue-950';
		const t = r / calMax;
		if (t <= 0.3) return 'bg-blue-200 dark:bg-blue-900';
		if (t <= 0.6) return 'bg-blue-400 dark:bg-blue-700';
		if (t <= 0.85) return 'bg-blue-600 dark:bg-blue-500';
		return 'bg-blue-800 dark:bg-blue-300';
	}

	function tooltip(c: Cell): string {
		if (c.kind !== 'day') return '';
		if (!c.isSpieltag) return formatDate(c.date);
		if (c.runden === null) return `${formatDate(c.date)} · nicht gespielt`;
		return `${formatDate(c.date)} · ${c.runden} Runde${c.runden === 1 ? '' : 'n'}`;
	}
</script>

<div class="space-y-3">
	{#each years as y (y)}
		{@const cells = yearCells(y)}
		<div>
			<div class="mb-1 text-xs text-gray-500 dark:text-gray-400">{y}</div>
			<div class="flex gap-1">
				<div class="grid grid-rows-7 gap-[2px] pr-1 text-[9px] text-gray-400 dark:text-gray-500">
					<span></span>
					<span>Mo</span>
					<span></span>
					<span>Mi</span>
					<span></span>
					<span>Fr</span>
					<span></span>
				</div>
				<div
					class="grid grid-flow-col grid-rows-7 gap-[2px] overflow-x-auto"
					style="grid-auto-columns: 11px;"
				>
					{#each cells as c, i (`${y}-${i}`)}
						{#if c.kind === 'empty'}
							<div></div>
						{:else if c.isSpieltag && linkSpieltage}
							<a
								href="/spieltage/{c.date}"
								class="size-[11px] rounded-sm {cellClass(c)} transition hover:brightness-125 hover:outline hover:outline-1 hover:outline-gray-900 dark:hover:outline-gray-100"
								title={tooltip(c)}
							></a>
						{:else}
							<div class="size-[11px] rounded-sm {cellClass(c)}" title={tooltip(c)}></div>
						{/if}
					{/each}
				</div>
			</div>
		</div>
	{/each}

	<div class="mt-2 flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-gray-400">
		<span>weniger</span>
		<span class="size-[11px] rounded-sm bg-gray-100 dark:bg-gray-800"></span>
		<span class="size-[11px] rounded-sm bg-blue-200 dark:bg-blue-900"></span>
		<span class="size-[11px] rounded-sm bg-blue-400 dark:bg-blue-700"></span>
		<span class="size-[11px] rounded-sm bg-blue-600 dark:bg-blue-500"></span>
		<span class="size-[11px] rounded-sm bg-blue-800 dark:bg-blue-300"></span>
		<span>mehr Runden</span>
		<span class="ml-3 inline-flex items-center gap-1">
			<span class="size-[11px] rounded-sm bg-gray-200 ring-1 ring-gray-300 dark:bg-gray-700 dark:ring-gray-600"></span>
			Spieltag, nicht gespielt
		</span>
	</div>
</div>
