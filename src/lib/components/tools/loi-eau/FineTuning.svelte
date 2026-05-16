<script lang="ts">
	import type { LoiEauParams } from '$lib/tools/loi-eau/types';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';

	let {
		params = $bindable<LoiEauParams>(),
		onReset
	}: { params: LoiEauParams; onReset: () => void } = $props();

	function setN(key: keyof LoiEauParams, v: string) {
		const n = parseFloat(v);
		if (Number.isFinite(n)) params = { ...params, [key]: n };
	}
</script>

<section class="border-border bg-card rounded-md border">
	<header class="border-border flex items-center justify-between border-b px-4 py-2.5">
		<h3 class="font-mono text-[11.5px] tracking-[0.1em] uppercase">
			<span class="text-primary">§</span> réglage fin
		</h3>
		<button
			type="button"
			onclick={onReset}
			class="text-text-soft hover:text-primary inline-flex items-center gap-1 font-mono text-[11px]"
		>
			<RotateCcw class="size-3.5" /> recalculer
		</button>
	</header>

	<div class="space-y-3 px-4 py-4">
		<label class="block">
			<div class="flex items-baseline justify-between">
				<span class="text-text-dim font-mono text-[10.5px] tracking-[0.1em] uppercase">
					Pente
				</span>
				<span class="font-mono text-[12px]">{params.pente.toFixed(2)}</span>
			</div>
			<div class="mt-1 flex items-center gap-2">
				<input
					type="range"
					min="0.2"
					max="4"
					step="0.1"
					value={params.pente}
					oninput={(e) => setN('pente', (e.target as HTMLInputElement).value)}
					class="accent-primary flex-1"
				/>
				<input
					type="number"
					min="0.2"
					max="4"
					step="0.1"
					value={params.pente}
					oninput={(e) => setN('pente', (e.target as HTMLInputElement).value)}
					class="border-border bg-background w-20 rounded-sm border px-2 py-1.5 text-[13px]"
				/>
			</div>
		</label>

		<label class="block">
			<div class="flex items-baseline justify-between">
				<span class="text-text-dim font-mono text-[10.5px] tracking-[0.1em] uppercase">
					Parallèle (°C)
				</span>
				<span class="font-mono text-[12px]">{params.parallele > 0 ? '+' : ''}{params.parallele}</span>
			</div>
			<div class="mt-1 flex items-center gap-2">
				<input
					type="range"
					min="-20"
					max="20"
					step="1"
					value={params.parallele}
					oninput={(e) => setN('parallele', (e.target as HTMLInputElement).value)}
					class="accent-primary flex-1"
				/>
				<input
					type="number"
					min="-20"
					max="20"
					step="1"
					value={params.parallele}
					oninput={(e) => setN('parallele', (e.target as HTMLInputElement).value)}
					class="border-border bg-background w-20 rounded-sm border px-2 py-1.5 text-[13px]"
				/>
			</div>
		</label>

		<div class="grid grid-cols-2 gap-2">
			<label class="block">
				<span class="text-text-dim font-mono text-[10.5px] tracking-[0.1em] uppercase">
					T° min
				</span>
				<div class="mt-1 flex items-center gap-1">
					<input
						type="number"
						min="10"
						max="60"
						step="1"
						value={params.tMin}
						oninput={(e) => setN('tMin', (e.target as HTMLInputElement).value)}
						class="border-border bg-background flex-1 rounded-sm border px-2 py-1.5 text-[13px]"
					/>
					<span class="text-text-dim font-mono text-[11px]">°C</span>
				</div>
			</label>
			<label class="block">
				<span class="text-text-dim font-mono text-[10.5px] tracking-[0.1em] uppercase">
					T° max
				</span>
				<div class="mt-1 flex items-center gap-1">
					<input
						type="number"
						min="20"
						max="95"
						step="1"
						value={params.tMax}
						oninput={(e) => setN('tMax', (e.target as HTMLInputElement).value)}
						class="border-border bg-background flex-1 rounded-sm border px-2 py-1.5 text-[13px]"
					/>
					<span class="text-text-dim font-mono text-[11px]">°C</span>
				</div>
			</label>
		</div>
	</div>
</section>
