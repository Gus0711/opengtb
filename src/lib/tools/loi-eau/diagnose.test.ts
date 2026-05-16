import { describe, expect, it } from 'vitest';
import { diagnose } from './diagnose';

describe('diagnose', () => {
	it('réglage cohérent → niveau ok', () => {
		const d = diagnose({
			emitter: 'rad-bt',
			zone: 'H1',
			params: { pente: 1.3, parallele: 0, tMin: 25, tMax: 65, tPivot: 20 }
		});
		expect(d.some((x) => x.level === 'ok')).toBe(true);
	});

	it('pente nulle → erreur', () => {
		const d = diagnose({
			emitter: 'rad-bt',
			zone: 'H1',
			params: { pente: 0, parallele: 0, tMin: 25, tMax: 65, tPivot: 20 }
		});
		expect(d[0].level).toBe('error');
	});

	it('pente très élevée sur plancher → warning', () => {
		const d = diagnose({
			emitter: 'plancher',
			zone: 'H1',
			params: { pente: 2.0, parallele: 0, tMin: 22, tMax: 45, tPivot: 20 }
		});
		expect(d.some((x) => x.level === 'warn')).toBe(true);
	});

	it('T_max atteinte trop tôt → warning', () => {
		// Pente HT mais T_max plafonné bas → clamp à T_ext doux.
		const d = diagnose({
			emitter: 'rad-bt',
			zone: 'H1',
			params: { pente: 1.5, parallele: 0, tMin: 25, tMax: 40, tPivot: 20 }
		});
		expect(d.some((x) => x.level === 'warn')).toBe(true);
	});

	it('plancher avec T_max > 50 → warning', () => {
		const d = diagnose({
			emitter: 'plancher',
			zone: 'H1',
			params: { pente: 0.6, parallele: 0, tMin: 22, tMax: 55, tPivot: 20 }
		});
		expect(d.some((x) => x.message.toLowerCase().includes('plancher'))).toBe(true);
	});

	it('parallèle extrême → info', () => {
		const d = diagnose({
			emitter: 'rad-bt',
			zone: 'H1',
			params: { pente: 1.3, parallele: 15, tMin: 25, tMax: 65, tPivot: 20 }
		});
		expect(d.some((x) => x.level === 'info')).toBe(true);
	});
});
