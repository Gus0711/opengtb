// Interpréteur du terminal caché (` ou Ctrl+K). Pur et synchrone : il reçoit
// une ligne et un contexte, renvoie des lignes à afficher et une action
// éventuelle que le composant exécute (navigation, thème…).

export type Tone = 'out' | 'dim' | 'ok' | 'err' | 'accent';

export interface Line {
	text: string;
	tone?: Tone;
}

export type Action =
	| { type: 'goto'; href: string }
	| { type: 'external'; href: string }
	| { type: 'clear' }
	| { type: 'exit' }
	| { type: 'theme'; value: 'dark' | 'light' | 'auto' }
	| { type: 'retro' };

export interface Result {
	lines: Line[];
	action?: Action;
	/** Affichage ligne par ligne, façon trame qui arrive. */
	stream?: boolean;
}

export interface Context {
	tools: { slug: string; name: string; title: string; external?: string }[];
	articles: { slug: string; title: string }[];
	history: string[];
	now: Date;
	random: () => number;
}

export const LAUNCH_DATE = new Date('2026-05-15T00:00:00Z');

const PAGES: Record<string, string> = {
	'~': '/',
	accueil: '/',
	outils: '/outils',
	articles: '/articles',
	journal: '/articles',
	messages: '/messages'
};

const HELP: [string, string][] = [
	['help', 'cette aide'],
	['ls [outils|articles]', 'lister le contenu'],
	['open <nom>', 'ouvrir un outil, un article ou une page (alias : cd)'],
	['theme <dark|light|auto>', 'changer le thème'],
	['retro', 'mode supervision 1998'],
	['bacnet who-is', 'scanner le réseau BACnet'],
	['modbus read <registre>', 'lire un registre'],
	['ping <hôte>', 'tester une liaison'],
	['uptime · date · whoami', 'infos système'],
	['history · clear · exit', 'le reste']
];

export const COMMANDS = [
	'help',
	'ls',
	'open',
	'cd',
	'theme',
	'retro',
	'bacnet',
	'modbus',
	'ping',
	'uptime',
	'date',
	'whoami',
	'history',
	'clear',
	'exit',
	'echo',
	'sudo',
	'coffee'
];

const pad = (s: string, n: number) => s + ' '.repeat(Math.max(1, n - s.length));

function tokenize(input: string): string[] {
	const words = input.trim().split(/\s+/).filter(Boolean);
	// « gtb open decode » ≡ « open decode »
	if (words[0] === 'gtb' || words[0] === '$') words.shift();
	return words;
}

export function formatUptime(now: Date): string {
	const ms = Math.max(0, now.getTime() - LAUNCH_DATE.getTime());
	const days = Math.floor(ms / 86_400_000);
	const rest = new Date(ms % 86_400_000);
	const hms = rest.toISOString().slice(11, 19);
	return `${days} j ${hms}`;
}

function resolveTarget(name: string, ctx: Context): Action | null {
	const key = name.toLowerCase().replace(/^\/+|\/+$/g, '');
	if (key === '..' || key === '') return { type: 'goto', href: '/' };
	if (key in PAGES) return { type: 'goto', href: PAGES[key] };
	const tool = ctx.tools.find((t) => t.slug === key || t.name === key);
	if (tool) {
		return tool.external
			? { type: 'external', href: tool.external }
			: { type: 'goto', href: `/outils/${tool.slug}` };
	}
	const article =
		ctx.articles.find((a) => a.slug === key) ??
		ctx.articles.find((a) => a.slug.includes(key) || a.title.toLowerCase().includes(key));
	if (article) return { type: 'goto', href: `/articles/${article.slug}` };
	return null;
}

function ping(host: string, ctx: Context): Result {
	const lines: Line[] = [{ text: `PING ${host} : 32 octets de données`, tone: 'dim' }];
	const h = host.toLowerCase();
	if (/jace|niagara|automate|plc/.test(h)) {
		for (let i = 0; i < 4; i++) lines.push({ text: 'Délai d’attente de la demande dépassé.', tone: 'err' });
		lines.push({ text: '4 paquets perdus. Comme d’hab le vendredi à 17h.', tone: 'dim' });
	} else if (/daikin|vrv|clim/.test(h)) {
		lines.push({ text: 'Réponse : code défaut U4 (communication)', tone: 'err' });
		lines.push({ text: 'Vérifie le bornier F1/F2 😅', tone: 'dim' });
	} else {
		for (let i = 0; i < 4; i++) {
			const ms = Math.round(8 + ctx.random() * 30);
			lines.push({ text: `Réponse de ${host} : octets=32 temps=${ms} ms TTL=64`, tone: 'ok' });
		}
	}
	return { lines, stream: true };
}

