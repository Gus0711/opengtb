import { describe, expect, test } from 'vitest';
import { timeAgoFr } from './relative-time';

const NOW = new Date('2026-05-19T12:00:00Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();

describe('timeAgoFr', () => {
	test('today', () => {
		expect(timeAgoFr(NOW.toISOString(), NOW)).toBe("aujourd'hui");
	});
	test('yesterday', () => {
		expect(timeAgoFr(daysAgo(1), NOW)).toBe('hier');
	});
	test('12 days', () => {
		expect(timeAgoFr(daysAgo(12), NOW)).toBe('il y a 12 jours');
	});
	test('1 month', () => {
		expect(timeAgoFr(daysAgo(35), NOW)).toBe('il y a 1 mois');
	});
	test('several months', () => {
		expect(timeAgoFr(daysAgo(120), NOW)).toBe('il y a 4 mois');
	});
	test('1 year', () => {
		expect(timeAgoFr(daysAgo(400), NOW)).toBe('il y a 1 an');
	});
	test('invalid date returns input unchanged', () => {
		expect(timeAgoFr('not-a-date', NOW)).toBe('not-a-date');
	});
});
