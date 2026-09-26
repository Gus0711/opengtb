<script lang="ts">
	import { Handle, Position, useUpdateNodeInternals, type Node, type NodeProps } from '@xyflow/svelte';
	import Cable from '@lucide/svelte/icons/cable';
	import Cloud from '@lucide/svelte/icons/cloud';
	import Cpu from '@lucide/svelte/icons/cpu';
	import GripVertical from '@lucide/svelte/icons/grip-vertical';
	import MonitorCog from '@lucide/svelte/icons/monitor-cog';
	import RadioTower from '@lucide/svelte/icons/radio-tower';
	import Trash2 from '@lucide/svelte/icons/trash-2';
	import { SUPERVISOR_DEFINITIONS, UPLINK_COLOR } from './data';
	import type { SupervisorNodeData } from './flow';

	type SupervisorFlowNode = Node<SupervisorNodeData, 'supervisor'>;
	let { id, data, selected }: NodeProps<SupervisorFlowNode> = $props();
	const updateNodeInternals = useUpdateNodeInternals();

	$effect(() => {
		data.uplinks.length;
		queueMicrotask(() => updateNodeInternals(id));
	});
</script>

<div class="supervisor-card" data-supervisor-kind={data.item.kind} class:is-muted={!data.active} class:is-selected={selected} role="button" tabindex="0" aria-label={`Relier ${data.item.name}`} onclick={() => data.onConnectPending(data.item.id)} onkeydown={(event) => { if (event.key === 'Enter' || event.key === ' ') data.onConnectPending(data.item.id); }}>
	<Handle type="target" position={Position.Left} id="input" isConnectableStart={false} class="supervisor-drop-port" title="Remonter vers ce superviseur" aria-label="Remonter vers ce superviseur"><Cable size={15} /></Handle>
	<header class="custom-drag-handle">
		<span class="node-drag-handle" title="Déplacer le bloc" aria-label="Déplacer {data.item.name}"><GripVertical size={15} /></span>
		<button type="button" onclick={() => data.onFocus(data.item.id)} class="node-icon nodrag" aria-label="Isoler {data.item.name}">
			{#if data.item.kind === 'cloud'}<Cloud size={16} />{:else}<MonitorCog size={16} />{/if}
		</button>
		<div class="node-title nodrag">
			<span>{SUPERVISOR_DEFINITIONS[data.item.kind].label}</span>
			<input value={data.item.name} oninput={(event) => data.onRename(data.item.id, event.currentTarget.value)} aria-label="Nom du superviseur" />
		</div>
		<span class="count">{data.uplinks.length} lien{data.uplinks.length === 1 ? '' : 's'}</span>
		<button type="button" onclick={() => data.onRemove(data.item.id)} class="icon-button nodrag" aria-label="Supprimer {data.item.name}" title="Supprimer"><Trash2 size={15} /></button>
	</header>
	{#if data.uplinks.length === 0}
		<div class="empty">Aucune remontée — reliez un automate ou une gateway</div>
	{:else}
		{#each data.uplinks as uplink (uplink.id)}
			<div class="uplink-row nodrag">
				<Handle type="target" position={Position.Left} id={uplink.id} isConnectable={false} class="uplink-handle" style={`background:${UPLINK_COLOR};`} />
				<button type="button" onclick={() => data.onFocusTarget(uplink.id)} aria-label="Isoler {uplink.name}">
					{#if uplink.kind === 'controller'}<Cpu size={13} />{:else}<RadioTower size={13} />{/if}
					<strong>{uplink.name}</strong>
					<span>{uplink.uplink}</span>
				</button>
			</div>
		{/each}
	{/if}
</div>

<style>
	.supervisor-card { position: relative; width: 300px; overflow: visible; border: 1px solid color-mix(in srgb, var(--color-primary) 32%, var(--color-border)); border-radius: 4px; background: rgba(14, 23, 27, .97); color: var(--color-foreground); box-shadow: 0 12px 30px rgba(0,0,0,.34); transition: opacity .16s, border-color .16s, box-shadow .16s; }
	.supervisor-card.is-muted { opacity: .3; }
	.supervisor-card.is-selected { border-color: color-mix(in srgb, var(--color-primary) 75%, transparent); }
	header { position: relative; display: flex; height: 58px; align-items: center; gap: 8px; border-radius: 4px 4px 0 0; border-bottom: 1px solid var(--color-border); background: #142129; padding: 0 10px 0 6px; }
	.node-drag-handle { display: inline-flex; width: 24px; height: 38px; flex: none; touch-action: none; cursor: grab; align-items: center; justify-content: center; border-radius: 3px; color: var(--color-text-dim); }
	.node-drag-handle:hover { background: rgba(255,255,255,.05); color: var(--color-primary); }
	.node-drag-handle:active { cursor: grabbing; }
	.node-icon { display: inline-flex; width: 32px; height: 32px; flex: none; align-items: center; justify-content: center; border: 1px solid color-mix(in srgb, var(--color-primary) 45%, transparent); border-radius: 4px; background: color-mix(in srgb, var(--color-primary) 10%, transparent); color: var(--color-primary); }
	.node-title { min-width: 0; flex: 1; }
	.node-title span { display: block; color: var(--color-primary); font: 8.5px var(--font-mono); text-transform: uppercase; }
	.node-title input { width: 100%; border: 0; outline: 0; background: transparent; color: inherit; font: 600 13px var(--font-sans); }
	.count, .empty { color: var(--color-text-dim); font: 9.5px var(--font-mono); }
	.icon-button { display: inline-flex; width: 28px; height: 28px; align-items: center; justify-content: center; border: 0; background: transparent; color: var(--color-text-dim); }
	.icon-button:hover { color: var(--color-danger); }
	.empty { display: flex; height: 42px; align-items: center; padding: 0 14px; line-height: 1.35; }
	.uplink-row { position: relative; height: 34px; border-bottom: 1px solid color-mix(in srgb, var(--color-border) 70%, transparent); }
	.uplink-row button { display: flex; width: 100%; height: 100%; align-items: center; gap: 8px; border: 0; padding: 0 12px; background: transparent; color: var(--color-text-dim); text-align: left; }
	.uplink-row button:hover { background: rgba(255,255,255,.03); }
	.uplink-row strong { min-width: 0; flex: 1; overflow: hidden; color: var(--color-foreground); font-size: 10.5px; font-weight: 400; text-overflow: ellipsis; white-space: nowrap; }
	.uplink-row span { flex: none; color: var(--color-primary); font: 700 9px var(--font-mono); }
	:global(.supervisor-drop-port) { left: -17px; top: 50%; display: inline-flex; width: 34px; height: calc(100% - 16px); min-height: 44px; align-items: center; justify-content: center; border: 1px solid color-mix(in srgb, var(--color-primary) 55%, #142129); border-radius: 4px; background: #101a1f; color: var(--color-primary); opacity: .65; box-shadow: 0 3px 10px rgba(0,0,0,.35); transition: opacity .15s, width .15s, background .15s, box-shadow .15s; }
	:global(.supervisor-drop-port:hover), :global(.supervisor-drop-port.connectingto), :global(.supervisor-drop-port.valid) { width: 42px; opacity: 1; background: color-mix(in srgb, var(--color-primary) 18%, #101a1f); box-shadow: 0 0 0 6px color-mix(in srgb, var(--color-primary) 16%, transparent), 0 4px 12px rgba(0,0,0,.4); }
	:global(.supervisor-drop-port svg) { pointer-events: none; }
	:global(.uplink-handle) { left: -5px; width: 10px; height: 10px; border: 2px solid #101a1f; }
</style>
