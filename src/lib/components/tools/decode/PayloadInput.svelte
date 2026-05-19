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
	<div class="mb-1.5 flex items-center justify-between gap-2">
		<label
			for="decode-payload-input"
			class="text-text-soft block font-mono text-[11.5px] tracking-wide uppercase"
		>
			Payload
		</label>
		<div role="radiogroup" aria-label="Format de payload" class="inline-flex font-mono text-[11px]">
			<button
				type="button"
				role="radio"
				aria-checked={format === 'hex'}
				onclick={() => setFormat('hex')}
				class="rounded-l border px-2 py-1 transition-colors {format === 'hex'
					? 'bg-primary text-primary-foreground border-primary'
					: 'border-border text-text-soft hover:text-foreground'}"
			>
				hex
			</button>
			<button
				type="button"
				role="radio"
				aria-checked={format === 'base64'}
				onclick={() => setFormat('base64')}
				class="-ml-px rounded-r border px-2 py-1 transition-colors {format === 'base64'
					? 'bg-primary text-primary-foreground border-primary'
					: 'border-border text-text-soft hover:text-foreground'}"
			>
				base64
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
			<span class="text-text-dim">{parsed.bytes} octets</span>
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
