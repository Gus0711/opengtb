// Client API Météo-France DPClim (Données Publiques de Climatologie).
//
// Doc : https://portail-api.meteofrance.fr/web/fr/api/DPClim
//
// Pattern : OAuth2 client_credentials puis commande asynchrone
// (POST /commande-station → id-cmde → polling GET /commande/fichier).

export const BASE_URL = 'https://public-api.meteofrance.fr/public/DPClim/v1';
export const TOKEN_URL = 'https://portail-api.meteofrance.fr/token';

export interface RawStation {
	id: string;
	nom: string;
	lat: number;
	lon: number;
	alt: number;
	posteOuvert: boolean;
	typePoste?: number;
	dateDebut?: string;
	dateFin?: string;
}

export interface MfClientOptions {
	/** ID applicatif base64 fourni par le portail Météo-France (cf. .env). */
	applicationId: string;
	/** Délai entre tentatives de polling, en ms. Défaut : 2000. */
	pollDelayMs?: number;
	/** Nombre max de tentatives de polling pour un fichier. Défaut : 30 (~1 min). */
	pollMaxAttempts?: number;
}

interface TokenCache {
	value: string;
	expiresAt: number;
}

export class MfClient {
	readonly applicationId: string;
	readonly pollDelayMs: number;
	readonly pollMaxAttempts: number;
	private token: TokenCache | null = null;

	constructor(opts: MfClientOptions) {
		if (!opts.applicationId) {
			throw new Error('MfClient: applicationId est requis (cf. .env MF_APPLICATION_ID).');
		}
		this.applicationId = opts.applicationId;
		this.pollDelayMs = opts.pollDelayMs ?? 2000;
		this.pollMaxAttempts = opts.pollMaxAttempts ?? 30;
	}

	async getToken(): Promise<string> {
		const now = Date.now();
		if (this.token && this.token.expiresAt > now + 30_000) {
			return this.token.value;
		}
		const res = await fetch(TOKEN_URL, {
			method: 'POST',
			headers: {
				Authorization: `Basic ${this.applicationId}`,
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: 'grant_type=client_credentials'
		});
		if (!res.ok) {
			const text = await res.text().catch(() => '');
			throw new Error(`MF auth failed: HTTP ${res.status} — ${text.slice(0, 200)}`);
		}
		const json = (await res.json()) as { access_token: string; expires_in: number };
		this.token = {
			value: json.access_token,
			expiresAt: now + (json.expires_in ?? 3600) * 1000
		};
		return this.token.value;
	}

	async fetchAuthed(url: string, init?: RequestInit): Promise<Response> {
		// Retry sur 429 (throttling MF) avec attente exponentielle.
		const maxRetries = 5;
		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			const token = await this.getToken();
			const headers = new Headers(init?.headers);
			headers.set('Authorization', `Bearer ${token}`);
			if (!headers.has('Accept')) headers.set('Accept', 'application/json');
			const res = await fetch(url, { ...init, headers });
			if (res.status !== 429 || attempt === maxRetries) return res;
			// MF répond ~1 min de quota window. On attend 65s + un peu de jitter.
			const waitMs = 65_000 + Math.floor(Math.random() * 5000);
			console.warn(
				`  [429] quota dépassé, attente ${Math.round(waitMs / 1000)}s (tentative ${attempt + 1}/${maxRetries})...`
			);
			await sleep(waitMs);
		}
		throw new Error('unreachable');
	}

	/** Liste les stations de relevés quotidiens pour un département (01–95, 2A, 2B, 971–976). */
	async listStations(departement: string | number): Promise<RawStation[]> {
		const url = `${BASE_URL}/liste-stations/quotidienne?id-departement=${departement}`;
		const res = await this.fetchAuthed(url);
		if (!res.ok) {
			const text = await res.text().catch(() => '');
			throw new Error(`listStations(${departement}) HTTP ${res.status}: ${text.slice(0, 200)}`);
		}
		return (await res.json()) as RawStation[];
	}

	/** Commande de données quotidiennes pour une station sur une période. Retourne l'id-cmde. */
	async orderDaily(stationId: string, startIso: string, endIso: string): Promise<string> {
		return this.order('quotidienne', stationId, startIso, endIso);
	}

	/** Commande de données mensuelles pour une station sur une période. */
	async orderMonthly(stationId: string, startIso: string, endIso: string): Promise<string> {
		return this.order('mensuelle', stationId, startIso, endIso);
	}

	private async order(
		kind: 'quotidienne' | 'mensuelle',
		stationId: string,
		startIso: string,
		endIso: string
	): Promise<string> {
		const url =
			`${BASE_URL}/commande-station/${kind}` +
			`?id-station=${encodeURIComponent(stationId)}` +
			`&date-deb-periode=${encodeURIComponent(startIso)}` +
			`&date-fin-periode=${encodeURIComponent(endIso)}`;
		const res = await this.fetchAuthed(url);
		if (!res.ok) {
			const text = await res.text().catch(() => '');
			throw new Error(
				`order(${kind}, ${stationId}) HTTP ${res.status}: ${text.slice(0, 200)}`
			);
		}
		const json = (await res.json()) as {
			elaboreProduitAvecDemandeResponse?: { return?: string };
		};
		const id = json?.elaboreProduitAvecDemandeResponse?.return;
		if (!id) {
			throw new Error(`order(${kind}, ${stationId}) : id-cmde absent dans la réponse`);
		}
		return id;
	}

