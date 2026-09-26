import type { Node } from '@xyflow/svelte';
import type { AddressProfile } from './bus';
import { UPLINK_COLOR } from './data';
import type { Equipment, GtbPoint, MapperPosition, PointKind, Segment, Supervisor, Target, UplinkProtocol } from './types';

/** Raccordement bus tel qu'affiche sur un noeud equipement. */
export interface EquipmentBusView {
	profile: AddressProfile;
	segment: Segment | null;
	hostName: string | null;
	options: Array<{ segment: Segment; targetName: string }>;
	address: string;
	issues: string[];
}

export interface AssignedPoint {
	equipment: Equipment;
	point: GtbPoint;
}

/** Segment tel qu'affiche dans la section BUS d'un noeud cible, avec ses points. */
export interface SegmentView {
	segment: Segment;
	devices: number;
	maxDevices: number | null;
	overloaded: boolean;
	points: AssignedPoint[];
}

export interface EquipmentNodeData extends Record<string, unknown> {
	kind: 'equipment';
	item: Equipment;
	active: boolean;
	bulkTargets: Target[];
	selectedPointId: string | null;
	onFocus: (id: string) => void;
	onRename: (id: string, name: string) => void;
	onRemove: (id: string) => void;
	onDuplicate: (id: string) => void;
	onOpenPoint: (id: string) => void;
	onClosePoint: (id: string) => void;
	onRemovePoint: (equipmentId: string, pointId: string) => void;
	onAddPoint: (equipmentId: string) => void;
	onChangePointKind: (equipmentId: string, point: GtbPoint, kind: PointKind) => void;
	onUpdatePoint: (equipmentId: string, pointId: string, patch: Partial<GtbPoint>) => void;
	onUnassignPoint: (equipmentId: string, point: GtbPoint) => void;
	onSelectConnection: (pointId: string) => void;
	onAssignAll: (equipmentId: string, targetId: string) => void;
	bus: EquipmentBusView | null;
	onAttachSegment: (equipmentId: string, segmentId: string) => void;
	onSetDeviceAddress: (equipmentId: string, address: string) => void;
}

export interface TargetNodeData extends Record<string, unknown> {
	kind: 'target';
	item: Target;
	assigned: AssignedPoint[];
	/** E/S cablees : seules elles occupent une borne de l'automate. */
	physical: AssignedPoint[];
	/** Points reseau dont le device n'a pas encore de segment. */
	orphanNetwork: AssignedPoint[];
	supervisors: Supervisor[];
	supervisor: Supervisor | null;
	segments: SegmentView[];
	active: boolean;
	onFocus: (id: string) => void;
	onRename: (id: string, name: string) => void;
	onRemove: (id: string) => void;
	onDuplicate: (id: string) => void;
	onOpenPoint: (id: string) => void;
	onConnectPending: (targetId: string) => void;
	onAssignSupervisor: (targetId: string, supervisorId: string) => void;
	onSetUplink: (targetId: string, protocol: UplinkProtocol) => void;
	onSelectUplink: (targetId: string) => void;
	onUpdateSegment: (targetId: string, segmentId: string, patch: Partial<Segment>) => void;
	onRemoveSegment: (targetId: string, segmentId: string) => void;
}

export interface SupervisorNodeData extends Record<string, unknown> {
	kind: 'supervisor';
	item: Supervisor;
	uplinks: Target[];
	active: boolean;
	onFocus: (id: string) => void;
	onFocusTarget: (id: string) => void;
	onRename: (id: string, name: string) => void;
	onRemove: (id: string) => void;
	onConnectPending: (supervisorId: string) => void;
}

export type MapperFlowNode =
	| Node<EquipmentNodeData, 'equipment'>
	| Node<TargetNodeData, 'target'>
	| Node<SupervisorNodeData, 'supervisor'>;

export function defaultNodePosition(kind: 'equipment' | 'target' | 'supervisor', index: number): MapperPosition {
	if (kind === 'equipment') return { x: 40, y: 70 + index * 230 };
	if (kind === 'target') return { x: 760, y: 70 + index * 240 };
	return { x: 1200, y: 70 + index * 220 };
}

/**
 * Premier emplacement libre de la colonne. Se baser sur le nombre de blocs
 * repose un nouveau bloc sur un ancien des qu'un bloc anterieur a ete supprime.
 */
export function freeNodePosition(
	kind: 'equipment' | 'target' | 'supervisor',
	taken: Iterable<MapperPosition>
): MapperPosition {
	const used = [...taken];
	for (let index = 0; index < 500; index += 1) {
		const candidate = defaultNodePosition(kind, index);
		const overlaps = used.some(
			(position) => Math.abs(position.x - candidate.x) < 320 && Math.abs(position.y - candidate.y) < 140
		);
		if (!overlaps) return candidate;
	}
	return defaultNodePosition(kind, used.length);
}

export { UPLINK_COLOR };

export function edgeColor(kind: PointKind): string {
	const colors: Record<PointKind, string> = {
		AI: '#38bdf8',
		AO: '#f59e0b',
		DI: '#a78bfa',
		DO: '#f472b6',
		MODBUS: '#34d399',
		BACNET: '#22d3ee',
		MBUS: '#e879f9',
		LORA: '#fb7185'
	};
	return colors[kind];
}
