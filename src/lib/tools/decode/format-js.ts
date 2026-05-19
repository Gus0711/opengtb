/**
 * Coloration syntaxique légère pour les snippets JS exposés en téléchargement —
 * pas de dépendance externe ni de tokenizer lourd, juste 5 classes de tokens
 * (commentaire, string, keyword, number, autre) wrappés dans des <span>.
 *
 * Retourne un fragment HTML déjà échappé, à insérer via {@html}.
 */
const KEYWORDS = new Set([
	'break',
	'case',
	'catch',
	'const',
	'continue',
	'default',
	'delete',
	'do',
	'else',
	'export',
	'finally',
	'for',
	'function',
	'if',
	'import',
	'in',
	'instanceof',
	'let',
	'new',
	'null',
	'of',
	'return',
	'switch',
	'this',
	'throw',
	'true',
	'false',
	'try',
	'typeof',
	'undefined',
	'var',
	'void',
	'while'
]);

export function colorizeJs(source: string): string {
	const escaped = source.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

	// Token regex (ordre : commentaire ligne, commentaire bloc, string ", string ', mot, nombre).
	// On laisse passer le reste tel quel.
	const re =
		/(\/\/[^\n]*)|(\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*")|('(?:[^'\\]|\\.)*')|(\b[A-Za-z_$][A-Za-z0-9_$]*\b)|(-?\b\d+(?:\.\d+)?\b)/g;

	return escaped.replace(re, (m, lineComment, blockComment, dqStr, sqStr, word, num) => {
		if (lineComment) return `<span class="text-text-dim italic">${lineComment}</span>`;
		if (blockComment) return `<span class="text-text-dim italic">${blockComment}</span>`;
		if (dqStr) return `<span class="text-primary">${dqStr}</span>`;
		if (sqStr) return `<span class="text-primary">${sqStr}</span>`;
		if (word) {
			if (KEYWORDS.has(word)) return `<span class="text-amber">${word}</span>`;
			return word;
		}
		if (num) return `<span class="text-foreground">${num}</span>`;
		return m;
	});
}
