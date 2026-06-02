<script lang="ts">
	import { onMount } from 'svelte';
	import { replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import ToolShell from '$lib/components/tools/ToolShell.svelte';
	import Tag from '$lib/components/ui/Tag.svelte';
	import { getTool } from '$lib/tools/registry';
	import Search from '@lucide/svelte/icons/search';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import X from '@lucide/svelte/icons/x';
	import manifestJson from '$lib/tools/modbus/manifest.generated.json';
	import {
		EMPTY_FILTERS,
		facetCounts,
		filterDevices,
		filtersFromQuery,
		filtersToQuery
	} from '$lib/tools/modbus/search';
	import {
		EQUIPMENT_TYPE_LABELS,
		type EquipmentType,
		type ModbusManifest,
		type ModbusManifestDevice,
		type ModbusTransport
	} from '$lib/tools/modbus/types';

	const tool = getTool('modbus')!;
	const manifest = manifestJson as ModbusManifest;

	let filters = $state({ ...EMPTY_FILTERS });

	// Hydrate depuis l'URL au premier mount (les SearchParams ne sont pas
	// connus en SSR statique → on les lit côté client).
	onMount(() => {
		filters = filtersFromQuery(new URL(window.location.href).searchParams);
	});

	// Sync URL ←→ filtres (replaceState pour ne pas polluer l'historique).
	$effect(() => {
		if (typeof window === 'undefined') return;
		const qs = filtersToQuery(filters);
		const target = `${window.location.pathname}${qs}`;
		if (target !== window.location.pathname + window.location.search) {
			replaceState(target, page.state);
		}
	});

	const filtered = $derived(filterDevices(manifest.devices, filters));
	const vendorCounts = $derived(facetCounts(manifest.devices, filters, 'vendor'));
	const typeCounts = $derived(facetCounts(manifest.devices, filters, 'equipmentType'));
	const transportCounts = $derived(facetCounts(manifest.devices, filters, 'transport'));

	const vendorsSorted = $derived(
		manifest.vendors
			.map((v) => ({ v, n: vendorCounts.get(v) ?? 0 }))
			.filter((x) => x.n > 0)
			.sort((a, b) => b.n - a.n)
	);

	function toggle<T extends string>(list: T[], item: T): T[] {
		return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
	}

	function resetFilters() {
		filters = { ...EMPTY_FILTERS };
	}

	const hasActiveFilters = $derived(
		filters.query.length > 0 ||
			filters.vendors.length > 0 ||
			filters.equipmentTypes.length > 0 ||
			filters.transports.length > 0
	);
</script>

<ToolShell
	{tool}
	seoTitle="Catalogue Modbus — registres, types, échelles"
	seoDescription="Catalogue ouvert de devices Modbus RTU/TCP : registres, types, échelles, CRC-16. {manifest.devices.length} devices, {manifest.vendors.length} marques."
>
	<div class="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[18rem_1fr]">
		<!-- Facettes -->
		<aside class="space-y-5">
			<div class="border-border bg-card/60 rounded border p-4">
				<label class="text-text-dim mb-2 block font-mono text-[11px] tracking-wide uppercase" for="q">
					Recherche
				</label>
				<div
					class="border-border focus-within:ring-primary/40 bg-background flex items-center gap-2 rounded border px-2.5 py-1.5 focus-within:ring-2"
				>
					<Search class="text-text-dim size-3.5 shrink-0" aria-hidden="true" />
					<input
						id="q"
						type="search"
						placeholder="marque, modèle…"
						class="placeholder:text-text-dim/70 w-full bg-transparent text-[13px] outline-none"
						bind:value={filters.query}
					/>
					{#if filters.query}
						<button
							type="button"
							onclick={() => (filters.query = '')}
							class="text-text-dim hover:text-foreground"
							aria-label="Effacer la recherche"
						>
							<X class="size-3.5" />
						</button>
					{/if}
				</div>
			</div>

			{@render FacetGroup(
				"Type d'équipement",
				Array.from(typeCounts).map(([k, n]) => ({
					value: k,
					label: EQUIPMENT_TYPE_LABELS[k as EquipmentType] ?? k,
					count: n
				})),
				filters.equipmentTypes,
				(v) => (filters.equipmentTypes = toggle(filters.equipmentTypes, v as EquipmentType)),
				false
			)}

			{@render FacetGroup(
				'Transport',
				Array.from(transportCounts).map(([k, n]) => ({ value: k, label: k.toUpperCase(), count: n })),
				filters.transports,
				(v) => (filters.transports = toggle(filters.transports, v as ModbusTransport)),
				false
			)}

			{@render FacetGroup(
				'Marque',
				vendorsSorted.map((x) => ({ value: x.v, label: x.v, count: x.n })),
				filters.vendors,
				(v) => (filters.vendors = toggle(filters.vendors, v)),
				true
			)}

			{#if hasActiveFilters}
				<button
					type="button"
					onclick={resetFilters}
					class="border-border hover:border-line-strong text-text-soft hover:text-foreground w-full rounded border px-3 py-1.5 font-mono text-[11px] transition-colors"
				>
					Réinitialiser les filtres
				</button>
			{/if}
		</aside>

		<!-- Résultats -->
		<div>
			<div class="text-text-dim mb-3 flex items-center justify-between font-mono text-[11px]">
				<span>
					<span class="text-foreground font-semibold">{filtered.length}</span>
					/ {manifest.devices.length} devices
				</span>
				<span>
					{manifest.vendors.length} marques · sources : jibrilsharafi + HA
				</span>
			</div>

			{#if filtered.length === 0}
				<div class="border-border bg-card/40 text-text-soft rounded border p-8 text-center text-[13px]">
					Aucun device ne correspond. Essaie d'élargir les filtres.
				</div>
			{:else}
				<ul class="grid grid-cols-1 gap-2 sm:grid-cols-2">
					{#each filtered as d (d.slug)}
						{@render DeviceCard(d)}
					{/each}
				</ul>
			{/if}
		</div>
	</div>
</ToolShell>

{#snippet FacetGroup(
	title: string,
	items: Array<{ value: string; label: string; count: number }>,
	selected: string[],
	onToggle: (v: string) => void,
	scrollable: boolean
)}
	<div class="border-border bg-card/60 rounded border p-4">
		<p class="text-text-dim mb-2 font-mono text-[11px] tracking-wide uppercase">{title}</p>
		<ul class:max-h-64={scrollable} class:overflow-y-auto={scrollable} class="space-y-1">
			{#each items as it (it.value)}
				{@const checked = selected.includes(it.value)}
				<li>
					<label
						class="hover:bg-secondary/40 flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-[12.5px]"
					>
						<input
							type="checkbox"
							{checked}
							onchange={() => onToggle(it.value)}
							class="accent-primary size-3.5"
						/>
						<span class="flex-1 truncate">{it.label}</span>
						<span class="text-text-dim font-mono text-[10.5px]">{it.count}</span>
					</label>
				</li>
			{/each}
		</ul>
	</div>
{/snippet}

{#snippet DeviceCard(device: ModbusManifestDevice)}
	<li>
		<a
			href="/outils/modbus/{device.vendorSlug}/{device.modelSlug}"
			class="border-border bg-card/60 hover:border-primary/50 group flex h-full flex-col gap-2 rounded border p-3 transition-colors"
		>
			<div class="flex items-center justify-between gap-2">
				<p class="text-text-dim font-mono text-[10.5px] uppercase">{device.vendor}</p>
				{#if device.needsReview}
					<span
						class="text-amber inline-flex items-center gap-1 font-mono text-[10px]"
						title="À vérifier : metadata partielles ou ordre d'octets non confirmé"
					>
						<TriangleAlert class="size-3" />
						à vérifier
					</span>
				{/if}
			</div>
			<p class="text-foreground group-hover:text-primary font-mono text-[14px] font-medium">
				{device.model}
			</p>
			<div class="flex flex-wrap items-center gap-1.5">
				<Tag>{EQUIPMENT_TYPE_LABELS[device.equipmentType]}</Tag>
				{#each device.transport as t (t)}
					<Tag>{t.toUpperCase()}</Tag>
				{/each}
				<span class="text-text-dim font-mono text-[10.5px]">
					{device.registerCount} reg.
				</span>
			</div>
		</a>
	</li>
{/snippet}
