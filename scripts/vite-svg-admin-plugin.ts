import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { loadEnv, type Plugin } from 'vite';

import type { SvgEntry, SvgManifest, SvgTaxonomy } from '../src/lib/tools/svg/types';

const SVG_ROOT = path.resolve('static/svg-library');
const MANIFEST_PATH = path.join(SVG_ROOT, 'manifest.json');
const TAXONOMY_PATH = path.resolve('src/content/data/svg-taxonomy.json');

async function readManifest(): Promise<SvgManifest> {
	try {
		const raw = await fs.readFile(MANIFEST_PATH, 'utf-8');
		return JSON.parse(raw) as SvgManifest;
	} catch {
		return { version: 1, updatedAt: new Date().toISOString(), entries: [] };
	}
}

async function writeManifest(m: SvgManifest): Promise<void> {
	m.updatedAt = new Date().toISOString();
	await fs.mkdir(path.dirname(MANIFEST_PATH), { recursive: true });
	await fs.writeFile(MANIFEST_PATH, JSON.stringify(m, null, 2) + '\n');
}

async function readTaxonomy(): Promise<SvgTaxonomy | null> {
	try {
		const raw = await fs.readFile(TAXONOMY_PATH, 'utf-8');
		return JSON.parse(raw) as SvgTaxonomy;
	} catch {
		return null;
	}
}

function slugify(s: string): string {
	return s
		.toLowerCase()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80);
}

// Serialize all manifest writes to avoid concurrent corruption.
let writeMutex: Promise<unknown> = Promise.resolve();
function withMutex<T>(fn: () => Promise<T>): Promise<T> {
	const next = writeMutex.then(fn, fn);
	writeMutex = next.then(
		() => undefined,
		() => undefined
	);
	return next;
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
	const chunks: Buffer[] = [];
	for await (const chunk of req) chunks.push(chunk as Buffer);
	const raw = Buffer.concat(chunks).toString('utf-8');
	if (!raw) return {};
	return JSON.parse(raw);
}

function send(res: ServerResponse, status: number, body: unknown): void {
	res.statusCode = status;
	res.setHeader('Content-Type', 'application/json; charset=utf-8');
	res.end(JSON.stringify(body));
}

function isInsideRoot(target: string): boolean {
	const resolved = path.resolve(target);
	const rel = path.relative(SVG_ROOT, resolved);
	return !rel.startsWith('..') && !path.isAbsolute(rel);
}

interface UploadBody {
	name: string;
	description?: string;
	theme: string;
	subtheme: string;
	tags?: string[];
	svg: string;
}

interface PatchBody {
	name?: string;
	description?: string;
	theme?: string;
	subtheme?: string;
	tags?: string[];
}

function validateThemeSubtheme(
	tax: SvgTaxonomy | null,
	theme: string,
	subtheme: string
): string | null {
	if (!tax) return null; // taxonomy missing → don't block
	const t = tax.themes.find((x) => x.slug === theme);
	if (!t) return `unknown theme "${theme}"`;
	if (!t.subthemes.find((x) => x.slug === subtheme))
		return `unknown subtheme "${subtheme}" in theme "${theme}"`;
	return null;
}

