<script lang="ts">
	import { onMount } from 'svelte';
	import { replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import Play from '@lucide/svelte/icons/play';
	import Loader2 from '@lucide/svelte/icons/loader-2';

	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Code2 from '@lucide/svelte/icons/code-2';

	import ToolShell from '$lib/components/tools/ToolShell.svelte';
	import DeviceSelector from '$lib/components/tools/decode/DeviceSelector.svelte';
	import PayloadInput from '$lib/components/tools/decode/PayloadInput.svelte';
	import PortInput from '$lib/components/tools/decode/PortInput.svelte';
	import ResultDisplay from '$lib/components/tools/decode/ResultDisplay.svelte';
	import ErrorDisplay from '$lib/components/tools/decode/ErrorDisplay.svelte';
	import CodecSnippet from '$lib/components/tools/decode/CodecSnippet.svelte';

	import { getTool } from '$lib/tools/registry';
	import { loadManifest } from '$lib/tools/decode/manifest';
	import { decode } from '$lib/tools/decode/decoder';
	import { parsePayload } from '$lib/tools/decode/formats';
	import { timeAgoFr } from '$lib/tools/decode/relative-time';
	import type {
		DecodeResult,
		Manifest,
		ManifestDevice,
		PayloadFormat
	} from '$lib/tools/decode/types';

	const tool = getTool('decode')!;

	let selectedSlug = $state<string | undefined>(undefined);
	let payload = $state('');
	let format = $state<PayloadFormat>('hex');
	let fPort = $state(1);
	let result = $state<DecodeResult | null>(null);
	let decoding = $state(false);
	let manifestRef = $state<Manifest | null>(null);
	let codecPanelOpen = $state(false);

	const selectedDevice = $derived.by(() => {
		if (!manifestRef || !selectedSlug) return undefined;
		return manifestRef.devices.find((d) => d.slug === selectedSlug);
	});

	const canDecode = $derived(
		!!selectedDevice &&
			!!payload.trim() &&
			Number.isInteger(fPort) &&
			fPort >= 1 &&
			fPort <= 223
	);

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

		if (qDevice) selectedSlug = qDevice;
		if (qPort) {
			const n = parseInt(qPort, 10);
			if (Number.isInteger(n) && n >= 1 && n <= 223) fPort = n;
		}
		if (qPayload) payload = qPayload;
		if (qFmt === 'hex' || qFmt === 'base64') format = qFmt;

		if (manifestRef && selectedSlug && payload.trim()) {
			await runDecode();
		}
	});

	function pushUrl() {
		if (typeof window === 'undefined') return;
		const u = new URL(window.location.href);
		if (selectedSlug) u.searchParams.set('device', selectedSlug);
		else u.searchParams.delete('device');
		u.searchParams.set('port', String(fPort));
		u.searchParams.set('fmt', format);
		if (payload) u.searchParams.set('payload', payload);
		else u.searchParams.delete('payload');
		replaceState(u, page.state);
	}

	function onSelect(d: ManifestDevice | undefined) {
		selectedSlug = d?.slug;
		// Si le device suggère un seul fPort et qu'on est encore sur le défaut,
		// on l'applique pour rendre la première saisie plus directe.
		if (d?.fPorts.length === 1 && fPort === 1) fPort = d.fPorts[0];
		result = null;
		pushUrl();
	}

	async function runDecode() {
		if (!selectedDevice) return;
		decoding = true;
		result = null;
		try {
			const bytes = parsePayload(payload, format);
			result = await decode({ device: selectedDevice, bytes, fPort, format });
		} catch (e) {
			result = {
				ok: false,
				stage: 'parse-payload',
				message: (e as Error)?.message ?? String(e)
			};
		} finally {
			decoding = false;
		}
	}

	async function loadExample() {
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

	const catalogAge = $derived(
		manifestRef ? timeAgoFr(manifestRef.source.commitDate) : ''
	);
</script>

<ToolShell
	{tool}
	seoTitle="Décodeur Payload LoRaWAN — OpenGTB"
	seoDescription="Décodez n'importe quel payload LoRaWAN dans votre navigateur. Plus de 900 devices supportés (Milesight, MClimate, Adeunis, Enless, Dragino…) depuis le repo TheThingsNetwork/lorawan-devices. Gratuit, sans inscription, calcul local."
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

			<PayloadInput bind:value={payload} bind:format onChange={pushUrl} />
			<PortInput bind:value={fPort} suggested={selectedDevice?.fPorts} onChange={pushUrl} />

			<div class="flex flex-wrap items-center gap-3">
				<button
					type="button"
					onclick={runDecode}
					disabled={!canDecode || decoding}
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
						onclick={loadExample}
						class="text-text-soft hover:text-primary focus-visible:ring-ring font-mono text-[11.5px] underline-offset-2 transition-colors hover:underline focus-visible:ring-2 focus-visible:outline-none"
					>
						Charger un exemple
					</button>
				{/if}
			</div>
		</div>

		<div class="min-w-0 md:min-h-[300px]">
			{#if result?.ok}
				<ResultDisplay {result} />
			{:else if result && !result.ok}
				<ErrorDisplay failure={result} />
			{:else}
				<div
					class="text-text-dim border-line-soft flex h-full min-h-[200px] items-center justify-center rounded border border-dashed px-4 py-8 text-center text-sm"
				>
					<p>
						Sélectionnez un device, collez votre payload,<br /> puis cliquez sur Décoder.
					</p>
				</div>
			{/if}
		</div>
	</div>

	<!-- Section pédagogique -->
	<section class="border-line-soft mt-12 space-y-6 border-t pt-8">
		<h2 class="font-mono text-base">Comprendre le décodage LoRaWAN</h2>

		<div class="grid gap-6 md:grid-cols-2">
			<div class="space-y-2 text-sm leading-relaxed">
				<h3 class="text-foreground font-mono text-[13px]">Récupérer le codec sans décoder une trame</h3>
				<p class="text-text-soft">
					Sélectionnez votre device puis dépliez l'accordéon
					<span class="text-text-dim font-mono text-[12px]">« Récupérer le codec prêt à l'emploi »</span>.
					Vous obtenez le payload formatter du fabricant en deux variantes : <strong>TTN v3</strong>
					(prêt pour TheThingsStack) ou <strong>ChirpStack v4</strong> (wrappé pour le runtime TR013).
					Un clic pour copier ou télécharger le <code class="text-text-dim font-mono">.js</code>,
					les instructions d'installation par NS sont rappelées dans le panneau.
				</p>
			</div>

			<div class="space-y-2 text-sm leading-relaxed">
				<h3 class="text-foreground font-mono text-[13px]">Qu'est-ce qu'un payload LoRaWAN ?</h3>
				<p class="text-text-soft">
					Un payload LoRaWAN est la couche applicative d'une trame uplink : quelques octets opaques
					encodés par le device, transmis tels quels par la passerelle et le network server. C'est au
					destinataire de connaître le format pour les interpréter — chaque fabricant définit le sien.
					Ce décodeur exécute le payload formatter publié par le fabricant via le repo
					<a class="text-primary hover:underline" href="https://github.com/TheThingsNetwork/lorawan-devices" rel="noopener">TheThingsNetwork/lorawan-devices</a>.
				</p>
			</div>

			<div class="space-y-2 text-sm leading-relaxed">
				<h3 class="text-foreground font-mono text-[13px]">Comment trouver le fPort ?</h3>
				<p class="text-text-soft">
					Le fPort (1 à 223) identifie le type de message côté applicatif. Beaucoup de fabricants
					n'en utilisent qu'un seul (souvent 1, 2, 10, 85 ou 100). D'autres en utilisent plusieurs
					pour différencier données capteur, alarmes et acquittements de configuration. Référez-vous
					à la datasheet du device, ou observez le champ <code class="text-text-dim font-mono">f_port</code> de votre trame.
				</p>
			</div>

			<div class="space-y-2 text-sm leading-relaxed">
				<h3 class="text-foreground font-mono text-[13px]">Où récupérer le payload ?</h3>
				<p class="text-text-soft">
					Sur ChirpStack : champ <code class="text-text-dim font-mono">frmPayload</code> (base64) ou
					<code class="text-text-dim font-mono">data</code> en MQTT JSON. Sur The Things Stack :
					<code class="text-text-dim font-mono">uplink_message.frm_payload</code>. Sur Loriot ou Actility ThingPark :
					champ <code class="text-text-dim font-mono">payload_hex</code>. En Niagara : objet
					<code class="text-text-dim font-mono">nFrame</code> du driver LoRaWAN.
				</p>
			</div>

			<div class="space-y-2 text-sm leading-relaxed">
				<h3 class="text-foreground font-mono text-[13px]">Mon device n'est pas dans la liste ?</h3>
				<p class="text-text-soft">
					Beaucoup de devices génériques utilisent le format <strong>Cayenne LPP</strong> (sélectionnable
					en haut de la liste). Sinon, vous pouvez contribuer au catalogue TTN via une PR sur
					<a class="text-primary hover:underline" href="https://github.com/TheThingsNetwork/lorawan-devices/blob/master/CONTRIBUTING.md" rel="noopener">le guide de contribution</a> — le repo
					est resynchronisé manuellement à chaque mise à jour d'OpenGTB.
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
		<h2>Décodeurs LoRaWAN supportés</h2>
		<p>
			Décoder un payload LoRaWAN MClimate Vicki, Milesight AM102, Milesight WT101, Dragino LHT65,
			Adeunis Comfort CO2, Enless TX Pulse 600, Cayenne LPP, Netvox, Decentlab, Tektelic, et plus
			de 900 références issues du repo TTN lorawan-devices.
		</p>
	</div>
</ToolShell>
