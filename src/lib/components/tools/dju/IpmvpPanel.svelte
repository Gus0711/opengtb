<script lang="ts">
	import { buildBaseline, linearRegression, parseConsoInput } from '$lib/tools/dju/calc';
	import type {
		BaselinePoint,
		ParseConsoResult,
		RegressionResult,
		StationData
	} from '$lib/tools/dju/types';
	import Maximize2 from '@lucide/svelte/icons/maximize-2';
	import ChartZoomDialog from '$lib/components/ui/ChartZoomDialog.svelte';

	let { station }: { station: StationData } = $props();
	let scatterZoomOpen = $state(false);

	const PLACEHOLDER = `# colle 12 à 24 mois de conso, format YYYY-MM ; kWh
2023-01 ; 14200
2023-02 ; 12800
2023-03 ;  9100
2023-04 ;  6200
2023-05 ;  4100
2023-06 ;  3500
2023-07 ;  3400
2023-08 ;  3500
2023-09 ;  4400
2023-10 ;  7300
2023-11 ; 10500
2023-12 ; 13200`;

	let input = $state('');
	let parse = $state<ParseConsoResult | null>(null);
	let baseline = $state<{ points: BaselinePoint[]; missing: string[] } | null>(null);
	let reg = $state<RegressionResult | null>(null);
	let targetDju = $state<number>(0);

	function calibrate() {
		parse = parseConsoInput(input);
		if (parse.points.length === 0) {
			baseline = null;
			reg = null;
			return;
		}
		baseline = buildBaseline(station, parse.points);
		reg = linearRegression(baseline.points);
		if (reg && targetDju === 0) {
			targetDju = Math.round(station.averages.yearly.djuH ?? 2500);
		}
	}

	const targetConso = $derived.by(() => {
		if (!reg) return null;
		return reg.a * targetDju + reg.b;
	});

	const r2Quality = $derived.by(() => {
		if (!reg) return null;
		if (reg.r2 >= 0.85) return { label: 'excellent', cls: 'text-primary' };
		if (reg.r2 >= 0.7) return { label: 'correct', cls: 'text-text-soft' };
		return { label: 'faible', cls: 'text-amber-500' };
	});

	// Scatter SVG
	const VIEW_W = 480;
	const VIEW_H = 280;
	const PAD = { top: 12, right: 12, bottom: 32, left: 44 };
	const innerW = VIEW_W - PAD.left - PAD.right;
	const innerH = VIEW_H - PAD.top - PAD.bottom;

	const scale = $derived.by(() => {
		if (!baseline || baseline.points.length === 0) return null;
		const xs = baseline.points.map((p) => p.dju);
		const ys = baseline.points.map((p) => p.conso);
		const xMax = Math.max(...xs) * 1.1 || 500;
		const yMax = Math.max(...ys) * 1.1 || 1000;
		return { xMax, yMax };
	});

	function xAt(v: number): number {
		if (!scale) return PAD.left;
		return PAD.left + (v / scale.xMax) * innerW;
	}
	function yAt(v: number): number {
		if (!scale) return PAD.top + innerH;
		return PAD.top + innerH - (v / scale.yMax) * innerH;
	}
	const lineCoords = $derived.by(() => {
		if (!reg || !scale) return null;
		const x1 = 0;
		const x2 = scale.xMax;
		return {
			x1: xAt(x1),
			y1: yAt(reg.a * x1 + reg.b),
			x2: xAt(x2),
			y2: yAt(reg.a * x2 + reg.b)
		};
	});

	function fmtKwh(v: number | null): string {
		if (v == null) return '—';
		return Math.round(v).toLocaleString('fr-FR');
	}
</script>

