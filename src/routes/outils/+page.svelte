<script lang="ts">
	import LayoutGrid from '@lucide/svelte/icons/layout-grid';
	import { SECTORS, toolsBySector } from '$lib/tools/registry';
	import SeoHead from '$lib/seo/SeoHead.svelte';
	import { buildMeta } from '$lib/seo/meta';
	import BackLink from '$lib/components/layout/BackLink.svelte';
	import Tag from '$lib/components/ui/Tag.svelte';

	const meta = buildMeta({
		title: 'Tous les outils',
		description: 'Les 12 outils OpenGTB pour les intégrateurs GTB & IoT, classés par secteur.'
	});
</script>

<SeoHead {meta} />

<section class="mx-auto max-w-5xl px-5 pt-6 pb-16 md:px-7">
	<BackLink href="/" label="retour à l'accueil" />

	<header class="mt-6 flex items-end justify-between gap-4">
		<div>
			<div class="flex items-center gap-3">
				<LayoutGrid class="text-amber size-6 shrink-0" aria-hidden="true" />
				<h1 class="text-3xl font-semibold tracking-[-0.015em]">Tous les outils</h1>
			</div>
			<p class="text-text-soft mt-2 text-[14px]">12 modules, 5 secteurs.</p>
		</div>
	</header>

	<div class="mt-10 space-y-5">
		{#each SECTORS as sector (sector.slug)}
			{@const tools = toolsBySector(sector.slug)}
			{@const SectorIcon = sector.icon}
			{#if tools.length > 0}
				<section
					class="border-border bg-card/60 hover:border-line-strong relative overflow-hidden rounded border px-5 pt-5 pb-2 transition-colors"
				>
					<span
						aria-hidden="true"
						class="text-amber pointer-events-none absolute -top-5 -right-2 font-mono text-[120px] leading-none font-bold tracking-[-0.04em] opacity-[0.05] select-none"
					>
						{sector.number}
					</span>

					<header
						class="border-border relative mb-1 flex items-center gap-2.5 border-b pb-3.5"
					>
						<span
							class="border-primary/40 bg-accent-glow text-primary inline-flex size-7 shrink-0 items-center justify-center rounded-[3px] border"
						>
							<SectorIcon class="size-[15px]" />
						</span>
						<h2 class="text-foreground text-[15px] font-semibold tracking-[-0.005em]">
							{sector.name}
						</h2>
						<span class="text-primary ml-auto font-mono text-[11px] font-medium">
							{tools.length} {tools.length > 1 ? 'outils' : 'outil'}
						</span>
					</header>

					<ul class="relative">
						{#each tools as tool, i (tool.slug)}
							{@const Icon = tool.icon}
							{@const isTodo = tool.status === 'todo'}
							{@const isLast = i === tools.length - 1}
							<li>
								{#if isTodo}
									<div
										aria-disabled="true"
										class="
											border-line-soft grid cursor-not-allowed grid-cols-[20px_1fr_16px] items-start gap-4 py-4
											opacity-55
											{isLast ? 'border-b-0' : 'border-b'}
										"
									>
										<Icon class="text-amber/40 mt-[3px] size-[19px]" />

										<div class="min-w-0">
											<div class="flex flex-wrap items-baseline gap-2">
												<span class="text-text-soft text-[14.5px] font-medium">
													{tool.name}
												</span>
												<span class="text-text-dim text-[13px]">— {tool.title}</span>
												<span
													class="border-line-strong text-text-dim ml-1 rounded-sm border border-dashed px-1.5 py-px font-mono text-[10.5px] tracking-[0.08em] uppercase"
												>
													à venir
												</span>
											</div>
											<p class="text-text-dim mt-1 text-[13.5px] leading-[1.55]">
												{tool.description}
											</p>
											{#if tool.tags.length > 0}
												<div class="mt-2 flex flex-wrap gap-1">
													{#each tool.tags as tag (tag)}
														<Tag>{tag}</Tag>
													{/each}
												</div>
											{/if}
										</div>

										<span class="text-text-dim mt-[3px] self-start font-mono text-[13px]">·</span>
									</div>
								{:else}
									<a
										href={tool.external ?? `/outils/${tool.slug}`}
										rel={tool.external ? 'noopener noreferrer' : undefined}
										target={tool.external ? '_blank' : undefined}
										class="
											group border-line-soft relative grid grid-cols-[20px_1fr_16px] items-start gap-4 py-4
											transition-[padding] duration-150
											hover:pl-2 focus-visible:pl-2 focus-visible:outline-none
											before:bg-primary before:absolute before:top-0 before:bottom-0 before:-left-5 before:w-0.5 before:opacity-0 before:transition-opacity
											hover:before:opacity-100 focus-visible:before:opacity-100
											{isLast ? 'border-b-0' : 'border-b'}
										"
									>
										<Icon
											class="text-amber mt-[3px] size-[19px] transition-[filter] group-hover:[filter:brightness(1.15)] group-focus-visible:[filter:brightness(1.15)]"
										/>

										<div class="min-w-0">
											<div class="flex items-baseline gap-2">
												<span
													class="text-foreground group-hover:text-primary group-focus-visible:text-primary text-[14.5px] font-medium transition-colors"
												>
													{tool.name}
												</span>
												<span class="text-text-dim text-[13px]">— {tool.title}</span>
												{#if tool.external}
													<span class="text-amber font-mono text-[11px]">↗</span>
												{/if}
											</div>
											<p class="text-text-soft mt-1 text-[13.5px] leading-[1.55]">
												{tool.description}
											</p>
											{#if tool.tags.length > 0}
												<div class="mt-2 flex flex-wrap gap-1">
													{#each tool.tags as tag (tag)}
														<Tag>{tag}</Tag>
													{/each}
												</div>
											{/if}
										</div>

										<span
											class="text-primary mt-[3px] self-start font-mono text-[13px] transition-transform group-hover:translate-x-1 group-focus-visible:translate-x-1"
										>
											{tool.external ? '↗' : '→'}
										</span>
									</a>
								{/if}
							</li>
						{/each}
					</ul>
				</section>
			{/if}
		{/each}
	</div>
</section>
