<script lang="ts">
	import { onMount } from 'svelte';
	import { getTool } from '$lib/tools/registry';
	import ToolShell from '$lib/components/tools/ToolShell.svelte';
	import { calculerPertesDeCharge } from '$lib/tools/pdc/calc';
	import { autoDimensionnerDN } from '$lib/tools/pdc/autoDim';
	import { validateInputs } from '$lib/tools/pdc/validators';
	import {
		ACCESSOIRES_LABELS,
		FLUIDES_LABELS,
		MATERIAU_LABELS,
		METHODES_LABELS,
		PRESETS,
		TRONCON_TYPE_LABELS,
		getPreset
	} from '$lib/tools/pdc/constants';
	import { DESIGNATIONS_PAR_MATERIAU } from '$lib/tools/pdc/data/designations';
	import type {
		Accessoire,
		AccessoireType,
		Circuit,
		FluidId,
		LambdaMethod,
		MateriauId,
		PresetId,
		Resultat,
		Troncon,
		TronconType,
		Verdict
	} from '$lib/tools/pdc/types';
	import Copy from '@lucide/svelte/icons/copy';
	import Check from '@lucide/svelte/icons/check';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import Info from '@lucide/svelte/icons/info';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import ChevronUp from '@lucide/svelte/icons/chevron-up';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import CopyPlus from '@lucide/svelte/icons/copy-plus';
	import Wand2 from '@lucide/svelte/icons/wand-2';
	import Download from '@lucide/svelte/icons/download';
	import Upload from '@lucide/svelte/icons/upload';

	const tool = getTool('pdc')!;

	/* ------------------------------------------------------------------ */
	/*  Defaults                                                          */
	/* ------------------------------------------------------------------ */

	let uidCounter = 0;
	const nextId = (prefix: string) => `${prefix}${++uidCounter}`;

	function defaultTroncon(ordre: number): Troncon {
		return {
			id: nextId('T'),
			ordre,
			libelle: `Tronçon ${ordre}`,
			type: ordre === 1 ? 'chaufferie' : ordre === 2 ? 'dorsale' : 'raccordement',
			longueur: 10,
			diametre: {
				mode: 'designation',
				materiau: 'cuivre_neuf',
				designation: '22x1'
			},
			debit: { mode: 'manuel', valeurM3h: 0.6 },
			accessoires: [{ type: 'coude_90_grand_rayon', quantite: 2 }]
		};
	}

	/* ------------------------------------------------------------------ */
	/*  State                                                             */
	/* ------------------------------------------------------------------ */

	let preset = $state<PresetId>('radiateurs');
	let fluideType = $state<FluidId>('eau');
	let glycolPct = $state('30');
	let temperature = $state('70');
	let methodeLambda = $state<LambdaMethod>('serghides');
	let symetrique = $state(false);

	let troncons = $state<Troncon[]>([defaultTroncon(1)]);

	/* Préselection : si l'utilisateur change le préset, applique fluide/T/glycol par défaut. */
	function applyPreset(p: PresetId) {
		const def = getPreset(p);
		fluideType = def.fluide;
		temperature = String(def.temperature);
		if (def.fluide !== 'eau') glycolPct = String(def.glycolPct);
		preset = p;
	}

	/* ------------------------------------------------------------------ */
	/*  Build circuit + calcul                                            */
	/* ------------------------------------------------------------------ */

	const numOrUndef = (s: string): number | undefined => {
		if (s === '' || s === null || s === undefined) return undefined;
		const v = parseFloat(s);
		return Number.isFinite(v) ? v : undefined;
	};

	const circuit = $derived<Circuit>({
		preset,
		fluide: {
			type: fluideType,
			glycolPct: fluideType === 'eau' ? undefined : numOrUndef(glycolPct),
			temperature: numOrUndef(temperature) ?? 20
		},
		options: {
			methodeLambda,
			circuitFermeSymetrique: symetrique
		},
		troncons: troncons.map((t, i) => ({
			...t,
			ordre: i + 1,
			accessoires: t.accessoires.map((a) => ({ ...a }))
		}))
	});

	const validation = $derived(validateInputs(circuit));

	const resultat = $derived.by<{ ok: true; r: Resultat } | { ok: false; err: string } | null>(
		() => {
			if (!validation.valid) return null;
			try {
				return { ok: true, r: calculerPertesDeCharge(circuit) };
			} catch (e) {
				return { ok: false, err: (e as Error).message };
			}
		}
	);

	/* ------------------------------------------------------------------ */
	/*  Tronçon helpers                                                   */
	/* ------------------------------------------------------------------ */

	function addTroncon() {
		troncons = [...troncons, defaultTroncon(troncons.length + 1)];
	}
	function removeTroncon(id: string) {
		if (troncons.length <= 1) return;
		troncons = troncons.filter((t) => t.id !== id);
	}
	function duplicateTroncon(id: string) {
		const idx = troncons.findIndex((t) => t.id === id);
		if (idx < 0) return;
		const copy: Troncon = {
			...troncons[idx],
			id: nextId('T'),
			libelle: troncons[idx].libelle + ' (copie)',
			accessoires: troncons[idx].accessoires.map((a) => ({ ...a }))
		};
		troncons = [...troncons.slice(0, idx + 1), copy, ...troncons.slice(idx + 1)];
	}
	function moveTroncon(id: string, dir: -1 | 1) {
		const idx = troncons.findIndex((t) => t.id === id);
		const j = idx + dir;
		if (idx < 0 || j < 0 || j >= troncons.length) return;
		const next = [...troncons];
		[next[idx], next[j]] = [next[j], next[idx]];
		troncons = next;
	}
	function updateTroncon(id: string, patch: Partial<Troncon>) {
		troncons = troncons.map((t) => (t.id === id ? { ...t, ...patch } : t));
	}
	function addAccessoire(tronconId: string) {
		troncons = troncons.map((t) =>
			t.id === tronconId
				? { ...t, accessoires: [...t.accessoires, { type: 'coude_90_grand_rayon', quantite: 1 }] }
				: t
		);
	}
	function removeAccessoire(tronconId: string, idx: number) {
		troncons = troncons.map((t) =>
			t.id === tronconId
				? { ...t, accessoires: t.accessoires.filter((_, i) => i !== idx) }
				: t
		);
	}
	function updateAccessoire(tronconId: string, idx: number, patch: Partial<Accessoire>) {
		troncons = troncons.map((t) =>
			t.id === tronconId
				? {
						...t,
						accessoires: t.accessoires.map((a, i) => (i === idx ? { ...a, ...patch } : a))
					}
				: t
		);
	}

	/* ------------------------------------------------------------------ */
	/*  Auto-dim sur un tronçon                                           */
	/* ------------------------------------------------------------------ */

	function autoDimSurTroncon(tronconId: string) {
		const t = troncons.find((x) => x.id === tronconId);
		if (!t) return;
		try {
			const r = autoDimensionnerDN({
				materiau: t.diametre.materiau,
				debit: t.debit,
				fluide: {
					type: fluideType,
					glycolPct: fluideType === 'eau' ? undefined : numOrUndef(glycolPct),
					temperature: numOrUndef(temperature) ?? 20
				},
				criteres: { vitesseMaxMs: 1.5, dpLineiqueMaxPaParM: 300 }
			});
			if (r.succes && r.retenue) {
				updateTroncon(tronconId, {
					diametre: { ...t.diametre, mode: 'designation', designation: r.retenue.designation }
				});
				alert(
					`Auto-dim → ${r.retenue.designation}\n` +
						`V = ${r.retenue.vitesseMs.toFixed(2)} m/s, ΔP/m = ${r.retenue.dpLineiquePaParM.toFixed(0)} Pa/m.`
				);
			} else {
				alert(`Auto-dim : ${r.message}`);
			}
		} catch (e) {
			alert(`Auto-dim impossible : ${(e as Error).message}`);
		}
	}

	/* ------------------------------------------------------------------ */
	/*  Import / Export JSON                                              */
	/* ------------------------------------------------------------------ */

	function exportJSON() {
		const payload = {
			version: 1,
			outil: 'pdc',
			circuit
		};
		const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `pdc-circuit-${new Date().toISOString().slice(0, 10)}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}

	let importInput: HTMLInputElement;
	function triggerImport() {
		importInput?.click();
	}
	function onImportFile(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = () => {
			try {
				const data = JSON.parse(reader.result as string);
				const c: Circuit = data.circuit ?? data;
				preset = c.preset;
				fluideType = c.fluide.type;
				glycolPct = String(c.fluide.glycolPct ?? 30);
				temperature = String(c.fluide.temperature);
				methodeLambda = c.options?.methodeLambda ?? 'serghides';
				symetrique = c.options?.circuitFermeSymetrique ?? false;
				troncons = c.troncons.map((t) => ({
					...t,
					id: t.id || nextId('T'),
					accessoires: t.accessoires.map((a) => ({ ...a }))
				}));
			} catch (err) {
				alert(`Import impossible : ${(err as Error).message}`);
			}
		};
		reader.readAsText(file);
		(e.target as HTMLInputElement).value = '';
	}

	/* ------------------------------------------------------------------ */
	/*  Fiche markdown                                                    */
	/* ------------------------------------------------------------------ */

	let copied = $state(false);
	let copyTimeout: ReturnType<typeof setTimeout> | undefined;

	function copyFiche() {
		if (!resultat || !resultat.ok) return;
		const r = resultat.r;
		const lines: string[] = [];
		lines.push(`# Pertes de charge — OpenGTB`);
		lines.push('');
		lines.push(`HMT totale           : ${r.resume.hmtTotale.kPa.toFixed(2)} kPa  /  ${r.resume.hmtTotale.mCE.toFixed(2)} mCE  /  ${r.resume.hmtTotale.bar.toFixed(3)} bar`);
		lines.push(`Verdict global       : ${verdictLabel[r.resume.verdictGlobal]}`);
		lines.push(`Répartition          : linéique ${r.resume.repartitionPct.lineaire.toFixed(1)} %  /  singulier ${r.resume.repartitionPct.singuliere.toFixed(1)} %  /  équipements ${r.resume.repartitionPct.equipements.toFixed(1)} %`);
		lines.push(`Fluide               : ${FLUIDES_LABELS[fluideType]} à ${temperature} °C (ρ = ${r.fluide.rho.toFixed(1)} kg/m³, ν = ${(r.fluide.nu * 1e6).toFixed(3)} mm²/s)`);
		lines.push('');
		lines.push('## Tronçons');
		for (const tr of r.detail.troncons) {
			lines.push(`- ${tr.libelle} (${TRONCON_TYPE_LABELS[tr.type]})`);
			lines.push(`    L = ${tr.longueurReelleM.toFixed(2)} m  /  ⌀int = ${tr.diametreIntMm.toFixed(1)} mm  /  Q = ${tr.debitM3h.toFixed(3)} m³/h`);
			lines.push(`    V = ${tr.vitesseMs.toFixed(2)} m/s  /  Re = ${tr.reynolds.toFixed(0)} (${tr.regime})  /  λ = ${tr.lambda.toFixed(4)}`);
			lines.push(`    ΔP/m = ${tr.dpLineiquePaParM.toFixed(0)} Pa/m  →  ΔP tronçon = ${tr.dpTronconTotal.kPa.toFixed(2)} kPa (${tr.partDuTotalPct.toFixed(1)} % du total)`);
		}
		if (r.warnings.length) {
			lines.push('');
			lines.push('## Alertes');
			for (const w of r.warnings) lines.push(`  - ${w.message}`);
		}
		lines.push('');
		lines.push(`Références : NF EN 805, NF EN 60534-2-1, NF EN 12828, Serghides 1984.`);
		navigator.clipboard.writeText(lines.join('\n')).then(() => {
			copied = true;
			clearTimeout(copyTimeout);
			copyTimeout = setTimeout(() => (copied = false), 2000);
		});
	}

	/* ------------------------------------------------------------------ */
	/*  Listes pour selects                                               */
	/* ------------------------------------------------------------------ */

	const materiauxList = Object.keys(MATERIAU_LABELS) as MateriauId[];
	const accessoireTypes = Object.keys(ACCESSOIRES_LABELS) as AccessoireType[];
	const tronconTypes = Object.keys(TRONCON_TYPE_LABELS) as TronconType[];

	/* ------------------------------------------------------------------ */
	/*  Tonalités verdict                                                 */
	/* ------------------------------------------------------------------ */

	const verdictLabel: Record<Verdict, string> = {
		ok: 'OK',
		limite: 'Limite',
		rejete: 'À revoir'
	};
	const verdictTone: Record<Verdict, string> = {
		ok: 'text-primary',
		limite: 'text-amber',
		rejete: 'text-red-signal'
	};
	const verdictBar: Record<Verdict, string> = {
		ok: 'bg-primary',
		limite: 'bg-amber',
		rejete: 'bg-red-signal'
	};

	const fmt = (v: number, d = 2): string =>
		Number.isFinite(v) ? v.toLocaleString('fr-FR', { maximumFractionDigits: d }) : '—';

	function combinerVerdictTroncon(a: Verdict, b: Verdict): Verdict {
		if (a === 'rejete' || b === 'rejete') return 'rejete';
		if (a === 'limite' || b === 'limite') return 'limite';
		return 'ok';
	}

	onMount(() => {
		applyPreset(preset);
	});
