/**
 * Formate une date ISO en distance relative au présent, en français.
 * Exemples : « aujourd'hui », « hier », « il y a 12 jours », « il y a 3 mois ».
 *
 * Volontairement simple — pas de gestion de futur, pas de localisation
 * paramétrable. Utilisé pour afficher la fraîcheur du catalogue TTN.
 */
export function timeAgoFr(iso: string, now: Date = new Date()): string {
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return iso;
	const ms = now.getTime() - d.getTime();
	const days = Math.floor(ms / (1000 * 60 * 60 * 24));
	if (days <= 0) return "aujourd'hui";
	if (days === 1) return 'hier';
	if (days < 30) return `il y a ${days} jours`;
	const months = Math.floor(days / 30);
	if (months === 1) return 'il y a 1 mois';
	if (months < 12) return `il y a ${months} mois`;
	const years = Math.floor(days / 365);
	if (years === 1) return 'il y a 1 an';
	return `il y a ${years} ans`;
}
