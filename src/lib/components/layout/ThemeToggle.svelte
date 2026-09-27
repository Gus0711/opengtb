<script lang="ts">
	// Commutateur de thème façon façade d'armoire : AUTO / MANU / HORS.
	// AUTO suit le système ; MANU force le thème — cliquer sur MANU bascule
	// toujours clair ⇄ sombre, pour qu'il se passe quelque chose de visible.
	import { theme, type ThemeMode } from '$lib/stores/theme.svelte';
	import { fun } from '$lib/fun/fun.svelte';

	const POSITIONS: { mode: ThemeMode; label: string; title: string }[] = [
		{ mode: 'auto', label: 'AUTO', title: 'Suivre le thème du système' },
		{ mode: 'manu', label: 'MANU', title: 'Forcer le thème — chaque clic bascule clair/sombre' },
		{ mode: 'hors', label: 'HORS', title: 'Mettre le site hors service' }
	];

	const name = (t: 'dark' | 'light') => (t === 'dark' ? 'sombre' : 'clair');
	const icon = (t: 'dark' | 'light') => (t === 'dark' ? '☾' : '☀');

	function select(mode: ThemeMode) {
		if (mode === 'manu') {
			theme.toggle();
			fun.toast(`MANU — thème ${name(theme.current)} forcé. Reclique pour basculer.`);
		} else if (mode === 'auto') {
			if (theme.mode === 'auto') return;
			theme.setMode('auto');
			fun.toast(`AUTO — le thème suit ton système (actuellement ${name(theme.current)}).`);
		} else {
			theme.setMode('hors');
		}
	}
</script>

<div
	role="radiogroup"
	aria-label="Commutateur de thème"
	class="border-border inline-flex items-stretch border font-mono text-[10.5px]"
>
	{#each POSITIONS as p, i (p.mode)}
		{@const active = theme.mode === p.mode}
		<button
			type="button"
			role="radio"
			aria-checked={active}
			title={p.title}
			onclick={() => select(p.mode)}
			class="px-2 py-1.5 tracking-wide transition-colors {i > 0 ? 'border-border border-l' : ''} {active
				? p.mode === 'hors'
					? 'bg-red-signal/15 text-red-signal'
					: 'bg-accent-glow text-primary'
				: 'text-text-dim hover:text-foreground'}"
		>
			{p.label}{#if active && p.mode !== 'hors'}<span class="ml-1" aria-hidden="true"
					>{icon(theme.current)}</span
				>{/if}
		</button>
	{/each}
</div>
