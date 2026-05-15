<script lang="ts">
	import { getAllArticles } from '$lib/articles/loader';
	import SeoHead from '$lib/seo/SeoHead.svelte';
	import { buildMeta } from '$lib/seo/meta';
	import BackLink from '$lib/components/layout/BackLink.svelte';
	import ArticleCard from '$lib/components/articles/ArticleCard.svelte';

	const articles = getAllArticles();
	const meta = buildMeta({
		title: 'Journal',
		description: "Retours d'expérience et notes techniques pour les intégrateurs GTB & IoT."
	});
</script>

<SeoHead {meta} />

<section class="mx-auto max-w-3xl px-5 pt-6 pb-12 md:px-7">
	<BackLink href="/" label="retour à l'accueil" />

	<h1 class="mt-6 text-3xl font-semibold">Journal</h1>
	<p class="text-text-soft mt-2">Retours d'expérience et notes techniques.</p>

	{#if articles.length === 0}
		<p
			class="border-border text-text-dim mt-8 border-y border-dashed py-12 text-center font-mono text-sm"
		>
			// bientôt — premiers retours d'expérience en préparation
		</p>
	{:else}
		<div class="border-border mt-8 flex flex-col border-t">
			{#each articles as article (article.slug)}
				<ArticleCard {article} />
			{/each}
		</div>
	{/if}
</section>
