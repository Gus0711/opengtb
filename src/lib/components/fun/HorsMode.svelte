<script lang="ts">
	// Commutateur sur HORS : écran « automate à l'arrêt », puis tirage au sort
	// d'une scène de mode dégradé (gel ou gravité). Le bouton de remise en
	// service reste accessible en permanence ; Échap/Entrée aussi (FunLayer).
	import { onMount } from 'svelte';
	import { theme } from '$lib/stores/theme.svelte';
	import FreezeScene from './FreezeScene.svelte';
	import GravityScene from './GravityScene.svelte';

	const MESSAGE_MS = 3200;
	type Scene = 'gel' | 'gravite';

	let phase = $state<'message' | Scene>('message');
	let leaving = $state(false);

	onMount(() => {
		const scene: Scene = Math.random() < 0.5 ? 'gel' : 'gravite';
		const fade = setTimeout(() => (leaving = true), MESSAGE_MS - 400);
		const next = setTimeout(() => (phase = scene), MESSAGE_MS);
		return () => {
			clearTimeout(fade);
			clearTimeout(next);
		};
	});
</script>

{#if phase === 'message'}
	<div
		class="hors fixed inset-0 z-[80] flex flex-col items-center justify-center gap-6 bg-black px-6 text-center font-mono transition-opacity duration-400 {leaving
			? 'opacity-0'
			: ''}"
		role="alertdialog"
		aria-label="Site hors service"
	>
		<p class="text-red-signal text-xs tracking-[0.3em] uppercase">● Défaut général</p>
		<p class="text-2xl text-neutral-200 md:text-3xl">Automate à l'arrêt.</p>
		<p class="max-w-md text-sm text-neutral-500">
			Quelqu'un a mis le commutateur sur HORS. Aucune donnée ne remonte, plus rien n'est régulé…
		</p>
		<p class="text-amber text-xs">
			Bascule en mode dégradé<span class="dots"></span>
		</p>
	</div>
{:else if phase === 'gel'}
	<FreezeScene />
{:else}
	<GravityScene />
{/if}

<div class="fixed bottom-5 left-1/2 z-[85] -translate-x-1/2" role="group" aria-label="Site hors service">
	<button
		type="button"
		onclick={() => theme.restart()}
		class="border-primary bg-background text-primary hover:bg-primary hover:text-primary-foreground inline-flex items-center gap-2 rounded-sm border px-4 py-2 font-mono text-xs font-semibold shadow-lg transition-colors"
	>
		⏻ Remettre en service <span class="text-text-dim font-normal">(Échap)</span>
	</button>
</div>

<style>
	.hors {
		animation: power-off 0.45s ease-in;
	}
	.dots::after {
		content: '';
		animation: dots 1.2s steps(4) infinite;
	}
	@keyframes dots {
		0% {
			content: '';
		}
		25% {
			content: '.';
		}
		50% {
			content: '..';
		}
		75% {
			content: '...';
		}
	}
	@keyframes power-off {
		0% {
			opacity: 0;
			transform: scaleY(0.005);
		}
		60% {
			opacity: 1;
			transform: scaleY(0.005);
		}
		100% {
			transform: scaleY(1);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.hors {
			animation: none;
		}
	}
</style>
