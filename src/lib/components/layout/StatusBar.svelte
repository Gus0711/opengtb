<script lang="ts">
	// Barre d'état façon bandeau de supervision, en pied de page.
	// Uptime réel depuis la mise en ligne ; la « T° baie » est une marche
	// aléatoire pour le folklore. Rien n'est rendu côté serveur pour les
	// valeurs qui bougent (pas d'écart à l'hydratation).
	import { onMount } from 'svelte';
	import { builtTools, internalTools } from '$lib/tools/registry';
	import { formatUptime } from '$lib/fun/terminal';
	import { fun } from '$lib/fun/fun.svelte';

	const online = builtTools().length;
	const total = internalTools().length;

	let now = $state<Date | null>(null);
	let temp = $state(21.3);

	onMount(() => {
		now = new Date();
		const clock = setInterval(() => (now = new Date()), 1000);
		const drift = setInterval(() => {
			temp = Math.min(23.4, Math.max(20.2, temp + (Math.random() - 0.5) * 0.3));
		}, 3000);
		return () => {
			clearInterval(clock);
			clearInterval(drift);
		};
	});
</script>

<div class="border-border bg-card border-t">
	<div
		class="text-text-dim mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-1 px-5 py-2 font-mono text-[11px] md:px-7"
	>
		<span class="text-primary inline-flex items-center gap-1.5">
			<span class="relative flex h-1.5 w-1.5">
				<span class="bg-primary absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"></span>
				<span class="bg-primary relative inline-flex h-1.5 w-1.5 rounded-full"></span>
			</span>
			SYS OK
		</span>
		<span><span class="text-text-soft">{online}/{total}</span> outils en ligne</span>
		<span>uptime <span class="text-text-soft tabular-nums">{now ? formatUptime(now) : '—'}</span></span>
		<span title="Valeur purement décorative 😄"
			>T° baie <span class="text-text-soft tabular-nums">{temp.toFixed(1).replace('.', ',')} °C</span></span
		>
		<button
			type="button"
			onclick={() => (fun.terminalOpen = true)}
			class="hover:text-primary ml-auto transition-colors"
			title="Ouvrir le terminal (touche ` ou Ctrl+K)"
		>
			<span class="border-border rounded-[2px] border px-1">`</span> terminal
		</button>
	</div>
</div>
