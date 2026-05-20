// scripts/decode/schema-extractor.ts
//
// Heuristiques d'extraction du schéma d'entrée d'un encoder downlink à partir
// de son source JS. Couvre deux idiomes très répandus dans le repo TTN :
//
// 1. **Milesight-style** — `if ("X" in payload)` + setters typés :
//      function setX(x) {
//        if (typeof x !== "number") throw new Error("X must be a number");
//        if (x < 0) throw new Error("X must be greater than 0");
//      }
//    Variantes : enum déclaré comme `var X_map = { 0: "no", 1: "yes" }`
//    + validation `if (vals.indexOf(x) === -1) throw new Error("X must be one of …")`.
//
// 2. **Switch-on-cmd** — `switch (String(input.data.cmd)) { case "X": ... }`
//    Génère un seul champ enum `cmd` avec toutes les commandes possibles.
//
// L'extracteur renvoie `null` quand aucun pattern reconnu n'est trouvé : le
// device retombe alors sur l'éditeur JSON brut côté UI.

export type DownlinkSchemaField = {
	name: string;
	type: 'number' | 'string' | 'boolean' | 'object' | 'unknown';
	/** Valeurs autorisées (string ou number). */
	enum?: Array<string | number>;
	min?: number;
	max?: number;
	/** Description courte récupérée d'un commentaire JSDoc ou d'un throw message. */
	description?: string;
	/** Sous-champs quand `type === 'object'`. */
	fields?: DownlinkSchemaField[];
	/** Valeur par défaut suggérée (rare — on essaie d'inférer depuis JSDoc `@example`). */
	default?: unknown;
};

