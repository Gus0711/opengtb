<script lang="ts">
	import Copy from '@lucide/svelte/icons/copy';
	import Check from '@lucide/svelte/icons/check';
	import Link from '@lucide/svelte/icons/link';
	import ShieldCheck from '@lucide/svelte/icons/shield-check';
	import { bytesToHex, bytesToBase64 } from '$lib/tools/decode/formats';
	import type { EncodeSuccess } from '$lib/tools/decode/types';

	let {
		result,
		referenceBytes,
		referenceLabel
	}: {
		result: EncodeSuccess;
		/** Bytes attendus selon l'exemple TTN si l'utilisateur a encodé un exemple non modifié. */
		referenceBytes?: number[];
		referenceLabel?: string;
	} = $props();

	const matchesReference = $derived.by(() => {
		if (!referenceBytes) return null;
		if (referenceBytes.length !== result.bytes.length) return false;
		for (let i = 0; i < referenceBytes.length; i++) {
			if (referenceBytes[i] !== result.bytes[i]) return false;
		}
		return true;
	});

	let copied = $state<'hex' | 'b64' | 'fport' | 'fiche' | 'link' | null>(null);

	const hex = $derived(bytesToHex(result.bytes, { separator: ' ' }));
	const hexCompact = $derived(bytesToHex(result.bytes, { separator: '' }));
	const b64 = $derived(bytesToBase64(result.bytes));

	function buildSummary(): string {
		const lines: string[] = [];
		lines.push(`Device   : ${result.device.vendorName} — ${result.device.name}`);
		lines.push(`fPort    : ${result.fPort}`);
		lines.push(`Input    : ${JSON.stringify(result.data)}`);
		lines.push('─'.repeat(40));
		lines.push(`Hex      : ${hex}`);
		lines.push(`Base64   : ${b64}`);
		lines.push(`Bytes    : ${result.bytes.length}`);
		if (result.warnings.length > 0) {
			lines.push('─'.repeat(40));
			for (const w of result.warnings) lines.push(`⚠ ${w}`);
		}
		lines.push('─'.repeat(40));
		lines.push(`Source   : OpenGTB · codec TTN ${result.device.slug}`);
		return lines.join('\n');
	}

	async function copy(text: string, kind: typeof copied) {
		try {
			await navigator.clipboard.writeText(text);
			copied = kind;
			setTimeout(() => (copied = null), 1500);
		} catch {
			// silencieux
		}
	}

	function copyShareLink() {
		if (typeof window === 'undefined') return;
		void copy(window.location.href, 'link');
	}
</script>

