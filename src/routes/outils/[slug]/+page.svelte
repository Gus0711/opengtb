<script lang="ts">
	import type { PageData } from './$types';
	import SeoHead from '$lib/seo/SeoHead.svelte';
	import { buildMeta } from '$lib/seo/meta';
	import BackLink from '$lib/components/layout/BackLink.svelte';

	let { data }: { data: PageData } = $props();

	const meta = $derived(
		buildMeta({
			title: data.tool.title,
			description: data.tool.description
		})
	);
</script>

<SeoHead {meta} />

<article class="mx-auto max-w-3xl px-5 pt-6 pb-12 md:px-7">
	<BackLink href="/outils" label="tous les outils" />

	<p class="text-text-dim mt-6 font-mono text-xs">// {data.tool.sector}</p>
	<h1 class="mt-2 font-mono text-3xl">
		<span class="text-text-dim">gtb </span><b class="text-primary">{data.tool.name}</b>
	</h1>
	<p class="text-foreground mt-4 text-lg">{data.tool.title}</p>
	<p class="text-text-soft mt-2">{data.tool.description}</p>

	<div class="border-border mt-12 rounded border border-dashed p-6 text-center">
		<p class="text-text-dim font-mono text-sm">// implémentation à venir</p>
	</div>
</article>
