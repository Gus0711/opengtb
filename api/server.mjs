// Mini-API d'opengtb — zéro dépendance (node:http + node:sqlite), zéro cookie.
//
// GET    /api/hits           → { count }                 compteur de visites (lecture)
// POST   /api/hits           → { count }                 incrémente, 1 fois / IP / 30 min
// GET    /api/messages       → { messages, hasMore, turnstileSiteKey }   (?before=<id>)
// POST   /api/messages       → { message }               publication directe, anti-spam en couches
// DELETE /api/messages/:id   → 204                       modération (Authorization: Bearer $ADMIN_TOKEN)
//
// Persistance dans /data (volume Docker) : hits.json + messages.db (SQLite).
// Aucune IP n'est stockée sur disque : l'anti-flood travaille sur un hash salé, en mémoire.

import { createServer } from 'node:http';
import { readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const PORT = Number(process.env.PORT ?? 8080);
const DATA_DIR = process.env.DATA_DIR ?? '/data';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? '';
const TURNSTILE_SITE_KEY = process.env.TURNSTILE_SITE_KEY ?? '';
const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET ?? '';
const NTFY_URL = process.env.NTFY_URL ?? '';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;

mkdirSync(DATA_DIR, { recursive: true });

// ───────────────────────── utilitaires HTTP ─────────────────────────

function send(res, status, body) {
	res.writeHead(status, {
		'Content-Type': 'application/json; charset=utf-8',
		'Cache-Control': 'no-store'
	});
	res.end(body === undefined ? undefined : JSON.stringify(body));
}

function clientIp(req) {
	return (
		req.headers['cf-connecting-ip'] ??
		req.headers['x-forwarded-for']?.split(',')[0].trim() ??
		req.socket.remoteAddress
	);
}

// Sel régénéré à chaque démarrage : le hash n'est pas réversible ni corrélable dans le temps.
const IP_SALT = randomBytes(16);
const ipKey = (req) => createHash('sha256').update(IP_SALT).update(String(clientIp(req))).digest('hex');

function readJson(req, maxBytes = 8 * 1024) {
	return new Promise((resolve, reject) => {
		let size = 0;
		const chunks = [];
		req.on('data', (c) => {
			size += c.length;
			if (size > maxBytes) {
				reject(new HttpError(413, 'Message trop volumineux.'));
				req.destroy();
			} else chunks.push(c);
		});
		req.on('end', () => {
			try {
				resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
			} catch {
				reject(new HttpError(400, 'JSON invalide.'));
			}
		});
		req.on('error', reject);
	});
}

class HttpError extends Error {
	constructor(status, message) {
		super(message);
		this.status = status;
	}
}

// ───────────────────────── compteur de visites ─────────────────────────

const HITS_FILE = join(DATA_DIR, 'hits.json');
const HITS_DEDUPE_MS = 30 * MIN;

let hits = 0;
try {
	hits = JSON.parse(readFileSync(HITS_FILE, 'utf8')).count ?? 0;
} catch {
	// premier démarrage : pas encore de fichier
}

function flushHits() {
	const tmp = HITS_FILE + '.tmp';
	writeFileSync(tmp, JSON.stringify({ count: hits }));
	renameSync(tmp, HITS_FILE);
}

let hitsDirty = false;
setInterval(() => {
	if (!hitsDirty) return;
	hitsDirty = false;
	flushHits();
}, 5000).unref();

const hitSeen = new Map();

function handleHits(req, res) {
	if (req.method === 'POST') {
		const key = ipKey(req);
		const now = Date.now();
		const last = hitSeen.get(key);
		if (last === undefined || now - last > HITS_DEDUPE_MS) {
			hits++;
			hitsDirty = true;
		}
		hitSeen.set(key, now);
		return send(res, 200, { count: hits });
	}
	if (req.method === 'GET' || req.method === 'HEAD') return send(res, 200, { count: hits });
	return send(res, 405, { error: 'Méthode non autorisée.' });
}

// ───────────────────────── fil de messages ─────────────────────────

const db = new DatabaseSync(join(DATA_DIR, 'messages.db'));
db.exec(`
	PRAGMA journal_mode = WAL;
	CREATE TABLE IF NOT EXISTS messages (
		id         INTEGER PRIMARY KEY AUTOINCREMENT,
		author     TEXT    NOT NULL,
		topic      TEXT    NOT NULL,
		body       TEXT    NOT NULL,
		created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
	);
`);

const PAGE_SIZE = 30;
const stmtList = db.prepare(
	'SELECT id, author, topic, body, created_at FROM messages WHERE id < ? ORDER BY id DESC LIMIT ?'
);
const stmtInsert = db.prepare(
	'INSERT INTO messages (author, topic, body) VALUES (?, ?, ?) RETURNING id, author, topic, body, created_at'
);
const stmtDuplicate = db.prepare(
	"SELECT 1 FROM messages WHERE body = ? AND created_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-1 day') LIMIT 1"
);
const stmtDelete = db.prepare('DELETE FROM messages WHERE id = ?');

// Anti-flood : 1 message / 10 min et 5 / 24 h par IP (hashée, en mémoire).
const RATE_GAP_MS = 10 * MIN;
const RATE_DAY_MAX = 5;
const posts = new Map(); // ipKey → timestamps[]
setInterval(() => {
	const cutoff = Date.now() - 24 * HOUR;
	for (const [k, ts] of posts) {
		const kept = ts.filter((t) => t > cutoff);
		if (kept.length) posts.set(k, kept);
		else posts.delete(k);
	}
}, HOUR).unref();

function checkRate(key) {
	const now = Date.now();
	const ts = (posts.get(key) ?? []).filter((t) => now - t < 24 * HOUR);
	if (ts.length && now - ts[ts.length - 1] < RATE_GAP_MS) {
		const wait = Math.ceil((RATE_GAP_MS - (now - ts[ts.length - 1])) / MIN);
		throw new HttpError(429, `Doucement :) Réessaie dans ${wait} min.`);
	}
	if (ts.length >= RATE_DAY_MAX) {
		throw new HttpError(429, 'Limite de messages atteinte pour aujourd’hui.');
	}
}

function recordPost(key) {
	const ts = posts.get(key) ?? [];
	ts.push(Date.now());
	posts.set(key, ts);
}

// Texte brut uniquement : on retire les caractères de contrôle (sauf \n) et on
// compresse les lignes vides. L'échappement HTML est fait par Svelte à l'affichage.
const clean = (s, { multiline }) => {
	let out = String(s ?? '')
		.normalize('NFC')
		.replace(/\r\n?/g, '\n')
		// eslint-disable-next-line no-control-regex
		.replace(/[\u0000-\u0009\u000B-\u001F\u007F​-‏‪-‮⁦-⁩]/g, '');
	out = multiline ? out.replace(/\n{3,}/g, '\n\n') : out.replace(/\n/g, ' ');
	return out.trim();
};

const LINK_RE = /(https?:\/\/|www\.)/gi;
const HAS_LINK = /(https?:\/\/|www\.)/i;

async function verifyTurnstile(token, ip) {
	if (!TURNSTILE_SECRET) return true; // non configuré (dev) : on s'appuie sur les autres couches
	if (!token) return false;
	try {
		const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
			method: 'POST',
			body: new URLSearchParams({ secret: TURNSTILE_SECRET, response: token, remoteip: ip }),
			signal: AbortSignal.timeout(5000)
		});
		return (await r.json()).success === true;
	} catch {
		return false;
	}
}