	/** Récupère le fichier CSV d'une commande, en pollant jusqu'à disponibilité. */
	async fetchOrderFile(cmdId: string): Promise<string> {
		const url = `${BASE_URL}/commande/fichier?id-cmde=${encodeURIComponent(cmdId)}`;
		for (let attempt = 1; attempt <= this.pollMaxAttempts; attempt++) {
			const res = await this.fetchAuthed(url, { headers: { Accept: '*/*' } });
			if (res.status === 201) return await res.text();
			if (res.status === 204) {
				await sleep(this.pollDelayMs);
				continue;
			}
			if (res.status === 410) {
				throw new Error(`fetchOrderFile(${cmdId}) : commande expirée (HTTP 410)`);
			}
			const text = await res.text().catch(() => '');
			throw new Error(`fetchOrderFile(${cmdId}) HTTP ${res.status}: ${text.slice(0, 200)}`);
		}
		throw new Error(
			`fetchOrderFile(${cmdId}) : timeout après ${this.pollMaxAttempts} tentatives`
		);
	}

	/** Raccourci : commande mensuelle + polling + parsing CSV. */
	async fetchMonthly(
		stationId: string,
		startIso: string,
		endIso: string
	): Promise<CsvRecord[]> {
		const id = await this.orderMonthly(stationId, startIso, endIso);
		const csv = await this.fetchOrderFile(id);
		return parseCsv(csv);
	}

	/**
	 * Récupère les mensuelles sur une période arbitraire en respectant la
	 * limite "1 an max" de l'API DPClim. Splitte en chunks annuels
	 * (année calendaire) et concatène les résultats.
	 */
	async fetchMonthlyRange(
		stationId: string,
		startIso: string,
		endIso: string,
		opts?: { sleepBetweenMs?: number; onChunkError?: (chunk: [string, string], err: unknown) => void }
	): Promise<CsvRecord[]> {
		const sleepBetween = opts?.sleepBetweenMs ?? 500;
		const chunks = splitYearly(startIso, endIso);
		const all: CsvRecord[] = [];
		// Tolérant aux erreurs par chunk : une station peut avoir des trous
		// sur certaines années (ouverte tardivement, fermée temporairement).
		// On skip le chunk en erreur et on continue plutôt que tout perdre.
		for (let i = 0; i < chunks.length; i++) {
			const [s, e] = chunks[i];
			try {
				const rows = await this.fetchMonthly(stationId, s, e);
				all.push(...rows);
			} catch (err) {
				opts?.onChunkError?.([s, e], err);
			}
			if (i < chunks.length - 1) await sleep(sleepBetween);
		}
		return all;
	}

	/** Raccourci : commande quotidienne + polling + parsing CSV. */
	async fetchDaily(stationId: string, startIso: string, endIso: string): Promise<CsvRecord[]> {
		const id = await this.orderDaily(stationId, startIso, endIso);
		const csv = await this.fetchOrderFile(id);
		return parseCsv(csv);
	}
}

export type CsvRecord = Record<string, string>;

/**
 * Parse un CSV Météo-France : séparateur `;`, première ligne d'en-têtes,
 * valeurs manquantes représentées par `mq`. Renvoie un tableau d'objets
 * (header → valeur brute en string).
 */
export function parseCsv(csv: string): CsvRecord[] {
	const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
	if (lines.length < 2) return [];
	const headers = lines[0].split(';').map((h) => h.trim());
	const out: CsvRecord[] = [];
	for (let i = 1; i < lines.length; i++) {
		const cells = lines[i].split(';');
		const record: CsvRecord = {};
		for (let j = 0; j < headers.length; j++) {
			record[headers[j]] = (cells[j] ?? '').trim();
		}
		out.push(record);
	}
	return out;
}

/** Parse une valeur Météo-France en nombre. `mq` ou vide → null. Gère la virgule décimale. */
export function parseMfNumber(raw: string | undefined): number | null {
	if (raw == null) return null;
	const t = raw.trim();
	if (!t || t === 'mq') return null;
	const n = Number(t.replace(',', '.'));
	return Number.isFinite(n) ? n : null;
}

function sleep(ms: number): Promise<void> {
	return new Promise((r) => setTimeout(r, ms));
}

/**
 * Splitte une période [start, end[ en chunks annuels (frontières au 1er janvier).
 * Format date : ISO `YYYY-MM-DDT00:00:00Z`. Bornes alignées à minuit UTC.
 */
function splitYearly(startIso: string, endIso: string): Array<[string, string]> {
	const start = new Date(startIso);
	const end = new Date(endIso);
	const chunks: Array<[string, string]> = [];
	let cursor = start;
	while (cursor < end) {
		const nextYearStart = new Date(Date.UTC(cursor.getUTCFullYear() + 1, 0, 1));
		const chunkEnd = nextYearStart < end ? nextYearStart : end;
		chunks.push([toMfIso(cursor), toMfIso(chunkEnd)]);
		cursor = chunkEnd;
	}
	return chunks;
}

function toMfIso(d: Date): string {
	// MF impose HH:MM:SS = 00:00:00, sans millisecondes.
	return d.toISOString().replace('.000Z', 'Z');
}
