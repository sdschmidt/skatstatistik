<script lang="ts">
	import { enhance } from '$app/forms';
	import { formatDate } from '$lib/format';

	let { data, form } = $props();

	function isoDay(d: Date | string): string {
		const date = typeof d === 'string' ? new Date(d) : d;
		const y = date.getFullYear();
		const m = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${y}-${m}-${day}`;
	}

	function badge(role: string): string {
		switch (role) {
			case 'admin':
				return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
			case 'user':
				return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
			default:
				return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200';
		}
	}
</script>

<div class="flex items-center justify-between">
	<h1 class="text-2xl font-semibold">Benutzer verwalten</h1>
	<span class="text-xs text-gray-500">{data.users.length}</span>
</div>

{#if form && 'error' in form && form.error}
	<p class="mt-3 text-sm text-red-600">{form.error}</p>
{/if}

<table class="mt-4 w-full text-sm">
	<thead>
		<tr class="border-b border-gray-200 text-left dark:border-gray-700">
			<th class="py-2 font-medium">Name</th>
			<th class="font-medium">E-Mail</th>
			<th class="font-medium">Seit</th>
			<th class="font-medium">Rolle</th>
			<th class="font-medium"></th>
		</tr>
	</thead>
	<tbody>
		{#each data.users as u (u.id)}
			<tr class="border-b border-gray-100 dark:border-gray-800">
				<td class="py-2">{u.name || '–'}</td>
				<td class="text-xs">{u.email}</td>
				<td class="text-xs tabular-nums text-gray-500">{formatDate(isoDay(u.createdAt))}</td>
				<td>
					<span class="rounded px-2 py-0.5 text-xs {badge(u.role)}">{u.role}</span>
				</td>
				<td>
					<form method="POST" action="?/setRole" use:enhance class="flex items-center gap-1">
						<input type="hidden" name="id" value={u.id} />
						<select
							name="role"
							class="rounded border border-gray-300 p-1 text-xs dark:border-gray-700 dark:bg-gray-800"
						>
							<option value="pending" selected={u.role === 'pending'}>pending</option>
							<option value="user" selected={u.role === 'user'}>user</option>
							<option value="admin" selected={u.role === 'admin'}>admin</option>
						</select>
						<button
							class="rounded border border-gray-300 px-2 py-1 text-xs hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800"
						>
							Speichern
						</button>
					</form>
				</td>
			</tr>
		{/each}
	</tbody>
</table>

<p class="mt-4 text-xs text-gray-500">
	Neue Konten landen als <code>pending</code>. Auf <code>user</code> setzen gibt Lese-Zugriff
	und das Anlegen neuer Spieltage frei. <code>admin</code> darf zusätzlich bearbeiten,
	löschen und Rollen vergeben.
</p>
