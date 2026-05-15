<script lang="ts">
	import type { PageData } from './$types';
	import ToolShell from '$lib/components/tools/ToolShell.svelte';

	let { data }: { data: PageData } = $props();
</script>

<ToolShell tool={data.tool}>
	<div class="border-border rounded border border-dashed p-8 text-center">
		<p class="text-text-dim font-mono text-sm">// implémentation à venir</p>
	</div>
</ToolShell>
