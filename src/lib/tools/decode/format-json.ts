/**
 * Coloration syntaxique légère pour le JSON brut affiché dans le tableau de
 * résultat — pas de dépendance externe ni de tokenizer lourd, juste 4 classes
 * de tokens (clé, string, number, mot-clé) wrappés dans des <span>.
 *
 * Retourne un fragment HTML déjà échappé, à insérer via {@html}.
 */
export function colorizeJson(value: unknown): string {
	const json = JSON.stringify(value, null, 2);
	if (json === undefined) return '';
	const escaped = json
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;');
	return escaped.replace(
		/("(?:[^"\\]|\\.)*"\s*:)|("(?:[^"\\]|\\.)*")|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|(\btrue\b|\bfalse\b|\bnull\b)/g,
		(m, key, str, num, kw) => {
			if (key) return `<span class="text-amber">${key}</span>`;
			if (str) return `<span class="text-primary">${str}</span>`;
			if (num) return `<span class="text-foreground">${num}</span>`;
			if (kw) return `<span class="text-text-dim italic">${kw}</span>`;
			return m;
		}
	);
}
