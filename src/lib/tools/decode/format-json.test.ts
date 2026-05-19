import { describe, expect, test } from 'vitest';
import { colorizeJson } from './format-json';

describe('colorizeJson', () => {
	test('wraps keys, strings, numbers and keywords in spans', () => {
		const out = colorizeJson({ name: 'foo', count: 3, on: true, miss: null });
		expect(out).toContain('<span class="text-amber">"name":</span>');
		expect(out).toContain('<span class="text-primary">"foo"</span>');
		expect(out).toContain('<span class="text-foreground">3</span>');
		expect(out).toContain('<span class="text-text-dim italic">true</span>');
		expect(out).toContain('<span class="text-text-dim italic">null</span>');
	});

	test('escapes html in string values', () => {
		const out = colorizeJson({ html: '<script>alert(1)</script>' });
		expect(out).not.toContain('<script>');
		expect(out).toContain('&lt;script&gt;');
	});

	test('handles undefined input gracefully', () => {
		expect(colorizeJson(undefined)).toBe('');
	});

	test('handles nested objects', () => {
		const out = colorizeJson({ gps: { latitude: 41.1493, longitude: -87.9094 } });
		expect(out).toContain('<span class="text-amber">"gps":</span>');
		expect(out).toContain('<span class="text-amber">"latitude":</span>');
		expect(out).toContain('<span class="text-foreground">41.1493</span>');
	});
});