function whoIs(ctx: Context): Result {
	const devices = [
		['2001', 'JACE-8000', 'Tridium'],
		['12', 'ECY-103', 'Distech Controls'],
		['4194302', 'CoolMasterPro', 'CoolAutomation'],
		['77', 'CTA-TOITURE', 'inconnu (étiquette effacée)'],
		['666', 'AUTOMATE-CAVE', 'personne ne sait qui l’a posé']
	];
	const lines: Line[] = [{ text: 'Who-Is → broadcast 192.168.1.255:47808', tone: 'dim' }];
	for (const [id, name, vendor] of devices) {
		if (ctx.random() < 0.15) continue; // réseau BACnet oblige
		lines.push({ text: `I-Am  device,${pad(id, 8)} ${pad(name, 15)} ${vendor}`, tone: 'ok' });
	}
	lines.push({ text: `${lines.length - 1} équipement(s) ont répondu. Les autres dorment.`, tone: 'dim' });
	return { lines, stream: true };
}

function modbusRead(arg: string | undefined, ctx: Context): Result {
	const reg = Number(arg);
	if (!arg || !Number.isInteger(reg) || reg < 0 || reg > 65535) {
		return { lines: [{ text: 'usage : modbus read <registre 0-65535>', tone: 'err' }] };
	}
	if (reg === 42) {
		return { lines: [{ text: `Holding ${reg} = 42 (la réponse, évidemment)`, tone: 'accent' }] };
	}
	if (ctx.random() < 0.2) {
		return { lines: [{ text: `Exception 02 : adresse de registre invalide (offset de 1 ? 😏)`, tone: 'err' }] };
	}
	const raw = Math.floor(ctx.random() * 65536);
	const hex = raw.toString(16).toUpperCase().padStart(4, '0');
	return {
		lines: [
			{ text: `Holding ${reg} = ${raw} (0x${hex})`, tone: 'ok' },
			{ text: `CRC OK · big-endian · ou little-endian, qui sait vraiment`, tone: 'dim' }
		]
	};
}

