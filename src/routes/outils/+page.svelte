<script lang="ts">
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
			<h1 class="text-3xl font-semibold tracking-[-0.015em]">Tous les outils</h1>
			<p class="text-text-soft mt-2 text-[14px]">12 modules, 5 secteurs.</p>
		</div>
	</header>

	<div class="mt-10 space-y-7">
		{#each SECTORS as sector (sector.slug)}
			{@const tools = toolsBySector(sector.slug)}
			{#if tools.length > 0}
				<section class="border-border bg-card overflow-hidden rounded-md border">
					<header
						class="border-border bg-background/40 flex items-baseline justify-between border-b px-5 py-3"
					>
						<h2 class="font-mono text-[12px] tracking-[0.1em] uppercase">
							<span class="text-text-dim">§</span>
							<span class="text-primary font-semibold">{sector.number}</span>
							<span class="text-text-dim">·</span>
							<span class="font-semibold">{sector.name}</span>
						</h2>
						<span class="text-text-dim font-mono text-[11.5px] tracking-[0.1em]">
							{tools.length.toString().padStart(2, '0')}
						</span>
					</header>

					<ul class="divide-line-soft divide-y">
						{#each tools as tool (tool.slug)}
							{@const Icon = tool.icon}
							<li>
								<a
									href={tool.external ?? `/outils/${tool.slug}`}
									rel={tool.external ? 'noopener noreferrer' : undefined}
									target={tool.external ? '_blank' : undefined}
									class="
										group relative grid grid-cols-[20px_1fr_16px] items-start gap-4 px-5 py-4 transition-colors
										hover:bg-background/40 focus-visible:bg-background/40
										focus-visible:outline-none
										before:absolute before:inset-y-3 before:left-0 before:w-0.5 before:origin-center before:scale-y-0 before:bg-primary before:transition-transform before:duration-200
										hover:before:scale-y-100 focus-visible:before:scale-y-100
									"
								>
									<Icon
										class="text-text-soft group-hover:text-primary group-focus-visible:text-primary mt-[3px] size-[19px] transition-colors"
									/>

									<div class="min-w-0">
										<div class="flex items-baseline gap-2">
											<span
												class="font-mono text-[14.5px] font-medium transition-colors group-hover:text-primary group-focus-visible:text-primary"
											>
												{tool.name}
											</span>
											<span class="text-text-dim text-[13px]">— {tool.title}</span>
											{#if tool.external}
												<span class="text-cyan font-mono text-[11px]">↗</span>
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
										class="text-text-dim group-hover:text-primary group-focus-visible:text-primary mt-[3px] self-start font-mono text-[13px] transition-all group-hover:translate-x-1 group-focus-visible:translate-x-1"
									>
										{tool.external ? '↗' : '→'}
									</span>
								</a>
							</li>
						{/each}
					</ul>
				</section>
			{/if}
		{/each}
	</div>
</section>
