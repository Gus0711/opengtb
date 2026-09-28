import type { Supervisor, Target, TargetKind, TargetLink, TargetLinkKind, UplinkProtocol } from './types';

/** Couleur des liaisons entre cibles (intégration et échange), distincte de la supervision. */
export const LINK_COLOR = '#c084fc';

export const LINK_KIND_LABELS: Record<TargetLinkKind, string> = {
	integration: 'Intégration',
	exchange: 'Échange'
};

/** Seul un automate lit d'autres cibles : une gateway LoRa n'intègre rien. */
export function canIntegrate(kind: TargetKind): boolean {
	return kind === 'controller';
}

/** Liaison d'intégration qui fait lire cette cible par un automate, s'il y en a une. */
export function integrationOf(links: readonly TargetLink[], targetId: string): TargetLink | undefined {
	return links.find((link) => link.kind === 'integration' && link.targetId === targetId);
}

/**
 * Chaîne de remontée d'une cible, elle-même comprise, en suivant les automates
 * qui l'intègrent. S'arrête sur une boucle plutôt que de tourner indéfiniment.
 */
export function uplinkChain(targets: readonly Target[], links: readonly TargetLink[], targetId: string): { chain: Target[]; cycle: boolean } {
	const byId = new Map(targets.map((item) => [item.id, item]));
	const chain: Target[] = [];
	const seen = new Set<string>();
	let current = byId.get(targetId);
	while (current) {
		if (seen.has(current.id)) return { chain, cycle: true };
		seen.add(current.id);
		chain.push(current);
		const parentId = integrationOf(links, current.id)?.sourceId;
		current = parentId ? byId.get(parentId) : undefined;
	}
	return { chain, cycle: false };
}

/** Superviseur atteint en remontant la chaîne, ou null si elle est interrompue. */
export function rootSupervisorId(targets: readonly Target[], links: readonly TargetLink[], targetId: string): string | null {
	const { chain, cycle } = uplinkChain(targets, links, targetId);
	if (cycle) return null;
	return chain.at(-1)?.supervisorId ?? null;
}

/** Toutes les cibles intégrées, directement ou non, par `targetId`. */
export function descendantIds(links: readonly TargetLink[], targetId: string): Set<string> {
	const result = new Set<string>();
	const queue = [targetId];
	while (queue.length) {
		const current = queue.shift()!;
		for (const link of links) {
			if (link.kind !== 'integration' || link.sourceId !== current) continue;
			if (link.targetId === targetId || result.has(link.targetId)) continue;
			result.add(link.targetId);
			queue.push(link.targetId);
		}
	}
	return result;
}

/** Cibles qui remontent vers ce superviseur, via un automate intégrateur ou non. */
export function targetsUnderSupervisor(targets: readonly Target[], links: readonly TargetLink[], supervisorId: string): string[] {
	return targets.filter((item) => rootSupervisorId(targets, links, item.id) === supervisorId).map((item) => item.id);
}

/** Même paire de cibles, dans un sens ou dans l'autre. */
export function samePair(link: Pick<TargetLink, 'sourceId' | 'targetId'>, a: string, b: string): boolean {
	return (link.sourceId === a && link.targetId === b) || (link.sourceId === b && link.targetId === a);
}

/**
 * Liaison admissible entre deux cibles. `ignoreId` exclut la liaison en cours de
 * modification, pour pouvoir changer son type sans se heurter à elle-même.
 */
export function canConnect(
	targets: readonly Target[],
	links: readonly TargetLink[],
	kind: TargetLinkKind,
	sourceId: string,
	targetId: string,
	ignoreId?: string
): boolean {
	if (sourceId === targetId) return false;
	const source = targets.find((item) => item.id === sourceId);
	if (!source || !targets.some((item) => item.id === targetId)) return false;
	const others = links.filter((link) => link.id !== ignoreId);
	if (others.some((link) => samePair(link, sourceId, targetId))) return false;
	if (kind === 'exchange') return true;
	// Une cible n'est lue que par un seul automate, et jamais par ce qu'elle intègre déjà.
	if (!canIntegrate(source.kind) || integrationOf(others, targetId)) return false;
	return !descendantIds(others, targetId).has(sourceId);
}

/**
 * Liaison créée par un glisser-déposer ou un « Lier » : un automate relié à une
 * gateway l'intègre, quel que soit le sens du geste ; entre deux automates ou
 * deux gateways, c'est un échange. Retombe sur l'échange si l'intégration est
 * impossible (cible déjà lue par un autre automate, boucle).
 */
