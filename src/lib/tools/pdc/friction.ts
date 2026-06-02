/**
 * Coefficient de frottement de Darcy λ et grandeurs cinématiques.
 *
 * Hypothèse : conduite circulaire pleine, régime stationnaire monophasique,
 * fluide incompressible.
 *
 * Références :
 *   - C.F. Colebrook, "Turbulent Flow in Pipes, With Particular Reference to
 *     the Transition Region Between the Smooth and Rough Pipe Laws",
 *     J. Inst. Civ. Eng., 1939, vol. 11, p. 133-156.
 *   - T.K. Serghides, "Estimate friction factor accurately",
 *     Chemical Engineering, vol. 91, n° 5, 1984, p. 63-64.
 *   - S.E. Haaland, "Simple and Explicit Formulas for the Friction Factor in
 *     Turbulent Pipe Flow", J. Fluids Eng., 1983, vol. 105, p. 89-90.
 *   - G. Hagen / J.L.M. Poiseuille (1839, 1840) — régime laminaire.
 */

import {
	RE_LAMINAIRE_MAX,
	RE_TURBULENT_MIN,
	SEC_PAR_HEURE,
	WARNING_CODES,
	ERROR_CODES
} from './constants';
import type { LambdaMethod, Regime, Warning } from './types';

/**
 * Vitesse moyenne dans une conduite circulaire pleine.
 *
 *   V [m/s] = Q [m³/s] / S [m²]  avec  S = π · D² / 4
 *
 * Q est saisi en m³/h, D en mm — les conversions sont faites ici.
 */
export function vitesse(Q_m3h: number, D_mm: number): number {
	if (D_mm <= 0) throw new Error('Diamètre intérieur doit être strictement positif (mm).');
	const D_m = D_mm / 1000;
	const Q_m3s = Q_m3h / SEC_PAR_HEURE;
	const S = Math.PI * D_m * D_m * 0.25;
	return Q_m3s / S;
}

/**
 * Nombre de Reynolds.
 *
 *   Re = V · D / ν
 *
 * V en m/s, D en m, ν en m²/s.
 */
export function reynolds(V_ms: number, D_m: number, nu_m2s: number): number {
	if (nu_m2s <= 0) throw new Error('Viscosité cinématique doit être strictement positive.');
	return (V_ms * D_m) / nu_m2s;
}

/**
 * Rugosité relative ε/D (sans dimension).
 *
 * ε et D doivent être dans la même unité — ici en mm en entrée pour
 * matcher les tables matériau, conversion implicite.
 */
export function rugositeRelative(eps_mm: number, D_mm: number): number {
	if (D_mm <= 0) throw new Error('Diamètre doit être strictement positif.');
	return eps_mm / D_mm;
}

/* ============================================================ */
/*  Régime laminaire                                             */
/* ============================================================ */

/**
 * Coefficient λ en régime laminaire (Hagen-Poiseuille) :
 *   λ = 64 / Re
 *
 * Valable pour Re < 2300.
 */
export function lambdaLaminaire(Re: number): number {
	if (Re <= 0) throw new Error('Re doit être strictement positif.');
	return 64 / Re;
}

/* ============================================================ */
/*  Régime turbulent — 3 solveurs                                */
/* ============================================================ */

/**
 * Approximation explicite de Serghides pour le coefficient de Darcy.
 *
 * Écart maximal mesuré ≈ 0.0023 % vs Colebrook-White exact sur la plage
 * Re ∈ [4·10³, 10⁸] et ε/D ∈ [0, 5·10⁻²].
 *
 *   A = -2·log₁₀( (ε/D)/3.7 + 12/Re )
 *   B = -2·log₁₀( (ε/D)/3.7 + 2.51·A/Re )
 *   C = -2·log₁₀( (ε/D)/3.7 + 2.51·B/Re )
 *   1/√λ = A - (B-A)² / (C - 2·B + A)
 *
 * Référence : Serghides 1984.
 */
export function lambdaSerghides(Re: number, epsD: number): number {
	if (Re <= 0) throw new Error('Re doit être strictement positif.');
	if (epsD < 0) throw new Error('ε/D doit être ≥ 0.');
	const k = epsD / 3.7;
	const A = -2 * Math.log10(k + 12 / Re);
	const B = -2 * Math.log10(k + (2.51 * A) / Re);
	const C = -2 * Math.log10(k + (2.51 * B) / Re);
	const denom = C - 2 * B + A;
	const invSqrt = A - ((B - A) * (B - A)) / denom;
	return 1 / (invSqrt * invSqrt);
}

/**
 * Approximation explicite de Haaland (pédagogique).
 *
 *   1/√λ = -1.8 · log₁₀ ( ((ε/D)/3.7)^1.11 + 6.9/Re )
 *
 * Écart typique 1-2 % vs Colebrook. Conservée pour comparaison.
 *
 * Référence : Haaland 1983.
 */
export function lambdaHaaland(Re: number, epsD: number): number {
	if (Re <= 0) throw new Error('Re doit être strictement positif.');
	if (epsD < 0) throw new Error('ε/D doit être ≥ 0.');
	const invSqrt = -1.8 * Math.log10(Math.pow(epsD / 3.7, 1.11) + 6.9 / Re);
	return 1 / (invSqrt * invSqrt);
}

