import { createSegment, defaultSegmentName, nextFreeDeviceAddress, segmentProfile } from './bus';
import { UPLINK_PROTOCOLS, type BusKind, type Equipment, type EquipmentKind, type MapperDocument, type PointKind, type Segment, type SegmentMedia, type Supervisor, type SupervisorKind, type Target, type TargetKind, type UplinkProtocol } from './types';

export const POINT_COLORS: Record<PointKind, string> = {
	AI: '#38bdf8',
	AO: '#f59e0b',
	DI: '#a78bfa',
	DO: '#f472b6',
	MODBUS: '#34d399',
	BACNET: '#22d3ee',
	MBUS: '#e879f9',
	LORA: '#fb7185'
};

export const SIGNAL_PRESETS: Record<PointKind, readonly string[]> = {
	AI: ['PT1000', 'NTC 10k', '0–10 V', '4–20 mA', 'Résistance', 'Impulsion'],
	AO: ['0–10 V', '4–20 mA'],
	DI: ['Contact sec', '24 V AC/DC', 'Impulsion'],
	DO: ['Contact relais', '24 V AC/DC', 'Triac'],
	MODBUS: ['Modbus RTU (RS485)', 'Modbus TCP/IP', 'Modbus RTU', 'Modbus TCP'],
	BACNET: ['BACnet MS/TP', 'BACnet/IP'],
	MBUS: ['M-Bus'],
	LORA: ['LoRaWAN']
};

export function defaultSignal(kind: PointKind): string {
	return SIGNAL_PRESETS[kind][0];
}

export const TARGET_DEFINITIONS: Record<TargetKind, { label: string; defaultName: string; uplink: UplinkProtocol }> = {
	controller: { label: 'Automate', defaultName: 'Automate GTB', uplink: 'BACnet/IP' },
	'lora-gateway': { label: 'Gateway LoRa', defaultName: 'Gateway LoRaWAN', uplink: 'MQTT' }
};

export const SUPERVISOR_DEFINITIONS: Record<SupervisorKind, { label: string; defaultName: string; hint: string }> = {
	scada: { label: 'Superviseur', defaultName: 'Supervision GTB', hint: 'Poste local · SCADA' },
	cloud: { label: 'Plateforme cloud', defaultName: 'Plateforme cloud', hint: 'LNS · IoT · API' }
};

/** Couleur des liaisons de remontée cible → superviseur. */
export const UPLINK_COLOR = '#2dd4bf';

export function createTarget(kind: TargetKind, id: string, name: string): Target {
	return { id, kind, name, supervisorId: null, uplink: TARGET_DEFINITIONS[kind].uplink, segments: [] };
}

export function createSupervisor(kind: SupervisorKind, id: string, name: string): Supervisor {
	return { id, kind, name };
}

/**
 * Les projets enregistrés avant l'ajout du niveau supervision n'ont ni
 * `supervisorId` ni `uplink` : on complète à l'import plutôt que de rejeter.
 */
export function normalizeTarget(raw: Partial<Target> & { id: string; kind: TargetKind; name: string }): Target {
	const kind = raw.kind in TARGET_DEFINITIONS ? raw.kind : 'controller';
	const uplink = UPLINK_PROTOCOLS.includes(raw.uplink as UplinkProtocol) ? (raw.uplink as UplinkProtocol) : TARGET_DEFINITIONS[kind].uplink;
	return { id: raw.id, kind, name: raw.name, supervisorId: raw.supervisorId ?? null, uplink, segments: Array.isArray(raw.segments) ? raw.segments : [] };
}

/** Les projets anterieurs au modele de bus n'ont pas de champ `bus` sur leurs equipements. */
export function normalizeEquipment(raw: Equipment): Equipment {
	const protocol = EQUIPMENT_DEFINITIONS[raw.kind]?.protocol ?? null;
	if (!protocol) return { ...raw, bus: null };
	return { ...raw, bus: raw.bus ? { ...raw.bus } : { segmentId: null, address: '' } };
}

