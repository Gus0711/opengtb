const DATE_LONG = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' });
const DATE_SHORT = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' });

export const formatDateLong = (iso: string): string => DATE_LONG.format(new Date(iso));
export const formatDateShort = (iso: string): string => DATE_SHORT.format(new Date(iso));

export const formatNumber = (n: number, maximumFractionDigits = 2): string =>
	new Intl.NumberFormat('fr-FR', { maximumFractionDigits }).format(n);

export const formatCompact = (n: number): string =>
	new Intl.NumberFormat('fr-FR', { notation: 'compact' }).format(n);

export const formatMonthYear = (iso: string): string => {
	const d = new Date(iso);
	return `${String(d.getMonth() + 1).padStart(2, '0')} / ${d.getFullYear()}`;
};
