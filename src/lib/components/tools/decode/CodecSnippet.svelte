<script lang="ts">
	import Copy from '@lucide/svelte/icons/copy';
	import Check from '@lucide/svelte/icons/check';
	import Download from '@lucide/svelte/icons/download';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import { colorizeJs } from '$lib/tools/decode/format-js';
	import type { CodecTarget, ManifestDevice } from '$lib/tools/decode/types';

	let { device }: { device: ManifestDevice } = $props();

	const CODECS_BASE = '/data/lorawan-codecs/';

	const TARGETS: { id: CodecTarget; label: string; install: string }[] = [
		{
			id: 'ttn-v3',
			label: 'TTN v3',
			install:
				'Console TTN → votre application → Payload formatters → « Custom JavaScript formatter » → onglet Uplink.'
		},
		{
			id: 'chirpstack-v4',
			label: 'ChirpStack v4',
			install:
				'ChirpStack → Device profile → onglet « Codec » → mode « JavaScript functions » → coller dans Codec functions.'
		}
	];

	let active = $state<CodecTarget>('ttn-v3');
	let copied = $state(false);

	// Cache local : on ne fetch chaque variante qu'une fois.
	const sources = $state<Partial<Record<CodecTarget, string>>>({});
	const loading = $state<Partial<Record<CodecTarget, boolean>>>({});
	const errors = $state<Partial<Record<CodecTarget, string>>>({});

	const downloadsPath = $derived(device.downloads);

	const url = $derived(downloadsPath ? `${CODECS_BASE}${downloadsPath[targetKey(active)]}` : '');
	const filename = $derived(`${device.slug}-${active}.js`);

	function targetKey(t: CodecTarget): 'ttnV3' | 'chirpstackV4' {
		return t === 'ttn-v3' ? 'ttnV3' : 'chirpstackV4';
	}

	async function ensureLoaded(t: CodecTarget) {
		if (!downloadsPath) return;
		if (sources[t] !== undefined) return;
		if (loading[t]) return;
		loading[t] = true;
		errors[t] = undefined;
		try {
			const r = await fetch(`${CODECS_BASE}${downloadsPath[targetKey(t)]}`);
			if (!r.ok) throw new Error(`HTTP ${r.status}`);
			sources[t] = await r.text();
		} catch (e) {
			errors[t] = (e as Error)?.message ?? String(e);
		} finally {
			loading[t] = false;
		}
	}

	function selectTab(t: CodecTarget) {
		active = t;
		void ensureLoaded(t);
	}

	async function copyActive() {
		const src = sources[active];
		if (!src) return;
		try {
			await navigator.clipboard.writeText(src);
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch {
			// silencieux
		}
	}

	const activeSource = $derived(sources[active]);
	const activeError = $derived(errors[active]);
	const activeLoading = $derived(loading[active]);
	const activeInstall = $derived(TARGETS.find((t) => t.id === active)!.install);
	const colored = $derived(activeSource ? colorizeJs(activeSource) : '');

	// Auto-load la cible courante au montage / changement de device.
	$effect(() => {
		void ensureLoaded(active);
	});
</script>

{#if downloadsPath}
	<div
		class="border-line-soft bg-surface flex w-full min-w-0 flex-col overflow-hidden rounded border"
		data-codec-snippet
	>
		<!-- Tabs + actions -->
		<div class="border-line-soft flex flex-wrap items-center gap-2 border-b px-2 py-2">
			<div
				class="border-line-soft bg-secondary/40 inline-flex shrink-0 overflow-hidden rounded border"
				role="tablist"
				aria-label="Cible Network Server"
			>
				{#each TARGETS as t (t.id)}
					<button
						type="button"
						role="tab"
						aria-selected={active === t.id}
						onclick={() => selectTab(t.id)}
						class="px-2.5 py-1.5 font-mono text-[12px] transition-colors sm:px-3 {active === t.id
							? 'bg-primary text-primary-foreground'
							: 'text-text-soft hover:text-foreground'}"
					>
						{t.label}
					</button>
				{/each}
			</div>

			<div class="ml-auto flex items-center gap-1.5">
				<button
					type="button"
					onclick={copyActive}
					disabled={!activeSource}
					aria-label="Copier le codec"
					class="border-border hover:border-primary hover:text-primary focus-visible:ring-ring text-text-soft inline-flex items-center gap-1.5 rounded border px-2.5 py-1.5 font-mono text-[11.5px] transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					title="Copier le codec dans le presse-papiers"
				>
					{#if copied}
						<Check class="size-3.5" /> <span class="hidden sm:inline">Copié</span>
					{:else}
						<Copy class="size-3.5" /> <span class="hidden sm:inline">Copier</span>
					{/if}
				</button>
				<a
					href={url}
					download={filename}
					aria-label="Télécharger le codec"
					class="border-border hover:border-primary hover:text-primary focus-visible:ring-ring text-text-soft inline-flex items-center gap-1.5 rounded border px-2.5 py-1.5 font-mono text-[11.5px] transition-colors focus-visible:ring-2 focus-visible:outline-none"
					title="Télécharger le fichier .js"
				>
					<Download class="size-3.5" /> <span class="hidden sm:inline">Télécharger</span>
				</a>
			</div>
		</div>

		<!-- Install hint -->
		<p class="text-text-soft border-line-soft border-b px-3 py-2 text-[12px] leading-relaxed">
			<span class="text-text-dim font-mono text-[11px]">Installation :</span>
			{activeInstall}
		</p>

		<!-- Code -->
		<div class="relative w-full min-w-0">
			{#if activeLoading}
				<div class="text-text-dim flex items-center gap-2 px-3 py-6 font-mono text-[12px]">
					<Loader2 class="size-3.5 animate-spin" /> Chargement du codec…
				</div>
			{:else if activeError}
				<div class="text-amber px-3 py-3 font-mono text-[12px]">
					Échec du chargement : {activeError}
				</div>
			{:else if activeSource}
				<pre
					class="bg-secondary/20 m-0 max-h-[50vh] w-full overflow-auto px-3 py-2 font-mono text-[11px] leading-relaxed sm:max-h-[420px] sm:text-[11.5px]"><code
						>{@html colored}</code
					></pre>
			{/if}
		</div>
	</div>
{/if}
