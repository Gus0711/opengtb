<script lang="ts">
	import HitCounter from './HitCounter.svelte';
</script>

<footer class="border-border mt-20 border-t">
	<div
		class="text-text-dim mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-6 px-5 py-7 font-mono text-xs md:px-7"
	>
		<div class="flex flex-wrap items-center gap-2.5">
			<span class="text-primary inline-flex" aria-hidden="true">
				<svg width="16" height="16" viewBox="0 0 22 22" fill="none">
					<path
						d="M2 11 H6 L8 5 L12 17 L14 11 H20"
						stroke="currentColor"
						stroke-width="1.8"
						fill="none"
						stroke-linejoin="round"
						stroke-linecap="round"
					/>
				</svg>
			</span>
			<span class="text-foreground"
				>open<span class="text-text-dim">/</span><span class="text-primary">gtb</span></span
			>
			<span class="ml-2">· MIT · hébergé en France</span>
		</div>
		<div class="flex flex-wrap items-center gap-5">
			<HitCounter />
			<a
				href="https://github.com"
				rel="noopener noreferrer"
				target="_blank"
				class="text-text-soft hover:text-primary transition-colors">github</a
			>
			<a href="/#pricing" class="text-text-soft hover:text-primary transition-colors">roadmap</a>
		</div>
	</div>
</footer>