<div class="border-line-soft bg-background/30 space-y-5 rounded-md border p-4">
	<header class="border-line-soft border-b pb-2.5">
		<h3 class="font-mono text-[12px] tracking-wide uppercase">
			<span class="text-text-dim">›</span>
			<span class="text-primary font-semibold">calibrage IPMVP (option C)</span>
		</h3>
		<p class="text-text-dim mt-1.5 text-[12.5px]">
			Colle 12 à 24 mois de consommation pour calibrer la signature énergétique
			<span class="font-mono">conso = A · DJU + B</span> de ton bâtiment, à partir des DJU réels
			de cette station.
		</p>
	</header>

	<div class="grid gap-4 lg:grid-cols-[1fr_1fr]">
		<!-- Saisie + bouton -->
		<div class="space-y-2">
			<label class="block">
				<span class="text-text-soft mb-1 block font-mono text-[10.5px] tracking-wide uppercase">
					Consos mensuelles (YYYY-MM ; kWh)
				</span>
				<textarea
					bind:value={input}
					placeholder={PLACEHOLDER}
					rows="14"
					spellcheck="false"
					class="border-line-strong bg-background focus:border-primary focus:ring-primary/30 w-full rounded-md border p-2.5 font-mono text-[12px] leading-relaxed focus:ring-2 focus:outline-none"
				></textarea>
			</label>
			<div class="flex flex-wrap items-center gap-3">
				<button
					type="button"
					onclick={calibrate}
					disabled={input.trim().length === 0}
					class="bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-line-strong disabled:text-text-dim rounded-md px-3.5 py-2 font-mono text-[12px] transition-colors"
				>
					calibrer
				</button>
				{#if parse}
					<span class="text-text-dim font-mono text-[11px]">
						{parse.points.length} mois lus
						{#if parse.errors.length > 0}
							· <span class="text-amber-500">{parse.errors.length} erreur{parse.errors.length > 1 ? 's' : ''}</span>
						{/if}
						{#if baseline && baseline.missing.length > 0}
							· <span class="text-amber-500">{baseline.missing.length} sans DJU</span>
						{/if}
					</span>
				{/if}
			</div>
			{#if parse && parse.errors.length > 0}
				<ul class="text-amber-500 list-disc pl-5 font-mono text-[11px]">
					{#each parse.errors as e (e)}
						<li>{e}</li>
					{/each}
				</ul>
			{/if}
			{#if baseline && baseline.missing.length > 0}
				<p class="text-amber-500 font-mono text-[11px]">
					DJU indisponibles pour : {baseline.missing.slice(0, 4).join(', ')}{baseline.missing
						.length > 4
						? '…'
						: ''}
				</p>
			{/if}
		</div>

		<!-- Résultat -->
		<div class="space-y-3">
			{#if reg && baseline && scale}
				<div class="grid grid-cols-2 gap-3">
					<div class="border-line-soft rounded-md border p-3">
						<div class="text-text-dim font-mono text-[10px] tracking-wide uppercase">
							A — pente
						</div>
						<div class="text-primary font-mono text-xl font-semibold">
							{reg.a.toFixed(2)}
							<span class="text-text-dim text-[11px]">kWh/DJU</span>
						</div>
					</div>
					<div class="border-line-soft rounded-md border p-3">
						<div class="text-text-dim font-mono text-[10px] tracking-wide uppercase">
							B — conso fixe
						</div>
						<div class="font-mono text-xl font-semibold">
							{fmtKwh(reg.b)}
							<span class="text-text-dim text-[11px]">kWh/mois</span>
						</div>
					</div>
					<div class="border-line-soft rounded-md border p-3">
						<div class="text-text-dim font-mono text-[10px] tracking-wide uppercase">
							R² — ajustement
						</div>
						<div class="font-mono text-xl font-semibold">
							{reg.r2.toFixed(3)}
							{#if r2Quality}
								<span class="text-[11px] {r2Quality.cls}">— {r2Quality.label}</span>
							{/if}
						</div>
					</div>
					<div class="border-line-soft rounded-md border p-3">
						<div class="text-text-dim font-mono text-[10px] tracking-wide uppercase">
							n — mois utilisés
						</div>
						<div class="font-mono text-xl font-semibold">
							{reg.n}
							{#if reg.n < 12}
								<span class="text-amber-500 text-[11px]">— insuffisant</span>
							{/if}
						</div>
					</div>
				</div>

				{#if reg.r2 < 0.7}
					<p class="text-amber-500 border-amber-500/30 bg-amber-500/5 rounded-md border p-2.5 font-mono text-[11.5px]">
						R² {reg.r2.toFixed(2)} : la corrélation conso↔DJU est faible. Vérifie qu'il n'y a pas
						de mois aberrants (panne, travaux, occupation atypique) ou que la baseline couvre bien
						un cycle complet.
					</p>
				{/if}

				<!-- Scatter -->
				{#snippet scatterSvg(extraClass: string)}
					<svg
						viewBox="0 0 {VIEW_W} {VIEW_H}"
						preserveAspectRatio="xMidYMid meet"
						class={extraClass}
						role="img"
						aria-label="Signature énergétique : conso mensuelle vs DJU"
					>
						<!-- Axes -->
						<line
							x1={PAD.left}
							y1={PAD.top}
							x2={PAD.left}
							y2={VIEW_H - PAD.bottom}
							stroke="currentColor"
							stroke-opacity="0.2"
						/>
						<line
							x1={PAD.left}
							y1={VIEW_H - PAD.bottom}
							x2={VIEW_W - PAD.right}
							y2={VIEW_H - PAD.bottom}
							stroke="currentColor"
							stroke-opacity="0.2"
						/>
						<!-- Labels axes -->
						<text
							x={(PAD.left + VIEW_W - PAD.right) / 2}
							y={VIEW_H - 6}
							text-anchor="middle"
							class="fill-text-dim font-mono"
							font-size="9"
						>
							DJU (mois)
						</text>
						<text
							x="6"
							y={(PAD.top + VIEW_H - PAD.bottom) / 2}
							text-anchor="middle"
							transform="rotate(-90 6,{(PAD.top + VIEW_H - PAD.bottom) / 2})"
							class="fill-text-dim font-mono"
							font-size="9"
						>
							kWh
						</text>
						<text
							x={PAD.left - 4}
							y={yAt(scale!.yMax)}
							text-anchor="end"
							dominant-baseline="hanging"
							class="fill-text-dim font-mono"
							font-size="9"
						>
							{fmtKwh(scale!.yMax)}
						</text>
						<text
							x={xAt(scale!.xMax)}
							y={VIEW_H - PAD.bottom + 12}
							text-anchor="end"
							class="fill-text-dim font-mono"
							font-size="9"
						>
							{Math.round(scale!.xMax)}
						</text>

						<!-- Droite ajustée -->
						{#if lineCoords}
							<line
								x1={lineCoords.x1}
								y1={lineCoords.y1}
								x2={lineCoords.x2}
								y2={lineCoords.y2}
								class="stroke-primary"
								stroke-width="1.5"
								stroke-opacity="0.7"
							/>
						{/if}

						<!-- Points -->
						{#each baseline!.points as p (p.yearMonth)}
							<circle
								cx={xAt(p.dju)}
								cy={yAt(p.conso)}
								r="3"
								class="fill-primary"
								fill-opacity="0.8"
							>
								<title>{p.yearMonth} — DJU {Math.round(p.dju)}, conso {fmtKwh(p.conso)} kWh</title>
							</circle>
						{/each}
					</svg>
				{/snippet}

				<div class="relative">
					{@render scatterSvg('border-line-soft w-full rounded-md border bg-card')}
					<button
						type="button"
						onclick={() => (scatterZoomOpen = true)}
						class="border-line-strong bg-card/80 hover:border-primary hover:text-primary text-text-soft absolute top-2 right-2 inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-[10.5px] backdrop-blur-sm transition-colors"
						title="Agrandir le graphique"
						aria-label="Agrandir le graphique"
					>
						<Maximize2 class="size-3" /> agrandir
					</button>
				</div>

				<ChartZoomDialog
					bind:open={scatterZoomOpen}
					title="signature énergétique"
					subtitle="{station.name} · {station.deptName} · conso = A·DJU + B (R² = {reg.r2.toFixed(3)}, n = {reg.n})"
				>
					{@render scatterSvg('h-full w-full')}
				</ChartZoomDialog>

				<!-- Cible pour un DJU donné -->
				<div class="border-line-soft border-t pt-3">
					<div class="text-text-soft mb-2 font-mono text-[10.5px] tracking-wide uppercase">
						Conso cible
					</div>
					<div class="flex flex-wrap items-end gap-3">
						<label class="block">
							<span class="text-text-dim block font-mono text-[10px]">pour DJU =</span>
							<input
								type="number"
								bind:value={targetDju}
								min="0"
								step="50"
								class="border-line-strong bg-background focus:border-primary focus:ring-primary/30 w-28 rounded-md border px-2 py-1.5 text-right font-mono text-sm focus:ring-2 focus:outline-none"
							/>
						</label>
						<span class="text-text-dim font-mono text-xl leading-none">=</span>
						<div>
							<div class="text-primary font-mono text-2xl font-semibold leading-none">
								{fmtKwh(targetConso)}
								<span class="text-text-dim text-[12px] font-normal">kWh</span>
							</div>
							<div class="text-text-dim mt-0.5 font-mono text-[10px]">
								= {reg.a.toFixed(2)} × {targetDju} + {fmtKwh(reg.b)}
							</div>
						</div>
					</div>
				</div>
			{:else if input.trim().length === 0}
				<p class="text-text-dim border-line-soft flex h-full min-h-32 items-center justify-center rounded-md border border-dashed font-mono text-[12px]">
					Saisir les consos et cliquer « calibrer ».
				</p>
			{:else if parse && parse.points.length === 0}
				<p class="text-amber-500 font-mono text-[12px]">
					Aucune ligne exploitable. Vérifie le format (ex : <span class="font-mono">2023-01;14200</span>).
				</p>
			{/if}
		</div>
	</div>
</div>
