<script lang="ts">
	import { Handle, Position, useUpdateNodeInternals, type Node, type NodeProps } from '@xyflow/svelte';
	import Box from '@lucide/svelte/icons/box';
	import Cable from '@lucide/svelte/icons/cable';
	import GripVertical from '@lucide/svelte/icons/grip-vertical';
	import Unlink from '@lucide/svelte/icons/unlink';
	import Plus from '@lucide/svelte/icons/plus';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import X from '@lucide/svelte/icons/x';
	import Spline from '@lucide/svelte/icons/spline';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import { MEDIA_LABELS } from './bus';
	import { EQUIPMENT_DEFINITIONS, POINT_COLORS, SIGNAL_PRESETS, equipmentProtocol } from './data';
	import { POINT_KINDS, type PointKind } from './types';
	import type { EquipmentNodeData } from './flow';

	type EquipmentFlowNode = Node<EquipmentNodeData, 'equipment'>;
	let { id, data, selected }: NodeProps<EquipmentFlowNode> = $props();
	let expandedPointId = $state<string | null>(null);
	let showBulkLink = $state(false);
	let cardElement: HTMLDivElement;
	const updateNodeInternals = useUpdateNodeInternals();
	let protocol = $derived(equipmentProtocol(data.item.kind));

	$effect(() => {
		data.item.points.length;
		data.bus?.segment?.id;
		if (expandedPointId && !data.item.points.some((point) => point.id === expandedPointId)) expandedPointId = null;
		queueMicrotask(() => updateNodeInternals(id));
	});

	function togglePoint(pointId: string) {
		expandedPointId = expandedPointId === pointId ? null : pointId;
		data.onOpenPoint(pointId);
		queueMicrotask(() => updateNodeInternals(id));
	}

	function closeEditor() {
		if (!expandedPointId) return;
		const pointId = expandedPointId;
		expandedPointId = null;
		data.onClosePoint(pointId);
		queueMicrotask(() => updateNodeInternals(id));
	}

	function closeWhenOutside(event: PointerEvent) {
		if (event.target instanceof globalThis.Node && !cardElement.contains(event.target)) {
			if (expandedPointId) closeEditor();
			showBulkLink = false;
		}
	}

	function assignAll(targetId: string) {
		data.onAssignAll(data.item.id, targetId);
		showBulkLink = false;
		queueMicrotask(() => updateNodeInternals(id));
	}
</script>

<svelte:window onpointerdown={closeWhenOutside} onpointerup={closeWhenOutside} />