export const EQUIPMENT_DEFINITIONS: Record<
	EquipmentKind,
	{ label: string; defaultName: string; protocol?: { kind: BusKind; signal: string; media: SegmentMedia }; points: Array<{ name: string; kind: PointKind; signal: string }> }
> = {
	boiler: {
		label: 'Chaudière',
		defaultName: 'Chaudière 01',
		points: [
			{ name: 'Consigne puissance', kind: 'AO', signal: '0–10 V' },
			{ name: 'Autorisation marche', kind: 'DO', signal: 'TOR' },
			{ name: 'Retour marche', kind: 'DI', signal: 'Contact sec' },
			{ name: 'Défaut général', kind: 'DI', signal: 'Contact sec' }
		]
	},
	pump: {
		label: 'Pompe',
		defaultName: 'Pompe circuit 01',
		points: [
			{ name: 'Commande vitesse', kind: 'AO', signal: '0–10 V' },
			{ name: 'Autorisation marche', kind: 'DO', signal: 'TOR' },
			{ name: 'Retour marche', kind: 'DI', signal: 'Contact sec' },
			{ name: 'Défaut variateur', kind: 'DI', signal: 'Contact sec' }
		]
	},
	'heating-circuit': {
		label: 'Circuit chauffage V3V',
		defaultName: 'Circuit chauffage 01',
		points: [
			{ name: 'Température départ', kind: 'AI', signal: 'PT1000' },
			{ name: 'Température retour', kind: 'AI', signal: 'PT1000' },
			{ name: 'Commande vanne 3 voies', kind: 'AO', signal: '0–10 V' },
			{ name: 'Commande pompe', kind: 'DO', signal: 'Contact relais' },
			{ name: 'Retour marche pompe', kind: 'DI', signal: 'Contact sec' },
			{ name: 'Défaut pompe', kind: 'DI', signal: 'Contact sec' }
		]
	},
	ahu: {
		label: 'CTA double flux',
		defaultName: 'CTA 01',
		points: [
			{ name: 'Température soufflage', kind: 'AI', signal: 'PT1000' },
			{ name: 'Température reprise', kind: 'AI', signal: 'PT1000' },
			{ name: 'Température air neuf', kind: 'AI', signal: 'PT1000' },
			{ name: 'Commande ventilateur soufflage', kind: 'DO', signal: 'Contact relais' },
			{ name: 'Retour marche ventilateur soufflage', kind: 'DI', signal: 'Contact sec' },
			{ name: 'Vitesse ventilateur soufflage', kind: 'AO', signal: '0–10 V' },
			{ name: 'Commande ventilateur reprise', kind: 'DO', signal: 'Contact relais' },
			{ name: 'Retour marche ventilateur reprise', kind: 'DI', signal: 'Contact sec' },
			{ name: 'Vitesse ventilateur reprise', kind: 'AO', signal: '0–10 V' },
			{ name: 'Vanne batterie chaude', kind: 'AO', signal: '0–10 V' },
			{ name: 'Commande récupérateur', kind: 'AO', signal: '0–10 V' },
			{ name: 'Encrassement filtre soufflage', kind: 'DI', signal: 'Contact sec' },
			{ name: 'Encrassement filtre reprise', kind: 'DI', signal: 'Contact sec' },
			{ name: 'Thermostat antigel', kind: 'DI', signal: 'Contact sec' }
		]
	},
	'heat-pump': {
		label: 'Pompe à chaleur',
		defaultName: 'PAC 01',
		points: [
			{ name: 'Autorisation marche', kind: 'DO', signal: 'Contact relais' },
			{ name: 'Consigne température', kind: 'AO', signal: '0–10 V' },
			{ name: 'Retour marche', kind: 'DI', signal: 'Contact sec' },
			{ name: 'Défaut général', kind: 'DI', signal: 'Contact sec' },
			{ name: 'Température départ', kind: 'AI', signal: 'PT1000' },
			{ name: 'Température retour', kind: 'AI', signal: 'PT1000' }
		]
	},
	chiller: {
		label: 'Groupe froid',
		defaultName: 'Groupe froid 01',
		points: [
			{ name: 'Autorisation marche', kind: 'DO', signal: 'Contact relais' },
			{ name: 'Consigne eau glacée', kind: 'AO', signal: '0–10 V' },
			{ name: 'Retour marche', kind: 'DI', signal: 'Contact sec' },
			{ name: 'Défaut général', kind: 'DI', signal: 'Contact sec' },
			{ name: 'Température départ eau glacée', kind: 'AI', signal: 'PT1000' },
			{ name: 'Température retour eau glacée', kind: 'AI', signal: 'PT1000' }
		]
	},
	'fan-coil': {
		label: 'Ventilo-convecteur',
		defaultName: 'Ventilo 01',
		points: [
			{ name: 'Température ambiante', kind: 'AI', signal: 'NTC 10k' },
			{ name: 'Décalage de consigne', kind: 'AI', signal: 'Résistance' },
			{ name: 'Vanne chaud', kind: 'AO', signal: '0–10 V' },
			{ name: 'Vanne froid', kind: 'AO', signal: '0–10 V' },
			{ name: 'Vitesse ventilateur', kind: 'AO', signal: '0–10 V' },
			{ name: 'Contact fenêtre', kind: 'DI', signal: 'Contact sec' }
		]
	},
	dhw: {
		label: 'Production ECS',
		defaultName: 'ECS 01',
		points: [
			{ name: 'Température ballon', kind: 'AI', signal: 'PT1000' },
			{ name: 'Température retour bouclage', kind: 'AI', signal: 'PT1000' },
			{ name: 'Commande pompe de charge', kind: 'DO', signal: 'Contact relais' },
			{ name: 'Commande pompe de bouclage', kind: 'DO', signal: 'Contact relais' },
			{ name: 'Retour marche pompe de bouclage', kind: 'DI', signal: 'Contact sec' },
			{ name: 'Défaut pompe de bouclage', kind: 'DI', signal: 'Contact sec' }
		]
	},
	'extract-fan': {
		label: 'Extracteur / VMC',
		defaultName: 'Extracteur 01',
		points: [
			{ name: 'Commande marche', kind: 'DO', signal: 'Contact relais' },
			{ name: 'Retour marche', kind: 'DI', signal: 'Contact sec' },
			{ name: 'Défaut', kind: 'DI', signal: 'Contact sec' },
			{ name: 'Contrôle débit (pressostat)', kind: 'DI', signal: 'Contact sec' }
		]
	},
	'outdoor-sensor': {
		label: 'Sonde extérieure',
		defaultName: 'Sonde extérieure',
		points: [{ name: 'Température extérieure', kind: 'AI', signal: 'NTC 10k' }]
	},
	'temperature-sensor': {
		label: 'Sonde de température',
		defaultName: 'Sonde départ',
		points: [{ name: 'Température', kind: 'AI', signal: 'PT1000' }]
	},
	'energy-meter': {
		label: 'Compteur d’énergie',
		defaultName: 'Compteur énergie',
		protocol: { kind: 'MODBUS', signal: 'Modbus RTU (RS485)', media: 'rs485' },
		points: [
			{ name: 'Énergie cumulée', kind: 'MODBUS', signal: 'Modbus RTU (RS485)' },
			{ name: 'Puissance instantanée', kind: 'MODBUS', signal: 'Modbus RTU (RS485)' }
		]
	},
	'lora-sensor': {
		label: 'Capteur LoRa',
		defaultName: 'Capteur LoRa',
		protocol: { kind: 'LORA', signal: 'LoRaWAN', media: 'lorawan' },
		points: [
			{ name: 'Température ambiante', kind: 'LORA', signal: 'LoRaWAN' },
			{ name: 'Niveau de batterie', kind: 'LORA', signal: 'LoRaWAN' }
		]
	},
	'modbus-rtu-device': {
		label: 'Device Modbus RS485',
		defaultName: 'Équipement Modbus RS485',
		protocol: { kind: 'MODBUS', signal: 'Modbus RTU (RS485)', media: 'rs485' },
		points: [{ name: 'Valeur 1', kind: 'MODBUS', signal: 'Modbus RTU (RS485)' }]
	},
	'modbus-tcp-device': {
		label: 'Device Modbus IP',
		defaultName: 'Équipement Modbus TCP/IP',
		protocol: { kind: 'MODBUS', signal: 'Modbus TCP/IP', media: 'ip' },
		points: [{ name: 'Valeur 1', kind: 'MODBUS', signal: 'Modbus TCP/IP' }]
	},
	'bacnet-mstp-device': {
		label: 'Device BACnet MS/TP',
		defaultName: 'Équipement BACnet MS/TP',
		protocol: { kind: 'BACNET', signal: 'BACnet MS/TP', media: 'rs485' },
		points: [{ name: 'Objet 1', kind: 'BACNET', signal: 'BACnet MS/TP' }]
	},
	'bacnet-ip-device': {
		label: 'Device BACnet/IP',
		defaultName: 'Équipement BACnet/IP',
		protocol: { kind: 'BACNET', signal: 'BACnet/IP', media: 'ip' },
		points: [{ name: 'Objet 1', kind: 'BACNET', signal: 'BACnet/IP' }]
	},
	'mbus-device': {
		label: 'Compteur M-Bus',
		defaultName: 'Compteur M-Bus',
		protocol: { kind: 'MBUS', signal: 'M-Bus', media: 'mbus' },
		points: [{ name: 'Index compteur', kind: 'MBUS', signal: 'M-Bus' }]
	},
	custom: {
		label: 'Équipement libre',
		defaultName: 'Équipement',
		points: [{ name: 'Nouveau point', kind: 'AI', signal: '0–10 V' }]
	}
};

