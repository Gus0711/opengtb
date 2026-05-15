<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>{data.tool.title} · OpenGTB</title>
	<meta name="description" content={data.tool.description} />
</svelte:head>

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
