<script lang="ts">
	import { onMount } from 'svelte';
	import { Moon, Sun, SunMoon } from 'lucide-svelte';

	type Theme = 'system' | 'dark' | 'light';

	let theme = $state<Theme>('system');

	function applyDark(dark: boolean) {
		document.documentElement.classList.toggle('dark', dark);
	}
	function isDarkFor(t: Theme): boolean {
		if (t === 'dark') return true;
		if (t === 'light') return false;
		return window.matchMedia('(prefers-color-scheme: dark)').matches;
	}

	onMount(() => {
		const stored = localStorage.getItem('theme');
		theme = stored === 'dark' || stored === 'light' ? stored : 'system';
		applyDark(isDarkFor(theme));

		const mql = window.matchMedia('(prefers-color-scheme: dark)');
		const onChange = () => {
			if (theme === 'system') applyDark(isDarkFor('system'));
		};
		mql.addEventListener('change', onChange);
		return () => mql.removeEventListener('change', onChange);
	});

	function cycle() {
		theme = theme === 'system' ? 'dark' : theme === 'dark' ? 'light' : 'system';
		try {
			localStorage.setItem('theme', theme);
		} catch {
			/* localStorage unavailable */
		}
		applyDark(isDarkFor(theme));
	}

	const Icon = $derived(theme === 'dark' ? Moon : theme === 'light' ? Sun : SunMoon);
	const label = $derived(
		theme === 'dark' ? 'Dunkel' : theme === 'light' ? 'Hell' : 'System'
	);
</script>

<button
	type="button"
	onclick={cycle}
	aria-label="Theme: {label}"
	title="Theme: {label} (klicken zum Wechseln)"
	class="rounded p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800"
>
	<Icon class="size-5" />
</button>
