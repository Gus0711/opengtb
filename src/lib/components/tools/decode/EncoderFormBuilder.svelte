<script lang="ts">
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import type { DownlinkSchema, DownlinkSchemaField } from '$lib/tools/decode/types';

	let {
		schema,
		data = $bindable(''),
		onChange
	}: {
		schema: DownlinkSchema;
		/** JSON string source of truth, partagé avec le toggle JSON brut. */
		data: string;
		onChange?: () => void;
	} = $props();

	// État interne typé : on parse le JSON entrant une fois, puis on manipule
	// localement et on stringify à chaque changement.
	let internal = $state<Record<string, unknown>>(parseInitial(data));

	function parseInitial(d: string): Record<string, unknown> {
		if (!d.trim()) return {};
		try {
			const parsed = JSON.parse(d);
			return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
				? (parsed as Record<string, unknown>)
				: {};
		} catch {
			return {};
		}
	}

	// Lorsqu'un parent (URL, exemple, toggle JSON→Form) change `data` à un
	// objet structurellement différent, on resynchronise. On compare la version
	// stringifiée pour éviter les boucles.
	$effect(() => {
		const incoming = parseInitial(data);
		if (JSON.stringify(incoming) !== JSON.stringify(internal)) {
			internal = incoming;
		}
	});

	function commit() {
		data = JSON.stringify(internal, null, 2);
		onChange?.();
	}

	/**
	 * IMPORTANT : on lit la propriété directement (et non via
	 * `hasOwnProperty.call`) pour que la lecture passe par le getter du proxy
	 * `$state` de Svelte 5 — sans ça, le toggle de la checkbox ne déclenche pas
	 * la ré-évaluation du snippet, donc les inputs n'apparaissent jamais.
	 */
	function isEnabled(obj: Record<string, unknown>, name: string): boolean {
		return obj[name] !== undefined;
	}

	function toggleField(field: DownlinkSchemaField, parent: Record<string, unknown>) {
		if (isEnabled(parent, field.name)) {
			delete parent[field.name];
		} else {
			parent[field.name] = defaultValueFor(field);
		}
		commit();
	}

	function defaultValueFor(field: DownlinkSchemaField): unknown {
		if (field.default !== undefined) return field.default;
		// Commande sans paramètre : la valeur n'est jamais lue par l'encoder,
		// mais doit être truthy pour que `key in payload` (et `Object.keys`)
		// trouve la clé.
		if (field.noParam) return true;
		switch (field.type) {
			case 'boolean':
				return false;
			case 'number':
				if (field.min !== undefined) return field.min;
				return 0;
			case 'string':
				if (field.enum && field.enum.length > 0) return field.enum[0];
				return '';
			case 'object':
				return {};
			default:
				return null;
		}
	}

	function updateScalar(name: string, parent: Record<string, unknown>, value: unknown) {
		parent[name] = value;
		commit();
	}
</script>

{#snippet renderField(field: DownlinkSchemaField, parent: Record<string, unknown>, depth: number)}
	{@const enabled = isEnabled(parent, field.name)}
	{@const fieldId = `enc-field-${field.name}-${depth}`}
	<div
		class="border-line-soft min-w-0 rounded border {enabled
			? 'bg-secondary/20'
			: 'bg-background hover:bg-secondary/10'} transition-colors"
	>
		<label
			class="flex cursor-pointer items-start gap-2 px-2.5 py-2 font-mono text-[12.5px]"
			for={fieldId}
		>
			<input
				id={fieldId}
				type="checkbox"
				checked={enabled}
				onchange={() => toggleField(field, parent)}
				class="accent-primary mt-0.5 size-4 shrink-0 cursor-pointer"
			/>
			<span class="min-w-0 flex-1 leading-tight">
				<span class="text-foreground break-all">{field.name}</span>
				<span class="text-text-dim ml-1 text-[11px]">
					{#if field.noParam}
						commande sans paramètre
					{:else if field.type === 'object'}
						objet
					{:else if field.enum}
						enum {field.enum.length} valeur{field.enum.length > 1 ? 's' : ''}
					{:else}
						{field.type}
						{#if field.min !== undefined || field.max !== undefined}
							[{field.min ?? '−∞'}…{field.max ?? '+∞'}]
						{/if}
					{/if}
				</span>
			</span>
		</label>

		{#if enabled && !field.noParam}
			<div class="border-line-soft border-t px-2.5 py-2">
				{#if field.type === 'boolean'}
					<label class="flex items-center gap-2 font-mono text-[12.5px]">
						<input
							type="checkbox"
							checked={parent[field.name] === true}
							onchange={(e) => updateScalar(field.name, parent, (e.currentTarget as HTMLInputElement).checked)}
							class="accent-primary size-4 cursor-pointer"
						/>
						<span class="text-text-soft">true / false</span>
					</label>
				{:else if field.type === 'number'}
					<input
						type="number"
						value={(parent[field.name] as number) ?? ''}
						min={field.min}
						max={field.max}
						oninput={(e) => {
							const v = (e.currentTarget as HTMLInputElement).valueAsNumber;
							updateScalar(field.name, parent, Number.isFinite(v) ? v : 0);
						}}
						placeholder={field.min !== undefined ? String(field.min) : '0'}
						class="border-border bg-background focus-visible:ring-ring w-full min-w-0 rounded border px-2.5 py-1.5 font-mono text-[12.5px] tabular-nums focus-visible:ring-2 focus-visible:outline-none"
					/>
				{:else if field.enum}
					<select
						value={(parent[field.name] as string) ?? field.enum[0]}
						onchange={(e) => updateScalar(field.name, parent, (e.currentTarget as HTMLSelectElement).value)}
						class="border-border bg-background focus-visible:ring-ring w-full min-w-0 rounded border px-2.5 py-1.5 font-mono text-[12.5px] focus-visible:ring-2 focus-visible:outline-none"
					>
						{#each field.enum as v (v)}
							<option value={v}>{v}</option>
						{/each}
					</select>
				{:else if field.type === 'string'}
					<input
						type="text"
						value={(parent[field.name] as string) ?? ''}
						oninput={(e) => updateScalar(field.name, parent, (e.currentTarget as HTMLInputElement).value)}
						class="border-border bg-background focus-visible:ring-ring w-full min-w-0 rounded border px-2.5 py-1.5 font-mono text-[12.5px] focus-visible:ring-2 focus-visible:outline-none"
					/>
				{:else if field.type === 'object' && field.fields && field.fields.length > 0}
					{@const subObj = (parent[field.name] as Record<string, unknown>) ?? {}}
					<div class="space-y-1.5">
						{#each field.fields as sub (sub.name)}
							{@render renderField(sub, subObj, depth + 1)}
						{/each}
					</div>
				{:else}
					<!-- Type inconnu : fallback texte -->
					<input
						type="text"
						value={(parent[field.name] as string) ?? ''}
						oninput={(e) => updateScalar(field.name, parent, (e.currentTarget as HTMLInputElement).value)}
						placeholder="Valeur libre"
						class="border-border bg-background focus-visible:ring-ring w-full min-w-0 rounded border px-2.5 py-1.5 font-mono text-[12.5px] focus-visible:ring-2 focus-visible:outline-none"
					/>
				{/if}
			</div>
		{/if}
	</div>
{/snippet}

<div class="space-y-2">
	{#each schema.fields as field (field.name)}
		{@render renderField(field, internal, 0)}
	{/each}

	{#if schema.fields.length === 0}
		<p class="text-text-dim italic">Aucun champ détecté dans le codec — utilisez le mode JSON.</p>
	{/if}
</div>
