<script lang="ts">
	import Newspaper from '@lucide/svelte/icons/newspaper';
	import { getAllArticles } from '$lib/articles/loader';
	import ArticleCard from '$lib/components/articles/ArticleCard.svelte';

	const recent = getAllArticles().slice(0, 3);
</script>

<section id="journal" class="mx-auto max-w-5xl px-5 pt-20 pb-2 md:px-7">
	<div
		class="border-border mb-6 flex items-baseline justify-between gap-6 border-b pb-3.5 max-sm:flex-col max-sm:items-start"
	>
		<div class="flex items-center gap-3">
			<Newspaper class="text-amber size-[18px] shrink-0" aria-hidden="true" />
			<h2 class="m-0 text-[clamp(22px,2.4vw,28px)] font-bold tracking-[-0.015em]">
				Journal
				<span class="text-text-dim font-normal">— retours d'expérience terrain.</span>
			</h2>
		</div>
		<a
			class="text-text-soft border-line-strong hover:text-primary hover:border-primary border-b pb-px font-mono text-[12.5px] transition-colors"
			href="/articles"
		>
			tous les articles →
		</a>
	</div>

	{#if recent.length === 0}
		<p
			class="border-border text-text-dim border-y border-dashed py-12 text-center font-mono text-sm"
		>
			// bientôt — premiers retours d'expérience en préparation
		</p>
	{:else}
		<div class="border-border flex flex-col border-t">
			{#each recent as article (article.slug)}
				<ArticleCard {article} />
			{/each}
		</div>
	{/if}
</section>
