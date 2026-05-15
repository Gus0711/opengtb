<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<span
	class="border-line-soft text-text-soft bg-secondary/30 inline-flex items-center border px-1.5 py-0.5 font-mono text-[10.5px] leading-none"
>
	{@render children()}
</span>
