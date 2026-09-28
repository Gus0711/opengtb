<script lang="ts">
	import {
		Background,
		BackgroundVariant,
		ConnectionLineType,
		Controls,
		MiniMap,
		SvelteFlow,
		type Connection,
		type Edge,
		type OnConnectStartParams,
		type Viewport
	} from '@xyflow/svelte';
	import '@xyflow/svelte/dist/style.css';
	import EquipmentNode from './EquipmentNode.svelte';
	import SupervisorNode from './SupervisorNode.svelte';
	import TargetNode from './TargetNode.svelte';
	import { UPLINK_COLOR } from './data';
	import type { MapperFlowNode } from './flow';
	import { LINK_COLOR } from './links';

	interface Props {
		nodes: MapperFlowNode[];
		edges: Edge[];
		onConnect: (connection: Connection) => void;
		onValidateConnection: (connection: Connection | Edge) => boolean;
		onConnectionStart: (params: OnConnectStartParams) => void;
		onConnectionEnd: () => void;
		onClearFocus: () => void;
		connectionColor: string;
		connectionKind: string | null;
		connectionUplink: boolean;
		connectionPeer: boolean;
		onDragStart: () => void;
		onDragStop: (nodes: MapperFlowNode[]) => void;
		onDeleteNodes: (ids: string[]) => void;
		onViewportChange: (viewport: Viewport) => void;
		initialViewport: Viewport;
		fitInitial: boolean;
	}

	let {
		nodes = $bindable(),
		edges,
		onConnect,
		onValidateConnection,
		onConnectionStart,
		onConnectionEnd,
		onClearFocus,
		connectionColor,
		connectionKind,
		connectionUplink,
		connectionPeer,
		onDragStart,
		onDragStop,
		onDeleteNodes,
		onViewportChange,
		initialViewport,
		fitInitial
	}: Props = $props();

	const nodeTypes = { equipment: EquipmentNode, target: TargetNode, supervisor: SupervisorNode };
</script>

<div class="flow-shell" data-connection-kind={connectionKind ?? undefined} data-connection-uplink={connectionUplink ? '' : undefined} data-connection-peer={connectionPeer ? '' : undefined}>
	<SvelteFlow
		bind:nodes
		{edges}
		{nodeTypes}
		fitView={fitInitial}
		fitViewOptions={{ padding: 0.18, maxZoom: 1 }}
		{initialViewport}
		minZoom={0.2}
		maxZoom={1.8}
		snapGrid={[16, 16]}
		panOnDrag
		zoomOnScroll
		zoomOnPinch
		selectionOnDrag={false}
		selectionKey="Shift"
		multiSelectionKey="Control"
		deleteKey={['Backspace', 'Delete']}
		nodeDragThreshold={3}
		connectionDragThreshold={3}
		connectionRadius={64}
		connectionLineType={ConnectionLineType.SmoothStep}
		connectionLineStyle={`stroke:${connectionColor};stroke-width:3;stroke-dasharray:7 5;filter:drop-shadow(0 0 4px ${connectionColor}66);`}
		onconnect={onConnect}
		onconnectstart={(_, params) => onConnectionStart(params)}
		onconnectend={onConnectionEnd}
		isValidConnection={onValidateConnection}
		onnodedragstart={onDragStart}
		onnodedragstop={({ nodes: draggedNodes }) => onDragStop(draggedNodes as MapperFlowNode[])}
		ondelete={({ nodes: deletedNodes }) => onDeleteNodes(deletedNodes.map((node) => node.id))}
		onmoveend={(_, viewport) => onViewportChange(viewport)}
		onpaneclick={() => { nodes = nodes.map((node) => ({ ...node, selected: false })); onConnectionEnd(); onClearFocus(); }}
		colorMode="dark"
		ariaLabelConfig={{
			'controls.zoomIn.ariaLabel': 'Zoom avant',
			'controls.zoomOut.ariaLabel': 'Zoom arrière',
			'controls.fitView.ariaLabel': 'Ajuster à la vue',
			'controls.interactive.ariaLabel': 'Verrouiller le canvas',
			'minimap.ariaLabel': 'Mini-carte de l’architecture'
		}}
	>
		<Background variant={BackgroundVariant.Dots} gap={16} size={1} patternColor="#26343c" />
		<MiniMap pannable zoomable nodeColor={(node) => node.type === 'supervisor' ? '#5eead4' : node.type === 'target' ? '#2dd4bf' : '#64748b'} maskColor="rgba(4, 8, 11, .72)" />
		<Controls position="bottom-left" />
	</SvelteFlow>
	<ul class="legend" aria-label="Légende des liaisons">
		<li><svg width="26" height="8" aria-hidden="true"><line x1="0" y1="4" x2="26" y2="4" stroke={UPLINK_COLOR} stroke-width="2.5" /></svg>Supervision</li>
		<li><svg width="26" height="8" aria-hidden="true"><line x1="0" y1="4" x2="20" y2="4" stroke={LINK_COLOR} stroke-width="2.5" /><path d="M19 0L26 4L19 8z" fill={LINK_COLOR} /></svg>Intégration</li>
		<li><svg width="26" height="8" aria-hidden="true"><line x1="0" y1="4" x2="26" y2="4" stroke={LINK_COLOR} stroke-width="2.5" stroke-dasharray="5 3" /></svg>Échange</li>
		<li><svg width="26" height="8" aria-hidden="true"><line x1="0" y1="4" x2="26" y2="4" stroke="#64748b" stroke-width="2" /></svg>Points</li>
	</ul>
