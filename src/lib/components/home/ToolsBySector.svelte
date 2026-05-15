<script lang="ts">
	import { SECTORS, toolsBySector } from '$lib/tools/registry';
	import type { Sector } from '$lib/tools/types';
	import Tag from '$lib/components/ui/Tag.svelte';

	// La maquette regroupe les secteurs 04 + 05 dans la même colonne :
	// rangée 1 → [01, 02], rangée 2 → [03, 04+05].
	const SECTOR_GROUPS: Sector[][] = (() => {
		const by = Object.fromEntries(SECTORS.map((s) => [s.slug, s]));
		return [
			[by['briques-techniques']],
			[by['reglementaire']],
			[by['dimensionnement']],
			[by['referentiels'], by['commissioning']]
		];
	})();
</script>

<section id="tools" class="mx-auto max-w-5xl px-5 pt-20 pb-2 md:px-7">
	<div class="border-border mb-6 flex items-baseline gap-3.5 border-b pb-3.5">
		<span class="text-primary font-mono text-[13px] font-semibold">§ 02</span>
		<h2 class="m-0 text-[clamp(22px,2.4vw,28px)] font-bold tracking-[-0.015em]">
			Tous les outils
			<span class="text-text-dim font-normal">— 12 modules, 5 secteurs.</span>
		</h2>
	</div>

	<div class="grid grid-cols-1 gap-x-14 gap-y-9 md:grid-cols-2">
		{#each SECTOR_GROUPS as group, gi (gi)}
			<div>
				{#each group as sector, si (sector.slug)}
					{@const tools = toolsBySector(sector.slug)}
					<div class:mt-7={si > 0}>
						<div
							class="border-line-strong text-text-dim flex items-baseline justify-between border-b border-dashed pb-2 text-[11.5px] tracking-[0.1em] uppercase"
						>
							<span class="text-primary font-semibold">
								{sector.number} · {sector.name}
							</span>
							<span>{tools.length}</span>
						</div>
						{#each tools as tool (tool.slug)}
							{@const Icon = tool.icon}
							<a
								href={tool.external ?? `/outils/${tool.slug}`}
								rel={tool.external ? 'noopener noreferrer' : undefined}
								target={tool.external ? '_blank' : undefined}
								class="
									group relative -mx-3 grid grid-cols-[18px_1fr_16px] items-start gap-3 rounded-sm border-b border-line-soft px-3 py-3.5 transition-colors
									hover:border-transparent hover:bg-card focus-visible:border-transparent focus-visible:bg-card
									focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60
									before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:origin-center before:scale-y-0 before:bg-primary before:transition-transform before:duration-200
									hover:before:scale-y-100 focus-visible:before:scale-y-100
								"
							>
								<Icon
									class="text-text-soft group-hover:text-primary group-focus-visible:text-primary mt-[2px] size-[18px] transition-colors"
								/>

								<div class="min-w-0">
									<div
										class="group-hover:text-primary group-focus-visible:text-primary text-[14.5px] font-medium leading-tight transition-colors"
									>
										{tool.name}{#if tool.external}<span class="text-cyan ml-1.5 text-[11px]"
												>↗ ConformBACS</span
											>{/if}
									</div>
									<div class="text-text-soft mt-1 text-[13.5px] leading-[1.5]">
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
									class="text-text-dim group-hover:text-primary group-focus-visible:text-primary mt-[2px] self-start text-[13px] transition-all group-hover:translate-x-1 group-focus-visible:translate-x-1"
								>
									{tool.external ? '↗' : '→'}
								</span>
							</a>
						{/each}
					</div>
				{/each}
			</div>
		{/each}
	</div>
</section>
