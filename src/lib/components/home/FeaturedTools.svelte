<script lang="ts">
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import { getTool } from '$lib/tools/registry';
	import type { Tool, SectorSlug } from '$lib/tools/types';

	const SECTOR_LABEL: Record<SectorSlug, string> = {
		'briques-techniques': 'briques techniques',
		reglementaire: 'réglementaire',
		dimensionnement: 'dimensionnement',
		referentiels: 'référentiels',
		commissioning: 'commissioning'
	};

	const FEATURED_SLUGS = ['decode', 'loi-eau', 'v3v'] as const;
	// Garde-fou : on ne référence jamais un outil non implémenté (status !== 'done')
	// — sinon le lien casse le prerender.
	const featured: Tool[] = FEATURED_SLUGS.map(getTool).filter(
		(t): t is Tool => !!t && !t.external && t.status === 'done'
	);
</script>

<section id="featured" class="mx-auto max-w-5xl px-5 pt-20 pb-2 md:px-7">
	<div
		class="border-border mb-6 flex items-baseline justify-between gap-6 border-b pb-3.5 max-sm:flex-col max-sm:items-start"
	>
		<div class="flex items-center gap-3">
			<Sparkles class="text-amber size-[18px] shrink-0" aria-hidden="true" />
			<h2
				class="m-0 text-[clamp(22px,2.4vw,28px)] font-bold tracking-[-0.015em]"
			>
				Têtes d'affiche
				<span class="text-text-dim font-normal">— les trois ouverts chaque semaine.</span>
			</h2>
		</div>
		<a
			class="text-text-soft border-line-strong hover:text-primary hover:border-primary border-b pb-px font-mono text-[12.5px] transition-colors"
			href="/outils"
		>
			voir les 12 outils →
		</a>
	</div>

	<div
		class="border-border flex snap-x snap-mandatory overflow-x-auto border-y md:snap-none md:overflow-x-visible md:border-l"
	>
		{#each featured as tool (tool.slug)}
			<a
				href="/outils/{tool.slug}"
				class="group bg-card/40 hover:bg-card border-border relative block flex-shrink-0 basis-[88%] snap-start border-r px-5 py-6 transition-colors last:border-r-0 md:flex-1 md:basis-0 md:px-6 md:py-6"
			>
				<span
					class="bg-primary absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 transition-transform duration-200 group-hover:scale-x-100"
					aria-hidden="true"
				></span>
				<div class="text-amber-dim mb-4 font-mono text-[11px] tracking-wider">
					// {SECTOR_LABEL[tool.sector]}
				</div>
				<h3 class="mb-1.5 text-[22px] font-bold tracking-[-0.01em]">
					gtb <b class="text-primary font-bold">{tool.name}</b>
				</h3>
				<div class="text-text-soft mb-3.5 text-[15px] font-medium">{tool.title}.</div>
				<p class="text-text-soft m-0 text-[14.5px] leading-[1.55]">{tool.description}</p>
				<div class="text-primary mt-4 inline-flex items-center gap-1 font-mono text-xs">
					ouvrir <span class="transition-transform group-hover:translate-x-1">→</span>
				</div>
			</a>
		{/each}
	</div>
</section>
