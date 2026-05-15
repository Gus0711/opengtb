<script lang="ts">
	import { onMount } from 'svelte';
	import { replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import { getTool } from '$lib/tools/registry';
	import { CATEGORIES, getCategory, getUnit } from '$lib/tools/conv/data';
	import { convert, formatResult } from '$lib/tools/conv/convert';
	import type { Category } from '$lib/tools/conv/types';
	import ToolShell from '$lib/components/tools/ToolShell.svelte';
	import ArrowLeftRight from '@lucide/svelte/icons/arrow-left-right';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';

	const tool = getTool('conv')!;

	// Défaut : énergie kWh → MJ
	const initialCat = getCategory('energie')!;
	const initialFromId = initialCat.defaultUnit;
	const initialToId =
		initialCat.units[2]?.id ?? initialCat.units[1]?.id ?? initialCat.units[0].id;
	const initialFrom = getUnit(initialCat, initialFromId)!;
	const initialTo = getUnit(initialCat, initialToId)!;

	let cat = $state<Category>(initialCat);
	let fromUnitId = $state(initialFromId);
	let toUnitId = $state(initialToId);
	let fromValue = $state('1');
	let toValue = $state(formatResult(convert(1, initialFrom, initialTo)));

	const fromUnit = $derived(getUnit(cat, fromUnitId) ?? cat.units[0]);
	const toUnit = $derived(getUnit(cat, toUnitId) ?? cat.units[1] ?? cat.units[0]);

	// Calcul initial (et après recompute manuel)
	function recomputeTo() {
		const v = parseFloat(fromValue);
		if (!Number.isFinite(v)) {
			toValue = '';
			return;
		}
		toValue = formatResult(convert(v, fromUnit, toUnit));
	}
	function recomputeFrom() {
		const v = parseFloat(toValue);
		if (!Number.isFinite(v)) {
			fromValue = '';
			return;
		}
		fromValue = formatResult(convert(v, toUnit, fromUnit));
	}

	// Premier calcul + sync depuis l'URL (uniquement côté navigateur)
	onMount(() => {
		const sp = page.url.searchParams;
		const qCat = sp.get('cat');
		const qFrom = sp.get('from');
		const qTo = sp.get('to');
		const qValue = sp.get('value');

		const found = qCat ? getCategory(qCat) : null;
		if (found) {
			cat = found;
			const f = qFrom && getUnit(found, qFrom);
			const t = qTo && getUnit(found, qTo);
			fromUnitId = f ? f.id : found.defaultUnit;
			toUnitId = t ? t.id : found.units.find((u) => u.id !== fromUnitId)?.id ?? found.units[0].id;
		}
		if (qValue !== null && qValue !== '') fromValue = qValue;

		recomputeTo();
	});

	function pushUrl() {
		if (typeof window === 'undefined') return;
		const u = new URL(window.location.href);
		u.searchParams.set('cat', cat.slug);
		u.searchParams.set('from', fromUnitId);
		u.searchParams.set('to', toUnitId);
		u.searchParams.set('value', fromValue);
		replaceState(u, page.state);
	}

	function onFromValueInput(e: Event) {
		fromValue = (e.target as HTMLInputElement).value;
		recomputeTo();
		pushUrl();
	}
	function onToValueInput(e: Event) {
		toValue = (e.target as HTMLInputElement).value;
		recomputeFrom();
		pushUrl();
	}
	function onFromUnitChange(e: Event) {
		fromUnitId = (e.target as HTMLSelectElement).value;
		recomputeTo();
		pushUrl();
	}
	function onToUnitChange(e: Event) {
		toUnitId = (e.target as HTMLSelectElement).value;
		recomputeTo();
		pushUrl();
	}

	function selectCategory(slug: string) {
		const next = getCategory(slug);
		if (!next || next.slug === cat.slug) return;
		cat = next;
		fromUnitId = next.defaultUnit;
		toUnitId =
			next.units.find((u) => u.id !== fromUnitId)?.id ?? next.units[0].id;
		fromValue = '1';
		recomputeTo();
		pushUrl();
	}

	function swap() {
		const fv = fromValue;
		const tv = toValue;
		const fu = fromUnitId;
		const tu = toUnitId;
		fromValue = tv;
		toValue = fv;
		fromUnitId = tu;
		toUnitId = fu;
		// pas de recompute : l'inversion préserve l'égalité
		pushUrl();
	}

	function reset() {
		fromUnitId = cat.defaultUnit;
		toUnitId = cat.units.find((u) => u.id !== fromUnitId)?.id ?? cat.units[0].id;
		fromValue = '1';
		recomputeTo();
		pushUrl();
	}

	// Quelques exemples SEO long-tail, masqués visuellement (lecteurs d'écran + bots)
	const seoExamples = [
		'conversion kWh en BTU',
		'conversion kWh en MJ',
		'conversion bar en Pa',
		'conversion mmCE en Pa',
		'conversion m³/h en L/s',
		'conversion °C en °F',
		'conversion thermie en MJ',
		'conversion ft/min en m/s'
	];
</script>

<ToolShell
	{tool}
	seoTitle="Convertisseur d'unités CVC"
	seoDescription="Conversion d'unités pour la GTB : température, pression, débit, puissance, énergie, vitesse d'air, volume. Calculs locaux, sans inscription."
>
	<!-- Tabs catégories -->
	<div class="border-line-soft border-y" role="tablist" aria-label="Catégorie d'unité">
		<div class="-mx-1 flex gap-0.5 overflow-x-auto px-1 py-1.5">
			{#each CATEGORIES as c (c.slug)}
				{@const active = c.slug === cat.slug}
				<button
					type="button"
					role="tab"
					aria-selected={active}
					aria-controls="conv-panel"
					onclick={() => selectCategory(c.slug)}
					class="shrink-0 rounded px-3 py-1.5 font-mono text-[12.5px] whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
						{active
						? 'bg-primary text-primary-foreground'
						: 'text-text-soft hover:text-foreground hover:bg-secondary/60'}"
				>
					{c.name}
				</button>
			{/each}
		</div>
	</div>

	<div id="conv-panel" role="tabpanel" class="mt-6">
		<div class="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-end">
			<!-- Depuis -->
			<div>
				<label
					for="conv-from-value"
					class="text-text-soft mb-1.5 block font-mono text-[11.5px] tracking-wide uppercase"
				>
					Depuis
				</label>
				<div class="flex gap-2">
					<input
						id="conv-from-value"
						type="number"
						inputmode="decimal"
						step="any"
						value={fromValue}
						oninput={onFromValueInput}
						class="border-border bg-background focus-visible:ring-ring min-w-0 flex-1 rounded border px-3 py-2 font-mono text-base tabular-nums focus-visible:ring-2 focus-visible:outline-none"
						aria-label="Valeur de départ"
					/>
					<select
						aria-label="Unité de départ"
						value={fromUnitId}
						onchange={onFromUnitChange}
						class="border-border bg-background focus-visible:ring-ring rounded border px-2 py-2 font-mono text-sm focus-visible:ring-2 focus-visible:outline-none"
					>
						{#each cat.units as u (u.id)}
							<option value={u.id}>{u.label}</option>
						{/each}
					</select>
				</div>
			</div>

			<!-- Bouton swap -->
			<div class="flex justify-center md:pb-1">
				<button
					type="button"
					onclick={swap}
					class="border-border hover:border-primary hover:text-primary focus-visible:ring-ring text-text-soft inline-flex size-9 items-center justify-center rounded border transition-colors focus-visible:ring-2 focus-visible:outline-none"
					aria-label="Inverser les unités"
					title="Inverser les unités"
				>
					<ArrowLeftRight class="size-4" />
				</button>
			</div>

			<!-- Vers -->
			<div>
				<label
					for="conv-to-value"
					class="text-text-soft mb-1.5 block font-mono text-[11.5px] tracking-wide uppercase"
				>
					Vers
				</label>
				<div class="flex gap-2">
					<input
						id="conv-to-value"
						type="number"
						inputmode="decimal"
						step="any"
						value={toValue}
						oninput={onToValueInput}
						aria-live="polite"
						class="border-border bg-background focus-visible:ring-ring text-primary min-w-0 flex-1 rounded border px-3 py-2 font-mono text-base tabular-nums focus-visible:ring-2 focus-visible:outline-none"
						aria-label="Valeur convertie"
					/>
					<select
						aria-label="Unité d'arrivée"
						value={toUnitId}
						onchange={onToUnitChange}
						class="border-border bg-background focus-visible:ring-ring rounded border px-2 py-2 font-mono text-sm focus-visible:ring-2 focus-visible:outline-none"
					>
						{#each cat.units as u (u.id)}
							<option value={u.id}>{u.label}</option>
						{/each}
					</select>
				</div>
			</div>
		</div>

		<div class="mt-5 flex items-center gap-2">
			<button
				type="button"
				onclick={reset}
				class="text-text-soft hover:text-primary focus-visible:ring-ring inline-flex items-center gap-1.5 rounded px-2 py-1 font-mono text-[12px] transition-colors focus-visible:ring-2 focus-visible:outline-none"
			>
				<RotateCcw class="size-3.5" /> Effacer
			</button>
			<p class="text-text-dim ml-auto font-mono text-[11.5px]">
				{cat.units.length} unités · {cat.name.toLowerCase()}
			</p>
		</div>

		<!-- Live region invisible pour annoncer le résultat aux lecteurs d'écran -->
		<p class="sr-only" aria-live="polite" aria-atomic="true">
			{#if toValue !== '' && fromValue !== ''}
				{fromValue}
				{fromUnit.label} égale {toValue}
				{toUnit.label}
			{/if}
		</p>
	</div>

	<!-- SEO long-tail (caché visuellement, accessible au DOM et aux crawlers) -->
	<div class="sr-only">
		<h2>Conversions courantes en GTB</h2>
		<ul>
			{#each seoExamples as ex (ex)}
				<li>{ex}</li>
			{/each}
		</ul>
		<h2>Unités supportées</h2>
		<ul>
			{#each CATEGORIES as c (c.slug)}
				<li>{c.name} : {c.units.map((u) => u.label).join(', ')}</li>
			{/each}
		</ul>
	</div>
</ToolShell>
