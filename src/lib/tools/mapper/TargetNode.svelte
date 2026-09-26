<script lang="ts">
	import { Handle, Position, useUpdateNodeInternals, type Node, type NodeProps } from '@xyflow/svelte';
	import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
	import Cable from '@lucide/svelte/icons/cable';
	import Cpu from '@lucide/svelte/icons/cpu';
	import GripVertical from '@lucide/svelte/icons/grip-vertical';
	import RadioTower from '@lucide/svelte/icons/radio-tower';
	import Spline from '@lucide/svelte/icons/spline';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import { BAUD_RATES, MEDIA_LABELS, isSerial } from './bus';
	import { POINT_COLORS, TARGET_DEFINITIONS, UPLINK_COLOR } from './data';
	import type { AssignedPoint, TargetNodeData } from './flow';
	import { UPLINK_PROTOCOLS, type SegmentParity } from './types';

	type TargetFlowNode = Node<TargetNodeData, 'target'>;
	let { id, data, selected }: NodeProps<TargetFlowNode> = $props();
	const updateNodeInternals = useUpdateNodeInternals();

	const networkCount = $derived(
		data.segments.reduce((total, view) => total + view.points.length, 0) + data.orphanNetwork.length
	);

	// Un point qui change de groupe deplace son handle : il faut remesurer le noeud.
	$effect(() => {
		data.physical.length;
		networkCount;
		data.segments.length;
		data.item.supervisorId;
		queueMicrotask(() => updateNodeInternals(id));
	});
</script>

