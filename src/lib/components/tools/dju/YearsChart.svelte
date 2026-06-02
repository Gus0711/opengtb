<script lang="ts">
	import { MONTH_LABELS } from '$lib/tools/dju/data';
	import type { StationData } from '$lib/tools/dju/types';

	let {
		station,
		kind = 'heating',
		selectedYears,
		hasFilter
	}: {
		station: StationData;
		kind?: 'heating' | 'cooling';
		selectedYears: number[];
		hasFilter: boolean;
	} = $props();

	const VIEW_W = 800;
	const VIEW_H = 360;
	const PAD = { top: 16, right: 12, bottom: 32, left: 44 };
	const innerW = VIEW_W - PAD.left - PAD.right;
	const innerH = VIEW_H - PAD.top - PAD.bottom;

	// Palette accessible (Tailwind 400/500), espacée pour rester distincte.
	// Quand l'utilisateur sélectionne ≤ 8 années, chacune a sa propre couleur.
	const PALETTE = [
		'#22d3ee', // cyan-400
		'#fb923c', // orange-400
		'#a78bfa', // violet-400
		'#fbbf24', // amber-400
		'#f472b6', // pink-400
		'#34d399', // emerald-400
		'#60a5fa', // blue-400
		'#facc15' // yellow-400
	];

	function colorForYearIndex(i: number): string {
		return PALETTE[i % PALETTE.length];
	}

	// Hover : mois pointé par la souris (0..11) ou null
	let hoveredMonth = $state<number | null>(null);

	function onMove(e: MouseEvent) {
		const target = e.currentTarget as SVGRectElement;
		const svg = target.ownerSVGElement;
		if (!svg) return;
		const ctm = svg.getScreenCTM();
		if (!ctm) return;
		const pt = svg.createSVGPoint();
		pt.x = e.clientX;
		pt.y = e.clientY;
		const local = pt.matrixTransform(ctm.inverse());
		const t = (local.x - PAD.left) / innerW; // 0..1
		const m = Math.round(t * 11);
		hoveredMonth = Math.max(0, Math.min(11, m));
	}

	const monthsByYear = $derived.by(() => {
		const out = new Map<number, Array<number | null>>();
		for (const m of station.monthly) {
			const year = Number(m.date.slice(0, 4));
			const monthIdx = Number(m.date.slice(5, 7)) - 1;
			const val = kind === 'heating' ? m.djuH : m.djuC;
			if (!out.has(year)) out.set(year, Array(12).fill(null));
			out.get(year)![monthIdx] = val;
		}
		return out;
	});

	const yMax = $derived.by(() => {
		let max = 0;
		for (const [year, arr] of monthsByYear) {
			if (selectedYears.length > 0 && !selectedYears.includes(year)) continue;
			for (const v of arr) if (v != null && v > max) max = v;
		}
		// Inclure aussi la moyenne mensuelle pour le scaling
		for (const a of station.averages.monthly) {
			const v = kind === 'heating' ? a.djuH : a.djuC;
			if (v != null && v > max) max = v;
		}
		return Math.ceil(max / 100) * 100 || 100;
	});

	function xAt(monthIdx: number): number {
		return PAD.left + (monthIdx / 11) * innerW;
	}
	function yAt(v: number): number {
		return PAD.top + innerH - (v / yMax) * innerH;
	}

	function pathFor(values: Array<number | null>): string {
		const parts: string[] = [];
		let started = false;
		for (let i = 0; i < values.length; i++) {
			const v = values[i];
			if (v == null) {
				started = false;
				continue;
			}
			parts.push(`${started ? 'L' : 'M'}${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`);
			started = true;
		}
		return parts.join(' ');
	}

	const meanValues = $derived.by(() => {
		return station.averages.monthly.map((a) =>
			kind === 'heating' ? a.djuH : a.djuC
		);
	});

	const yearsToDraw = $derived.by(() => {
		const yrs = selectedYears.length > 0 ? selectedYears : [...monthsByYear.keys()];
		return yrs.sort((a, b) => a - b);
	});

	const yTicks = $derived.by(() => {
		const ticks: number[] = [];
		const step = yMax / 4;
		for (let i = 0; i <= 4; i++) ticks.push(Math.round(step * i));
		return ticks;
	});
