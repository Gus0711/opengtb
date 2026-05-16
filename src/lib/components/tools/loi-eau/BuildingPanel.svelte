<script lang="ts">
	import {
		ISOLATIONS,
		PERIODS,
		RENOVATIONS,
		periodForYear,
		getIsolation,
		getPeriod
	} from '$lib/tools/loi-eau/data';
	import type {
		BuildingInputs,
		BuildingInputMode,
		Mode,
		IsolationLevel
	} from '$lib/tools/loi-eau/types';

	let {
		building = $bindable<BuildingInputs>(),
		mode
	}: { building: BuildingInputs; mode: Mode } = $props();

	function setMode(m: BuildingInputMode) {
		building = { ...building, mode: m };
	}

	function setUbat(v: string) {
		const n = parseFloat(v);
		building = { ...building, ubat: Number.isFinite(n) ? n : undefined };
	}
	function setAnnee(v: string) {
		const n = parseInt(v, 10);
		building = { ...building, annee: Number.isFinite(n) ? n : undefined };
	}
	function setRenove(checked: boolean) {
		building = { ...building, renoveAnnee: checked ? 2012 : undefined };
	}
	function setRenoveAnnee(v: string) {
		const n = parseInt(v, 10);
		building = { ...building, renoveAnnee: Number.isFinite(n) ? n : undefined };
	}
	function setIsolation(id: IsolationLevel) {
		building = { ...building, isolation: id };
	}

	const periodInfo = $derived.by(() => {
		if (building.mode === 'annee' && building.annee !== undefined) {
			return periodForYear(building.annee, building.renoveAnnee);
		}
		return undefined;
	});

	const current = $derived(building.isolation ?? 'moyenne');
</script>

<section class="border-border bg-card rounded-md border">
	<header class="border-border flex items-baseline justify-between border-b px-4 py-2.5">
		<h3 class="font-mono text-[11.5px] tracking-[0.1em] uppercase">
			<span class="text-primary">§</span> bâtiment
		</h3>
		<div class="flex gap-0.5 font-mono text-[10.5px]">
			{#each ['fourchette', 'annee', 'ubat'] as m (m)}
				{@const disabled = m === 'ubat' && mode === 'decouverte'}
				<button
					type="button"
					onclick={() => setMode(m as BuildingInputMode)}
					{disabled}
					class="rounded-sm px-2 py-0.5 transition-colors
						{building.mode === m
						? 'bg-primary/10 text-primary'
						: 'text-text-dim hover:text-foreground'}
						disabled:opacity-30"
					title={disabled ? 'Disponible en mode Pro' : ''}
				>
					{m === 'fourchette' ? 'fourchette' : m === 'annee' ? 'année' : 'Ubât'}
				</button>
			{/each}
		</div>
	</header>

	<div class="px-4 py-4">
		{#if building.mode === 'fourchette'}
			<div class="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-1">
				{#each ISOLATIONS as iso (iso.id)}
					<button
						type="button"
						onclick={() => setIsolation(iso.id)}
						class="border-border rounded-sm border px-3 py-2 text-left transition-colors
							{current === iso.id
							? 'border-primary bg-primary/5'
							: 'hover:border-primary/40'}"
					>
						<div class="flex items-baseline justify-between gap-2">
							<span class="text-[13.5px] font-semibold">{iso.name}</span>
							<span class="text-text-dim font-mono text-[11px]">{iso.dpeEquivalent}</span>
						</div>
						<p class="text-text-soft mt-0.5 text-[12px] leading-[1.4]">{iso.description}</p>
						<p class="text-text-dim mt-1 font-mono text-[10.5px]">
							Ubât ≈ {iso.ubatRange.min}–{iso.ubatRange.max} W/m²·K
						</p>
					</button>
				{/each}
			</div>
		{:else if building.mode === 'annee'}
			<label class="block">
				<span class="text-text-dim font-mono text-[10.5px] tracking-[0.1em] uppercase">
					Année de construction
				</span>
				<input
					type="number"
					min="1900"
					max="2026"
					step="1"
					value={building.annee ?? ''}
					oninput={(e) => setAnnee((e.target as HTMLInputElement).value)}
					placeholder="ex. 1985"
					class="border-border bg-background mt-1 w-full rounded-sm border px-3 py-2 text-[14px]"
				/>
			</label>
			<label class="mt-3 flex items-center gap-2">
				<input
					type="checkbox"
					checked={building.renoveAnnee !== undefined}
					onchange={(e) => setRenove((e.target as HTMLInputElement).checked)}
				/>
				<span class="text-[13px]">Bâtiment rénové</span>
			</label>
			{#if building.renoveAnnee !== undefined}
				<label class="mt-2 block">
					<span class="text-text-dim font-mono text-[10.5px] tracking-[0.1em] uppercase">
						Année de rénovation
					</span>
					<select
						value={String(building.renoveAnnee)}
						onchange={(e) => setRenoveAnnee((e.target as HTMLSelectElement).value)}
						class="border-border bg-background mt-1 w-full rounded-sm border px-3 py-2 text-[14px]"
					>
						{#each RENOVATIONS as r (r.yearMin)}
							{@const p = getPeriod(r.periodId)}
							<option value={String(r.yearMin)}>{r.yearMin}+ ({p?.name ?? r.periodId})</option>
						{/each}
					</select>
				</label>
			{/if}
			{#if periodInfo}
				<div class="border-line-soft mt-3 rounded-sm border bg-background/40 px-3 py-2">
					<p class="font-mono text-[11px]">
						<span class="text-text-dim">période :</span>
						<span class="text-foreground">{periodInfo.name}</span>
					</p>
					<p class="text-text-dim mt-0.5 font-mono text-[11px]">
						Ubât typique ≈ <span class="text-foreground">{periodInfo.ubatTypical}</span>
						W/m²·K
					</p>
					<p class="text-text-soft mt-1 text-[11.5px] leading-[1.4]">{periodInfo.note}</p>
				</div>
			{/if}
		{:else}
			<label class="block">
				<span class="text-text-dim font-mono text-[10.5px] tracking-[0.1em] uppercase">
					Ubât (W/m²·K)
				</span>
				<input
					type="number"
					min="0.1"
					max="5"
					step="0.05"
					value={building.ubat ?? ''}
					oninput={(e) => setUbat((e.target as HTMLInputElement).value)}
					placeholder="ex. 0.50"
					class="border-border bg-background mt-1 w-full rounded-sm border px-3 py-2 text-[14px]"
				/>
				<span class="text-text-dim mt-1 block text-[11.5px] leading-[1.4]">
					Coefficient moyen de transmission thermique de l'enveloppe (étude thermique / audit énergétique).
				</span>
			</label>
		{/if}
	</div>
</section>