</script>

<ToolShell
	{tool}
	seoTitle="Pertes de charge hydrauliques — réseau série"
	seoDescription="Calcul des pertes de charge d'un réseau hydraulique en série : Darcy-Weisbach, Serghides, accessoires, Kvs, équipements terminaux. Selon NF EN 805 et NF EN 12828."
>
	<div class="space-y-6">
		<!-- ============ CONFIGURATION GLOBALE ============ -->
		<fieldset class="border-line-soft space-y-4 rounded border p-4">
			<legend class="text-text-soft px-1.5 font-mono text-[11px] tracking-wide uppercase">
				Circuit
			</legend>

			<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				<label class="block">
					<span class="text-text-soft block text-[12.5px]">Préset</span>
					<select
						value={preset}
						onchange={(e) => applyPreset((e.target as HTMLSelectElement).value as PresetId)}
						class="border-border bg-background focus-visible:ring-ring focus-visible:border-primary mt-1 w-full rounded border px-2.5 py-1.5 font-mono text-sm focus-visible:ring-2 focus-visible:outline-none"
					>
						{#each PRESETS as p (p.id)}
							<option value={p.id}>{p.label}</option>
						{/each}
					</select>
				</label>

				<label class="block">
					<span class="text-text-soft block text-[12.5px]">Fluide</span>
					<select
						bind:value={fluideType}
						class="border-border bg-background focus-visible:ring-ring focus-visible:border-primary mt-1 w-full rounded border px-2.5 py-1.5 font-mono text-sm focus-visible:ring-2 focus-visible:outline-none"
					>
						{#each Object.entries(FLUIDES_LABELS) as [id, label] (id)}
							<option value={id}>{label}</option>
						{/each}
					</select>
				</label>

				<label class="block">
					<span class="text-text-soft block text-[12.5px]">
						Glycol {#if fluideType === 'eau'}<span class="text-text-dim">— N/A</span>{/if}
					</span>
					<div
						class="border-border bg-background focus-within:ring-ring focus-within:border-primary mt-1 flex items-stretch rounded border focus-within:ring-2"
						class:opacity-40={fluideType === 'eau'}
					>
						<input
							type="number"
							inputmode="decimal"
							step="1"
							min="0"
							max="50"
							disabled={fluideType === 'eau'}
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
							min="-40"
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

			<div class="grid gap-3 sm:grid-cols-3">
				<label class="block">
					<span class="text-text-soft block text-[12.5px]">Méthode λ</span>
					<select
						bind:value={methodeLambda}
						class="border-border bg-background focus-visible:ring-ring focus-visible:border-primary mt-1 w-full rounded border px-2.5 py-1.5 font-mono text-sm focus-visible:ring-2 focus-visible:outline-none"
					>
						{#each Object.entries(METHODES_LABELS) as [id, label] (id)}
							<option value={id}>{label}</option>
						{/each}
					</select>
				</label>

				<label class="border-line-soft mt-5 flex cursor-pointer items-center gap-2 rounded border p-2 sm:col-span-2">
					<input type="checkbox" bind:checked={symetrique} class="size-4 accent-primary" />
					<span class="text-text-soft text-[12.5px]">
						Circuit fermé symétrique <span class="text-text-dim">— L et accessoires comptés ×2 (sauf équipements terminaux)</span>
					</span>
				</label>
			</div>
		</fieldset>

		<!-- ============ TRONÇONS ============ -->
		<div class="space-y-4">
			<div class="flex items-baseline justify-between">
				<h2 class="text-text-soft font-mono text-[11px] tracking-wide uppercase">
					Tronçons <span class="text-text-dim">({troncons.length})</span>
				</h2>
				<div class="flex gap-1.5">
					<button
						type="button"
						onclick={triggerImport}
						class="border-border hover:border-primary hover:text-primary text-text-soft focus-visible:ring-ring inline-flex items-center gap-1.5 rounded border px-2.5 py-1 font-mono text-[11px] transition-colors focus-visible:ring-2 focus-visible:outline-none"
						title="Importer un circuit JSON"
					>
						<Upload class="size-3.5" /> importer
					</button>
					<input
						bind:this={importInput}
						type="file"
						accept="application/json,.json"
						class="hidden"
						onchange={onImportFile}
					/>
					<button
						type="button"
						onclick={exportJSON}
						class="border-border hover:border-primary hover:text-primary text-text-soft focus-visible:ring-ring inline-flex items-center gap-1.5 rounded border px-2.5 py-1 font-mono text-[11px] transition-colors focus-visible:ring-2 focus-visible:outline-none"
						title="Exporter ce circuit au format JSON"
					>
						<Download class="size-3.5" /> exporter
					</button>
				</div>
			</div>

			{#each troncons as t, i (t.id)}
				{@const tronconRes = resultat?.ok ? resultat.r.detail.troncons.find((x) => x.id === t.id) : null}
				<section
					class="border-line-soft relative space-y-3 rounded border p-4"
					data-troncon={t.id}
				>
					<div class={`absolute inset-y-0 left-0 w-1 ${tronconRes ? verdictBar[combinerVerdictTroncon(tronconRes.verdictVitesse, tronconRes.verdictDpLineique)] : 'bg-border'}`} aria-hidden="true"></div>

					<!-- Header tronçon -->
					<div class="flex flex-wrap items-center gap-2 pl-2">
						<span class="text-text-dim font-mono text-[10.5px] tabular-nums">{String(i + 1).padStart(2, '0')}</span>
						<input
							type="text"
							bind:value={t.libelle}
							class="border-border focus-within:border-primary focus-within:ring-ring min-w-[180px] flex-1 rounded border px-2 py-1 font-mono text-[12.5px] focus-within:ring-2 focus:outline-none"
							placeholder="Libellé du tronçon"
						/>
						<select
							value={t.type}
							onchange={(e) =>
								updateTroncon(t.id, { type: (e.target as HTMLSelectElement).value as TronconType })}
							class="border-border bg-background rounded border px-2 py-1 font-mono text-[12px]"
						>
							{#each tronconTypes as tp (tp)}
								<option value={tp}>{TRONCON_TYPE_LABELS[tp]}</option>
							{/each}
						</select>
						<div class="ml-auto flex gap-0.5">
							<button
								type="button"
								onclick={() => moveTroncon(t.id, -1)}
								disabled={i === 0}
								class="text-text-soft hover:text-primary border-border inline-flex size-7 items-center justify-center rounded border disabled:opacity-30"
								title="Monter"><ChevronUp class="size-3.5" /></button
							>
							<button
								type="button"
								onclick={() => moveTroncon(t.id, 1)}
								disabled={i === troncons.length - 1}
								class="text-text-soft hover:text-primary border-border inline-flex size-7 items-center justify-center rounded border disabled:opacity-30"
								title="Descendre"><ChevronDown class="size-3.5" /></button
							>
							<button
								type="button"
								onclick={() => duplicateTroncon(t.id)}
								class="text-text-soft hover:text-primary border-border inline-flex size-7 items-center justify-center rounded border"
								title="Dupliquer"><CopyPlus class="size-3.5" /></button
							>
							<button
								type="button"
								onclick={() => removeTroncon(t.id)}
								disabled={troncons.length <= 1}
								class="text-text-soft hover:text-red-signal border-border inline-flex size-7 items-center justify-center rounded border disabled:opacity-30"
								title="Supprimer"><Trash2 class="size-3.5" /></button
							>
						</div>
					</div>

					<!-- Géométrie + débit -->
					<div class="grid gap-3 pl-2 sm:grid-cols-2 lg:grid-cols-4">
						<label class="block">
							<span class="text-text-soft block text-[12.5px]">Longueur</span>
							<div
								class="border-border bg-background focus-within:ring-ring focus-within:border-primary mt-1 flex items-stretch rounded border focus-within:ring-2"
							>
								<input
									type="number"
									inputmode="decimal"
									step="any"
									min="0"
									value={t.longueur}
									oninput={(e) =>
										updateTroncon(t.id, {
											longueur: parseFloat((e.target as HTMLInputElement).value) || 0
										})}
									class="w-full min-w-0 bg-transparent px-2.5 py-1.5 font-mono text-sm tabular-nums focus:outline-none"
								/>
								<span
									class="border-border bg-secondary/40 text-text-dim flex items-center border-l px-2 font-mono text-[11px]"
								>
									m
								</span>
							</div>
						</label>

						<label class="block">
							<span class="text-text-soft block text-[12.5px]">Matériau</span>
							<select
								value={t.diametre.materiau}
								onchange={(e) => {
									const m = (e.target as HTMLSelectElement).value as MateriauId;
									const first = DESIGNATIONS_PAR_MATERIAU[m]?.[0]?.id;
									updateTroncon(t.id, {
										diametre: {
											...t.diametre,
											materiau: m,
											designation: first ?? t.diametre.designation
										}
									});
								}}
								class="border-border bg-background focus-visible:ring-ring focus-visible:border-primary mt-1 w-full rounded border px-2.5 py-1.5 font-mono text-sm focus-visible:ring-2 focus-visible:outline-none"
							>
								{#each materiauxList as m (m)}
									<option value={m}>{MATERIAU_LABELS[m]}</option>
								{/each}
							</select>
						</label>

						<label class="block">
							<span class="text-text-soft block text-[12.5px]">Désignation</span>
							<select
								value={t.diametre.designation ?? ''}
								onchange={(e) =>
									updateTroncon(t.id, {
										diametre: {
											...t.diametre,
											mode: 'designation',
											designation: (e.target as HTMLSelectElement).value
										}
									})}
								class="border-border bg-background focus-visible:ring-ring focus-visible:border-primary mt-1 w-full rounded border px-2.5 py-1.5 font-mono text-sm focus-visible:ring-2 focus-visible:outline-none"
							>
								{#each DESIGNATIONS_PAR_MATERIAU[t.diametre.materiau] as d (d.id)}
									<option value={d.id}>{d.label} — ⌀int {d.intMm} mm</option>
								{/each}
							</select>
						</label>

						<div class="flex items-end">
							<button
								type="button"
								onclick={() => autoDimSurTroncon(t.id)}
								class="border-border hover:border-primary hover:text-primary text-text-soft inline-flex w-full items-center justify-center gap-1.5 rounded border px-2 py-1.5 font-mono text-[11px] transition-colors"
								title="Suggérer le plus petit DN qui passe V ≤ 1.5 m/s et ΔP ≤ 300 Pa/m"
							>
								<Wand2 class="size-3.5" /> auto-dim
							</button>
						</div>
					</div>

					<!-- Débit -->
					<div class="grid gap-3 pl-2 sm:grid-cols-3">
						<label class="block">
							<span class="text-text-soft block text-[12.5px]">Mode débit</span>
							<select
								value={t.debit.mode}
								onchange={(e) =>
									updateTroncon(t.id, {
										debit: {
											...t.debit,
											mode: (e.target as HTMLSelectElement).value as 'manuel' | 'puissance'
										}
									})}
								class="border-border bg-background mt-1 w-full rounded border px-2.5 py-1.5 font-mono text-sm"
							>
								<option value="manuel">Débit direct</option>
								<option value="puissance">Depuis puissance + ΔT</option>
							</select>
						</label>

						{#if t.debit.mode === 'manuel'}
							<label class="block">
								<span class="text-text-soft block text-[12.5px]">Débit Q</span>
								<div
									class="border-border bg-background focus-within:ring-ring focus-within:border-primary mt-1 flex items-stretch rounded border focus-within:ring-2"
								>
									<input
										type="number"
										inputmode="decimal"
										step="any"
										min="0"
										value={t.debit.valeurM3h ?? ''}
										oninput={(e) =>
											updateTroncon(t.id, {
												debit: {
													...t.debit,
													valeurM3h: parseFloat((e.target as HTMLInputElement).value) || 0
												}
											})}
										class="w-full min-w-0 bg-transparent px-2.5 py-1.5 font-mono text-sm tabular-nums focus:outline-none"
									/>
									<span
										class="border-border bg-secondary/40 text-text-dim flex items-center border-l px-2 font-mono text-[11px]"
									>
										m³/h
									</span>
								</div>
							</label>
						{:else}
							<label class="block">
								<span class="text-text-soft block text-[12.5px]">Puissance P</span>
								<div
									class="border-border bg-background focus-within:ring-ring focus-within:border-primary mt-1 flex items-stretch rounded border focus-within:ring-2"
								>
									<input
										type="number"
										inputmode="decimal"
										step="any"
										min="0"
										value={t.debit.puissanceKw ?? ''}
										oninput={(e) =>
											updateTroncon(t.id, {
												debit: {
													...t.debit,
													puissanceKw: parseFloat((e.target as HTMLInputElement).value) || 0
												}
											})}
										class="w-full min-w-0 bg-transparent px-2.5 py-1.5 font-mono text-sm tabular-nums focus:outline-none"
									/>
									<span
										class="border-border bg-secondary/40 text-text-dim flex items-center border-l px-2 font-mono text-[11px]"
									>
										kW
									</span>
								</div>
							</label>
							<label class="block">
								<span class="text-text-soft block text-[12.5px]">ΔT</span>
								<div
									class="border-border bg-background focus-within:ring-ring focus-within:border-primary mt-1 flex items-stretch rounded border focus-within:ring-2"
								>
									<input
										type="number"
										inputmode="decimal"
										step="any"
										min="0"
										value={t.debit.deltaTk ?? getPreset(preset).deltaTk}
										oninput={(e) =>
											updateTroncon(t.id, {
												debit: {
													...t.debit,
													deltaTk: parseFloat((e.target as HTMLInputElement).value) || 0
												}
											})}
										class="w-full min-w-0 bg-transparent px-2.5 py-1.5 font-mono text-sm tabular-nums focus:outline-none"
									/>
									<span
										class="border-border bg-secondary/40 text-text-dim flex items-center border-l px-2 font-mono text-[11px]"
									>
										K
									</span>
								</div>
							</label>
						{/if}
					</div>

					<!-- Accessoires -->
					<div class="space-y-1.5 pl-2">
						<div class="flex items-baseline justify-between">
							<h3 class="text-text-dim font-mono text-[10.5px] tracking-wide uppercase">
								Accessoires <span class="text-text-dim">({t.accessoires.length})</span>
							</h3>
							<button
								type="button"
								onclick={() => addAccessoire(t.id)}
								class="text-primary hover:bg-primary/10 inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[11px]"
							>
								<Plus class="size-3" /> ajouter
							</button>
						</div>
						{#if t.accessoires.length === 0}
							<p class="text-text-dim font-mono text-[11px]">// aucun accessoire</p>
						{:else}
							<div class="space-y-1.5">
								{#each t.accessoires as a, ai (ai)}
									<div class="border-line-soft flex flex-wrap items-center gap-1.5 rounded border bg-background/50 px-2 py-1">
										<select
											value={a.type}
											onchange={(e) =>
												updateAccessoire(t.id, ai, {
													type: (e.target as HTMLSelectElement).value as AccessoireType
												})}
											class="border-border bg-background min-w-[200px] flex-1 rounded border px-2 py-0.5 font-mono text-[11.5px]"
										>
											{#each accessoireTypes as tp (tp)}
												<option value={tp}>{ACCESSOIRES_LABELS[tp]}</option>
											{/each}
										</select>

										<label class="border-border bg-background flex items-stretch rounded border">
											<input
												type="number"
												min="1"
												step="1"
												value={a.quantite}
												oninput={(e) =>
													updateAccessoire(t.id, ai, {
														quantite: parseInt((e.target as HTMLInputElement).value) || 1
													})}
												class="w-14 bg-transparent px-1.5 py-0.5 font-mono text-[11.5px] tabular-nums focus:outline-none"
											/>
											<span class="border-border bg-secondary/40 text-text-dim flex items-center border-l px-1.5 font-mono text-[10.5px]">×</span>
										</label>

										{#if a.type === 'custom'}
											<label class="border-border bg-background flex items-stretch rounded border" title="Coefficient ζ">
												<input
													type="number"
													step="0.01"
													min="0"
													placeholder="ζ"
													value={a.zetaCustom ?? ''}
													oninput={(e) =>
														updateAccessoire(t.id, ai, {
															zetaCustom: parseFloat((e.target as HTMLInputElement).value) || 0
														})}
													class="w-16 bg-transparent px-1.5 py-0.5 font-mono text-[11.5px] tabular-nums focus:outline-none"
												/>
												<span class="border-border bg-secondary/40 text-text-dim flex items-center border-l px-1.5 font-mono text-[10.5px]">ζ</span>
											</label>
										{:else if a.type === 'vanne_kvs'}
											<label class="border-border bg-background flex items-stretch rounded border">
												<input
													type="number"
													step="any"
													min="0"
													placeholder="Kvs"
													value={a.kvs ?? ''}
													oninput={(e) =>
														updateAccessoire(t.id, ai, {
															kvs: parseFloat((e.target as HTMLInputElement).value) || 0
														})}
													class="w-16 bg-transparent px-1.5 py-0.5 font-mono text-[11.5px] tabular-nums focus:outline-none"
												/>
												<span class="border-border bg-secondary/40 text-text-dim flex items-center border-l px-1.5 font-mono text-[10.5px]">Kvs</span>
											</label>
										{:else if a.type === 'equipement_dp'}
											<label class="border-border bg-background flex items-stretch rounded border">
												<input
													type="number"
													step="any"
													min="0"
													placeholder="ΔP nom."
													value={a.dpNominaleKpa ?? ''}
													oninput={(e) =>
														updateAccessoire(t.id, ai, {
															dpNominaleKpa: parseFloat((e.target as HTMLInputElement).value) || 0
														})}
													class="w-20 bg-transparent px-1.5 py-0.5 font-mono text-[11.5px] tabular-nums focus:outline-none"
												/>
												<span class="border-border bg-secondary/40 text-text-dim flex items-center border-l px-1.5 font-mono text-[10.5px]">kPa</span>
											</label>
											<label class="border-border bg-background flex items-stretch rounded border">
												<input
													type="number"
													step="any"
													min="0"
													placeholder="Q nom."
													value={a.debitNominalM3h ?? ''}
													oninput={(e) =>
														updateAccessoire(t.id, ai, {
															debitNominalM3h: parseFloat((e.target as HTMLInputElement).value) || 0
														})}
													class="w-20 bg-transparent px-1.5 py-0.5 font-mono text-[11.5px] tabular-nums focus:outline-none"
												/>
												<span class="border-border bg-secondary/40 text-text-dim flex items-center border-l px-1.5 font-mono text-[10.5px]">m³/h</span>
											</label>
										{/if}

										<input
											type="text"
											value={a.libelle ?? ''}
											oninput={(e) =>
												updateAccessoire(t.id, ai, {
													libelle: (e.target as HTMLInputElement).value || undefined
												})}
											class="border-border bg-background min-w-[120px] flex-1 rounded border px-1.5 py-0.5 font-mono text-[11.5px] focus:outline-none"
											placeholder="libellé (optionnel)"
										/>

										<button
											type="button"
											onclick={() => removeAccessoire(t.id, ai)}
											class="text-text-soft hover:text-red-signal inline-flex size-6 items-center justify-center rounded"
											title="Supprimer"
										>
											<Trash2 class="size-3.5" />
										</button>
									</div>
								{/each}
							</div>
						{/if}
					</div>

					<!-- Récap tronçon -->
					{#if tronconRes}
						<dl class="border-line-soft text-text-soft grid grid-cols-2 gap-x-6 gap-y-1 border-t pl-2 pt-2 font-mono text-[12px] tabular-nums sm:grid-cols-4">
							<div class="flex items-baseline justify-between gap-2">
								<dt class="text-text-dim">V</dt>
								<dd data-field="vitesse" data-value={tronconRes.vitesseMs} class={verdictTone[tronconRes.verdictVitesse]}>
									{fmt(tronconRes.vitesseMs, 2)} m/s
								</dd>
							</div>
							<div class="flex items-baseline justify-between gap-2">
								<dt class="text-text-dim">Re</dt>
								<dd data-field="re" data-value={tronconRes.reynolds}>{fmt(tronconRes.reynolds, 0)}</dd>
							</div>
							<div class="flex items-baseline justify-between gap-2">
								<dt class="text-text-dim">ΔP/m</dt>
								<dd data-field="dp-lin-m" data-value={tronconRes.dpLineiquePaParM} class={verdictTone[tronconRes.verdictDpLineique]}>
									{fmt(tronconRes.dpLineiquePaParM, 0)} Pa/m
								</dd>
							</div>
							<div class="flex items-baseline justify-between gap-2">
								<dt class="text-text-dim">ΔP tronçon</dt>
								<dd data-field="dp-troncon" data-value={tronconRes.dpTronconTotal.Pa}>
									{fmt(tronconRes.dpTronconTotal.kPa, 2)} kPa <span class="text-text-dim">·</span> {fmt(tronconRes.partDuTotalPct, 1)} %
								</dd>
							</div>
						</dl>
					{/if}
				</section>
			{/each}

			<button
				type="button"
				onclick={addTroncon}
				class="border-line-soft text-text-soft hover:border-primary hover:text-primary inline-flex w-full items-center justify-center gap-2 rounded border border-dashed py-2.5 font-mono text-[12px] transition-colors"
			>
				<Plus class="size-4" /> ajouter un tronçon
			</button>
		</div>

		<!-- ============ RÉSULTAT GLOBAL ============ -->
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
							{#each validation.errors as e (e.code + e.message)}
								<li>{e.message}</li>
							{/each}
						</ul>
					</div>
				</div>
			{:else if resultat?.ok === false}
				<div class="border-red-signal/40 bg-red-signal/5 text-red-signal flex gap-3 rounded border p-4">
					<TriangleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
					<div class="min-w-0">
						<h2 class="font-mono text-[11px] tracking-wide uppercase">Erreur de calcul</h2>
						<p class="mt-1 text-[13px]">{resultat.err}</p>
					</div>
				</div>
			{:else if resultat?.ok}
				{@const r = resultat.r}

				<!-- Verdict block global -->
				<section
					class="border-line-strong relative overflow-hidden rounded border"
					data-section="main"
				>
					<div class={`absolute inset-y-0 left-0 w-1 ${verdictBar[r.resume.verdictGlobal]}`} aria-hidden="true"></div>

					<div class="grid gap-4 p-5 pl-6 sm:grid-cols-3">
						<div>
							<p class="text-text-dim font-mono text-[10.5px] tracking-wide uppercase">HMT totale</p>
							<p
								class="text-primary mt-0.5 font-mono text-[40px] leading-none font-semibold tabular-nums"
								data-field="hmt-kpa"
								data-value={r.resume.hmtTotale.kPa}
							>
								{fmt(r.resume.hmtTotale.kPa, 2)}<span class="text-text-soft ml-1 text-base font-normal">kPa</span>
							</p>
							<p class="text-text-soft mt-1 font-mono text-[12.5px]">
								<span data-field="hmt-mce" data-value={r.resume.hmtTotale.mCE}>
									{fmt(r.resume.hmtTotale.mCE, 2)} mCE
								</span>
								<span class="text-text-dim mx-1">·</span>
								<span data-field="hmt-bar" data-value={r.resume.hmtTotale.bar}>
									{fmt(r.resume.hmtTotale.bar, 3)} bar
								</span>
							</p>
						</div>

						<div class="border-line-soft sm:border-l sm:pl-4">
							<p class="text-text-dim font-mono text-[10.5px] tracking-wide uppercase">Répartition</p>
							<dl class="mt-1 font-mono text-[12.5px] tabular-nums">
								<div class="flex items-baseline justify-between"><dt class="text-text-soft">linéique</dt><dd>{fmt(r.resume.repartitionPct.lineaire, 1)} %</dd></div>
								<div class="flex items-baseline justify-between"><dt class="text-text-soft">singulier</dt><dd>{fmt(r.resume.repartitionPct.singuliere, 1)} %</dd></div>
								<div class="flex items-baseline justify-between"><dt class="text-text-soft">équipements</dt><dd>{fmt(r.resume.repartitionPct.equipements, 1)} %</dd></div>
							</dl>
						</div>

						<div class="border-line-soft sm:border-l sm:pl-4">
							<p class="text-text-dim font-mono text-[10.5px] tracking-wide uppercase">Verdict</p>
							<p class={`mt-0.5 font-mono text-2xl ${verdictTone[r.resume.verdictGlobal]}`} data-verdict={r.resume.verdictGlobal}>
								{verdictLabel[r.resume.verdictGlobal]}
							</p>
							<p class="text-text-soft mt-1 font-mono text-[12.5px]">
								{r.resume.nbWarnings} alerte{r.resume.nbWarnings > 1 ? 's' : ''} · {r.detail.troncons.length} tronçon{r.detail.troncons.length > 1 ? 's' : ''}
							</p>
						</div>
					</div>

					<div class="border-line-soft flex items-center justify-between gap-2 border-t px-5 py-2 pl-6 text-[12.5px]">
						<p class="text-text-dim font-mono">
							V min/max : <span class="text-text-soft tabular-nums">{fmt(r.resume.vitesseMin, 2)} → {fmt(r.resume.vitesseMax, 2)} m/s</span>
							<span class="text-text-dim mx-2">·</span>
							ΔP/m moy : <span class="text-text-soft tabular-nums">{fmt(r.resume.dpLineiqueMoyennePaParM, 0)} Pa/m</span>
							{#if r.resume.tronconLePlusPenalisant}
								<span class="text-text-dim mx-2">·</span>
								Plus pénalisant : <span class="text-text-soft">{r.resume.tronconLePlusPenalisant.libelle} ({fmt(r.resume.tronconLePlusPenalisant.partDuTotalPct, 1)} %)</span>
							{/if}
						</p>
						<button
							type="button"
							onclick={copyFiche}
							class="border-border hover:border-primary hover:text-primary text-text-soft focus-visible:ring-ring inline-flex items-center gap-1.5 rounded border px-2.5 py-1 font-mono text-[11px] transition-colors focus-visible:ring-2 focus-visible:outline-none"
						>
							{#if copied}
								<Check class="size-3.5" /> copié
							{:else}
								<Copy class="size-3.5" /> copier la fiche
							{/if}
						</button>
					</div>
				</section>

				<!-- Accessoires agrégés -->
				{#if r.detail.accessoiresAgreges.length > 0}
					<section class="border-line-soft rounded border p-4" data-section="accessoires-aggreges">
						<h2 class="text-text-dim mb-2 font-mono text-[11px] tracking-wide uppercase">
							Accessoires agrégés
						</h2>
						<table class="w-full text-[12.5px] tabular-nums">
							<thead class="text-text-dim font-mono text-[10.5px] tracking-wide uppercase">
								<tr class="border-line-soft border-b">
									<th class="py-1.5 text-left font-normal">Type</th>
									<th class="py-1.5 text-right font-normal">Qté</th>
									<th class="py-1.5 text-right font-normal">ΔP cumul</th>
								</tr>
							</thead>
							<tbody class="font-mono">
								{#each r.detail.accessoiresAgreges as a (a.type)}
									<tr class="border-line-soft border-b last:border-0">
										<td class="py-1">{ACCESSOIRES_LABELS[a.type] ?? a.type}</td>
										<td class="py-1 text-right">{a.quantiteTotale}</td>
										<td class="py-1 text-right">{fmt(a.dpTotalePa / 1000, 2)} kPa</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</section>
				{/if}

				<!-- Warnings -->
				{#if r.warnings.length > 0}
					<section class="border-amber/40 bg-amber/5 flex gap-3 rounded border p-4" data-section="warnings">
						<TriangleAlert class="text-amber mt-0.5 size-4 shrink-0" aria-hidden="true" />
						<div class="min-w-0 space-y-1.5">
							<h2 class="text-amber font-mono text-[11px] tracking-wide uppercase">Alertes</h2>
							<ul class="text-foreground space-y-1 text-[12.5px]">
								{#each r.warnings as w (w.code + w.message)}
									<li class="before:text-amber before:mr-2 before:content-['›']">{w.message}</li>
								{/each}
							</ul>
						</div>
					</section>
				{/if}

				<!-- Hypothèses -->
				<details class="border-line-soft group rounded border" data-section="hypotheses">
					<summary class="text-text-dim hover:text-text-soft flex cursor-pointer items-center gap-2 px-4 py-2.5 font-mono text-[11px] tracking-wide uppercase select-none">
						<Info class="size-3.5" aria-hidden="true" />
						Hypothèses fluide
					</summary>
					<dl class="text-text-soft grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-t px-4 py-3 font-mono text-[12px] tabular-nums">
						<dt>ρ</dt><dd>{fmt(r.fluide.rho, 1)} kg/m³</dd>
						<dt>ν</dt><dd>{(r.fluide.nu * 1e6).toFixed(3)} mm²/s</dd>
						<dt>μ = ρ·ν</dt><dd>{(r.fluide.mu * 1000).toFixed(3)} mPa·s</dd>
						<dt>cp_vol</dt><dd>{fmt(r.fluide.cpVolumique, 3)} kWh/(m³·K)</dd>
						<dt class="col-span-2 mt-1.5">Source</dt>
						<dd class="text-text-dim col-span-2 normal-case">{r.fluide.source}</dd>
						<dt class="col-span-2 mt-1.5">Références</dt>
						<dd class="text-text-dim col-span-2 normal-case">NF EN 805 (Darcy), NF EN 60534-2-1 (Kvs), NF EN 12828 (vitesses), Serghides 1984.</dd>
					</dl>
				</details>
			{/if}
		</output>
	</div>

	<!-- SEO long-tail -->
	<div class="sr-only">
		<h2>Pertes de charge hydrauliques — réseau série</h2>
		<p>
			Calcul des pertes de charge d'un circuit hydraulique en série pour chauffage, eau glacée,
			ECS bouclée, géothermie ou PAC. Équation de Darcy-Weisbach, coefficient de Colebrook par
			l'approximation de Serghides, pertes singulières par coefficient ζ, vannes Kvs (NF EN
			60534-2-1) et équipements terminaux à ΔP fabricant. Compatible eau pure et eau glycolée
			(MEG / MPG).
		</p>
	</div>
</ToolShell>

