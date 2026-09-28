import { describe, expect, it } from 'vitest';
import { createTarget, DEFAULT_MAPPER } from './data';
import { canConnect, defaultLinkProtocol, descendantIds, inferLink, migrateUpstreams, rootSupervisorId, sanitizeLinks, targetsUnderSupervisor, uplinkChain, uplinkPath } from './links';
import { mapperToCsv, renderMapperSvg } from './render';
import { UPLINK_PROTOCOLS, type Target, type TargetLink } from './types';

const supervisors = [{ id: 'scada', kind: 'scada', name: 'Supervision' } as const];
const target = (id: string, patch: Partial<Target> = {}): Target => ({ ...createTarget('controller', id, id), ...patch });
const reads = (sourceId: string, targetId: string, protocol: TargetLink['protocol'] = 'BACnet/IP'): TargetLink => ({ id: `${sourceId}>${targetId}`, kind: 'integration', sourceId, targetId, protocol });

// scada ← maitre ← esclave ← gateway
const maitre = target('maitre', { supervisorId: 'scada' });
const esclave = target('esclave');
const gateway = createTarget('lora-gateway', 'gw', 'Gateway');
const tree = [maitre, esclave, gateway];
const treeLinks = [reads('maitre', 'esclave'), reads('esclave', 'gw', 'Modbus TCP')];

describe('chaîne d’intégration', () => {
	it('remonte jusqu’au superviseur à travers les automates intégrateurs', () => {
		expect(uplinkChain(tree, treeLinks, 'gw').chain.map((item) => item.id)).toEqual(['gw', 'esclave', 'maitre']);
		expect(rootSupervisorId(tree, treeLinks, 'gw')).toBe('scada');
		expect(targetsUnderSupervisor(tree, treeLinks, 'scada')).toEqual(['maitre', 'esclave', 'gw']);
	});

	it('ignore les échanges pair-à-pair', () => {
		const exchange: TargetLink = { ...reads('maitre', 'esclave'), kind: 'exchange' };
		expect(rootSupervisorId(tree, [exchange], 'esclave')).toBeNull();
		expect(descendantIds([exchange], 'maitre').size).toBe(0);
	});

	it('ne trouve aucun superviseur si un maillon est coupé', () => {
		expect(rootSupervisorId([{ ...maitre, supervisorId: null }, esclave, gateway], treeLinks, 'gw')).toBeNull();
	});

	it('détecte une boucle sans tourner indéfiniment', () => {
		const loop = [reads('a', 'b'), reads('b', 'a')];
		expect(uplinkChain([target('a'), target('b')], loop, 'a').cycle).toBe(true);
		expect(rootSupervisorId([target('a'), target('b')], loop, 'a')).toBeNull();
	});

	it('liste les cibles intégrées par un automate', () => {
		expect([...descendantIds(treeLinks, 'maitre')]).toEqual(['esclave', 'gw']);
	});

	it('décrit le chemin de remontée avec le protocole de chaque intégration', () => {
		expect(uplinkPath(tree, treeLinks, supervisors, 'gw')).toBe('Modbus TCP → esclave → BACnet/IP → maitre → BACnet/IP');
		expect(uplinkPath(tree, treeLinks, supervisors, 'maitre')).toBe('BACnet/IP');
		expect(uplinkPath([target('seul')], [], supervisors, 'seul')).toBe('');
	});
});

