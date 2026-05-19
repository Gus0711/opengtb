<script lang="ts">
	import { parsePayload } from '$lib/tools/decode/formats';
	import type { PayloadFormat } from '$lib/tools/decode/types';

	let {
		value = $bindable(''),
		format = $bindable<PayloadFormat>('hex'),
		onChange
	}: {
		value: string;
		format: PayloadFormat;
		onChange?: () => void;
	} = $props();

	const parsed = $derived.by(() => {
		if (!value.trim()) return { ok: false as const, error: '', bytes: 0 };
		try {
			const bytes = parsePayload(value, format);
			return { ok: true as const, error: '', bytes: bytes.length };
		} catch (e) {
			return { ok: false as const, error: (e as Error).message, bytes: 0 };
		}
	});

	function setFormat(f: PayloadFormat) {
		if (f === format) return;
		format = f;
		onChange?.();
	}
</script>

<div>
	<label
		for="decode-payload-input"
		class="text-text-soft mb-1.5 block font-mono text-[11.5px] tracking-wide uppercase"
	>
		Payload
	</label>

	<!-- Format toggle, large et bien marqué : c'est le choix le plus critique avant
	     de coller la trame. Hex et base64 partagent souvent des caractères. -->
	<div
		class="border-border bg-card mb-2 rounded-md border p-1.5"
		role="radiogroup"
		aria-label="Format du payload"
	>
		<div class="flex items-stretch gap-1.5">
			<button
				type="button"
				role="radio"
				aria-checked={format === 'hex'}
				onclick={() => setFormat('hex')}
				class="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-sm px-3 py-2 font-mono transition-colors {format ===
				'hex'
					? 'bg-primary text-primary-foreground'
					: 'text-text-soft hover:bg-line-soft/40 hover:text-foreground'}"
			>
				<span class="text-[13px] font-semibold tracking-wide">hex</span>
				<span class="text-[10.5px] tabular-nums opacity-80">0a 1f 7d…</span>
			</button>
			<button
				type="button"
				role="radio"
				aria-checked={format === 'base64'}
				onclick={() => setFormat('base64')}
				class="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-sm px-3 py-2 font-mono transition-colors {format ===
				'base64'
					? 'bg-primary text-primary-foreground'
					: 'text-text-soft hover:bg-line-soft/40 hover:text-foreground'}"
			>
				<span class="text-[13px] font-semibold tracking-wide">base64</span>
				<span class="text-[10.5px] opacity-80">Ch99…</span>
			</button>
		</div>
	</div>

	<textarea
		id="decode-payload-input"
		bind:value
		oninput={() => onChange?.()}
		rows="3"
		spellcheck="false"
		autocomplete="off"
		autocapitalize="none"
		placeholder={format === 'hex' ? '0a 1f 7d   ou   0a1f7d' : 'Ch99…'}
		class="border-border bg-background focus-visible:ring-ring w-full resize-none rounded border px-3 py-2 font-mono text-sm focus-visible:ring-2 focus-visible:outline-none"
		aria-describedby="decode-payload-hint"
	></textarea>

	<p
		id="decode-payload-hint"
		class="mt-1 flex items-center justify-between gap-2 font-mono text-[11px]"
		aria-live="polite"
	>
		{#if parsed.ok}
			<span class="text-text-dim">{parsed.bytes} octets · {format}</span>
		{:else if parsed.error}
			<span class="text-destructive">{parsed.error}</span>
		{:else}
			<span class="text-text-dim">&nbsp;</span>
		{/if}
		<span class="text-text-dim"
			>{format === 'hex' ? 'espaces et 0x acceptés' : 'base64 URL-safe accepté'}</span
		>
	</p>
</div>
