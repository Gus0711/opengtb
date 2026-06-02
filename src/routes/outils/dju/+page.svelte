<script lang="ts">
	import { getTool } from '$lib/tools/registry';
	import ToolShell from '$lib/components/tools/ToolShell.svelte';
	import SearchPanel from '$lib/components/tools/dju/SearchPanel.svelte';
	import YearsChart from '$lib/components/tools/dju/YearsChart.svelte';
	import MonthlyTable from '$lib/components/tools/dju/MonthlyTable.svelte';
	import IpmvpPanel from '$lib/components/tools/dju/IpmvpPanel.svelte';
	import AboutPanel from '$lib/components/tools/dju/AboutPanel.svelte';
	import {
		STATIONS,
		getStation,
		isDataAvailable,
		loadStationData
	} from '$lib/tools/dju/data';
	import { allYears, buildCsv, completeYears, recomputeWithBases } from '$lib/tools/dju/calc';
	import type { StationData } from '$lib/tools/dju/types';
	import Download from '@lucide/svelte/icons/download';
	import Flame from '@lucide/svelte/icons/flame';
	import Snowflake from '@lucide/svelte/icons/snowflake';
	import AlertTriangle from '@lucide/svelte/icons/triangle-alert';
	import Maximize2 from '@lucide/svelte/icons/maximize-2';
	import { TOTAL_YEARS_TARGET } from '$lib/tools/dju/data';
	import ChartZoomDialog from '$lib/components/ui/ChartZoomDialog.svelte';

	let yearsZoomOpen = $state(false);

	const tool = getTool('dju')!;

	let query = $state('');
	let selectedId = $state<string | null>(null);
	let kind = $state<'heating' | 'cooling'>('heating');
	let baseH = $state(18);
	let baseC = $state(24);
	let rawData = $state<StationData | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let yearFilter = $state<Set<number>>(new Set());

	const selectedStation = $derived(selectedId ? getStation(selectedId) : null);
	const dataAvailable = $derived(selectedId ? isDataAvailable(selectedId) : false);
	// Recalcule les DJU avec les bases courantes (en mémoire, O(n) sur ~200 mois)
	const data = $derived(rawData ? recomputeWithBases(rawData, baseH, baseC) : null);
	// Toutes années pour la consultation (graphe + table + chips) — inclut les partielles
	const allYearsInfo = $derived(data ? allYears(data) : []);
	const yearsAvail = $derived(allYearsInfo.map((y) => y.year));
	// Années complètes uniquement pour la moyenne et l'IPMVP (calcul honnête)
	const completeYearsList = $derived(data ? completeYears(data) : []);
	const filteredYears = $derived.by(() => {
		const all = yearsAvail;
		const filtered = all.filter((y) => yearFilter.has(y));
		return filtered.length > 0 ? filtered : all;
	});

	$effect(() => {
		const id = selectedId;
		if (!id || !dataAvailable) {
			rawData = null;
			return;
		}
		loading = true;
		error = null;
		loadStationData(id)
			.then((d) => {
				rawData = d;
				// Réinitialise le filtre années à "toutes" à chaque changement de station
				yearFilter = new Set();
			})
			.catch((err) => {
				error = err instanceof Error ? err.message : String(err);
				rawData = null;
			})
			.finally(() => {
				loading = false;
			});
	});

	function toggleYear(y: number) {
		const next = new Set(yearFilter);
		if (next.has(y)) next.delete(y);
		else next.add(y);
		yearFilter = next;
	}

	function exportCsv() {
		if (!data) return;
		const years = filteredYears.length === yearsAvail.length ? undefined : filteredYears;
		const csv = buildCsv(data, years);
		const baseLabel = kind === 'heating' ? `base${data.baseHeating}` : `base${data.baseCooling}`;
		const filename = `dju_${data.id}_${data.dept}_${kind}_${baseLabel}.csv`;
		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	const meanDju = $derived.by(() => {
		if (!data) return null;
		return kind === 'heating' ? data.averages.yearly.djuH : data.averages.yearly.djuC;
	});

	// Années récentes incomplètes (hors année en cours, qui n'est jamais complète).
	// Sert à informer l'utilisateur que la moyenne s'appuie sur < 16 ans.
	const currentYear = new Date().getFullYear();
	const incompleteYearsInfo = $derived.by(() => {
		if (!data) return null;
		const past = data.yearly.filter((y) => y.year < currentYear && !y.complete);
		const missing = past.filter((y) => y.monthsCovered === 0).map((y) => y.year);
		const partial = past
			.filter((y) => y.monthsCovered > 0)
			.map((y) => ({ year: y.year, months: y.monthsCovered }));
		return past.length === 0 ? null : { missing, partial };
	});
</script>

<ToolShell {tool}>
	<div class="grid gap-6 lg:grid-cols-[320px_1fr]">
		<!-- Panneau gauche : recherche -->
		<aside class="border-line-soft bg-card space-y-5 rounded-md border p-4">
			<header class="border-line-soft border-b pb-2.5">
				<h2 class="font-mono text-[12px] tracking-wide uppercase">
					<span class="text-text-dim">›</span>
					<span class="text-primary font-semibold">localisation</span>
				</h2>
			</header>
			<SearchPanel bind:query bind:selected={selectedId} />

			{#if selectedStation && !dataAvailable}
				<p class="text-amber-500 font-mono text-[11.5px]">
					Données en cours de mise à jour pour cette station. Réessaie plus tard.
				</p>
			{/if}

			<div class="text-text-dim border-line-soft border-t pt-3 font-mono text-[10.5px] leading-snug">
				{STATIONS.length} stations couvrant la France métropolitaine.
				Voir « méthodologie » en bas de page pour la source et la mise à jour.
			</div>
		</aside>

		<!-- Panneau droit : résultats -->
		<section class="space-y-6">
			{#if !selectedStation}
				<div class="border-line-soft text-text-dim flex h-64 items-center justify-center rounded-md border border-dashed font-mono text-[12.5px]">
					Saisir un code postal ou un département pour démarrer.
				</div>
			{:else if loading}
				<div class="border-line-soft text-text-dim flex h-64 items-center justify-center rounded-md border font-mono text-[12.5px]">
					Chargement des DJU…
				</div>
			{:else if error}
				<div class="border-line-soft text-amber-500 flex h-64 items-center justify-center rounded-md border font-mono text-[12.5px]">
					{error}
				</div>
			{:else if data}
				{#snippet yearChips(large: boolean = false)}
					{#if yearsAvail.length > 0}
						{@const labelCls = large
							? 'text-text-dim mr-2 self-center font-mono text-[13px]'
							: 'text-text-dim mr-1 self-center font-mono text-[10.5px]'}
						{@const btnSizeCls = large ? 'px-2.5 py-1 text-[14px]' : 'px-2 py-0.5 text-[11px]'}
						{@const resetCls = large
							? 'text-text-dim hover:text-primary px-2 py-1 font-mono text-[13px] transition-colors'
							: 'text-text-dim hover:text-primary px-2 py-0.5 font-mono text-[11px] transition-colors'}
						<div class="flex flex-wrap items-center {large ? 'gap-2' : 'gap-1.5'}">
							<span class={labelCls}>filtrer :</span>
							{#each allYearsInfo as y (y.year)}
								{@const active = yearFilter.has(y.year)}
								<button
									type="button"
									onclick={() => toggleYear(y.year)}
									class="border-line-strong rounded border font-mono transition-colors {btnSizeCls} {active
										? 'bg-primary text-primary-foreground border-primary'
										: 'text-text-soft hover:text-foreground hover:border-primary/50'}"
									aria-pressed={active}
									title={y.complete
										? `${y.year} : année complète`
										: `${y.year} : ${y.monthsCovered}/12 mois — exclue de la moyenne`}
								>
									{y.year}{#if !y.complete}<span class="text-text-dim ml-1">·{y.monthsCovered}/12</span>{/if}
								</button>
							{/each}
							{#if yearFilter.size > 0}
								<button
									type="button"
									onclick={() => (yearFilter = new Set())}
									class={resetCls}
								>
									réinitialiser
								</button>
							{/if}
						</div>
					{/if}
				{/snippet}

				<!-- En-tête station + KPI principal -->
				<div class="border-line-soft bg-card rounded-md border p-5">
					<div class="flex flex-wrap items-baseline justify-between gap-3">
						<div>
							<h2 class="font-mono text-xl font-semibold">
								{data.name}
								<span class="text-text-dim font-normal">— {data.deptName}</span>
							</h2>
							<p class="text-text-dim mt-0.5 font-mono text-[11.5px]">
								id {data.id} · alt {data.alt} m · lat {data.lat.toFixed(2)} · lon {data.lon.toFixed(2)} ·
								période {data.period.start.slice(0, 7)} → {data.period.end.slice(0, 7)} ·
								{data.averages.yearly.yearsCount} années complètes
							</p>
						</div>

						<!-- Toggle chauffage/clim + bases ajustables -->
						<div class="flex flex-wrap items-center gap-3">
							<div class="border-line-strong inline-flex rounded-md border p-0.5 font-mono text-[11.5px]">
								<button
									type="button"
									onclick={() => (kind = 'heating')}
									class="flex items-center gap-1.5 rounded px-2.5 py-1 transition-colors {kind ===
									'heating'
										? 'bg-primary text-primary-foreground'
										: 'text-text-soft hover:text-foreground'}"
								>
									<Flame class="size-3" /> chauffage
								</button>
								<button
									type="button"
									onclick={() => (kind = 'cooling')}
									class="flex items-center gap-1.5 rounded px-2.5 py-1 transition-colors {kind ===
									'cooling'
										? 'bg-primary text-primary-foreground'
										: 'text-text-soft hover:text-foreground'}"
								>
									<Snowflake class="size-3" /> clim
								</button>
							</div>
						</div>
					</div>

					<!-- Bases ajustables -->
					<div class="border-line-soft text-text-soft mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-3 font-mono text-[11px]">
						<span class="text-text-dim tracking-wide uppercase text-[10px]">bases :</span>
						<label class="flex items-center gap-1.5">
							<Flame class="text-text-dim size-3" />
							<span>chauffage</span>
							<input
								type="number"
								bind:value={baseH}
								min="0"
								max="30"
								step="1"
								class="border-line-strong bg-background focus:border-primary focus:ring-primary/30 w-14 rounded-sm border px-1.5 py-0.5 text-right font-mono text-[11px] focus:ring-1 focus:outline-none"
							/>
							<span class="text-text-dim">°C</span>
						</label>
						<label class="flex items-center gap-1.5">
							<Snowflake class="text-text-dim size-3" />
							<span>clim</span>
							<input
								type="number"
								bind:value={baseC}
								min="0"
								max="40"
								step="1"
								class="border-line-strong bg-background focus:border-primary focus:ring-primary/30 w-14 rounded-sm border px-1.5 py-0.5 text-right font-mono text-[11px] focus:ring-1 focus:outline-none"
							/>
							<span class="text-text-dim">°C</span>
						</label>
						{#if baseH !== 18 || baseC !== 24}
							<button
								type="button"
								onclick={() => {
									baseH = 18;
									baseC = 24;
								}}
								class="text-text-dim hover:text-primary ml-auto text-[10.5px] tracking-wide uppercase transition-colors"
							>
								réinitialiser
							</button>
						{:else}
							<span class="text-text-dim ml-auto text-[10.5px]">
								valeurs standard France
							</span>
						{/if}
					</div>

					<!-- KPI principal -->
					<div class="border-line-soft mt-5 grid gap-3 border-t pt-4 sm:grid-cols-3">
						<div>
							<div class="text-text-dim font-mono text-[10.5px] tracking-wide uppercase">
								DJU annuel moyen
							</div>
							<div class="text-primary mt-1 font-mono text-3xl font-semibold leading-none">
								{meanDju == null ? '—' : Math.round(meanDju).toLocaleString('fr-FR')}
							</div>
							<div class="text-text-dim mt-1 font-mono text-[10.5px]">
								°C·j base {kind === 'heating' ? data.baseHeating : data.baseCooling} °C
							</div>
						</div>
						<div>
							<div class="text-text-dim font-mono text-[10.5px] tracking-wide uppercase">
								T moyenne annuelle
							</div>
							<div class="mt-1 font-mono text-3xl font-semibold leading-none">
								{data.averages.yearly.tMean ?? '—'}
								<span class="text-text-dim text-base">°C</span>
							</div>
						</div>
						<div>
							<div class="text-text-dim font-mono text-[10.5px] tracking-wide uppercase">
								Mise à jour
							</div>
							<div class="text-text-soft mt-1 font-mono text-[13px]">
								{new Date(data.updatedAt).toLocaleDateString('fr-FR')}
							</div>
						</div>
					</div>
				</div>

				{#if incompleteYearsInfo}
					<div class="border-amber-500/40 bg-amber-500/5 rounded-md border p-4">
						<div class="flex items-start gap-3">
							<AlertTriangle class="text-amber-500 mt-0.5 size-4 shrink-0" />
							<div class="min-w-0 flex-1 font-mono text-[11.5px] leading-relaxed">
								<p class="text-amber-500 font-medium">
									Historique partiel pour cette station ({data.averages.yearly.yearsCount}/{TOTAL_YEARS_TARGET} années complètes)
								</p>
								<p class="text-text-soft mt-1">
									Météo-France ne fournit pas toutes les mensuelles 2010 → {currentYear - 1} sur ce point.
									{#if incompleteYearsInfo.missing.length > 0}
										Aucune donnée pour {incompleteYearsInfo.missing.join(', ')}.
									{/if}
									{#if incompleteYearsInfo.partial.length > 0}
										Mois manquants en {#each incompleteYearsInfo.partial as p, i (p.year)}{p.year}&nbsp;({p.months}/12){i < incompleteYearsInfo.partial.length - 1 ? ', ' : ''}{/each}.
									{/if}
									La moyenne et la régression IPMVP ne prennent en compte que les années complètes.
								</p>
							</div>
						</div>
					</div>
				{/if}

				<!-- Graphique courbes années -->
				<div class="border-line-soft bg-card rounded-md border p-5">
					<header class="border-line-soft mb-4 flex items-baseline justify-between gap-3 border-b pb-2.5">
						<h3 class="font-mono text-[12px] tracking-wide uppercase">
							<span class="text-text-dim">›</span>
							<span class="text-primary font-semibold">courbes mensuelles</span>
						</h3>
						<div class="flex items-baseline gap-3">
							<span class="text-text-dim font-mono text-[10.5px]">
								{kind === 'heating' ? 'DJU chauffage' : 'DJU clim'} · {filteredYears.length} année{filteredYears.length > 1 ? 's' : ''}
							</span>
							<button
								type="button"
								onclick={() => (yearsZoomOpen = true)}
								class="border-line-strong hover:border-primary hover:text-primary text-text-soft inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[10.5px] transition-colors"
								title="Agrandir le graphique"
								aria-label="Agrandir le graphique"
							>
								<Maximize2 class="size-3" /> agrandir
							</button>
						</div>
					</header>
					<YearsChart
						station={data}
						{kind}
						selectedYears={filteredYears.length === yearsAvail.length ? [] : filteredYears}
						hasFilter={yearFilter.size > 0}
					/>

					<div class="mt-4">
						{@render yearChips(false)}
					</div>
				</div>

				<!-- Tableau mensuel -->
				<div class="border-line-soft bg-card rounded-md border p-5">
					<header class="border-line-soft mb-4 flex items-baseline justify-between border-b pb-2.5">
						<h3 class="font-mono text-[12px] tracking-wide uppercase">
							<span class="text-text-dim">›</span>
							<span class="text-primary font-semibold">détail mois × année</span>
						</h3>
						<button
							type="button"
							onclick={exportCsv}
							class="border-line-strong hover:border-primary hover:text-primary inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 font-mono text-[11.5px] transition-colors"
						>
							<Download class="size-3.5" />
							exporter CSV
						</button>
					</header>
					<MonthlyTable station={data} {kind} years={filteredYears} />
				</div>

				<!-- Calibrage IPMVP (régression linéaire conso = A·DJU + B) -->
				<IpmvpPanel station={data} />

				<!-- Méthodologie + mise à jour -->
				<AboutPanel station={data} />

				<!-- Zoom plein écran des courbes mensuelles -->
				<ChartZoomDialog
					bind:open={yearsZoomOpen}
					title="courbes mensuelles"
					subtitle="{data.name} · {data.deptName} · {kind === 'heating' ? 'DJU chauffage' : 'DJU clim'} · {filteredYears.length} année{filteredYears.length > 1 ? 's' : ''}"
				>
					<div class="flex h-full flex-col gap-4">
						<div class="min-h-0 flex-1">
							<YearsChart
								station={data}
								{kind}
								selectedYears={filteredYears.length === yearsAvail.length ? [] : filteredYears}
								hasFilter={yearFilter.size > 0}
							/>
						</div>
						<div class="shrink-0">
							{@render yearChips(true)}
						</div>
					</div>
				</ChartZoomDialog>
			{/if}
		</section>
	</div>
</ToolShell>
