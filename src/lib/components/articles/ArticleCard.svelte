<script lang="ts">
	import { formatMonthYear } from '$lib/format';
	import type { Article } from '$lib/articles/types';

	let { article }: { article: Article } = $props();
</script>

<a
	href="/articles/{article.slug}"
	class="
		group relative -mx-3 grid items-start gap-4 rounded-sm border-b border-border px-3 py-5 transition-colors
		hover:border-transparent hover:bg-card focus-visible:border-transparent focus-visible:bg-card
		focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60
		sm:grid-cols-[170px_1fr_auto] sm:gap-5
	"
>
	<div class="aspect-[3/2] w-full overflow-hidden border border-border bg-card">
		{#if article.cover}
			<img
				src={article.cover}
				alt=""
				loading="lazy"
				class="h-full w-full object-cover"
			/>
		{:else}
			<div class="flex h-full w-full items-center justify-center">
				<span class="font-mono text-[11px] text-amber">#{article.tags[0] ?? 'article'}</span>
			</div>
		{/if}
	</div>

	<div class="min-w-0">
		{#if article.tags.length > 0}
			<span class="mb-1 inline-block font-mono text-[11px] text-amber"
				>#{article.tags[0]}</span
			>
		{/if}
		<h3
			class="mb-1 text-[17.5px] font-semibold leading-tight tracking-[-0.01em] transition-colors group-hover:text-primary"
		>
			{article.title}
		</h3>
		<p class="m-0 text-sm leading-[1.5] text-text-soft">{article.excerpt}</p>
		<div class="mt-2 font-mono text-[11.5px] text-text-dim">
			{formatMonthYear(article.date)} · {article.reading_time} min
		</div>
	</div>

	<span
		class="hidden self-center font-mono text-[13px] text-text-dim transition-all group-hover:translate-x-1 group-hover:text-primary group-focus-visible:translate-x-1 group-focus-visible:text-primary sm:block"
	>
		→
	</span>
</a>
