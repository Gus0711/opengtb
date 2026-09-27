<script lang="ts">
	// Page d'erreur façon journal d'alarmes de supervision.
	// 404 → « défaut communication (U4) », le reste → « défaut interne ».
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import SeoHead from '$lib/seo/SeoHead.svelte';
	import { buildMeta } from '$lib/seo/meta';

	const notFound = $derived(page.status === 404);
	const meta = $derived(
		buildMeta({
			title: notFound ? 'Page introuvable' : 'Erreur',
			description: 'Alarme critique : ce point ne remonte plus.'
		})
	);

	const DATE_FMT = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'medium' });
	const now = DATE_FMT.format(new Date());

	let acked = $state(false);

	async function acknowledge() {
		acked = true;
		await new Promise((r) => setTimeout(r, 600));
		goto('/');
	}

	// Trend plat : le point est mort depuis « un moment ».
	const W = 600;
	const H = 120;
	const drop = `M0,${H * 0.45} C60,${H * 0.4} 120,${H * 0.5} 180,${H * 0.42} S300,${H * 0.48} ${W * 0.55},${H * 0.44}`;
</script>

<SeoHead {meta} />

<section class="mx-auto max-w-3xl px-5 pt-10 pb-16 md:px-7">
	<p class="text-text-dim font-mono text-xs">$ gtb alarms --active</p>

	<div class="border-red-signal/60 bg-card mt-4 border-l-4 px-5 py-4">
		<p class="text-red-signal flex items-center gap-2 font-mono text-xs font-semibold tracking-[0.2em] uppercase">
			<span class="relative flex h-2.5 w-2.5">
				{#if !acked}
					<span class="bg-red-signal absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"></span>
				{/if}
				<span class="bg-red-signal relative inline-flex h-2.5 w-2.5 rounded-full"></span>
			</span>
			{acked ? 'Alarme acquittée' : 'Alarme critique'} · {page.status}
		</p>
		<h1 class="mt-2 text-2xl font-semibold md:text-3xl">
			{notFound ? 'Ce point ne remonte plus.' : 'Défaut interne de l’automate.'}
		</h1>
		<p class="text-text-soft mt-2 text-sm">
			{#if notFound}
				La page demandée ne répond pas. Soit elle n'a jamais existé, soit quelqu'un a débranché le bus
				pendant la pause café.
			{:else}
				{page.error?.message ?? 'Quelque chose a planté.'} On a probablement oublié une résistance de
				terminaison quelque part.
			{/if}
		</p>
	</div>

	<div class="border-border mt-6 overflow-x-auto border">
		<table class="w-full min-w-[520px] font-mono text-xs">
			<thead class="bg-card text-text-dim text-left">
				<tr>
					<th class="px-3 py-2 font-normal">horodatage</th>
					<th class="px-3 py-2 font-normal">point</th>
					<th class="px-3 py-2 font-normal">état</th>
					<th class="px-3 py-2 font-normal">prio</th>
				</tr>
			</thead>
			<tbody>
				<tr class="border-border border-t">
					<td class="text-text-soft px-3 py-2">{now}</td>
					<td class="text-foreground px-3 py-2 break-all">{page.url.pathname}</td>
					<td class="text-red-signal px-3 py-2">
						{notFound ? 'Défaut com. (U4)' : `Erreur ${page.status}`}
					</td>
					<td class="text-red-signal px-3 py-2">1</td>
				</tr>
				<tr class="border-border border-t">
					<td class="text-text-dim px-3 py-2">—</td>
					<td class="text-text-dim px-3 py-2">valeur actuelle</td>
					<td class="text-text-dim px-3 py-2" colspan="2">NaN · qualité : bad</td>
				</tr>
			</tbody>
		</table>
	</div>

	<figure class="border-border bg-card mt-6 border p-4">
		<figcaption class="text-text-dim mb-2 font-mono text-[11px]">trend · {page.url.pathname}</figcaption>
		<svg viewBox="0 0 {W} {H}" class="h-28 w-full" preserveAspectRatio="none" aria-hidden="true">
			<line x1="0" x2={W} y1={H - 18} y2={H - 18} class="stroke-border" stroke-width="1" />
			<path d={drop} fill="none" class="stroke-primary" stroke-width="2" vector-effect="non-scaling-stroke" />
			<line
				x1={W * 0.55}
				x2={W * 0.55}
				y1={H * 0.44}
				y2={H - 18}
				class="stroke-red-signal"
				stroke-width="2"
				stroke-dasharray="3 3"
				vector-effect="non-scaling-stroke"
			/>
			<path
				d="M{W * 0.55},{H - 18} L{W},{H - 18}"
				fill="none"
				class="stroke-red-signal"
				stroke-width="2"
				vector-effect="non-scaling-stroke"
			/>
		</svg>
		<p class="text-text-dim mt-1 font-mono text-[11px]">↑ perte de communication · plus aucune valeur depuis</p>
	</figure>

	<div class="mt-8 flex flex-wrap items-center gap-4">
		<button
			type="button"
			onclick={acknowledge}
			disabled={acked}
			class="border-red-signal text-red-signal hover:bg-red-signal hover:text-background inline-flex items-center rounded-sm border px-4 py-2 font-mono text-[12.5px] font-semibold transition-colors disabled:opacity-60"
		>
			{acked ? 'Acquitté ✓ retour à l’accueil…' : '[ Acquitter ]'}
		</button>
		<a href="/outils" class="text-text-soft hover:text-primary font-mono text-xs">$ gtb ls outils →</a>
	</div>
</section>
