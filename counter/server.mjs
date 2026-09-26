// Compteur de visites « à l'ancienne » — zéro dépendance, zéro cookie.
// GET  /api/hits → { count }            (lecture seule)
// POST /api/hits → { count }            (incrémente, 1 fois / IP / 30 min)
// Persistance : un simple fichier JSON dans /data (volume Docker).

import { createServer } from 'node:http';
import { readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const PORT = Number(process.env.PORT ?? 8080);
const DATA_DIR = process.env.DATA_DIR ?? '/data';
const FILE = join(DATA_DIR, 'hits.json');
const DEDUPE_MS = 30 * 60 * 1000;

mkdirSync(DATA_DIR, { recursive: true });

let count = 0;
try {
	count = JSON.parse(readFileSync(FILE, 'utf8')).count ?? 0;
} catch {
	// premier démarrage : pas encore de fichier
}

// Écriture atomique (tmp + rename) pour ne jamais corrompre le fichier.
let dirty = false;
setInterval(() => {
	if (!dirty) return;
	dirty = false;
	const tmp = FILE + '.tmp';
	writeFileSync(tmp, JSON.stringify({ count }));
	renameSync(tmp, FILE);
}, 5000).unref();

// Anti-F5 côté serveur : IP → dernier hit compté. Purgé régulièrement.
const seen = new Map();
setInterval(() => {
	const now = Date.now();
	for (const [ip, t] of seen) if (now - t > DEDUPE_MS) seen.delete(ip);
}, DEDUPE_MS).unref();

function clientIp(req) {
	return (
		req.headers['cf-connecting-ip'] ??
		req.headers['x-forwarded-for']?.split(',')[0].trim() ??
		req.socket.remoteAddress
	);
}

function send(res, status, body) {
	res.writeHead(status, {
		'Content-Type': 'application/json',
		'Cache-Control': 'no-store'
	});
	res.end(body === undefined ? undefined : JSON.stringify(body));
}

createServer((req, res) => {
	if (req.url !== '/api/hits') return send(res, 404, { error: 'not found' });

	if (req.method === 'POST') {
		const ip = clientIp(req);
		const now = Date.now();
		const last = seen.get(ip);
		if (last === undefined || now - last > DEDUPE_MS) {
			count++;
			dirty = true;
		}
		seen.set(ip, now);
		return send(res, 200, { count });
	}
	if (req.method === 'GET' || req.method === 'HEAD') return send(res, 200, { count });
	return send(res, 405, { error: 'method not allowed' });
}).listen(PORT, () => console.log(`counter listening on :${PORT} (count=${count})`));

// Flush final à l'arrêt du conteneur.
for (const sig of ['SIGTERM', 'SIGINT']) {
	process.on(sig, () => {
		writeFileSync(FILE, JSON.stringify({ count }));
		process.exit(0);
	});
}