export interface DownlinkSchema {
	/** Patron heuristique qui a matché. Utile pour debug et UI tooltip. */
	source: 'milesight-if-in-payload' | 'switch-on-cmd';
	fields: DownlinkSchemaField[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilitaires

/** Extrait le contenu d'un bloc `{ ... }` à partir de l'index d'ouverture. */
function extractBalancedBlock(source: string, openBraceIndex: number): string {
	if (source[openBraceIndex] !== '{') return '';
	let depth = 1;
	let i = openBraceIndex + 1;
	while (i < source.length && depth > 0) {
		const c = source[i];
		// On ignore les accolades dans les strings — heuristique simple
		if (c === '"' || c === "'") {
			i = skipString(source, i);
			continue;
		}
		if (c === '/' && source[i + 1] === '/') {
			while (i < source.length && source[i] !== '\n') i++;
			continue;
		}
		if (c === '/' && source[i + 1] === '*') {
			i += 2;
			while (i < source.length - 1 && !(source[i] === '*' && source[i + 1] === '/')) i++;
			i += 2;
			continue;
		}
		if (c === '{') depth++;
		else if (c === '}') depth--;
		i++;
	}
	return source.slice(openBraceIndex + 1, i - 1);
}

function skipString(source: string, start: number): number {
	const quote = source[start];
	let i = start + 1;
	while (i < source.length) {
		if (source[i] === '\\') {
			i += 2;
			continue;
		}
		if (source[i] === quote) {
			return i + 1;
		}
		i++;
	}
	return i;
}

/** Cherche `function <name>(arg)` et renvoie son corps (sans les accolades). */
function findFunctionBody(source: string, name: string): string | null {
	const re = new RegExp(`function\\s+${escapeRegExp(name)}\\s*\\([^)]*\\)\\s*\\{`);
	const m = re.exec(source);
	if (!m) return null;
	const openBrace = m.index + m[0].length - 1;
	return extractBalancedBlock(source, openBrace);
}

function escapeRegExp(s: string): string {
	return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─────────────────────────────────────────────────────────────────────────────
// Pattern 1 — Milesight `if ("X" in payload)`

const IF_IN_PAYLOAD_RE = /if\s*\(\s*["']([A-Za-z_][A-Za-z0-9_]*)["']\s+in\s+([A-Za-z_][A-Za-z0-9_]*)\s*\)/g;

function extractFieldNamesFromIfIn(blockSource: string, paramName: string): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	IF_IN_PAYLOAD_RE.lastIndex = 0;
	let m: RegExpExecArray | null;
	while ((m = IF_IN_PAYLOAD_RE.exec(blockSource)) !== null) {
		if (m[2] !== paramName) continue;
		if (seen.has(m[1])) continue;
		seen.add(m[1]);
		out.push(m[1]);
	}
	return out;
}

/**
 * Trouve un appel `<fnName>(payload.fieldName, …)` ou `<fnName>(N, payload.fieldName, …)`
 * et renvoie le nom de la fonction handler, ou null s'il n'y en a pas.
 */
function findHandlerForField(source: string, paramName: string, field: string): string | null {
	const re = new RegExp(
		`\\b([A-Za-z_][A-Za-z0-9_]*)\\s*\\(\\s*(?:[^,()]+,\\s*)?${escapeRegExp(paramName)}\\.${escapeRegExp(field)}\\b`
	);
	const m = source.match(re);
	if (!m) return null;
	if (m[1] === 'if' || m[1] === 'concat' || m[1] === 'push' || m[1] === 'typeof') return null;
	return m[1];
}

/**
 * Parse un map JS littéral `{ key: "value", ... }`. Renvoie la liste des values
 * (chaînes) puisque c'est la forme attendue côté input utilisateur dans les
 * codecs Milesight (les keys sont les codes binaires, les values les libellés
 * humains).
 */
function parseEnumFromMap(mapBody: string): string[] {
	const out: string[] = [];
	const re = /(?:"[^"]*"|'[^']*'|-?\d+(?:\.\d+)?)\s*:\s*"([^"]+)"/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(mapBody)) !== null) {
		out.push(m[1]);
	}
	return out;
}

interface SetterAnalysis {
	type: DownlinkSchemaField['type'];
	enum?: Array<string | number>;
	min?: number;
	max?: number;
	nestedFields?: DownlinkSchemaField[];
}

function analyzeSetterBody(body: string, argName: string): SetterAnalysis {
	const out: SetterAnalysis = { type: 'unknown' };

	// Type signals via `typeof X !== "Y"`
	if (new RegExp(`typeof\\s+${escapeRegExp(argName)}\\s*!==\\s*["']number["']`).test(body))
		out.type = 'number';
	else if (new RegExp(`typeof\\s+${escapeRegExp(argName)}\\s*!==\\s*["']string["']`).test(body))
		out.type = 'string';
	else if (new RegExp(`typeof\\s+${escapeRegExp(argName)}\\s*!==\\s*["']boolean["']`).test(body))
		out.type = 'boolean';
	else if (
		new RegExp(`typeof\\s+${escapeRegExp(argName)}\\s*!==\\s*["']object["']`).test(body) ||
		/must be an object/i.test(body)
	)
		out.type = 'object';

	// Détection « comportement objet » sans typeof :
	//  - accès `arg.X` (dot)
	//  - for-in sur `arg`
	//  - `arg[<var>]` (bracket)
	//  - `<var> in arg` (key check avec variable, ≠ string literal)
	if (out.type === 'unknown') {
		const accessRe = new RegExp(`\\b${escapeRegExp(argName)}\\.([A-Za-z_][A-Za-z0-9_]*)`);
		const forInArgRe = new RegExp(`for\\s*\\(\\s*var\\s+\\w+\\s+in\\s+${escapeRegExp(argName)}\\s*\\)`);
		const bracketRe = new RegExp(`\\b${escapeRegExp(argName)}\\[\\w+\\]`);
		const keyInRe = new RegExp(`\\bif\\s*\\(\\s*\\w+\\s+in\\s+${escapeRegExp(argName)}\\s*\\)`);
		if (
			accessRe.test(body) ||
			forInArgRe.test(body) ||
			bracketRe.test(body) ||
			keyInRe.test(body)
		) {
			out.type = 'object';
		}
	}

	// Range : `if (x < N)` / `if (x > N)`
	const minMatch = body.match(new RegExp(`if\\s*\\(\\s*${escapeRegExp(argName)}\\s*<\\s*(-?\\d+)`));
	if (minMatch) out.min = parseInt(minMatch[1], 10);
	const maxMatch = body.match(new RegExp(`if\\s*\\(\\s*${escapeRegExp(argName)}\\s*>\\s*(-?\\d+)`));
	if (maxMatch) out.max = parseInt(maxMatch[1], 10);

	// Enum via `var <name>_map = { ... }` — seulement si on n'est PAS un objet
	// (sinon le _map sert pour un sous-champ, pas pour le champ courant).
	if (out.type !== 'object') {
		const mapDeclRe = /var\s+(\w+_map)\s*=\s*\{/g;
		let mapMatch: RegExpExecArray | null;
		while ((mapMatch = mapDeclRe.exec(body)) !== null) {
			const openBrace = mapMatch.index + mapMatch[0].length - 1;
			const inner = extractBalancedBlock(body, openBrace);
			const values = parseEnumFromMap(inner);
			if (values.length > 0) {
				out.type = 'string';
				out.enum = values;
				break; // premier map suffit
			}
		}
	}

	// Objet imbriqué : champs via `var X = arg.X` ou `if ("X" in arg)`
	if (out.type === 'object') {
		const seen = new Set<string>();
		const nested: DownlinkSchemaField[] = [];

		// Pattern A : `if ("X" in arg)`
		IF_IN_PAYLOAD_RE.lastIndex = 0;
		let nm: RegExpExecArray | null;
		while ((nm = IF_IN_PAYLOAD_RE.exec(body)) !== null) {
			if (nm[2] !== argName) continue;
			if (seen.has(nm[1])) continue;
			seen.add(nm[1]);
			nested.push({ name: nm[1], type: 'unknown' });
		}

		// Pattern B : `var Y = arg.X` (destructure)
		// On ignore les propriétés built-in d'Array/Object qui ne sont pas
		// des vrais sous-champs documentés.
		const BUILTIN_PROPS = new Set([
			'length',
			'hasOwnProperty',
			'toString',
			'valueOf',
			'constructor'
		]);
		const destrRe = new RegExp(
			`var\\s+(\\w+)\\s*=\\s*${escapeRegExp(argName)}\\.([A-Za-z_][A-Za-z0-9_]*)`,
			'g'
		);
		let dm: RegExpExecArray | null;
		while ((dm = destrRe.exec(body)) !== null) {
			if (BUILTIN_PROPS.has(dm[2])) continue;
			if (seen.has(dm[2])) continue;
			seen.add(dm[2]);
			nested.push({ name: dm[2], type: 'unknown' });
		}

		// Pattern C : `for (var k in <map>)` où <map> liste les sous-champs valides
		// (cas Milesight jitter_config). On extrait les keys du map.
		const forInRe = /for\s*\(\s*var\s+\w+\s+in\s+(\w+)\s*\)/g;
		let fim: RegExpExecArray | null;
		while ((fim = forInRe.exec(body)) !== null) {
			const mapName = fim[1];
			const mapDeclRe2 = new RegExp(`var\\s+${escapeRegExp(mapName)}\\s*=\\s*\\{`);
			const mapDecl = body.match(mapDeclRe2);
			if (mapDecl && mapDecl.index !== undefined) {
				const openBrace = mapDecl.index + mapDecl[0].length - 1;
				const inner = extractBalancedBlock(body, openBrace);
				// Keys du map = noms de sous-champs
				const keyRe = /(?:^|,)\s*([A-Za-z_][A-Za-z0-9_]*)\s*:/g;
				let km: RegExpExecArray | null;
				while ((km = keyRe.exec(inner)) !== null) {
					if (seen.has(km[1])) continue;
					seen.add(km[1]);
					nested.push({ name: km[1], type: 'number' }); // contexte for-in → bytes numériques le plus souvent
				}
			}
		}

		// Heuristique de type pour chaque sous-champ : inspection rapide du body
		for (const nf of nested) {
			if (nf.type !== 'unknown') continue;
			// On cherche un mapping ou typeof check spécifique à <arg>.<nf.name>
			const re1 = new RegExp(
				`${escapeRegExp(argName)}\\.${escapeRegExp(nf.name)}[^=]*?(?:typeof\\s+\\w+\\s*!==\\s*["'](\\w+)["']|_map\\s*=)`
			);
			const m1 = body.match(re1);
			if (m1?.[1]) {
				if (m1[1] === 'number') nf.type = 'number';
				else if (m1[1] === 'string') nf.type = 'string';
				else if (m1[1] === 'boolean') nf.type = 'boolean';
			}

			// Cas Milesight ".status" qui est un enum on/off
			if (/\b(status)\b/i.test(nf.name)) {
				const onOffRe = /var\s+on_off_map\s*=\s*\{/;
				if (onOffRe.test(body)) {
					nf.type = 'string';
					nf.enum = ['off', 'on'];
				}
			}

			// Cas ".duration", ".timeout", ".interval", ".count" → number
			if (nf.type === 'unknown' && /\b(duration|timeout|interval|count|delay|period)\b/i.test(nf.name)) {
				nf.type = 'number';
			}
		}

		if (nested.length > 0) out.nestedFields = nested;
	}

	return out;
}

export function extractMilesightSchema(source: string): DownlinkSchema | null {
	// On cherche la fonction qui contient les `if ("X" in payload)` au top level.
	// Pour Milesight elle s'appelle `milesightDeviceEncode` ou `Encode`/`Encoder`.
	// On la trouve simplement en cherchant le premier bloc qui contient ≥3 occurrences
	// du pattern `if ("X" in payload)`.
	const candidates = ['milesightDeviceEncode', 'encodeDownlink', 'Encode', 'Encoder'];
	let body: string | null = null;
	let paramName = 'payload';

	for (const name of candidates) {
		body = findFunctionBody(source, name);
		if (body && extractFieldNamesFromIfIn(body, 'payload').length >= 2) break;
		if (body) {
			// Le param peut s'appeler autrement
			for (const p of ['input', 'data', 'obj']) {
				if (extractFieldNamesFromIfIn(body, p).length >= 2) {
					paramName = p;
					break;
				}
			}
			if (extractFieldNamesFromIfIn(body, paramName).length >= 2) break;
		}
		body = null;
	}

	if (!body) {
		// Fallback : on scanne tout le source
		body = source;
		const counts: Record<string, number> = {};
		const seen = new Set<string>();
		IF_IN_PAYLOAD_RE.lastIndex = 0;
		let m: RegExpExecArray | null;
		while ((m = IF_IN_PAYLOAD_RE.exec(source)) !== null) {
			const key = `${m[2]}.${m[1]}`;
			if (seen.has(key)) continue;
			seen.add(key);
			counts[m[2]] = (counts[m[2]] ?? 0) + 1;
		}
		// Choisit le param le plus utilisé
		const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
		if (!top || top[1] < 2) return null;
		paramName = top[0];
	}

	const fieldNames = extractFieldNamesFromIfIn(body, paramName);
	if (fieldNames.length === 0) return null;

	const fields: DownlinkSchemaField[] = [];
	for (const name of fieldNames) {
		const field: DownlinkSchemaField = { name, type: 'unknown' };
		const handler = findHandlerForField(source, paramName, name);
		if (handler) {
			const setterBody = findFunctionBody(source, handler);
			if (setterBody) {
				// argName = 2e arg ou unique arg du setter
				const argMatch = new RegExp(
					`function\\s+${escapeRegExp(handler)}\\s*\\(\\s*([^)]*)\\)`
				).exec(source);
				let argName = name;
				if (argMatch) {
					const args = argMatch[1].split(',').map((a) => a.trim());
					argName = args[args.length - 1] || name;
				}
				const a = analyzeSetterBody(setterBody, argName);
				field.type = a.type;
				if (a.enum) field.enum = a.enum;
				if (a.min !== undefined) field.min = a.min;
				if (a.max !== undefined) field.max = a.max;
				if (a.nestedFields) field.fields = a.nestedFields;
			}
		}
		// Heuristiques de fallback sur le nom (cohérent avec ce qu'on voit dans le repo)
		if (field.type === 'unknown') {
			if (/^(reboot|rejoin|sync_time|report_status)$/.test(name)) {
				field.type = 'string';
				field.enum = ['no', 'yes'];
			} else if (/^(interval|timeout|timestamp|delay|count|period)$/i.test(name) || /_interval$/.test(name) || /_timeout$/.test(name)) {
				field.type = 'number';
			} else if (/^(gpio_output_\d+)$/.test(name)) {
				field.type = 'string';
				field.enum = ['off', 'on'];
			}
		}
		fields.push(field);
	}

	if (fields.every((f) => f.type === 'unknown')) return null;

	return { source: 'milesight-if-in-payload', fields };
}

// ─────────────────────────────────────────────────────────────────────────────
// Pattern 2 — switch-on-cmd (Aquascope et similaires)

export function extractSwitchOnCmdSchema(source: string): DownlinkSchema | null {
	// On cherche `switch (String(input.data.cmd))` ou `switch (cmd)` dans encodeDownlink
	const encBody = findFunctionBody(source, 'encodeDownlink');
	if (!encBody) return null;

	// Le sujet du switch : on accepte plusieurs variantes courantes
	const switchRe = /switch\s*\(\s*(?:String\s*\(\s*)?(?:input\.data\.|payload\.|data\.)?([A-Za-z_][A-Za-z0-9_]*)\)?\s*\)\s*\{/;
	const sm = switchRe.exec(encBody);
	if (!sm) return null;
	const cmdField = sm[1];

	const openBrace = sm.index + sm[0].length - 1;
	const switchBody = extractBalancedBlock(encBody, openBrace);

	// Extraction des `case "X":`
	const caseRe = /case\s+["']([^"']+)["']\s*:/g;
	const cases: string[] = [];
	const seen = new Set<string>();
	let cm: RegExpExecArray | null;
	while ((cm = caseRe.exec(switchBody)) !== null) {
		if (seen.has(cm[1])) continue;
		seen.add(cm[1]);
		cases.push(cm[1]);
	}

	if (cases.length === 0) return null;

	// Optionnel : détection d'autres champs accédés via `input.data.<X>` dans le switch body
	const accessedFields: string[] = [];
	const accessRe = /(?:input\.data|payload|data)\.([A-Za-z_][A-Za-z0-9_]*)/g;
	const seenAccess = new Set<string>([cmdField]);
	let am: RegExpExecArray | null;
	while ((am = accessRe.exec(switchBody)) !== null) {
		if (seenAccess.has(am[1])) continue;
		seenAccess.add(am[1]);
		accessedFields.push(am[1]);
	}

	const fields: DownlinkSchemaField[] = [
		{
			name: cmdField,
			type: 'string',
			enum: cases,
			description: 'Commande à envoyer'
		},
		...accessedFields.map(
			(f): DownlinkSchemaField => ({
				name: f,
				type: /(?:count|index|id|number|num|value|sensor|interval|duration|timestamp)/i.test(f)
					? 'number'
					: 'string',
				description: 'Paramètre optionnel selon la commande'
			})
		)
	];

	return { source: 'switch-on-cmd', fields };
}

// ─────────────────────────────────────────────────────────────────────────────
// Entrée publique

export function extractDownlinkSchema(source: string): DownlinkSchema | null {
	// Essaie les extracteurs dans l'ordre. Le premier qui matche gagne.
	return extractMilesightSchema(source) ?? extractSwitchOnCmdSchema(source);
}
