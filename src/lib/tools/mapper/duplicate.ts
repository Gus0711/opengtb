import { nextFreeDeviceAddress, segmentProfile } from './bus';
import { nextFreeAddress, uniqueName } from './data';
import type { Equipment, GtbPoint, Segment, Target } from './types';

/** Fabrique d'identifiants uniques, fournie par la page (compteur du projet). */
export type IdFactory = (prefix: string) => string;

interface Parts {
	targets: Target[];
	equipment: Equipment[];
}

const norm = (value: string) => value.trim().toUpperCase();

/** Adresses deja occupees sur chaque cible par les E/S cablees (pas les registres de bus). */
function wiredAddressesByTarget(equipment: Equipment[]): Map<string, Set<string>> {
	const byTarget = new Map<string, Set<string>>();
	for (const item of equipment) {
		if (item.bus) continue;
		for (const point of item.points) {
			if (!point.targetId || !point.address.trim()) continue;
			const set = byTarget.get(point.targetId) ?? new Set<string>();
			set.add(norm(point.address));
			byTarget.set(point.targetId, set);
		}
	}
	return byTarget;
}

function deviceAddressesBySegment(equipment: Equipment[]): Map<string, Set<string>> {
	const bySegment = new Map<string, Set<string>>();
	for (const item of equipment) {
		const segmentId = item.bus?.segmentId;
		const address = item.bus?.address.trim();
		if (!segmentId || !address) continue;
		bySegment.set(segmentId, (bySegment.get(segmentId) ?? new Set()).add(address));
	}
	return bySegment;
}

/**
 * Copie d'un equipement, raccorde comme l'original :
 * - E/S cablees : meme automate, bornes suivantes libres (AI3 → AI5…) ;
 * - device de bus : meme segment, adresse esclave suivante libre, registres identiques
 *   (ils sont numerotes dans le device, pas sur le bus).
 */
export function duplicateEquipment(
	parts: Parts,
	equipmentId: string,
	makeId: IdFactory
): { equipment: Equipment[]; copy: Equipment } | null {
	const source = parts.equipment.find((item) => item.id === equipmentId);
	if (!source) return null;
	const segments = new Map(parts.targets.flatMap((target) => target.segments.map((segment) => [segment.id, segment] as const)));
	const copy = cloneEquipment(source, makeId, {
		name: uniqueName(source.name, parts.equipment.map((item) => item.name)),
		targetMap: new Map(),
		segmentMap: new Map(),
		wired: wiredAddressesByTarget(parts.equipment),
		devices: deviceAddressesBySegment(parts.equipment),
		segments
	});
	return { equipment: [...parts.equipment, copy], copy };
}

/**
 * Copie d'un automate ou d'une gateway avec ses segments et les equipements qui
 * n'appartiennent qu'a lui : on obtient un ensemble autonome (« Automate CTA 02 »
 * + « CTA 02 ») aux memes bornes et adresses, puisque la nouvelle cible est vierge.
 * Les equipements partages avec une autre cible restent en place.
 */
export function duplicateTarget(
	parts: Parts,
	targetId: string,
	makeId: IdFactory
): { targets: Target[]; equipment: Equipment[]; copy: Target; equipmentCopies: Equipment[] } | null {
	const source = parts.targets.find((item) => item.id === targetId);
	if (!source) return null;

	const segmentMap = new Map<string, string>();
	const segments: Segment[] = source.segments.map((segment) => {
		const id = makeId('segment');
		segmentMap.set(segment.id, id);
		return { ...segment, id };
	});
	const copy: Target = {
		...source,
		id: makeId(source.kind),
		name: uniqueName(source.name, parts.targets.map((item) => item.name)),
		segments
	};

	const ownSegments = new Set(source.segments.map((segment) => segment.id));
	const owned = parts.equipment.filter((item) => {
		const assigned = item.points.filter((point) => point.targetId);
		if (!assigned.length || !assigned.every((point) => point.targetId === targetId)) return false;
		// Un device de bus doit etre sur un segment de cette cible pour suivre la copie.
		return !item.bus || (item.bus.segmentId !== null && ownSegments.has(item.bus.segmentId));
	});

	const names = parts.equipment.map((item) => item.name);
	const allSegments = new Map([...parts.targets, copy].flatMap((target) => target.segments.map((segment) => [segment.id, segment] as const)));
	const context = {
		targetMap: new Map([[targetId, copy.id]]),
		segmentMap,
		wired: new Map<string, Set<string>>(),
		devices: new Map<string, Set<string>>(),
		segments: allSegments
	};
	const equipmentCopies = owned.map((item) => {
		const name = uniqueName(item.name, names);
		names.push(name);
		return cloneEquipment(item, makeId, { ...context, name });
	});

	return {
		targets: [...parts.targets, copy],
		equipment: [...parts.equipment, ...equipmentCopies],
		copy,
		equipmentCopies
	};
}

interface CloneContext {
	name: string;
	/** Cible d'origine → cible de la copie ; absente = meme cible. */
	targetMap: Map<string, string>;
	segmentMap: Map<string, string>;
	/** Adresses deja prises, completees au fil des copies. */
	wired: Map<string, Set<string>>;
	devices: Map<string, Set<string>>;
	segments: Map<string, Segment>;
}

function cloneEquipment(source: Equipment, makeId: IdFactory, ctx: CloneContext): Equipment {
	const id = makeId(source.kind);
	const points: GtbPoint[] = source.points.map((point, index) => {
		const base = { ...point, id: `${id}-point-${index + 1}` };
		if (!point.targetId) return { ...base, address: '' };
		const targetId = ctx.targetMap.get(point.targetId) ?? point.targetId;
		// Registres de bus : propres au device, on garde la meme table.
		if (source.bus) return { ...base, targetId };
		const taken = ctx.wired.get(targetId) ?? new Set<string>();
		const current = norm(point.address);
		const address = current && !taken.has(current) ? point.address : nextFreeAddress(point.kind, taken);
		taken.add(norm(address));
		ctx.wired.set(targetId, taken);
		return { ...base, targetId, address };
	});

	let bus = source.bus ? { ...source.bus } : null;
	if (bus?.segmentId) {
		const segmentId = ctx.segmentMap.get(bus.segmentId) ?? bus.segmentId;
		const segment = ctx.segments.get(segmentId);
		const used = ctx.devices.get(segmentId) ?? new Set<string>();
		const current = bus.address.trim();
		const address = current && !used.has(current) ? current : segment ? nextFreeDeviceAddress(segmentProfile(segment), used) : '';
		if (address) used.add(address);
		ctx.devices.set(segmentId, used);
		bus = { segmentId, address };
	}

	return { ...source, id, name: ctx.name, bus, points };
}
