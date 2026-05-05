<script lang="ts">
	import { fly } from 'svelte/transition';
	import { CheckCircle2, AlertCircle, Info, X } from 'lucide-svelte';
	import { toasts, dismiss, type ToastKind } from '$lib/toast';

	function bg(kind: ToastKind): string {
		switch (kind) {
			case 'success':
				return 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-200';
			case 'error':
				return 'border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-700 dark:bg-rose-950 dark:text-rose-200';
			default:
				return 'border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-200';
		}
	}
</script>

<div class="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-6">
	{#each $toasts as t (t.id)}
		<div
			in:fly={{ y: 20, duration: 200 }}
			out:fly={{ y: 20, duration: 150 }}
			class="pointer-events-auto flex max-w-md items-start gap-2 rounded border px-3 py-2 text-sm shadow {bg(t.kind)}"
		>
			{#if t.kind === 'success'}
				<CheckCircle2 class="mt-0.5 size-4 shrink-0" />
			{:else if t.kind === 'error'}
				<AlertCircle class="mt-0.5 size-4 shrink-0" />
			{:else}
				<Info class="mt-0.5 size-4 shrink-0" />
			{/if}
			<span class="flex-1">{t.text}</span>
			<button
				type="button"
				onclick={() => dismiss(t.id)}
				class="rounded p-0.5 opacity-60 hover:opacity-100"
				aria-label="Schließen"
			>
				<X class="size-3.5" />
			</button>
		</div>
	{/each}
</div>
