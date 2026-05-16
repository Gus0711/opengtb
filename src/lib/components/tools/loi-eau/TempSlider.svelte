<script lang="ts">
	let {
		tExt = $bindable<number>(),
		tDeparture,
		tDepartureRecommended,
		showRecommended
	}: {
		tExt: number;
		tDeparture: number;
		tDepartureRecommended?: number;
		showRecommended: boolean;
	} = $props();

	const QUICK = [-15, -7, 0, 5, 15];

	function setT(v: string) {
		const n = parseFloat(v);
		if (Number.isFinite(n)) tExt = Math.min(20, Math.max(-20, Math.round(n * 10) / 10));
	}
</script>

<section class="border-border bg-card rounded-md border">
	<header class="border-border border-b px-4 py-2.5">
		<h3 class="font-mono text-[11.5px] tracking-[0.1em] uppercase">
			<span class="text-primary">§</span> température extérieure
		</h3>
	</header>

	<div class="px-4 py-4">
		<div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
			<div>
				<div class="text-text-dim font-mono text-[10.5px] tracking-[0.1em] uppercase">
					T° ext
				</div>
				<div class="mt-0.5 font-mono text-3xl font-semibold tabular-nums">
					{tExt > 0 ? '+' : ''}{tExt.toFixed(1)}<span class="text-text-dim text-lg">°C</span>
				</div>
			</div>
			<div>
				<div class="text-text-dim font-mono text-[10.5px] tracking-[0.1em] uppercase">
					T° départ
				</div>
				<div class="text-primary mt-0.5 font-mono text-3xl font-semibold tabular-nums">
					{tDeparture.toFixed(1)}<span class="text-text-dim text-lg">°C</span>
				</div>
			</div>
			{#if showRecommended && tDepartureRecommended !== undefined}
				<div>
					<div class="text-text-dim font-mono text-[10.5px] tracking-[0.1em] uppercase">
						Recommandée
					</div>
					<div class="text-text-soft mt-0.5 font-mono text-3xl font-semibold tabular-nums">
						{tDepartureRecommended.toFixed(1)}<span class="text-text-dim text-lg">°C</span>
					</div>
				</div>
			{/if}
		</div>

		<input
			type="range"
			min="-20"
			max="20"
			step="0.5"
			value={tExt}
			oninput={(e) => setT((e.target as HTMLInputElement).value)}
			aria-label="Température extérieure"
			class="accent-primary mt-4 w-full"
		/>

		<div class="mt-3 flex flex-wrap gap-1.5">
			{#each QUICK as t (t)}
				<button
					type="button"
					onclick={() => (tExt = t)}
					class="border-border hover:border-primary/60 hover:text-primary rounded-sm border px-2.5 py-1 font-mono text-[11.5px] transition-colors
						{Math.abs(tExt - t) < 0.05 ? 'border-primary bg-primary/10 text-primary' : 'text-text-soft'}"
				>
					{t > 0 ? '+' : ''}{t} °C
				</button>
			{/each}
		</div>
	</div>
</section>
