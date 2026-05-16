<script lang="ts">
	import { PRESETS } from '$lib/tools/loi-eau/presets';
	import type { Preset } from '$lib/tools/loi-eau/types';

	let { onApply }: { onApply: (p: Preset) => void } = $props();
</script>

<section class="border-border bg-card rounded-md border">
	<header class="border-border border-b px-4 py-2.5">
		<h3 class="font-mono text-[11.5px] tracking-[0.1em] uppercase">
			<span class="text-primary">§</span> cas typiques
		</h3>
	</header>
	<div class="flex flex-wrap gap-1.5 px-4 py-3">
		{#each PRESETS as p (p.id)}
			<button
				type="button"
				onclick={() => onApply(p)}
				class="border-border text-text-soft hover:border-primary hover:text-primary rounded-sm border px-2.5 py-1 font-mono text-[11.5px] transition-colors"
			>
				{p.name}
			</button>
		{/each}
	</div>
</section>
