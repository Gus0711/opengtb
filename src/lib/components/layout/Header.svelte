<script lang="ts">
	import ThemeToggle from './ThemeToggle.svelte';
</script>

<header
	class="border-border bg-background/90 sticky top-0 z-50 border-b backdrop-blur supports-[backdrop-filter]:bg-background/85"
>
	<div class="mx-auto flex max-w-5xl items-center gap-5 px-5 py-3.5 md:gap-7 md:px-7">
		<a href="/" class="flex flex-1 items-center gap-2.5" aria-label="OpenGTB — accueil">
			<span class="text-primary inline-flex" aria-hidden="true">
				<svg width="20" height="20" viewBox="0 0 22 22" fill="none">
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
			<span class="font-mono text-[15px] font-semibold">
				open<span class="text-text-dim">/</span><span class="text-primary">gtb</span>
			</span>
		</a>

		<nav class="hidden gap-1 md:flex" aria-label="Navigation principale">
			<a
				href="/outils"
				class="text-text-soft hover:text-primary px-3 py-1.5 text-[13px] transition-colors"
				>outils</a
			>
			<a
				href="/articles"
				class="text-text-soft hover:text-primary px-3 py-1.5 text-[13px] transition-colors"
				>journal</a
			>
			<a
				href="/messages"
				class="text-text-soft hover:text-primary px-3 py-1.5 text-[13px] transition-colors"
				>messages</a
			>
			<a
				href="/#pricing"
				class="text-text-soft hover:text-primary px-3 py-1.5 text-[13px] transition-colors">pro</a
			>
		</nav>

		<ThemeToggle />
	</div>
</header>
