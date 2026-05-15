<script lang="ts">
	import { SECTORS, toolsBySector } from '$lib/tools/registry';
	import SeoHead from '$lib/seo/SeoHead.svelte';
	import { buildMeta } from '$lib/seo/meta';

	const meta = buildMeta({
		title: 'Tous les outils',
		description: 'Les 12 outils OpenGTB pour les intégrateurs GTB & IoT, classés par secteur.'
	});
</script>

<SeoHead {meta} />

<section class="mx-auto max-w-5xl px-6 py-12">
	<h1 class="text-3xl font-semibold">Tous les outils</h1>
	<p class="text-muted-foreground mt-2">12 modules, 5 secteurs.</p>

	{#each SECTORS as sector (sector.slug)}
		{@const tools = toolsBySector(sector.slug)}
		{#if tools.length > 0}
			<section class="mt-10">
				<h2 class="font-mono text-sm tracking-wide uppercase">
					<span class="text-muted-foreground">§</span>
					{sector.number} · {sector.name}
					<span class="text-muted-foreground">({tools.length})</span>
				</h2>
				<ul class="border-border mt-4 divide-y border-y">
					{#each tools as tool (tool.slug)}
						<li class="py-3">
							{#if tool.external}
								<a
									href={tool.external}
									rel="noopener noreferrer"
									target="_blank"
									class="hover:underline"
								>
									<span class="font-mono">{tool.name}</span> — {tool.title} ↗
								</a>
								<p class="text-muted-foreground text-sm">{tool.description}</p>
							{:else}
								<a href="/outils/{tool.slug}" class="hover:underline">
									<span class="font-mono">{tool.name}</span> — {tool.title}
								</a>
								<p class="text-muted-foreground text-sm">{tool.description}</p>
							{/if}
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	{/each}
</section>
