<script lang="ts">
	import { onMount } from 'svelte';
	import { replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import { getTool } from '$lib/tools/registry';
	import ToolShell from '$lib/components/tools/ToolShell.svelte';
	import ModeToggle from '$lib/components/tools/loi-eau/ModeToggle.svelte';
	import Presets from '$lib/components/tools/loi-eau/Presets.svelte';
	import BuildingPanel from '$lib/components/tools/loi-eau/BuildingPanel.svelte';
	import EmitterPanel from '$lib/components/tools/loi-eau/EmitterPanel.svelte';
	import ClimatePanel from '$lib/components/tools/loi-eau/ClimatePanel.svelte';
	import FineTuning from '$lib/components/tools/loi-eau/FineTuning.svelte';
	import TempSlider from '$lib/components/tools/loi-eau/TempSlider.svelte';
	import Graph from '$lib/components/tools/loi-eau/Graph.svelte';
	import Diagnosis from '$lib/components/tools/loi-eau/Diagnosis.svelte';
	import {
		getEmitter,
		getIsolation,
		getZone,
		periodForYear
	} from '$lib/tools/loi-eau/data';
	import { recommend, effectiveUbat } from '$lib/tools/loi-eau/recommend';
	import { tDeparture } from '$lib/tools/loi-eau/calc';
	import { diagnose } from '$lib/tools/loi-eau/diagnose';
	import type {
		BuildingInputs,
		ClimateZoneId,
		EmitterId,
		IsolationLevel,
		LoiEauParams,
		Mode,
		Preset
	} from '$lib/tools/loi-eau/types';

	const tool = getTool('loi-eau')!;

	let mode = $state<Mode>('decouverte');
	let building = $state<BuildingInputs>({ mode: 'fourchette', isolation: 'moyenne' });
	let emitter = $state<EmitterId>('rad-bt');
	let zone = $state<ClimateZoneId>('H1');
	let tAmbiance = $state(20);
	let tExt = $state(-7);

	// userParams : utilisé en mode Pro. En Découverte on affiche directement
	// la recommandation calculée.
	let userParams = $state<LoiEauParams>({
		pente: 1.5,
		parallele: 0,
		tMin: 25,
		tMax: 65,
		tPivot: 20
	});

	const ubat = $derived.by(() => {
		const isoUbat =
			building.isolation !== undefined ? getIsolation(building.isolation)?.ubatTypical : undefined;
		const periodUbat =
			building.annee !== undefined
				? periodForYear(building.annee, building.renoveAnnee).ubatTypical
				: undefined;
		return effectiveUbat({
			ubat: building.ubat,
			periodUbat,
			isolationUbat: isoUbat
		});
	});

	const recommended = $derived(
		recommend({ emitter, zone, tPivot: tAmbiance, ubat })
	);

	const params = $derived(mode === 'decouverte' ? recommended : userParams);

	const tDepNow = $derived(tDeparture(tExt, params));
	const tDepRecommended = $derived(tDeparture(tExt, recommended));

	const diagnostics = $derived(
		mode === 'pro'
			? diagnose({ emitter, zone, params })
			: diagnose({ emitter, zone, params: recommended })
	);

	const emitterSpec = $derived(getEmitter(emitter));

	// Synchronise userParams sur la recommandation quand on bascule en Pro
	// pour la première fois ou à chaque changement de paramètres bâtiment
	// tant qu'on est en Découverte.
	$effect(() => {
		if (mode === 'decouverte') {
			userParams = recommended;
		}
	});

	function resetToRecommended() {
		userParams = recommended;
	}

	function applyPreset(p: Preset) {
		building = p.state.building;
		emitter = p.state.emitter;
		zone = p.state.zone;
		if (p.state.tAmbiance !== undefined) tAmbiance = p.state.tAmbiance;
		const zSpec = getZone(p.state.zone);
		if (zSpec) tExt = zSpec.baseTemp;
	}

	// Met à jour la T° pivot des params en cohérence avec tAmbiance.
	$effect(() => {
		if (userParams.tPivot !== tAmbiance) {
			userParams = { ...userParams, tPivot: tAmbiance };
		}
	});

	// ── URL sync ──────────────────────────────────────────────────────
	let hydrated = $state(false);

	function readUrl(url: URL) {
		const sp = url.searchParams;
		const m = sp.get('mode');
		if (m === 'pro' || m === 'decouverte') mode = m;

		const e = sp.get('emitter');
		if (e && getEmitter(e)) emitter = e as EmitterId;

		const z = sp.get('zone');
		if (z && getZone(z)) zone = z as ClimateZoneId;

		const iso = sp.get('iso');
		if (iso && getIsolation(iso)) building = { mode: 'fourchette', isolation: iso as IsolationLevel };
		const annee = sp.get('annee');
		if (annee && !isNaN(parseInt(annee, 10))) {
			const reno = sp.get('reno');
			building = {
				mode: 'annee',
				annee: parseInt(annee, 10),
				renoveAnnee: reno ? parseInt(reno, 10) : undefined
			};
		}
		const ub = sp.get('ubat');
		if (ub && !isNaN(parseFloat(ub))) {
			building = { mode: 'ubat', ubat: parseFloat(ub) };
		}

		const ta = sp.get('tamb');
		if (ta && !isNaN(parseFloat(ta))) tAmbiance = parseFloat(ta);

		const te = sp.get('text');
		if (te && !isNaN(parseFloat(te))) tExt = parseFloat(te);

		const pente = sp.get('pente');
		const parallele = sp.get('parallele');
		const tMin = sp.get('tmin');
		const tMax = sp.get('tmax');
		const next = { ...userParams };
		if (pente && !isNaN(parseFloat(pente))) next.pente = parseFloat(pente);
		if (parallele && !isNaN(parseFloat(parallele))) next.parallele = parseFloat(parallele);
		if (tMin && !isNaN(parseFloat(tMin))) next.tMin = parseFloat(tMin);
		if (tMax && !isNaN(parseFloat(tMax))) next.tMax = parseFloat(tMax);
		userParams = next;
	}

	function writeUrl() {
		if (!hydrated) return;
		const url = new URL(page.url);
		const sp = url.searchParams;
		sp.set('mode', mode);
		sp.set('emitter', emitter);
		sp.set('zone', zone);
		sp.delete('iso');
		sp.delete('annee');
		sp.delete('reno');
		sp.delete('ubat');
		if (building.mode === 'fourchette' && building.isolation) sp.set('iso', building.isolation);
		else if (building.mode === 'annee' && building.annee !== undefined) {
			sp.set('annee', String(building.annee));
			if (building.renoveAnnee !== undefined) sp.set('reno', String(building.renoveAnnee));
		} else if (building.mode === 'ubat' && building.ubat !== undefined) {
			sp.set('ubat', String(building.ubat));
		}
		sp.set('tamb', String(tAmbiance));
		sp.set('text', String(tExt));
		if (mode === 'pro') {
			sp.set('pente', String(userParams.pente));
			sp.set('parallele', String(userParams.parallele));
			sp.set('tmin', String(userParams.tMin));
			sp.set('tmax', String(userParams.tMax));
		} else {
			sp.delete('pente');
			sp.delete('parallele');
			sp.delete('tmin');
			sp.delete('tmax');
		}
		replaceState(url.pathname + '?' + sp.toString(), {});
	}

	onMount(() => {
		readUrl(page.url);
		hydrated = true;
	});

	$effect(() => {
		// re-déclenche à chaque changement significatif
		mode;
		emitter;
		zone;
		building;
		tAmbiance;
		tExt;
		userParams.pente;
		userParams.parallele;
		userParams.tMin;
		userParams.tMax;
		writeUrl();
	});
</script>

<ToolShell
	{tool}
	seoTitle="Loi d'eau / Courbe de chauffe — OpenGTB"
	seoDescription="Visualisez et réglez la loi d'eau de votre chaufferie. Recommandation automatique selon le bâtiment et l'émetteur. Gratuit, sans inscription."
>
	<div class="space-y-5">
		<ModeToggle bind:value={mode} />

		<Presets onApply={applyPreset} />

		<div class="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">
			<!-- Graphe + slider live -->
			<div class="order-2 space-y-5 lg:order-1">
				<Graph
					{params}
					recommended={mode === 'pro' ? recommended : undefined}
					{tExt}
					{zone}
					showRecommended={mode === 'pro'}
					emitterMaxT={emitterSpec?.defaultMaxT ?? 85}
				/>
				<TempSlider
					bind:tExt
					tDeparture={tDepNow}
					tDepartureRecommended={mode === 'pro' ? tDepRecommended : undefined}
					showRecommended={mode === 'pro'}
				/>
				{#if mode === 'pro'}
					<Diagnosis diagnostics={diagnostics} />
				{/if}
			</div>

			<!-- Contrôles -->
			<div class="order-1 space-y-4 lg:order-2">
				<BuildingPanel bind:building {mode} />
				<EmitterPanel bind:value={emitter} />
				<ClimatePanel bind:zone bind:tAmbiance />
				{#if mode === 'pro'}
					<FineTuning bind:params={userParams} onReset={resetToRecommended} />
				{/if}
			</div>
		</div>

		<!-- Section pédagogique -->
		<section class="border-border bg-card mt-6 rounded-md border p-5">
			<h2 class="font-mono text-[11.5px] tracking-[0.1em] uppercase">
				<span class="text-primary">§</span> comprendre la loi d'eau
			</h2>

			<div class="prose-content text-text-soft mt-4 max-w-3xl space-y-4 text-[14px] leading-[1.65]">
				<p>
					<strong class="text-foreground">Qu'est-ce qu'une loi d'eau ?</strong>
					En chauffage à eau, plus il fait froid dehors, plus il faut envoyer chaud aux émetteurs
					pour compenser les déperditions du bâtiment. La loi d'eau (ou « courbe de chauffe »)
					formalise cette relation : <em>T° de départ = f (T° extérieure)</em>. Le régulateur
					climatique de la chaufferie lit la sonde extérieure et applique automatiquement la T° de
					départ correspondante.
				</p>

				<p>
					<strong class="text-foreground">La pente</strong>
					exprime l'agressivité de la réponse au froid. À forte pente (radiateurs HT, bâti peu
					isolé), la T° de départ grimpe vite dès que la T° extérieure baisse. À faible pente
					(plancher chauffant, bâti bien isolé), la courbe est plus plate.
				</p>

				<p>
					<strong class="text-foreground">Le parallèle</strong>
					translate toute la courbe verticalement : +2 °C de parallèle = chaque T° de départ est
					relevée de 2 °C, sans modifier la dynamique. C'est l'outil de calage fin si le confort
					ressenti est légèrement insuffisant ou excessif sur toute la saison.
				</p>

				<p>
					<strong class="text-foreground">Pourquoi le pivot à T° ambiance ?</strong>
					Quand la T° extérieure rejoint l'ambiance souhaitée, le bâtiment n'a plus besoin de
					chauffer. Toutes les courbes passent donc par ce point pivot — typiquement (20 °C, 20 °C).
					Au-dessus, la régulation arrête la production.
				</p>

				<p>
					<strong class="text-foreground">Pentes typiques par émetteur (zone H1, pivot 20 °C) :</strong>
				</p>
				<ul class="ml-5 list-disc space-y-1">
					<li>Plancher chauffant — pente ≈ <span class="font-mono">0.4 à 0.9</span></li>
					<li>Radiateur basse température — pente ≈ <span class="font-mono">1.0 à 1.6</span></li>
					<li>Ventilo-convecteur eau chaude — pente ≈ <span class="font-mono">1.2 à 1.8</span></li>
					<li>Radiateur haute température — pente ≈ <span class="font-mono">1.6 à 2.4</span></li>
					<li>Aérotherme — pente ≈ <span class="font-mono">1.6 à 2.4</span></li>
				</ul>

				<p>
					<strong class="text-foreground">Procédure de réglage en pratique :</strong>
				</p>
				<ol class="ml-5 list-decimal space-y-1">
					<li>Choisir une journée vraiment froide (proche de la T° base de la zone).</li>
					<li>Mesurer la T° ambiance ressentie au plus déficitaire (chambre la plus froide).</li>
					<li>Si trop froid à froid → augmenter la <em>pente</em>. Si trop chaud → la baisser.</li>
					<li>
						Attendre une journée douce (5–10 °C ext). Si ressenti trop chaud à doux → baisser
						<em>parallèle</em>.
					</li>
					<li>Itérer 2 à 3 saisons. Toujours laisser 24 h entre deux ajustements (inertie).</li>
				</ol>

				<p>
					<strong class="text-foreground">Cas chaudière à condensation :</strong>
					la condensation n'a lieu que si la T° de retour reste sous le point de rosée des fumées,
					soit en pratique &lt; 55 °C. Cela impose de viser un régime <em>basse température</em>
					(rad BT ou plancher) et de plafonner T° max. Avec une chaudière condensation sur radiateurs
					HT non-redimensionnés, l'économie est limitée par temps froid.
				</p>

				<p>
					<strong class="text-foreground">Cas plancher chauffant :</strong>
					la NF EN 1264 plafonne la T° de surface du sol à 28 °C en zone d'occupation (29 °C en
					salle de bain), soit ~45 °C max au départ. Au-delà, risque de dégradation de la chape et
					inconfort. Pente très douce, parallèle modérée, et toujours un thermostat de sécurité
					hydraulique en série.
				</p>

				<p class="text-text-dim border-line-soft border-l-2 pl-3 text-[13px] italic">
					Outils OpenGTB liés :
					<a href="/outils/conv" class="text-primary hover:underline">convertisseur d'unités</a> ·
					<a href="/outils/v3v" class="text-primary hover:underline">vanne 3 voies</a> ·
					<a href="/outils/dju" class="text-primary hover:underline">degrés-jours unifiés</a>.
				</p>
			</div>
		</section>
	</div>
</ToolShell>
