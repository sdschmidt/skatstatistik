import { goto } from '$app/navigation';

// Table-row click navigation. The CSS card-link pattern (`<tr class="relative">`
// + `before:absolute before:inset-0`) is unreliable on iOS Safari: Safari
// doesn't treat `position: relative` on `<tr>` as a containing block, so every
// row's ::before ends up sized against the body. The last row's pseudo-element
// then covers the page and steals all taps. Using a JS click handler avoids
// the CSS layering issue entirely; semantic `<a>` elements (pill, date) inside
// the row still handle direct clicks, middle-click, and keyboard nav.
export function rowGoto(href: string) {
	return (e: MouseEvent) => {
		// Ignore non-primary buttons and modifier-clicks so middle/right-click and
		// cmd/ctrl+click open in new tab via the visible <a> elements.
		if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
		const target = e.target as HTMLElement | null;
		if (target?.closest('a, button, input, label, form, [role="button"]')) return;
		goto(href);
	};
}
