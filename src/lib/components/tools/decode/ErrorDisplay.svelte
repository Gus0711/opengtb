<script lang="ts">
	import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
	import type { DecodeFailure } from '$lib/tools/decode/types';

	let { failure }: { failure: DecodeFailure } = $props();

	const stageLabel = $derived.by(() => {
		switch (failure.stage) {
			case 'parse-payload':
				return 'Payload invalide';
			case 'load-codec':
				return 'Chargement du codec échoué';
			case 'execute-codec':
				return 'Décodage impossible';
		}
	});
</script>

<section
	class="border-destructive/40 bg-destructive/5 space-y-2 rounded border-l-4 px-4 py-3"
	role="alert"
>
	<header class="flex items-start gap-2">
		<AlertTriangle class="text-destructive mt-0.5 size-4 shrink-0" aria-hidden="true" />
		<div class="min-w-0 flex-1">
			<h2 class="text-destructive font-mono text-sm tracking-wide">{stageLabel}</h2>
			<p class="text-foreground mt-0.5 text-sm">{failure.message}</p>
		</div>
	</header>
	{#if failure.codecErrors && failure.codecErrors.length > 0}
		<ul class="text-text-soft ml-6 list-disc space-y-0.5 text-[12.5px]">
			{#each failure.codecErrors as e, i (i)}
				<li>{e}</li>
			{/each}
		</ul>
	{/if}
</section>
