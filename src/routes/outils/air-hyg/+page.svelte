<script lang="ts">
	import { onMount } from 'svelte';
	import { replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import { getTool } from '$lib/tools/registry';
	import ToolShell from '$lib/components/tools/ToolShell.svelte';
	import { calculerDebitsHygieniques } from '$lib/tools/air-hyg/calcul';
	import { validateProjet } from '$lib/tools/air-hyg/validators';
	import { buildFromPreset, PRESETS, newLocalId } from '$lib/tools/air-hyg/presets';
	import { TABLE_R4222_6, TABLE_RSDT_641, TABLE_CRECHE } from '$lib/tools/air-hyg/constants';
	import type {
		CategorieBatiment,
		CategorieQai,
		Local,
		Population,
		Projet,
		Verdict
	} from '$lib/tools/air-hyg/types';
	import Copy from '@lucide/svelte/icons/copy';
	import Check from '@lucide/svelte/icons/check';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import Info from '@lucide/svelte/icons/info';
	import Building2 from '@lucide/svelte/icons/building-2';

	const tool = getTool('air-hyg')!;

	/* ============ Etat ============ */
	const defaultOptions = (): Projet['options'] => ({
		methodeCalcul: 'reglementaire_fr',
		categorieQaiCible: 'QAI2',
		categorieBatiment: 'B2',
		co2Exterieur_ppm: 400,
		afficherComparaisonEuropeenne: true
	});

	const defaultProjet = (): Projet => ({
		libelle: 'Mon bâtiment',
		options: defaultOptions(),
		locaux: [buildFromPreset('classe_primaire')!]
	});

	let projet = $state<Projet>(defaultProjet());
	let expanded = $state<Record<string, boolean>>({});
	let presetToAdd = $state<string>('bureau_openspace');

	/* ============ URL state encodage compact ============ */
	function toBase64Url(s: string): string {
		const b64 = typeof window !== 'undefined' ? window.btoa(unescape(encodeURIComponent(s))) : '';
		return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
	}
	function fromBase64Url(s: string): string | null {
		try {
			const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
			const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
			return decodeURIComponent(escape(window.atob(b64 + pad)));
		} catch {
			return null;
		}
	}
	function pushUrl() {
		if (typeof window === 'undefined') return;
		const u = new URL(window.location.href);
		try {
			const enc = toBase64Url(JSON.stringify(projet));
			if (enc.length < 4000) u.searchParams.set('d', enc);
			else u.searchParams.delete('d');
		} catch {
			u.searchParams.delete('d');
		}
		replaceState(u, page.state);
	}

	onMount(() => {
		const d = page.url.searchParams.get('d');
		if (d) {
			const raw = fromBase64Url(d);
			if (raw) {
				try {
					const p = JSON.parse(raw) as Projet;
					if (p && Array.isArray(p.locaux)) {
						projet = p;
						for (const l of p.locaux) expanded[l.id] = true;
					}
				} catch {
					/* ignore */
				}
			}
		} else {
			for (const l of projet.locaux) expanded[l.id] = true;
		}
	});

	$effect(() => {
		// suivi de l'arbre pour pushUrl
		void JSON.stringify(projet);
		pushUrl();
	});

	/* ============ Calcul ============ */
	const validation = $derived(validateProjet(projet));
	const resultat = $derived.by(() => {
		try {
			return calculerDebitsHygieniques(projet);
		} catch (e) {
			return { error: (e as Error).message } as const;
		}
	});

	/* ============ Actions ============ */
	function addLocal() {
		const l = buildFromPreset(presetToAdd);
		if (!l) return;
		l.id = newLocalId();
		projet.locaux = [...projet.locaux, l];
		expanded[l.id] = true;
	}
	function removeLocal(id: string) {
		projet.locaux = projet.locaux.filter((l) => l.id !== id);
		delete expanded[id];
	}
	function setPs(l: Local, key: 'nbRepasSimultanes' | 'nbCabinets' | 'nbLavabos' | 'nbDouches' | 'nbPostesChange', v: string) {
		l.parametresSpecifiques ??= {};
		l.parametresSpecifiques[key] = v === '' ? undefined : parseInt(v);
	}
	function setPsRaw<K extends 'collectif' | 'classementZoneSante'>(
		l: Local,
		key: K,
		v: K extends 'collectif' ? boolean : 1 | 2 | 3 | 4
	) {
		l.parametresSpecifiques ??= {};
		(l.parametresSpecifiques as Record<string, unknown>)[key] = v;
	}
	function addPopulation(l: Local) {
		l.populations = [
			...l.populations,
			{
				libelle: 'Nouvelle population',
				nbOccupants: 1,
				referentiel: 'rsdt_641',
				designationLocal: 'bureau',
				profil: 'adulte',
				activite: 'leger'
			}
		];
	}
	function removePopulation(l: Local, idx: number) {
		l.populations = l.populations.filter((_, i) => i !== idx);
	}
	function resetProjet() {
		if (!window.confirm('Réinitialiser le projet ? Tous les locaux saisis seront perdus.')) return;
		projet = defaultProjet();
		expanded = {};
		for (const l of projet.locaux) expanded[l.id] = true;
	}

	/* ============ UI helpers ============ */
	const fmt = (v: number | undefined | null, d = 0) =>
		v === undefined || v === null || !Number.isFinite(v)
			? '—'
			: v.toLocaleString('fr-FR', { maximumFractionDigits: d });

	const verdictLabel: Record<Verdict, string> = {
		conforme: 'Conforme',
		acceptable_avec_reserves: 'Acceptable',
		non_conforme: 'À revoir'
	};
	const verdictTone: Record<Verdict, string> = {
		conforme: 'text-primary',
		acceptable_avec_reserves: 'text-amber',
		non_conforme: 'text-red-signal'
	};
	const verdictBar: Record<Verdict, string> = {
		conforme: 'bg-primary',
		acceptable_avec_reserves: 'bg-amber',
		non_conforme: 'bg-red-signal'
	};

	const zoneLabel: Record<Local['zone'], string> = {
		tertiaire_bureau: 'Tertiaire / bureau',
		enseignement: 'Enseignement',
		sante: 'Santé',
		restauration: 'Restauration',
		commerce: 'Commerce',
		sport: 'Sport',
		spectacle: 'Spectacle / cinéma',
		industrie: 'Industrie',
		hebergement: 'Hébergement',
		creche: 'Crèche',
		sanitaire: 'Sanitaires',
		cuisine_collective: 'Cuisine collective',
		circulation: 'Circulation',
		autre: 'Autre'
	};

	function designationOptions(p: Population) {
		if (p.referentiel === 'code_travail')
			return Object.keys(TABLE_R4222_6).map((k) => ({
				id: k,
				label: (TABLE_R4222_6 as Record<string, { texteCite: string }>)[k].texteCite.replace(
					/^Code du Travail Art\. R4222-6 — /,
					''
				)
			}));
		if (p.referentiel === 'rsdt_641')
			return Object.keys(TABLE_RSDT_641).map((k) => ({
				id: k,
				label: (TABLE_RSDT_641 as Record<string, { texteCite: string }>)[k].texteCite.replace(
					/^RSDT Art\. 64\.1 — /,
					''
				)
			}));
		if (p.referentiel === 'creche')
			return Object.keys(TABLE_CRECHE).map((k) => ({
				id: k,
				label: (TABLE_CRECHE as Record<string, { texteCite: string }>)[k].texteCite.replace(
					/^Arrêté 31\/08\/2021 — /,
					''
				)
			}));
		return [];
	}

	function changerReferentiel(p: Population) {
		const opts = designationOptions(p);
		if (opts.length > 0 && !opts.find((o) => o.id === p.designationLocal)) {
			p.designationLocal = opts[0].id;
		}
	}

	/* ============ Copier la fiche ============ */
	let copied = $state(false);
	let copyTimeout: ReturnType<typeof setTimeout> | undefined;

	function copyFiche() {
		if ('error' in resultat) return;
		const r = resultat;
		const lines: string[] = [
			`# Débit d'air hygiénique — ${projet.libelle}`,
			``,
			`Total air neuf      : ${fmt(r.resume.debitTotalAirNeuf_m3h)} m³/h`,
			`Total extraction    : ${fmt(r.resume.debitTotalExtraction_m3h)} m³/h`,
			`Équilibre I/E       : ${fmt(r.resume.equilibreAirAirExtrait_pct, 1)} %`,
			`Verdict global      : ${verdictLabel[r.resume.verdictGlobal]}`,
			`CO₂ moyen attendu   : ${fmt(r.resume.co2MoyenAttendu_ppm)} ppm`,
			``,
			`Locaux (${r.detail.locaux.length}) :`
		];
		for (const l of r.detail.locaux) {
			lines.push(``);
			lines.push(`  ▸ ${l.libelle} (${zoneLabel[l.zone]})`);
			lines.push(
				`    Surface ${fmt(l.surface_m2)} m², V ${fmt(l.volume_m3)} m³, débit ${fmt(l.debitTotalLocal_m3h)} m³/h (n = ${fmt(l.tauxRenouvellement_volh, 1)} vol/h)`
			);
			for (const d of l.debitsParPopulation) {
				lines.push(
					`      - ${d.libelle} : ${d.nbOccupants} × ${d.debitUnitaire_m3h_occupant} = ${fmt(d.debitTotal_m3h)} m³/h`
				);
				lines.push(`        ↳ ${d.texteCite}`);
			}
			for (const d of l.debitsForfaitaires) {
				lines.push(`      - ${d.libelle} : ${fmt(d.debitTotal_m3h)} m³/h`);
				lines.push(`        ↳ ${d.texteCite}`);
			}
			if (l.verification) {
				lines.push(
					`      Vérif. installation : ${fmt(l.verification.debitInstalle_m3h)} m³/h, écart ${fmt(l.verification.ecart_pct, 1)} % (${l.verification.verdict})`
				);
			}
		}
		lines.push(``);
		lines.push(`Textes appliqués : ${r.textesLegauxAppliques.join(' · ')}`);
		navigator.clipboard.writeText(lines.join('\n')).then(() => {
			copied = true;
			clearTimeout(copyTimeout);
			copyTimeout = setTimeout(() => (copied = false), 2000);
		});
	}
</script>

<ToolShell
	{tool}
	seoTitle="Débit d'air hygiénique — calcul réglementaire FR"
	seoDescription="Calcul du débit d'air neuf réglementaire pour bâtiments tertiaires, ERP, santé, enseignement, restauration. Code du Travail, RSDT 64.1/64.2, arrêté crèches 31/08/2021, NF S 90-351, comparaison NF EN 16798. Calculs locaux."
>
	<div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
		<!-- ============ FORMULAIRE ============ -->
		<div class="space-y-5">
			<!-- En-tête projet -->
			<fieldset class="border-line-soft space-y-3 rounded border p-4">
				<legend class="text-text-soft px-1.5 font-mono text-[11px] tracking-wide uppercase">
					Projet
				</legend>
				<label class="block">
					<span class="text-text-soft block text-[12.5px]">Libellé</span>
					<input
						type="text"
						bind:value={projet.libelle}
						class="border-border bg-background focus-visible:ring-ring focus-visible:border-primary mt-1 w-full rounded border px-2.5 py-1.5 font-mono text-sm focus-visible:ring-2 focus-visible:outline-none"
					/>
				</label>
				<div class="grid gap-2.5 sm:grid-cols-3">
					<label class="block">
						<span class="text-text-soft block text-[12.5px]">Catégorie QAI cible</span>
						<select
							bind:value={projet.options.categorieQaiCible}
							class="border-border bg-background focus-visible:ring-ring focus-visible:border-primary mt-1 w-full rounded border px-2.5 py-1.5 font-mono text-sm focus-visible:ring-2 focus-visible:outline-none"
						>
							<option value={'QAI1' satisfies CategorieQai}>QAI 1 (10 L/s)</option>
							<option value={'QAI2' satisfies CategorieQai}>QAI 2 (7 L/s)</option>
							<option value={'QAI3' satisfies CategorieQai}>QAI 3 (4 L/s = mini FR)</option>
							<option value={'QAI4' satisfies CategorieQai}>QAI 4 (2.8 L/s)</option>
						</select>
					</label>
					<label class="block">
						<span class="text-text-soft block text-[12.5px]">Catégorie bâtiment</span>
						<select
							bind:value={projet.options.categorieBatiment}
							class="border-border bg-background focus-visible:ring-ring focus-visible:border-primary mt-1 w-full rounded border px-2.5 py-1.5 font-mono text-sm focus-visible:ring-2 focus-visible:outline-none"
						>
							<option value={'B1' satisfies CategorieBatiment}>B1 — très peu polluant</option>
							<option value={'B2' satisfies CategorieBatiment}>B2 — peu polluant</option>
							<option value={'B3' satisfies CategorieBatiment}>B3 — non polluant connu</option>
						</select>
					</label>
					<label class="block">
						<span class="text-text-soft block text-[12.5px]">CO₂ extérieur</span>
						<div
							class="border-border bg-background focus-within:ring-ring focus-within:border-primary mt-1 flex items-stretch rounded border focus-within:ring-2"
						>
							<input
								type="number"
								inputmode="decimal"
								step="1"
								min="350"
								max="500"
								bind:value={projet.options.co2Exterieur_ppm}
								class="w-full min-w-0 bg-transparent px-2.5 py-1.5 font-mono text-sm tabular-nums focus:outline-none"
							/>
							<span
								class="border-border bg-secondary/40 text-text-dim flex items-center border-l px-2 font-mono text-[11px]"
							>
								ppm
							</span>
						</div>
					</label>
				</div>
			</fieldset>

			<!-- Locaux -->
			<section class="space-y-3" aria-label="Locaux">
				{#each projet.locaux as l (l.id)}
					{@const isOpen = expanded[l.id]}
					<article class="border-line-soft rounded border" data-local-id={l.id}>
						<header class="flex items-center gap-2 px-3 py-2">
							<button
								type="button"
								onclick={() => (expanded[l.id] = !isOpen)}
								class="text-text-dim hover:text-foreground transition-colors"
								aria-label={isOpen ? 'Replier' : 'Déplier'}
								aria-expanded={isOpen}
							>
								<ChevronDown
									class="size-4 transition-transform {isOpen ? '' : '-rotate-90'}"
								/>
							</button>
							<Building2 class="text-text-dim size-3.5" />
							<input
								type="text"
								bind:value={l.libelle}
								class="border-border focus-visible:ring-ring focus-visible:border-primary bg-background flex-1 rounded border-transparent px-2 py-1 font-mono text-[13px] hover:border-border focus-visible:ring-2 focus-visible:outline-none"
								aria-label="Libellé du local"
							/>
							<span
								class="text-text-dim hidden font-mono text-[10.5px] tracking-wide uppercase sm:inline"
							>
								{zoneLabel[l.zone]}
							</span>
							<button
								type="button"
								onclick={() => removeLocal(l.id)}
								class="text-text-dim hover:text-red-signal transition-colors"
								aria-label="Supprimer le local"
							>
								<Trash2 class="size-3.5" />
							</button>
						</header>

						{#if isOpen}
							<div class="border-line-soft space-y-3 border-t p-3">
								<!-- Surface / HSP / Zone -->
								<div class="grid gap-2.5 sm:grid-cols-3">
									<label class="block">
										<span class="text-text-soft block text-[12.5px]">Surface</span>
										<div
											class="border-border bg-background focus-within:ring-ring focus-within:border-primary mt-1 flex items-stretch rounded border focus-within:ring-2"
										>
											<input
												type="number"
												inputmode="decimal"
												step="any"
												min="0.1"
												bind:value={l.surface_m2}
												class="w-full min-w-0 bg-transparent px-2.5 py-1.5 font-mono text-sm tabular-nums focus:outline-none"
											/>
											<span
												class="border-border bg-secondary/40 text-text-dim flex items-center border-l px-2 font-mono text-[11px]"
											>
												m²
											</span>
										</div>
									</label>
									<label class="block">
										<span class="text-text-soft block text-[12.5px]">Hauteur sous plafond</span>
										<div
											class="border-border bg-background focus-within:ring-ring focus-within:border-primary mt-1 flex items-stretch rounded border focus-within:ring-2"
										>
											<input
												type="number"
												inputmode="decimal"
												step="0.1"
												min="2"
												max="10"
												bind:value={l.hauteurSousPlafond_m}
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
										<span class="text-text-soft block text-[12.5px]">Zone</span>
										<select
											bind:value={l.zone}
											class="border-border bg-background focus-visible:ring-ring focus-visible:border-primary mt-1 w-full rounded border px-2.5 py-1.5 font-mono text-sm focus-visible:ring-2 focus-visible:outline-none"
										>
											{#each Object.entries(zoneLabel) as [k, lab] (k)}
												<option value={k}>{lab}</option>
											{/each}
										</select>
									</label>
								</div>

								<!-- Paramètres spécifiques selon zone -->
								{#if l.zone === 'cuisine_collective'}
									<label class="block">
										<span class="text-text-soft block text-[12.5px]">Repas servis simultanément</span>
										<div
											class="border-border bg-background focus-within:ring-ring focus-within:border-primary mt-1 flex items-stretch rounded border focus-within:ring-2 sm:w-1/3"
										>
											<input
												type="number"
												inputmode="numeric"
												step="1"
												min="1"
												value={l.parametresSpecifiques?.nbRepasSimultanes ?? ''}
												oninput={(e) => setPs(l, 'nbRepasSimultanes', (e.target as HTMLInputElement).value)}
												class="w-full min-w-0 bg-transparent px-2.5 py-1.5 font-mono text-sm tabular-nums focus:outline-none"
											/>
											<span
												class="border-border bg-secondary/40 text-text-dim flex items-center border-l px-2 font-mono text-[11px]"
											>
												repas
											</span>
										</div>
									</label>
								{:else if l.zone === 'sanitaire'}
									<div class="grid gap-2.5 sm:grid-cols-4">
										<label class="block">
											<span class="text-text-soft block text-[12.5px]">Cabinets</span>
											<input
												type="number"
												min="0"
												step="1"
												value={l.parametresSpecifiques?.nbCabinets ?? ''}
												oninput={(e) => setPs(l, 'nbCabinets', (e.target as HTMLInputElement).value)}
												class="border-border bg-background mt-1 w-full rounded border px-2.5 py-1.5 font-mono text-sm tabular-nums focus:outline-none"
											/>
										</label>
										<label class="block">
											<span class="text-text-soft block text-[12.5px]">Lavabos</span>
											<input
												type="number"
												min="0"
												step="1"
												value={l.parametresSpecifiques?.nbLavabos ?? ''}
												oninput={(e) => setPs(l, 'nbLavabos', (e.target as HTMLInputElement).value)}
												class="border-border bg-background mt-1 w-full rounded border px-2.5 py-1.5 font-mono text-sm tabular-nums focus:outline-none"
											/>
										</label>
										<label class="block">
											<span class="text-text-soft block text-[12.5px]">Douches</span>
											<input
												type="number"
												min="0"
												step="1"
												value={l.parametresSpecifiques?.nbDouches ?? ''}
												oninput={(e) => setPs(l, 'nbDouches', (e.target as HTMLInputElement).value)}
												class="border-border bg-background mt-1 w-full rounded border px-2.5 py-1.5 font-mono text-sm tabular-nums focus:outline-none"
											/>
										</label>
										<label class="flex items-center gap-2 pt-5">
											<input
												type="checkbox"
												checked={l.parametresSpecifiques?.collectif ?? true}
												onchange={(e) =>
													setPsRaw(l, 'collectif', (e.target as HTMLInputElement).checked)}
												class="accent-primary"
											/>
											<span class="text-text-soft text-[12.5px]">Collectif</span>
										</label>
									</div>
								{:else if l.zone === 'creche'}
									<label class="block">
										<span class="text-text-soft block text-[12.5px]">Postes de change (si local de change)</span>
										<div
											class="border-border bg-background mt-1 flex items-stretch rounded border focus-within:ring-2 sm:w-1/3"
										>
											<input
												type="number"
												min="0"
												step="1"
												value={l.parametresSpecifiques?.nbPostesChange ?? ''}
												oninput={(e) => setPs(l, 'nbPostesChange', (e.target as HTMLInputElement).value)}
												class="w-full min-w-0 bg-transparent px-2.5 py-1.5 font-mono text-sm tabular-nums focus:outline-none"
											/>
											<span
												class="border-border bg-secondary/40 text-text-dim flex items-center border-l px-2 font-mono text-[11px]"
											>
												postes
											</span>
										</div>
									</label>
								{:else if l.zone === 'sante'}
									<label class="block">
										<span class="text-text-soft block text-[12.5px]">Classement NF S 90-351</span>
										<select
											value={l.parametresSpecifiques?.classementZoneSante ?? 1}
											onchange={(e) =>
												setPsRaw(
													l,
													'classementZoneSante',
													parseInt((e.target as HTMLSelectElement).value) as 1 | 2 | 3 | 4
												)}
											class="border-border bg-background mt-1 w-full rounded border px-2.5 py-1.5 font-mono text-sm sm:w-1/2"
										>
											<option value={1}>Risque 1 — locaux courants</option>
											<option value={2}>Risque 2 — chambres protégées, néonatologie</option>
											<option value={3}>Risque 3 — bloc op standard, soins intensifs</option>
											<option value={4}>Risque 4 — bloc op ultra-propre</option>
										</select>
									</label>
								{/if}

								<!-- Populations -->
								<div class="space-y-2">
									<div class="flex items-center justify-between">
										<span class="text-text-soft font-mono text-[11px] tracking-wide uppercase">
											Populations
										</span>
										<button
											type="button"
											onclick={() => addPopulation(l)}
											class="border-border hover:border-primary hover:text-primary text-text-soft inline-flex items-center gap-1 rounded border px-2 py-0.5 font-mono text-[10.5px] transition-colors"
										>
											<Plus class="size-3" /> population
										</button>
									</div>
									{#if l.populations.length === 0}
										<p class="text-text-dim font-mono text-[11.5px]">
											{#if l.zone === 'cuisine_collective' || l.zone === 'sanitaire'}
												Pollution spécifique — débit forfaitaire (pas de population à saisir).
											{:else}
												Aucune population — ajouter au moins une catégorie d'occupants.
											{/if}
										</p>
									{/if}
									{#each l.populations as p, idx (idx)}
										<div class="border-line-soft space-y-2 rounded border p-2.5">
											<div class="grid gap-2 sm:grid-cols-[1.4fr_0.6fr_1fr_auto]">
												<input
													type="text"
													bind:value={p.libelle}
													placeholder="Libellé (ex: Salariés)"
													class="border-border bg-background rounded border px-2 py-1 font-mono text-[12.5px]"
												/>
												<div
													class="border-border bg-background flex items-stretch rounded border focus-within:ring-2"
												>
													<input
														type="number"
														min="0"
														step="1"
														bind:value={p.nbOccupants}
														class="w-full min-w-0 bg-transparent px-2 py-1 font-mono text-[12.5px] tabular-nums focus:outline-none"
													/>
													<span
														class="border-border bg-secondary/40 text-text-dim flex items-center border-l px-1.5 font-mono text-[10px]"
													>
														occ.
													</span>
												</div>
												<select
													bind:value={p.referentiel}
													onchange={() => changerReferentiel(p)}
													class="border-border bg-background rounded border px-2 py-1 font-mono text-[12.5px]"
												>
													<option value="code_travail">Code du Travail (CT)</option>
													<option value="rsdt_641">RSDT 64.1 (ERP)</option>
													<option value="creche">Crèche (arrêté 2021)</option>
												</select>
												<button
													type="button"
													onclick={() => removePopulation(l, idx)}
													class="text-text-dim hover:text-red-signal self-center"
													aria-label="Supprimer cette population"
												>
													<Trash2 class="size-3.5" />
												</button>
											</div>
											<div class="grid gap-2 sm:grid-cols-[1.6fr_0.7fr_0.7fr]">
												<select
													bind:value={p.designationLocal}
													class="border-border bg-background rounded border px-2 py-1 font-mono text-[12px]"
												>
													{#each designationOptions(p) as opt (opt.id)}
														<option value={opt.id}>{opt.label}</option>
													{/each}
												</select>
												<select
													bind:value={p.profil}
													class="border-border bg-background rounded border px-2 py-1 font-mono text-[12px]"
												>
													<option value="adulte">Adulte</option>
													<option value="enfant">Enfant</option>
												</select>
												<select
													bind:value={p.activite}
													class="border-border bg-background rounded border px-2 py-1 font-mono text-[12px]"
												>
													<option value="repos">Repos / sédentaire</option>
													<option value="leger">Léger</option>
													<option value="modere">Modéré</option>
													<option value="intense">Intense</option>
												</select>
											</div>
										</div>
									{/each}
								</div>

								<!-- Vérification installation -->
								<details class="border-line-soft group rounded border">
									<summary
										class="text-text-dim hover:text-text-soft flex cursor-pointer items-center gap-2 px-3 py-1.5 font-mono text-[11px] tracking-wide uppercase select-none"
									>
										Vérification installation existante
									</summary>
									<div class="border-t p-3">
										<label class="block sm:w-1/2">
											<span class="text-text-soft block text-[12.5px]">Débit installé</span>
											<div
												class="border-border bg-background mt-1 flex items-stretch rounded border focus-within:ring-2"
											>
												<input
													type="number"
													min="0"
													step="any"
													value={l.installationExistante?.debitInstalle_m3h ?? ''}
													oninput={(e) => {
														const v = (e.target as HTMLInputElement).value;
														if (v === '') l.installationExistante = undefined;
														else l.installationExistante = { debitInstalle_m3h: parseFloat(v) };
													}}
													placeholder="—"
													class="w-full min-w-0 bg-transparent px-2.5 py-1.5 font-mono text-sm tabular-nums focus:outline-none"
												/>
												<span
													class="border-border bg-secondary/40 text-text-dim flex items-center border-l px-2 font-mono text-[11px]"
												>
													m³/h
												</span>
											</div>
										</label>
									</div>
								</details>
							</div>
						{/if}
					</article>
				{/each}

				<!-- Ajouter local -->
				<div class="border-line-soft flex items-center gap-2 rounded border border-dashed p-3">
					<select
						bind:value={presetToAdd}
						class="border-border bg-background flex-1 rounded border px-2 py-1.5 font-mono text-[12.5px]"
					>
						{#each PRESETS as p (p.id)}
							<option value={p.id}>{p.libelle}</option>
						{/each}
					</select>
					<button
						type="button"
						onclick={addLocal}
						class="border-primary text-primary hover:bg-primary hover:text-primary-foreground inline-flex items-center gap-1.5 rounded border px-3 py-1.5 font-mono text-[11.5px] transition-colors"
					>
						<Plus class="size-3.5" /> ajouter
					</button>
					<button
						type="button"
						onclick={resetProjet}
						class="text-text-dim hover:text-foreground font-mono text-[11px]"
						aria-label="Réinitialiser le projet"
					>
						réinit.
					</button>
				</div>
			</section>
		</div>

		<!-- ============ SORTIE ============ -->
		<output class="block space-y-4" aria-live="polite">
			{#if 'error' in resultat}
				<div
					class="border-red-signal/40 bg-red-signal/5 text-red-signal flex gap-3 rounded border p-4"
				>
					<TriangleAlert class="mt-0.5 size-4 shrink-0" />
					<div>
						<h2 class="font-mono text-[11px] tracking-wide uppercase">Erreur de calcul</h2>
						<p class="mt-1 text-[13px]">{resultat.error}</p>
					</div>
				</div>
			{:else}
				{@const r = resultat}
				<!-- Verdict bâtiment -->
				<section class="border-line-strong relative overflow-hidden rounded border" data-section="main">
					<div
						class={`absolute inset-y-0 left-0 w-1 ${verdictBar[r.resume.verdictGlobal]}`}
						aria-hidden="true"
					></div>
					<div class="grid grid-cols-2 gap-4 p-5 pl-6 sm:grid-cols-[1.2fr_1fr]">
						<div>
							<p class="text-text-dim font-mono text-[10.5px] tracking-wide uppercase">
								Débit total air neuf
							</p>
							<p
								class="text-primary mt-0.5 font-mono text-[36px] leading-none font-semibold tabular-nums"
								data-field="debit-total-air-neuf"
								data-value={r.resume.debitTotalAirNeuf_m3h}
							>
								{fmt(r.resume.debitTotalAirNeuf_m3h)}<span
									class="text-text-soft ml-1 text-base font-normal">m³/h</span
								>
							</p>
							<p class="text-text-soft mt-1 font-mono text-[12px]">
								{fmt(r.resume.debitTotalAirNeuf_m3h / 3.6, 1)} L/s · extraction {fmt(
									r.resume.debitTotalExtraction_m3h
								)} m³/h
							</p>
						</div>
						<div class="border-line-soft border-l pl-4">
							<p class="text-text-dim font-mono text-[10.5px] tracking-wide uppercase">
								Verdict global
							</p>
							<p
								class={`mt-0.5 font-mono text-[28px] leading-none font-semibold ${verdictTone[r.resume.verdictGlobal]}`}
								data-verdict={r.resume.verdictGlobal}
							>
								{verdictLabel[r.resume.verdictGlobal]}
							</p>
							<p class="text-text-soft mt-1 font-mono text-[12px]">
								Équilibre I/E {fmt(r.resume.equilibreAirAirExtrait_pct, 1)} % · CO₂ moy. {fmt(
									r.resume.co2MoyenAttendu_ppm
								)} ppm
							</p>
						</div>
					</div>
					<div class="border-line-soft flex items-center justify-between gap-2 border-t px-5 py-2 pl-6">
						<p class="text-text-dim font-mono text-[11px]">
							{r.resume.nbLocaux} locaux · {fmt(r.resume.nbOccupantsTotal)} occupants ·{' '}
							{r.resume.nbWarnings} alerte{r.resume.nbWarnings > 1 ? 's' : ''}
						</p>
						<button
							type="button"
							onclick={copyFiche}
							class="border-border hover:border-primary hover:text-primary text-text-soft inline-flex items-center gap-1.5 rounded border px-2.5 py-1 font-mono text-[11px] transition-colors"
						>
							{#if copied}
								<Check class="size-3.5" /> copié
							{:else}
								<Copy class="size-3.5" /> copier la fiche
							{/if}
						</button>
					</div>
				</section>

				<!-- Validation errors -->
				{#if !validation.valid}
					<section
						class="border-red-signal/40 bg-red-signal/5 text-red-signal flex gap-3 rounded border p-4"
					>
						<TriangleAlert class="mt-0.5 size-4 shrink-0" />
						<div class="min-w-0 space-y-1">
							<h2 class="font-mono text-[11px] tracking-wide uppercase">Erreurs de saisie</h2>
							<ul class="space-y-0.5 text-[13px]">
								{#each validation.errors as e (e.code + (e.local ?? '') + e.message)}
									<li>{e.message}</li>
								{/each}
							</ul>
						</div>
					</section>
				{/if}

				<!-- Détail par local -->
				{#each r.detail.locaux as l (l.id)}
					<section class="border-line-soft rounded border" data-local-result={l.id}>
						<header class="flex items-baseline justify-between gap-3 px-4 py-2.5">
							<div class="min-w-0">
								<p class="font-mono text-[13px]">{l.libelle}</p>
								<p class="text-text-dim font-mono text-[10.5px] tracking-wide uppercase">
									{zoneLabel[l.zone]} · {fmt(l.surface_m2)} m² · {fmt(l.volume_m3)} m³
								</p>
							</div>
							<div class="text-right">
								<p
									class="text-primary font-mono text-[22px] leading-none font-semibold tabular-nums"
									data-field="debit-local"
									data-value={l.debitTotalLocal_m3h}
								>
									{fmt(l.debitTotalLocal_m3h)}<span
										class="text-text-soft ml-1 text-[11px] font-normal">m³/h</span
									>
								</p>
								<p class="text-text-dim mt-0.5 font-mono text-[11px]">
									n = {fmt(l.tauxRenouvellement_volh, 1)} vol/h · CO₂ {fmt(l.co2Equilibre_ppm)} ppm
								</p>
							</div>
						</header>
						{#if l.debitsParPopulation.length > 0 || l.debitsForfaitaires.length > 0}
							<div class="border-line-soft border-t px-4 py-2.5">
								<table class="w-full text-[12.5px] tabular-nums">
									<tbody class="font-mono">
										{#each l.debitsParPopulation as d (d.libelle + d.referentiel)}
											<tr class="border-line-soft border-b last:border-0">
												<td class="py-1 pr-2 text-left align-top">
													<div>{d.libelle}</div>
													<div class="text-text-dim text-[10.5px] leading-tight">{d.texteCite}</div>
												</td>
												<td class="text-text-soft py-1 pr-2 text-right whitespace-nowrap align-top">
													{d.nbOccupants} × {d.debitUnitaire_m3h_occupant}
												</td>
												<td class="py-1 text-right align-top">{fmt(d.debitTotal_m3h)} m³/h</td>
											</tr>
										{/each}
										{#each l.debitsForfaitaires as d (d.libelle + d.base)}
											<tr class="border-line-soft border-b last:border-0">
												<td class="py-1 pr-2 text-left align-top">
													<div>{d.libelle}</div>
													<div class="text-text-dim text-[10.5px] leading-tight">{d.texteCite}</div>
												</td>
												<td class="text-text-soft py-1 pr-2 text-right whitespace-nowrap align-top">
													—
												</td>
												<td class="py-1 text-right align-top">{fmt(d.debitTotal_m3h)} m³/h</td>
											</tr>
										{/each}
									</tbody>
								</table>
							</div>
						{/if}
						{#if projet.options.afficherComparaisonEuropeenne}
							<div
								class="border-line-soft text-text-soft flex flex-wrap items-center gap-3 border-t px-4 py-2 font-mono text-[11.5px]"
								data-section="comparaison-en16798"
							>
								<span class="text-text-dim">NF EN 16798 (cat. bât. {projet.options.categorieBatiment}) :</span>
								<span>QAI 1 : {fmt(l.comparaisonNfEn16798.debitQAI1_m3h)} m³/h</span>
								<span>·</span>
								<span>QAI 2 : {fmt(l.comparaisonNfEn16798.debitQAI2_m3h)} m³/h</span>
								<span>·</span>
								<span>QAI 3 : {fmt(l.comparaisonNfEn16798.debitQAI3_m3h)} m³/h</span>
								{#if l.comparaisonNfEn16798.ratioMiniFrSurQAI2 > 0}
									<span class="text-text-dim ml-auto">
										ratio FR / QAI 2 : {fmt(l.comparaisonNfEn16798.ratioMiniFrSurQAI2 * 100, 0)} %
									</span>
								{/if}
							</div>
						{/if}
						{#if l.verification}
							{@const v = l.verification}
							<div class="border-line-soft border-t px-4 py-2">
								<p class={`font-mono text-[12px] ${verdictTone[v.verdict === 'conforme' ? 'conforme' : v.verdict === 'limite' ? 'acceptable_avec_reserves' : 'non_conforme']}`}>
									Vérif. installation : {fmt(v.debitInstalle_m3h)} m³/h, écart {fmt(v.ecart_pct, 1)} %
									({v.verdict})
								</p>
							</div>
						{/if}
					</section>
				{/each}

				<!-- Warnings -->
				{#if r.warnings.length > 0}
					<section class="border-amber/40 bg-amber/5 flex gap-3 rounded border p-4">
						<TriangleAlert class="text-amber mt-0.5 size-4 shrink-0" />
						<div class="min-w-0 space-y-1.5">
							<h2 class="text-amber font-mono text-[11px] tracking-wide uppercase">Alertes</h2>
							<ul class="text-foreground space-y-1 text-[12.5px]">
								{#each r.warnings as w (w.code + (w.local ?? '') + w.message)}
									<li class="before:text-amber before:mr-2 before:content-['›']">{w.message}</li>
								{/each}
							</ul>
						</div>
					</section>
				{/if}

				<!-- Textes appliqués -->
				<details class="border-line-soft rounded border">
					<summary
						class="text-text-dim hover:text-text-soft flex cursor-pointer items-center gap-2 px-4 py-2 font-mono text-[11px] tracking-wide uppercase select-none"
					>
						<Info class="size-3.5" /> Textes légaux appliqués
					</summary>
					<ul class="text-text-soft border-t px-4 py-2 font-mono text-[12px]">
						{#each r.textesLegauxAppliques as t (t)}
							<li>· {t}</li>
						{/each}
					</ul>
				</details>
			{/if}
		</output>
	</div>

	<!-- SEO long-tail -->
	<div class="sr-only">
		<h2>Débit d'air hygiénique — calcul réglementaire bâtiments tertiaires</h2>
		<p>
			Calcul du débit minimal d'air neuf à introduire dans un local ou un bâtiment selon le Code
			du Travail (R4222-6, R4212-6), le Règlement Sanitaire Départemental Type (RSDT 64.1 ERP
			pollution non spécifique, RSDT 64.2 pollution spécifique cuisines collectives et
			sanitaires), l'arrêté du 31 août 2021 pour les crèches, la norme NF S 90-351 pour les
			zones à risque infectieux en santé, et comparaison avec NF EN 16798-1 méthode 1.
			Périmètre : tertiaire, ERP, santé, enseignement, restauration, sport, industrie.
			Logement hors scope.
		</p>
	</div>
</ToolShell>