export function inferLink(
	targets: readonly Target[],
	links: readonly TargetLink[],
	fromId: string,
	toId: string
): Pick<TargetLink, 'kind' | 'sourceId' | 'targetId'> | null {
	const from = targets.find((item) => item.id === fromId);
	const to = targets.find((item) => item.id === toId);
	if (!from || !to) return null;
	const reader = canIntegrate(from.kind) && !canIntegrate(to.kind) ? from : canIntegrate(to.kind) && !canIntegrate(from.kind) ? to : null;
	if (reader) {
		const read = reader === from ? to : from;
		if (canConnect(targets, links, 'integration', reader.id, read.id)) return { kind: 'integration', sourceId: reader.id, targetId: read.id };
	}
	return canConnect(targets, links, 'exchange', fromId, toId) ? { kind: 'exchange', sourceId: fromId, targetId: toId } : null;
}

/** Protocole proposé par défaut : Modbus TCP pour lire une gateway, BACnet/IP entre automates. */
export function defaultLinkProtocol(targets: readonly Target[], link: Pick<TargetLink, 'kind' | 'targetId'>): UplinkProtocol {
	const read = targets.find((item) => item.id === link.targetId);
	return link.kind === 'integration' && read?.kind === 'lora-gateway' ? 'Modbus TCP' : 'BACnet/IP';
}

/**
 * Libellé de la chaîne de remontée : « Modbus TCP → Automate CTA → BACnet/IP ».
 * Une chaîne interrompue s'arrête au dernier maillon connu.
 */
export function uplinkPath(targets: readonly Target[], links: readonly TargetLink[], supervisors: readonly Supervisor[], targetId: string): string {
	const known = new Set(supervisors.map((item) => item.id));
	const steps: string[] = [];
	uplinkChain(targets, links, targetId).chain.forEach((item, index) => {
		if (index > 0) steps.push(item.name);
		const integration = integrationOf(links, item.id);
		if (integration) steps.push(integration.protocol);
		else if (item.supervisorId && known.has(item.supervisorId)) steps.push(item.uplink);
	});
	return steps.join(' → ');
}

/**
 * Nettoie les liaisons d'un projet importé : extrémités disparues, boucles sur
 * soi, doublons et secondes intégrations d'une même cible sont retirés.
 */
export function sanitizeLinks(raw: unknown, targets: readonly Target[], protocols: readonly string[]): TargetLink[] {
	if (!Array.isArray(raw)) return [];
	const known = new Set(targets.map((item) => item.id));
	const kept: TargetLink[] = [];
	for (const entry of raw as Partial<TargetLink>[]) {
		if (!entry || typeof entry.id !== 'string' || typeof entry.sourceId !== 'string' || typeof entry.targetId !== 'string') continue;
		const { sourceId, targetId } = entry;
		if (sourceId === targetId || !known.has(sourceId) || !known.has(targetId)) continue;
		if (kept.some((link) => samePair(link, sourceId, targetId))) continue;
		const kind: TargetLinkKind = entry.kind === 'integration' ? 'integration' : 'exchange';
		if (kind === 'integration' && integrationOf(kept, targetId)) continue;
		const protocol = protocols.includes(entry.protocol as string) ? (entry.protocol as UplinkProtocol) : 'BACnet/IP';
		kept.push({ id: entry.id, kind, sourceId, targetId, protocol });
	}
	return kept;
}

/**
 * Projets enregistrés avec la première version des liaisons : la remontée vers
 * un automate était portée par `upstreamTargetId` sur la cible. On la convertit
 * en liaison d'intégration, avec le protocole de remontée de la cible.
 */
export function migrateUpstreams(rawTargets: unknown, rawLinks: unknown): unknown[] {
	const links = Array.isArray(rawLinks) ? [...rawLinks] : [];
	if (!Array.isArray(rawTargets)) return links;
	for (const target of rawTargets as Array<{ id?: unknown; upstreamTargetId?: unknown; uplink?: unknown }>) {
		if (typeof target?.id !== 'string' || typeof target.upstreamTargetId !== 'string') continue;
		links.push({ id: `link-migre-${target.id}`, kind: 'integration', sourceId: target.upstreamTargetId, targetId: target.id, protocol: target.uplink });
	}
	return links;
}
