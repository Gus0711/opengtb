export const POINT_KINDS = ['AI', 'AO', 'DI', 'DO', 'MODBUS', 'BACNET', 'MBUS', 'LORA'] as const;

export const UPLINK_PROTOCOLS = ['BACnet/IP', 'Modbus TCP', 'OPC UA', 'MQTT', 'HTTPS / API', 'SNMP'] as const;

export type PointKind = (typeof POINT_KINDS)[number];
/** Protocole de remontée d'une cible vers la supervision. */
export type UplinkProtocol = (typeof UPLINK_PROTOCOLS)[number];
export type TargetKind = 'controller' | 'lora-gateway';
export type SupervisorKind = 'scada' | 'cloud';

export const SEGMENT_MEDIA = ['rs485', 'ip', 'mbus', 'lorawan'] as const;
export type SegmentMedia = (typeof SEGMENT_MEDIA)[number];
export type SegmentParity = 'none' | 'even' | 'odd';
/** Types de points qui transitent par un bus plutot que par une E/S cablee. */
export type BusKind = Extract<PointKind, 'MODBUS' | 'BACNET' | 'MBUS' | 'LORA'>;

/**
 * Un segment est un port de communication porte par une cible : une paire
 * RS485, un reseau IP, une boucle M-Bus. Les equipements s'y raccordent avec
 * une adresse unique sur le segment.
 */
export interface Segment {
	id: string;
	kind: BusKind;
	media: SegmentMedia;
	name: string;
	/** Vitesse en bauds ; 0 pour les medias non series (IP, LoRaWAN). */
	baud: number;
	parity: SegmentParity;
	stopBits: 1 | 2;
}

/** Raccordement d'un equipement a un segment, avec son adresse d'equipement. */
export interface EquipmentBus {
	segmentId: string | null;
	address: string;
}
export type EquipmentKind =
	| 'boiler'
	| 'pump'
	| 'heating-circuit'
	| 'ahu'
	| 'heat-pump'
	| 'chiller'
	| 'fan-coil'
	| 'dhw'
	| 'extract-fan'
	| 'outdoor-sensor'
	| 'temperature-sensor'
	| 'energy-meter'
	| 'lora-sensor'
	| 'modbus-rtu-device'
	| 'modbus-tcp-device'
	| 'bacnet-mstp-device'
	| 'bacnet-ip-device'
	| 'mbus-device'
	| 'custom';

export interface GtbPoint {
	id: string;
	name: string;
	kind: PointKind;
	signal: string;
	address: string;
	targetId: string | null;
}

export interface Equipment {
	id: string;
	kind: EquipmentKind;
	name: string;
	points: GtbPoint[];
	/** null pour un equipement cable en E/S directes (AI/AO/DI/DO). */
	bus: EquipmentBus | null;
}

/**
 * Niveau intermédiaire : collecte les points des équipements de terrain
 * et les remonte à un superviseur.
 */
export interface Target {
	id: string;
	kind: TargetKind;
	name: string;
	/** Superviseur destinataire ; sans objet quand la cible est intégrée par un automate. */
	supervisorId: string | null;
	uplink: UplinkProtocol;
	segments: Segment[];
}

/**
 * - `integration` : l'automate `sourceId` lit la cible `targetId` (gateway LoRa,
 *   automate esclave). La cible intégrée remonte en supervision à travers lui.
 * - `exchange`    : échange pair-à-pair (points partagés entre automates), non
 *   orienté et hors de la chaîne de remontée.
 */
export type TargetLinkKind = 'integration' | 'exchange';

/** Liaison entre deux cibles, distincte de la remontée vers la supervision. */
export interface TargetLink {
	id: string;
	kind: TargetLinkKind;
	sourceId: string;
	targetId: string;
	protocol: UplinkProtocol;
}

/** Niveau haut : poste de supervision local ou plateforme cloud. */
export interface Supervisor {
	id: string;
	kind: SupervisorKind;
	name: string;
}

export interface MapperPosition {
	x: number;
	y: number;
}

export interface MapperViewport extends MapperPosition {
	zoom: number;
}

export interface MapperLayout {
	positions: Record<string, MapperPosition>;
	viewport?: MapperViewport;
}

export interface MapperDocument {
	version?: 1;
	title: string;
	supervisors: Supervisor[];
	targets: Target[];
	equipment: Equipment[];
	/** Absent des projets antérieurs aux liaisons entre cibles. */
	links?: TargetLink[];
	layout?: MapperLayout;
}
