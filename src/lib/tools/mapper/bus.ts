import type {
	BusKind,
	Equipment,
	Segment,
	SegmentMedia,
	SegmentParity,
	Target
} from './types';

export const BUS_KINDS: readonly BusKind[] = ['MODBUS', 'BACNET', 'MBUS', 'LORA'];

export function isBusKind(kind: string): kind is BusKind {
	return (BUS_KINDS as readonly string[]).includes(kind);
}

export const MEDIA_LABELS: Record<SegmentMedia, string> = {
	rs485: 'RS485',
	ip: 'IP',
	mbus: 'M-Bus',
	lorawan: 'LoRaWAN'
};

export const PARITY_LABELS: Record<SegmentParity, string> = {
	none: 'N',
	even: 'E',
	odd: 'O'
};

export const BAUD_RATES = [1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200] as const;

/** Un media serie porte vitesse, parite et bits de stop ; IP et LoRaWAN non. */
export function isSerial(media: SegmentMedia): boolean {
	return media === 'rs485' || media === 'mbus';
}

export interface AddressProfile {
	/** Intitule de l'adresse pour ce couple protocole/media. */
	label: string;
	format: 'numeric' | 'ip' | 'eui';
	min: number;
	max: number;
	/** Equipements admis sur un segment sans repeteur ; null = pas de limite normative. */
	maxDevices: number | null;
	placeholder: string;
	/**
	 * 'design'        : l'integrateur alloue la valeur, elle fait partie de l'etude.
	 * 'commissioning' : la valeur est gravee par le fabricant et se releve sur site,
	 *                   donc facultative tant que le materiel n'est pas pose.
	 */
	assignment: 'design' | 'commissioning';
}

const ADDRESS_PROFILES: Record<string, AddressProfile> = {
	'MODBUS:rs485': { label: 'Adresse esclave', format: 'numeric', min: 1, max: 247, maxDevices: 32, placeholder: '1', assignment: 'design' },
	'MODBUS:ip': { label: 'Adresse IP', format: 'ip', min: 0, max: 0, maxDevices: null, placeholder: '192.168.1.50', assignment: 'design' },
	'BACNET:rs485': { label: 'Adresse MAC', format: 'numeric', min: 0, max: 127, maxDevices: 32, placeholder: '1', assignment: 'design' },
	'BACNET:ip': { label: 'Device instance', format: 'numeric', min: 0, max: 4194302, maxDevices: null, placeholder: '1001', assignment: 'design' },
	'MBUS:mbus': { label: 'Adresse primaire', format: 'numeric', min: 1, max: 250, maxDevices: 250, placeholder: '1', assignment: 'design' },
	// Le DevEUI est grave par le fabricant : rien a allouer en conception.
	'LORA:lorawan': { label: 'DevEUI', format: 'eui', min: 0, max: 0, maxDevices: null, placeholder: 'Relevé à la pose', assignment: 'commissioning' }
};

export function addressProfile(kind: BusKind, media: SegmentMedia): AddressProfile {
	return ADDRESS_PROFILES[`${kind}:${media}`] ?? ADDRESS_PROFILES['MODBUS:rs485'];
}

export function segmentProfile(segment: Segment): AddressProfile {
	return addressProfile(segment.kind, segment.media);
}

export function createSegment(kind: BusKind, media: SegmentMedia, id: string, name: string): Segment {
	return {
		id,
		kind,
		media,
		name,
		baud: media === 'rs485' ? 9600 : media === 'mbus' ? 2400 : 0,
		// Modbus RTU et M-Bus sont en parite paire par defaut ; BACnet MS/TP est en 8N1.
		parity: media === 'ip' || media === 'lorawan' ? 'none' : kind === 'BACNET' ? 'none' : 'even',
		stopBits: 1
	};
}

/** « Modbus RTU · RS485 » → nom lisible du segment, numerote s'il en existe deja. */
export function defaultSegmentName(kind: BusKind, media: SegmentMedia, occurrence: number): string {
	const base =
		kind === 'MBUS' ? 'Boucle M-Bus'
		: kind === 'LORA' ? 'Réseau LoRaWAN'
		: media === 'ip' ? `Réseau ${kind === 'BACNET' ? 'BACnet/IP' : 'Modbus TCP'}`
		: `Bus ${kind === 'BACNET' ? 'MS/TP' : 'Modbus RTU'}`;
	return occurrence > 1 ? `${base} ${occurrence}` : base;
}

/** Resume compact affiche sur le noeud cible : « 9600 8E1 » ou « TCP/IP ». */
export function segmentSummary(segment: Segment): string {
	if (!isSerial(segment.media)) return segment.media === 'ip' ? 'TCP/IP' : 'Radio';
	return `${segment.baud} 8${PARITY_LABELS[segment.parity]}${segment.stopBits}`;
}

export function findSegment(target: Target, kind: BusKind, media: SegmentMedia): Segment | null {
	return target.segments.find((segment) => segment.kind === kind && segment.media === media) ?? null;
}

export function segmentDevices(equipment: Equipment[], segmentId: string): Equipment[] {
	return equipment.filter((item) => item.bus?.segmentId === segmentId);
}

export function isValidDeviceAddress(profile: AddressProfile, address: string): boolean {
	const value = address.trim();
	if (!value) return false;
	if (profile.format === 'ip') {
		const octets = value.split('.');
		return octets.length === 4 && octets.every((octet) => /^\d{1,3}$/.test(octet) && Number(octet) <= 255);
	}
	if (profile.format === 'eui') return /^[0-9a-f]{16}$/i.test(value.replace(/[\s:-]/g, ''));
	return /^\d+$/.test(value) && Number(value) >= profile.min && Number(value) <= profile.max;
}

/**
 * Premiere adresse libre sur le segment. Les medias non numeriques (IP, DevEUI)
 * n'ont pas de suite naturelle : on laisse l'integrateur saisir la valeur.
 */
export function nextFreeDeviceAddress(profile: AddressProfile, used: Iterable<string>): string {
	if (profile.format !== 'numeric') return '';
	const taken = new Set([...used].map((value) => value.trim()).filter(Boolean));
	for (let value = profile.min; value <= profile.max; value += 1) {
		if (!taken.has(String(value))) return String(value);
	}
	return '';
}
