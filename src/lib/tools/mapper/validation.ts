import { isBusKind, isValidDeviceAddress, segmentDevices, segmentProfile } from './bus';
import { equipmentBus, targetAccepts } from './data';
import type { MapperDocument, Segment } from './types';

export type MapperIssueKind =
	| 'unassigned'
	| 'duplicate-address'
	| 'incompatible'
	| 'missing-data'
	| 'no-supervisor'
	| 'bus-unattached'
	| 'bus-mismatch'
	| 'bus-target-mismatch'
	| 'invalid-device-address'
	| 'duplicate-device-address'
	| 'segment-overloaded';

export type MapperIssueScope = 'point' | 'target' | 'equipment' | 'segment';

export interface MapperIssue {
	kind: MapperIssueKind;
	/** `id` designe un point, une cible, un equipement ou un segment selon `scope`. */
	scope: MapperIssueScope;
	id: string;
	message: string;
}

/** Index segment → cible qui le porte. */
function segmentOwners(document: MapperDocument) {
	const owners = new Map<string, { segment: Segment; targetId: string }>();
	for (const target of document.targets) {
		for (const segment of target.segments) owners.set(segment.id, { segment, targetId: target.id });
	}
	return owners;
}

export function validateMapper(document: MapperDocument): MapperIssue[] {
	const issues: MapperIssue[] = [];
	const targets = new Map(document.targets.map((target) => [target.id, target]));
	const owners = segmentOwners(document);
	const addresses = new Map<string, string[]>();

	for (const equipment of document.equipment) {
		for (const point of equipment.points) {
			if (!point.name.trim() || !point.signal.trim()) {
				issues.push({ kind: 'missing-data', scope: 'point', id: point.id, message: 'Désignation ou signal manquant' });
			}
			if (!point.targetId) {
				issues.push({ kind: 'unassigned', scope: 'point', id: point.id, message: 'Point non affecté' });
				continue;
			}

			const target = targets.get(point.targetId);
			if (!target || !targetAccepts(target.kind, point.kind)) {
				issues.push({ kind: 'incompatible', scope: 'point', id: point.id, message: 'Cible incompatible avec le type de point' });
			}

			if (point.address.trim()) {
				// Une E/S câblée occupe une borne de l'automate ; un registre n'existe
				// qu'à l'intérieur de son équipement, où deux devices peuvent partager HR1.
				const scope = isBusKind(point.kind) ? `device:${equipment.id}` : `target:${point.targetId}`;
				const key = `${scope}:${point.address.trim().toUpperCase()}`;
				addresses.set(key, [...(addresses.get(key) ?? []), point.id]);
			}
		}
	}

	for (const pointIds of addresses.values()) {
		if (pointIds.length < 2) continue;
		for (const pointId of pointIds) {
			issues.push({ kind: 'duplicate-address', scope: 'point', id: pointId, message: 'Adresse utilisée plusieurs fois à cet endroit' });
		}
	}

	// --- raccordement des équipements sur les segments ---
	const deviceAddresses = new Map<string, string[]>();
	for (const equipment of document.equipment) {
		const required = equipmentBus(equipment.kind);
		if (!required) continue;

		const segmentId = equipment.bus?.segmentId ?? null;
		const owner = segmentId ? owners.get(segmentId) : undefined;
		if (!owner) {
			// Tant qu'aucun point n'est affecté, l'équipement est simplement en attente.
			if (equipment.points.some((point) => point.targetId)) {
				issues.push({ kind: 'bus-unattached', scope: 'equipment', id: equipment.id, message: 'Équipement bus non raccordé à un segment' });
			}
			continue;
		}

		if (owner.segment.kind !== required.kind || owner.segment.media !== required.media) {
			issues.push({ kind: 'bus-mismatch', scope: 'equipment', id: equipment.id, message: 'Segment incompatible avec le protocole de l’équipement' });
			continue;
		}

		// Le segment vit sur une cible : les points reseau du device doivent y pointer.
		const strayed = equipment.points.some((point) => isBusKind(point.kind) && point.targetId && point.targetId !== owner.targetId);
		if (strayed) {
			issues.push({ kind: 'bus-target-mismatch', scope: 'equipment', id: equipment.id, message: 'Points réseau affectés à une autre cible que le segment' });
		}

		const profile = segmentProfile(owner.segment);
		const address = equipment.bus?.address?.trim() ?? '';
		if (!address) {
			// Une valeur relevee sur site ne manque pas tant que le materiel n'est pas pose.
			if (profile.assignment === 'design') {
				issues.push({ kind: 'invalid-device-address', scope: 'equipment', id: equipment.id, message: `${profile.label} manquante` });
			}
			continue;
		}
		if (!isValidDeviceAddress(profile, address)) {
			const range = profile.format === 'numeric' ? ` (${profile.min}–${profile.max})` : '';
			issues.push({ kind: 'invalid-device-address', scope: 'equipment', id: equipment.id, message: `${profile.label} invalide${range}` });
			continue;
		}

		const key = `${segmentId}:${address.trim().toUpperCase()}`;
		deviceAddresses.set(key, [...(deviceAddresses.get(key) ?? []), equipment.id]);
	}

	for (const equipmentIds of deviceAddresses.values()) {
		if (equipmentIds.length < 2) continue;
		for (const equipmentId of equipmentIds) {
			issues.push({ kind: 'duplicate-device-address', scope: 'equipment', id: equipmentId, message: 'Adresse déjà utilisée sur ce segment' });
		}
	}

	// --- capacité des segments ---
	for (const { segment } of owners.values()) {
		const profile = segmentProfile(segment);
		if (profile.maxDevices === null) continue;
		const count = segmentDevices(document.equipment, segment.id).length;
		if (count > profile.maxDevices) {
			issues.push({
				kind: 'segment-overloaded',
				scope: 'segment',
				id: segment.id,
				message: `${count} équipements sur le segment, ${profile.maxDevices} au maximum sans répéteur`
			});
		}
	}

	// --- remontée vers la supervision ---
	const supervisors = new Set(document.supervisors.map((supervisor) => supervisor.id));
	for (const target of document.targets) {
		const carriesPoints = document.equipment.some((equipment) => equipment.points.some((point) => point.targetId === target.id));
		if (!carriesPoints) continue;
		if (!target.supervisorId || !supervisors.has(target.supervisorId)) {
			issues.push({ kind: 'no-supervisor', scope: 'target', id: target.id, message: 'Cible non remontée en supervision' });
		}
	}

	return issues;
}
