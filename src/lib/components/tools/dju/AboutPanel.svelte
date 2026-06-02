<script lang="ts">
	import { DATA_METADATA } from '$lib/tools/dju/data';
	import type { StationData } from '$lib/tools/dju/types';
	import Info from '@lucide/svelte/icons/info';
	import Database from '@lucide/svelte/icons/database';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';
	import ExternalLink from '@lucide/svelte/icons/external-link';

	let { station }: { station: StationData | null } = $props();

	const generatedAt = $derived(new Date(DATA_METADATA.generatedAt));
	const ageDays = $derived.by(() => {
		const ms = Date.now() - generatedAt.getTime();
		return Math.round(ms / 86_400_000);
	});
</script>

<div class="border-line-soft bg-background/30 rounded-md border p-4">
	<header class="border-line-soft border-b pb-2.5">
		<h3 class="font-mono text-[12px] tracking-wide uppercase">
			<span class="text-text-dim">›</span>
			<span class="text-primary font-semibold">méthodologie & mise à jour</span>
		</h3>
	</header>

	<div class="mt-3 grid gap-4 lg:grid-cols-3">
		<!-- Source -->
		<div>
			<div class="text-text-soft mb-1.5 flex items-center gap-1.5 font-mono text-[10.5px] tracking-wide uppercase">
				<Database class="size-3" /> source
			</div>
			<p class="text-text-soft text-[12.5px] leading-relaxed">
				Données <a
					href="https://portail-api.meteofrance.fr/web/fr/api/DPClim"
					target="_blank"
					rel="noopener noreferrer"
					class="text-primary hover:underline"
				>
					Météo-France DPClim<ExternalLink class="ml-0.5 inline-block size-2.5" />
				</a> — relevés mensuels TM (température moyenne mensuelle) + NBTM (jours mesurés).
				Une à 3 stations par département, sélectionnées sur <code class="text-text-dim">posteOuvert</code>
				+ <code class="text-text-dim">typePoste ≤ 3</code>.
			</p>
		</div>

		<!-- Méthodologie -->
		<div>
			<div class="text-text-soft mb-1.5 flex items-center gap-1.5 font-mono text-[10.5px] tracking-wide uppercase">
				<Info class="size-3" /> calcul DJU
			</div>
			<p class="text-text-soft text-[12.5px] leading-relaxed">
				Approximation mensuelle :
				<code class="text-foreground block bg-card border-line-soft mt-1 rounded border px-2 py-1 font-mono text-[11px]">
					DJU<sub>mois</sub> = max(0, base − TM) × NBTM
				</code>
				Bases ajustables au-dessus (défaut 18 °C chauffage, 24 °C clim). Les <em>années incomplètes</em>
				(2026 partielle) sont exclues du calcul de moyenne, mais visibles dans le tableau et le graphe
				avec marqueur <span class="text-text-dim font-mono">·n/12</span>.
			</p>
		</div>

		<!-- Fraîcheur -->
		<div>
			<div class="text-text-soft mb-1.5 flex items-center gap-1.5 font-mono text-[10.5px] tracking-wide uppercase">
				<RefreshCw class="size-3" /> fraîcheur
			</div>
			<p class="text-text-soft text-[12.5px] leading-relaxed">
				Dernière mise à jour : <strong class="text-foreground"
					>{generatedAt.toLocaleDateString('fr-FR')}</strong
				>
				{#if ageDays > 0}
					<span class="text-text-dim">(il y a {ageDays} j)</span>
				{:else}
					<span class="text-text-dim">(aujourd'hui)</span>
				{/if}{#if station}
					· cette station : {new Date(station.updatedAt).toLocaleDateString('fr-FR')}{/if}.
				Données rafraîchies périodiquement depuis l'API Météo-France.
			</p>
		</div>
	</div>
</div>
