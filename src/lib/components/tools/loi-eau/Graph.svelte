<script lang="ts">
	import { sampleCurve, tDeparture } from '$lib/tools/loi-eau/calc';
	import type { ClimateZoneId, LoiEauParams } from '$lib/tools/loi-eau/types';
	import { getZone } from '$lib/tools/loi-eau/data';

	let {
		params,
		recommended,
		tExt,
		zone,
		showRecommended,
		emitterMaxT
	}: {
		params: LoiEauParams;
		recommended?: LoiEauParams;
		tExt: number;
		zone: ClimateZoneId;
		showRecommended: boolean;
		emitterMaxT: number;
	} = $props();

	const TX_MIN = -15;
	const TX_MAX = 20;
	const VIEW_W = 800;
	const VIEW_H = 460;
	const PAD = { top: 24, right: 28, bottom: 44, left: 52 };

	const innerW = VIEW_W - PAD.left - PAD.right;
	const innerH = VIEW_H - PAD.top - PAD.bottom;

	const yMin = 10;
	const yMax = $derived(Math.max(emitterMaxT + 10, params.tMax + 5, 50));

	function xToSvg(t: number): number {
		return PAD.left + ((t - TX_MIN) / (TX_MAX - TX_MIN)) * innerW;
	}
	function yToSvg(t: number): number {
		return PAD.top + innerH - ((t - yMin) / (yMax - yMin)) * innerH;
	}

	const curve = $derived(sampleCurve(params, TX_MIN, TX_MAX, 70));
	const curveRecommended = $derived(
		recommended ? sampleCurve(recommended, TX_MIN, TX_MAX, 70) : null
	);

	const pathMain = $derived.by(() => {
		const parts: string[] = [];
		for (let i = 0; i < curve.xs.length; i++) {
			parts.push(
				`${i === 0 ? 'M' : 'L'}${xToSvg(curve.xs[i]).toFixed(1)},${yToSvg(curve.ys[i]).toFixed(1)}`
			);
		}
		return parts.join(' ');
	});

	const pathArea = $derived.by(() => {
		const top: string[] = [];
		for (let i = 0; i < curve.xs.length; i++) {
			top.push(`${i === 0 ? 'M' : 'L'}${xToSvg(curve.xs[i]).toFixed(1)},${yToSvg(curve.ys[i]).toFixed(1)}`);
		}
		const xLast = xToSvg(curve.xs[curve.xs.length - 1]);
		const yBottom = yToSvg(yMin);
		const xFirst = xToSvg(curve.xs[0]);
		return `${top.join(' ')} L${xLast.toFixed(1)},${yBottom.toFixed(1)} L${xFirst.toFixed(1)},${yBottom.toFixed(1)} Z`;
	});

	const pathRecommended = $derived.by(() => {
		if (!curveRecommended) return '';
		const parts: string[] = [];
		for (let i = 0; i < curveRecommended.xs.length; i++) {
			parts.push(
				`${i === 0 ? 'M' : 'L'}${xToSvg(curveRecommended.xs[i]).toFixed(1)},${yToSvg(curveRecommended.ys[i]).toFixed(1)}`
			);
		}
		return parts.join(' ');
	});

	const zoneSpec = $derived(getZone(zone));
	const tExtBase = $derived(zoneSpec?.baseTemp ?? -7);
	const tFinChauffe = 17;

	const tDepNow = $derived(tDeparture(tExt, params));

	// X-axis ticks
	const xTicks = [-15, -10, -5, 0, 5, 10, 15, 20];
	// Y-axis ticks dynamiques
	const yTicks = $derived.by(() => {
		const span = yMax - yMin;
		const step = span > 60 ? 10 : 5;
		const out: number[] = [];
		for (let v = Math.ceil(yMin / step) * step; v <= yMax; v += step) out.push(v);
		return out;
	});
</script>

