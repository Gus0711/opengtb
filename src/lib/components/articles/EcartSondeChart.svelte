<script lang="ts">
	import { Tween } from 'svelte/motion';
	import { cubicOut } from 'svelte/easing';

	// Journée type simulée (pas de 15 min) sur une cassette plafonnière en
	// chauffage : inoccupation à 17 °C, relance à 6h, occupation 7h–19h à 21 °C.
	// `offset` = surchauffe vue par la sonde de reprise au plafond (stratification).
	type Point = { h: number; real: number; offset: number };

	const smooth = (x: number) => 1 / (1 + Math.exp(-x));

	const realAt = (h: number): number => {
		const night = 18.3 - 0.08 * (h < 6 ? h : 0);
		const relaunch = smooth((h - 6.8) * 3) * (21 - night);
		const evening = smooth((h - 19.5) * 1.6) * 2.4;
		const wobble = 0.18 * Math.sin(h * 1.7) + 0.08 * Math.sin(h * 4.3);
		return night + relaunch - evening + (h > 7.5 && h < 19.5 ? wobble : wobble * 0.3);
	};

	const offsetAt = (h: number): number => {
		const base = 1.2;
		const relaunchPeak = 2.1 * Math.exp(-((h - 7.2) ** 2) / 0.6);
		const occupied = smooth((h - 7) * 3) * (1 - smooth((h - 19.3) * 2)) * 1.3;
		const wobble = 0.15 * Math.sin(h * 2.3 + 1);
		return base + relaunchPeak + occupied + wobble;
	};

	const points: Point[] = Array.from({ length: 97 }, (_, i) => {
		const h = i / 4;
		return { h, real: realAt(h), offset: offsetAt(h) };
	});

	let reference = $state<'reprise' | 'telecommande'>('reprise');
	const k = new Tween(0, { duration: 700, easing: cubicOut });
	$effect(() => {
		k.target = reference === 'telecommande' ? 1 : 0;
	});

	const gtbOf = (p: Point) => p.real + p.offset * (1 - k.current);

	const occupied = points.filter((p) => p.h >= 8 && p.h <= 19);
	const meanGap = $derived(
		occupied.reduce((s, p) => s + p.offset, 0) / occupied.length * (1 - k.current)
	);
	const maxPoint = points.reduce((a, b) => (b.offset > a.offset ? b : a));
	const maxGap = $derived(maxPoint.offset * (1 - k.current));

	// Géométrie
	let width = $state(640);
	const height = $derived(width < 480 ? 220 : 270);
	const labels = $derived(width >= 480);
	const m = $derived({ top: 14, right: labels ? 96 : 12, bottom: 26, left: 34 });
	const Y_MIN = 16;
	const Y_MAX = 26;
	const x = (h: number) => m.left + (h / 24) * (width - m.left - m.right);
	const y = (t: number) => m.top + (1 - (t - Y_MIN) / (Y_MAX - Y_MIN)) * (height - m.top - m.bottom);

	const line = (get: (p: Point) => number) =>
		points.map((p, i) => `${i ? 'L' : 'M'}${x(p.h).toFixed(1)},${y(get(p)).toFixed(1)}`).join('');

	const realPath = $derived(line((p) => p.real));
	const gtbPath = $derived(line(gtbOf));
	const bandPath = $derived(
		line(gtbOf) +
			[...points]
				.reverse()
				.map((p) => `L${x(p.h).toFixed(1)},${y(p.real).toFixed(1)}`)
				.join('') +
			'Z'
	);

	const last = points[points.length - 1];

	// Survol
	let hover = $state<number | null>(null);
	const hp = $derived(hover === null ? null : points[hover]);

	const onMove = (e: PointerEvent) => {
		const svg = e.currentTarget as SVGSVGElement;
		const px = e.clientX - svg.getBoundingClientRect().left;
		const h = ((px - m.left) / (width - m.left - m.right)) * 24;
		hover = Math.max(0, Math.min(points.length - 1, Math.round(h * 4)));
	};

	const onKey = (e: KeyboardEvent) => {
		if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
		e.preventDefault();
		const step = e.shiftKey ? 4 : 1;
		const cur = hover ?? 0;
		hover = Math.max(0, Math.min(points.length - 1, cur + (e.key === 'ArrowRight' ? step : -step)));
	};

	const fmtH = (h: number) =>
		`${String(Math.floor(h) % 24).padStart(2, '0')}h${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;
	const fmtT = (t: number) => t.toFixed(1).replace('.', ',');
	const fmtGap = (t: number) => `${t >= 0.05 ? '+' : ''}${fmtT(Math.abs(t) < 0.05 ? 0 : t)}`;
</script>

<figure class="ec not-prose border-border bg-card my-8 rounded-md border p-4 md:p-5">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<p class="text-text-dim font-mono text-xs">
			<span class="text-primary">$</span> gtb trend --point Temp_Room
		</p>
		<div class="border-border flex rounded-md border font-mono text-xs" role="group" aria-label="Sonde de référence">
			<button
				type="button"
				class="px-3 py-1.5 transition-colors"
				class:active={reference === 'reprise'}
				aria-pressed={reference === 'reprise'}
				onclick={() => (reference = 'reprise')}>réf. reprise plafond</button
			>
			<button
				type="button"
				class="border-border border-l px-3 py-1.5 transition-colors"
				class:active={reference === 'telecommande'}
				aria-pressed={reference === 'telecommande'}
				onclick={() => (reference = 'telecommande')}>réf. télécommande</button
			>
		</div>
	</div>

	<div class="mt-4 grid grid-cols-2 gap-3">
		<div>
			<p class="text-text-dim font-mono text-[11px] uppercase tracking-wide">Écart moyen (8h–19h)</p>
			<p class="text-foreground font-mono text-2xl font-semibold tabular-nums">{fmtGap(meanGap)} °C</p>
		</div>
		<div>
			<p class="text-text-dim font-mono text-[11px] uppercase tracking-wide">Écart max · {fmtH(maxPoint.h)}</p>
			<p class="text-foreground font-mono text-2xl font-semibold tabular-nums">{fmtGap(maxGap)} °C</p>
		</div>
	</div>

	<div class="text-text-soft mt-3 flex flex-wrap gap-x-5 gap-y-1 font-mono text-xs">
		<span class="flex items-center gap-2"><span class="swatch" style="background: var(--c-gtb)"></span>Temp_Room remontée en GTB</span>
		<span class="flex items-center gap-2"><span class="swatch" style="background: var(--c-real)"></span>Télécommande murale (réel)</span>
	</div>

	<div class="relative mt-2" bind:clientWidth={width}>
		<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
		<svg
			{width}
			{height}
			role="img"
			aria-label="Courbe sur 24 h : la Temp_Room remontée en GTB dépasse la température réelle de la télécommande de 2 à 4 °C tant que la référence est la sonde de reprise. Utilisez les flèches gauche/droite pour parcourir les valeurs."
			tabindex="0"
			onpointermove={onMove}
			onpointerleave={() => (hover = null)}
			onkeydown={onKey}
			onblur={() => (hover = null)}
			class="block touch-pan-y outline-none"
		>
			{#each [16, 18, 20, 22, 24, 26] as t (t)}
				<line x1={m.left} x2={width - m.right} y1={y(t)} y2={y(t)} class="grid" />
				<text x={m.left - 6} y={y(t)} class="tick" text-anchor="end" dominant-baseline="middle">{t}°</text>
			{/each}
			{#each [0, 6, 12, 18, 24] as h (h)}
				<text x={x(h)} y={height - 8} class="tick" text-anchor="middle">{String(h % 24).padStart(2, '0')}h</text>
			{/each}

			<path d={bandPath} class="band" />
			<path d={realPath} class="ln" style="stroke: var(--c-real)" />
			<path d={gtbPath} class="ln" style="stroke: var(--c-gtb)" />

			{#if labels}
				<text x={x(24) + 8} y={y(gtbOf(last)) - 7} class="dlabel">GTB</text>
				<text x={x(24) + 8} y={y(last.real) + 9} class="dlabel">Télécommande</text>
			{/if}

			{#if hp}
				<line x1={x(hp.h)} x2={x(hp.h)} y1={m.top} y2={height - m.bottom} class="cross" />
				<circle cx={x(hp.h)} cy={y(gtbOf(hp))} r="4.5" class="dot" style="fill: var(--c-gtb)" />
				<circle cx={x(hp.h)} cy={y(hp.real)} r="4.5" class="dot" style="fill: var(--c-real)" />
			{/if}
		</svg>

		{#if hp}
			<div
				class="tip border-border bg-popover pointer-events-none absolute top-2 rounded-md border px-3 py-2 font-mono text-xs shadow-lg"
				style={x(hp.h) > width / 2 ? `right: ${width - x(hp.h) + 12}px` : `left: ${x(hp.h) + 12}px`}
			>
				<p class="text-text-dim">{fmtH(hp.h)}</p>
				<p class="text-foreground mt-1 flex items-center gap-2">
					<span class="swatch" style="background: var(--c-gtb)"></span>GTB
					<span class="ml-auto pl-4 tabular-nums">{fmtT(gtbOf(hp))} °C</span>
				</p>
				<p class="text-foreground flex items-center gap-2">
					<span class="swatch" style="background: var(--c-real)"></span>Réel
					<span class="ml-auto pl-4 tabular-nums">{fmtT(hp.real)} °C</span>
				</p>
				<p class="border-border text-text-soft mt-1 border-t pt-1">
					écart <span class="text-foreground float-right tabular-nums">{fmtGap(gtbOf(hp) - hp.real)} °C</span>
				</p>
			</div>
		{/if}
	</div>

	<details class="mt-3 font-mono text-xs">
		<summary class="text-text-dim hover:text-foreground cursor-pointer">voir les données (1 point / heure)</summary>
		<div class="mt-2 max-h-60 overflow-y-auto">
			<table class="w-full tabular-nums">
				<thead class="text-text-dim text-left">
					<tr><th class="py-1 font-normal">heure</th><th class="font-normal">GTB</th><th class="font-normal">réel</th><th class="font-normal">écart</th></tr>
				</thead>
				<tbody class="text-text-soft">
					{#each points.filter((_, i) => i % 4 === 0) as p (p.h)}
						<tr class="border-border border-t">
							<td class="py-1">{fmtH(p.h)}</td>
							<td>{fmtT(gtbOf(p))}</td>
							<td>{fmtT(p.real)}</td>
							<td>{fmtGap(gtbOf(p) - p.real)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</details>
	<figcaption class="text-text-dim mt-3 text-xs leading-relaxed">
		{#if reference === 'reprise'}
			Référence sur la sonde de reprise : la GTB affiche la température du plafond, <strong class="text-text-soft">2 à 4 °C au-dessus</strong> de la pièce. Pic à la relance du matin, quand la cassette souffle fort.
		{:else}
			Référence sur la télécommande : la <code>Temp_Room</code> remontée colle à la température réelle de la pièce. Ta supervision dit enfin la vérité.
		{/if}
		<br /><span class="italic">Journée type simulée à partir des écarts constatés sur site.</span>
	</figcaption>
</figure>

<style>
	/* Palette validée (contraste, daltonisme) sur fond carte clair et sombre */
	.ec {
		--c-real: #0f86b8;
		--c-gtb: #b07418;
	}
	:global(.dark) .ec {
		--c-real: #1e94c2;
		--c-gtb: #c4861f;
	}
	.active {
		background: var(--accent-glow);
		color: var(--primary);
	}
	button:not(.active) {
		color: var(--text-dim);
	}
	button:not(.active):hover {
		color: var(--foreground);
	}
	.swatch {
		display: inline-block;
		width: 10px;
		height: 10px;
		border-radius: 2px;
		flex: none;
	}
	.grid {
		stroke: var(--border);
		stroke-width: 1;
	}
	.tick {
		fill: var(--text-dim);
		font-family: var(--font-mono);
		font-size: 10.5px;
	}
	.dlabel {
		fill: var(--text-soft);
		font-family: var(--font-mono);
		font-size: 11px;
	}
	.ln {
		fill: none;
		stroke-width: 2;
		stroke-linejoin: round;
		stroke-linecap: round;
	}
	.band {
		fill: var(--amber-glow);
	}
	.cross {
		stroke: var(--line-strong);
		stroke-width: 1;
		stroke-dasharray: 3 3;
	}
	.dot {
		stroke: var(--card);
		stroke-width: 2;
	}
	svg:focus-visible {
		outline: 1px solid var(--ring);
		outline-offset: 2px;
		border-radius: 4px;
	}
	.tip {
		min-width: 150px;
	}
</style>
