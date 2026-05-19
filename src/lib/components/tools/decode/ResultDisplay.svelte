<script lang="ts">
	import Copy from '@lucide/svelte/icons/copy';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import Check from '@lucide/svelte/icons/check';
	import { bytesToHex } from '$lib/tools/decode/formats';
	import { colorizeJson } from '$lib/tools/decode/format-json';
	import type { DecodeSuccess } from '$lib/tools/decode/types';

	let { result }: { result: DecodeSuccess } = $props();

	let jsonOpen = $state(false);
	let copiedTable = $state(false);
	let copiedJson = $state(false);

	const jsonPlain = $derived(JSON.stringify(result.data, null, 2));
	const jsonColored = $derived(colorizeJson(result.data));

	function buildSummary(): string {
		const lines: string[] = [];
		lines.push(`Device   : ${result.device.vendorName} — ${result.device.name}`);
		lines.push(`Payload  : ${bytesToHex(result.bytes, { separator: '' })} (${result.format})`);
		lines.push(`fPort    : ${result.fPort}`);
		lines.push('─'.repeat(40));
		const labelWidth = Math.max(8, ...result.rows.map((r) => r.key.length));
		for (const row of result.rows) {
			lines.push(`${row.key.padEnd(labelWidth)} : ${row.value}`);
		}
		if (result.warnings.length > 0) {
			lines.push('─'.repeat(40));
			for (const w of result.warnings) lines.push(`⚠ ${w}`);
		}
		lines.push('─'.repeat(40));
		lines.push(`Source : TTN lorawan-devices`);
		return lines.join('\n');
	}

	async function copy(text: string, kind: 'table' | 'json') {
		try {
			await navigator.clipboard.writeText(text);
			if (kind === 'table') {
				copiedTable = true;
				setTimeout(() => (copiedTable = false), 1500);
			} else {
				copiedJson = true;
				setTimeout(() => (copiedJson = false), 1500);
			}
		} catch {
			// silencieux : navigateur sans clipboard
		}
	}
</script>

<section aria-labelledby="decode-result-heading" class="space-y-4">
	<!-- Bandeau verdict -->
	<div
		class="border-primary/40 bg-primary/5 flex items-start gap-3 rounded border-l-4 px-4 py-3"
		role="status"
	>
		<div class="min-w-0 flex-1">
			<h2 id="decode-result-heading" class="font-mono text-sm tracking-wide">
				<span class="text-primary">Décodé</span>
				<span class="text-text-dim">— {result.rows.length} valeur{result.rows.length > 1 ? 's' : ''}</span>
			</h2>
			<p class="text-text-soft mt-0.5 text-xs">
				{result.device.vendorName} · {result.device.name} · fPort {result.fPort}
			</p>
		</div>
		<button
			type="button"
			onclick={() => copy(buildSummary(), 'table')}
			class="border-border hover:border-primary hover:text-primary focus-visible:ring-ring text-text-soft inline-flex shrink-0 items-center gap-1.5 rounded border px-2.5 py-1.5 font-mono text-[11.5px] transition-colors focus-visible:ring-2 focus-visible:outline-none"
			title="Copier la fiche au format texte"
		>
			{#if copiedTable}
				<Check class="size-3.5" /> Copié
			{:else}
				<Copy class="size-3.5" /> Copier la fiche
			{/if}
		</button>
	</div>

	<!-- Tableau key/value -->
	{#if result.rows.length === 0}
		<p class="text-text-dim border-line-soft rounded border px-3 py-2 text-sm italic">
			Le codec n'a retourné aucune donnée structurée.
		</p>
	{:else}
		<div class="border-line-soft overflow-hidden rounded border">
			<table class="w-full text-sm">
				<thead class="bg-secondary/30 text-text-dim font-mono text-[11px] tracking-wide uppercase">
					<tr>
						<th class="px-3 py-2 text-left">Champ</th>
						<th class="px-3 py-2 text-left">Valeur</th>
					</tr>
				</thead>
				<tbody>
					{#each result.rows as row (row.key)}
						<tr class="border-line-soft border-t" data-field={row.key} data-value={row.value}>
							<td class="text-text-soft px-3 py-2 font-mono text-[12.5px]">{row.key}</td>
							<td class="text-foreground px-3 py-2 font-mono text-[12.5px] tabular-nums">
								{row.value}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}

	{#if result.warnings.length > 0}
		<ul class="border-amber/40 bg-amber/5 space-y-1 rounded border-l-4 px-4 py-2 text-sm">
			{#each result.warnings as w, i (i)}
				<li class="text-amber">⚠ {w}</li>
			{/each}
		</ul>
	{/if}

	<!-- JSON pliable -->
	<details
		class="border-line-soft rounded border"
		ontoggle={(e) => (jsonOpen = (e.currentTarget as HTMLDetailsElement).open)}
	>
		<summary
			class="hover:bg-secondary/30 flex cursor-pointer items-center justify-between gap-2 px-3 py-2"
		>
			<span class="text-text-soft inline-flex items-center gap-2 font-mono text-[12px]">
				<ChevronDown
					class="size-3.5 transition-transform {jsonOpen ? 'rotate-0' : '-rotate-90'}"
				/>
				JSON brut
			</span>
			<button
				type="button"
				onclick={(e) => {
					e.preventDefault();
					e.stopPropagation();
					void copy(jsonPlain, 'json');
				}}
				class="text-text-dim hover:text-primary focus-visible:ring-ring inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 font-mono text-[11px] transition-colors focus-visible:ring-2 focus-visible:outline-none"
				title="Copier le JSON"
			>
				{#if copiedJson}
					<Check class="size-3" /> copié
				{:else}
					<Copy class="size-3" /> copier
				{/if}
			</button>
		</summary>
		<pre
			class="border-line-soft bg-secondary/20 m-0 overflow-x-auto border-t px-3 py-2 font-mono text-[12px] leading-relaxed"><code
				>{@html jsonColored}</code
			></pre>
	</details>
</section>
