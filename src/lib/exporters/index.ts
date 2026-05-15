/**
 * Abstraction d'export pour les outils OpenGTB.
 * Phase 1 (V1) : génération locale dans le navigateur, branding OpenGTB.
 * Phase 2 (tier payant) : bascule vers un appel API serveur pour white-label.
 * Le contrat `Exporter` reste stable ; seule l'implémentation change.
 */
export type ExportFormat = 'pdf' | 'csv' | 'svg' | 'json';

export interface Exporter<TInput> {
	readonly format: ExportFormat;
	render(input: TInput): Promise<Blob>;
}