<div bind:this={cardElement} class="equipment-card" class:is-muted={!data.active} class:is-selected={selected}>
	<header class="custom-drag-handle">
		<span class="node-drag-handle" title="Déplacer le bloc" aria-label="Déplacer {data.item.name}"><GripVertical size={15} /></span>
		<button type="button" onclick={() => data.onFocus(data.item.id)} class="node-icon nodrag" aria-label="Isoler {data.item.name}"><Box size={16} /></button>
		<div class="node-title nodrag">
			<span>{EQUIPMENT_DEFINITIONS[data.item.kind].label}</span>
			<input value={data.item.name} oninput={(event) => data.onRename(data.item.id, event.currentTarget.value)} aria-label="Nom de l’équipement" />
		</div>
		<button type="button" onclick={() => { showBulkLink = !showBulkLink; queueMicrotask(() => updateNodeInternals(id)); }} class="icon-button nodrag" class:is-active={showBulkLink} aria-label="Affecter tous les points de {data.item.name}" title="Affecter tous les points"><Cable size={15} /></button>
		<button type="button" onclick={() => data.onRemove(data.item.id)} class="icon-button nodrag danger" aria-label="Supprimer {data.item.name}" title="Supprimer"><Trash2 size={15} /></button>
	</header>
	{#if showBulkLink}
		<div class="bulk-linker nodrag nowheel">
			<span>Affecter les {data.item.points.length} points à</span>
			{#if data.bulkTargets.length}
				<div>{#each data.bulkTargets as target (target.id)}<button type="button" onclick={() => assignAll(target.id)}>{target.name}</button>{/each}</div>
			{:else}
				<em>Aucune cible compatible avec tous les points</em>
			{/if}
		</div>
	{/if}

	{#if data.bus}
		<div class="bus-row nodrag" class:is-orphan={!data.bus.segment} class:has-issue={data.bus.issues.length > 0}>
			<span class="bus-icon" title={data.bus.segment ? 'Raccordé' : 'Non raccordé'}>
				{#if data.bus.issues.length}<TriangleAlert size={13} />{:else}<Spline size={13} />{/if}
			</span>
			<label class="bus-field">
				<span>Segment</span>
				<select value={data.bus.segment?.id ?? ''} onchange={(event) => data.onAttachSegment(data.item.id, event.currentTarget.value)} aria-label="Segment de {data.item.name}">
					<option value="">Non raccordé</option>
					{#each data.bus.options as option (option.segment.id)}<option value={option.segment.id}>{option.targetName} · {option.segment.name} ({MEDIA_LABELS[option.segment.media]})</option>{/each}
				</select>
			</label>
			<label class="bus-field bus-address">
				<span>{data.bus.profile.label}{#if data.bus.profile.assignment === 'commissioning'}<em title="Relevé sur site à la mise en service">facultatif</em>{/if}</span>
				<input value={data.bus.address} placeholder={data.bus.profile.placeholder} disabled={!data.bus.segment} oninput={(event) => data.onSetDeviceAddress(data.item.id, event.currentTarget.value)} aria-label="{data.bus.profile.label} de {data.item.name}" />
			</label>
		</div>
		{#if data.bus.issues.length}
			<p class="bus-issues nodrag">{data.bus.issues.join(' · ')}</p>
		{/if}
	{/if}

	<div>
		{#each data.item.points as point (point.id)}
			<div class="point-row nodrag">
				<button type="button" onclick={() => togglePoint(point.id)} class="point-main">
					<span class="point-kind" style:color={POINT_COLORS[point.kind]} style:border-color="{POINT_COLORS[point.kind]}66">{point.kind}</span>
					<span class="point-name">{point.name}</span>
					<span class="point-signal">{point.signal}</span>
					{#if !point.targetId}<span class="unassigned" title="Non affecté"></span>{/if}
				</button>
				<button type="button" onclick={() => data.onRemovePoint(data.item.id, point.id)} class="remove-point" aria-label="Supprimer {point.name}" title="Supprimer le point"><X size={14} /></button>
				<Handle type="source" position={Position.Right} id={point.id} isConnectableEnd={false} class="point-handle" style={`--port-color:${POINT_COLORS[point.kind]};`} title={`Relier ${point.name}`} aria-label={`Relier ${point.name}`} onclick={(event) => { event.stopPropagation(); data.onSelectConnection(point.id); }}><Cable size={13} /></Handle>
			</div>
			{#if expandedPointId === point.id}
				<div class="point-editor nodrag nowheel">
					<label>Type<select value={point.kind} disabled={Boolean(protocol)} onchange={(event) => data.onChangePointKind(data.item.id, point, event.currentTarget.value as PointKind)}>{#each POINT_KINDS as kind}<option value={kind}>{kind}</option>{/each}</select></label>
					<label class="name-field">Désignation<input value={point.name} oninput={(event) => data.onUpdatePoint(data.item.id, point.id, { name: event.currentTarget.value })} /></label>
					<label>Signal<select value={point.signal} disabled={Boolean(protocol) || point.kind === 'LORA' || point.kind === 'MBUS'} onchange={(event) => data.onUpdatePoint(data.item.id, point.id, { signal: event.currentTarget.value })}>{#each SIGNAL_PRESETS[point.kind] as signal}<option value={signal}>{signal}</option>{/each}</select></label>
					<label>Adresse<input value={point.address} placeholder="Auto" oninput={(event) => data.onUpdatePoint(data.item.id, point.id, { address: event.currentTarget.value })} /></label>
					{#if point.targetId}<button type="button" onclick={() => data.onUnassignPoint(data.item.id, point)} class="unlink-button" title="Déconnecter le point" aria-label="Déconnecter {point.name}"><Unlink size={14} /></button>{/if}
				</div>
			{/if}
		{/each}
	</div>
	<button type="button" onclick={() => data.onAddPoint(data.item.id)} class="add-point nodrag"><Plus size={14} /> Ajouter un point</button>
</div>

<style>
	.equipment-card { position: relative; width: 370px; overflow: visible; border: 1px solid var(--color-border); border-radius: 4px; background: rgba(16, 23, 27, .97); color: var(--color-foreground); box-shadow: 0 12px 30px rgba(0,0,0,.3); transition: opacity .16s, border-color .16s; }
	.equipment-card:has(.point-editor) { width: 520px; }
	.equipment-card.is-muted { opacity: .3; }
	.equipment-card.is-selected { border-color: color-mix(in srgb, var(--color-primary) 75%, transparent); }
	header { display: flex; height: 58px; align-items: center; gap: 8px; border-radius: 4px 4px 0 0; border-bottom: 1px solid var(--color-border); background: #151e23; padding: 0 10px 0 6px; }
	.node-drag-handle { display: inline-flex; width: 24px; height: 38px; flex: none; touch-action: none; cursor: grab; align-items: center; justify-content: center; border-radius: 3px; color: var(--color-text-dim); }
	.node-drag-handle:hover { background: rgba(255,255,255,.05); color: var(--color-primary); }
	.node-drag-handle:active { cursor: grabbing; }
	.node-icon { display: inline-flex; width: 32px; height: 32px; flex: none; align-items: center; justify-content: center; border: 1px solid var(--color-border); border-radius: 4px; color: var(--color-primary); background: transparent; }
	.node-title { min-width: 0; flex: 1; }
	.node-title span { display: block; color: var(--color-text-dim); font: 8.5px var(--font-mono); text-transform: uppercase; }
	.node-title input { width: 100%; border: 0; outline: 0; background: transparent; color: inherit; font: 600 13px var(--font-sans); }
	.icon-button { display: inline-flex; width: 28px; height: 28px; align-items: center; justify-content: center; border: 0; background: transparent; color: var(--color-text-dim); }
	.icon-button:hover, .remove-point:hover { color: var(--color-danger); }
	.icon-button.is-active { background: color-mix(in srgb, var(--color-primary) 12%, transparent); color: var(--color-primary); }
	.bulk-linker { display: flex; min-height: 48px; align-items: center; gap: 10px; border-bottom: 1px solid var(--color-border); background: #0c1216; padding: 8px 10px; }
	.bulk-linker > span { flex: none; color: var(--color-text-dim); font: 9px var(--font-mono); text-transform: uppercase; }
	.bulk-linker > div { display: flex; min-width: 0; flex: 1; gap: 6px; overflow-x: auto; }
	.bulk-linker button { height: 30px; flex: none; border: 1px solid color-mix(in srgb, var(--color-primary) 45%, var(--color-border)); border-radius: 3px; padding: 0 9px; background: color-mix(in srgb, var(--color-primary) 8%, #0c1216); color: var(--color-primary); font: 9.5px var(--font-mono); }
	.bulk-linker button:hover { border-color: var(--color-primary); background: color-mix(in srgb, var(--color-primary) 14%, #0c1216); }
	.bulk-linker em { color: #f59e0b; font: normal 9.5px var(--font-mono); }
	.bus-row { display: grid; align-items: end; gap: 8px; grid-template-columns: 16px minmax(0, 1fr) 128px; border-bottom: 1px solid var(--color-border); background: #0d161b; padding: 8px 10px 9px; }
	.bus-row.is-orphan { background: color-mix(in srgb, var(--color-amber) 7%, #0d161b); }
	.bus-icon { display: inline-flex; padding-bottom: 6px; color: var(--color-primary); }
	.bus-row.is-orphan .bus-icon, .bus-row.has-issue .bus-icon { color: var(--color-amber); }
	.bus-field { min-width: 0; }
	.bus-field > span { display: block; color: var(--color-text-dim); font: 8px var(--font-mono); text-transform: uppercase; }
	.bus-field > span em { margin-left: 4px; color: var(--color-text-dim); font-style: normal; opacity: .65; }
	.bus-field select, .bus-field input { display: block; width: 100%; height: 28px; margin-top: 4px; border: 1px solid var(--color-border); border-radius: 3px; outline: 0; background: #090d10; padding: 0 7px; color: var(--color-foreground); font: 10px var(--font-sans); }
	.bus-field select:focus, .bus-field input:focus { border-color: color-mix(in srgb, var(--color-primary) 65%, transparent); }
	.bus-field input:disabled { opacity: .45; }
	.bus-address input { font-family: var(--font-mono); }
	.bus-issues { border-bottom: 1px solid var(--color-border); background: color-mix(in srgb, var(--color-amber) 10%, #0d161b); padding: 5px 10px 6px; color: var(--color-amber); font: 9px var(--font-mono); }
	.point-row { position: relative; display: flex; height: 42px; align-items: center; gap: 6px; border-bottom: 1px solid color-mix(in srgb, var(--color-border) 70%, transparent); padding: 0 8px 0 10px; }
	.point-row:hover { background: rgba(255,255,255,.03); }
	.point-main { display: flex; min-width: 0; flex: 1; align-items: center; gap: 8px; border: 0; background: transparent; color: inherit; text-align: left; }
	.point-kind { display: inline-flex; min-width: 40px; flex: none; justify-content: center; border: 1px solid; border-radius: 4px; padding: 2px 6px; font: 700 9.5px var(--font-mono); }
	.point-name { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 11.5px; }
	.point-signal { max-width: 92px; overflow: hidden; color: var(--color-text-dim); font: 9.5px var(--font-mono); text-overflow: ellipsis; white-space: nowrap; }
	.unassigned { width: 8px; height: 8px; flex: none; border-radius: 50%; background: #fbbf24; }
	.remove-point { display: inline-flex; width: 24px; height: 24px; flex: none; align-items: center; justify-content: center; border: 0; background: transparent; color: var(--color-text-dim); opacity: 0; }
	.point-row:hover .remove-point, .remove-point:focus-visible { opacity: 1; }
	.point-editor { display: grid; grid-template-columns: 72px minmax(145px, 1fr) 120px 90px auto; gap: 7px; align-items: end; border-bottom: 1px solid var(--color-border); background: #0c1216; padding: 9px 10px 11px; }
	.point-editor label { min-width: 0; color: var(--color-text-dim); font: 8px var(--font-mono); text-transform: uppercase; }
	.point-editor input, .point-editor select { display: block; width: 100%; height: 30px; margin-top: 4px; border: 1px solid var(--color-border); border-radius: 3px; outline: 0; background: #090d10; padding: 0 7px; color: var(--color-foreground); font: 10px var(--font-sans); text-transform: none; }
	.point-editor input:focus, .point-editor select:focus { border-color: color-mix(in srgb, var(--color-primary) 65%, transparent); }
	.point-editor select:disabled { color: var(--color-primary); opacity: .8; }
	.unlink-button { display: inline-flex; width: 30px; height: 30px; align-items: center; justify-content: center; border: 1px solid var(--color-border); border-radius: 3px; color: var(--color-text-dim); }
	.unlink-button:hover { border-color: #f59e0b; color: #f59e0b; }
	.add-point { display: flex; height: 40px; width: 100%; align-items: center; justify-content: center; gap: 6px; border: 0; border-radius: 0 0 4px 4px; background: #10171b; color: var(--color-text-dim); font: 10px var(--font-mono); }
	.add-point:hover { color: var(--color-primary); }
	:global(.point-handle) { right: -16px; display: inline-flex; width: 32px; height: 26px; align-items: center; justify-content: center; border: 1px solid color-mix(in srgb, var(--port-color) 70%, #10171b); border-radius: 4px; background: #10171b; color: var(--port-color); box-shadow: 0 2px 8px rgba(0,0,0,.35); transition: width .15s, background .15s, box-shadow .15s, transform .15s; }
	:global(.point-handle:hover), :global(.point-handle.connectingfrom) { width: 38px; background: color-mix(in srgb, var(--port-color) 16%, #10171b); box-shadow: 0 0 0 5px color-mix(in srgb, var(--port-color) 16%, transparent), 0 3px 10px rgba(0,0,0,.4); transform: translate(50%, -50%) scale(1.05); }
	:global(.point-handle svg) { pointer-events: none; }
	@media (max-width: 620px) { .point-editor { grid-template-columns: 70px 1fr; } .name-field { grid-column: span 1; } }
</style>