function notify(msg) {
	if (!NTFY_URL) return;
	fetch(NTFY_URL, {
		method: 'POST',
		headers: { Title: `opengtb · ${msg.author} [${msg.topic}]`, Tags: 'speech_balloon' },
		body: msg.body.slice(0, 500),
		signal: AbortSignal.timeout(5000)
	}).catch(() => {});
}

function isAdmin(req) {
	if (!ADMIN_TOKEN) return false;
	const given = Buffer.from(String(req.headers.authorization ?? '').replace(/^Bearer\s+/i, ''));
	const expected = Buffer.from(ADMIN_TOKEN);
	return given.length === expected.length && timingSafeEqual(given, expected);
}

async function handleMessages(req, res, url, id) {
	if (id !== undefined) {
		if (req.method !== 'DELETE') return send(res, 405, { error: 'Méthode non autorisée.' });
		if (!isAdmin(req)) return send(res, 401, { error: 'Non autorisé.' });
		stmtDelete.run(id);
		return send(res, 204);
	}

	if (req.method === 'GET') {
		const before = Number(url.searchParams.get('before')) || Number.MAX_SAFE_INTEGER;
		const rows = stmtList.all(before, PAGE_SIZE + 1);
		return send(res, 200, {
			messages: rows.slice(0, PAGE_SIZE),
			hasMore: rows.length > PAGE_SIZE,
			turnstileSiteKey: TURNSTILE_SITE_KEY || null
		});
	}

	if (req.method !== 'POST') return send(res, 405, { error: 'Méthode non autorisée.' });

	const input = await readJson(req);

	// Pot de miel : un humain ne remplit jamais ce champ invisible. On fait
	// semblant d'accepter pour ne pas renseigner le bot.
	if (input.website) return send(res, 201, { message: null });

	// Formulaire soumis trop vite pour avoir été rempli à la main.
	if (!(Number(input.elapsed) >= 3000)) {
		throw new HttpError(400, 'Envoi trop rapide — prends le temps de relire :)');
	}

	const author = clean(input.author, { multiline: false });
	const topic = String(input.topic ?? '');
	const body = clean(input.body, { multiline: true });

	if (author.length < 2 || author.length > 30) throw new HttpError(400, 'Pseudo : 2 à 30 caractères.');
	if (!/^[a-z0-9-]{1,30}$/.test(topic)) throw new HttpError(400, 'Sujet invalide.');
	if (body.length < 3 || body.length > 1000) throw new HttpError(400, 'Message : 3 à 1000 caractères.');
	if ((body.match(LINK_RE) ?? []).length > 1) throw new HttpError(400, 'Un seul lien par message.');
	if (HAS_LINK.test(author)) throw new HttpError(400, 'Pas de lien dans le pseudo.');

	const key = ipKey(req);
	checkRate(key);

	if (!(await verifyTurnstile(input.turnstileToken, clientIp(req)))) {
		throw new HttpError(403, 'Vérification anti-robot échouée — recharge la page et réessaie.');
	}

	if (stmtDuplicate.get(body)) throw new HttpError(409, 'Ce message a déjà été publié.');

	const message = stmtInsert.get(author, topic, body);
	recordPost(key);
	notify(message);
	return send(res, 201, { message });
}

// ───────────────────────── routeur ─────────────────────────

createServer(async (req, res) => {
	const url = new URL(req.url, 'http://api');
	try {
		if (url.pathname === '/api/hits') return handleHits(req, res);
		if (url.pathname === '/api/messages') return await handleMessages(req, res, url);
		const m = url.pathname.match(/^\/api\/messages\/(\d+)$/);
		if (m) return await handleMessages(req, res, url, Number(m[1]));
		return send(res, 404, { error: 'Introuvable.' });
	} catch (err) {
		if (err instanceof HttpError) return send(res, err.status, { error: err.message });
		console.error(err);
		return send(res, 500, { error: 'Erreur interne.' });
	}
}).listen(PORT, () => {
	console.log(`api listening on :${PORT} (hits=${hits})`);
	if (!TURNSTILE_SECRET) console.warn('TURNSTILE_SECRET absent : vérification anti-robot désactivée');
	if (!ADMIN_TOKEN) console.warn('ADMIN_TOKEN absent : modération désactivée');
});

// Flush final à l'arrêt du conteneur.
for (const sig of ['SIGTERM', 'SIGINT']) {
	process.on(sig, () => {
		flushHits();
		db.close();
		process.exit(0);
	});
}