{#snippet pointRow(row: AssignedPoint, network: boolean)}
	<div class="assigned-row nodrag" class:is-network={network}>
		<Handle type="target" position={Position.Left} id={row.point.id} isConnectable={false} class="assigned-handle" style={`background:${POINT_COLORS[row.point.kind]};`} />
		<button type="button" onclick={() => data.onOpenPoint(row.point.id)}>
			<span style:color={POINT_COLORS[row.point.kind]}>{row.point.address || row.point.kind}</span>
			<strong>{row.point.name}</strong>
			{#if network}<em>{row.equipment.name}</em>{/if}
		</button>
	</div>
{/snippet}

<div class="target-card" data-target-kind={data.item.kind} class:is-muted={!data.active} class:is-selected={selected} role="button" tabindex="0" aria-label={`Relier ${data.item.name}`} onclick={() => data.onConnectPending(data.item.id)} onkeydown={(event) => { if (event.key === 'Enter' || event.key === ' ') data.onConnectPending(data.item.id); }}>
	<Handle type="target" position={Position.Left} id="input" isConnectableStart={false} class="target-drop-port" title="Relier cette cible" aria-label="Relier cette cible"><Cable size={15} /></Handle>
	<header class="custom-drag-handle">
		<span class="node-drag-handle" title="Déplacer le bloc" aria-label="Déplacer {data.item.name}"><GripVertical size={15} /></span>
		<button type="button" onclick={() => data.onFocus(data.item.id)} class="node-icon nodrag" aria-label="Isoler {data.item.name}">
			{#if data.item.kind === 'controller'}<Cpu size={16} />{:else}<RadioTower size={16} />{/if}
		</button>
		<div class="node-title nodrag">
			<span>{TARGET_DEFINITIONS[data.item.kind].label}</span>
			<input value={data.item.name} oninput={(event) => data.onRename(data.item.id, event.currentTarget.value)} aria-label="Nom de la cible" />
		</div>
		<span class="count" title="Entrées/sorties câblées · points réseau">{data.physical.length} E/S · {networkCount} réseau</span>
		<button type="button" onclick={() => data.onRemove(data.item.id)} class="icon-button nodrag" aria-label="Supprimer {data.item.name}" title="Supprimer"><Trash2 size={15} /></button>
	</header>

	{#if data.assigned.length === 0}
		<div class="empty">Déposez ici une liaison compatible</div>
	{:else if data.physical.length === 0}
		<div class="empty">Aucune E/S câblée</div>
	{:else}
		{#each data.physical as row (row.point.id)}
			{@render pointRow(row, false)}
		{/each}
	{/if}

	{#if data.segments.length || data.orphanNetwork.length}
		<section class="segments nodrag" aria-label="Bus de {data.item.name}">
			<h3>Bus</h3>
			{#each data.segments as view (view.segment.id)}
				<div class="segment-group">
					<div class="segment" class:is-overloaded={view.overloaded}>
						<span class="segment-icon"><Spline size={12} /></span>
						<input value={view.segment.name} oninput={(event) => data.onUpdateSegment(data.item.id, view.segment.id, { name: event.currentTarget.value })} aria-label="Nom du segment" />
						<span class="media">{MEDIA_LABELS[view.segment.media]}</span>
						<span class="devices" title="Équipements raccordés">
							{#if view.overloaded}<TriangleAlert size={11} />{/if}
							{view.devices}{#if view.maxDevices}/{view.maxDevices}{/if}
						</span>
						<button type="button" onclick={() => data.onRemoveSegment(data.item.id, view.segment.id)} class="icon-button" aria-label="Supprimer {view.segment.name}" title="Supprimer le segment"><Trash2 size={13} /></button>
						{#if isSerial(view.segment.media)}
							<div class="segment-params">
								<label>Vitesse<select value={view.segment.baud} onchange={(event) => data.onUpdateSegment(data.item.id, view.segment.id, { baud: Number(event.currentTarget.value) })}>{#each BAUD_RATES as baud (baud)}<option value={baud}>{baud}</option>{/each}</select></label>
								<label>Parité<select value={view.segment.parity} onchange={(event) => data.onUpdateSegment(data.item.id, view.segment.id, { parity: event.currentTarget.value as SegmentParity })}><option value="none">Aucune</option><option value="even">Paire</option><option value="odd">Impaire</option></select></label>
								<label>Stop<select value={view.segment.stopBits} onchange={(event) => data.onUpdateSegment(data.item.id, view.segment.id, { stopBits: Number(event.currentTarget.value) as 1 | 2 })}><option value={1}>1</option><option value={2}>2</option></select></label>
							</div>
						{/if}
					</div>
					{#if view.points.length}
						<div class="bus-points">
							{#each view.points as row (row.point.id)}
								{@render pointRow(row, true)}
							{/each}
						</div>
					{:else}
						<p class="segment-empty">Aucun point remonté sur ce bus</p>
					{/if}
				</div>
			{/each}

			{#if data.orphanNetwork.length}
				<div class="segment-group">
					<div class="segment is-orphan">
						<span class="segment-icon"><TriangleAlert size={12} /></span>
						<span class="orphan-label">Non rattaché à un bus</span>
					</div>
					<div class="bus-points">
						{#each data.orphanNetwork as row (row.point.id)}
							{@render pointRow(row, true)}
						{/each}
					</div>
				</div>
			{/if}
		</section>
	{/if}

	<footer class="uplink nodrag" class:is-orphan={!data.item.supervisorId}>
		<Handle type="source" position={Position.Right} id="uplink" class="uplink-out-port" title="Remonter vers un superviseur" aria-label="Remonter {data.item.name} vers un superviseur"><ArrowUpRight size={14} /></Handle>
		<span class="uplink-label" style:color={data.item.supervisorId ? UPLINK_COLOR : undefined}>Remontée</span>
		<select value={data.item.uplink} onchange={(event) => data.onSetUplink(data.item.id, event.currentTarget.value as typeof UPLINK_PROTOCOLS[number])} aria-label="Protocole de remontée de {data.item.name}">
			{#each UPLINK_PROTOCOLS as protocol (protocol)}<option value={protocol}>{protocol}</option>{/each}
		</select>
		<select value={data.item.supervisorId ?? ''} onchange={(event) => data.onAssignSupervisor(data.item.id, event.currentTarget.value)} aria-label="Superviseur de {data.item.name}">
			<option value="">Non remonté</option>
			{#each data.supervisors as supervisor (supervisor.id)}<option value={supervisor.id}>{supervisor.name}</option>{/each}
		</select>
		{#if !data.item.supervisorId}
			<button type="button" onclick={() => data.onSelectUplink(data.item.id)} class="uplink-connect" title="Choisir un superviseur sur le canvas">Relier</button>
		{/if}
	</footer>
</div>

<style>
	.target-card { position: relative; width: 330px; overflow: visible; border: 1px solid var(--color-border); border-radius: 4px; background: rgba(17, 25, 30, .97); color: var(--color-foreground); box-shadow: 0 12px 30px rgba(0,0,0,.3); transition: opacity .16s, border-color .16s, box-shadow .16s; }
	.target-card.is-muted { opacity: .3; }
	.target-card.is-selected { border-color: color-mix(in srgb, var(--color-primary) 75%, transparent); }
	header { position: relative; display: flex; height: 58px; align-items: center; gap: 8px; border-radius: 4px 4px 0 0; border-bottom: 1px solid var(--color-border); background: #172229; padding: 0 10px 0 6px; }
	.node-drag-handle { display: inline-flex; width: 24px; height: 38px; flex: none; touch-action: none; cursor: grab; align-items: center; justify-content: center; border-radius: 3px; color: var(--color-text-dim); }
	.node-drag-handle:hover { background: rgba(255,255,255,.05); color: var(--color-primary); }
	.node-drag-handle:active { cursor: grabbing; }
	.node-icon { display: inline-flex; width: 32px; height: 32px; flex: none; align-items: center; justify-content: center; border: 1px solid color-mix(in srgb, var(--color-primary) 40%, transparent); border-radius: 4px; background: transparent; color: var(--color-primary); }
	.node-title { min-width: 0; flex: 1; }
	.node-title span { display: block; color: var(--color-primary); font: 8.5px var(--font-mono); text-transform: uppercase; }
	.node-title input { width: 100%; border: 0; outline: 0; background: transparent; color: inherit; font: 600 13px var(--font-sans); }
	.count, .empty { color: var(--color-text-dim); font: 9.5px var(--font-mono); }
	.count { flex: none; white-space: nowrap; }
	.icon-button { display: inline-flex; width: 28px; height: 28px; align-items: center; justify-content: center; border: 0; background: transparent; color: var(--color-text-dim); }
	.icon-button:hover { color: var(--color-danger); }
	.empty { display: flex; height: 42px; align-items: center; padding: 0 14px; }
	.assigned-row { position: relative; height: 34px; border-bottom: 1px solid color-mix(in srgb, var(--color-border) 70%, transparent); }
	.assigned-row button { display: flex; width: 100%; height: 100%; align-items: center; gap: 8px; border: 0; padding: 0 12px; background: transparent; color: inherit; text-align: left; }
	.assigned-row button:hover { background: rgba(255,255,255,.03); }
	.assigned-row span { min-width: 46px; flex: none; font: 700 9.5px var(--font-mono); }
	.assigned-row strong { min-width: 0; overflow: hidden; font-size: 10.5px; font-weight: 400; text-overflow: ellipsis; white-space: nowrap; }
	.assigned-row em { max-width: 84px; flex: none; margin-left: auto; overflow: hidden; color: var(--color-text-dim); font: normal 9px var(--font-mono); text-overflow: ellipsis; white-space: nowrap; }
	.assigned-row.is-network { height: 28px; border-bottom: 0; }
	.assigned-row.is-network button { padding: 0 6px 0 4px; }

	.segments { border-top: 1px solid var(--color-border); background: #101a20; padding: 8px 10px 9px; }
	.segments h3 { margin-bottom: 6px; color: var(--color-text-dim); font: 700 8.5px var(--font-mono); letter-spacing: .08em; text-transform: uppercase; }
	.segment-group + .segment-group { margin-top: 8px; border-top: 1px solid color-mix(in srgb, var(--color-border) 55%, transparent); padding-top: 8px; }
	.segment { display: grid; align-items: center; gap: 5px; grid-template-columns: 14px minmax(0, 1fr) auto auto 22px; }
	.segment-icon { display: inline-flex; color: var(--color-primary); }
	.segment > input { min-width: 0; border: 0; outline: 0; background: transparent; color: var(--color-foreground); font: 10.5px var(--font-sans); }
	.segment > input:focus { border-bottom: 1px solid color-mix(in srgb, var(--color-primary) 60%, transparent); }
	.media { flex: none; border: 1px solid color-mix(in srgb, var(--color-primary) 35%, transparent); border-radius: 3px; padding: 1px 5px; color: var(--color-primary); font: 700 8px var(--font-mono); }
	.devices { display: inline-flex; align-items: center; gap: 3px; color: var(--color-text-dim); font: 9px var(--font-mono); }
	.segment.is-overloaded .devices { color: var(--color-amber); }
	.segment.is-orphan { grid-template-columns: 14px 1fr; }
	.segment.is-orphan .segment-icon { color: var(--color-amber); }
	.orphan-label { color: var(--color-amber); font: 10px var(--font-mono); }
	.segment-params { display: grid; gap: 5px; grid-column: 2 / -1; grid-template-columns: 1fr 1fr 44px; margin-top: 5px; }
	.segment-params label { color: var(--color-text-dim); font: 7.5px var(--font-mono); text-transform: uppercase; }
	.segment-params select { display: block; width: 100%; height: 22px; margin-top: 2px; border: 1px solid var(--color-border); border-radius: 3px; outline: 0; background: #0b1216; color: var(--color-text-soft); font: 9px var(--font-mono); }
	.segment-params select:focus { border-color: color-mix(in srgb, var(--color-primary) 60%, transparent); }
	.bus-points { margin: 5px 0 0 14px; border-left: 1px solid color-mix(in srgb, var(--color-primary) 30%, transparent); padding-left: 4px; }
	.segment-empty { margin: 4px 0 0 18px; color: var(--color-text-dim); font: 9px var(--font-mono); opacity: .7; }

	.uplink { position: relative; display: flex; align-items: center; gap: 6px; border-top: 1px solid var(--color-border); border-radius: 0 0 4px 4px; background: #131c22; padding: 7px 10px; }
	.uplink-label { flex: none; color: var(--color-text-dim); font: 700 8.5px var(--font-mono); text-transform: uppercase; }
	.uplink select { min-width: 0; flex: 1; height: 24px; border: 1px solid var(--color-border); border-radius: 3px; background: #0e161a; color: var(--color-text-soft); font: 9.5px var(--font-mono); }
	.uplink select:hover { border-color: color-mix(in srgb, var(--color-primary) 45%, transparent); }
	.uplink.is-orphan { background: color-mix(in srgb, var(--color-amber) 8%, #131c22); }
	.uplink.is-orphan .uplink-label { color: var(--color-amber); }
	.uplink-connect { flex: none; border: 1px solid color-mix(in srgb, var(--color-primary) 45%, transparent); border-radius: 3px; padding: 3px 7px; color: var(--color-primary); font: 9px var(--font-mono); }
	.uplink-connect:hover { background: color-mix(in srgb, var(--color-primary) 14%, transparent); }

	:global(.target-drop-port) { left: -17px; top: 50%; display: inline-flex; width: 34px; height: calc(100% - 16px); min-height: 44px; align-items: center; justify-content: center; border: 1px solid color-mix(in srgb, var(--color-primary) 55%, #172229); border-radius: 4px; background: #11191e; color: var(--color-primary); opacity: .65; box-shadow: 0 3px 10px rgba(0,0,0,.35); transition: opacity .15s, width .15s, background .15s, box-shadow .15s; }
	:global(.target-drop-port:hover), :global(.target-drop-port.connectingto), :global(.target-drop-port.valid) { width: 42px; opacity: 1; background: color-mix(in srgb, var(--color-primary) 18%, #11191e); box-shadow: 0 0 0 6px color-mix(in srgb, var(--color-primary) 16%, transparent), 0 4px 12px rgba(0,0,0,.4); }
	:global(.target-drop-port svg) { pointer-events: none; }
	:global(.assigned-handle) { left: -5px; width: 10px; height: 10px; border: 2px solid #11191e; }
	.assigned-row.is-network :global(.assigned-handle) { left: -24px; width: 8px; height: 8px; }
	:global(.uplink-out-port) { right: -16px; top: auto; bottom: 14px; display: inline-flex; width: 32px; height: 26px; align-items: center; justify-content: center; border: 1px solid color-mix(in srgb, var(--color-primary) 55%, #131c22); border-radius: 4px; background: #101a1f; color: var(--color-primary); opacity: .7; transition: opacity .15s, box-shadow .15s; }
	:global(.uplink-out-port:hover), :global(.uplink-out-port.connecting) { opacity: 1; box-shadow: 0 0 0 5px color-mix(in srgb, var(--color-primary) 16%, transparent); }
	:global(.uplink-out-port svg) { pointer-events: none; }
</style>