function point(id: string, name: string, kind: PointKind, signal: string, targetId: string | null, address: string) {
	return { id, name, kind, signal, targetId, address };
}

const LORA_SEGMENT = createSegment('LORA', 'lorawan', 'segment-lora-1', defaultSegmentName('LORA', 'lorawan', 1));

export const DEFAULT_MAPPER: MapperDocument = {
	title: 'Régulation chaufferie',
	supervisors: [{ id: 'supervisor-1', kind: 'scada', name: 'Supervision chaufferie' }],
	targets: [
		{ id: 'controller-1', kind: 'controller', name: 'Automate chaufferie', supervisorId: 'supervisor-1', uplink: 'BACnet/IP', segments: [] },
		{ id: 'lora-gateway-1', kind: 'lora-gateway', name: 'Gateway LoRaWAN', supervisorId: 'supervisor-1', uplink: 'MQTT', segments: [LORA_SEGMENT] }
	],
	equipment: [
		{
			id: 'boiler-1',
			kind: 'boiler',
			name: 'Chaudière 01',
			bus: null,
			points: [
				point('boiler-ao', 'Consigne puissance', 'AO', '0–10 V', 'controller-1', 'AO1'),
				point('boiler-do', 'Autorisation marche', 'DO', 'TOR', 'controller-1', 'DO1'),
				point('boiler-di-1', 'Retour marche', 'DI', 'Contact sec', 'controller-1', 'DI1'),
				point('boiler-di-2', 'Défaut général', 'DI', 'Contact sec', 'controller-1', 'DI2')
			]
		},
		{
			id: 'sensor-1',
			kind: 'temperature-sensor',
			name: 'Sonde départ chaudière',
			bus: null,
			points: [point('sensor-ai', 'Température départ', 'AI', 'PT1000', 'controller-1', 'AI1')]
		},
		{
			id: 'lora-sensor-1',
			kind: 'lora-sensor',
			name: 'Sonde ambiance LoRa',
			bus: { segmentId: 'segment-lora-1', address: '' },
			points: [point('lora-temp', 'Température ambiance', 'LORA', 'LoRaWAN', 'lora-gateway-1', 'DEV-01')]
		}
	]
};

