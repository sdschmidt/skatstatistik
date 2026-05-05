<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { toast } from '$lib/toast';

	type PlayerRow = { kuerzel: string; bommel: number; runden: number };
	type AllPlayer = { kuerzel: string; name: string | null };

	let {
		initialDatum,
		initialNotes = '',
		initialPhotoPath = null,
		initialPlayers = [{ kuerzel: '', bommel: 0, runden: 0 }],
		allPlayers,
		submitLabel = 'Speichern'
	}: {
		initialDatum: string;
		initialNotes?: string;
		initialPhotoPath?: string | null;
		initialPlayers?: PlayerRow[];
		allPlayers: AllPlayer[];
		submitLabel?: string;
	} = $props();

	// One-time snapshots: the parent doesn't mutate these for the lifetime of
	// the form, so we copy into local state and operate on the copy.
	// svelte-ignore state_referenced_locally
	let datum = $state(initialDatum);
	// svelte-ignore state_referenced_locally
	let notes = $state(initialNotes);
	// svelte-ignore state_referenced_locally
	let players = $state<PlayerRow[]>(initialPlayers.map((p) => ({ ...p })));
	let removePhoto = $state(false);
	let photoBlob = $state<Blob | null>(null);
	let photoPreview = $state<string | null>(null);
	let busy = $state(false);
	let formError = $state<string | null>(null);

	async function downscale(file: File, maxEdge = 2000): Promise<Blob> {
		const bitmap = await createImageBitmap(file);
		const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
		const w = Math.round(bitmap.width * scale);
		const h = Math.round(bitmap.height * scale);
		const canvas = document.createElement('canvas');
		canvas.width = w;
		canvas.height = h;
		canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h);
		return new Promise<Blob>((resolve, reject) =>
			canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/jpeg', 0.85)
		);
	}

	async function onPhotoChange(ev: Event) {
		const file = (ev.target as HTMLInputElement).files?.[0];
		if (!file) {
			photoBlob = null;
			photoPreview = null;
			return;
		}
		try {
			const b = await downscale(file);
			photoBlob = b;
			photoPreview = URL.createObjectURL(b);
			removePhoto = false;
		} catch {
			formError = 'Bild konnte nicht verarbeitet werden.';
		}
	}

	function addPlayer() {
		players = [...players, { kuerzel: '', bommel: 0, runden: 0 }];
	}
	function removePlayerAt(i: number) {
		players = players.filter((_, j) => j !== i);
	}
</script>

<form
	method="POST"
	enctype="multipart/form-data"
	use:enhance={({ formData, cancel }) => {
		formError = null;
		if (!datum) {
			formError = 'Datum erforderlich';
			cancel();
			return;
		}
		const trimmed = players
			.map((p) => ({ ...p, kuerzel: p.kuerzel.trim() }))
			.filter((p) => p.kuerzel !== '');
		if (trimmed.length === 0) {
			formError = 'Mindestens ein Spieler erforderlich';
			cancel();
			return;
		}
		for (const p of trimmed) {
			const b = Number(p.bommel);
			const r = Number(p.runden);
			if (!Number.isFinite(b) || !Number.isFinite(r) || b < 0 || r < 0) {
				formError = `Bei ${p.kuerzel}: Bommel und Runden müssen ≥ 0 sein.`;
				cancel();
				return;
			}
			if (b > r) {
				formError = `Bei ${p.kuerzel}: Bommel (${b}) darf nicht größer als Runden (${r}) sein.`;
				cancel();
				return;
			}
		}
		formData.set('datum', datum);
		formData.set('notes', notes);
		formData.set('players', JSON.stringify(trimmed));
		formData.set('removePhoto', removePhoto ? '1' : '');
		if (photoBlob) formData.set('photo', photoBlob, `${datum}.jpg`);
		busy = true;
		return async ({ result }) => {
			busy = false;
			if (result.type === 'redirect') {
				toast('Spieltag gespeichert');
				await goto(result.location);
			} else if (result.type === 'failure') {
				formError = (result.data as { error?: string })?.error ?? 'Fehler beim Speichern.';
				toast(formError, 'error');
			}
		};
	}}
