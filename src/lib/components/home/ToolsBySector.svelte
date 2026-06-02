<script lang="ts">
	import LayoutGrid from '@lucide/svelte/icons/layout-grid';
	import { SECTORS, toolsBySector } from '$lib/tools/registry';
	import type { Sector } from '$lib/tools/types';
	import Tag from '$lib/components/ui/Tag.svelte';

	// La maquette regroupe les secteurs 04 + 05 dans la même colonne :
	// rangée 1 → [01, 02], rangée 2 → [03 (pleine largeur)], rangée 3 → [04, 05].
	const by = Object.fromEntries(SECTORS.map((s) => [s.slug, s]));
	const ROW_1: Sector[] = [by['briques-techniques'], by['reglementaire']].filter(Boolean);
	const ROW_3: Sector[] = [by['referentiels'], by['commissioning']].filter(Boolean);
	const DIMENSIONNEMENT: Sector | undefined = by['dimensionnement'];
</script>

<section id="tools" class="mx-auto max-w-5xl px-5 pt-20 pb-2 md:px-7">
	<div class="border-border mb-6 flex items-center gap-3 border-b pb-3.5">
		<LayoutGrid class="text-amber size-[18px] shrink-0" aria-hidden="true" />
		<h2 class="m-0 text-[clamp(22px,2.4vw,28px)] font-bold tracking-[-0.015em]">
			Tous les outils
			<span class="text-text-dim font-normal">— 12 modules, 5 secteurs.</span>
		</h2>
	</div>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		{#snippet sectorCard(sector: Sector, fullWidth: boolean = false)}
			{@const tools = toolsBySector(sector.slug)}
			{@const SectorIcon = sector.icon}
			<div
				class="bg-card/60 hover:border-line-strong border-border relative overflow-hidden rounded border px-5 pt-5 pb-2 transition-colors"
				class:md:col-span-2={fullWidth}
			>
				<span
					aria-hidden="true"
					class="text-amber pointer-events-none absolute -top-5 -right-2 font-mono text-[120px] leading-none font-bold tracking-[-0.04em] opacity-[0.05] select-none"
				>
					{sector.number}
				</span>

				<div
					class="border-border relative mb-1 flex items-center gap-2.5 border-b pb-3.5"
				>
					<span
						class="border-primary/40 bg-accent-glow text-primary inline-flex size-7 shrink-0 items-center justify-center rounded-[3px] border"
					>
						<SectorIcon class="size-[15px]" />
					</span>
					<span class="text-foreground text-[15px] font-semibold tracking-[-0.005em]">
						{sector.name}
					</span>
					<span class="text-primary ml-auto font-mono text-[11px] font-medium">
						{tools.length} {tools.length > 1 ? 'outils' : 'outil'}
					</span>
				</div>

				<div
					class="relative"
					class:md:grid={fullWidth}
					class:md:grid-cols-2={fullWidth}
					class:md:gap-x-7={fullWidth}
				>
					{#each tools as tool, i (tool.slug)}
						{@const Icon = tool.icon}
						{@const isLast = i === tools.length - 1}
						{@const isTodo = tool.status === 'todo'}
						{#if isTodo}
							<div
								aria-disabled="true"
								class="
									border-line-soft grid cursor-not-allowed grid-cols-[18px_1fr_14px] items-start gap-3.5 py-3.5
									opacity-55
									{isLast ? 'border-b-0' : 'border-b'}
								"
							>
								<Icon class="text-amber/40 mt-[2px] size-[18px]" />
								<div class="min-w-0">
									<div
										class="text-text-soft flex flex-wrap items-baseline gap-2 text-[14.5px] leading-tight font-medium"
									>
										<span>{tool.name}</span>
										<span
											class="border-line-strong text-text-dim rounded-sm border border-dashed px-1.5 py-px font-mono text-[10px] tracking-[0.08em] uppercase"
										>
											à venir
										</span>
									</div>
									<div class="text-text-dim mt-1 text-[13px] leading-[1.5]">
										{tool.description}
									</div>
									{#if tool.tags.length > 0}
										<div class="mt-2 flex flex-wrap gap-1">
											{#each tool.tags as tag (tag)}
												<Tag>{tag}</Tag>
											{/each}
										</div>
									{/if}
								</div>
								<span class="text-text-dim mt-[2px] self-start text-[13px]">·</span>
							</div>
						{:else}
							<a
								href={tool.external ?? `/outils/${tool.slug}`}
								rel={tool.external ? 'noopener noreferrer' : undefined}
								target={tool.external ? '_blank' : undefined}
								class="
									group border-line-soft relative grid grid-cols-[18px_1fr_14px] items-start gap-3.5 py-3.5
									transition-[padding] duration-150
									hover:pl-2 focus-visible:pl-2 focus-visible:outline-none
									before:bg-primary before:absolute before:top-0 before:bottom-0 before:-left-5 before:w-0.5 before:opacity-0 before:transition-opacity
									hover:before:opacity-100 focus-visible:before:opacity-100
									{isLast ? 'border-b-0' : 'border-b'}
								"
							>
								<Icon
									class="text-amber group-hover:text-amber group-focus-visible:text-amber mt-[2px] size-[18px] transition-[filter] group-hover:[filter:brightness(1.15)] group-focus-visible:[filter:brightness(1.15)]"
								/>

								<div class="min-w-0">
									<div
										class="group-hover:text-primary group-focus-visible:text-primary text-[14.5px] leading-tight font-medium transition-colors"
									>
										{tool.name}{#if tool.external}<span class="text-amber ml-1.5 font-mono text-[11px]"
												>↗</span
											>{/if}
									</div>
									<div class="text-text-soft mt-1 text-[13px] leading-[1.45]">
										{tool.description}
									</div>
									{#if tool.tags.length > 0}
										<div class="mt-2 flex flex-wrap gap-1">
											{#each tool.tags as tag (tag)}
												<Tag>{tag}</Tag>
											{/each}
										</div>
									{/if}
								</div>

								<span
									class="text-primary mt-[2px] self-start font-mono text-[14px] transition-transform group-hover:translate-x-1 group-focus-visible:translate-x-1"
								>
									{tool.external ? '↗' : '→'}
								</span>
							</a>
						{/if}
					{/each}
				</div>
			</div>
		{/snippet}

		{#each ROW_1 as sector (sector.slug)}
			{@render sectorCard(sector)}
		{/each}
		{#if DIMENSIONNEMENT}
			{@render sectorCard(DIMENSIONNEMENT, true)}
		{/if}
		{#each ROW_3 as sector (sector.slug)}
			{@render sectorCard(sector)}
		{/each}
	</div>
</section>