export function createEquipment(kind: EquipmentKind, id: string): Equipment {
	const definition = EQUIPMENT_DEFINITIONS[kind];
	return {
		id,
		kind,
		name: definition.defaultName,
		bus: definition.protocol ? { segmentId: null, address: '' } : null,
		points: definition.points.map((template, index) => ({
			id: `${id}-point-${index + 1}`,
			...template,
			address: '',
			targetId: null
		}))
	};
}

export function equipmentProtocol(kind: EquipmentKind) {
	return EQUIPMENT_DEFINITIONS[kind].protocol ?? null;
}

/** Couple protocole/media que cet equipement exige du segment qui l'accueille. */
export function equipmentBus(kind: EquipmentKind): { kind: BusKind; media: SegmentMedia } | null {
	const protocol = EQUIPMENT_DEFINITIONS[kind].protocol;
	return protocol ? { kind: protocol.kind, media: protocol.media } : null;
}

/**
 * Reclasse les equipements bus des projets anterieurs au modele de segment :
 * leurs points reseau etaient affectes a une cible sans qu'aucun bus n'existe.
 * On deduit la cible des points deja affectes, on cree le segment manquant et
 * on alloue l'adresse d'equipement quand elle releve de l'etude.
 */
export function migrateBusAttachments(input: MapperDocument): MapperDocument {
	const targets = input.targets.map((target) => ({ ...target, segments: [...target.segments] }));
	const byId = new Map(targets.map((target) => [target.id, target]));
	const knownSegments = new Set(targets.flatMap((target) => target.segments.map((segment) => segment.id)));
	const usedAddresses = new Map<string, Set<string>>();
	for (const item of input.equipment) {
		const segmentId = item.bus?.segmentId;
		if (!segmentId || !knownSegments.has(segmentId)) continue;
		const address = item.bus?.address?.trim();
		if (address) usedAddresses.set(segmentId, (usedAddresses.get(segmentId) ?? new Set()).add(address));
	}

	let counter = 0;
	const equipment = input.equipment.map((item) => {
		const required = equipmentBus(item.kind);
		if (!required) return item.bus === null ? item : { ...item, bus: null };
		if (item.bus?.segmentId && knownSegments.has(item.bus.segmentId)) return item;

		const targetId = item.points.find((point) => point.targetId)?.targetId ?? null;
		const host = targetId ? byId.get(targetId) : undefined;
		if (!host) return item.bus ? item : { ...item, bus: { segmentId: null, address: '' } };

		let segment = host.segments.find((entry) => entry.kind === required.kind && entry.media === required.media);
		if (!segment) {
			const occurrence = host.segments.filter((entry) => entry.kind === required.kind).length + 1;
			segment = createSegment(required.kind, required.media, `segment-migre-${++counter}`, defaultSegmentName(required.kind, required.media, occurrence));
			host.segments.push(segment);
			knownSegments.add(segment.id);
		}

		const used = usedAddresses.get(segment.id) ?? new Set<string>();
		const kept = item.bus?.address?.trim() ?? '';
		const address = kept || nextFreeDeviceAddress(segmentProfile(segment), used);
		if (address) used.add(address);
		usedAddresses.set(segment.id, used);
		return { ...item, bus: { segmentId: segment.id, address } };
	});

	return { ...input, targets, equipment };
}

