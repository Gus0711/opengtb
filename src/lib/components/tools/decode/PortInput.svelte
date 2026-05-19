<script lang="ts">
	let {
		value = $bindable(1),
		suggested,
		onChange
	}: {
		value: number;
		suggested?: number[];
		onChange?: () => void;
	} = $props();

	const valid = $derived(Number.isInteger(value) && value >= 1 && value <= 223);

	function onInput(e: Event) {
		const v = parseInt((e.target as HTMLInputElement).value, 10);
		value = Number.isFinite(v) ? v : 0;
		onChange?.();
	}
</script>

<div>
	<label
		for="decode-fport-input"
		class="text-text-soft mb-1.5 block font-mono text-[11.5px] tracking-wide uppercase"
	>
		fPort
	</label>
	<div
		class="border-border bg-background focus-within:ring-ring flex w-full items-stretch overflow-hidden rounded border focus-within:ring-2"
	>
		<input
			id="decode-fport-input"
			type="number"
			min="1"
			max="223"
			step="1"
			inputmode="numeric"
			value={value || ''}
			oninput={onInput}
			placeholder="1"
			aria-invalid={!valid}
			class="min-w-0 flex-1 bg-transparent px-3 py-2 font-mono text-base tabular-nums focus:outline-none"
		/>
		<span
			class="bg-secondary/40 text-text-dim border-border flex items-center border-l px-3 font-mono text-[11.5px]"
		>
			1 – 223
		</span>
	</div>
	{#if suggested && suggested.length > 0}
		<p class="text-text-dim mt-1 font-mono text-[11px]">
			Suggérés : {suggested.join(', ')}
		</p>
	{/if}
</div>