>
	<div class="space-y-4">
		<div>
			<label for="datum" class="block text-sm font-medium">Datum</label>
			<input
				id="datum"
				type="date"
				required
				bind:value={datum}
				class="mt-1 rounded border border-gray-300 p-2 text-sm dark:border-gray-700 dark:bg-gray-800"
			/>
			{#if datum !== initialDatum}
				<p class="mt-1 text-xs text-amber-600 dark:text-amber-500">
					Datum wird geändert: <span class="font-mono">{initialDatum}</span> →
					<span class="font-mono">{datum}</span>
				</p>
			{/if}
		</div>

		<div>
			<span class="block text-sm font-medium">Foto (optional)</span>
			{#if initialPhotoPath && !photoPreview && !removePhoto}
				<div class="mt-1 flex items-end gap-3">
					<img
						src="/api/photos/{initialDatum}"
						alt="Spieltag {initialDatum}"
						class="h-32 rounded border border-gray-200"
					/>
					<button
						type="button"
						onclick={() => (removePhoto = true)}
						class="text-xs text-red-600 underline"
					>
						Foto entfernen
					</button>
				</div>
			{/if}
			{#if photoPreview}
				<img
					src={photoPreview}
					alt="Vorschau"
					class="mt-1 h-32 rounded border border-gray-200"
				/>
			{/if}
			<input
				type="file"
				accept="image/*"
				onchange={onPhotoChange}
				class="mt-1 block text-sm"
			/>
		</div>

		<div>
			<label for="notes" class="block text-sm font-medium">Notizen (optional)</label>
			<textarea
				id="notes"
				bind:value={notes}
				rows="2"
				class="mt-1 w-full rounded border border-gray-300 p-2 text-sm dark:border-gray-700 dark:bg-gray-800"
			></textarea>
		</div>

		<div>
			<div class="flex items-center justify-between">
				<span class="block text-sm font-medium">Spieler</span>
				<button
					type="button"
					onclick={addPlayer}
					class="text-xs text-blue-600 underline"
				>
					+ Spieler hinzufügen
				</button>
			</div>
			<table class="mt-2 w-full text-sm">
				<thead>
					<tr class="text-left text-gray-500">
						<th class="py-1 font-normal">Kürzel</th>
						<th class="font-normal">Bommel</th>
						<th class="font-normal">Runden</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{#each players as p, i (i)}
						<tr>
							<td class="py-1 pr-2">
								<input
									type="text"
									list="all-kuerzel"
									required
									autocomplete="off"
									bind:value={p.kuerzel}
									placeholder="z.B. AA"
									class="w-32 rounded border border-gray-300 p-1 uppercase dark:border-gray-700 dark:bg-gray-800"
								/>
							</td>
							<td class="pr-2">
								<input
									type="number"
									min="0"
									bind:value={p.bommel}
									class="w-20 rounded border border-gray-300 p-1 dark:border-gray-700 dark:bg-gray-800"
								/>
							</td>
							<td class="pr-2">
								<input
									type="number"
									min="0"
									bind:value={p.runden}
									class="w-20 rounded border border-gray-300 p-1 dark:border-gray-700 dark:bg-gray-800"
								/>
							</td>
							<td>
								<button
									type="button"
									onclick={() => removePlayerAt(i)}
									class="text-xs text-red-600 underline"
								>
									entfernen
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
			<datalist id="all-kuerzel">
				{#each allPlayers as p (p.kuerzel)}
					<option value={p.kuerzel}>{p.kuerzel}{p.name ? ' – ' + p.name : ''}</option>
				{/each}
			</datalist>
			<p class="mt-1 text-xs text-gray-500">
				Unbekannte Kürzel werden automatisch angelegt — den Namen kannst du
				später unter <a class="underline" href="/spieler">Spieler</a> ergänzen.
			</p>
		</div>

		{#if formError}
			<p class="text-sm text-red-600">{formError}</p>
		{/if}

		<button
			type="submit"
			disabled={busy}
			class="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
		>
			{busy ? 'Speichern…' : submitLabel}
		</button>
	</div>
</form>
