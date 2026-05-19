import { describe, expect, test } from 'vitest';
import { colorizeJs } from './format-js';

describe('colorizeJs', () => {
	test('wraps keywords in amber spans', () => {
		const out = colorizeJs('function decodeUplink(input) { return input; }');
		expect(out).toContain('<span class="text-amber">function</span>');
		expect(out).toContain('<span class="text-amber">return</span>');
	});

	test('wraps line comments and preserves text', () => {
		const out = colorizeJs('// commentaire\nvar x = 1;');
		expect(out).toContain('<span class="text-text-dim italic">// commentaire</span>');
		expect(out).toContain('<span class="text-amber">var</span>');
		expect(out).toContain('<span class="text-foreground">1</span>');
	});

	test('wraps block comments spanning multiple lines', () => {
		const out = colorizeJs('/*\n * block\n */\nvar x;');
		expect(out).toMatch(/<span class="text-text-dim italic">\/\*[\s\S]*?\*\/<\/span>/);
	});

	test('does not colorize keywords inside strings', () => {
		const out = colorizeJs('var s = "function not a keyword here";');
		// La string entière est coloriée en primary, "function" reste dedans en tant que texte
		expect(out).toContain('<span class="text-primary">"function not a keyword here"</span>');
		// Mais "var" reste un keyword
		expect(out).toContain('<span class="text-amber">var</span>');
	});

	test('escapes html-significant chars', () => {
		const out = colorizeJs('var a = b < c && d > e;');
		expect(out).toContain('&lt;');
		expect(out).toContain('&gt;');
		expect(out).not.toContain('<c ');
	});

	test('colorizes numbers', () => {
		const out = colorizeJs('var x = 42.5;');
		expect(out).toContain('<span class="text-foreground">42.5</span>');
	});
});
