import { decodeCayenneLPP } from './cayenne-lpp';
import type {
	CodecOutput,
	DecodeFailure,
	DecodeResult,
	DecodeSuccess,
	EncodeFailure,
	EncodeResult,
	EncodeSuccess,
	EncoderOutput,
	ManifestDevice,
	PayloadFormat,
	ResultRow
} from './types';

type DecodeFn = (input: { bytes: number[]; fPort: number }) => CodecOutput;
type EncodeFn = (input: { data: unknown; fPort?: number }) => EncoderOutput;

interface LoadedCodec {
	decode: DecodeFn | null;
	encode: EncodeFn | null;
}

const codecCache = new Map<string, LoadedCodec>();

const CODECS_BASE = '/data/lorawan-codecs/';

/**
 * Trampoline ajouté à la fin du source TTN brut pour exposer un couple
 * { decode, encode } unifié. Cherche `decodeUplink` et `encodeDownlink`
 * en top-level OU via namespace `codec.*`. Renvoie null pour les
 * fonctions absentes (l'encoder est optionnel selon le vendor).
 */
const RUNTIME_TRAMPOLINE = `
;return {
  decode: (typeof decodeUplink === 'function')
    ? decodeUplink
    : (typeof codec !== 'undefined' && codec && typeof codec.decodeUplink === 'function'
      ? codec.decodeUplink
      : null),
  encode: (typeof encodeDownlink === 'function')
    ? encodeDownlink
    : (typeof codec !== 'undefined' && codec && typeof codec.encodeDownlink === 'function'
      ? codec.encodeDownlink
      : null)
};
`;

function wrapDecode(raw: DecodeFn): DecodeFn {
	return (input) => {
		try {
			const out = raw(input);
			// Normalise les codecs v3 qui retournent { data, warnings, errors }
			// et les rares cas où data est nullish.
			return {
				data:
					((out && typeof out === 'object' && 'data' in out ? out.data : out) as Record<
						string,
						unknown
					>) ?? {},
				warnings: Array.isArray(out?.warnings) ? out!.warnings : [],
				errors: Array.isArray(out?.errors) ? out!.errors : []
			};
		} catch (e) {
			return {
				data: {},
				warnings: [],
				errors: [(e as Error)?.message ?? String(e)]
			};
		}
	};
}

function wrapEncode(raw: EncodeFn): EncodeFn {
	return (input) => {
		try {
			const out = raw(input) as Partial<EncoderOutput> | undefined;
			return {
				bytes: Array.isArray(out?.bytes) ? out!.bytes : [],
				fPort: typeof out?.fPort === 'number' ? out!.fPort : input.fPort,
				warnings: Array.isArray(out?.warnings) ? out!.warnings : [],
				errors: Array.isArray(out?.errors) ? out!.errors : []
			};
		} catch (e) {
			return {
				bytes: [],
				fPort: input.fPort,
				warnings: [],
				errors: [(e as Error)?.message ?? String(e)]
			};
		}
	};
}

async function loadCodec(device: ManifestDevice): Promise<LoadedCodec> {
	const cached = codecCache.get(device.slug);
	if (cached) return cached;

	if (device.codecFile === 'internal:cayenne-lpp') {
		const result: LoadedCodec = { decode: decodeCayenneLPP, encode: null };
		codecCache.set(device.slug, result);
		return result;
	}

	const url = `${CODECS_BASE}${device.codecFile}`;
	const r = await fetch(url);
	if (!r.ok) throw new Error(`Codec indisponible (HTTP ${r.status}) — ${url}`);
	const source = await r.text();

	let raw: { decode: DecodeFn | null; encode: EncodeFn | null };
	try {
		raw = new Function(source + RUNTIME_TRAMPOLINE)() as typeof raw;
	} catch (e) {
		throw new Error(`Le codec n'a pas pu être chargé : ${(e as Error).message ?? String(e)}`);
	}

	const decode = typeof raw?.decode === 'function' ? wrapDecode(raw.decode) : null;
	const encode = typeof raw?.encode === 'function' ? wrapEncode(raw.encode) : null;

	if (!decode) {
		throw new Error('Le codec ne définit pas de fonction decodeUplink utilisable');
	}

	const result: LoadedCodec = { decode, encode };
	codecCache.set(device.slug, result);
	return result;
}

/**
 * Aplatit récursivement l'objet data en lignes clé/valeur pour l'affichage.
 * Détecte le pattern { value: number, unit: string } et formate "X unit".
 */
export function buildRows(data: Record<string, unknown>, prefix = ''): ResultRow[] {
	const rows: ResultRow[] = [];
	for (const [k, raw] of Object.entries(data)) {
		const key = prefix ? `${prefix}.${k}` : k;
		if (raw === null || raw === undefined) {
			rows.push({ key, value: 'null', kind: 'null' });
		} else if (typeof raw === 'number') {
			rows.push({ key, value: formatNumber(raw), kind: 'number' });
		} else if (typeof raw === 'boolean') {
			rows.push({ key, value: raw ? 'true' : 'false', kind: 'boolean' });
		} else if (typeof raw === 'string') {
			rows.push({ key, value: raw, kind: 'string' });
		} else if (Array.isArray(raw)) {
			rows.push({ key, value: JSON.stringify(raw), kind: 'array' });
		} else if (typeof raw === 'object') {
			const obj = raw as Record<string, unknown>;
			// Pattern { value, unit }
			if (
				Object.keys(obj).length === 2 &&
				typeof obj.value === 'number' &&
				typeof obj.unit === 'string'
			) {
				rows.push({
					key,
					value: `${formatNumber(obj.value)} ${obj.unit}`,
					kind: 'number'
				});
			} else {
				rows.push(...buildRows(obj, key));
			}
		}
	}
	return rows;
}

