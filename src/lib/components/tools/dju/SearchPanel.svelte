<script lang="ts">
	import { parseDeptInput } from '$lib/tools/dju/postal';
	import { stationsByDept, getYearsCount, TOTAL_YEARS_TARGET } from '$lib/tools/dju/data';
	import type { Station } from '$lib/tools/dju/types';
	import Search from '@lucide/svelte/icons/search';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import AlertTriangle from '@lucide/svelte/icons/triangle-alert';

	let {
		query = $bindable(''),
		selected = $bindable<string | null>(null)
	}: {
		query?: string;
		selected?: string | null;
	} = $props();

	const matchedDept = $derived(parseDeptInput(query));
	const matchedStations = $derived<Station[]>(
		matchedDept ? stationsByDept(matchedDept) : []
	);

	$effect(() => {
		if (matchedStations.length === 1 && selected !== matchedStations[0].id) {
			selected = matchedStations[0].id;
		}
		if (matchedStations.length === 0) selected = null;
	});
</script>

<div class="space-y-4">
	<label class="block">
		<span class="text-text-soft mb-1.5 block font-mono text-[11.5px] tracking-wide uppercase">
			Code postal ou département
		</span>
		<div class="relative">
			<Search
				class="text-text-dim pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
			/>
			<input
				type="text"
				bind:value={query}
				placeholder="ex : 75001, 13, 2A…"
				inputmode="numeric"
				autocomplete="postal-code"
				class="border-line-strong bg-background focus:border-primary focus:ring-primary/30 w-full rounded-md border py-2.5 pr-3 pl-9 font-mono text-sm focus:ring-2 focus:outline-none"
			/>
		</div>
		{#if query && !matchedDept}
			<p class="text-amber-500 mt-1.5 font-mono text-[11.5px]">
				Saisie non reconnue (5 chiffres pour un code postal, 2 chiffres ou 2A/2B pour un
				département).
			</p>
		{/if}
	</label>

	{#if matchedStations.length > 0}
		<div>
			<div
				class="text-text-soft mb-2 flex items-baseline justify-between font-mono text-[11.5px] tracking-wide uppercase"
			>
				<span>Stations du département {matchedDept}</span>
				<span class="text-text-dim">{matchedStations.length}</span>
			</div>
			<ul class="border-line-soft divide-line-soft divide-y rounded-md border">
				{#each matchedStations as s (s.id)}
					{@const years = getYearsCount(s.id)}
					{@const partial = years > 0 && years < TOTAL_YEARS_TARGET}
					{@const empty = years === 0}
					<li>
						<button
							type="button"
							onclick={() => (selected = s.id)}
							class="hover:bg-background/40 group flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors {selected ===
							s.id
								? 'bg-background/60'
								: ''}"
							aria-pressed={selected === s.id}
						>
							<MapPin
								class="mt-0.5 size-4 shrink-0 transition-colors {selected === s.id
									? 'text-primary'
									: 'text-text-dim group-hover:text-primary'}"
							/>
							<span class="min-w-0 flex-1">
								<span class="flex items-center gap-2">
									<span class="font-mono text-[13px] font-medium">{s.name}</span>
									{#if empty}
										<span class="inline-flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-500" title="Aucune année complète disponible">
											<AlertTriangle class="size-3" /> données indispo.
										</span>
									{:else if partial}
										<span class="inline-flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-500" title="Certaines années sont incomplètes côté Météo-France">
											<AlertTriangle class="size-3" /> {years}/{TOTAL_YEARS_TARGET} ans
										</span>
									{/if}
								</span>
								<span class="text-text-dim mt-0.5 block font-mono text-[11.5px]">
									{s.deptName} · alt {s.alt} m · {s.id}
								</span>
							</span>
							{#if selected === s.id}
								<span class="text-primary mt-1 font-mono text-[11px]">▸</span>
							{/if}
						</button>
					</li>
				{/each}
			</ul>
		</div>
	{:else if matchedDept}
		<p class="text-text-dim font-mono text-[12px]">
			Aucune station référencée pour le département {matchedDept}.
		</p>
	{/if}
</div>