/** Segment du bon protocole sur cette cible, cree au besoin. */
export function ensureSegment(target: Target, kind: BusKind, media: SegmentMedia, id: string): { target: Target; segment: Segment } {
	const existing = target.segments.find((segment) => segment.kind === kind && segment.media === media);
	if (existing) return { target, segment: existing };
	const occurrence = target.segments.filter((segment) => segment.kind === kind).length + 1;
	const segment = createSegment(kind, media, id, defaultSegmentName(kind, media, occurrence));
	return { target: { ...target, segments: [...target.segments, segment] }, segment };
}

export function targetAccepts(targetKind: TargetKind, pointKind: PointKind): boolean {
	return targetKind === 'lora-gateway' ? pointKind === 'LORA' : pointKind !== 'LORA';
}

/** Ordre d'affichage dans la palette. */
export const SUPERVISOR_PALETTE: readonly SupervisorKind[] = ['scada', 'cloud'];
export const TARGET_PALETTE: readonly TargetKind[] = ['controller', 'lora-gateway'];

export interface EquipmentFamily {
	id: string;
	label: string;
	hint: string;
	color: string;
	kinds: readonly EquipmentKind[];
}

/**
 * Regroupement des équipements par famille de raccordement, pour la palette.
 * Chaque EquipmentKind doit apparaître dans exactement une famille (cf. mapper.test.ts).
 */
