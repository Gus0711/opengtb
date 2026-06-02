// Types métier de l'outil modbus.
// Source de vérité du schéma normalisé alimenté par scripts/modbus/build.ts.

export type ModbusFunction = 'coil' | 'discrete' | 'input' | 'holding';

export type ModbusDataType =
	| 'bool'
	| 'int16'
	| 'uint16'
	| 'int32'
	| 'uint32'
	| 'int64'
	| 'uint64'
	| 'float32'
	| 'float64'
	| 'string';

export type ModbusAccess = 'r' | 'w' | 'rw';

export type ModbusTransport = 'rtu' | 'tcp';

/** Ordre des octets / mots pour les types multi-registres (32/64 bits). */
export type WordOrder = 'AB-CD' | 'CD-AB' | 'BA-DC' | 'DC-BA';

export const EQUIPMENT_TYPES = [
	'compteur-elec',
	'compteur-th',
	'chaudiere',
	'pac',
	'onduleur-pv',
	'batterie',
	'wallbox',
	'vmc',
	'gateway',
	'es',
	'regulateur',
	'variateur',
	'autre'
] as const;

export type EquipmentType = (typeof EQUIPMENT_TYPES)[number];

export const EQUIPMENT_TYPE_LABELS: Record<EquipmentType, string> = {
	'compteur-elec': 'Compteur électrique',
	'compteur-th': 'Compteur thermique',
	chaudiere: 'Chaudière',
	pac: 'Pompe à chaleur',
	'onduleur-pv': 'Onduleur PV',
	batterie: 'Batterie / stockage',
	wallbox: 'Borne de recharge VE',
	vmc: 'VMC / CTA',
	gateway: 'Passerelle / module E-S',
	es: 'Module E/S',
	regulateur: 'Régulateur CVC',
	variateur: 'Variateur de vitesse',
	autre: 'Autre'
};

export interface ModbusRegister {
	/** Adresse décimale (la conversion hex est affichée). */
	address: number;
	function: ModbusFunction;
	/** Identifiant court d'origine upstream (snake/kebab/space). */
	name: string;
	/** Libellé FR (override), sinon `name` ou description upstream. */
	label?: string;
	dataType: ModbusDataType;
	/** Nombre de registres 16-bit occupés (1 pour uint16, 2 pour float32, etc.). */
	size: number;
	/** Ordre octets/mots — non spécifié = AB-CD par défaut (à vérifier). */
	wordOrder?: WordOrder;
	scale?: number;
	offset?: number;
	unit?: string;
	access: ModbusAccess;
	/** Map d'énum (clé string car JSON ne garde pas les int). */
	enum?: Record<string, string>;
	notes?: string;
}

export interface RtuConfig {
	baudrate?: number;
	parity?: 'none' | 'even' | 'odd';
	dataBits?: 5 | 6 | 7 | 8;
	stopBits?: 1 | 2;
	slaveIdDefault?: number;
}

export interface TcpConfig {
	port?: number;
	unitIdDefault?: number;
}

export type UpstreamSource =
	| 'jibrilsharafi'
	| 'ha-modbus-gateway'
	| 'ha-modbus-manager'
	| 'mbmd'
	| 'stiebel-eltron'
	| 'evcc'
	| 'iobroker'
	| 'opengtb';

export interface UpstreamInfo {
	source: UpstreamSource;
	/** SHA du commit upstream figé. */
	ref: string;
	/** URL d'origine (datasheet ou page constructeur) si fournie en amont. */
	sourceUrl?: string;
	/** True si l'origine est douteuse (tuto tiers, métadonnées vides) ou champs critiques manquants. */
	needsReview: boolean;
	/** Raisons concrètes du `needsReview` — utile pour l'UI. */
	reviewReasons?: string[];
}

export interface ModbusDevice {
	/** Slug global stable : `<vendorSlug>-<modelSlug>`. */
	slug: string;
	vendor: string;
	vendorSlug: string;
	model: string;
	modelSlug: string;
	/** Titre humain affiché ("Eastron SDM630"). */
	name: string;
	equipmentType: EquipmentType;
	transport: ModbusTransport[];
	defaults: { rtu?: RtuConfig; tcp?: TcpConfig };
	registers: ModbusRegister[];
	/** Markdown libre (notes intégration, gotchas, recettes). */
	doc?: string;
	datasheets?: { label: string; url: string }[];
	upstream: UpstreamInfo;
	tags?: string[];
}

/** Entrée légère du manifest (sans la table de registres complète). */
export interface ModbusManifestDevice {
	slug: string;
	vendor: string;
	vendorSlug: string;
	model: string;
	modelSlug: string;
	name: string;
	equipmentType: EquipmentType;
	transport: ModbusTransport[];
	registerCount: number;
	needsReview: boolean;
	tags?: string[];
}

export interface ModbusManifestSource {
	sha: string;
	deviceCount: number;
}

export interface ModbusManifest {
	generatedAt: string;
	sources: {
		jibrilsharafi: ModbusManifestSource;
		ha: ModbusManifestSource;
		mbmd: ModbusManifestSource;
		haModbusManager: ModbusManifestSource;
		stiebel: ModbusManifestSource;
		evcc: ModbusManifestSource;
		iobroker: ModbusManifestSource;
		overrides: { deviceCount: number };
	};
	devices: ModbusManifestDevice[];
	vendors: string[];
	equipmentTypes: EquipmentType[];
}
