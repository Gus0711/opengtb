import { decodeCayenneLPP } from './cayenne-lpp';
import type {
	CodecOutput,
	DecodeFailure,
	DecodeResult,
	DecodeSuccess,
	ManifestDevice,
	PayloadFormat,
	ResultRow
} from './types';

type DecodeFn = (input: { bytes: number[]; fPort: number }) => CodecOutput;

const codecCache = new Map<string, DecodeFn>();

const CODECS_BASE = '/data/lorawan-codecs/';

/**
 * Trampoline ajouté à la fin du source TTN brut pour exposer une fonction
 * d'entrée unifiée, qu'il s'agisse d'un codec v3 (decodeUplink) ou legacy
 * v2 (Decoder). Renvoie null si rien n'est trouvé.
 */
const RUNTIME_TRAMPOLINE = `
;return (typeof decodeUplink === 'function')
  ? decodeUplink
  : (typeof Decoder === 'function'
    ? function(input) {
        try {
          return { data: Decoder(input.bytes, input.fPort), warnings: [], errors: [] };
        } catch (e) {
          return { data: {}, warnings: [], errors: [(e && e.message) ? e.message : String(e)] };
        }
      }
    : null);
`;

async function loadCodecFn(device: ManifestDevice): Promise<DecodeFn> {
	const cached = codecCache.get(device.slug);
	if (cached) return cached;

	if (device.codecFile === 'internal:cayenne-lpp') {
		codecCache.set(device.slug, decodeCayenneLPP);
		return decodeCayenneLPP;
	}

	const url = `${CODECS_BASE}${device.codecFile}`;
	const r = await fetch(url);
	if (!r.ok) throw new Error(`Codec indisponible (HTTP ${r.status}) — ${url}`);
	const source = await r.text();

	let fn: DecodeFn | null;
	try {
		fn = new Function(source + RUNTIME_TRAMPOLINE)() as DecodeFn | null;
	} catch (e) {
		throw new Error(
			`Le codec n'a pas pu être chargé : ${(e as Error).message ?? String(e)}`
		);
	}
	if (typeof fn !== 'function') {
		throw new Error('Le codec ne définit ni decodeUplink ni Decoder');
	}

	const wrapped: DecodeFn = (input) => {
		try {
			const out = fn!(input);
			// Normalise les codecs v3 qui retournent { data, warnings, errors }
			// et les rares cas où data est nullish.
			return {
				data: (out && typeof out === 'object' && 'data' in out ? out.data : out) as Record<string, unknown> ?? {},
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

	codecCache.set(device.slug, wrapped);
	return wrapped;
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
		return failure('parse-payload', 'Payload vide après parsing');
	}
	if (req.bytes.length > MAX_PAYLOAD_BYTES) {
		return failure(
			'parse-payload',
			`Payload trop long (${req.bytes.length} octets, max ${MAX_PAYLOAD_BYTES}). LoRaWAN limite la taille utile à quelques dizaines d'octets.`
		);
	}
	if (req.fPort < 1 || req.fPort > 223 || !Number.isInteger(req.fPort)) {
		return failure('parse-payload', `fPort hors plage applicative LoRaWAN (1–223)`);
	}

	let fn: DecodeFn;
	try {
		fn = await loadCodecFn(req.device);
	} catch (e) {
		return failure('load-codec', (e as Error)?.message ?? String(e));
	}

	const out = fn({ bytes: req.bytes, fPort: req.fPort });
	const errors = out.errors ?? [];
	const warnings = out.warnings ?? [];
	const isEmpty = !out.data || Object.keys(out.data).length === 0;
	if (errors.length > 0 && isEmpty) {
		return failure('execute-codec', 'Le codec n\'a pas pu décoder ce payload sur ce fPort', errors);
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

function failure(
	stage: DecodeFailure['stage'],
	message: string,
	codecErrors?: string[]
): DecodeFailure {
	return { ok: false, stage, message, codecErrors };
}

/** Helper pour les tests : invalide le cache des codecs. */
export function _clearCache(): void {
	codecCache.clear();
}