<section aria-labelledby="encode-result-heading" class="space-y-4">
	<!-- Bandeau verdict -->
	<div
		class="border-primary/40 bg-primary/5 flex flex-col gap-3 rounded border-l-4 px-4 py-3 sm:flex-row sm:items-start"
		role="status"
	>
		<div class="min-w-0 flex-1">
			<h2 id="encode-result-heading" class="font-mono text-sm tracking-wide">
				<span class="text-primary">Encodé</span>
				<span class="text-text-dim">
					— {result.bytes.length} octet{result.bytes.length > 1 ? 's' : ''}
				</span>
			</h2>
			<p class="text-text-soft mt-0.5 text-xs break-words">
				{result.device.vendorName} · {result.device.name} · fPort {result.fPort}
			</p>
		</div>
		<div class="flex flex-wrap items-center gap-1.5 sm:shrink-0">
			<button
				type="button"
				onclick={copyShareLink}
				class="border-border hover:border-primary hover:text-primary focus-visible:ring-ring text-text-soft inline-flex items-center gap-1.5 rounded border px-2.5 py-1.5 font-mono text-[11.5px] transition-colors focus-visible:ring-2 focus-visible:outline-none"
				title="Copier un lien partageable vers cet encodage"
			>
				{#if copied === 'link'}
					<Check class="size-3.5" /> Copié
				{:else}
					<Link class="size-3.5" /> Copier le lien
				{/if}
			</button>
			<button
				type="button"
				onclick={() => copy(buildSummary(), 'fiche')}
				class="border-border hover:border-primary hover:text-primary focus-visible:ring-ring text-text-soft inline-flex items-center gap-1.5 rounded border px-2.5 py-1.5 font-mono text-[11.5px] transition-colors focus-visible:ring-2 focus-visible:outline-none"
				title="Copier la fiche au format texte"
			>
				{#if copied === 'fiche'}
					<Check class="size-3.5" /> Copié
				{:else}
					<Copy class="size-3.5" /> Copier la fiche
				{/if}
			</button>
		</div>
	</div>

	<!-- Sortie hex / base64 / fPort -->
	<div class="border-line-soft overflow-hidden rounded border">
		<dl class="divide-line-soft divide-y text-sm">
			<!-- Hex -->
			<div class="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-start">
				<dt class="text-text-dim shrink-0 font-mono text-[11px] tracking-wide uppercase sm:w-20">
					Hex
				</dt>
				<dd class="min-w-0 flex-1">
					<p
						class="text-foreground font-mono text-[13px] break-all tabular-nums"
						data-field="hex"
						data-value={hexCompact}
					>
						{hex}
					</p>
				</dd>
				<button
					type="button"
					onclick={() => copy(hexCompact, 'hex')}
					class="border-border hover:border-primary hover:text-primary focus-visible:ring-ring text-text-soft inline-flex shrink-0 items-center gap-1.5 self-start rounded border px-2 py-1 font-mono text-[11px] transition-colors focus-visible:ring-2 focus-visible:outline-none"
					title="Copier en hex compact (sans espaces)"
				>
					{#if copied === 'hex'}
						<Check class="size-3" /> copié
					{:else}
						<Copy class="size-3" /> copier
					{/if}
				</button>
			</div>

			<!-- Base64 -->
			<div class="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-start">
				<dt class="text-text-dim shrink-0 font-mono text-[11px] tracking-wide uppercase sm:w-20">
					Base64
				</dt>
				<dd class="min-w-0 flex-1">
					<p
						class="text-foreground font-mono text-[13px] break-all"
						data-field="base64"
						data-value={b64}
					>
						{b64}
					</p>
				</dd>
				<button
					type="button"
					onclick={() => copy(b64, 'b64')}
					class="border-border hover:border-primary hover:text-primary focus-visible:ring-ring text-text-soft inline-flex shrink-0 items-center gap-1.5 self-start rounded border px-2 py-1 font-mono text-[11px] transition-colors focus-visible:ring-2 focus-visible:outline-none"
					title="Copier en base64"
				>
					{#if copied === 'b64'}
						<Check class="size-3" /> copié
					{:else}
						<Copy class="size-3" /> copier
					{/if}
				</button>
			</div>

			<!-- fPort -->
			<div class="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-start">
				<dt class="text-text-dim shrink-0 font-mono text-[11px] tracking-wide uppercase sm:w-20">
					fPort
				</dt>
				<dd class="min-w-0 flex-1">
					<p
						class="text-foreground font-mono text-[13px] tabular-nums"
						data-field="fport"
						data-value={String(result.fPort)}
					>
						{result.fPort}
					</p>
				</dd>
				<button
					type="button"
					onclick={() => copy(String(result.fPort), 'fport')}
					class="border-border hover:border-primary hover:text-primary focus-visible:ring-ring text-text-soft inline-flex shrink-0 items-center gap-1.5 self-start rounded border px-2 py-1 font-mono text-[11px] transition-colors focus-visible:ring-2 focus-visible:outline-none"
					title="Copier le fPort"
				>
					{#if copied === 'fport'}
						<Check class="size-3" /> copié
					{:else}
						<Copy class="size-3" /> copier
					{/if}
				</button>
			</div>
		</dl>
	</div>

	{#if result.warnings.length > 0}
		<ul class="border-amber/40 bg-amber/5 space-y-1 rounded border-l-4 px-4 py-2 text-sm">
			{#each result.warnings as w, i (i)}
				<li class="text-amber">⚠ {w}</li>
			{/each}
		</ul>
	{/if}

	{#if matchesReference !== null}
		<div
			class="flex items-center gap-2 rounded border-l-4 px-4 py-2 text-sm {matchesReference
				? 'border-primary/40 bg-primary/5 text-primary'
				: 'border-amber/40 bg-amber/5 text-amber'}"
			role="status"
		>
			<ShieldCheck class="size-4 shrink-0" aria-hidden="true" />
			<div class="min-w-0 flex-1">
				{#if matchesReference}
					<p>
						Sortie conforme à l'exemple TTN
						{#if referenceLabel}
							<span class="text-text-dim">« {referenceLabel} »</span>
						{/if}
					</p>
				{:else}
					<p>
						⚠ La sortie diffère de l'exemple TTN
						{#if referenceLabel}<span class="text-text-dim">« {referenceLabel} »</span>{/if}
						(<span class="font-mono">{bytesToHex(referenceBytes!, { separator: ' ' })}</span>)
					</p>
				{/if}
			</div>
		</div>
	{/if}
</section>
