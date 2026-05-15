<script lang="ts">
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';

	let { href, label }: { href: string; label: string } = $props();
</script>

<a
	{href}
	class="text-text-soft hover:text-primary focus-visible:text-primary inline-flex items-center gap-1.5 font-mono text-[12.5px] transition-colors focus-visible:outline-none focus-visible:underline"
>
	<ArrowLeft class="size-3.5" />
	{label}
</a>
