<script lang="ts">
	import { getAllArticles } from '$lib/articles/loader';
	import { formatMonthYear } from '$lib/format';

	const recent = getAllArticles().slice(0, 3);
</script>

<section id="journal" class="mx-auto max-w-5xl px-5 pt-20 pb-2 md:px-7">
	<div
		class="border-border mb-6 flex items-baseline justify-between gap-6 border-b pb-3.5 max-sm:flex-col max-sm:items-start"
	>
		<div class="flex items-baseline gap-3.5">
			<span class="text-primary font-mono text-[13px] font-semibold">§ 03</span>
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
				<a
					href="/articles/{article.slug}"
					class="group border-border hover:bg-card grid items-baseline gap-1 border-b px-1 py-5 transition-all hover:px-3 sm:grid-cols-[auto_1fr_auto] sm:gap-6"
				>
					<div class="text-text-dim min-w-[60px] font-mono text-xs tracking-wider">
						{formatMonthYear(article.date)}
					</div>
					<div class="min-w-0">
						{#if article.tags.length > 0}
							<span class="text-primary mb-1 inline-block font-mono text-[11px]"
								>#{article.tags[0]}</span
							>
						{/if}
						<h3
							class="group-hover:text-primary mb-1 text-[17.5px] leading-tight font-semibold tracking-[-0.01em] transition-colors"
						>
							{article.title}
						</h3>
						<p class="text-text-soft m-0 text-sm leading-[1.5]">{article.excerpt}</p>
						<div class="text-text-dim mt-1.5 font-mono text-[11.5px]">— {article.author}</div>
					</div>
					<span
						class="text-text-dim group-hover:text-primary self-center font-mono text-[13px] transition-all group-hover:translate-x-1 max-sm:hidden"
					>
						→
					</span>
				</a>
			{/each}
		</div>
	{/if}
</section>