export function svgAdminPlugin(): Plugin {
	return {
		name: 'opengtb:svg-admin',
		apply: 'serve',
		configureServer(server) {
			const env = loadEnv(server.config.mode || 'development', process.cwd(), '');
			const token = env.ADMIN_TOKEN;

			server.middlewares.use('/__svg-admin', async (req, res, next) => {
				const url = (req.url || '').split('?')[0];

				if (!token) {
					return send(res, 503, {
						error: 'ADMIN_TOKEN not set in .env — admin endpoints disabled.'
					});
				}
				if (req.headers['x-admin-token'] !== token) {
					return send(res, 401, { error: 'unauthorized' });
				}

				try {
					if (req.method === 'GET' && url === '/manifest') {
						return send(res, 200, await readManifest());
					}

					if (req.method === 'GET' && url === '/taxonomy') {
						const tax = await readTaxonomy();
						if (!tax) return send(res, 404, { error: 'taxonomy file missing' });
						return send(res, 200, tax);
					}

					if (req.method === 'POST' && url === '/upload') {
						const body = (await readJsonBody(req)) as UploadBody;
						if (!body?.name || !body?.theme || !body?.subtheme || !body?.svg) {
							return send(res, 400, {
								error: 'name, theme, subtheme, svg are required'
							});
						}
						const tax = await readTaxonomy();
						const ts = validateThemeSubtheme(tax, body.theme, body.subtheme);
						if (ts) return send(res, 400, { error: ts });

						return withMutex(async () => {
							const m = await readManifest();
							let slug = slugify(body.name);
							if (!slug) return send(res, 400, { error: 'cannot derive slug from name' });
							// auto-suffix on conflict
							if (m.entries.some((e) => e.slug === slug)) {
								let i = 2;
								while (m.entries.some((e) => e.slug === `${slug}-${i}`)) i++;
								slug = `${slug}-${i}`;
							}
							const file = `${body.theme}/${body.subtheme}/${slug}.svg`;
							const fullPath = path.join(SVG_ROOT, file);
							if (!isInsideRoot(fullPath)) {
								return send(res, 400, { error: 'path escapes library root' });
							}
							await fs.mkdir(path.dirname(fullPath), { recursive: true });
							await fs.writeFile(fullPath, body.svg, 'utf-8');
							const now = new Date().toISOString();
							const entry: SvgEntry = {
								slug,
								name: body.name,
								description: body.description ?? '',
								theme: body.theme,
								subtheme: body.subtheme,
								tags: body.tags ?? [],
								file,
								createdAt: now,
								updatedAt: now
							};
							m.entries.push(entry);
							await writeManifest(m);
							return send(res, 201, { entry });
						});
					}

					if (
						(req.method === 'PATCH' || req.method === 'DELETE') &&
						url.startsWith('/entry/')
					) {
						const slug = decodeURIComponent(url.slice('/entry/'.length));
						if (!slug) return send(res, 400, { error: 'missing slug' });

						if (req.method === 'DELETE') {
							return withMutex(async () => {
								const m = await readManifest();
								const idx = m.entries.findIndex((e) => e.slug === slug);
								if (idx < 0) return send(res, 404, { error: 'not found' });
								const entry = m.entries[idx];
								const fullPath = path.join(SVG_ROOT, entry.file);
								if (isInsideRoot(fullPath)) {
									await fs.unlink(fullPath).catch(() => undefined);
								}
								m.entries.splice(idx, 1);
								await writeManifest(m);
								return send(res, 200, { ok: true });
							});
						}

						const body = (await readJsonBody(req)) as PatchBody;
						return withMutex(async () => {
							const m = await readManifest();
							const idx = m.entries.findIndex((e) => e.slug === slug);
							if (idx < 0) return send(res, 404, { error: 'not found' });
							const old = m.entries[idx];
							const next: SvgEntry = {
								...old,
								name: body.name ?? old.name,
								description: body.description ?? old.description,
								tags: body.tags ?? old.tags,
								theme: body.theme ?? old.theme,
								subtheme: body.subtheme ?? old.subtheme,
								updatedAt: new Date().toISOString()
							};
							const tax = await readTaxonomy();
							const ts = validateThemeSubtheme(tax, next.theme, next.subtheme);
							if (ts) return send(res, 400, { error: ts });

							// If theme/subtheme changed, move the file.
							if (next.theme !== old.theme || next.subtheme !== old.subtheme) {
								const newFile = `${next.theme}/${next.subtheme}/${old.slug}.svg`;
								const oldFull = path.join(SVG_ROOT, old.file);
								const newFull = path.join(SVG_ROOT, newFile);
								if (!isInsideRoot(newFull)) {
									return send(res, 400, { error: 'path escapes library root' });
								}
								await fs.mkdir(path.dirname(newFull), { recursive: true });
								await fs.rename(oldFull, newFull);
								next.file = newFile;
							}
							m.entries[idx] = next;
							await writeManifest(m);
							return send(res, 200, { entry: next });
						});
					}

					next();
				} catch (err) {
					send(res, 500, { error: err instanceof Error ? err.message : String(err) });
				}
			});
		}
	};
}