</div>

<style>
	.flow-shell { position: relative; width: 100%; height: 100%; background: #090d10; }
	.legend { position: absolute; top: 10px; left: 10px; z-index: 5; display: flex; flex-wrap: wrap; gap: 4px 12px; border: 1px solid #28343b; border-radius: 4px; background: rgba(14, 21, 25, .88); padding: 6px 10px; color: #94a3b8; font: 9px var(--font-mono); pointer-events: none; }
	.legend li { display: flex; align-items: center; gap: 6px; }
	:global(.svelte-flow) { --xy-background-color: #090d10; --xy-edge-stroke: #64748b; --xy-edge-stroke-selected: #2dd4bf; --xy-selection-background-color: rgba(45, 212, 191, .08); --xy-selection-border: 1px solid rgba(45, 212, 191, .6); }
	:global(.svelte-flow__node) { border: 0; background: transparent; }
	:global(.svelte-flow__edge-path) { stroke-width: 2; }
	:global(.svelte-flow__edge.selected .svelte-flow__edge-path) { stroke-width: 3; }
	:global(.svelte-flow__connection-path) { stroke-linecap: round; }
	:global(.flow-shell[data-connection-kind] .target-card) { opacity: .22; }
	:global(.flow-shell[data-connection-kind="LORA"] .target-card[data-target-kind="lora-gateway"]),
	:global(.flow-shell[data-connection-kind="AI"] .target-card[data-target-kind="controller"]),
	:global(.flow-shell[data-connection-kind="AO"] .target-card[data-target-kind="controller"]),
	:global(.flow-shell[data-connection-kind="DI"] .target-card[data-target-kind="controller"]),
	:global(.flow-shell[data-connection-kind="DO"] .target-card[data-target-kind="controller"]),
	:global(.flow-shell[data-connection-kind="MODBUS"] .target-card[data-target-kind="controller"]),
	:global(.flow-shell[data-connection-kind="BACNET"] .target-card[data-target-kind="controller"]),
	:global(.flow-shell[data-connection-kind="MBUS"] .target-card[data-target-kind="controller"]) { opacity: 1; border-color: color-mix(in srgb, var(--color-primary) 85%, white); box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 24%, transparent), 0 16px 34px rgba(0,0,0,.4); }
	:global(.flow-shell[data-connection-uplink] .supervisor-card) { border-color: color-mix(in srgb, var(--color-primary) 85%, white); box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 24%, transparent), 0 16px 34px rgba(0,0,0,.4); }
	:global(.flow-shell[data-connection-kind] .supervisor-card) { opacity: .22; }
	:global(.flow-shell[data-connection-peer] .supervisor-card) { opacity: .22; }
	:global(.flow-shell[data-connection-peer] .target-card) { border-color: color-mix(in srgb, #c084fc 85%, white); box-shadow: 0 0 0 2px color-mix(in srgb, #c084fc 24%, transparent), 0 16px 34px rgba(0,0,0,.4); }
	:global(.svelte-flow__minimap) { right: 12px; bottom: 12px; overflow: hidden; border: 1px solid #28343b; border-radius: 4px; background: #0e1519; }
	:global(.svelte-flow__controls) { overflow: hidden; border: 1px solid #28343b; border-radius: 4px; box-shadow: none; }
	:global(.svelte-flow__controls-button) { border-bottom-color: #28343b; background: #10181d; fill: #cbd5e1; }
	:global(.svelte-flow__controls-button:hover) { background: #18242a; }
	:global(.svelte-flow__attribution) { background: rgba(9, 13, 16, .75); color: #64748b; font-size: 8px; }
</style>
