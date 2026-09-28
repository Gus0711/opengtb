<script lang="ts">
	import { getTool } from '$lib/tools/registry';
	import ToolShell from '$lib/components/tools/ToolShell.svelte';
	import Tag from '$lib/components/ui/Tag.svelte';
	import Copy from '@lucide/svelte/icons/copy';
	import Check from '@lucide/svelte/icons/check';
	import Download from '@lucide/svelte/icons/download';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import Search from '@lucide/svelte/icons/search';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import {
		EQUIPMENT_TYPE_LABELS,
		type ModbusAccess,
		type ModbusDataType,
		type ModbusDevice,
		type ModbusFunction,
		type ModbusRegister
	} from '$lib/tools/modbus/types';

	let { data }: { data: { device: ModbusDevice } } = $props();
	const tool = getTool('modbus')!;
	const device = $derived(data.device);

	type SortKey = 'address' | 'function' | 'name' | 'dataType' | 'access';
	type RegisterFunctionFilter = 'all' | ModbusFunction;
	type RegisterTypeFilter = 'all' | ModbusDataType;
	type RegisterAccessFilter = 'all' | ModbusAccess;

	const ACCESS_LABEL: Record<ModbusRegister['access'], string> = { r: 'R', w: 'W', rw: 'R/W' };

	let sortKey = $state<SortKey>('address');
	let sortDir = $state<'asc' | 'desc'>('asc');
	let filter = $state('');
	let functionFilter = $state<RegisterFunctionFilter>('all');
	let dataTypeFilter = $state<RegisterTypeFilter>('all');
	let accessFilter = $state<RegisterAccessFilter>('all');
	let unitFilter = $state('all');

	const functionOptions = $derived(uniqueSorted(device.registers.map((r) => r.function)));
	const dataTypeOptions = $derived(uniqueSorted(device.registers.map((r) => r.dataType)));
	const accessOptions = $derived(uniqueSorted(device.registers.map((r) => r.access)));
	const unitOptions = $derived(
		uniqueSorted(device.registers.map((r) => r.unit).filter((unit): unit is string => Boolean(unit)))
	);

	const registerStats = $derived.by(() => {
		const writable = device.registers.filter((r) => r.access === 'w' || r.access === 'rw').length;
		const scaled = device.registers.filter(
			(r) => r.scale !== undefined || r.offset !== undefined
		).length;
		const enumerated = device.registers.filter((r) => r.enum).length;
		const multiWord = device.registers.filter((r) => r.size > 1).length;
		return { writable, scaled, enumerated, multiWord };
	});

	const hasActiveRegisterFilters = $derived(
		filter.trim().length > 0 ||
			functionFilter !== 'all' ||
			dataTypeFilter !== 'all' ||
			accessFilter !== 'all' ||
			unitFilter !== 'all'
	);

	function sortBy(k: SortKey) {
		if (sortKey === k) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		else {
			sortKey = k;
			sortDir = 'asc';
		}
	}

	const filtered = $derived.by(() => {
		const tokens = normalizeSearch(filter).split(/\s+/).filter(Boolean);
		const list = device.registers.filter((r) => {
			if (functionFilter !== 'all' && r.function !== functionFilter) return false;
			if (dataTypeFilter !== 'all' && r.dataType !== dataTypeFilter) return false;
			if (accessFilter !== 'all' && r.access !== accessFilter) return false;
			if (unitFilter !== 'all' && (r.unit ?? '') !== unitFilter) return false;
			if (tokens.length === 0) return true;

			const enumText = r.enum
				? Object.entries(r.enum)
						.map(([key, value]) => `${key} ${value}`)
						.join(' ')
				: '';
			const haystack = normalizeSearch(
				[
					r.name,
					r.label ?? '',
					r.function,
					r.dataType,
					r.wordOrder ?? '',
					r.unit ?? '',
					r.notes ?? '',
					enumText,
					ACCESS_LABEL[r.access],
					String(r.address),
					hex(r.address)
				].join(' ')
			);
			return tokens.every((token) => haystack.includes(token));
		});
		const dir = sortDir === 'asc' ? 1 : -1;
		list.sort((a, b) => {
			const va = sortKey === 'name' ? (a.label ?? a.name) : a[sortKey];
			const vb = sortKey === 'name' ? (b.label ?? b.name) : b[sortKey];
			if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
			return String(va).localeCompare(String(vb), 'fr') * dir;
		});
		return list;
	});

	function uniqueSorted<T extends string>(values: T[]): T[] {
		return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, 'fr'));
	}

	function normalizeSearch(value: string): string {
		return value
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.toLowerCase();
	}

	function resetRegisterFilters() {
		filter = '';
		functionFilter = 'all';
		dataTypeFilter = 'all';
		accessFilter = 'all';
		unitFilter = 'all';
	}

	function hex(n: number, width = 4): string {
		return '0x' + n.toString(16).toUpperCase().padStart(width, '0');
	}

	let copiedKey = $state<string | null>(null);

	async function copyText(text: string, key: string) {
		try {
			await navigator.clipboard.writeText(text);
			copiedKey = key;
			setTimeout(() => {
				if (copiedKey === key) copiedKey = null;
			}, 1500);
		} catch {
			// Échec silencieux : pas critique, l'utilisateur peut sélectionner à la main.
		}
	}

	function registerToMd(r: ModbusRegister): string {
		const parts = [
			`- **${r.label ?? r.name}**`,
			`@ ${hex(r.address)} (${r.address})`,
			`· ${r.function}`,
			`· ${r.dataType}${r.size > 1 ? ` (${r.size} reg.)` : ''}`,
			r.scale !== undefined ? `· ×${r.scale}` : '',
			r.unit ? `· ${r.unit}` : '',
			`· ${ACCESS_LABEL[r.access]}`
		].filter(Boolean);
		return parts.join(' ');
	}

	function tableToMd(): string {
		const head = '| addr | fn | nom | type | scale | unité | RW |';
		const sep = '|---|---|---|---|---|---|---|';
		const rows = filtered.map(
			(r) =>
				`| ${hex(r.address)} (${r.address}) | ${r.function} | ${r.label ?? r.name} | ${r.dataType}${r.size > 1 ? `×${r.size}` : ''} | ${r.scale ?? ''} | ${r.unit ?? ''} | ${ACCESS_LABEL[r.access]} |`
		);
		return [`# ${device.name} — registres Modbus`, '', head, sep, ...rows].join('\n');
	}

	function csvCell(value: unknown): string {
		const text = String(value ?? '');
		return /[",;\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
	}

	function tableToCsv(): string {
		const rows = [
			[
				'adresse_dec',
				'adresse_hex',
				'fonction',
				'nom',
				'nom_source',
				'type',
				'taille',
				'ordre_mots',
				'scale',
				'offset',
				'unite',
				'acces',
				'notes'
			],
			...filtered.map((r) => [
				r.address,
				hex(r.address),
				r.function,
				r.label ?? r.name,
				r.name,
				r.dataType,
				r.size,
				r.wordOrder ?? '',
				r.scale ?? '',
				r.offset ?? '',
				r.unit ?? '',
				ACCESS_LABEL[r.access],
				r.notes ?? ''
			])
		];
		return rows.map((row) => row.map(csvCell).join(';')).join('\n');
	}

	function downloadCsv() {
		if (typeof document === 'undefined') return;
		const blob = new Blob([`\uFEFF${tableToCsv()}`], { type: 'text/csv;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = `${device.vendorSlug}-${device.modelSlug}-modbus.csv`;
		document.body.appendChild(link);
		link.click();
		link.remove();
		URL.revokeObjectURL(url);
	}
</script>

<ToolShell
	{tool}
	seoTitle="{device.name} — registres Modbus"
	seoDescription="Table Modbus du {device.name} ({EQUIPMENT_TYPE_LABELS[device.equipmentType]}) : {device.registers.length} registres, transports {device.transport.join(' / ').toUpperCase()}."
>
	<!-- Tête de fiche -->
	<header class="mt-6">
		<p class="text-text-dim font-mono text-[11px] uppercase">{device.vendor}</p>
		<h2 class="font-mono text-2xl font-semibold tracking-[-0.005em]">{device.model}</h2>
		<div class="mt-3 flex flex-wrap items-center gap-1.5">
			<Tag>{EQUIPMENT_TYPE_LABELS[device.equipmentType]}</Tag>
			{#each device.transport as t (t)}
				<Tag>{t.toUpperCase()}</Tag>
			{/each}
			<span class="text-text-dim font-mono text-[11px]">
				{device.registers.length} registres
			</span>
			{#if device.upstream.needsReview}
				<span class="text-amber inline-flex items-center gap-1 font-mono text-[10.5px]">
					<TriangleAlert class="size-3" />
					À vérifier
				</span>
			{/if}
		</div>
	</header>

	<!-- À vérifier -->
	{#if device.upstream.needsReview && device.upstream.reviewReasons?.length}
		<div class="border-amber/40 bg-amber/5 mt-5 rounded border p-3">
			<p class="text-amber mb-1 font-mono text-[11px] tracking-wide uppercase">À vérifier</p>
			<ul class="text-text-soft list-disc pl-5 text-[12.5px]">
				{#each device.upstream.reviewReasons as reason (reason)}
					<li>{reason}</li>
				{/each}
			</ul>
		</div>
	{/if}

	<!-- Config par défaut -->
	{#if device.defaults.rtu || device.defaults.tcp}
		<section class="mt-6">
			<h3 class="text-text-dim mb-2 font-mono text-[11px] tracking-wide uppercase">
				Config par défaut
			</h3>
			<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
				{#if device.defaults.rtu}
					{@const rtu = device.defaults.rtu}
					<div class="border-border bg-card/60 rounded border p-3 font-mono text-[12px]">
						<p class="text-primary mb-1.5 text-[11px] font-semibold">RTU</p>
						<dl class="text-text-soft grid grid-cols-[7rem_1fr] gap-x-3 gap-y-0.5">
							{#if rtu.baudrate}
								<dt>Baudrate</dt>
								<dd class="text-foreground">{rtu.baudrate}</dd>
							{/if}
							{#if rtu.parity}
								<dt>Parité</dt>
								<dd class="text-foreground">{rtu.parity}</dd>
							{/if}
							{#if rtu.dataBits}
								<dt>Bits données</dt>
								<dd class="text-foreground">{rtu.dataBits}</dd>
							{/if}
							{#if rtu.stopBits}
								<dt>Stop bits</dt>
								<dd class="text-foreground">{rtu.stopBits}</dd>
							{/if}
							{#if rtu.slaveIdDefault !== undefined}
								<dt>Slave ID</dt>
								<dd class="text-foreground">{rtu.slaveIdDefault}</dd>
							{/if}
						</dl>
					</div>
				{/if}
				{#if device.defaults.tcp}
					{@const tcp = device.defaults.tcp}
					<div class="border-border bg-card/60 rounded border p-3 font-mono text-[12px]">
						<p class="text-primary mb-1.5 text-[11px] font-semibold">TCP</p>
						<dl class="text-text-soft grid grid-cols-[7rem_1fr] gap-x-3 gap-y-0.5">
							{#if tcp.port}
								<dt>Port</dt>
								<dd class="text-foreground">{tcp.port}</dd>
							{/if}
							{#if tcp.unitIdDefault !== undefined}
								<dt>Unit ID</dt>
								<dd class="text-foreground">{tcp.unitIdDefault}</dd>
							{/if}
						</dl>
					</div>
				{/if}
			</div>
		</section>
	{/if}

	<section class="mt-6 grid grid-cols-2 gap-2 md:grid-cols-4" aria-label="Statistiques des registres">
		{@render Stat('Écritures', registerStats.writable)}
		{@render Stat('Échelles', registerStats.scaled)}
		{@render Stat('Enums', registerStats.enumerated)}
		{@render Stat('Multi-registres', registerStats.multiWord)}
	</section>

	<!-- Table registres -->
	<section class="mt-6">
		<div class="mb-3 space-y-3">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<h3 class="text-text-dim font-mono text-[11px] tracking-wide uppercase">
					Registres ({filtered.length}/{device.registers.length})
				</h3>
				<div class="flex items-center gap-2">
					<button
						type="button"
						class="border-border hover:border-line-strong text-text-soft hover:text-foreground inline-flex items-center gap-1 rounded border px-2 py-1 font-mono text-[11px] transition-colors"
						onclick={() => copyText(tableToMd(), '__table__')}
					>
						{#if copiedKey === '__table__'}
							<Check class="size-3" />
							copié
						{:else}
							<Copy class="size-3" />
							copier
						{/if}
					</button>
					<button
						type="button"
						class="border-border hover:border-line-strong text-text-soft hover:text-foreground inline-flex items-center gap-1 rounded border px-2 py-1 font-mono text-[11px] transition-colors"
						onclick={downloadCsv}
						title="Télécharger les lignes filtrées en CSV"
					>
						<Download class="size-3" />
						CSV
					</button>
				</div>
			</div>

			<div class="border-border bg-card/40 rounded border p-3">
				<div class="grid gap-2 md:grid-cols-[minmax(12rem,1fr)_repeat(4,minmax(8rem,auto))]">
					<label class="block">
						<span class="text-text-dim mb-1 block font-mono text-[10.5px] uppercase">Recherche</span>
						<span
							class="border-border bg-background focus-within:ring-primary/40 flex items-center gap-2 rounded border px-2 py-1.5 focus-within:ring-2"
						>
							<Search class="text-text-dim size-3.5 shrink-0" aria-hidden="true" />
							<input
								type="search"
								placeholder="nom, adresse, unité, enum…"
								class="placeholder:text-text-dim/70 min-w-0 flex-1 bg-transparent font-mono text-[11.5px] outline-none"
								bind:value={filter}
							/>
						</span>
					</label>

					<label class="block">
						<span class="text-text-dim mb-1 block font-mono text-[10.5px] uppercase">Fonction</span>
						<select
							class="border-border bg-background focus:ring-primary/40 w-full rounded border px-2 py-1.5 font-mono text-[11.5px] outline-none focus:ring-2"
							bind:value={functionFilter}
						>
							<option value="all">Toutes</option>
							{#each functionOptions as option (option)}
								<option value={option}>{option}</option>
							{/each}
						</select>
					</label>

					<label class="block">
						<span class="text-text-dim mb-1 block font-mono text-[10.5px] uppercase">Type</span>
						<select
							class="border-border bg-background focus:ring-primary/40 w-full rounded border px-2 py-1.5 font-mono text-[11.5px] outline-none focus:ring-2"
							bind:value={dataTypeFilter}
						>
							<option value="all">Tous</option>
							{#each dataTypeOptions as option (option)}
								<option value={option}>{option}</option>
							{/each}
						</select>
					</label>

					<label class="block">
						<span class="text-text-dim mb-1 block font-mono text-[10.5px] uppercase">Accès</span>
						<select
							class="border-border bg-background focus:ring-primary/40 w-full rounded border px-2 py-1.5 font-mono text-[11.5px] outline-none focus:ring-2"
							bind:value={accessFilter}
						>
							<option value="all">Tous</option>
							{#each accessOptions as option (option)}
								<option value={option}>{ACCESS_LABEL[option]}</option>
							{/each}
						</select>
					</label>

					<label class="block">
						<span class="text-text-dim mb-1 block font-mono text-[10.5px] uppercase">Unité</span>
						<select
							class="border-border bg-background focus:ring-primary/40 w-full rounded border px-2 py-1.5 font-mono text-[11.5px] outline-none focus:ring-2"
							bind:value={unitFilter}
						>
							<option value="all">Toutes</option>
							{#each unitOptions as option (option)}
								<option value={option}>{option}</option>
							{/each}
						</select>
					</label>
				</div>

				{#if hasActiveRegisterFilters}
					<button
						type="button"
						class="text-text-soft hover:text-primary mt-2 inline-flex items-center gap-1.5 font-mono text-[11px]"
						onclick={resetRegisterFilters}
					>
						<RotateCcw class="size-3" />
						Réinitialiser les filtres de registres
					</button>
				{/if}
			</div>
		</div>

		<div class="border-border bg-card/40 overflow-x-auto rounded border">
			<table class="w-full font-mono text-[12px]">
				<thead class="bg-secondary/40 text-text-dim text-[10.5px] tracking-wide uppercase">
					<tr>
						{@render Th('address', 'addr')}
						{@render Th('function', 'fn')}
						{@render Th('name', 'nom')}
						{@render Th('dataType', 'type')}
						<th class="px-2 py-1.5 text-right">scale</th>
						<th class="px-2 py-1.5">unité</th>
						{@render Th('access', 'rw')}
						<th class="px-2 py-1.5"></th>
					</tr>
				</thead>
				<tbody>
					{#each filtered as r (r.function + ':' + r.address)}
						{@const key = `${r.function}:${r.address}`}
						<tr class="border-border hover:bg-secondary/30 border-t">
							<td class="px-2 py-1.5" data-field="address" data-value={r.address}>
								<span class="text-foreground">{hex(r.address)}</span>
								<span class="text-text-dim">({r.address})</span>
							</td>
							<td class="text-text-soft px-2 py-1.5" data-field="function">{r.function}</td>
							<td class="text-foreground px-2 py-1.5" data-field="name">
								{r.label ?? r.name}
								{#if r.label && r.name !== r.label}
									<span class="text-text-dim text-[10.5px]"> · {r.name}</span>
								{/if}
								{#if r.enum}
									<details class="text-text-dim text-[11px]">
										<summary class="cursor-pointer">enum ({Object.keys(r.enum).length})</summary>
										<ul class="ml-3 mt-1">
											{#each Object.entries(r.enum) as [k, v] (k)}
												<li><span class="text-foreground">{k}</span> → {v}</li>
											{/each}
										</ul>
									</details>
								{/if}
							</td>
							<td class="text-text-soft px-2 py-1.5" data-field="dataType">
								{r.dataType}{r.size > 1 ? ` ×${r.size}` : ''}
								{#if r.wordOrder}
									<span class="text-text-dim text-[10.5px]"> · {r.wordOrder}</span>
								{/if}
							</td>
							<td class="text-text-soft px-2 py-1.5 text-right" data-field="scale" data-value={r.scale ?? ''}>
								{r.scale ?? ''}
							</td>
							<td class="text-text-soft px-2 py-1.5" data-field="unit">{r.unit ?? ''}</td>
							<td class="px-2 py-1.5">
								<span
									class:text-primary={r.access === 'rw' || r.access === 'w'}
									class:text-text-soft={r.access === 'r'}
								>
									{ACCESS_LABEL[r.access]}
								</span>
							</td>
							<td class="px-2 py-1.5">
								<button
									type="button"
									aria-label="Copier la ligne"
									title="Copier au format markdown"
									class="text-text-dim hover:text-foreground"
									onclick={() => copyText(registerToMd(r), key)}
								>
									{#if copiedKey === key}
										<Check class="size-3" />
									{:else}
										<Copy class="size-3" />
									{/if}
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<!-- Documentation -->
	{#if device.doc}
		<section class="mt-6">
			<h3 class="text-text-dim mb-2 font-mono text-[11px] tracking-wide uppercase">
				Documentation
			</h3>
			<pre
				class="border-border bg-card/40 text-text-soft font-sans text-[13px] leading-relaxed whitespace-pre-wrap rounded border p-4">{device.doc}</pre>
		</section>
	{/if}

	<!-- Sources et datasheets -->
	<section class="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
		{#if device.datasheets?.length}
			<div class="border-border bg-card/60 rounded border p-3">
				<p class="text-text-dim mb-2 font-mono text-[11px] tracking-wide uppercase">Datasheets</p>
				<ul class="space-y-1 text-[12.5px]">
					{#each device.datasheets as ds (ds.url)}
						<li>
							<a
								href={ds.url}
								target="_blank"
								rel="noreferrer noopener"
								class="text-primary hover:underline inline-flex items-center gap-1"
							>
								{ds.label}
								<ExternalLink class="size-3" />
							</a>
						</li>
					{/each}
				</ul>
			</div>
		{/if}
		<div class="border-border bg-card/60 rounded border p-3">
			<p class="text-text-dim mb-2 font-mono text-[11px] tracking-wide uppercase">Source</p>
			<p class="text-text-soft font-mono text-[11.5px]">
				upstream :
				<span class="text-foreground">{device.upstream.source}</span>
				<span class="text-text-dim"> · {device.upstream.ref.slice(0, 7)}</span>
			</p>
			{#if device.upstream.sourceUrl}
				<p class="text-text-soft mt-1 text-[11.5px]">
					<a
						href={device.upstream.sourceUrl}
						target="_blank"
						rel="noreferrer noopener"
						class="text-primary inline-flex items-center gap-1 hover:underline"
					>
						doc d'origine
						<ExternalLink class="size-3" />
					</a>
				</p>
			{/if}
		</div>
	</section>
</ToolShell>

{#snippet Stat(label: string, value: number)}
	<div class="border-border bg-card/50 rounded border p-3">
		<p class="text-text-dim font-mono text-[10.5px] uppercase">{label}</p>
		<p class="text-foreground mt-1 font-mono text-lg tabular-nums">{value}</p>
	</div>
{/snippet}

{#snippet Th(key: SortKey, label: string)}
	<th class="px-2 py-1.5">
		<button
			type="button"
			class="hover:text-foreground inline-flex items-center gap-1"
			onclick={() => sortBy(key)}
		>
			{label}
			{#if sortKey === key}
				<span class="text-primary">{sortDir === 'asc' ? '▲' : '▼'}</span>
			{/if}
		</button>
	</th>
{/snippet}
