<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import ToolShell from '$lib/components/tools/ToolShell.svelte';
	import { getTool } from '$lib/tools/registry';
	import MapperCanvas from '$lib/tools/mapper/MapperCanvas.svelte';
	import { DEFAULT_MAPPER, EQUIPMENT_DEFINITIONS, EQUIPMENT_FAMILIES, POINT_COLORS, SIGNAL_PRESETS, SUPERVISOR_DEFINITIONS, SUPERVISOR_PALETTE, TARGET_DEFINITIONS, TARGET_PALETTE, UPLINK_COLOR, createEquipment, createSupervisor, createTarget, defaultSignal, ensureSegment, equipmentBus, equipmentProtocol, migrateBusAttachments, nextFreeAddress, normalizeEquipment, normalizeTarget, targetAccepts, uniqueName } from '$lib/tools/mapper/data';
	import { defaultNodePosition, edgeColor, freeNodePosition, type MapperFlowNode } from '$lib/tools/mapper/flow';
	import { addressProfile, isBusKind, nextFreeDeviceAddress, segmentProfile } from '$lib/tools/mapper/bus';
	import type { EquipmentBusView, SegmentView } from '$lib/tools/mapper/flow';
	import { mapperToCsv, renderMapperSvg } from '$lib/tools/mapper/render';
	import { POINT_KINDS, type Equipment, type EquipmentKind, type GtbPoint, type MapperDocument, type MapperPosition, type MapperViewport, type PointKind, type Segment, type SegmentMedia, type SegmentParity, type Supervisor, type SupervisorKind, type Target, type TargetKind, type UplinkProtocol } from '$lib/tools/mapper/types';
	import { validateMapper } from '$lib/tools/mapper/validation';
	import { duplicateEquipment, duplicateTarget } from '$lib/tools/mapper/duplicate';
	import type { Connection, Edge, OnConnectStartParams } from '@xyflow/svelte';
	import AirVent from '@lucide/svelte/icons/air-vent';
	import Box from '@lucide/svelte/icons/box';
	import Cable from '@lucide/svelte/icons/cable';
	import Cloud from '@lucide/svelte/icons/cloud';
	import CheckCircle2 from '@lucide/svelte/icons/circle-check-big';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import CircleGauge from '@lucide/svelte/icons/circle-gauge';
	import Cpu from '@lucide/svelte/icons/cpu';
	import Download from '@lucide/svelte/icons/download';
	import Expand from '@lucide/svelte/icons/expand';
	import Fan from '@lucide/svelte/icons/fan';
	import Flame from '@lucide/svelte/icons/flame';
	import Gauge from '@lucide/svelte/icons/gauge';
	import Heater from '@lucide/svelte/icons/heater';
	import MonitorCog from '@lucide/svelte/icons/monitor-cog';
	import Import from '@lucide/svelte/icons/import';
	import Network from '@lucide/svelte/icons/network';
	import Plus from '@lucide/svelte/icons/plus';
	import Radio from '@lucide/svelte/icons/radio';
	import RadioTower from '@lucide/svelte/icons/radio-tower';
	import Redo2 from '@lucide/svelte/icons/redo-2';
	import RotateCcw from '@lucide/svelte/icons/rotate-ccw';
	import Save from '@lucide/svelte/icons/save';
	import Search from '@lucide/svelte/icons/search';
	import ShowerHead from '@lucide/svelte/icons/shower-head';
	import Shrink from '@lucide/svelte/icons/shrink';
	import Snowflake from '@lucide/svelte/icons/snowflake';
	import SunSnow from '@lucide/svelte/icons/sun-snow';
	import Table2 from '@lucide/svelte/icons/table-2';
	import Thermometer from '@lucide/svelte/icons/thermometer';
	import ThermometerSun from '@lucide/svelte/icons/thermometer-sun';
	import Wind from '@lucide/svelte/icons/wind';
	import Undo2 from '@lucide/svelte/icons/undo-2';

	const tool = getTool('mapper')!;
	const STORAGE_KEY = 'opengtb.mapper.project.v1';
	const HISTORY_LIMIT = 60;
	const SUPERVISOR_ICONS: Record<SupervisorKind, typeof Cpu> = { scada: MonitorCog, cloud: Cloud };
	const TARGET_ICONS: Record<TargetKind, typeof Cpu> = { controller: Cpu, 'lora-gateway': RadioTower };
	const EQUIPMENT_ICONS: Record<EquipmentKind, typeof Cpu> = {
		boiler: Flame, pump: CircleGauge, 'temperature-sensor': Thermometer, custom: Box,
		'heating-circuit': Heater, ahu: AirVent, 'heat-pump': SunSnow, chiller: Snowflake,
		'fan-coil': Fan, dhw: ShowerHead, 'extract-fan': Wind, 'outdoor-sensor': ThermometerSun,
		'energy-meter': Gauge, 'modbus-rtu-device': Cable, 'modbus-tcp-device': Network,
		'bacnet-mstp-device': Cable, 'bacnet-ip-device': Network,
		'mbus-device': Gauge, 'lora-sensor': Radio
	};
	type FocusState = { type: 'equipment' | 'target' | 'point' | 'supervisor'; id: string } | null;
	type StatusFilter = 'all' | 'assigned' | 'unassigned' | 'issues';
	type SortKey = 'equipment' | 'point' | 'kind' | 'target' | 'address';

	let view = $state<'architecture' | 'points'>('architecture');
	let title = $state(DEFAULT_MAPPER.title);
	let supervisors = $state<Supervisor[]>(cloneSupervisors(DEFAULT_MAPPER.supervisors));
	let targets = $state<Target[]>(cloneTargets(DEFAULT_MAPPER.targets));
	let equipment = $state<Equipment[]>(cloneEquipment(DEFAULT_MAPPER.equipment));
	let positions = $state<Record<string, MapperPosition>>({});
	let viewport = $state<MapperViewport>({ x: 32, y: 32, zoom: 0.75 });
	let nodes = $state.raw<MapperFlowNode[]>([]);
	let canvasReady = $state(false);
	let fitInitial = $state(true);
	let canvasKey = $state(0);
	let focus = $state<FocusState>(null);
	let inspectorPointId = $state<string | null>(null);
	let connectingPointId = $state<string | null>(null);
	let connectingTargetId = $state<string | null>(null);
	let expanded = $state(false);
	let paletteOpen = $state(false);
	let search = $state('');
	let kindFilter = $state<'all' | PointKind>('all');
	let statusFilter = $state<StatusFilter>('all');
	let sortKey = $state<SortKey>('equipment');
	let notification = $state('');
	let importInput: HTMLInputElement;
	let nextId = 100;
	let undoStack = $state.raw<string[]>([]);
	let redoStack = $state.raw<string[]>([]);
	let dragSnapshot = '';
	let connectionEndTimer: ReturnType<typeof setTimeout> | null = null;
	let connectionStartedFrom: OnConnectStartParams['handleType'] = null;

	const mapperDocument = $derived<MapperDocument>({ version: 1, title: title.trim() || 'Architecture GTB', supervisors, targets, equipment, layout: { positions, viewport } });
	const exportSvg = $derived(renderMapperSvg(mapperDocument));
	const allPoints = $derived(equipment.flatMap((item) => item.points.map((point) => ({ equipment: item, point }))));
	const pointCount = $derived(allPoints.length);
	const assignedCount = $derived(allPoints.filter(({ point }) => point.targetId).length);
	const unassignedCount = $derived(pointCount - assignedCount);
	const completionPercent = $derived(pointCount ? Math.round((assignedCount / pointCount) * 100) : 0);
	const physicalCount = $derived(allPoints.filter(({ point }) => !isBusKind(point.kind)).length);
	const networkCount = $derived(pointCount - physicalCount);
	const issues = $derived(validateMapper(mapperDocument));
	const issueMap = $derived.by(() => {
		const map = new Map<string, string[]>();
		for (const issue of issues) if (issue.scope === 'point') map.set(issue.id, [...(map.get(issue.id) ?? []), issue.message]);
		return map;
	});
	const scopedIssues = $derived.by(() => {
		const map = new Map<string, string[]>();
		for (const issue of issues) if (issue.scope === 'equipment' || issue.scope === 'segment') map.set(issue.id, [...(map.get(issue.id) ?? []), issue.message]);
		return map;
	});
	const allSegments = $derived(targets.flatMap((target) => target.segments.map((segment) => ({ segment, target }))));
	const connectingPoint = $derived(connectingPointId ? allPoints.find(({ point }) => point.id === connectingPointId)?.point ?? null : null);
	const connectionColor = $derived(connectingPoint ? edgeColor(connectingPoint.kind) : '#2dd4bf');
	const pointEdges = $derived<Edge[]>(allPoints.filter(({ point }) => point.targetId).map(({ equipment: item, point }) => {
		const active = isConnectionActive(item.id, point);
		return { id: `edge-${point.id}`, source: item.id, target: point.targetId!, sourceHandle: point.id, targetHandle: point.id,
			 type: ['MODBUS', 'BACNET', 'MBUS', 'LORA'].includes(point.kind) ? 'smoothstep' : 'default', animated: ['MODBUS', 'BACNET', 'MBUS', 'LORA'].includes(point.kind), selectable: false,
			style: `stroke:${edgeColor(point.kind)};stroke-width:${active ? 2.5 : 1.25};opacity:${active ? .9 : .12}` };
	}));
	const uplinkEdges = $derived<Edge[]>(targets.filter((target) => target.supervisorId && supervisors.some((item) => item.id === target.supervisorId)).map((target) => {
		const active = isUplinkActive(target);
		return { id: `uplink-${target.id}`, source: target.id, target: target.supervisorId!, sourceHandle: 'uplink', targetHandle: target.id,
			type: 'smoothstep', animated: true, selectable: false, label: target.uplink, labelShowBg: false, labelStyle: `fill:${UPLINK_COLOR};font-family:var(--font-mono);font-size:9px;opacity:${active ? 1 : .15}`,
			style: `stroke:${UPLINK_COLOR};stroke-width:${active ? 3 : 1.5};opacity:${active ? .95 : .12}` };
	}));
	const edges = $derived<Edge[]>([...pointEdges, ...uplinkEdges]);
	const filteredPoints = $derived.by(() => {
		const needle = search.trim().toLocaleLowerCase('fr');
		return allPoints.filter(({ equipment: item, point }) => {
			const matchesSearch = !needle || `${item.name} ${point.name} ${point.signal} ${point.address} ${targetName(point.targetId)}`.toLocaleLowerCase('fr').includes(needle);
			const matchesKind = kindFilter === 'all' || point.kind === kindFilter;
			const matchesStatus = statusFilter === 'all' || (statusFilter === 'assigned' && Boolean(point.targetId)) || (statusFilter === 'unassigned' && !point.targetId) || (statusFilter === 'issues' && issueMap.has(point.id));
			return matchesSearch && matchesKind && matchesStatus;
		}).toSorted((a, b) => {
			const values: Record<SortKey, [string, string]> = { equipment: [a.equipment.name, b.equipment.name], point: [a.point.name, b.point.name], kind: [a.point.kind, b.point.kind], target: [targetName(a.point.targetId), targetName(b.point.targetId)], address: [a.point.address, b.point.address] };
			return values[sortKey][0].localeCompare(values[sortKey][1], 'fr', { numeric: true });
		});
	});

	function cloneTargets(items: Target[]) { return items.map((item) => normalizeTarget({ ...item })); }
	function cloneSupervisors(items: Supervisor[]) { return items.map((item) => ({ ...item })); }
	function cloneEquipment(items: Equipment[]) { return items.map((item) => normalizeEquipment({ ...item, points: item.points.map((point) => ({ ...point })) })); }
	function harvestPositions() { if (nodes.length) positions = Object.fromEntries(nodes.map((node) => [node.id, { ...node.position }])); }
	function projectSnapshot(): string { harvestPositions(); return JSON.stringify({ version: 1, title, supervisors, targets, equipment, layout: { positions, viewport } } satisfies MapperDocument); }
	function persist() { if (browser) localStorage.setItem(STORAGE_KEY, projectSnapshot()); }
	function flash(message: string) { notification = message; setTimeout(() => { if (notification === message) notification = ''; }, 2200); }

	function applyProject(project: MapperDocument) {
		title = typeof project.title === 'string' ? project.title : 'Architecture GTB';
		// Les projets antérieurs au modèle de bus ont des points réseau sans segment :
		// on les reclasse sous le bus correspondant avant d'alimenter l'état.
		const migrated = migrateBusAttachments({
			title: '',
			supervisors: Array.isArray(project.supervisors) ? project.supervisors : [],
			targets: cloneTargets(Array.isArray(project.targets) ? project.targets : []),
			equipment: cloneEquipment(Array.isArray(project.equipment) ? project.equipment : [])
		});
		supervisors = cloneSupervisors(migrated.supervisors);
		targets = migrated.targets;
		equipment = migrated.equipment;
		positions = { ...(project.layout?.positions ?? {}) };
		viewport = { ...(project.layout?.viewport ?? { x: 32, y: 32, zoom: 0.75 }) };
		fitInitial = !project.layout?.viewport;
		canvasKey += 1;
		focus = null; inspectorPointId = null;
		nextId = Math.max(100, equipment.length + targets.length + supervisors.length + Date.now() % 10000);
		syncNodes();
	}
	function commit(action: () => void) {
		const before = projectSnapshot(); action();
		undoStack = [...undoStack.slice(-(HISTORY_LIMIT - 1)), before]; redoStack = [];
		syncNodes(); persist();
	}
	function undo() {
		const previous = undoStack.at(-1); if (!previous) return;
		redoStack = [...redoStack, projectSnapshot()]; undoStack = undoStack.slice(0, -1);
		applyProject(JSON.parse(previous)); persist(); flash('Modification annulée');
	}
	function redo() {
		const next = redoStack.at(-1); if (!next) return;
		undoStack = [...undoStack, projectSnapshot()]; redoStack = redoStack.slice(0, -1);
		applyProject(JSON.parse(next)); persist(); flash('Modification rétablie');
	}

	function syncNodes() {
		const current = new Map(nodes.map((node) => [node.id, node]));
		const equipmentNodes: MapperFlowNode[] = equipment.map((item, index) => ({ id: item.id, type: 'equipment', position: positions[item.id] ?? current.get(item.id)?.position ?? defaultNodePosition('equipment', index), dragHandle: '.node-drag-handle', selected: current.get(item.id)?.selected ?? false,
			data: { kind: 'equipment', item, active: isEquipmentActive(item), bulkTargets: targets.filter((target) => item.points.length > 0 && item.points.every((point) => targetAccepts(target.kind, point.kind))), selectedPointId: inspectorPointId, onFocus: focusEquipment, onRename: updateEquipment, onRemove: removeEquipment, onDuplicate: duplicateEquipmentNode, onOpenPoint: openPoint, onClosePoint: closePoint, onRemovePoint: removePoint, onAddPoint: addPoint, onChangePointKind: changePointKind, onUpdatePoint: updatePoint, onUnassignPoint: unassignPoint, onSelectConnection: selectPointConnection, onAssignAll: assignAllPoints, bus: equipmentBusView(item), onAttachSegment: attachSegment, onSetDeviceAddress: setDeviceAddress } }));
		const targetNodes: MapperFlowNode[] = targets.map((item, index) => ({ id: item.id, type: 'target', position: positions[item.id] ?? current.get(item.id)?.position ?? defaultNodePosition('target', index), dragHandle: '.node-drag-handle', selected: current.get(item.id)?.selected ?? false,
			data: { kind: 'target', item, ...targetPointGroups(item), supervisors, supervisor: supervisors.find((entry) => entry.id === item.supervisorId) ?? null, active: isTargetActive(item), onFocus: focusTarget, onRename: updateTarget, onRemove: removeTarget, onDuplicate: duplicateTargetNode, onOpenPoint: openPoint, onConnectPending: connectPendingPoint, onAssignSupervisor: assignSupervisor, onSetUplink: setUplink, onSelectUplink: selectUplinkConnection, onUpdateSegment: updateSegment, onRemoveSegment: removeSegment } }));
		const supervisorNodes: MapperFlowNode[] = supervisors.map((item, index) => ({ id: item.id, type: 'supervisor', position: positions[item.id] ?? current.get(item.id)?.position ?? defaultNodePosition('supervisor', index), dragHandle: '.node-drag-handle', selected: current.get(item.id)?.selected ?? false,
			data: { kind: 'supervisor', item, uplinks: targets.filter((target) => target.supervisorId === item.id), active: isSupervisorActive(item), onFocus: focusSupervisor, onFocusTarget: focusTarget, onRename: updateSupervisor, onRemove: removeSupervisor, onConnectPending: connectPendingUplink } }));
		nodes = [...equipmentNodes, ...targetNodes, ...supervisorNodes];
	}
	/** Chaque point affecté doit avoir exactement un handle : E/S câblée, bus, ou groupe orphelin. */
	function targetPointGroups(item: Target) {
		const assigned = allPoints.filter(({ point }) => point.targetId === item.id);
		const segments = segmentViews(item);
		const grouped = new Set(segments.flatMap((view) => view.points.map((row) => row.point.id)));
		return {
			assigned,
			segments,
			physical: assigned.filter(({ point }) => !isBusKind(point.kind)),
			orphanNetwork: assigned.filter(({ point }) => isBusKind(point.kind) && !grouped.has(point.id))
		};
	}
	function setFocus(next: FocusState) { focus = next; syncNodes(); }
	function focusEquipment(id: string) { setFocus({ type: 'equipment', id }); }
	function focusTarget(id: string) { setFocus({ type: 'target', id }); }
	function focusSupervisor(id: string) { setFocus({ type: 'supervisor', id }); }

	function addSupervisor(kind: SupervisorKind) { commit(() => { const item = createSupervisor(kind, `${kind}-${nextId++}`, uniqueName(SUPERVISOR_DEFINITIONS[kind].defaultName, supervisors.map((entry) => entry.name))); positions[item.id] = freeNodePosition('supervisor', Object.values(positions)); supervisors = [...supervisors, item]; focus = { type: 'supervisor', id: item.id }; }); }
	function updateSupervisor(id: string, name: string) { supervisors = supervisors.map((item) => item.id === id ? { ...item, name } : item); syncNodes(); persist(); }
	function removeSupervisor(id: string) { commit(() => { supervisors = supervisors.filter((item) => item.id !== id); targets = targets.map((item) => item.supervisorId === id ? { ...item, supervisorId: null } : item); delete positions[id]; if (focus?.id === id) focus = null; }); }
	function assignSupervisor(targetId: string, supervisorId: string) { commit(() => targets = targets.map((item) => item.id === targetId ? { ...item, supervisorId: supervisorId || null } : item)); }
	function setUplink(targetId: string, protocol: UplinkProtocol) { commit(() => targets = targets.map((item) => item.id === targetId ? { ...item, uplink: protocol } : item)); }
	function selectUplinkConnection(targetId: string) { clearConnectionEndTimer(); connectingPointId = null; connectingTargetId = targetId; }
	function connectPendingUplink(supervisorId: string) { clearConnectionEndTimer(); const pending = connectingTargetId; connectingTargetId = null; if (!pending || !supervisors.some((item) => item.id === supervisorId)) return; assignSupervisor(pending, supervisorId); }

	function addTarget(kind: TargetKind) { commit(() => { const item = createTarget(kind, `${kind}-${nextId++}`, uniqueName(TARGET_DEFINITIONS[kind].defaultName, targets.map((entry) => entry.name))); positions[item.id] = freeNodePosition('target', Object.values(positions)); targets = [...targets, item]; focus = { type: 'target', id: item.id }; }); }
	function updateTarget(id: string, name: string) { targets = targets.map((item) => item.id === id ? { ...item, name } : item); syncNodes(); persist(); }
	function removeTarget(id: string) { commit(() => { const orphans = new Set(targets.find((item) => item.id === id)?.segments.map((segment) => segment.id) ?? []); targets = targets.filter((item) => item.id !== id); equipment = equipment.map((item) => ({ ...item, points: item.points.map((point) => point.targetId === id ? { ...point, targetId: null, address: '' } : point) })); detachOrphans(orphans); delete positions[id]; if (focus?.id === id) focus = null; }); }
	/** Identifiant libre : le compteur repart d'une base arbitraire apres un rechargement, on verifie donc les collisions. */
	function makeId(prefix: string) {
		const used = new Set([...supervisors.map((item) => item.id), ...targets.flatMap((item) => [item.id, ...item.segments.map((segment) => segment.id)]), ...equipment.flatMap((item) => [item.id, ...item.points.map((point) => point.id)])]);
		let id = `${prefix}-${nextId++}`;
		while (used.has(id)) id = `${prefix}-${nextId++}`;
		return id;
	}
	function duplicateEquipmentNode(id: string) {
		const result = duplicateEquipment({ targets, equipment }, id, makeId);
		if (!result) return;
		commit(() => { equipment = result.equipment; positions[result.copy.id] = freeNodePosition('equipment', Object.values(positions)); focus = { type: 'equipment', id: result.copy.id }; });
		flash(`${result.copy.name} créé`);
	}
	function duplicateTargetNode(id: string) {
		const result = duplicateTarget({ targets, equipment }, id, makeId);
		if (!result) return;
		commit(() => {
			targets = result.targets; equipment = result.equipment;
			positions[result.copy.id] = freeNodePosition('target', Object.values(positions));
			for (const item of result.equipmentCopies) positions[item.id] = freeNodePosition('equipment', Object.values(positions));
			focus = { type: 'target', id: result.copy.id };
		});
		const count = result.equipmentCopies.length;
		flash(count ? `${result.copy.name} créé avec ${count} équipement${count > 1 ? 's' : ''}` : `${result.copy.name} créé`);
	}
	function addEquipment(kind: EquipmentKind) { commit(() => { const item = createEquipment(kind, `${kind}-${nextId++}`); item.name = uniqueName(item.name, equipment.map((entry) => entry.name)); positions[item.id] = freeNodePosition('equipment', Object.values(positions)); equipment = [...equipment, item]; focus = { type: 'equipment', id: item.id }; }); }
	function updateEquipment(id: string, name: string) { equipment = equipment.map((item) => item.id === id ? { ...item, name } : item); syncNodes(); persist(); }
	function removeEquipment(id: string) { commit(() => { const pointIds = new Set(equipment.find((item) => item.id === id)?.points.map((point) => point.id) ?? []); equipment = equipment.filter((item) => item.id !== id); delete positions[id]; if (focus?.id === id || (focus?.type === 'point' && pointIds.has(focus.id))) focus = null; if (inspectorPointId && pointIds.has(inspectorPointId)) inspectorPointId = null; }); }
	function updatePoint(equipmentId: string, pointId: string, patch: Partial<GtbPoint>, withHistory = false) { const action = () => equipment = equipment.map((item) => item.id === equipmentId ? { ...item, points: item.points.map((point) => point.id === pointId ? { ...point, ...patch } : point) } : item); if (withHistory) commit(action); else { action(); syncNodes(); persist(); } }
	function changePointKind(equipmentId: string, point: GtbPoint, kind: PointKind) { const item = equipment.find((entry) => entry.id === equipmentId); const protocol = item ? equipmentProtocol(item.kind) : null; const nextKind = protocol?.kind ?? kind; const current = targets.find((target) => target.id === point.targetId); const keep = current && targetAccepts(current.kind, nextKind); updatePoint(equipmentId, point.id, { kind: nextKind, signal: protocol?.signal ?? defaultSignal(nextKind), targetId: keep ? current.id : null, address: keep ? point.address : '' }, true); }
	// Une E/S câblée prend une borne libre de l'automate ; un registre est numéroté dans son propre équipement.
	function addressScope(equipmentId: string, point: GtbPoint, targetId: string) {
		return isBusKind(point.kind)
			? allPoints.filter((row) => row.equipment.id === equipmentId && row.point.id !== point.id).map((row) => row.point.address)
			: allPoints.filter((row) => row.point.targetId === targetId && row.point.id !== point.id).map((row) => row.point.address);
	}
	function suggestAddress(equipmentId: string, point: GtbPoint, targetId: string) { return nextFreeAddress(point.kind, addressScope(equipmentId, point, targetId)); }
	function assignTarget(equipmentId: string, point: GtbPoint, targetId: string) {
		// Raccorder un point de bus, c'est raccorder l'équipement : l'adresse esclave est portée par le device.
		if (targetId && equipmentBus(equipment.find((item) => item.id === equipmentId)?.kind ?? 'custom')) { attachToSegment(equipmentId, targetId); return; }
		updatePoint(equipmentId, point.id, { targetId: targetId || null, address: targetId ? point.address || suggestAddress(equipmentId, point, targetId) : '' }, true);
	}

	/** Accroche l'équipement au segment adapté de la cible (créé au besoin) et affecte tous ses points. */
	function attachToSegment(equipmentId: string, targetId: string) {
		const item = equipment.find((entry) => entry.id === equipmentId);
		const required = item ? equipmentBus(item.kind) : null;
		if (!item || !required) return;
		const host = targets.find((entry) => entry.id === targetId);
		if (!host || !targetAccepts(host.kind, required.kind)) return;
		commit(() => {
			const { target: updated, segment } = ensureSegment(host, required.kind, required.media, `segment-${nextId++}`);
			targets = targets.map((entry) => entry.id === targetId ? updated : entry);
			const profile = segmentProfile(segment);
			const used = equipment.filter((entry) => entry.id !== equipmentId && entry.bus?.segmentId === segment.id).map((entry) => entry.bus?.address ?? '');
			const keep = item.bus?.segmentId === segment.id && item.bus.address ? item.bus.address : '';
			const address = keep || nextFreeDeviceAddress(profile, used);
			const registers = new Set<string>();
			equipment = equipment.map((entry) => entry.id !== equipmentId ? entry : { ...entry, bus: { segmentId: segment.id, address }, points: entry.points.map((point) => {
				const current = point.address.trim().toUpperCase();
				const register = current && !registers.has(current) ? point.address : nextFreeAddress(point.kind, registers);
				registers.add(register.trim().toUpperCase());
				return { ...point, targetId, address: register };
			}) });
		});
	}

	function detachFromSegment(equipmentId: string) { commit(() => equipment = equipment.map((entry) => entry.id !== equipmentId ? entry : { ...entry, bus: { segmentId: null, address: '' }, points: entry.points.map((point) => ({ ...point, targetId: null })) })); }
	function setDeviceAddress(equipmentId: string, address: string) { equipment = equipment.map((entry) => entry.id !== equipmentId ? entry : { ...entry, bus: { segmentId: entry.bus?.segmentId ?? null, address } }); syncNodes(); persist(); }
	function updateSegment(targetId: string, segmentId: string, patch: Partial<Segment>) { targets = targets.map((entry) => entry.id !== targetId ? entry : { ...entry, segments: entry.segments.map((segment) => segment.id === segmentId ? { ...segment, ...patch } : segment) }); syncNodes(); persist(); }
	function removeSegment(targetId: string, segmentId: string) { commit(() => { targets = targets.map((entry) => entry.id !== targetId ? entry : { ...entry, segments: entry.segments.filter((segment) => segment.id !== segmentId) }); equipment = equipment.map((entry) => entry.bus?.segmentId !== segmentId ? entry : { ...entry, bus: { segmentId: null, address: '' }, points: entry.points.map((point) => ({ ...point, targetId: null })) }); }); }
	function assignAllPoints(equipmentId: string, targetId: string) {
		const item = equipment.find((entry) => entry.id === equipmentId);
		const target = targets.find((entry) => entry.id === targetId);
		if (!item || !target || !item.points.length || !item.points.every((point) => targetAccepts(target.kind, point.kind))) return;
		if (equipmentBus(item.kind)) { attachToSegment(equipmentId, targetId); flash(`${item.name} raccordé à ${target.name}`); return; }
		commit(() => {
			const taken = new Set(allPoints
				.filter((row) => row.equipment.id !== equipmentId && row.point.targetId === targetId)
				.map((row) => row.point.address.trim().toUpperCase())
				.filter(Boolean));
			equipment = equipment.map((entry) => entry.id !== equipmentId ? entry : { ...entry, points: entry.points.map((point) => {
				// Une adresse déjà posée sur cette cible est conservée, sauf si elle entre en conflit.
				const current = point.address.trim().toUpperCase();
				const keep = point.targetId === targetId && current && !taken.has(current);
				const address = keep ? point.address : nextFreeAddress(point.kind, taken);
				taken.add(address.trim().toUpperCase());
				return { ...point, targetId, address };
			}) });
		});
		flash(`${item.points.length} points affectés à ${target.name}`);
	}
	function unassignPoint(equipmentId: string, point: GtbPoint) {
		// Un point de bus n'existe qu'a travers son device : le detacher detache l'equipement entier.
		if (equipmentBus(equipment.find((item) => item.id === equipmentId)?.kind ?? 'custom')) { detachFromSegment(equipmentId); return; }
		assignTarget(equipmentId, point, '');
	}
	/** Coupe les rattachements qui pointent vers des segments disparus avec leur cible. */
	function detachOrphans(removedSegmentIds: Set<string>) {
		if (!removedSegmentIds.size) return;
		equipment = equipment.map((item) => removedSegmentIds.has(item.bus?.segmentId ?? '') ? { ...item, bus: { segmentId: null, address: '' } } : item);
	}
	function addPoint(equipmentId: string) { const id = `${equipmentId}-point-${nextId++}`; commit(() => equipment = equipment.map((item) => { if (item.id !== equipmentId) return item; const protocol = equipmentProtocol(item.kind); const kind = protocol?.kind ?? 'AI'; return { ...item, points: [...item.points, { id, name: 'Nouveau point', kind, signal: protocol?.signal ?? defaultSignal(kind), address: '', targetId: null }] }; })); openPoint(id); }
	function removePoint(equipmentId: string, pointId: string) { commit(() => { equipment = equipment.map((item) => item.id === equipmentId ? { ...item, points: item.points.filter((point) => point.id !== pointId) } : item); if (focus?.id === pointId) focus = null; if (inspectorPointId === pointId) inspectorPointId = null; }); }
	function openPoint(pointId: string) { const closing = inspectorPointId === pointId; inspectorPointId = closing ? null : pointId; setFocus(closing ? null : { type: 'point', id: pointId }); }
	function closePoint(pointId: string) { if (inspectorPointId === pointId) { inspectorPointId = null; setFocus(null); } }
	function openPointFromTable(pointId: string) { view = 'architecture'; openPoint(pointId); }
	function equipmentBusView(item: Equipment): EquipmentBusView | null {
		const required = equipmentBus(item.kind);
		if (!required) return null;
		const attached = allSegments.find((entry) => entry.segment.id === item.bus?.segmentId) ?? null;
		return {
			profile: attached ? segmentProfile(attached.segment) : addressProfile(required.kind, required.media),
			segment: attached?.segment ?? null,
			hostName: attached?.target.name ?? null,
			options: allSegments
				.filter((entry) => entry.segment.kind === required.kind && entry.segment.media === required.media)
				.map((entry) => ({ segment: entry.segment, targetName: entry.target.name })),
			address: item.bus?.address ?? '',
			issues: scopedIssues.get(item.id) ?? []
		};
	}
	function segmentViews(target: Target): SegmentView[] {
		return target.segments.map((segment) => {
			const profile = segmentProfile(segment);
			const devices = equipment.filter((item) => item.bus?.segmentId === segment.id).length;
			// Un point reseau est porte par le segment de son device, pas par une borne.
			const points = allPoints.filter(({ equipment: item, point }) => point.targetId === target.id && isBusKind(point.kind) && item.bus?.segmentId === segment.id);
			return { segment, devices, maxDevices: profile.maxDevices, overloaded: profile.maxDevices !== null && devices > profile.maxDevices, points };
		});
	}
	function attachSegment(equipmentId: string, segmentId: string) {
		if (!segmentId) { detachFromSegment(equipmentId); return; }
		const host = allSegments.find((entry) => entry.segment.id === segmentId);
		if (host) attachToSegment(equipmentId, host.target.id);
	}
	function targetsOf(supervisorId: string) { return targets.filter((item) => item.supervisorId === supervisorId).map((item) => item.id); }
	function isConnectionActive(equipmentId: string, point: GtbPoint) { const current = focus; return !current || (current.type === 'point' && point.id === current.id) || (current.type === 'equipment' && equipmentId === current.id) || (current.type === 'target' && point.targetId === current.id) || (current.type === 'supervisor' && targetsOf(current.id).includes(point.targetId ?? '')); }
	function isEquipmentActive(item: Equipment) { const current = focus; return !current || (current.type === 'target' && item.points.some((point) => point.targetId === current.id)) || (current.type === 'equipment' && current.id === item.id) || (current.type === 'point' && item.points.some((point) => point.id === current.id)) || (current.type === 'supervisor' && item.points.some((point) => targetsOf(current.id).includes(point.targetId ?? ''))); }
	function isTargetActive(target: Target) { const current = focus; return !current || (current.type === 'equipment' && equipment.find((item) => item.id === current.id)?.points.some((point) => point.targetId === target.id) === true) || (current.type === 'target' && current.id === target.id) || (current.type === 'supervisor' && target.supervisorId === current.id) || (current.type === 'point' && allPoints.some(({ point }) => point.id === current.id && point.targetId === target.id)); }
	function isSupervisorActive(supervisor: Supervisor) { const current = focus; if (!current) return true; const linked = targetsOf(supervisor.id); if (current.type === 'supervisor') return current.id === supervisor.id; if (current.type === 'target') return linked.includes(current.id); if (current.type === 'equipment') return equipment.find((item) => item.id === current.id)?.points.some((point) => linked.includes(point.targetId ?? '')) === true; return allPoints.some(({ point }) => point.id === current.id && linked.includes(point.targetId ?? '')); }
	function isUplinkActive(target: Target) { const current = focus; if (!current) return true; if (current.type === 'target') return current.id === target.id; if (current.type === 'supervisor') return target.supervisorId === current.id; if (current.type === 'equipment') return equipment.find((item) => item.id === current.id)?.points.some((point) => point.targetId === target.id) === true; return allPoints.some(({ point }) => point.id === current.id && point.targetId === target.id); }
	function findPoint(id: string) { for (const item of equipment) { const point = item.points.find((entry) => entry.id === id); if (point) return { equipment: item, point }; } return null; }
	function resolveConnection(connection: Connection | Edge) {
		const fromSource = connection.sourceHandle ? findPoint(connection.sourceHandle) : null;
		const fromTarget = connection.targetHandle ? findPoint(connection.targetHandle) : null;
		if (fromSource && targets.some((item) => item.id === connection.target)) return { ...fromSource, targetId: connection.target };
		if (fromTarget && targets.some((item) => item.id === connection.source)) return { ...fromTarget, targetId: connection.source };
		return null;
	}
	function resolveUplink(connection: Connection | Edge) { if (connection.sourceHandle !== 'uplink') return null; const target = targets.find((item) => item.id === connection.source); const supervisor = supervisors.find((item) => item.id === connection.target); return target && supervisor ? { target, supervisor } : null; }
	function connectionIsValid(connection: Connection | Edge) {
		if (resolveUplink(connection)) return true;
		const resolved = resolveConnection(connection);
		const target = resolved ? targets.find((item) => item.id === resolved.targetId) : null;
		if (!resolved || !target || !targetAccepts(target.kind, resolved.point.kind)) return false;
		// Un point réseau se raccorde à un bus, une E/S à une borne : les deux ne se mélangent pas.
		const required = equipmentBus(resolved.equipment.kind);
		if (isBusKind(resolved.point.kind) !== Boolean(required)) return false;
		return true;
	}
	function connectPoint(connection: Connection) { const uplink = resolveUplink(connection); if (uplink) { assignSupervisor(uplink.target.id, uplink.supervisor.id); return; } const resolved = resolveConnection(connection); if (resolved && connectionIsValid(connection)) assignTarget(resolved.equipment.id, resolved.point, resolved.targetId); }
	function clearConnectionEndTimer() { if (connectionEndTimer) clearTimeout(connectionEndTimer); connectionEndTimer = null; }
	function selectPointConnection(pointId: string) { clearConnectionEndTimer(); connectingTargetId = null; connectingPointId = pointId; }
	function connectPendingPoint(targetId: string) { clearConnectionEndTimer(); const record = connectingPointId ? findPoint(connectingPointId) : null; const target = targets.find((item) => item.id === targetId); if (record && target && targetAccepts(target.kind, record.point.kind)) assignTarget(record.equipment.id, record.point, targetId); connectingPointId = null; }
	function startConnection(params: OnConnectStartParams) { clearConnectionEndTimer(); connectionStartedFrom = params.handleType; if (params.handleId === 'uplink') { connectingPointId = null; connectingTargetId = params.nodeId; return; } if (params.handleType === 'source') connectingPointId = params.handleId; }
	function endConnection() { clearConnectionEndTimer(); if (connectionStartedFrom === 'target' && connectingPointId) return; connectionEndTimer = setTimeout(() => { connectingPointId = null; connectingTargetId = null; connectionEndTimer = null; }, 0); }
	function startNodeDrag() { dragSnapshot = projectSnapshot(); }
	function stopNodeDrag(dragged: MapperFlowNode[]) {
		for (const node of dragged) {
			const snapped = { x: Math.round(node.position.x / 16) * 16, y: Math.round(node.position.y / 16) * 16 };
			positions[node.id] = snapped;
			node.position = snapped;
		}
		nodes = [...nodes];
		if (dragSnapshot && dragSnapshot !== projectSnapshot()) { undoStack = [...undoStack.slice(-(HISTORY_LIMIT - 1)), dragSnapshot]; redoStack = []; persist(); }
		dragSnapshot = '';
	}
	function deleteNodes(ids: string[]) { if (!ids.length) return; commit(() => { const removedTargets = new Set(targets.filter((item) => ids.includes(item.id)).map((item) => item.id));
		const orphanSegments = new Set(targets.filter((item) => ids.includes(item.id)).flatMap((item) => item.segments.map((segment) => segment.id))); const removedSupervisors = new Set(supervisors.filter((item) => ids.includes(item.id)).map((item) => item.id)); supervisors = supervisors.filter((item) => !ids.includes(item.id)); targets = targets.filter((item) => !ids.includes(item.id)).map((item) => removedSupervisors.has(item.supervisorId ?? '') ? { ...item, supervisorId: null } : item); equipment = equipment.filter((item) => !ids.includes(item.id)).map((item) => ({ ...item, points: item.points.map((point) => removedTargets.has(point.targetId ?? '') ? { ...point, targetId: null, address: '' } : point) })); detachOrphans(orphanSegments); for (const id of ids) delete positions[id]; focus = null; }); }
	function targetName(id: string | null) { return targets.find((target) => target.id === id)?.name ?? 'Non affecté'; }
	function showPoints(status: StatusFilter = 'all') { view = 'points'; statusFilter = status; kindFilter = 'all'; search = ''; }
	function compatibleTargets(point: GtbPoint) { return targets.filter((target) => targetAccepts(target.kind, point.kind)); }
	function setPointTarget(row: { equipment: Equipment; point: GtbPoint }, targetId: string) { targetId ? assignTarget(row.equipment.id, row.point, targetId) : unassignPoint(row.equipment.id, row.point); }
	function signalLocked(row: { equipment: Equipment; point: GtbPoint }) { return Boolean(equipmentProtocol(row.equipment.kind)) || row.point.kind === 'LORA' || row.point.kind === 'MBUS'; }
	function segmentName(row: { equipment: Equipment; point: GtbPoint }) {
		const segmentId = row.equipment.bus?.segmentId;
		if (!segmentId) return '';
		return allSegments.find((entry) => entry.segment.id === segmentId)?.segment.name ?? '';
	}
	function issueLabel(id: string) {
		const count = issueMap.get(id)?.length ?? 0;
		return count === 0 ? 'conforme' : `${count} alerte${count === 1 ? '' : 's'}`;
	}
	function reset() { commit(() => { title = DEFAULT_MAPPER.title; supervisors = cloneSupervisors(DEFAULT_MAPPER.supervisors); targets = cloneTargets(DEFAULT_MAPPER.targets); equipment = cloneEquipment(DEFAULT_MAPPER.equipment); positions = {}; viewport = { x: 32, y: 32, zoom: 0.75 }; fitInitial = true; canvasKey += 1; focus = null; inspectorPointId = null; }); flash('Projet réinitialisé'); }
	function download(content: string, name: string, type: string) { const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
	function filename(extension: string) { const base = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); return `${base || 'architecture-gtb'}.${extension}`; }
	function exportProject() { download(projectSnapshot(), filename('json'), 'application/json;charset=utf-8'); }
	async function importProject(event: Event) { const input = event.currentTarget as HTMLInputElement; const file = input.files?.[0]; if (!file) return; try { const parsed = JSON.parse(await file.text()) as MapperDocument; if (!parsed || !Array.isArray(parsed.targets) || !Array.isArray(parsed.equipment)) throw new Error(); const before = projectSnapshot(); applyProject(parsed); undoStack = [...undoStack, before]; redoStack = []; persist(); flash('Projet importé'); } catch { flash('Impossible d’importer ce fichier'); } input.value = ''; }
	function handleShortcut(event: KeyboardEvent) { const element = event.target as HTMLElement; if (element.matches('input, textarea, select, [contenteditable="true"]')) return; if (event.key === 'Escape' && expanded) { expanded = false; return; } if (!(event.ctrlKey || event.metaKey)) return; if (event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? redo() : undo(); } if (event.key.toLowerCase() === 'y') { event.preventDefault(); redo(); } }

	$effect(() => { if (!browser) return; document.body.style.overflow = expanded ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; });
	onMount(() => {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved) { try { applyProject(JSON.parse(saved)); flash('Projet local restauré'); } catch { syncNodes(); } }
		else syncNodes();
		// A viewport saved on desktop is rarely useful on a narrow phone screen.
		if (window.innerWidth < 768) fitInitial = true;
		paletteOpen = window.innerWidth >= 760;
		canvasReady = true;
	});