export const EQUIPMENT_FAMILIES: readonly EquipmentFamily[] = [
	{ id: 'hvac', label: 'CVC', hint: 'Modèles métier', color: POINT_COLORS.AO, kinds: ['boiler', 'heating-circuit', 'pump', 'ahu', 'heat-pump', 'chiller', 'fan-coil', 'dhw', 'extract-fan'] },
	{ id: 'wired', label: 'Câblé', hint: 'AI · AO · DI · DO', color: POINT_COLORS.AI, kinds: ['temperature-sensor', 'outdoor-sensor', 'custom'] },
	{ id: 'modbus', label: 'Modbus', hint: 'RTU · TCP', color: POINT_COLORS.MODBUS, kinds: ['energy-meter', 'modbus-rtu-device', 'modbus-tcp-device'] },
	{ id: 'bacnet', label: 'BACnet', hint: 'MS/TP · IP', color: POINT_COLORS.BACNET, kinds: ['bacnet-mstp-device', 'bacnet-ip-device'] },
	{ id: 'mbus', label: 'M-Bus', hint: 'Comptage', color: POINT_COLORS.MBUS, kinds: ['mbus-device'] },
	{ id: 'lorawan', label: 'LoRaWAN', hint: 'Radio', color: POINT_COLORS.LORA, kinds: ['lora-sensor'] }
];

/** Gabarit d'adresse d'un point selon son type. */
export function formatAddress(kind: PointKind, index: number): string {
	if (kind === 'LORA') return `DEV-${String(index).padStart(2, '0')}`;
	if (kind === 'MODBUS') return `HR${index}`;
	if (kind === 'BACNET') return `AV${index}`;
	if (kind === 'MBUS') return `PRI-${String(index).padStart(3, '0')}`;
	return `${kind}${index}`;
}

/**
 * Premiere adresse libre pour ce type sur une cible. Compter les points
 * existants ne suffit pas : apres suppression d'un point au milieu d'une
 * serie, le compteur retombe sur une adresse deja prise.
 */
export function nextFreeAddress(kind: PointKind, used: Iterable<string>): string {
	const taken = new Set(
		[...used].map((value) => value.trim().toUpperCase()).filter(Boolean)
	);
	for (let index = 1; index <= 9999; index += 1) {
		const candidate = formatAddress(kind, index);
		if (!taken.has(candidate.toUpperCase())) return candidate;
	}
	return formatAddress(kind, taken.size + 1);
}

/** « Pompe circuit 01 » + 2 → « Pompe circuit 02 » ; « Automate GTB » + 2 → « Automate GTB 2 ». */
export function numberedName(defaultName: string, occurrence: number): string {
	if (occurrence <= 1) return defaultName;
	const match = defaultName.match(/^(.*?)(\d+)$/);
	if (!match) return `${defaultName} ${occurrence}`;
	const [, prefix, digits] = match;
	return `${prefix}${String(Number(digits) + occurrence - 1).padStart(digits.length, '0')}`;
}

/** Premier nom numerote qui ne soit pas deja porte par un bloc du projet. */
export function uniqueName(defaultName: string, existing: Iterable<string>): string {
	const taken = new Set([...existing].map((value) => value.trim().toLocaleLowerCase('fr')));
	for (let occurrence = 1; occurrence <= 999; occurrence += 1) {
		const candidate = numberedName(defaultName, occurrence);
		if (!taken.has(candidate.toLocaleLowerCase('fr'))) return candidate;
	}
	return defaultName;
}
