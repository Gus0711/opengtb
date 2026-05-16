<script lang="ts">
	import { EMITTERS, getEmitter } from '$lib/tools/loi-eau/data';
	import type { EmitterId } from '$lib/tools/loi-eau/types';

	let { value = $bindable<EmitterId>() }: { value: EmitterId } = $props();
	const current = $derived(getEmitter(value));
</script>

<section class="border-border bg-card rounded-md border">
	<header class="border-border flex items-baseline justify-between border-b px-4 py-2.5">
		<h3 class="font-mono text-[11.5px] tracking-[0.1em] uppercase">
			<span class="text-primary">§</span> émetteur
		</h3>
		{#if current}
			<span class="text-text-dim font-mono text-[11px]">
				régime nominal
				<span class="text-foreground">
					{current.regime.departure} / {current.regime.return} °C
				</span>
			</span>
		{/if}
	</header>
	<div class="px-4 py-4">
		<select
			value={value}
			onchange={(e) => (value = (e.target as HTMLSelectElement).value as EmitterId)}
			class="border-border bg-background w-full rounded-sm border px-3 py-2 text-[14px]"
		>
			{#each EMITTERS as e (e.id)}
				<option value={e.id}>{e.name} ({e.regime.departure}/{e.regime.return} °C)</option>
			{/each}
		</select>
		{#if current}
			<p class="text-text-soft mt-2 text-[12.5px] leading-[1.45]">{current.description}</p>
			<p class="text-text-dim mt-1 font-mono text-[10.5px]">Source : {current.source}</p>
		{/if}
	</div>
</section>
