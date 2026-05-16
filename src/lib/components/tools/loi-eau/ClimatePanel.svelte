<script lang="ts">
	import { CLIMATE_ZONES, getZone } from '$lib/tools/loi-eau/data';
	import type { ClimateZoneId } from '$lib/tools/loi-eau/types';

	let {
		zone = $bindable<ClimateZoneId>(),
		tAmbiance = $bindable<number>()
	}: { zone: ClimateZoneId; tAmbiance: number } = $props();

	const z = $derived(getZone(zone));

	function setTAmb(v: string) {
		const n = parseFloat(v);
		if (Number.isFinite(n)) tAmbiance = Math.min(24, Math.max(16, n));
	}
</script>

<section class="border-border bg-card rounded-md border">
	<header class="border-border flex items-baseline justify-between border-b px-4 py-2.5">
		<h3 class="font-mono text-[11.5px] tracking-[0.1em] uppercase">
			<span class="text-primary">§</span> ambiance & zone
		</h3>
		{#if z}
			<span class="text-text-dim font-mono text-[11px]">
				T° base
				<span class="text-foreground">{z.baseTemp > 0 ? '+' : ''}{z.baseTemp} °C</span>
			</span>
		{/if}
	</header>
	<div class="space-y-3 px-4 py-4">
		<label class="block">
			<span class="text-text-dim font-mono text-[10.5px] tracking-[0.1em] uppercase">
				Zone climatique
			</span>
			<select
				value={zone}
				onchange={(e) => (zone = (e.target as HTMLSelectElement).value as ClimateZoneId)}
				class="border-border bg-background mt-1 w-full rounded-sm border px-3 py-2 text-[14px]"
			>
				{#each CLIMATE_ZONES as cz (cz.id)}
					<option value={cz.id}>{cz.name}</option>
				{/each}
			</select>
			{#if z}
				<span class="text-text-soft mt-1 block text-[11.5px] leading-[1.4]">{z.description}</span>
			{/if}
		</label>

		<label class="block">
			<span class="text-text-dim font-mono text-[10.5px] tracking-[0.1em] uppercase">
				T° d'ambiance souhaitée
			</span>
			<div class="mt-1 flex items-center gap-2">
				<input
					type="number"
					min="16"
					max="24"
					step="0.5"
					value={tAmbiance}
					oninput={(e) => setTAmb((e.target as HTMLInputElement).value)}
					class="border-border bg-background w-20 rounded-sm border px-3 py-2 text-[14px]"
				/>
				<span class="text-text-soft font-mono text-[12px]">°C</span>
				<input
					type="range"
					min="16"
					max="24"
					step="0.5"
					value={tAmbiance}
					oninput={(e) => setTAmb((e.target as HTMLInputElement).value)}
					class="accent-primary flex-1"
				/>
			</div>
		</label>
	</div>
</section>
