<script lang="ts">
	// Couche globale des easter eggs : raccourcis du terminal, code Konami
	// (mode rétro), notifications, écran « HORS » et message dans la console.
	import { onMount } from 'svelte';
	import { theme } from '$lib/stores/theme.svelte';
	import { fun } from '$lib/fun/fun.svelte';
	import Terminal from './Terminal.svelte';
	import HorsMode from './HorsMode.svelte';

	const KONAMI = [
		'ArrowUp',
		'ArrowUp',
		'ArrowDown',
		'ArrowDown',
		'ArrowLeft',
		'ArrowRight',
		'ArrowLeft',
		'ArrowRight',
		'b',
		'a'
	];
	let konamiPos = 0;

	const isEditable = (el: EventTarget | null) =>
		el instanceof HTMLElement &&
		(el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));

	function onKeydown(e: KeyboardEvent) {
		// Konami : suivi même hors champ de saisie uniquement.
		if (!isEditable(e.target)) {
			const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
			konamiPos = key === KONAMI[konamiPos] ? konamiPos + 1 : key === KONAMI[0] ? 1 : 0;
			if (konamiPos === KONAMI.length) {
				konamiPos = 0;
				fun.toggleRetro();
			}
		}

		if (theme.mode === 'hors' && (e.key === 'Escape' || e.key === 'Enter')) {
			theme.restart();
			return;
		}

		const ctrlK = e.key.toLowerCase() === 'k' && (e.ctrlKey || e.metaKey);
		if (ctrlK || (e.key === '`' && !isEditable(e.target))) {
			e.preventDefault();
			fun.terminalOpen = !fun.terminalOpen;
		}
	}

	$effect(() => {
		document.documentElement.classList.toggle('retro', fun.retro);
	});

	onMount(() => {
		const style = 'color:#6ce26c;font-family:monospace';
		console.log(
			`%c
  ┌────────────────────────────────────┐
  │   ─╮╭╯─   open/gtb                 │
  │    ╰╯     la boîte à outils GTB    │
  │           $ gtb --status  ● OK     │
  └────────────────────────────────────┘
`,
			style
		);
		console.log(
			'%cSalut l’intégrateur·rice curieux·se 👋\n' +
				'Tu cherches les registres Modbus ? Ils sont dans /outils/modbus, pas ici 😉\n' +
				'Envie de contribuer ou une idée d’outil ? → /messages\n' +
				'Astuce : appuie sur ` (ou Ctrl+K) pour ouvrir le terminal.',
			'color:#b3bfc8;font-family:monospace;line-height:1.6'
		);
	});
</script>

<svelte:window onkeydown={onKeydown} />

<Terminal />

{#if fun.toasts.length}
	<div class="pointer-events-none fixed top-20 right-4 z-[70] flex flex-col items-end gap-2" aria-live="polite">
		{#each fun.toasts as t (t.id)}
			<div
				class="toast border-primary bg-card text-foreground max-w-xs border-l-2 px-4 py-2.5 font-mono text-xs shadow-lg"
			>
				<span class="text-primary">●</span>
				{t.text}
			</div>
		{/each}
	</div>
{/if}

{#if theme.mode === 'hors'}
	<HorsMode />
{/if}

<style>
	.toast {
		animation: toast-in 0.25s ease-out;
	}
	@keyframes toast-in {
		from {
			opacity: 0;
			transform: translateX(12px);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.toast {
			animation: none;
		}
	}
</style>
