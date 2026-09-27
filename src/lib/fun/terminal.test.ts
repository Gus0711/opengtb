import { describe, it, expect } from 'vitest';
import { run, complete, formatUptime, type Context } from './terminal';

const ctx = (over: Partial<Context> = {}): Context => ({
	tools: [
		{ slug: 'decode', name: 'decode', title: 'Décodeur LoRaWAN' },
		{ slug: 'dju', name: 'dju', title: 'Degrés-jours' },
		{ slug: 'bacs', name: 'bacs', title: 'ConformBACS', external: 'https://conformbacs.opengtb.com' }
	],
	articles: [{ slug: 'vrv-daikin-coolmaster', title: 'Du VRV Daikin dans ta GTB' }],
	history: [],
	now: new Date('2026-05-16T01:02:03Z'),
	random: () => 0.5,
	...over
});

describe('run', () => {
	it('ignore le préfixe gtb', () => {
		expect(run('gtb open decode', ctx()).action).toEqual({ type: 'goto', href: '/outils/decode' });
	});

	it('ouvre les pages, articles et liens externes', () => {
		expect(run('cd messages', ctx()).action).toEqual({ type: 'goto', href: '/messages' });
		expect(run('cd ..', ctx()).action).toEqual({ type: 'goto', href: '/' });
		expect(run('open vrv', ctx()).action).toEqual({
			type: 'goto',
			href: '/articles/vrv-daikin-coolmaster'
		});
		expect(run('open bacs', ctx()).action).toEqual({
			type: 'external',
			href: 'https://conformbacs.opengtb.com'
		});
	});

	it('signale une cible inconnue sans action', () => {
		const r = run('open nimporte', ctx());
		expect(r.action).toBeUndefined();
		expect(r.lines[0].tone).toBe('err');
	});

	it('valide les arguments de theme', () => {
		expect(run('theme light', ctx()).action).toEqual({ type: 'theme', value: 'light' });
		expect(run('theme rose', ctx()).action).toBeUndefined();
	});

	it('répond aux commandes inconnues', () => {
		expect(run('foo', ctx()).lines[0].text).toContain('introuvable');
	});

	it('ne renvoie rien pour une ligne vide', () => {
		expect(run('   ', ctx()).lines).toEqual([]);
	});

	it('lit un registre Modbus et contrôle la plage', () => {
		expect(run('modbus read 42', ctx()).lines[0].text).toContain('42');
		expect(run('modbus read 70000', ctx()).lines[0].tone).toBe('err');
	});

	it('fait échouer le ping des automates', () => {
		const r = run('ping jace-01', ctx());
		expect(r.lines.filter((l) => l.tone === 'err')).toHaveLength(4);
	});
});

describe('complete', () => {
	it('complète une commande unique', () => {
		expect(complete('hel', ctx())).toEqual({ value: 'help ', candidates: [] });
	});

	it('propose les candidats ambigus', () => {
		expect(complete('c', ctx()).candidates).toEqual(['cd', 'clear', 'coffee']);
	});

	it('complète les cibles de open', () => {
		expect(complete('open dec', ctx()).value).toBe('open decode ');
		expect(complete('gtb open dj', ctx()).value).toBe('gtb open dju ');
	});
});

describe('formatUptime', () => {
	it('compte les jours depuis la mise en ligne', () => {
		expect(formatUptime(new Date('2026-05-16T01:02:03Z'))).toBe('1 j 01:02:03');
	});
});
