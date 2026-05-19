<script lang="ts">
	import Search from '@lucide/svelte/icons/search';
	import X from '@lucide/svelte/icons/x';
	import { loadManifest } from '$lib/tools/decode/manifest';
	import { searchDevices } from '$lib/tools/decode/search';
	import type { Manifest, ManifestDevice } from '$lib/tools/decode/types';

	let {
		value = $bindable<string | undefined>(undefined),
		onSelect
	}: {
		value: string | undefined;
		onSelect: (device: ManifestDevice | undefined) => void;
	} = $props();

	let manifest = $state<Manifest | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let query = $state('');
	let open = $state(false);
	let highlighted = $state(0);

	let inputEl = $state<HTMLInputElement | null>(null);

	const selectedDevice = $derived.by(() => {
		if (!manifest || !value) return undefined;
		return manifest.devices.find((d) => d.slug === value);
	});

	const results = $derived.by(() => {
		if (!manifest) return [];
		return searchDevices(manifest, query, 30);
	});

	async function ensureManifest() {
		if (manifest || loading) return;
		loading = true;
		try {
			manifest = await loadManifest();
		} catch (e) {
			error = (e as Error).message;
		} finally {
			loading = false;
		}
	}

	function handleFocus() {
		void ensureManifest();
		open = true;
	}

	function handleBlur() {
		setTimeout(() => {
			open = false;
		}, 150);
	}

	function pick(d: ManifestDevice) {
		onSelect(d);
		query = '';
		open = false;
		inputEl?.blur();
	}

	function clearSelection() {
		onSelect(undefined);
		query = '';
		highlighted = 0;
		inputEl?.focus();
	}

	function onKeydown(e: KeyboardEvent) {
		if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter')) {
			open = true;
			void ensureManifest();
			e.preventDefault();
			return;
		}
		if (!open) return;
		if (e.key === 'ArrowDown') {
			highlighted = Math.min(highlighted + 1, results.length - 1);
			e.preventDefault();
		} else if (e.key === 'ArrowUp') {
			highlighted = Math.max(highlighted - 1, 0);
			e.preventDefault();
		} else if (e.key === 'Enter') {
			if (results[highlighted]) {
				pick(results[highlighted]);
				e.preventDefault();
			}
		} else if (e.key === 'Escape') {
			open = false;
			inputEl?.blur();
		}
	}

	$effect(() => {
		// Reset highlight quand la recherche change.
		// Lecture explicite de query pour déclencher l'effet.
		query;
		highlighted = 0;
	});
</script>

<div class="relative">
	<label
		for="decode-device-input"
		class="text-text-soft mb-1.5 block font-mono text-[11.5px] tracking-wide uppercase"
	>
		Device
	</label>

	{#if selectedDevice}
		<div
			class="border-border bg-background flex items-center gap-2 rounded border px-3 py-2"
			data-field="device"
			data-value={selectedDevice.slug}
		>
			<div class="min-w-0 flex-1">
				<p class="text-text-dim truncate font-mono text-[11px] tracking-wide">
					{selectedDevice.vendorName}
				</p>
				<p class="text-foreground truncate text-sm">{selectedDevice.name}</p>
			</div>
			<button
				type="button"
				onclick={clearSelection}
				class="text-text-soft hover:text-primary focus-visible:ring-ring inline-flex size-7 shrink-0 items-center justify-center rounded transition-colors focus-visible:ring-2 focus-visible:outline-none"
				aria-label="Changer de device"
				title="Changer de device"
			>
				<X class="size-4" />
			</button>
		</div>
	{:else}
		<div class="relative">
			<Search
				class="text-text-dim pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
				aria-hidden="true"
			/>
			<input
				id="decode-device-input"
				bind:this={inputEl}
				type="text"
				role="combobox"
				aria-expanded={open}
				aria-controls="decode-device-listbox"
				aria-autocomplete="list"
				placeholder={loading ? 'Chargement du catalogue…' : 'ex. Milesight AM102, Vicki, Cayenne LPP…'}
				bind:value={query}
				onfocus={handleFocus}
				onblur={handleBlur}
				onkeydown={onKeydown}
				class="border-border bg-background focus-visible:ring-ring w-full rounded border py-2 pr-3 pl-9 font-mono text-sm focus-visible:ring-2 focus-visible:outline-none"
			/>
		</div>

		{#if open && manifest}
			<ul
				id="decode-device-listbox"
				role="listbox"
				class="border-line-strong bg-background absolute z-20 mt-1 max-h-80 w-full overflow-auto rounded border shadow-lg"
			>
				{#if results.length === 0}
					<li class="text-text-dim px-3 py-2 text-sm italic">Aucun device pour « {query} »</li>
				{:else}
					{#each results as d, i (d.slug)}
						<li role="option" aria-selected={i === highlighted}>
							<button
								type="button"
								onmousedown={(e) => {
									e.preventDefault();
									pick(d);
								}}
								onmouseenter={() => (highlighted = i)}
								class="hover:bg-secondary/60 focus:bg-secondary/60 block w-full px-3 py-2 text-left transition-colors {i ===
								highlighted
									? 'bg-secondary/60'
									: ''}"
							>
								<p class="text-text-dim font-mono text-[10.5px] tracking-wide uppercase">
									{d.vendorName}
								</p>
								<p class="text-foreground truncate text-sm">{d.name}</p>
							</button>
						</li>
					{/each}
				{/if}
			</ul>
		{/if}
	{/if}

	{#if error}
		<p class="text-destructive mt-2 text-xs">{error}</p>
	{/if}

	{#if manifest && !selectedDevice && !open}
		<p class="text-text-dim mt-1.5 font-mono text-[11px]">
			{manifest.devices.length} devices · catalogue TTN
		</p>
	{/if}
</div>
