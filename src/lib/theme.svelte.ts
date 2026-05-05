import { browser } from '$app/environment';

// Reactive view of "is the .dark class on <html>?" — components can read
// `theme.isDark` and use it as a key in `{#key …}` blocks to force remounts
// of children that don't react to theme changes on their own (ApexCharts).
export const theme = $state({ isDark: false });

if (browser) {
	theme.isDark = document.documentElement.classList.contains('dark');
	const obs = new MutationObserver(() => {
		const next = document.documentElement.classList.contains('dark');
		if (next !== theme.isDark) theme.isDark = next;
	});
	obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
}