</script>

<svg
	viewBox="0 0 {VIEW_W} {VIEW_H}"
	preserveAspectRatio="xMidYMid meet"
	class="w-full"
	role="img"
	aria-label="Courbes des DJU mensuels par année"
>
	<!-- Grille horizontale + axes Y -->
	{#each yTicks as t (t)}
		<line
			x1={PAD.left}
			x2={VIEW_W - PAD.right}
			y1={yAt(t)}
			y2={yAt(t)}
			stroke="currentColor"
			stroke-opacity="0.08"
			stroke-width="1"
		/>
		<text
			x={PAD.left - 6}
			y={yAt(t)}
			text-anchor="end"
			dominant-baseline="middle"
			class="fill-text-dim font-mono"
			font-size="10"
		>
			{t}
		</text>
	{/each}

	<!-- Axe X (mois) -->
	{#each MONTH_LABELS as label, i (label)}
		<text
			x={xAt(i)}
			y={VIEW_H - PAD.bottom + 16}
			text-anchor="middle"
			class="fill-text-dim font-mono"
			font-size="10"
		>
			{label}
		</text>
	{/each}

	<!-- Courbes par année -->
	{#each yearsToDraw as year, i (year)}
		{@const values = monthsByYear.get(year) ?? []}
		{#if hasFilter}
			<!-- Mode sélection : couleur dédiée, trait épais, points visibles -->
			<path
				d={pathFor(values)}
				fill="none"
				stroke={colorForYearIndex(i)}
				stroke-width="2"
				stroke-opacity="0.9"
			/>
			{#each values as v, mi (mi)}
				{#if v != null}
					<circle
						cx={xAt(mi)}
						cy={yAt(v)}
						r="2.5"
						fill={colorForYearIndex(i)}
						fill-opacity="0.95"
					>
						<title>{year} · {MONTH_LABELS[mi]} : {Math.round(v)} °C·j</title>
					</circle>
				{/if}
			{/each}
		{:else}
			<!-- Mode contexte : toutes années en arrière-plan, couleur uniforme -->
			<path
				d={pathFor(values)}
				fill="none"
				stroke="currentColor"
				stroke-opacity="0.28"
				stroke-width="1"
				class="text-primary"
			/>
		{/if}
	{/each}

	<!-- Courbe moyenne (épaisse, primary, toujours visible) -->
	<path
		d={pathFor(meanValues)}
		fill="none"
		stroke="currentColor"
		stroke-width="2.5"
		class="text-primary"
		stroke-opacity={hasFilter ? '0.55' : '1'}
	/>

	<!-- Points sur la moyenne -->
	{#each meanValues as v, i (i)}
		{#if v != null}
			<circle
				cx={xAt(i)}
				cy={yAt(v)}
				r={hasFilter ? 2 : 3}
				class="fill-primary"
				fill-opacity={hasFilter ? '0.55' : '1'}
			/>
		{/if}
	{/each}

	<!-- Overlay capture souris : couvre la zone graphe pour onmousemove -->
	<rect
		x={PAD.left}
		y={PAD.top}
		width={innerW}
		height={innerH}
		fill="transparent"
		style="cursor: crosshair"
		onmousemove={onMove}
		onmouseleave={() => (hoveredMonth = null)}
		role="presentation"
	/>

	<!-- Tooltip : ligne verticale + highlights + bulle -->
	{#if hoveredMonth !== null}
		{@const hm = hoveredMonth}
		{@const x = xAt(hm)}
		{@const meanV = meanValues[hm]}
		{@const rowsRaw = yearsToDraw.map((y, idx) => ({
			year: y,
			value: monthsByYear.get(y)?.[hm] ?? null,
			color: hasFilter ? colorForYearIndex(idx) : null
		}))}
		{@const rows = hasFilter
			? rowsRaw.filter((r) => r.value != null)
			: []}
		{@const lineCount = (meanV != null ? 1 : 0) + rows.length + 1}
		{@const tipW = 138}
		{@const tipH = 14 + lineCount * 14}
		{@const tipX = x + tipW + 12 < VIEW_W - PAD.right ? x + 10 : x - tipW - 10}
		{@const tipY = Math.max(PAD.top, Math.min(VIEW_H - PAD.bottom - tipH, PAD.top + innerH / 4))}

		<!-- Ligne verticale -->
		<line
			x1={x}
			y1={PAD.top}
			x2={x}
			y2={VIEW_H - PAD.bottom}
			stroke="currentColor"
			stroke-opacity="0.3"
			stroke-dasharray="3 3"
			class="text-primary"
			pointer-events="none"
		/>

		<!-- Halo sur les points du mois pointé -->
		{#if meanV != null}
			<circle cx={x} cy={yAt(meanV)} r="5" class="fill-primary" fill-opacity="0.25" pointer-events="none" />
		{/if}
		{#each rows as r (r.year)}
			{#if r.value != null}
				<circle cx={x} cy={yAt(r.value)} r="5" fill={r.color ?? 'currentColor'} fill-opacity="0.25" pointer-events="none" />
			{/if}
		{/each}

		<!-- Bulle tooltip -->
		<g transform="translate({tipX},{tipY})" pointer-events="none">
			<rect
				x="0"
				y="0"
				width={tipW}
				height={tipH}
				rx="3"
				class="fill-card stroke-line-strong"
				stroke-width="1"
				fill-opacity="0.97"
			/>
			<text x="8" y="14" class="fill-text-soft font-mono" font-size="10" font-weight="600">
				{MONTH_LABELS[hm]}
			</text>
			{#if meanV != null}
				<g transform="translate(8,{28})">
					<rect x="0" y="-7" width="10" height="2.5" class="fill-primary" />
					<text x="14" y="0" class="fill-text-soft font-mono" font-size="10" dominant-baseline="middle">
						moyenne
					</text>
					<text x={tipW - 16} y="0" text-anchor="end" class="fill-foreground font-mono" font-size="10" font-weight="600" dominant-baseline="middle">
						{Math.round(meanV)}
					</text>
				</g>
			{/if}
			{#each rows as r, i (r.year)}
				<g transform="translate(8,{28 + (meanV != null ? 1 : 0) * 14 + i * 14})">
					<rect x="0" y="-7" width="10" height="2.5" fill={r.color ?? 'currentColor'} />
					<text x="14" y="0" class="fill-text-soft font-mono" font-size="10" dominant-baseline="middle">
						{r.year}
					</text>
					<text x={tipW - 16} y="0" text-anchor="end" class="fill-foreground font-mono" font-size="10" font-weight="600" dominant-baseline="middle">
						{Math.round(r.value as number)}
					</text>
				</g>
			{/each}
			<text
				x={tipW - 8}
				y={tipH - 5}
				text-anchor="end"
				class="fill-text-dim font-mono"
				font-size="8"
			>
				°C·j
			</text>
		</g>
	{/if}
</svg>

<div class="text-text-dim mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[11px]">
	<span class="flex items-center gap-1.5">
		<span class="bg-primary inline-block h-[2.5px] w-5" style:opacity={hasFilter ? '0.55' : '1'}></span>
		moyenne ({station.averages.yearly.yearsCount} années)
	</span>
	{#if hasFilter}
		{#each yearsToDraw as year, i (year)}
			<span class="flex items-center gap-1.5">
				<span
					class="inline-block h-[2.5px] w-5"
					style:background-color={colorForYearIndex(i)}
				></span>
				{year}
			</span>
		{/each}
	{:else}
		<span class="flex items-center gap-1.5">
			<span class="bg-primary/28 inline-block h-[1px] w-5"></span>
			{yearsToDraw.length} année{yearsToDraw.length > 1 ? 's' : ''} (contexte)
		</span>
	{/if}
</div>