export function run(input: string, ctx: Context): Result {
	const words = tokenize(input);
	if (!words.length) return { lines: [] };
	const [cmd, ...args] = words;
	const arg = args[0];

	switch (cmd.toLowerCase()) {
		case 'help':
		case 'aide':
		case '?':
			return {
				lines: [
					{ text: 'Commandes disponibles :', tone: 'accent' },
					...HELP.map(([c, d]) => ({ text: `  ${pad(c, 26)}${d}` })),
					{ text: 'Tab pour compléter, ↑/↓ pour l’historique, Échap pour fermer.', tone: 'dim' }
				]
			};

		case 'ls': {
			const what = (arg ?? '').toLowerCase();
			if (what === 'outils' || what === 'tools') {
				return {
					lines: ctx.tools.map((t) => ({
						text: `  ${pad(t.name, 14)}${t.title}${t.external ? ' ↗' : ''}`
					}))
				};
			}
			if (what === 'articles' || what === 'journal') {
				return { lines: ctx.articles.map((a) => ({ text: `  ${pad(a.slug, 40)}${a.title}` })) };
			}
			return {
				lines: [
					{ text: 'outils/    articles/    messages', tone: 'accent' },
					{ text: 'ls outils · ls articles pour le détail', tone: 'dim' }
				]
			};
		}

		case 'open':
		case 'cd': {
			if (!arg) return { lines: [{ text: `usage : ${cmd} <outil|article|page>`, tone: 'err' }] };
			const action = resolveTarget(args.join(' '), ctx);
			if (!action) {
				return { lines: [{ text: `${cmd}: ${arg}: introuvable. Essaie « ls outils ».`, tone: 'err' }] };
			}
			const href = 'href' in action ? action.href : '';
			return { lines: [{ text: `→ ${href}`, tone: 'dim' }], action };
		}

		case 'theme': {
			const v = (arg ?? '').toLowerCase();
			if (v !== 'dark' && v !== 'light' && v !== 'auto') {
				return { lines: [{ text: 'usage : theme <dark|light|auto>', tone: 'err' }] };
			}
			return { lines: [{ text: `Thème : ${v}`, tone: 'ok' }], action: { type: 'theme', value: v } };
		}

		case 'retro':
			return { lines: [{ text: 'Chargement du pilote VGA…', tone: 'dim' }], action: { type: 'retro' } };

		case 'bacnet':
			if ((arg ?? '').toLowerCase() !== 'who-is') {
				return { lines: [{ text: 'usage : bacnet who-is', tone: 'err' }] };
			}
			return whoIs(ctx);

		case 'modbus':
			if ((arg ?? '').toLowerCase() !== 'read') {
				return { lines: [{ text: 'usage : modbus read <registre>', tone: 'err' }] };
			}
			return modbusRead(args[1], ctx);

		case 'ping':
			if (!arg) return { lines: [{ text: 'usage : ping <hôte>', tone: 'err' }] };
			return ping(arg, ctx);

		case 'uptime':
			return {
				lines: [{ text: `en service depuis ${formatUptime(ctx.now)} · 0 redémarrage non planifié (officiellement)` }]
			};

		case 'date':
			return {
				lines: [
					{
						text: new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full', timeStyle: 'medium' }).format(ctx.now)
					}
				]
			};

		case 'whoami':
			return {
				lines: [{ text: 'un·e intégrateur·rice qui a déjà passé 3 h à chercher un bornier F1/F2' }]
			};

		case 'history':
			return {
				lines: ctx.history.length
					? ctx.history.map((h, i) => ({ text: `  ${String(i + 1).padStart(3)}  ${h}`, tone: 'dim' as Tone }))
					: [{ text: '(vide)', tone: 'dim' }]
			};

		case 'echo':
			return { lines: [{ text: args.join(' ') }] };

		case 'clear':
		case 'cls':
			return { lines: [], action: { type: 'clear' } };

		case 'exit':
		case 'quit':
		case 'logout':
			return { lines: [{ text: 'Déconnexion…', tone: 'dim' }], action: { type: 'exit' } };

		case 'sudo':
			return {
				lines: [
					{
						text: `Permission refusée : tu n'es pas dans le groupe « intégrateur-senior ».`,
						tone: 'err'
					},
					{ text: 'Cet incident sera signalé au chef de chantier.', tone: 'dim' }
				]
			};

		case 'rm':
			if (args.includes('-rf')) {
				return {
					lines: [
						{ text: 'Suppression de / en cours… déclenchement de l’alarme incendie 🔥', tone: 'err' },
						{ text: 'Non je rigole. Mais on a eu peur tous les deux.', tone: 'dim' }
					],
					stream: true
				};
			}
			return { lines: [{ text: 'rm: rien à supprimer ici, tout est utile 😇', tone: 'dim' }] };

		case 'coffee':
		case 'cafe':
		case 'café':
			return { lines: [{ text: 'Erreur 418 : je suis une théière (RFC 2324). ☕', tone: 'accent' }] };

		case 'hello':
		case 'bonjour':
		case 'salut':
			return { lines: [{ text: 'Hello la GTB ! 👋', tone: 'accent' }] };

		default:
			return {
				lines: [{ text: `gtb: commande introuvable : ${cmd}. Tape « help ».`, tone: 'err' }]
			};
	}
}

/** Complétion par Tab : renvoie la ligne complétée, ou les candidats si ambigu. */
export function complete(input: string, ctx: Context): { value: string; candidates: string[] } {
	const trailing = /\s$/.test(input);
	const all = input.trim().split(/\s+/).filter(Boolean);
	// Le préfixe « gtb » est facultatif : on complète ce qui suit.
	const words = all[0] === 'gtb' && (all.length > 1 || trailing) ? all.slice(1) : all;
	const prefix = trailing ? '' : (words[words.length - 1] ?? '');
	const head = input.slice(0, input.length - prefix.length);
	if (words.length === 0 || (words.length === 1 && !trailing)) {
		const matches = COMMANDS.filter((c) => c.startsWith(prefix));
		if (matches.length === 1) return { value: `${head}${matches[0]} `, candidates: [] };
		return { value: input, candidates: matches };
	}
	const [cmd] = words;
	let pool: string[] = [];
	if (cmd === 'open' || cmd === 'cd') {
		pool = [...Object.keys(PAGES), ...ctx.tools.map((t) => t.slug), ...ctx.articles.map((a) => a.slug)];
	} else if (cmd === 'ls') pool = ['outils', 'articles'];
	else if (cmd === 'theme') pool = ['dark', 'light', 'auto'];
	else if (cmd === 'bacnet') pool = ['who-is'];
	else if (cmd === 'modbus') pool = ['read'];
	const matches = [...new Set(pool)].filter((p) => p.startsWith(prefix));
	if (matches.length === 1) return { value: `${head}${matches[0]} `, candidates: [] };
	return { value: input, candidates: matches };
}
