import { writable } from 'svelte/store';

export type ToastKind = 'success' | 'error' | 'info';
export type Toast = { id: number; kind: ToastKind; text: string };

let counter = 0;
const _store = writable<Toast[]>([]);
export const toasts = { subscribe: _store.subscribe };

export function toast(text: string, kind: ToastKind = 'success', ttlMs = 3000): void {
	const id = ++counter;
	_store.update((arr) => [...arr, { id, kind, text }]);
	setTimeout(() => dismiss(id), ttlMs);
}

export function dismiss(id: number): void {
	_store.update((arr) => arr.filter((t) => t.id !== id));
}
