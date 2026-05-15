<script lang="ts">
	import type { PageData } from './$types';
	import SeoHead from '$lib/seo/SeoHead.svelte';
	import { buildMeta } from '$lib/seo/meta';

	let { data }: { data: PageData } = $props();

	const meta = $derived(
		buildMeta({
			title: data.tool.title,
			description: data.tool.description
		})
	);
</script>

<SeoHead {meta} />

<article class="mx-auto max-w-3xl px-6 py-12">
	<p class="text-muted-foreground font-mono text-xs">// {data.tool.sector}</p>
	<h1 class="mt-2 font-mono text-3xl">
		<span class="text-muted-foreground">gtb </span><b>{data.tool.name}</b>
	</h1>
	<p class="mt-4 text-lg">{data.tool.title}</p>
	<p class="text-muted-foreground mt-2">{data.tool.description}</p>

	<div class="border-border mt-12 rounded border border-dashed p-6 text-center">
		<p class="text-muted-foreground font-mono text-sm">// implémentation à venir</p>
	</div>
</article>
