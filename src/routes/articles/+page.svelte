<script lang="ts">
	import { getAllArticles } from '$lib/articles/loader';
	import { formatDateLong } from '$lib/format';

	const articles = getAllArticles();
</script>

<svelte:head>
	<title>Articles · OpenGTB</title>
	<meta
		name="description"
		content="Retours d'expérience et notes techniques pour les intégrateurs GTB &amp; IoT."
	/>
</svelte:head>

<section class="mx-auto max-w-3xl px-6 py-12">
	<h1 class="text-3xl font-semibold">Articles</h1>
	<p class="text-muted-foreground mt-2">Retours d'expérience et notes techniques.</p>

	{#if articles.length === 0}
		<p class="text-muted-foreground mt-8 font-mono text-sm">// pas encore d'articles</p>
	{:else}
		<ul class="border-border mt-8 divide-y border-y">
			{#each articles as article (article.slug)}
				<li class="py-6">
					<a href="/articles/{article.slug}" class="group block">
						<h2 class="text-xl font-medium group-hover:underline">{article.title}</h2>
						<p class="text-muted-foreground mt-2">{article.excerpt}</p>
						<p class="text-muted-foreground mt-3 font-mono text-xs">
							{formatDateLong(article.date)} · {article.reading_time} min · {article.author}
						</p>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</section>