</script>

<svelte:window onkeydown={handleShortcut} />

<ToolShell {tool} seoTitle="Architecture GTB et générateur de liste de points" seoDescription="Relier chaudières, pompes et capteurs à plusieurs automates ou gateways. Générer un synoptique fonctionnel et une liste de points AI, AO, DI, DO, Modbus RS485/TCP, BACnet, M-Bus et LoRaWAN.">
	<div class="mapper-root">
		<div class="command-bar">
			<label for="mapper-title" class="title-field">
				<span>Nom de l’installation</span>
				<input id="mapper-title" bind:value={title} onblur={persist} />
			</label>
			<div class="command-actions">
				<div class="history-actions">
					<button type="button" onclick={undo} disabled={!undoStack.length} class="tool-icon" aria-label="Annuler" title="Annuler (Ctrl+Z)"><Undo2 class="size-4" /></button>
					<button type="button" onclick={redo} disabled={!redoStack.length} class="tool-icon" aria-label="Rétablir" title="Rétablir (Ctrl+Y)"><Redo2 class="size-4" /></button>
					<button type="button" onclick={reset} class="tool-icon" aria-label="Réinitialiser" title="Réinitialiser"><RotateCcw class="size-4" /></button>
				</div>
				<input bind:this={importInput} type="file" accept="application/json,.json" onchange={importProject} class="hidden" />
				<button type="button" onclick={() => importInput.click()} class="export-button" title="Importer un projet JSON" aria-label="Importer un projet JSON"><Import class="size-4" /> JSON</button>
				<button type="button" onclick={exportProject} class="export-button" aria-label="Exporter le projet"><Save class="size-4" /> Projet</button>
				<button type="button" onclick={() => download(mapperToCsv(mapperDocument), filename('csv'), 'text/csv;charset=utf-8')} class="export-button" aria-label="Exporter en CSV"><Table2 class="size-4" /> CSV</button>
				<button type="button" onclick={() => download(exportSvg, filename('svg'), 'image/svg+xml;charset=utf-8')} class="primary-export-button" aria-label="Exporter en SVG"><Download class="size-4" /> SVG</button>
			</div>
		</div>

		<div class="view-toolbar">
			<div class="view-tabs" role="tablist" aria-label="Vue du mapper">
				<button type="button" role="tab" aria-selected={view === 'architecture'} onclick={() => view = 'architecture'} class="tab-button" class:is-active={view === 'architecture'}><Network class="size-3.5" /> <span class="tab-label-full">Architecture</span><span class="tab-label-short">Arch.</span></button>
				<button type="button" role="tab" aria-selected={view === 'points'} onclick={() => view = 'points'} class="tab-button" class:is-active={view === 'points'}><Table2 class="size-3.5" /> <span class="tab-label-full">Liste de points</span><span class="tab-label-short">Points</span></button>
			</div>
			<div class="status-strip" aria-label="État du projet">
				<button type="button" onclick={() => showPoints('assigned')} class="status-chip">
					<span>Affectés</span><strong>{assignedCount}/{pointCount}</strong>
				</button>
				<button type="button" onclick={() => showPoints('unassigned')} class="status-chip" class:has-warning={unassignedCount > 0}>
					<span>Restants</span><strong>{unassignedCount}</strong>
				</button>
				<button type="button" onclick={() => view = 'architecture'} class="status-chip">
					<span>Réseau</span><strong>{networkCount}</strong>
				</button>
				<button type="button" onclick={() => showPoints('issues')} class="status-chip" class:has-warning={issues.length > 0} disabled={issues.length === 0}>
					<span>Alertes</span><strong>{issues.length}</strong>
				</button>
			</div>
		</div>

		{#if view === 'architecture'}
			<div role="tabpanel" class:workspace-expanded={expanded} class="workspace">
				<div class="workspace-heading">
					<div>
						<h2>Architecture fonctionnelle</h2>
						<p>{completionPercent}% des points affectés · {equipment.length} équipements · {physicalCount} E/S · {allSegments.length} segment{allSegments.length === 1 ? '' : 's'} · {supervisors.length} supervision</p>
					</div>
					<div class="workspace-actions">
						<span class="workspace-hint">Grille 16 px · Maj + glisser</span>
						{#if expanded}
							<button type="button" onclick={undo} disabled={!undoStack.length} class="tool-icon shrink-0" aria-label="Annuler dans le canvas" title="Annuler"><Undo2 class="size-4" /></button>
							<button type="button" onclick={redo} disabled={!redoStack.length} class="tool-icon shrink-0" aria-label="Rétablir dans le canvas" title="Rétablir"><Redo2 class="size-4" /></button>
						{/if}
						<button type="button" onclick={() => expanded = !expanded} class="tool-icon shrink-0" aria-label={expanded ? 'Réduire le canvas' : 'Agrandir le canvas'} title={expanded ? 'Quitter le grand écran' : 'Grand écran'}>{#if expanded}<Shrink class="size-4" />{:else}<Expand class="size-4" />{/if}</button>
					</div>
				</div>
				<div class="workspace-body">
					<aside class="palette" class:is-collapsed={!paletteOpen}>
						<button type="button" class="palette-toggle" aria-expanded={paletteOpen} aria-controls="mapper-palette" onclick={() => paletteOpen = !paletteOpen}><Plus class="size-3.5" /> Ajouter un bloc <ChevronDown class="chevron size-3.5" /></button>
						<div id="mapper-palette" class="palette-scroll">
							<section class="palette-group" aria-labelledby="palette-supervisors">
								<h3 id="palette-supervisors">Supervision</h3>
								<p>Centralise et archive</p>
								<div class="palette-list">
									{#each SUPERVISOR_PALETTE as kind (kind)}{@const Icon = SUPERVISOR_ICONS[kind]}<button type="button" onclick={() => addSupervisor(kind)} class="palette-button is-supervisor" title={SUPERVISOR_DEFINITIONS[kind].hint}><Icon class="text-primary size-3.5 shrink-0" /> <span>{SUPERVISOR_DEFINITIONS[kind].label}</span> <Plus class="plus size-3 shrink-0" /></button>{/each}
								</div>
							</section>
							<section class="palette-group" aria-labelledby="palette-targets">
								<h3 id="palette-targets">Automates / gateways</h3>
								<p>Collecte terrain</p>
								<div class="palette-list">
									{#each TARGET_PALETTE as kind (kind)}{@const Icon = TARGET_ICONS[kind]}<button type="button" onclick={() => addTarget(kind)} class="palette-button is-target"><Icon class="text-primary size-3.5 shrink-0" /> <span>{TARGET_DEFINITIONS[kind].label}</span> <Plus class="plus size-3 shrink-0" /></button>{/each}
								</div>
							</section>
							<section class="palette-group" aria-labelledby="palette-equipment">
								<h3 id="palette-equipment">Équipements terrain</h3>
								<p>Points et bus</p>
								{#each EQUIPMENT_FAMILIES as family (family.id)}
									<div class="palette-family" role="group" aria-label="Équipements terrain {family.label}">
										<span class="family-label"><i style:background={family.color}></i>{family.label}<em>{family.hint}</em></span>
										<div class="palette-list">
											{#each family.kinds as kind (kind)}{@const Icon = EQUIPMENT_ICONS[kind]}<button type="button" onclick={() => addEquipment(kind)} class="palette-button"><Icon class="text-text-dim size-3.5 shrink-0" /> <span>{EQUIPMENT_DEFINITIONS[kind].label}</span> <Plus class="plus size-3 shrink-0" /></button>{/each}
										</div>
									</div>
								{/each}
							</section>
						</div>
					</aside>
					<div class="canvas-frame">{#if canvasReady}{#key canvasKey}<MapperCanvas bind:nodes {edges} {fitInitial} {connectionColor} connectionKind={connectingPoint?.kind ?? null} connectionUplink={connectingTargetId !== null} initialViewport={viewport} onConnect={connectPoint} onValidateConnection={connectionIsValid} onConnectionStart={startConnection} onConnectionEnd={endConnection} onClearFocus={() => setFocus(null)} onDragStart={startNodeDrag} onDragStop={stopNodeDrag} onDeleteNodes={deleteNodes} onViewportChange={(next) => { viewport = next; persist(); }} />{/key}{/if}</div>
				</div>
			</div>
		{:else}
			<div role="tabpanel" class="points-panel">
				<div class="points-heading">
					<div>
						<h2>Liste de points</h2>
						<p>{filteredPoints.length} sur {pointCount} points · {assignedCount} affectés · {issues.length} alertes</p>
					</div>
					{#if issues.length > 0}<button type="button" onclick={() => statusFilter = 'issues'} class="issues-filter">{issues.length} alertes à vérifier</button>{/if}
				</div>
				<div class="filters">
					<label class="search-field"><Search class="size-3.5" /><input bind:value={search} placeholder="Rechercher un point, une adresse…" aria-label="Rechercher dans la liste de points" /></label>
					<select bind:value={kindFilter} aria-label="Filtrer par type"><option value="all">Tous les types</option>{#each POINT_KINDS as kind}<option value={kind}>{kind}</option>{/each}</select>
					<select bind:value={statusFilter} aria-label="Filtrer par état"><option value="all">Tous les états</option><option value="assigned">Affectés</option><option value="unassigned">Non affectés</option><option value="issues">Avec alertes</option></select>
					<select bind:value={sortKey} aria-label="Trier les points"><option value="equipment">Tri : équipement</option><option value="point">Tri : point</option><option value="kind">Tri : type</option><option value="target">Tri : cible</option><option value="address">Tri : adresse</option></select>
				</div>
				<div class="points-table-wrap">
					<table>
						<thead><tr><th>Équipement</th><th>Type</th><th>Point</th><th>Signal</th><th>Cible</th><th>Adresse</th><th>État</th></tr></thead>
						<tbody>
							{#each filteredPoints as row (row.point.id)}
								<tr onclick={() => openPointFromTable(row.point.id)} onkeydown={(event) => event.key === 'Enter' && openPointFromTable(row.point.id)} tabindex="0">
									<td>
										<strong>{row.equipment.name}</strong>
										{#if segmentName(row)}<span class="table-note">{segmentName(row)}</span>{/if}
									</td>
									<td><span class="point-chip" style:color={POINT_COLORS[row.point.kind]} style:border-color="{POINT_COLORS[row.point.kind]}66">{row.point.kind}</span></td>
									<td><input class="table-input" value={row.point.name} aria-label="Nom du point" onchange={(event) => updatePoint(row.equipment.id, row.point.id, { name: event.currentTarget.value }, true)} onclick={(event) => event.stopPropagation()} onkeydown={(event) => event.stopPropagation()} /></td>
									<td>
										<select class="table-select" value={row.point.signal} disabled={signalLocked(row)} aria-label="Signal du point" onchange={(event) => updatePoint(row.equipment.id, row.point.id, { signal: event.currentTarget.value }, true)} onclick={(event) => event.stopPropagation()} onkeydown={(event) => event.stopPropagation()}>
											{#each SIGNAL_PRESETS[row.point.kind] as signal (signal)}<option value={signal}>{signal}</option>{/each}
										</select>
									</td>
									<td>
										<select class="table-select" value={row.point.targetId ?? ''} aria-label="Cible du point" onchange={(event) => setPointTarget(row, event.currentTarget.value)} onclick={(event) => event.stopPropagation()} onkeydown={(event) => event.stopPropagation()}>
											<option value="">Non affecté</option>
											{#each compatibleTargets(row.point) as target (target.id)}<option value={target.id}>{target.name}</option>{/each}
										</select>
									</td>
									<td><input class="table-input is-address" value={row.point.address} placeholder="Auto" aria-label="Adresse du point" onchange={(event) => updatePoint(row.equipment.id, row.point.id, { address: event.currentTarget.value }, true)} onclick={(event) => event.stopPropagation()} onkeydown={(event) => event.stopPropagation()} /></td>
									<td>
										{#if issueMap.has(row.point.id)}
											<span class="row-status is-warning" title={issueMap.get(row.point.id)?.join(' · ')}>{issueLabel(row.point.id)}</span>
										{:else}
											<span class="row-status"><CheckCircle2 class="size-3.5" /> conforme</span>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}

		{#if notification}<div class="notification" role="status">{notification}</div>{/if}
	</div>
</ToolShell>

<style>
	:global(article:has(.mapper-root)) { max-width:86rem; }
	:global(article:has(.mapper-root) > header) { margin-top:1.25rem; }
	:global(article:has(.mapper-root) > section) { margin-top:1.35rem; }
	.mapper-root { min-width:0; overflow-x:clip; }
	.command-bar { display:grid; grid-template-columns:minmax(240px,1fr) auto; align-items:end; gap:10px; border-top:1px solid var(--color-line-soft); border-bottom:1px solid var(--color-line-soft); padding:12px 0; }
	.title-field { min-width:0; }
	.title-field span { display:block; margin-bottom:5px; color:var(--color-text-dim); font:10.5px var(--font-mono); text-transform:uppercase; }
	.title-field input { width:100%; height:38px; border:1px solid var(--color-border); border-radius:4px; background:var(--color-background); padding:0 12px; color:var(--color-foreground); font:13px var(--font-mono); outline:0; }
	.title-field input:focus-visible { border-color:color-mix(in srgb,var(--color-primary) 65%,transparent); box-shadow:0 0 0 2px color-mix(in srgb,var(--color-primary) 18%,transparent); }
	.command-actions,.history-actions { display:flex; align-items:center; gap:6px; }
	.tool-icon { display:inline-flex; width:36px; height:36px; align-items:center; justify-content:center; border:1px solid var(--color-border); border-radius:4px; color:var(--color-text-soft); }
	.tool-icon:hover:not(:disabled) { border-color:color-mix(in srgb,var(--color-primary) 50%,transparent); color:var(--color-primary); }
	.tool-icon:disabled { cursor:not-allowed; opacity:.3; }
	.export-button { display:inline-flex; height:36px; align-items:center; gap:7px; border:1px solid var(--color-border); border-radius:4px; padding:0 11px; color:var(--color-text-soft); font:11.5px var(--font-mono); }
	.export-button:hover { border-color:var(--color-primary); color:var(--color-primary); }
	.primary-export-button { display:inline-flex; height:36px; align-items:center; gap:7px; border-radius:4px; background:var(--color-primary); padding:0 13px; color:var(--color-primary-foreground); font:600 11.5px var(--font-mono); }
	.primary-export-button:hover { filter:brightness(1.06); }
	.view-toolbar { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-top:12px; }
	.view-tabs { display:inline-flex; flex:none; border-radius:4px; background:color-mix(in srgb,var(--color-secondary) 60%,transparent); padding:4px; }
	.tab-button { display:inline-flex; height:32px; align-items:center; gap:8px; border-radius:4px; padding:0 12px; color:var(--color-text-soft); font:11.5px var(--font-mono); }
	.tab-button.is-active { background:var(--color-background); color:var(--color-primary); box-shadow:0 1px 3px rgba(0,0,0,.16); }
	.tab-label-short { display:none; }
	.status-strip { display:flex; min-width:0; flex-wrap:wrap; justify-content:flex-end; gap:6px; }
	.status-chip { display:inline-flex; height:32px; align-items:center; gap:8px; border:1px solid var(--color-border); border-radius:4px; background:color-mix(in srgb,var(--color-card) 35%,transparent); padding:0 9px; color:var(--color-text-dim); font:10px var(--font-mono); }
	.status-chip strong { color:var(--color-text-soft); font-size:11px; font-weight:700; }
	.status-chip:hover:not(:disabled),.status-chip:focus-visible:not(:disabled) { border-color:color-mix(in srgb,var(--color-primary) 52%,transparent); color:var(--color-primary); }
	.status-chip:hover:not(:disabled) strong,.status-chip:focus-visible:not(:disabled) strong { color:var(--color-primary); }
	.status-chip.has-warning { border-color:color-mix(in srgb,var(--color-amber) 42%,var(--color-border)); background:color-mix(in srgb,var(--color-amber) 7%,transparent); color:var(--color-amber); }
	.status-chip.has-warning strong { color:var(--color-amber); }
	.status-chip:disabled { cursor:default; opacity:.62; }
	.workspace { margin-top:12px; }
	.workspace-heading { display:flex; align-items:end; justify-content:space-between; gap:16px; border-top:1px solid var(--color-line-soft); padding:10px 0 9px; }
	.workspace-heading h2 { font:500 14px var(--font-mono); } .workspace-heading p { margin-top:2px; color:var(--color-text-dim); font-size:11.5px; }
	.workspace-actions { display:flex; flex:none; align-items:center; gap:6px; }
	.workspace-hint { margin-right:4px; color:var(--color-text-dim); font:9.5px var(--font-mono); white-space:nowrap; }

	.workspace-body { display:grid; height:clamp(560px,72vh,820px); grid-template-columns:224px minmax(0,1fr); gap:10px; }
	.canvas-frame { height:100%; min-width:0; overflow:hidden; border:1px solid var(--color-border); border-radius:4px; }

	.palette { display:flex; min-height:0; flex-direction:column; overflow:hidden; border:1px solid var(--color-border); border-radius:4px; background:color-mix(in srgb,var(--color-card) 45%,transparent); }
	.palette-toggle { display:none; }
	.palette-scroll { display:flex; min-height:0; flex:1; flex-direction:column; gap:14px; overflow-y:auto; padding:10px; scrollbar-width:thin; }
	.palette-group h3 { color:var(--color-text-soft); font:600 10px var(--font-mono); text-transform:uppercase; }
	.palette-group p { margin-bottom:7px; color:var(--color-text-dim); font-size:10.5px; }
	.palette-group + .palette-group { border-top:1px solid var(--color-line-soft); padding-top:13px; }
	.palette-family + .palette-family { margin-top:9px; }
	.family-label { display:flex; align-items:center; gap:6px; margin-bottom:4px; color:var(--color-text-soft); font:10px var(--font-mono); }
	.family-label i { width:6px; height:6px; flex:none; border-radius:50%; }
	.family-label em { margin-left:auto; color:var(--color-text-dim); font-size:9px; font-style:normal; }
	.palette-list { display:flex; flex-direction:column; gap:4px; }
	.palette-button { display:flex; min-height:32px; width:100%; align-items:center; gap:7px; border:1px solid var(--color-border); border-radius:4px; background:color-mix(in srgb,var(--color-card) 50%,transparent); padding:5px 8px; text-align:left; font-size:11.5px; }
	.palette-button span { min-width:0; flex:1; }
	.palette-button :global(.plus) { color:var(--color-text-dim); opacity:0; }
	.palette-button:hover,.palette-button:focus-visible { border-color:color-mix(in srgb,var(--color-primary) 50%,transparent); }
	.palette-button:hover :global(.plus),.palette-button:focus-visible :global(.plus) { color:var(--color-primary); opacity:1; }
	.palette-button.is-target { border-color:color-mix(in srgb,var(--color-primary) 28%,var(--color-border)); background:color-mix(in srgb,var(--color-primary) 7%,transparent); }
	.palette-button.is-supervisor { border-color:color-mix(in srgb,var(--color-primary) 45%,var(--color-border)); background:color-mix(in srgb,var(--color-primary) 12%,transparent); }

	.workspace-expanded { position:fixed; inset:0; z-index:60; display:flex; margin:0; flex-direction:column; background:var(--color-background); padding:12px; }
	.workspace-expanded .workspace-heading { flex:none; border-top:0; padding-top:0; }
	.workspace-expanded .workspace-body { height:auto; min-height:0; flex:1; }

	.points-panel { margin-top:16px; }
	.points-heading { display:flex; align-items:end; justify-content:space-between; gap:12px; margin-bottom:10px; }
	.points-heading h2 { font:500 14px var(--font-mono); }
	.points-heading p { margin-top:3px; color:var(--color-text-dim); font-size:11.5px; }
	.issues-filter { flex:none; border:1px solid color-mix(in srgb,var(--color-amber) 44%,transparent); border-radius:4px; background:color-mix(in srgb,var(--color-amber) 6%,transparent); padding:5px 8px; color:var(--color-amber); font:10px var(--font-mono); }
	.issues-filter:hover { background:color-mix(in srgb,var(--color-amber) 11%,transparent); }
	.filters { display:grid; grid-template-columns:minmax(220px,1fr) repeat(3,minmax(130px,auto)); gap:8px; margin-bottom:10px; }
	.filters select,.search-field { height:36px; border:1px solid var(--color-border); border-radius:4px; background:var(--color-background); color:var(--color-text-soft); font-size:11px; }
	.filters select { padding:0 10px; } .search-field { display:flex; align-items:center; gap:8px; padding:0 10px; } .search-field input { min-width:0; flex:1; border:0; outline:0; background:transparent; color:var(--color-foreground); }
	.points-table-wrap { overflow-x:auto; border:1px solid var(--color-border); border-radius:4px; }
	table { width:100%; min-width:1080px; border-collapse:collapse; text-align:left; font-size:11.5px; }
	thead { position:sticky; top:0; z-index:1; background:color-mix(in srgb,var(--color-secondary) 50%,var(--color-background)); color:var(--color-text-dim); font:9.5px var(--font-mono); text-transform:uppercase; }
	th,td { padding:8px 10px; vertical-align:middle; }
	tbody { border-top:1px solid var(--color-border); }
	tbody tr { cursor:pointer; border-top:1px solid var(--color-border); }
	tbody tr:first-child { border-top:0; }
	tbody tr:hover { background:color-mix(in srgb,var(--color-secondary) 25%,transparent); }
	tbody tr:focus-visible { outline:1px solid var(--color-primary); outline-offset:-1px; }
	td strong { display:block; max-width:190px; overflow:hidden; color:var(--color-foreground); font-weight:500; text-overflow:ellipsis; white-space:nowrap; }
	.table-note { display:block; max-width:190px; overflow:hidden; color:var(--color-text-dim); font:9px var(--font-mono); text-overflow:ellipsis; white-space:nowrap; }
	.table-input,.table-select { width:100%; height:30px; min-width:0; border:1px solid transparent; border-radius:4px; background:transparent; color:var(--color-text-soft); padding:0 7px; outline:0; }
	.table-input { font-size:11.5px; }
	.table-input.is-address { font-family:var(--font-mono); }
	.table-select { min-width:130px; font:10px var(--font-mono); }
	.table-input:hover,.table-select:hover,.table-input:focus,.table-select:focus { border-color:var(--color-border); background:var(--color-background); color:var(--color-foreground); }
	.table-select:disabled { color:var(--color-text-dim); opacity:.72; }
	.point-chip { display:inline-flex; border:1px solid; border-radius:4px; padding:2px 6px; font:700 9.5px var(--font-mono); }
	.row-status { display:inline-flex; align-items:center; gap:5px; color:var(--color-primary); font:9.5px var(--font-mono); white-space:nowrap; }
	.row-status.is-warning { color:var(--color-amber); }
	.notification { position:fixed; right:20px; bottom:20px; z-index:90; border:1px solid color-mix(in srgb,var(--color-primary) 35%,transparent); border-radius:4px; background:var(--color-card); padding:10px 14px; color:var(--color-primary); box-shadow:0 12px 28px rgba(0,0,0,.35); font:11px var(--font-mono); }
	@media(max-width:760px){
		:global(article:has(.mapper-root)) { overflow-x:hidden; }
		:global(article:has(.mapper-root) > header) { margin-top:.85rem; }
		:global(article:has(.mapper-root) > header p) { overflow-wrap:anywhere; }
		:global(article:has(.mapper-root) > header ul) { display:none; }
		.command-bar { grid-template-columns:1fr; }
		.command-actions { justify-content:flex-start; overflow:hidden; }
		.history-actions { flex:none; }
		.export-button,.primary-export-button { width:36px; flex:none; justify-content:center; gap:0; overflow:hidden; padding:0; font-size:0; }
		.export-button :global(svg),.primary-export-button :global(svg) { margin:0; }
		.view-toolbar { align-items:stretch; flex-direction:column; }
		.view-tabs { width:100%; }
		.tab-button { min-width:0; flex:1; justify-content:center; padding:0 8px; }
		.tab-label-full { display:none; }
		.tab-label-short { display:inline; }
		.status-strip { flex-wrap:nowrap; justify-content:flex-start; overflow-x:auto; padding-bottom:2px; scrollbar-width:none; }
		.status-strip::-webkit-scrollbar { display:none; }
		.status-chip { flex:none; justify-content:space-between; min-width:82px; }
		.workspace-heading,.points-heading { align-items:flex-start; flex-direction:column; }
		.workspace-actions { width:100%; justify-content:flex-end; }
		.workspace-body { display:flex; height:auto; min-height:0; flex-direction:column; }
		.canvas-frame { height:70vh; min-height:520px; }
		.workspace-expanded .canvas-frame { height:auto; min-height:0; flex:1; }
		.palette { flex:none; }
		.palette-toggle { display:flex; height:38px; align-items:center; gap:7px; padding:0 10px; color:var(--color-text-soft); font:11.5px var(--font-mono); }
		.palette-toggle :global(.chevron) { margin-left:auto; transition:transform .15s; }
		.palette.is-collapsed .palette-toggle :global(.chevron) { transform:rotate(-90deg); }
		.palette.is-collapsed .palette-scroll { display:none; }
		.palette-scroll { max-height:46vh; border-top:1px solid var(--color-line-soft); }
		.palette-list { display:grid; grid-template-columns:1fr 1fr; }
		.workspace-hint { display:none; }
		.filters { grid-template-columns:1fr 1fr; } .search-field { grid-column:1/-1; }
		table { min-width:1040px; }
		.workspace-expanded { padding:8px; }
	}
</style>
