<script lang="ts">
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import type { DownlinkExample, ManifestDevice } from '$lib/tools/decode/types';

	let {
		device,
		data = $bindable(''),
		fPort = $bindable(1),
		appliedExampleIdx = $bindable<number | null>(null),
		onChange,
		onEncode
	}: {
		device: ManifestDevice;
		data: string;
		fPort: number;
		/**
		 * Index de l'exemple downlink actuellement appliqué tel quel.
		 * `null` dès que l'utilisateur modifie le JSON.
		 */
		appliedExampleIdx?: number | null;
		onChange?: () => void;
		onEncode?: () => void;
	} = $props();

	const examples = $derived(device.downlinkExamples ?? []);

	let textareaEl = $state<HTMLTextAreaElement | null>(null);

	function formatJson(input: unknown): string {
		try {
			return JSON.stringify(input, null, 2);
		} catch {
			return String(input);
		}
	}

	function applyExample(ex: DownlinkExample, idx: number) {
		data = formatJson(ex.input.data);
		if (typeof ex.input.fPort === 'number') {
			fPort = ex.input.fPort;
		}
		appliedExampleIdx = idx;
		onChange?.();
		// Focus pour signaler que l'utilisateur peut éditer
		setTimeout(() => textareaEl?.focus(), 0);
	}

	function reformatJson() {
		try {
			const parsed = JSON.parse(data);
			data = formatJson(parsed);
			onChange?.();
		} catch {
			// silencieux : si le JSON est invalide, on laisse l'utilisateur corriger
		}
	}

	function onPortInput(e: Event) {
		const v = parseInt((e.target as HTMLInputElement).value, 10);
		fPort = Number.isFinite(v) ? v : 0;
		onChange?.();
	}

	function onDataInput(e: Event) {
		data = (e.target as HTMLTextAreaElement).value;
		// Si l'utilisateur édite le contenu, on n'est plus "sur" l'exemple
		appliedExampleIdx = null;
		onChange?.();
	}

	// Validation JSON live
	const jsonValid = $derived.by(() => {
		if (!data.trim()) return false;
		try {
			JSON.parse(data);
			return true;
		} catch {
			return false;
		}
	});

	const portValid = $derived(Number.isInteger(fPort) && fPort >= 1 && fPort <= 223);
</script>

<div class="space-y-4">
	{#if examples.length > 0}
		<div>
			<p
				id="encode-examples-label"
				class="text-text-soft mb-1.5 block font-mono text-[11.5px] tracking-wide uppercase"
			>
				Exemples ({examples.length})
			</p>
			<div class="flex flex-wrap gap-1.5" aria-labelledby="encode-examples-label">
				{#each examples as ex, i (i)}
					<button
						type="button"
						onclick={() => applyExample(ex, i)}
						class="border-line-soft hover:border-primary hover:bg-secondary/40 hover:text-foreground focus-visible:ring-ring inline-flex items-center gap-1.5 rounded border px-2 py-1 font-mono text-[11px] transition-colors focus-visible:ring-2 focus-visible:outline-none {appliedExampleIdx ===
						i
							? 'border-primary bg-primary/10 text-primary'
							: 'text-text-soft'}"
						title={ex.description ?? 'Pré-remplir avec cet exemple'}
					>
						<Sparkles class="size-3" />
						{ex.description ?? `Exemple ${i + 1}`}
					</button>
				{/each}
			</div>
		</div>
	{:else}
		<p class="text-text-dim border-line-soft rounded border border-dashed px-3 py-2 text-[12px] italic">
			Aucun exemple downlink fourni par le vendor pour ce device — saisissez la structure attendue
			directement (cf. datasheet ou code source du codec).
		</p>
	{/if}

	<div>
		<div class="mb-1.5 flex items-center justify-between gap-2">
			<label
				for="encode-data-input"
				class="text-text-soft block font-mono text-[11.5px] tracking-wide uppercase"
			>
				Données à encoder (JSON)
			</label>
			<button
				type="button"
				onclick={reformatJson}
				disabled={!jsonValid}
				class="text-text-dim hover:text-primary focus-visible:ring-ring inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[10.5px] transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
				title="Reformater le JSON"
			>
				<RotateCcw class="size-3" /> reformat
			</button>
		</div>
		<textarea
			id="encode-data-input"
			bind:this={textareaEl}
			rows="6"
			spellcheck="false"
			autocomplete="off"
			autocapitalize="none"
			placeholder={'{\n  "exemple": "valeur"\n}'}
			value={data}
			oninput={onDataInput}
			aria-invalid={data.trim() !== '' && !jsonValid}
			class="border-border bg-background focus-visible:ring-ring w-full min-w-0 resize-y rounded border px-3 py-2 font-mono text-[12.5px] leading-relaxed focus-visible:ring-2 focus-visible:outline-none {data.trim() !==
				'' && !jsonValid
				? 'border-amber/60'
				: ''}"
		></textarea>
		<p class="text-text-dim mt-1 font-mono text-[11px]" aria-live="polite">
			{#if data.trim() === ''}
				Cliquez un exemple ou saisissez votre payload structuré.
			{:else if jsonValid}
				JSON valide.
			{:else}
				<span class="text-amber">JSON invalide — vérifiez les virgules / guillemets.</span>
			{/if}
		</p>
	</div>

	<div>
		<label
			for="encode-fport-input"
			class="text-text-soft mb-1.5 block font-mono text-[11.5px] tracking-wide uppercase"
		>
			fPort
		</label>
		<div
			class="border-border bg-background focus-within:ring-ring flex w-full items-stretch overflow-hidden rounded border focus-within:ring-2"
		>
			<input
				id="encode-fport-input"
				type="number"
				min="1"
				max="223"
				step="1"
				inputmode="numeric"
				value={fPort || ''}
				oninput={onPortInput}
				placeholder="1"
				aria-invalid={!portValid}
				class="min-w-0 flex-1 bg-transparent px-3 py-2 font-mono text-base tabular-nums focus:outline-none"
			/>
			<span
				class="bg-secondary/40 text-text-dim border-border flex items-center border-l px-3 font-mono text-[11.5px]"
			>
				1 – 223
			</span>
		</div>
	</div>
</div>