export interface LambdaColebrookResult {
	lambda: number;
	iterations: number;
	converged: boolean;
}

/**
 * Solveur Colebrook-White par itération point fixe.
 *
 *   1/√λ = -2 · log₁₀ ( (ε/D)/3.7 + 2.51 / (Re·√λ) )
 *
 * Initialisation : valeur Serghides (proche racine, accélère).
 *
 * Convergence : |λ_{n+1} - λ_n| < tol. Échec → throw.
 *
 * Référence : Colebrook 1939.
 */
export function lambdaColebrook(
	Re: number,
	epsD: number,
	tol = 1e-10,
	maxIter = 50
): LambdaColebrookResult {
	if (Re <= 0) throw new Error('Re doit être strictement positif.');
	if (epsD < 0) throw new Error('ε/D doit être ≥ 0.');
	let lambda = lambdaSerghides(Re, epsD);
	for (let i = 1; i <= maxIter; i++) {
		const sqrtL = Math.sqrt(lambda);
		const invSqrt = -2 * Math.log10(epsD / 3.7 + 2.51 / (Re * sqrtL));
		const next = 1 / (invSqrt * invSqrt);
		if (Math.abs(next - lambda) < tol) {
			return { lambda: next, iterations: i, converged: true };
		}
		lambda = next;
	}
	const err = new Error(
		`Solveur Colebrook non-convergent après ${maxIter} itérations à Re=${Re}, ε/D=${epsD}.`
	);
	(err as { code?: string }).code = ERROR_CODES.COLEBROOK_NO_CONVERGENCE;
	throw err;
}

/* ============================================================ */
/*  Dispatcher                                                   */
/* ============================================================ */

export interface LambdaDispatchResult {
	lambda: number;
	methode: LambdaMethod;
	regime: Regime;
	warnings: Warning[];
	iterationsColebrook?: number;
}

/**
 * Calcule λ selon la méthode demandée, en tenant compte du régime :
 *
 *   - Re < 2300        → 64/Re (laminaire, indépendant de la méthode)
 *   - 2300 ≤ Re < 4000 → interpolation linéaire entre λ(2300) laminaire et
 *                        λ(4000) turbulent par la méthode demandée.
 *                        Émet un warning REGIME_TRANSITOIRE.
 *   - Re ≥ 4000        → méthode demandée (serghides | colebrook | haaland).
 *
 * Pas de fallback silencieux : Colebrook non-convergent throw.
 */
export function lambdaDispatch(
	Re: number,
	epsD: number,
	methode: LambdaMethod,
	options: { tolerance?: number; maxIter?: number; tronconId?: string | null } = {}
): LambdaDispatchResult {
	const warnings: Warning[] = [];
	const tronconId = options.tronconId ?? null;

	const turbulent = (RR: number): { lambda: number; iter?: number } => {
		switch (methode) {
			case 'serghides':
				return { lambda: lambdaSerghides(RR, epsD) };
			case 'colebrook': {
				const r = lambdaColebrook(RR, epsD, options.tolerance ?? 1e-10, options.maxIter ?? 50);
				return { lambda: r.lambda, iter: r.iterations };
			}
			case 'haaland':
				return { lambda: lambdaHaaland(RR, epsD) };
			default: {
				const err = new Error(`Méthode λ inconnue : ${String(methode)}.`);
				(err as { code?: string }).code = ERROR_CODES.UNKNOWN_LAMBDA_METHOD;
				throw err;
			}
		}
	};

	if (Re < RE_LAMINAIRE_MAX) {
		return {
			lambda: lambdaLaminaire(Re),
			methode,
			regime: 'laminaire',
			warnings
		};
	}

	if (Re < RE_TURBULENT_MIN) {
		// Zone transitoire : aucune corrélation universellement validée.
		// Interpolation linéaire entre les deux bornes pour ne pas créer de
		// discontinuité visible côté UI.
		const lamLam = lambdaLaminaire(RE_LAMINAIRE_MAX);
		const { lambda: lamTurb, iter } = turbulent(RE_TURBULENT_MIN);
		const t = (Re - RE_LAMINAIRE_MAX) / (RE_TURBULENT_MIN - RE_LAMINAIRE_MAX);
		const lam = lamLam + (lamTurb - lamLam) * t;
		warnings.push({
			code: WARNING_CODES.REGIME_TRANSITOIRE,
			niveau: 'warning',
			message: `Re = ${Re.toFixed(0)} dans la zone transitoire [2300 ; 4000] : λ interpolé linéairement, résultat indicatif.`,
			troncon: tronconId,
			valeur: Re,
			seuil: RE_TURBULENT_MIN
		});
		return {
			lambda: lam,
			methode,
			regime: 'transitoire',
			warnings,
			iterationsColebrook: iter
		};
	}

	const { lambda: lam, iter } = turbulent(Re);
	return {
		lambda: lam,
		methode,
		regime: 'turbulent',
		warnings,
		iterationsColebrook: iter
	};
}
