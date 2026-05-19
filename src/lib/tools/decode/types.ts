export type PayloadFormat = 'hex' | 'base64';

export type CodecFormat = 'ttn-v3' | 'ttn-v2';

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
	/** Soit "codecs/<slug>.js" pour un codec TTN, soit "internal:<key>" pour un décodeur natif. */
	codecFile: string;
	codecFormat: CodecFormat;
	productURL?: string;
	examples: PayloadExample[];
}

export interface PayloadExample {
	description?: string;
	fPort: number;
	bytes: number[];
}

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
