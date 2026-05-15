<script lang="ts">
	import type { Component } from 'svelte';
	import { formatDateLong } from '$lib/format';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const Article = $derived(data.Component as Component);
</script>

<svelte:head>
	<title>{data.article.title} · OpenGTB</title>
	<meta name="description" content={data.article.excerpt} />
</svelte:head>

<article class="mx-auto max-w-2xl px-6 py-12">
	<header class="border-border border-b pb-6">
		<h1 class="text-3xl font-semibold">{data.article.title}</h1>
		<p class="text-muted-foreground mt-3 font-mono text-xs">
			{formatDateLong(data.article.date)} · {data.article.reading_time} min · {data.article.author}
		</p>
		{#if data.article.tags.length > 0}
			<p class="text-muted-foreground mt-2 font-mono text-xs">
				{#each data.article.tags as tag, i (tag)}{#if i > 0}, {/if}#{tag}{/each}
			</p>
		{/if}
	</header>

	<div class="prose prose-invert mt-8 max-w-none">
		<Article />
	</div>
</article>
