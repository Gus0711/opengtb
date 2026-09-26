<script lang="ts">
	import ToolShell from '$lib/components/tools/ToolShell.svelte';
	import { getTool } from '$lib/tools/registry';
	import {
		activeBits,
		applyScale,
		decode16,
		decode32,
		encodeValue,
		parseRegister,
		toBinary16,
		toHex16
	} from '$lib/tools/modbus-lab/codec';
	import { BYTE_ORDERS, type ByteOrder, type NumericType } from '$lib/tools/modbus-lab/types';
	import ArrowLeftRight from '@lucide/svelte/icons/arrow-left-right';
	import Binary from '@lucide/svelte/icons/binary';
	import BookOpen from '@lucide/svelte/icons/book-open';
	import Braces from '@lucide/svelte/icons/braces';
	import CircleHelp from '@lucide/svelte/icons/circle-help';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';

	const tool = getTool('modbus-lab')!;
	const bitIndexes = Array.from({ length: 16 }, (_, index) => 15 - index);

	let mode = $state<'decode' | 'encode'>('decode');
	let register1Input = $state('16844');
	let register2Input = $state('0');
	let factorInput = $state('1');
	let offsetInput = $state('0');

	let encodeValueInput = $state('25.5');
	let encodeType = $state<NumericType>('float32');
	let encodeOrder = $state<ByteOrder>('ABCD');

	const register1 = $derived(parseRegister(register1Input));
	const register2 = $derived(parseRegister(register2Input));
	const factor = $derived(Number(factorInput));
	const offset = $derived(Number(offsetInput));
	const validScale = $derived(Number.isFinite(factor) && Number.isFinite(offset) && factor !== 0);
	const scale = $derived({ factor: validScale ? factor : 1, offset: validScale ? offset : 0 });

	const words = $derived(
		[register1, register2].map((value, index) =>
			value === null
				? null
				: {
						index: index + 1,
						value,
						...decode16(value),
						hex: toHex16(value),
						binary: toBinary16(value),
						bits: activeBits(value)
					}
		)
	);

	const decoded32 = $derived(
		register1 !== null && register2 !== null
			? BYTE_ORDERS.map((order) => decode32(register1, register2, order))
			: []
	);

	const encoded = $derived.by(() => {
		const value = Number(encodeValueInput);
		if (!Number.isFinite(value)) return { result: null, error: 'Saisis une valeur numérique.' };
		if (!validScale) return { result: null, error: 'Le facteur doit être un nombre différent de zéro.' };
		try {
			return { result: encodeValue(value, encodeType, encodeOrder, scale), error: '' };
		} catch (error) {
			return { result: null, error: error instanceof Error ? error.message : 'Encodage impossible.' };
		}
	});

	function formatNumber(value: number): string {
		if (!Number.isFinite(value)) return value > 0 ? '+∞' : value < 0 ? '−∞' : 'NaN';
		const absolute = Math.abs(value);
		if (absolute !== 0 && (absolute >= 1e9 || absolute < 1e-5)) return value.toExponential(5);
		return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 6 }).format(value);
	}

	function resetDecode() {
		register1Input = '16844';
		register2Input = '0';
		factorInput = '1';
		offsetInput = '0';
	}

	function swapRegisters() {
		const first = register1Input;
		register1Input = register2Input;
		register2Input = first;
	}

	function resetEncode() {
		encodeValueInput = '25.5';
		encodeType = 'float32';
		encodeOrder = 'ABCD';
		factorInput = '1';
		offsetInput = '0';
	}
</script>

<ToolShell
	{tool}
	seoTitle="Décodeur de registres Modbus — FLOAT32, INT32 et ordre des octets"
	seoDescription="Décoder et encoder des registres Modbus en UINT16, INT16, UINT32, INT32 et FLOAT32. Comparaison ABCD, BADC, CDAB et DCBA, facteur, offset et bits actifs."
