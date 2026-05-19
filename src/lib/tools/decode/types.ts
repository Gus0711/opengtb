export type PayloadFormat = 'hex' | 'base64';

/** Cibles d'export pour le téléchargement utilisateur. V1 : pas de legacy. */
export type CodecTarget = 'ttn-v3' | 'chirpstack-v4';

/** Mode d'utilisation de l'outil : décodage uplink ou encodage downlink. */
export type ToolMode = 'decode' | 'encode';

/** Entrée publique du manifest, telle que générée par scripts/decode/fetch-codecs.ts. */
export interface ManifestDevice {
	slug: string;
	vendorId: string;
	vendorName: string;
	deviceId: string;
	name: string;
	description?: string;
	sensors?: string[];
	regions: string[];
	fPorts: number[];
	/** Chemin du codec exécuté par le runtime web : "ttn-v3/<slug>.js" ou "internal:<key>". */
	codecFile: string;
	/**
	 * Fichiers téléchargeables prêts à coller dans le NS cible.
	 * Absent pour les décodeurs internes (ex. Cayenne LPP).
	 */
	downloads?: {
		ttnV3: string;
		chirpstackV4: string;
	};
	/** True si le codec expose une fonction encodeDownlink utilisable. */
	hasEncoder?: boolean;
	productURL?: string;
	examples: PayloadExample[];
	/** Exemples downlink (presets cliquables pour l'éditeur d'encodage). */
	downlinkExamples?: DownlinkExample[];
}

export interface PayloadExample {
	description?: string;
	fPort: number;
	bytes: number[];
}

/** Exemple downlink issu du YAML (preset cliquable). */
export interface DownlinkExample {
	description?: string;
	input: {
		data: unknown;
		fPort?: number;
	};
	output?: {
		bytes: number[];
		fPort?: number;
	};
}

/** Forme de retour standardisée d'un encoder downlink TTN v3 (officielle). */
export interface EncoderOutput {
	bytes: number[];
	fPort?: number;
	warnings?: string[];
	errors?: string[];
}

/** Sortie complète d'un encodage côté UI. */
export interface EncodeSuccess {
	ok: true;
	device: ManifestDevice;
	/** Donnée structurée envoyée à `encodeDownlink`. */
	data: unknown;
	bytes: number[];
	fPort: number;
	warnings: string[];
}

export interface EncodeFailure {
	ok: false;
	stage: 'parse-input' | 'load-codec' | 'execute-encoder';
	message: string;
	codecErrors?: string[];
}

export type EncodeResult = EncodeSuccess | EncodeFailure;

export interface Manifest {
	generatedAt: string;
	source: {
		repo: string;
		commit: string;
		commitDate: string;
	};
	vendors: { id: string; name: string; deviceCount: number }[];
	devices: ManifestDevice[];
	warnings: { vendor: string; device?: string; reason: string }[];
}

/** Forme de retour standardisée d'un codec TTN v3 (officielle). */
export interface CodecOutput {
	data: Record<string, unknown>;
	warnings?: string[];
	errors?: string[];
}

/** Sortie complète d'un décodage côté UI. */
export interface DecodeSuccess {
	ok: true;
	device: ManifestDevice;
	fPort: number;
	bytes: number[];
	format: PayloadFormat;
	/** Données brutes telles que retournées par le codec. */
	data: Record<string, unknown>;
	/** Tableau aplati clé / valeur pour l'affichage. */
	rows: ResultRow[];
	warnings: string[];
}

export interface DecodeFailure {
	ok: false;
	stage: 'parse-payload' | 'load-codec' | 'execute-codec';
	message: string;
	/** Erreurs additionnelles retournées par le codec lui-même. */
	codecErrors?: string[];
}

export type DecodeResult = DecodeSuccess | DecodeFailure;

/** Une ligne du tableau de résultat. */
export interface ResultRow {
	/** Chemin sérialisé de la clé (ex: "sensors.temperature"). */
	key: string;
	/** Valeur formatée pour affichage (string|number|bool stringifiés). */
	value: string;
	/** Type primitif détecté. */
	kind: 'number' | 'string' | 'boolean' | 'object' | 'array' | 'null';
}