function formatNumber(n: number): string {
	if (!Number.isFinite(n)) return String(n);
	if (Number.isInteger(n)) return String(n);
	// 4 décimales max, sans zéros trailing
	return Number(n.toFixed(4)).toString();
}

export interface DecodeRequest {
	device: ManifestDevice;
	bytes: number[];
	fPort: number;
	format: PayloadFormat;
}

const MAX_PAYLOAD_BYTES = 256;

/**
 * Orchestre le décodage : charge le codec, l'exécute, normalise le résultat.
 * Retourne soit un DecodeSuccess avec rows, soit un DecodeFailure typé.
 */
export async function decode(req: DecodeRequest): Promise<DecodeResult> {
	if (req.bytes.length === 0) {
		return decodeFailure('parse-payload', 'Payload vide après parsing');
	}
	if (req.bytes.length > MAX_PAYLOAD_BYTES) {
		return decodeFailure(
			'parse-payload',
			`Payload trop long (${req.bytes.length} octets, max ${MAX_PAYLOAD_BYTES}). LoRaWAN limite la taille utile à quelques dizaines d'octets.`
		);
	}
	if (req.fPort < 1 || req.fPort > 223 || !Number.isInteger(req.fPort)) {
		return decodeFailure('parse-payload', `fPort hors plage applicative LoRaWAN (1–223)`);
	}

	let loaded: LoadedCodec;
	try {
		loaded = await loadCodec(req.device);
	} catch (e) {
		return decodeFailure('load-codec', (e as Error)?.message ?? String(e));
	}

	if (!loaded.decode) {
		return decodeFailure('load-codec', 'Décodeur non disponible pour ce device');
	}

	const out = loaded.decode({ bytes: req.bytes, fPort: req.fPort });
	const errors = out.errors ?? [];
	const warnings = out.warnings ?? [];
	const isEmpty = !out.data || Object.keys(out.data).length === 0;
	if (errors.length > 0 && isEmpty) {
		return decodeFailure(
			'execute-codec',
			"Le codec n'a pas pu décoder ce payload sur ce fPort",
			errors
		);
	}

	const success: DecodeSuccess = {
		ok: true,
		device: req.device,
		fPort: req.fPort,
		bytes: req.bytes,
		format: req.format,
		data: out.data ?? {},
		rows: buildRows(out.data ?? {}),
		warnings: [...warnings, ...errors]
	};
	return success;
}

function decodeFailure(
	stage: DecodeFailure['stage'],
	message: string,
	codecErrors?: string[]
): DecodeFailure {
	return { ok: false, stage, message, codecErrors };
}

export interface EncodeRequest {
	device: ManifestDevice;
	/** Donnée structurée à envoyer à `encodeDownlink({ data, fPort })`. */
	data: unknown;
	fPort: number;
}

/**
 * Orchestre l'encodage : charge le codec, exécute `encodeDownlink`, normalise
 * la sortie. Retourne soit un EncodeSuccess avec bytes/fPort, soit un
 * EncodeFailure typé.
 */
export async function encode(req: EncodeRequest): Promise<EncodeResult> {
	if (req.fPort < 1 || req.fPort > 223 || !Number.isInteger(req.fPort)) {
		return encodeFailure('parse-input', `fPort hors plage applicative LoRaWAN (1–223)`);
	}

	let loaded: LoadedCodec;
	try {
		loaded = await loadCodec(req.device);
	} catch (e) {
		return encodeFailure('load-codec', (e as Error)?.message ?? String(e));
	}

	if (!loaded.encode) {
		return encodeFailure(
			'load-codec',
			"Ce device n'expose pas d'encodeur downlink dans son codec TTN"
		);
	}

	const out = loaded.encode({ data: req.data, fPort: req.fPort });
	const errors = out.errors ?? [];
	const warnings = out.warnings ?? [];

	if (errors.length > 0 && (!out.bytes || out.bytes.length === 0)) {
		return encodeFailure(
			'execute-encoder',
			"Le codec n'a pas pu encoder ces données sur ce fPort",
			errors
		);
	}
	if (!out.bytes || out.bytes.length === 0) {
		return encodeFailure('execute-encoder', "Le codec a renvoyé un payload vide", errors);
	}

	const success: EncodeSuccess = {
		ok: true,
		device: req.device,
		data: req.data,
		bytes: out.bytes,
		fPort: typeof out.fPort === 'number' ? out.fPort : req.fPort,
		warnings: [...warnings, ...errors]
	};
	return success;
}

function encodeFailure(
	stage: EncodeFailure['stage'],
	message: string,
	codecErrors?: string[]
): EncodeFailure {
	return { ok: false, stage, message, codecErrors };
}

/** Helper pour les tests : invalide le cache des codecs. */
export function _clearCache(): void {
	codecCache.clear();
}
