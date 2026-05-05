<script lang="ts">
	import { onMount } from 'svelte';

	let dark = $state(false);

	onMount(() => {
		dark = document.documentElement.classList.contains('dark');
	});

	function toggle() {
		dark = !dark;
		document.documentElement.classList.toggle('dark', dark);
		try {
			localStorage.setItem('theme', dark ? 'dark' : 'light');
		} catch {
			/* localStorage unavailable — accept loss of preference */
		}
	}
</script>

<button
	type="button"
	onclick={toggle}
	aria-label={dark ? 'Helles Theme' : 'Dunkles Theme'}
	title={dark ? 'Helles Theme' : 'Dunkles Theme'}
	class="rounded p-1.5 text-base hover:bg-gray-100 dark:hover:bg-gray-800"
>
	{dark ? '☀' : '☾'}
</button>