>
	<div class="border-line-soft flex items-center justify-between gap-3 border-y py-2">
		<div class="bg-secondary/60 inline-flex rounded p-1" role="tablist" aria-label="Mode du laboratoire">
			<button
				type="button"
				role="tab"
				aria-selected={mode === 'decode'}
				onclick={() => (mode = 'decode')}
				class="inline-flex min-w-28 items-center justify-center gap-2 rounded px-3 py-1.5 font-mono text-[12px] transition-colors {mode === 'decode' ? 'bg-background text-primary shadow-sm' : 'text-text-soft hover:text-foreground'}"
			>
				<Binary class="size-3.5" /> Décoder
			</button>
			<button
				type="button"
				role="tab"
				aria-selected={mode === 'encode'}
				onclick={() => (mode = 'encode')}
				class="inline-flex min-w-28 items-center justify-center gap-2 rounded px-3 py-1.5 font-mono text-[12px] transition-colors {mode === 'encode' ? 'bg-background text-primary shadow-sm' : 'text-text-soft hover:text-foreground'}"
			>
				<Braces class="size-3.5" /> Encoder
			</button>
		</div>
		<a href="/outils/modbus" class="text-text-soft hover:text-primary hidden items-center gap-1.5 font-mono text-[11.5px] sm:inline-flex">
			<BookOpen class="size-3.5" /> catalogue
		</a>
	</div>

	{#if mode === 'decode'}
		<div role="tabpanel" class="mt-6 space-y-8">
			<section aria-labelledby="registers-title">
				<div class="mb-3 flex items-center justify-between gap-3">
					<h2 id="registers-title" class="font-mono text-sm font-medium">Registres lus</h2>
					<button type="button" onclick={resetDecode} class="text-text-soft hover:text-primary inline-flex items-center gap-1.5 font-mono text-[11.5px]">
						<RotateCcw class="size-3.5" /> Réinitialiser
					</button>
				</div>

				<div class="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
					{@render RegisterInput('register-1', 'Registre 1', register1Input, (value) => (register1Input = value), register1)}
					<button type="button" onclick={swapRegisters} class="border-border hover:border-primary hover:text-primary text-text-soft mb-0.5 inline-flex size-9 items-center justify-center justify-self-center rounded border" aria-label="Inverser les deux registres" title="Inverser les registres">
						<ArrowLeftRight class="size-4" />
					</button>
					{@render RegisterInput('register-2', 'Registre 2', register2Input, (value) => (register2Input = value), register2)}
				</div>

				<div class="mt-3 grid gap-3 sm:grid-cols-2">
					{@render NumberInput('scale-factor', 'Facteur', factorInput, (value) => (factorInput = value))}
					{@render NumberInput('scale-offset', 'Offset', offsetInput, (value) => (offsetInput = value))}
				</div>
				{#if !validScale}
					<p class="text-danger mt-2 font-mono text-[11.5px]">Le facteur doit être un nombre différent de zéro.</p>
				{/if}
			</section>

			<section aria-labelledby="words-title">
				<h2 id="words-title" class="mb-3 font-mono text-sm font-medium">Mots 16 bits</h2>
				<div class="grid gap-3 md:grid-cols-2">
					{#each words as word, index}
						{#if word}
							<div class="border-border bg-card/50 rounded border p-4">
								<div class="flex items-start justify-between gap-3">
									<div>
										<p class="text-text-dim font-mono text-[10.5px] uppercase">Registre {word.index}</p>
										<p class="text-primary mt-1 font-mono text-xl tabular-nums">{word.hex}</p>
									</div>
									<dl class="grid grid-cols-[auto_auto] gap-x-3 text-right font-mono text-[11px] tabular-nums">
										<dt class="text-text-dim">UINT16</dt><dd>{formatNumber(applyScale(word.uint16, scale))}</dd>
										<dt class="text-text-dim">INT16</dt><dd>{formatNumber(applyScale(word.int16, scale))}</dd>
									</dl>
								</div>
								<div class="mt-4 grid grid-cols-8 gap-1" aria-label="Bits du registre {word.index}">
									{#each bitIndexes as bit}
										{@const active = word.bits.includes(bit)}
										<div class="min-w-0 text-center">
											<span class="text-text-dim block font-mono text-[8px]">{bit}</span>
											<span class="mt-0.5 flex aspect-square items-center justify-center rounded border font-mono text-[10px] {active ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-text-dim'}">{active ? '1' : '0'}</span>
										</div>
									{/each}
								</div>
								<p class="text-text-dim mt-3 font-mono text-[10.5px]">bits actifs : {word.bits.length ? word.bits.join(', ') : 'aucun'}</p>
							</div>
						{:else}
							<div class="border-danger/40 bg-danger/5 text-danger rounded border p-4 font-mono text-[12px]">Registre {index + 1} invalide</div>
						{/if}
					{/each}
				</div>
			</section>

			<section aria-labelledby="formats-title">
				<div class="mb-3 flex flex-wrap items-baseline justify-between gap-2">
					<h2 id="formats-title" class="font-mono text-sm font-medium">Interprétations 32 bits</h2>
					<p class="text-text-dim font-mono text-[10.5px]">résultat = valeur brute × facteur + offset</p>
				</div>
				<div class="border-primary/25 bg-primary/5 mb-3 flex gap-3 rounded border px-4 py-3">
					<CircleHelp class="text-primary mt-0.5 size-4 shrink-0" aria-hidden="true" />
					<p class="text-text-soft text-[13px] leading-relaxed">
						Chaque ligne teste un ordre d’octets différent. Repère la valeur cohérente avec la grandeur attendue : pour une température, <strong class="text-foreground font-medium">25,5</strong> est par exemple plus plausible qu’un nombre de plusieurs milliards. La ligne et la colonne correspondantes donnent l’ordre et le type à configurer dans la GTB.
					</p>
				</div>
				<div class="border-border overflow-x-auto rounded border">
					<table class="w-full min-w-[39rem] border-collapse text-left font-mono text-[12px] tabular-nums">
						<thead class="bg-secondary/50 text-text-dim text-[10.5px] uppercase">
							<tr><th class="px-3 py-2.5 font-medium">Ordre</th><th class="px-3 py-2.5 font-medium">FLOAT32</th><th class="px-3 py-2.5 font-medium">INT32</th><th class="px-3 py-2.5 font-medium">UINT32</th></tr>
						</thead>
						<tbody class="divide-border divide-y">
							{#each decoded32 as row (row.order)}
								<tr class="hover:bg-secondary/25">
									<th class="text-primary px-3 py-3 font-semibold">{row.order}</th>
									<td class="px-3 py-3">{formatNumber(applyScale(row.float32, scale))}</td>
									<td class="px-3 py-3">{formatNumber(applyScale(row.int32, scale))}</td>
									<td class="px-3 py-3">{formatNumber(applyScale(row.uint32, scale))}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>
		</div>
	{:else}
		<div role="tabpanel" class="mt-6 space-y-8">
			<section aria-labelledby="encode-title">
				<div class="mb-3 flex items-center justify-between gap-3">
					<h2 id="encode-title" class="font-mono text-sm font-medium">Valeur à écrire</h2>
					<button type="button" onclick={resetEncode} class="text-text-soft hover:text-primary inline-flex items-center gap-1.5 font-mono text-[11.5px]"><RotateCcw class="size-3.5" /> Réinitialiser</button>
				</div>
				<div class="grid gap-3 md:grid-cols-3">
					{@render NumberInput('encode-value', 'Valeur physique', encodeValueInput, (value) => (encodeValueInput = value))}
					<div>
						<label for="encode-type" class="text-text-soft mb-1.5 block font-mono text-[11px] uppercase">Type</label>
						<select id="encode-type" bind:value={encodeType} class="border-border bg-background focus-visible:ring-ring w-full rounded border px-3 py-2 font-mono text-sm focus-visible:ring-2 focus-visible:outline-none">
							<option value="uint16">UINT16</option><option value="int16">INT16</option><option value="uint32">UINT32</option><option value="int32">INT32</option><option value="float32">FLOAT32</option>
						</select>
					</div>
					<div>
						<label for="encode-order" class="text-text-soft mb-1.5 block font-mono text-[11px] uppercase">Ordre des octets</label>
						<select id="encode-order" bind:value={encodeOrder} disabled={encodeType === 'uint16' || encodeType === 'int16'} class="border-border bg-background focus-visible:ring-ring w-full rounded border px-3 py-2 font-mono text-sm disabled:opacity-50 focus-visible:ring-2 focus-visible:outline-none">
							{#each BYTE_ORDERS as order}<option value={order}>{order}</option>{/each}
						</select>
					</div>
				</div>
				<div class="mt-3 grid gap-3 sm:grid-cols-2">
					{@render NumberInput('encode-factor', 'Facteur', factorInput, (value) => (factorInput = value))}
					{@render NumberInput('encode-offset', 'Offset', offsetInput, (value) => (offsetInput = value))}
				</div>
			</section>

			<section aria-labelledby="encoded-title">
				<h2 id="encoded-title" class="mb-3 font-mono text-sm font-medium">Registres à écrire</h2>
				{#if encoded.result}
					<div class="border-primary/25 bg-primary/5 mb-3 flex gap-3 rounded border px-4 py-3">
						<CircleHelp class="text-primary mt-0.5 size-4 shrink-0" aria-hidden="true" />
						<p class="text-text-soft text-[13px] leading-relaxed">
							Écris ces mots dans l’ordre affiché, à partir de l’adresse du registre cible. Les valeurs décimales et hexadécimales représentent exactement les mêmes données.
						</p>
					</div>
					<div class="grid gap-3 sm:grid-cols-2">
						{#each encoded.result.registers as register, index}
							{#if register !== undefined}
								<div class="border-primary/30 bg-primary/5 rounded border p-5">
									<p class="text-text-dim font-mono text-[10.5px] uppercase">Registre {index + 1}</p>
									<p class="text-primary mt-2 font-mono text-2xl font-semibold tabular-nums">{register}</p>
									<p class="text-text-soft mt-1 font-mono text-sm">{encoded.result.hex[index]}</p>
								</div>
							{/if}
						{/each}
					</div>
				{:else}
					<div class="border-danger/40 bg-danger/5 text-danger rounded border p-4 font-mono text-[12px]">{encoded.error}</div>
				{/if}
			</section>
		</div>
	{/if}
</ToolShell>

{#snippet RegisterInput(id: string, label: string, value: string, update: (value: string) => void, parsed: number | null)}
	<div>
		<label for={id} class="text-text-soft mb-1.5 block font-mono text-[11px] uppercase">{label}</label>
		<input {id} type="text" inputmode="text" {value} oninput={(event) => update(event.currentTarget.value)} aria-invalid={parsed === null} class="bg-background focus-visible:ring-ring w-full rounded border px-3 py-2 font-mono text-base tabular-nums focus-visible:ring-2 focus-visible:outline-none {parsed === null ? 'border-danger' : 'border-border'}" />
		<p class="text-text-dim mt-1 font-mono text-[10.5px]">décimal ou hexadécimal · 0 à 65535</p>
	</div>
{/snippet}

{#snippet NumberInput(id: string, label: string, value: string, update: (value: string) => void)}
	<div>
		<label for={id} class="text-text-soft mb-1.5 block font-mono text-[11px] uppercase">{label}</label>
		<input {id} type="number" inputmode="decimal" step="any" {value} oninput={(event) => update(event.currentTarget.value)} class="border-border bg-background focus-visible:ring-ring w-full rounded border px-3 py-2 font-mono text-sm tabular-nums focus-visible:ring-2 focus-visible:outline-none" />
	</div>
{/snippet}