describe('création des liaisons', () => {
	const auto = target('auto', { supervisorId: 'scada' });
	const autre = target('autre');
	const gw = createTarget('lora-gateway', 'gw', 'Gateway');
	const all = [auto, autre, gw];

	it('un automate relié à une gateway l’intègre, dans un sens comme dans l’autre', () => {
		expect(inferLink(all, [], 'gw', 'auto')).toEqual({ kind: 'integration', sourceId: 'auto', targetId: 'gw' });
		expect(inferLink(all, [], 'auto', 'gw')).toEqual({ kind: 'integration', sourceId: 'auto', targetId: 'gw' });
	});

	it('deux automates échangent par défaut', () => {
		expect(inferLink(all, [], 'auto', 'autre')).toEqual({ kind: 'exchange', sourceId: 'auto', targetId: 'autre' });
	});

	it('une gateway déjà intégrée ne peut être qu’en échange avec un second automate', () => {
		expect(inferLink(all, [reads('auto', 'gw')], 'gw', 'autre')).toEqual({ kind: 'exchange', sourceId: 'gw', targetId: 'autre' });
	});

	it('refuse doublons, boucles sur soi et intégration par une gateway', () => {
		expect(inferLink(all, [reads('auto', 'gw')], 'auto', 'gw')).toBeNull();
		expect(canConnect(all, [], 'exchange', 'auto', 'auto')).toBe(false);
		expect(canConnect(all, [], 'integration', 'gw', 'auto')).toBe(false);
		expect(canConnect(all, [reads('auto', 'autre')], 'integration', 'autre', 'auto')).toBe(false);
	});

	it('autorise à changer le type d’une liaison existante', () => {
		const exchange: TargetLink = { ...reads('auto', 'autre'), kind: 'exchange' };
		expect(canConnect(all, [exchange], 'integration', 'auto', 'autre', exchange.id)).toBe(true);
		expect(canConnect(all, [exchange], 'integration', 'auto', 'autre')).toBe(false);
	});

	it('propose Modbus TCP pour lire une gateway, BACnet/IP sinon', () => {
		expect(defaultLinkProtocol(all, { kind: 'integration', targetId: 'gw' })).toBe('Modbus TCP');
		expect(defaultLinkProtocol(all, { kind: 'exchange', targetId: 'autre' })).toBe('BACnet/IP');
	});
});

describe('import', () => {
	it('nettoie les liaisons importées', () => {
		const raw = [
			reads('maitre', 'esclave'),
			{ id: 'l2', kind: 'exchange', sourceId: 'esclave', targetId: 'maitre', protocol: 'BACnet/IP' },
			{ id: 'l3', kind: 'integration', sourceId: 'maitre', targetId: 'fantome', protocol: 'BACnet/IP' },
			{ id: 'l4', kind: 'exchange', sourceId: 'gw', targetId: 'gw', protocol: 'MQTT' },
			{ id: 'l5', sourceId: 'gw', targetId: 'maitre', protocol: 'Carotte' },
			{ id: 'l6', kind: 'integration', sourceId: 'gw', targetId: 'esclave', protocol: 'MQTT' },
			null
		];
		expect(sanitizeLinks(raw, tree, UPLINK_PROTOCOLS)).toEqual([
			reads('maitre', 'esclave'),
			{ id: 'l5', kind: 'exchange', sourceId: 'gw', targetId: 'maitre', protocol: 'BACnet/IP' }
		]);
		expect(sanitizeLinks('pas un tableau', tree, UPLINK_PROTOCOLS)).toEqual([]);
	});

	it('convertit l’ancienne remontée vers un automate en intégration', () => {
		const rawTargets = [{ id: 'gw', upstreamTargetId: 'maitre', uplink: 'Modbus TCP' }, { id: 'maitre', upstreamTargetId: null }];
		expect(migrateUpstreams(rawTargets, undefined)).toEqual([
			{ id: 'link-migre-gw', kind: 'integration', sourceId: 'maitre', targetId: 'gw', protocol: 'Modbus TCP' }
		]);
	});
});

describe('exports', () => {
	const doc = {
		...DEFAULT_MAPPER,
		targets: [DEFAULT_MAPPER.targets[0], { ...DEFAULT_MAPPER.targets[1], supervisorId: null }],
		links: [
			{ id: 'l1', kind: 'integration' as const, sourceId: 'controller-1', targetId: 'lora-gateway-1', protocol: 'Modbus TCP' as const },
			{ id: 'l2', kind: 'exchange' as const, sourceId: 'controller-1', targetId: 'lora-gateway-1', protocol: 'OPC UA' as const }
		]
	};

	it('attribue au point LoRa le superviseur de l’automate intégrateur', () => {
		expect(mapperToCsv(doc)).toContain('"Gateway LoRaWAN";"Réseau LoRaWAN";"";"DEV-01";"Supervision chaufferie";"Modbus TCP → Automate chaufferie → BACnet/IP"');
	});

	it('dessine l’intégration fléchée et l’échange en pointillés', () => {
		const svg = renderMapperSvg(doc);
		expect(svg).toContain('marker-end="url(#mapper-arrow)"');
		expect(svg).toContain('stroke-dasharray="6 4"');
		expect(svg).toContain('>Modbus TCP</text>');
		expect(svg).not.toContain('NON REMONTÉ');
	});
});