<div class="border-border bg-card overflow-hidden rounded-md border">
	<header class="border-border border-b px-4 py-2.5">
		<h3 class="font-mono text-[11.5px] tracking-[0.1em] uppercase">
			<span class="text-primary">§</span> courbe de chauffe
		</h3>
	</header>
	<div class="p-2">
		<svg
			viewBox="0 0 {VIEW_W} {VIEW_H}"
			class="block h-auto w-full"
			role="img"
			aria-label="Graphique de la loi d'eau : T° de départ en fonction de la T° extérieure"
			preserveAspectRatio="xMidYMid meet"
		>
			<!-- background -->
			<rect
				x={PAD.left}
				y={PAD.top}
				width={innerW}
				height={innerH}
				fill="var(--line-soft, #14181c)"
				fill-opacity="0.35"
			/>

			<!-- grid -->
			{#each xTicks as t (t)}
				<line
					x1={xToSvg(t)}
					y1={PAD.top}
					x2={xToSvg(t)}
					y2={PAD.top + innerH}
					stroke="var(--line-strong, #2a333a)"
					stroke-width="0.5"
					stroke-dasharray={t === 0 ? '' : '2 3'}
					opacity={t === 0 ? 0.6 : 0.35}
				/>
			{/each}
			{#each yTicks as t (t)}
				<line
					x1={PAD.left}
					y1={yToSvg(t)}
					x2={PAD.left + innerW}
					y2={yToSvg(t)}
					stroke="var(--line-strong, #2a333a)"
					stroke-width="0.5"
					stroke-dasharray="2 3"
					opacity="0.35"
				/>
			{/each}

			<!-- zone fonctionnement (area under curve) -->
			<path d={pathArea} fill="var(--primary, #6ce26c)" fill-opacity="0.06" />

			<!-- T° pivot / fin chauffe vertical -->
			<line
				x1={xToSvg(tFinChauffe)}
				y1={PAD.top}
				x2={xToSvg(tFinChauffe)}
				y2={PAD.top + innerH}
				stroke="var(--cyan, #67cae0)"
				stroke-width="1"
				stroke-dasharray="4 4"
				opacity="0.6"
			/>
			<text
				x={xToSvg(tFinChauffe) + 4}
				y={PAD.top + 12}
				font-size="10"
				font-family="JetBrains Mono Variable, monospace"
				fill="var(--cyan, #67cae0)"
			>
				fin chauffe ≈ {tFinChauffe}°C
			</text>

			<!-- T° ext base vertical -->
			<line
				x1={xToSvg(tExtBase)}
				y1={PAD.top}
				x2={xToSvg(tExtBase)}
				y2={PAD.top + innerH}
				stroke="var(--cyan, #67cae0)"
				stroke-width="1"
				stroke-dasharray="4 4"
				opacity="0.6"
			/>
			<text
				x={xToSvg(tExtBase) + 4}
				y={PAD.top + 26}
				font-size="10"
				font-family="JetBrains Mono Variable, monospace"
				fill="var(--cyan, #67cae0)"
			>
				T° base zone {zone} = {tExtBase > 0 ? '+' : ''}{tExtBase}°C
			</text>

			<!-- T° min / max horizontal -->
			<line
				x1={PAD.left}
				y1={yToSvg(params.tMax)}
				x2={PAD.left + innerW}
				y2={yToSvg(params.tMax)}
				stroke="var(--text-dim, #6a7682)"
				stroke-width="0.8"
				stroke-dasharray="6 4"
				opacity="0.5"
			/>
			<text
				x={PAD.left + innerW - 4}
				y={yToSvg(params.tMax) - 4}
				font-size="10"
				font-family="JetBrains Mono Variable, monospace"
				fill="var(--text-dim, #6a7682)"
				text-anchor="end"
			>
				T° max {params.tMax}°C
			</text>

			<line
				x1={PAD.left}
				y1={yToSvg(params.tMin)}
				x2={PAD.left + innerW}
				y2={yToSvg(params.tMin)}
				stroke="var(--text-dim, #6a7682)"
				stroke-width="0.8"
				stroke-dasharray="6 4"
				opacity="0.4"
			/>
			<text
				x={PAD.left + innerW - 4}
				y={yToSvg(params.tMin) - 4}
				font-size="10"
				font-family="JetBrains Mono Variable, monospace"
				fill="var(--text-dim, #6a7682)"
				text-anchor="end"
			>
				T° min {params.tMin}°C
			</text>

			<!-- Courbe recommandée (Pro) -->
			{#if showRecommended && pathRecommended}
				<path
					d={pathRecommended}
					fill="none"
					stroke="var(--text-soft, #b3bfc8)"
					stroke-width="1.5"
					stroke-dasharray="6 4"
					opacity="0.7"
				/>
			{/if}

			<!-- Courbe active -->
			<path
				d={pathMain}
				fill="none"
				stroke="var(--primary, #6ce26c)"
				stroke-width="2.5"
				stroke-linejoin="round"
				stroke-linecap="round"
			/>

			<!-- Point courant -->
			<line
				x1={xToSvg(tExt)}
				y1={PAD.top + innerH}
				x2={xToSvg(tExt)}
				y2={yToSvg(tDepNow)}
				stroke="var(--primary, #6ce26c)"
				stroke-width="1"
				stroke-dasharray="2 3"
				opacity="0.6"
			/>
			<line
				x1={PAD.left}
				y1={yToSvg(tDepNow)}
				x2={xToSvg(tExt)}
				y2={yToSvg(tDepNow)}
				stroke="var(--primary, #6ce26c)"
				stroke-width="1"
				stroke-dasharray="2 3"
				opacity="0.6"
			/>
			<circle
				cx={xToSvg(tExt)}
				cy={yToSvg(tDepNow)}
				r="6"
				fill="var(--primary, #6ce26c)"
				stroke="var(--background, #07090a)"
				stroke-width="2"
			/>

			<!-- Axe X labels -->
			{#each xTicks as t (t)}
				<text
					x={xToSvg(t)}
					y={PAD.top + innerH + 16}
					font-size="11"
					font-family="JetBrains Mono Variable, monospace"
					fill="var(--text-soft, #b3bfc8)"
					text-anchor="middle"
				>
					{t > 0 ? '+' : ''}{t}
				</text>
			{/each}
			<text
				x={PAD.left + innerW / 2}
				y={VIEW_H - 6}
				font-size="11"
				font-family="JetBrains Mono Variable, monospace"
				fill="var(--text-dim, #6a7682)"
				text-anchor="middle"
			>
				T° extérieure (°C)
			</text>

			<!-- Axe Y labels -->
			{#each yTicks as t (t)}
				<text
					x={PAD.left - 8}
					y={yToSvg(t) + 4}
					font-size="11"
					font-family="JetBrains Mono Variable, monospace"
					fill="var(--text-soft, #b3bfc8)"
					text-anchor="end"
				>
					{t}
				</text>
			{/each}
			<text
				x="14"
				y={PAD.top + innerH / 2}
				font-size="11"
				font-family="JetBrains Mono Variable, monospace"
				fill="var(--text-dim, #6a7682)"
				text-anchor="middle"
				transform="rotate(-90 14 {PAD.top + innerH / 2})"
			>
				T° départ (°C)
			</text>

			<!-- Frame -->
			<rect
				x={PAD.left}
				y={PAD.top}
				width={innerW}
				height={innerH}
				fill="none"
				stroke="var(--border, #1a2024)"
				stroke-width="1"
			/>

			<!-- Legend -->
			<g transform="translate({PAD.left + 8}, {PAD.top + 8})">
				<rect
					x="0"
					y="0"
					width={showRecommended ? 160 : 110}
					height={showRecommended ? 36 : 22}
					rx="3"
					fill="var(--card, #0d1113)"
					fill-opacity="0.85"
					stroke="var(--border)"
					stroke-width="0.5"
				/>
				<line x1="8" y1="12" x2="28" y2="12" stroke="var(--primary)" stroke-width="2.5" />
				<text
					x="34"
					y="15"
					font-size="10"
					font-family="JetBrains Mono Variable, monospace"
					fill="var(--text-soft, #b3bfc8)"
				>
					réglée
				</text>
				{#if showRecommended}
					<line
						x1="8"
						y1="28"
						x2="28"
						y2="28"
						stroke="var(--text-soft)"
						stroke-width="1.5"
						stroke-dasharray="4 3"
					/>
					<text
						x="34"
						y="31"
						font-size="10"
						font-family="JetBrains Mono Variable, monospace"
						fill="var(--text-soft, #b3bfc8)"
					>
						recommandée
					</text>
				{/if}
			</g>
		</svg>
	</div>
</div>
