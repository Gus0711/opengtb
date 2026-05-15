<script lang="ts">
	import type { Component } from 'svelte';
	import { formatDateLong } from '$lib/format';
	import type { PageData } from './$types';
	import SeoHead from '$lib/seo/SeoHead.svelte';
	import { buildMeta } from '$lib/seo/meta';
	import BackLink from '$lib/components/layout/BackLink.svelte';

	let { data }: { data: PageData } = $props();

	const Article = $derived(data.Component as Component);
	const meta = $derived(
		buildMeta({
			title: data.article.title,
			description: data.article.excerpt,
			type: 'article'
		})
	);
</script>

<SeoHead {meta} />

<article class="mx-auto max-w-2xl px-5 pt-6 pb-12 md:px-7">
	<BackLink href="/articles" label="tous les articles" />

	<header class="border-border mt-6 border-b pb-6">
		<h1 class="text-3xl font-semibold">{data.article.title}</h1>
		<p class="text-text-dim mt-3 font-mono text-xs">
			{formatDateLong(data.article.date)} · {data.article.reading_time} min · — {data.article.author}
		</p>
		{#if data.article.tags.length > 0}
			<p class="text-text-dim mt-2 font-mono text-xs">
				{#each data.article.tags as tag, i (tag)}{#if i > 0}, {/if}#{tag}{/each}
			</p>
		{/if}
	</header>

	<div class="prose prose-invert mt-8 max-w-none">
		<Article />
	</div>
</article>
