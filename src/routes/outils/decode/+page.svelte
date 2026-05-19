<script lang="ts">
	import { onMount } from 'svelte';
	import { replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import Play from '@lucide/svelte/icons/play';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import ArrowDownToLine from '@lucide/svelte/icons/arrow-down-to-line';
	import ArrowUpToLine from '@lucide/svelte/icons/arrow-up-to-line';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Code2 from '@lucide/svelte/icons/code-2';

	import ToolShell from '$lib/components/tools/ToolShell.svelte';
	import DeviceSelector from '$lib/components/tools/decode/DeviceSelector.svelte';
	import PayloadInput from '$lib/components/tools/decode/PayloadInput.svelte';
	import PortInput from '$lib/components/tools/decode/PortInput.svelte';
	import ResultDisplay from '$lib/components/tools/decode/ResultDisplay.svelte';
	import ErrorDisplay from '$lib/components/tools/decode/ErrorDisplay.svelte';
	import CodecSnippet from '$lib/components/tools/decode/CodecSnippet.svelte';
	import EncoderForm from '$lib/components/tools/decode/EncoderForm.svelte';
	import EncoderResult from '$lib/components/tools/decode/EncoderResult.svelte';

	import { getTool } from '$lib/tools/registry';
	import { loadManifest } from '$lib/tools/decode/manifest';
	import { decode, encode } from '$lib/tools/decode/decoder';
	import { parsePayload } from '$lib/tools/decode/formats';
	import { timeAgoFr } from '$lib/tools/decode/relative-time';
	import type {
		DecodeResult,
		EncodeResult,
		Manifest,
		ManifestDevice,
		PayloadFormat,
		ToolMode
	} from '$lib/tools/decode/types';

	const tool = getTool('decode')!;

	let mode = $state<ToolMode>('decode');
	let selectedSlug = $state<string | undefined>(undefined);

	// Decoder state
	let payload = $state('');
	let format = $state<PayloadFormat>('hex');
	let fPort = $state(1);
	let decodeResult = $state<DecodeResult | null>(null);
	let decoding = $state(false);

	// Encoder state
	let encodeData = $state('');
	let encodeFPort = $state(1);
	let encodeResult = $state<EncodeResult | null>(null);
	let encoding = $state(false);
	// Index de l'exemple downlink courant tel quel (null si édité ou si manuel).
	let appliedExampleIdx = $state<number | null>(null);
	// Snapshot des bytes / label attendus capturé au moment de l'encode (le badge
	// reflète l'état au moment de l'action, pas celui de la session après édition).
	let referenceSnapshot = $state<{ bytes: number[]; label: string } | null>(null);

	let manifestRef = $state<Manifest | null>(null);
	let codecPanelOpen = $state(false);

	const selectedDevice = $derived.by(() => {
		if (!manifestRef || !selectedSlug) return undefined;
		return manifestRef.devices.find((d) => d.slug === selectedSlug);
	});

	const canEncode = $derived(!!selectedDevice?.hasEncoder);

	const canDecodeBtn = $derived(
		!!selectedDevice &&
			!!payload.trim() &&
			Number.isInteger(fPort) &&
			fPort >= 1 &&
			fPort <= 223
	);

	const canEncodeBtn = $derived.by(() => {
		if (!selectedDevice?.hasEncoder) return false;
		if (!encodeData.trim()) return false;
		try {
			JSON.parse(encodeData);
		} catch {
			return false;
		}
		return Number.isInteger(encodeFPort) && encodeFPort >= 1 && encodeFPort <= 223;
	});

	onMount(async () => {
		try {
			manifestRef = await loadManifest();
		} catch {
			// le selector affichera son propre message d'erreur si besoin
		}

		const sp = page.url.searchParams;
		const qDevice = sp.get('device');
		const qPort = sp.get('port');
		const qPayload = sp.get('payload');
		const qFmt = sp.get('fmt');
		const qMode = sp.get('mode');
		const qData = sp.get('data');
		const qEncPort = sp.get('encPort');

		if (qDevice) selectedSlug = qDevice;
		if (qPort) {
			const n = parseInt(qPort, 10);
			if (Number.isInteger(n) && n >= 1 && n <= 223) fPort = n;
		}
		if (qPayload) payload = qPayload;
		if (qFmt === 'hex' || qFmt === 'base64') format = qFmt;
		if (qMode === 'encode' || qMode === 'decode') mode = qMode;
		if (qData) {
			try {
				encodeData = decodeURIComponent(qData);
			} catch {
				/* ignore */
			}
		}
		if (qEncPort) {
			const n = parseInt(qEncPort, 10);
			if (Number.isInteger(n) && n >= 1 && n <= 223) encodeFPort = n;
		}

		// Si le mode encode demandé mais device sans encodeur → fallback decode silencieux
		if (mode === 'encode' && manifestRef && selectedSlug) {
			const d = manifestRef.devices.find((x) => x.slug === selectedSlug);
			if (d && !d.hasEncoder) mode = 'decode';
		}

		// Auto-decode si tout est là
		if (manifestRef && selectedSlug && mode === 'decode' && payload.trim()) {
			await runDecode();
		}
		// Auto-encode si tout est là
		if (manifestRef && selectedSlug && mode === 'encode' && encodeData.trim()) {
			await runEncode();
		}
	});

	function pushUrl() {
		if (typeof window === 'undefined') return;
		const u = new URL(window.location.href);
		if (selectedSlug) u.searchParams.set('device', selectedSlug);
		else u.searchParams.delete('device');
		u.searchParams.set('mode', mode);
		if (mode === 'decode') {
			u.searchParams.set('port', String(fPort));
			u.searchParams.set('fmt', format);
			if (payload) u.searchParams.set('payload', payload);
			else u.searchParams.delete('payload');
			u.searchParams.delete('data');
			u.searchParams.delete('encPort');
		} else {
			u.searchParams.set('encPort', String(encodeFPort));
			if (encodeData) u.searchParams.set('data', encodeURIComponent(encodeData));
			else u.searchParams.delete('data');
			u.searchParams.delete('payload');
			u.searchParams.delete('port');
			u.searchParams.delete('fmt');
		}
		replaceState(u, page.state);
	}

	function onSelect(d: ManifestDevice | undefined) {
		selectedSlug = d?.slug;
		// Si le device suggère un seul fPort et qu'on est encore sur le défaut,
		// on l'applique pour rendre la première saisie plus directe.
		if (d?.fPorts.length === 1 && fPort === 1) fPort = d.fPorts[0];
		// Bascule auto en decode si le nouveau device n'a pas d'encodeur
		if (!d?.hasEncoder && mode === 'encode') mode = 'decode';
		decodeResult = null;
		encodeResult = null;
		// Reset encoder data quand on change de device (les exemples sont per-device)
		encodeData = '';
		appliedExampleIdx = null;
		referenceSnapshot = null;
		pushUrl();
	}

	function setMode(m: ToolMode) {
		if (m === mode) return;
		mode = m;
		// On garde les résultats existants pour faciliter l'allers-retours
		pushUrl();
	}

	async function runDecode() {
		if (!selectedDevice) return;
		decoding = true;
		decodeResult = null;
		try {
			const bytes = parsePayload(payload, format);
			decodeResult = await decode({ device: selectedDevice, bytes, fPort, format });
		} catch (e) {
			decodeResult = {
				ok: false,
				stage: 'parse-payload',
				message: (e as Error)?.message ?? String(e)
			};
		} finally {
			decoding = false;
		}
	}

	async function runEncode() {
		if (!selectedDevice) return;
		encoding = true;
		encodeResult = null;

		// Snapshot de la référence active (exemple appliqué tel quel + output dispo)
		referenceSnapshot = null;
		if (appliedExampleIdx !== null) {
			const ex = selectedDevice.downlinkExamples?.[appliedExampleIdx];
			if (ex?.output?.bytes) {
				referenceSnapshot = {
					bytes: ex.output.bytes,
					label: ex.description ?? `Exemple ${appliedExampleIdx + 1}`
				};
			}
		}

		try {
			let parsed: unknown;
			try {
				parsed = JSON.parse(encodeData);
			} catch (e) {
				encodeResult = {
					ok: false,
					stage: 'parse-input',
					message: `JSON invalide : ${(e as Error)?.message ?? String(e)}`
				};
				return;
			}
			encodeResult = await encode({ device: selectedDevice, data: parsed, fPort: encodeFPort });
		} finally {
			encoding = false;
		}
	}

	async function loadDecodeExample() {
		if (!selectedDevice) return;
		const ex = selectedDevice.examples[0];
		if (!ex) return;
		// Format hex sans séparateur pour rester compact dans l'URL
		payload = ex.bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
		format = 'hex';
		fPort = ex.fPort;
		pushUrl();
		// L'exemple est là pour être décodé — pas de raison de demander un clic de plus.
		await runDecode();
	}

	const catalogAge = $derived(manifestRef ? timeAgoFr(manifestRef.source.commitDate) : '');
</script>

<ToolShell
	{tool}
	seoTitle="Décodeur & Encodeur Payload LoRaWAN — OpenGTB"
	seoDescription="Décodez et encodez vos payloads LoRaWAN dans votre navigateur. 900+ devices supportés (Milesight, MClimate, Adeunis, Decentlab, Netvox, Dragino, Tektelic) depuis le repo TheThingsNetwork/lorawan-devices. Téléchargez le codec prêt pour TTN v3 ou ChirpStack v4. Gratuit, sans inscription, calcul local."
>
	<div class="grid gap-6 md:grid-cols-2">
		<div class="min-w-0 space-y-4">
			<DeviceSelector bind:value={selectedSlug} {onSelect} />

			{#if selectedDevice?.downloads}
				<details
					class="border-line-soft bg-surface group min-w-0 overflow-hidden rounded border"
					ontoggle={(e) => (codecPanelOpen = (e.currentTarget as HTMLDetailsElement).open)}
				>
					<summary
						class="hover:bg-secondary/30 flex cursor-pointer flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2 font-mono text-[12.5px]"
					>
						<ChevronDown
							class="size-3.5 shrink-0 transition-transform {codecPanelOpen
								? 'rotate-0'
								: '-rotate-90'} text-text-dim"
						/>
						<Code2 class="text-primary size-3.5 shrink-0" />
						<span>Récupérer le codec prêt à l'emploi</span>
						<span class="text-text-dim text-[11px]">(TTN v3 / ChirpStack v4)</span>
					</summary>
					{#if codecPanelOpen}
						<div class="min-w-0 px-2 pt-1 pb-2">
							<CodecSnippet device={selectedDevice} />
						</div>
					{/if}
				</details>
			{/if}

			{#if selectedDevice}
				<!-- Mode toggle : Décoder uplink / Encoder downlink -->
				<div
					class="border-border bg-card rounded-md border p-1.5"
					role="radiogroup"
					aria-label="Mode de l'outil"
				>
					<div class="flex items-stretch gap-1.5">
						<button
							type="button"
							role="radio"
							aria-checked={mode === 'decode'}
							onclick={() => setMode('decode')}
							class="flex flex-1 items-center justify-center gap-2 rounded-sm px-3 py-2 font-mono transition-colors {mode ===
							'decode'
								? 'bg-primary text-primary-foreground'
								: 'text-text-soft hover:bg-line-soft/40 hover:text-foreground'}"
						>
							<ArrowDownToLine class="size-3.5" aria-hidden="true" />
							<span class="text-[12.5px] font-semibold tracking-wide">Décoder uplink</span>
						</button>
						<button
							type="button"
							role="radio"
							aria-checked={mode === 'encode'}
							onclick={() => setMode('encode')}
							disabled={!canEncode}
							title={canEncode
								? 'Encoder une commande downlink'
								: "Ce device n'expose pas d'encodeur downlink"}
							class="flex flex-1 items-center justify-center gap-2 rounded-sm px-3 py-2 font-mono transition-colors disabled:cursor-not-allowed disabled:opacity-40 {mode ===
							'encode'
								? 'bg-primary text-primary-foreground'
								: 'text-text-soft hover:bg-line-soft/40 hover:text-foreground'}"
						>
							<ArrowUpToLine class="size-3.5" aria-hidden="true" />
							<span class="text-[12.5px] font-semibold tracking-wide">Encoder downlink</span>
						</button>
					</div>
				</div>
			{/if}

			{#if mode === 'decode'}
				<PayloadInput bind:value={payload} bind:format onChange={pushUrl} />
				<PortInput bind:value={fPort} suggested={selectedDevice?.fPorts} onChange={pushUrl} />

				<div class="flex flex-wrap items-center gap-3">
					<button
						type="button"
						onclick={runDecode}
						disabled={!canDecodeBtn || decoding}
						class="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring inline-flex items-center justify-center gap-2 rounded px-4 py-2 font-mono text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					>
						{#if decoding}
							<Loader2 class="size-4 animate-spin" /> Décodage…
						{:else}
							<Play class="size-4" /> Décoder
						{/if}
					</button>

					{#if selectedDevice && selectedDevice.examples.length > 0}
						<button
							type="button"
							onclick={loadDecodeExample}
							class="text-text-soft hover:text-primary focus-visible:ring-ring font-mono text-[11.5px] underline-offset-2 transition-colors hover:underline focus-visible:ring-2 focus-visible:outline-none"
						>
							Charger un exemple
						</button>
					{/if}
				</div>
			{:else if selectedDevice}
				<EncoderForm
					device={selectedDevice}
					bind:data={encodeData}
					bind:fPort={encodeFPort}
					bind:appliedExampleIdx
					onChange={pushUrl}
				/>

				<div class="flex flex-wrap items-center gap-3">
					<button
						type="button"
						onclick={runEncode}
						disabled={!canEncodeBtn || encoding}
						class="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring inline-flex items-center justify-center gap-2 rounded px-4 py-2 font-mono text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					>
						{#if encoding}
							<Loader2 class="size-4 animate-spin" /> Encodage…
						{:else}
							<Play class="size-4" /> Encoder
						{/if}
					</button>
				</div>
			{/if}
		</div>

		<div class="min-w-0 md:min-h-[300px]">
			{#if mode === 'decode'}
				{#if decodeResult?.ok}
					<ResultDisplay result={decodeResult} />
				{:else if decodeResult && !decodeResult.ok}
					<ErrorDisplay failure={decodeResult} />
				{:else}
					<div
						class="text-text-dim border-line-soft flex h-full min-h-[200px] items-center justify-center rounded border border-dashed px-4 py-8 text-center text-sm"
					>
						<p>
							Sélectionnez un device, collez votre payload,<br /> puis cliquez sur Décoder.
						</p>
					</div>
				{/if}
			{:else if encodeResult?.ok}
				<EncoderResult
					result={encodeResult}
					referenceBytes={referenceSnapshot?.bytes}
					referenceLabel={referenceSnapshot?.label}
				/>
			{:else if encodeResult && !encodeResult.ok}
				<ErrorDisplay failure={encodeResult} />
			{:else}
				<div
					class="text-text-dim border-line-soft flex h-full min-h-[200px] items-center justify-center rounded border border-dashed px-4 py-8 text-center text-sm"
				>
					<p>
						{#if selectedDevice?.downlinkExamples?.length}
							Cliquez un exemple, ajustez les valeurs,<br /> puis cliquez sur Encoder.
						{:else}
							Saisissez la donnée structurée attendue<br /> par votre device, puis cliquez sur Encoder.
						{/if}
					</p>
				</div>
			{/if}
		</div>
	</div>

	<!-- Section pédagogique -->
	<section class="border-line-soft mt-12 space-y-6 border-t pt-8">
		<h2 class="font-mono text-base">Comprendre LoRaWAN — encoder &amp; décoder</h2>

		<div class="grid gap-6 md:grid-cols-2">
			<div class="space-y-2 text-sm leading-relaxed">
				<h3 class="text-foreground font-mono text-[13px]">Récupérer le codec sans décoder une trame</h3>
				<p class="text-text-soft">
					Sélectionnez votre device puis dépliez l'accordéon
					<span class="text-text-dim font-mono text-[12px]">« Récupérer le codec prêt à l'emploi »</span>.
					Vous obtenez le payload formatter du fabricant en deux variantes :
					<strong>TTN v3</strong> (prêt pour TheThingsStack) ou <strong>ChirpStack v4</strong>
					(wrappé pour le runtime TR013). Le fichier inclut decodeUplink, et encodeDownlink si
					le vendor le fournit.
				</p>
			</div>

			<div class="space-y-2 text-sm leading-relaxed">
				<h3 class="text-foreground font-mono text-[13px]">Encoder un downlink : à quoi ça sert ?</h3>
				<p class="text-text-soft">
					Configurer un device LoRaWAN sans passer par la console du Network Server : envoyer une
					consigne (« set valve on »), changer un intervalle de reporting, déclencher une commande de
					test, demander une position à la demande. L'outil compose le payload binaire à partir d'un
					objet structuré, prêt à coller dans l'interface downlink de votre NS (TTN, ChirpStack,
					Loriot, Actility…).
				</p>
			</div>

			<div class="space-y-2 text-sm leading-relaxed">
				<h3 class="text-foreground font-mono text-[13px]">Comment trouver le fPort ?</h3>
				<p class="text-text-soft">
					Le fPort (1 à 223) identifie le type de message côté applicatif. Beaucoup de fabricants
					n'en utilisent qu'un seul (souvent 1, 2, 10, 85 ou 100). D'autres en utilisent plusieurs
					pour différencier données capteur, alarmes et acquittements de configuration. Référez-vous
					à la datasheet du device, ou observez le champ
					<code class="text-text-dim font-mono">f_port</code> de votre trame.
				</p>
			</div>

			<div class="space-y-2 text-sm leading-relaxed">
				<h3 class="text-foreground font-mono text-[13px]">Où récupérer ou envoyer le payload ?</h3>
				<p class="text-text-soft">
					Sur ChirpStack : champ <code class="text-text-dim font-mono">frmPayload</code> (base64) ou
					<code class="text-text-dim font-mono">data</code> en MQTT JSON. Sur The Things Stack :
					<code class="text-text-dim font-mono">uplink_message.frm_payload</code>. Sur Loriot ou Actility
					ThingPark : champ <code class="text-text-dim font-mono">payload_hex</code>. En Niagara :
					objet <code class="text-text-dim font-mono">nFrame</code> du driver LoRaWAN. Pour un
					downlink, la plupart des NS attendent le payload encodé en
					<strong>base64</strong> ou <strong>hex</strong>.
				</p>
			</div>

			<div class="space-y-2 text-sm leading-relaxed">
				<h3 class="text-foreground font-mono text-[13px]">Mon device n'est pas dans la liste ?</h3>
				<p class="text-text-soft">
					Beaucoup de devices génériques utilisent le format <strong>Cayenne LPP</strong> (sélectionnable
					en haut de la liste, decoder uniquement). Sinon, vous pouvez contribuer au catalogue TTN via
					une PR sur
					<a class="text-primary hover:underline" href="https://github.com/TheThingsNetwork/lorawan-devices/blob/master/CONTRIBUTING.md" rel="noopener">le guide de contribution</a>
					— le repo est resynchronisé manuellement à chaque mise à jour d'OpenGTB.
				</p>
			</div>

			<div class="space-y-2 text-sm leading-relaxed">
				<h3 class="text-foreground font-mono text-[13px]">Couverture encodeur</h3>
				<p class="text-text-soft">
					Tous les codecs TTN n'exposent pas la fonction <code class="text-text-dim font-mono">encodeDownlink</code>.
					Sur notre catalogue, environ <strong>la moitié des devices</strong> a un encodeur, et
					<strong>~399 devices</strong> fournissent en plus des exemples downlink cliquables (Netvox,
					Milesight, Decentlab, Tektelic…). Pour les autres, l'onglet « Encoder downlink » est
					automatiquement désactivé.
				</p>
			</div>
		</div>

		<p class="text-text-dim border-line-soft border-t pt-4 font-mono text-[11px]">
			Codecs issus de
			<a class="hover:text-primary underline-offset-2 hover:underline" href="https://github.com/TheThingsNetwork/lorawan-devices" rel="noopener">TheThingsNetwork/lorawan-devices</a>
			sous licence Apache-2.0.
			{#if catalogAge}
				Catalogue mis à jour {catalogAge}.
			{/if}
		</p>
	</section>

	<!-- SEO long-tail, accessible aux lecteurs d'écran et aux crawlers -->
	<div class="sr-only">
		<h2>Décodeurs et encodeurs LoRaWAN supportés</h2>
		<p>
			Décoder et encoder un payload LoRaWAN MClimate Vicki, Milesight AM102, Milesight WT101,
			Dragino LHT65, Adeunis Comfort CO2, Enless TX Pulse 600, Cayenne LPP, Netvox, Decentlab,
			Tektelic, Aquascope. Encoder downlink LoRaWAN, set valve on, position on demand, set target
			temperature, reset device, et plus de 900 références issues du repo TTN lorawan-devices.
		</p>
	</div>
</ToolShell>
