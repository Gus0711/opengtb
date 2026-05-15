<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Tool } from '$lib/tools/types';
	import { SECTORS } from '$lib/tools/registry';
	import SeoHead from '$lib/seo/SeoHead.svelte';
	import { buildMeta } from '$lib/seo/meta';
	import Tag from '$lib/components/ui/Tag.svelte';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Lock from '@lucide/svelte/icons/lock';

	let {
		tool,
		seoTitle,
		seoDescription,
		children
	}: {
		tool: Tool;
		seoTitle?: string;
		seoDescription?: string;
		children: Snippet;
	} = $props();

	const sector = $derived(SECTORS.find((s) => s.slug === tool.sector));
	const meta = $derived(
		buildMeta({
			title: seoTitle ?? tool.title,
			description: seoDescription ?? tool.description
		})
	);
	const Icon = $derived(tool.icon);
</script>

<SeoHead {meta} />

<article class="mx-auto max-w-5xl px-5 pt-5 pb-12 md:px-7">
	<nav aria-label="Fil d'Ariane" class="text-text-dim font-mono text-[12px]">
		<ol class="flex flex-wrap items-center gap-1.5">
			<li>
				<a href="/" class="hover:text-primary transition-colors">accueil</a>
			</li>
			<li aria-hidden="true"><ChevronRight class="size-3" /></li>
			<li>
				<a href="/outils" class="hover:text-primary transition-colors">outils</a>
			</li>
			<li aria-hidden="true"><ChevronRight class="size-3" /></li>
			<li class="text-text-soft" aria-current="page">{tool.name}</li>
		</ol>
	</nav>

	<header class="mt-6">
		{#if sector}
			<p class="text-text-dim font-mono text-[11px] tracking-wide uppercase">
				<span class="text-muted-foreground">§</span>
				{sector.number} · {sector.name}
			</p>
		{/if}
		<div class="mt-2 flex items-start gap-3">
			<span
				class="border-line-strong text-primary mt-1 inline-flex size-9 shrink-0 items-center justify-center rounded border"
				aria-hidden="true"
			>
				<Icon class="size-5" />
			</span>
			<div class="min-w-0 flex-1">
				<h1 class="font-mono text-2xl md:text-3xl">
					<span class="text-text-dim">gtb </span><b class="text-primary">{tool.name}</b>
				</h1>
				<p class="text-foreground mt-1 text-base md:text-lg">{tool.title}</p>
				<p class="text-text-soft mt-1.5 text-sm">{tool.description}</p>
				{#if tool.tags.length > 0}
					<ul class="mt-3 flex flex-wrap gap-1.5" aria-label="Mots-clés">
						{#each tool.tags as t (t)}
							<li><Tag>{t}</Tag></li>
						{/each}
					</ul>
				{/if}
			</div>
		</div>
	</header>

	<section class="mt-8">
		{@render children()}
	</section>

	<footer
		class="border-line-soft text-text-dim mt-12 flex items-center gap-2 border-t pt-4 font-mono text-[11.5px]"
	>
		<Lock class="size-3.5" aria-hidden="true" />
		<span
			>Calculs effectués localement dans votre navigateur. Aucune donnée envoyée sur nos
			serveurs.</span
		>
	</footer>
</article>
