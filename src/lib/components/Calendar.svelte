<script lang="ts">
	// GitHub-activity-style yearly grid. One column per ISO week, 7 rows
	// (Mon–Sun). Each year is always rendered Jan 1 → Dec 31 regardless of
	// the data range — months without entries just appear as idle cells.
	//
	// Colour scales with `runden` for that day; days with a Spieltag the
	// player didn't play get a faint ring; idle days are blank.

	import { formatDate } from '$lib/format';

	type Entry = { datum: string; runden: number | null };
	type Props = {
		entries: Entry[];
		from?: string;
		to?: string;
		// Optional explicit maximum for colour scaling. Defaults to the largest
		// `runden` in `entries` (or 1 if all are null/0).
		maxValue?: number;
		// Make Spieltag cells <a href="/spieltage/[datum]">. On by default.
		linkSpieltage?: boolean;
	};

	let { entries, from, to, maxValue, linkSpieltage = true }: Props = $props();

	const MONTH_NAMES = [
		'Jan',
		'Feb',
		'Mär',
		'Apr',
		'Mai',
		'Jun',
		'Jul',
		'Aug',
		'Sep',
		'Okt',
		'Nov',
		'Dez'
	];

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

	// Years to render — derived from `from`/`to` if given, otherwise from the
	// entries themselves.
	const years = $derived.by(() => {
		const dates = entries.map((e) => e.datum).sort();
		const startIso = from ?? dates[0];
		const endIso = to ?? dates[dates.length - 1];
		if (!startIso || !endIso) return [new Date().getFullYear()];
		const startY = parseIso(startIso).getFullYear();
		const endY = parseIso(endIso).getFullYear();
		const out: number[] = [];
		for (let y = startY; y <= endY; y++) out.push(y);
		return out;
	});

	type Cell =
		| { kind: 'empty' }
		| { kind: 'day'; date: string; runden: number | null; isSpieltag: boolean };

	function yearCells(year: number): { cells: Cell[]; cols: number } {
		// Always Jan 1 → Dec 31.
		const start = new Date(year, 0, 1);
		const end = new Date(year, 11, 31);
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
		return { cells, cols: cells.length / 7 };
	}

	function monthLabels(year: number): { month: string; col: number }[] {
		const yearStart = new Date(year, 0, 1);
		const startWeekday = (yearStart.getDay() + 6) % 7;
		const out: { month: string; col: number }[] = [];
		for (let m = 0; m < 12; m++) {
			const first = new Date(year, m, 1);
			const days = Math.floor((first.getTime() - yearStart.getTime()) / 86400000);
			const col = Math.floor((days + startWeekday) / 7);
			out.push({ month: MONTH_NAMES[m], col });
		}
		return out;
	}

	const calMax = $derived(
		maxValue ?? Math.max(1, ...entries.map((e) => e.runden ?? 0))
	);

	function cellClass(c: Cell): string {
		if (c.kind === 'empty') return '';
		if (!c.isSpieltag) return 'bg-gray-100 dark:bg-gray-800';
		if (c.runden === null) {
			return 'bg-yellow-100 ring-1 ring-yellow-300 dark:bg-yellow-900 dark:ring-yellow-800';
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

<div class="space-y-4">
	{#each years as y (y)}
		{@const yc = yearCells(y)}
		{@const months = monthLabels(y)}
		<div>
			<div class="mb-1 text-xs text-gray-500 dark:text-gray-400">{y}</div>
			<div class="-mx-4 overflow-x-auto px-4">
				<div
					class="inline-grid gap-x-1 gap-y-[2px]"
					style="grid-template-columns: max-content auto;"
				>
					<!-- top-left corner -->
					<div></div>
					<!-- month labels row, 11px columns matching the cells below -->
					<div class="grid gap-[2px]" style="grid-template-columns: repeat({yc.cols}, 11px);">
						{#each months as ml (ml.month)}
							<span
								style="grid-column: {ml.col + 1};"
								class="text-[9px] whitespace-nowrap text-gray-400 dark:text-gray-500"
							>
								{ml.month}
							</span>
						{/each}
					</div>
					<!-- weekday labels (Mo at row 1, Mi row 3, Fr row 5) -->
					<div class="grid grid-rows-7 gap-[2px] pr-1 text-[9px] text-gray-400 dark:text-gray-500">
						<span>Mo</span>
						<span></span>
						<span>Mi</span>
						<span></span>
						<span>Fr</span>
						<span></span>
						<span></span>
					</div>
					<!-- cells -->
					<div
						class="grid grid-flow-col grid-rows-7 gap-[2px] p-[5px]"
						style="grid-template-columns: repeat({yc.cols}, 11px);"
					>
						{#each yc.cells as c, i (`${y}-${i}`)}
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
		</div>
	{/each}

	<div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] text-gray-500 dark:text-gray-400">
		<span class="inline-flex items-center gap-1.5">
			<span>weniger</span>
			<span class="size-[11px] rounded-sm bg-gray-100 dark:bg-gray-800"></span>
			<span class="size-[11px] rounded-sm bg-blue-200 dark:bg-blue-900"></span>
			<span class="size-[11px] rounded-sm bg-blue-400 dark:bg-blue-700"></span>
			<span class="size-[11px] rounded-sm bg-blue-600 dark:bg-blue-500"></span>
			<span class="size-[11px] rounded-sm bg-blue-800 dark:bg-blue-300"></span>
			<span>mehr Runden</span>
		</span>
		<span class="inline-flex items-center gap-1">
			<span class="size-[11px] rounded-sm bg-yellow-100 ring-1 ring-yellow-300 dark:bg-yellow-900 dark:ring-yellow-800"></span>
			Spieltag, nicht gespielt
		</span>
	</div>
</div>
