// Mapping code postal français → code département.
//
// Règles :
//   - 5 chiffres requis
//   - 2 premiers chiffres = département, sauf cas particuliers :
//     * Corse : 20xxx → 2A si xxx < 200, sinon 2B
//       (2A = Corse-du-Sud, 200/201xx ; 2B = Haute-Corse, 202–206xx)
//     * DROM (97xxx) : 3 premiers chiffres
//   - Monaco (98000) : pas de département → null

export function postalCodeToDept(cp: string): string | null {
	const trimmed = cp.trim();
	if (!/^\d{5}$/.test(trimmed)) return null;
	const prefix = trimmed.slice(0, 2);
	if (prefix === '20') {
		const n = Number(trimmed.slice(2));
		return n < 200 ? '2A' : '2B';
	}
	if (prefix === '97') return trimmed.slice(0, 3);
	if (prefix === '98') return null; // Monaco, hors scope
	return prefix;
}

/**
 * Tente d'extraire un code département depuis une saisie libre :
 * accepte un code postal (5 chiffres) ou un code département (2-3 chars).
 */
export function parseDeptInput(input: string): string | null {
	const t = input.trim().toUpperCase();
	if (!t) return null;
	if (/^\d{5}$/.test(t)) return postalCodeToDept(t);
	if (/^(2A|2B)$/.test(t)) return t;
	if (/^\d{1,3}$/.test(t)) {
		if (t.length === 1) return `0${t}`;
		if (t.length === 2) return t;
		return t; // DROM type "971"
	}
	return null;
}
