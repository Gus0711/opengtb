<script lang="ts">
	import { onMount } from 'svelte';
	import { replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import { getTool } from '$lib/tools/registry';
	import ToolShell from '$lib/components/tools/ToolShell.svelte';
	import {
		calculerDebit,
		calculerDeltaT,
		calculerPuissance,
		dimensionnerV3V,
		proprietesFluide
	} from '$lib/tools/v3v/calc';
	import { validateInputs } from '$lib/tools/v3v/validators';
	import { DN_LIST, FLUIDES } from '$lib/tools/v3v/constants';
	import type { FluidId, V3VInputs, V3VResult, Verdict } from '$lib/tools/v3v/types';
	import Copy from '@lucide/svelte/icons/copy';
	import Check from '@lucide/svelte/icons/check';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import Info from '@lucide/svelte/icons/info';
	import Calculator from '@lucide/svelte/icons/calculator';

	const tool = getTool('v3v')!;

	type PQDT = 'puissance' | 'debit' | 'deltaT';
	type Mode = 'auto' | 'manuel';

	// Pré-calcul SSR pour éviter un flash de champ vide avant l'hydratation
	// (les $effect ne tournent que côté client).
	const _initEau = proprietesFluide('eau', 0);
	const _initQ = calculerDebit(100, 20, _initEau.coefVolumique); // ≈ 4.299 m³/h

	let puissance = $state('100');
	let debit = $state(_initQ.toFixed(3).replace(/\.?0+$/, ''));
	let deltaT = $state('20');
	let mode = $state<Mode>('auto');

	// Suivi du timestamp d'édition de chaque champ — le champ auto-calculé est
	// toujours le moins récemment touché en mode 'auto'.
	let lastEditedAt = $state<Record<PQDT, number>>({ debit: 0, puissance: 1, deltaT: 2 });
	let editTick = 3;

	const autoField = $derived.by<PQDT | null>(() => {
		if (mode !== 'auto') return null;
		let min: PQDT = 'debit';
		let minV = Infinity;
		for (const f of ['puissance', 'debit', 'deltaT'] as PQDT[]) {
			if (lastEditedAt[f] < minV) {
				minV = lastEditedAt[f];
				min = f;
			}
		}
		return min;
	});

	function markEdited(field: PQDT) {
		if (mode !== 'auto') return;
		lastEditedAt = { ...lastEditedAt, [field]: editTick++ };
	}
	let fluide = $state<FluidId>('eau');
	let glycolPct = $state('30');
	let dpr = $state('20');
	let autoriteCible = $state('0.5');
	let dnTuyauterie = $state('');
	let dpvMax = $state('');
	let temperature = $state('70');

	const num = (s: string): number | undefined => {
		if (s === '' || s === null) return undefined;
		const v = parseFloat(s);
		return Number.isFinite(v) ? v : undefined;
	};

	function formatComputed(v: number): string {
		if (!Number.isFinite(v)) return '';
		const s = v.toPrecision(4);
		if (s.includes('e')) return v.toFixed(2);
		return s.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
	}

	// Calcule en temps réel la valeur du champ auto à partir des deux autres.
	const computedAuto = $derived.by<number | undefined>(() => {
		if (autoField === null) return undefined;
		const glycol = fluide === 'eau' ? 0 : num(glycolPct) ?? 0;
		const props = proprietesFluide(fluide, glycol);
		const P = num(puissance);
		const Q = num(debit);
		const DT = num(deltaT);
		try {
			if (autoField === 'puissance' && Q !== undefined && DT !== undefined) {
				return calculerPuissance(Q, DT, props.coefVolumique);
			}
			if (autoField === 'debit' && P !== undefined && DT !== undefined && DT > 0) {
				return calculerDebit(P, DT, props.coefVolumique);
			}
			if (autoField === 'deltaT' && P !== undefined && Q !== undefined && Q > 0) {
				return calculerDeltaT(P, Q, props.coefVolumique);
			}
		} catch {
			return undefined;
		}
		return undefined;
	});

	// Synchronise la string affichée dans l'input avec la valeur calculée.
	// Le champ auto n'apparaît jamais en sortie de computedAuto (cf. branches), donc
	// l'affectation ne crée pas de boucle réactive.
	$effect(() => {
		if (computedAuto === undefined) return;
		const s = formatComputed(computedAuto);
		if (autoField === 'puissance' && puissance !== s) puissance = s;
		else if (autoField === 'debit' && debit !== s) debit = s;
		else if (autoField === 'deltaT' && deltaT !== s) deltaT = s;
	});

	function setMode(next: Mode) {
		if (next === mode) return;
		if (next === 'manuel') {
			const ok = window.confirm(
				'Passer en saisie manuelle ?\n\n' +
					'Les 3 champs P, Q et ΔT deviendront indépendants — plus de recalcul automatique. ' +
					"Le moteur affichera un avertissement d'incohérence si les valeurs ne concordent pas (tolérance 5 %)."
			);
			if (!ok) return;
		} else {
			const ok = window.confirm(
				'Revenir au calcul automatique ?\n\n' +
					"L'un des trois champs (par défaut le moins récemment édité) sera désormais recalculé " +
					'à partir des deux autres et peut donc être écrasé.'
			);
			if (!ok) return;
		}
		mode = next;
	}

	const inputs = $derived<Partial<V3VInputs>>({
		puissance: num(puissance),
		debit: num(debit),
		deltaT: num(deltaT),
		fluide,
		glycolPct: fluide === 'eau' ? 0 : num(glycolPct),
		dpr: num(dpr) as number,
		autoriteCible: num(autoriteCible) as number,
		dnTuyauterie: num(dnTuyauterie),
		dpvMax: num(dpvMax),
		temperature: num(temperature) as number
	});

	const validation = $derived(validateInputs(inputs));

	const result = $derived.by<{ ok: true; r: V3VResult } | { ok: false; err: string } | null>(() => {
		if (!validation.valid) return null;
		try {
			return { ok: true, r: dimensionnerV3V(inputs as V3VInputs) };
		} catch (e) {
			return { ok: false, err: (e as Error).message };
		}
	});

	const verdictLabel: Record<Verdict, string> = {
		optimal: 'Optimal',
		acceptable: 'Acceptable',
		limite: 'Limite',
		rejete: 'À revoir'
	};
	const verdictTone: Record<Verdict, string> = {
		optimal: 'text-primary',
		acceptable: 'text-amber',
		limite: 'text-amber',
		rejete: 'text-red-signal'
	};
	const verdictBar: Record<Verdict, string> = {
		optimal: 'bg-primary',
		acceptable: 'bg-amber',
		limite: 'bg-amber',
		rejete: 'bg-red-signal'
	};

	const fmt = (v: number, d = 2) =>
		Number.isFinite(v) ? v.toLocaleString('fr-FR', { maximumFractionDigits: d }) : '—';

	function pushUrl() {
		if (typeof window === 'undefined') return;
		const u = new URL(window.location.href);
		const setOrDel = (k: string, v: string) => {
			if (v === '' || v === undefined) u.searchParams.delete(k);
			else u.searchParams.set(k, v);
		};
		// En auto : on omet le champ auto (recalculé au mount).
		// En manuel : on push les 3 valeurs.
		if (mode === 'auto' && autoField === 'puissance') u.searchParams.delete('p');
		else setOrDel('p', puissance);
		if (mode === 'auto' && autoField === 'debit') u.searchParams.delete('q');
		else setOrDel('q', debit);
		if (mode === 'auto' && autoField === 'deltaT') u.searchParams.delete('dt');
		else setOrDel('dt', deltaT);
		if (mode === 'manuel') u.searchParams.set('m', 'manu');
		else u.searchParams.delete('m');
		setOrDel('f', fluide);
		setOrDel('g', fluide === 'eau' ? '' : glycolPct);
		setOrDel('dpr', dpr);
		setOrDel('a', autoriteCible);
		setOrDel('dn', dnTuyauterie);
		setOrDel('dpvm', dpvMax);
		setOrDel('t', temperature);
		replaceState(u, page.state);
	}

	onMount(() => {
		const sp = page.url.searchParams;
		const get = (k: string) => sp.get(k);
		const hasP = sp.has('p');
		const hasQ = sp.has('q');
		const hasDt = sp.has('dt');

		if (hasP) puissance = get('p')!;
		if (hasQ) debit = get('q')!;
		if (hasDt) deltaT = get('dt')!;

		if (get('m') === 'manu') {
			mode = 'manuel';
		} else {
			// Mode auto : décider quel champ est auto-calculé selon les params présents.
			// On configure lastEditedAt en conséquence pour que le bon champ soit le
			// "moins récemment édité".
			let t = 1;
			const next: Record<PQDT, number> = { puissance: 0, debit: 0, deltaT: 0 };
			if (hasP) next.puissance = t++;
			if (hasDt) next.deltaT = t++;
			if (hasQ) next.debit = t++;
			// Si rien n'est saisi, on garde les defaults (Q auto)
			if (!hasP && !hasQ && !hasDt) {
				next.debit = 0;
				next.puissance = 1;
				next.deltaT = 2;
			}
			lastEditedAt = next;
			editTick = t + 1;
		}

		const f = get('f');
		if (f === 'eau' || f === 'meg' || f === 'mpg') fluide = f;
		if (get('g') !== null) glycolPct = get('g')!;
		if (get('dpr') !== null) dpr = get('dpr')!;
		if (get('a') !== null) autoriteCible = get('a')!;
		if (get('dn') !== null) dnTuyauterie = get('dn')!;
		if (get('dpvm') !== null) dpvMax = get('dpvm')!;
		if (get('t') !== null) temperature = get('t')!;
	});

	$effect(() => {
		void [
			puissance, debit, deltaT, mode, autoField, fluide, glycolPct, dpr,
			autoriteCible, dnTuyauterie, dpvMax, temperature
		];
		pushUrl();
	});

	let copied = $state(false);
	let copyTimeout: ReturnType<typeof setTimeout> | undefined;

	function copyFiche() {
		if (!result || !result.ok) return;
		const r = result.r;
		const lines = [
			`# Dimensionnement V3V — OpenGTB`,
			``,
			`Kvs catalogue        : ${r.kvsRetenu} m³/h (série R5)`,
			`DN compatibles       : ${r.plageDN ? (r.plageDN[0] === r.plageDN[1] ? `DN ${r.plageDN[0]}` : `DN ${r.plageDN[0]} à DN ${r.plageDN[1]}`) : 'hors plages standard'}`,
			`Autorité réelle      : ${r.autoriteReelle.toFixed(2)}  (${verdictLabel[r.verdict]})`,
			``,
			`Débit nominal Q      : ${r.debitCalcule.toFixed(3)} m³/h${r.debitCalculDepuisP ? ' (calculé depuis P et ΔT)' : ''}`,
			`Kv théorique requis  : ${r.kvTheorique.toFixed(2)} m³/h`,
			`ΔPv réelle           : ${r.dpvReelle_kPa.toFixed(2)} kPa  /  ${r.dpvReelle_bar.toFixed(3)} bar`,
			``,
			`Hypothèses           : ${r.hypotheses.formule}`,
			`                     : cp = ${r.hypotheses.cp.toFixed(0)} J/(kg·K), ρ = ${r.hypotheses.rho.toFixed(0)} kg/m³`,
			r.warnings.length > 0 ? `\nAlertes :\n${r.warnings.map((w) => '  - ' + w).join('\n')}` : '',
			``,
			`Référence : NF EN 60534-2-1.`
		].filter(Boolean);
		navigator.clipboard.writeText(lines.join('\n')).then(() => {
			copied = true;
			clearTimeout(copyTimeout);
			copyTimeout = setTimeout(() => (copied = false), 2000);
		});
	}
</script>

<ToolShell
	{tool}
	seoTitle="Dimensionnement V3V — vanne 3 voies"
	seoDescription="Calcul de dimensionnement de vanne 3 voies de régulation hydraulique : Kvs, autorité, plage DN. Selon NF EN 60534-2-1. Calculs locaux."
>
	<div class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
		<!-- ============ FORMULAIRE ============ -->
		<form
			class="space-y-5"
			onsubmit={(e) => e.preventDefault()}
			aria-label="Données de dimensionnement V3V"
		>
			<!-- Charge thermique -->
			<fieldset class="border-line-soft space-y-3 rounded border p-4">
				<legend class="flex items-center gap-2 px-1.5">
					<span class="text-text-soft font-mono text-[11px] tracking-wide uppercase">
						Charge thermique
					</span>
					<span
						class="border-line-soft inline-flex overflow-hidden rounded border"
						role="group"
						aria-label="Mode de saisie P/Q/ΔT"
					>
						<button
							type="button"
							onclick={() => setMode('auto')}
							aria-pressed={mode === 'auto'}
							class={`font-mono text-[10.5px] px-2 py-0.5 transition-colors ${
								mode === 'auto'
									? 'bg-primary text-primary-foreground'
									: 'text-text-soft hover:text-foreground'
							}`}
						>
							auto
						</button>
						<button
							type="button"
							onclick={() => setMode('manuel')}
							aria-pressed={mode === 'manuel'}
							class={`font-mono text-[10.5px] px-2 py-0.5 transition-colors border-l border-line-soft ${
								mode === 'manuel'
									? 'bg-primary text-primary-foreground'
									: 'text-text-soft hover:text-foreground'
							}`}
						>
							manuel
						</button>
					</span>
				</legend>
				<div class="grid gap-2.5 sm:grid-cols-3">
					{#snippet pqdtField(label: string, field: PQDT, unit: string, bindVal: () => string, setVal: (v: string) => void, min: number, max: number)}
						{@const isAuto = autoField === field}
						<label class="block">
							<span class="text-text-soft mb-1 flex items-center gap-1.5 text-[12.5px]">
								{label}
								{#if isAuto}
									<span
										class="text-primary border-primary/40 bg-primary/10 inline-flex items-center gap-0.5 rounded border px-1 py-px font-mono text-[9px] tracking-wide uppercase"
										title="Ce champ est calculé automatiquement à partir des deux autres"
									>
										<Calculator class="size-2.5" /> auto
									</span>
								{/if}
							</span>
							<div
								class={`focus-within:ring-ring focus-within:border-primary flex items-stretch rounded border focus-within:ring-2 ${
									isAuto ? 'border-primary/30 bg-primary/5' : 'border-border bg-background'
								}`}
							>
								<input
									type="number"
									inputmode="decimal"
									step="any"
									{min}
									{max}
									value={bindVal()}
									oninput={(e) => {
										setVal((e.target as HTMLInputElement).value);
										markEdited(field);
									}}
									class={`w-full min-w-0 bg-transparent px-2.5 py-1.5 font-mono text-sm tabular-nums focus:outline-none ${
										isAuto ? 'text-primary' : ''
									}`}
								/>
								<span
									class="border-border bg-secondary/40 text-text-dim flex items-center border-l px-2 font-mono text-[11px]"
								>
									{unit}
								</span>
							</div>
						</label>
					{/snippet}
					{@render pqdtField('Puissance P', 'puissance', 'kW', () => puissance, (v) => (puissance = v), 0.1, 50000)}
					{@render pqdtField('Débit Q', 'debit', 'm³/h', () => debit, (v) => (debit = v), 0.01, 1000)}
					{@render pqdtField('ΔT', 'deltaT', 'K', () => deltaT, (v) => (deltaT = v), 1, 60)}
				</div>
			</fieldset>

			<!-- Fluide -->
			<fieldset class="border-line-soft space-y-3 rounded border p-4">
				<legend class="text-text-soft px-1.5 font-mono text-[11px] tracking-wide uppercase">
					Fluide
				</legend>
				<label class="block">
					<span class="text-text-soft block text-[12.5px]">Type</span>
					<select
						bind:value={fluide}
						class="border-border bg-background focus-visible:ring-ring focus-visible:border-primary mt-1 w-full rounded border px-2.5 py-1.5 font-mono text-sm focus-visible:ring-2 focus-visible:outline-none"
					>
						{#each FLUIDES as f (f.id)}
							<option value={f.id}>{f.label}</option>
						{/each}
					</select>
				</label>
				<div class="grid gap-2.5 sm:grid-cols-2">
					<label class="block">
						<span class="text-text-soft block text-[12.5px]">
							Glycol {#if fluide === 'eau'}<span class="text-text-dim">— N/A</span>{/if}
						</span>
						<div
							class="border-border bg-background focus-within:ring-ring focus-within:border-primary mt-1 flex items-stretch rounded border focus-within:ring-2"
							class:opacity-40={fluide === 'eau'}
						>
							<input
								type="number"
								inputmode="decimal"
								step="1"
								min="0"
								max="60"
								disabled={fluide === 'eau'}
								bind:value={glycolPct}
								class="w-full min-w-0 bg-transparent px-2.5 py-1.5 font-mono text-sm tabular-nums focus:outline-none"
							/>
							<span
								class="border-border bg-secondary/40 text-text-dim flex items-center border-l px-2 font-mono text-[11px]"
							>
								% vol
							</span>
						</div>
					</label>
					<label class="block">
						<span class="text-text-soft block text-[12.5px]">Température fluide</span>
						<div
							class="border-border bg-background focus-within:ring-ring focus-within:border-primary mt-1 flex items-stretch rounded border focus-within:ring-2"
						>
							<input
								type="number"
								inputmode="decimal"
								step="any"
								min="-20"
								max="200"
								bind:value={temperature}
								class="w-full min-w-0 bg-transparent px-2.5 py-1.5 font-mono text-sm tabular-nums focus:outline-none"
							/>
							<span
								class="border-border bg-secondary/40 text-text-dim flex items-center border-l px-2 font-mono text-[11px]"
							>
								°C
							</span>
						</div>
					</label>
				</div>
			</fieldset>

			<!-- Hydraulique -->
			<fieldset class="border-line-soft space-y-3 rounded border p-4">
				<legend class="text-text-soft px-1.5 font-mono text-[11px] tracking-wide uppercase">
					Hydraulique
				</legend>
				<div class="grid gap-2.5 sm:grid-cols-2">
					<label class="block">
						<span class="text-text-soft block text-[12.5px]">
							ΔPr <span class="text-text-dim">(circuit variable)</span>
						</span>
						<div
							class="border-border bg-background focus-within:ring-ring focus-within:border-primary mt-1 flex items-stretch rounded border focus-within:ring-2"
						>
							<input
								type="number"
								inputmode="decimal"
								step="any"
								min="0.1"
								max="1000"
								bind:value={dpr}
								class="w-full min-w-0 bg-transparent px-2.5 py-1.5 font-mono text-sm tabular-nums focus:outline-none"
							/>
							<span
								class="border-border bg-secondary/40 text-text-dim flex items-center border-l px-2 font-mono text-[11px]"
							>
								kPa
							</span>
						</div>
					</label>
					<label class="block">
						<span class="text-text-soft block text-[12.5px]">
							Autorité cible <em>a</em>
						</span>
						<div
							class="border-border bg-background focus-within:ring-ring focus-within:border-primary mt-1 flex items-stretch rounded border focus-within:ring-2"
						>
							<input
								type="number"
								inputmode="decimal"
								step="0.05"
								min="0.3"
								max="0.8"
								bind:value={autoriteCible}
								class="w-full min-w-0 bg-transparent px-2.5 py-1.5 font-mono text-sm tabular-nums focus:outline-none"
							/>
							<span
								class="border-border bg-secondary/40 text-text-dim flex items-center border-l px-2 font-mono text-[11px]"
							>
								[0.3 ; 0.8]
							</span>
						</div>
					</label>
				</div>
			</fieldset>

			<!-- Vanne -->
			<fieldset class="border-line-soft space-y-3 rounded border p-4">
				<legend class="text-text-soft px-1.5 font-mono text-[11px] tracking-wide uppercase">
					Vanne <span class="text-text-dim normal-case">— optionnel</span>
				</legend>
				<div class="grid gap-2.5 sm:grid-cols-2">
					<label class="block">
						<span class="text-text-soft block text-[12.5px]">DN tuyauterie</span>
						<select
							bind:value={dnTuyauterie}
							class="border-border bg-background focus-visible:ring-ring focus-visible:border-primary mt-1 w-full rounded border px-2.5 py-1.5 font-mono text-sm focus-visible:ring-2 focus-visible:outline-none"
						>
							<option value="">—</option>
							{#each DN_LIST as dn (dn)}
								<option value={String(dn)}>DN {dn}</option>
							{/each}
						</select>
					</label>
					<label class="block">
						<span class="text-text-soft block text-[12.5px]">ΔPv max admissible</span>
						<div
							class="border-border bg-background focus-within:ring-ring focus-within:border-primary mt-1 flex items-stretch rounded border focus-within:ring-2"
						>
							<input
								type="number"
								inputmode="decimal"
								step="any"
								min="1"
								max="2000"
								bind:value={dpvMax}
								placeholder="—"
								class="w-full min-w-0 bg-transparent px-2.5 py-1.5 font-mono text-sm tabular-nums focus:outline-none"
							/>
							<span
								class="border-border bg-secondary/40 text-text-dim flex items-center border-l px-2 font-mono text-[11px]"
							>
								kPa
							</span>
						</div>
					</label>
				</div>
			</fieldset>
		</form>

		<!-- ============ SORTIE ============ -->
		<output class="block space-y-4" aria-live="polite">
			{#if !validation.valid}
				<div
					class="border-red-signal/40 bg-red-signal/5 text-red-signal flex gap-3 rounded border p-4"
					data-section="errors"
				>
					<TriangleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
					<div class="min-w-0 space-y-1.5">
						<h2 class="font-mono text-[11px] tracking-wide uppercase">Erreurs de saisie</h2>
						<ul class="space-y-0.5 text-[13px]">
							{#each validation.errors as e (e)}
								<li>{e}</li>
							{/each}
						</ul>
					</div>
				</div>
			{:else if result?.ok === false}
				<div
					class="border-red-signal/40 bg-red-signal/5 text-red-signal flex gap-3 rounded border p-4"
					data-section="error"
				>
					<TriangleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
					<div class="min-w-0">
						<h2 class="font-mono text-[11px] tracking-wide uppercase">Erreur de calcul</h2>
						<p class="mt-1 text-[13px]">{result.err}</p>
					</div>
				</div>
			{:else if result?.ok}
				{@const r = result.r}

				<!-- Bloc verdict (héros) -->
				<section
					class="border-line-strong relative overflow-hidden rounded border"
					data-section="main"
				>
					<div class={`absolute inset-y-0 left-0 w-1 ${verdictBar[r.verdict]}`} aria-hidden="true"></div>

					<div class="grid grid-cols-2 gap-4 p-5 pl-6 sm:grid-cols-[1.2fr_1fr]">
						<!-- Kvs + DN -->
						<div>
							<p class="text-text-dim font-mono text-[10.5px] tracking-wide uppercase">
								Kvs catalogue <span class="text-text-dim/70">· série R5</span>
							</p>
							<p
								class="text-primary mt-0.5 font-mono text-[40px] leading-none font-semibold tabular-nums"
								data-field="kvs"
								data-value={r.kvsRetenu}
							>
								{r.kvsRetenu}<span class="text-text-soft ml-1 text-base font-normal">m³/h</span>
							</p>
							<p
								class="text-text-soft mt-1 font-mono text-[12.5px]"
								data-field="dn-range"
								data-value={r.plageDN ? r.plageDN.join('-') : ''}
							>
								{#if r.plageDN}
									{#if r.plageDN[0] === r.plageDN[1]}DN {r.plageDN[0]}{:else}DN {r.plageDN[0]} à DN {r.plageDN[1]}{/if}
								{:else}
									DN hors plages standard
								{/if}
							</p>
						</div>

						<!-- Autorité + verdict -->
						<div class="border-line-soft border-l pl-4">
							<p class="text-text-dim font-mono text-[10.5px] tracking-wide uppercase">
								Autorité <em>a</em>
							</p>
							<p
								class={`mt-0.5 font-mono text-[40px] leading-none font-semibold tabular-nums ${verdictTone[r.verdict]}`}
								data-field="autorite"
								data-value={r.autoriteReelle}
							>
								{fmt(r.autoriteReelle, 2)}
							</p>
							<p
								class={`mt-1 font-mono text-[12.5px] ${verdictTone[r.verdict]}`}
								data-verdict={r.verdict}
							>
								{verdictLabel[r.verdict]}
							</p>
						</div>
					</div>

					<p class="border-line-soft text-text-soft border-t px-5 py-2.5 pl-6 text-[12.5px]">
						{r.justification}
					</p>

					<!-- Actions -->
					<div class="border-line-soft flex items-center justify-between gap-2 border-t px-5 py-2 pl-6">
						<p class="text-text-dim font-mono text-[11px]">
							Q nominal : <span class="text-text-soft tabular-nums">{fmt(r.debitCalcule, 3)} m³/h</span>{#if r.debitCalculDepuisP}<span class="text-text-dim"> (calculé)</span>{/if}
						</p>
						<button
							type="button"
							onclick={copyFiche}
							class="border-border hover:border-primary hover:text-primary text-text-soft focus-visible:ring-ring inline-flex items-center gap-1.5 rounded border px-2.5 py-1 font-mono text-[11px] transition-colors focus-visible:ring-2 focus-visible:outline-none"
							aria-label="Copier la fiche dans le presse-papier"
						>
							{#if copied}
								<Check class="size-3.5" /> copié
							{:else}
								<Copy class="size-3.5" /> copier la fiche
							{/if}
						</button>
					</div>
				</section>

				<!-- Détails -->
				<section
					class="border-line-soft space-y-2 rounded border p-4"
					data-section="details"
				>
					<h2 class="text-text-dim font-mono text-[11px] tracking-wide uppercase">Détails</h2>
					<dl class="grid grid-cols-1 gap-x-6 gap-y-1.5 text-[13px] sm:grid-cols-2">
						<div class="flex items-baseline justify-between gap-2">
							<dt class="text-text-soft">Kv théorique requis</dt>
							<dd
								class="font-mono tabular-nums"
								data-field="kv-theorique"
								data-value={r.kvTheorique}
							>
								{fmt(r.kvTheorique, 2)} m³/h
							</dd>
						</div>
						<div class="flex items-baseline justify-between gap-2">
							<dt class="text-text-soft">ΔPv réelle</dt>
							<dd class="font-mono tabular-nums" data-field="dpv-reelle-kpa" data-value={r.dpvReelle_kPa}>
								{fmt(r.dpvReelle_kPa, 2)} kPa
								<span class="text-text-dim">·</span>
								<span data-field="dpv-reelle-bar" data-value={r.dpvReelle_bar}>
									{fmt(r.dpvReelle_bar, 3)} bar
								</span>
							</dd>
						</div>
						{#if r.debitCalculDepuisP}
							<div class="flex items-baseline justify-between gap-2">
								<dt class="text-text-soft">Débit calculé Q</dt>
								<dd class="font-mono tabular-nums" data-field="debit" data-value={r.debitCalcule}>
									{fmt(r.debitCalcule, 3)} m³/h
								</dd>
							</div>
						{/if}
						{#if r.puissanceCalculee !== undefined}
							<div class="flex items-baseline justify-between gap-2">
								<dt class="text-text-soft">Puissance calculée</dt>
								<dd class="font-mono tabular-nums" data-field="puissance" data-value={r.puissanceCalculee}>
									{fmt(r.puissanceCalculee, 2)} kW
								</dd>
							</div>
						{/if}
						{#if r.deltaTCalcule !== undefined}
							<div class="flex items-baseline justify-between gap-2">
								<dt class="text-text-soft">ΔT calculé</dt>
								<dd class="font-mono tabular-nums" data-field="dt" data-value={r.deltaTCalcule}>
									{fmt(r.deltaTCalcule, 2)} K
								</dd>
							</div>
						{/if}
					</dl>
				</section>

				<!-- Alternatives -->
				{#if r.alternatives.length > 0}
					<section class="border-line-soft rounded border p-4" data-section="alternatives">
						<h2 class="text-text-dim mb-2 font-mono text-[11px] tracking-wide uppercase">
							Alternatives encadrantes
						</h2>
						<table class="w-full text-[13px] tabular-nums">
							<thead class="text-text-dim font-mono text-[10.5px] tracking-wide uppercase">
								<tr class="border-line-soft border-b">
									<th class="py-1.5 text-left font-normal">Kvs</th>
									<th class="py-1.5 text-right font-normal">ΔPv</th>
									<th class="py-1.5 text-right font-normal">Autorité</th>
									<th class="py-1.5 text-right font-normal">Verdict</th>
								</tr>
							</thead>
							<tbody class="font-mono">
								{#each r.alternatives as alt (alt.kvs)}
									<tr class="border-line-soft border-b last:border-0" data-kvs={alt.kvs}>
										<td class="py-1.5">{alt.kvs}</td>
										<td class="py-1.5 text-right">{fmt(alt.dpv_kPa, 1)} kPa</td>
										<td class="py-1.5 text-right">{fmt(alt.autorite, 2)}</td>
										<td class={`py-1.5 text-right ${verdictTone[alt.verdict]}`}>
											{verdictLabel[alt.verdict]}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</section>
				{/if}

				<!-- Warnings -->
				{#if validation.warnings.length + r.warnings.length > 0}
					<section
						class="border-amber/40 bg-amber/5 flex gap-3 rounded border p-4"
						data-section="warnings"
					>
						<TriangleAlert class="text-amber mt-0.5 size-4 shrink-0" aria-hidden="true" />
						<div class="min-w-0 space-y-1.5">
							<h2 class="text-amber font-mono text-[11px] tracking-wide uppercase">Alertes</h2>
							<ul class="text-foreground space-y-1 text-[12.5px]">
								{#each validation.warnings as w (w)}
									<li class="before:text-amber before:mr-2 before:content-['›']">{w}</li>
								{/each}
								{#each r.warnings as w (w)}
									<li class="before:text-amber before:mr-2 before:content-['›']">{w}</li>
								{/each}
							</ul>
						</div>
					</section>
				{/if}

				<!-- Hypothèses -->
				<details class="border-line-soft group rounded border" data-section="hypotheses">
					<summary
						class="text-text-dim hover:text-text-soft flex cursor-pointer items-center gap-2 px-4 py-2.5 font-mono text-[11px] tracking-wide uppercase select-none"
					>
						<Info class="size-3.5" aria-hidden="true" />
						Hypothèses de calcul
					</summary>
					<dl
						class="text-text-soft grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-t px-4 py-3 font-mono text-[12px] tabular-nums"
					>
						<dt>cp fluide</dt>
						<dd data-field="cp" data-value={r.hypotheses.cp}>{fmt(r.hypotheses.cp, 0)} J/(kg·K)</dd>
						<dt>ρ fluide</dt>
						<dd data-field="rho" data-value={r.hypotheses.rho}>{fmt(r.hypotheses.rho, 0)} kg/m³</dd>
						<dt>cp·ρ / 3.6e6</dt>
						<dd data-field="coef-vol" data-value={r.hypotheses.coefVolumique}>
							{fmt(r.hypotheses.coefVolumique, 3)} kWh/(m³·K)
						</dd>
						<dt class="col-span-2 mt-1.5">Formule</dt>
						<dd class="text-text-dim col-span-2">{r.hypotheses.formule}</dd>
						<dt class="col-span-2 mt-1.5">Référence</dt>
						<dd class="text-text-dim col-span-2 normal-case">
							NF EN 60534-2-1 — régime turbulent non cavitant, ρ₀ = 1000 kg/m³.
						</dd>
					</dl>
				</details>
			{/if}
		</output>
	</div>

	<!-- SEO long-tail -->
	<div class="sr-only">
		<h2>Dimensionnement vanne 3 voies — V3V</h2>
		<p>
			Calcul du Kvs d'une vanne 3 voies de régulation hydraulique selon NF EN 60534-2-1.
			Détermination de l'autorité de la vanne, sélection du DN, vérification du risque de
			cavitation. Compatible eau pure et eau glycolée (MEG / MPG).
		</p>
	</div>
</ToolShell>
