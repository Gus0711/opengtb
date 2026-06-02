# Module `pdc` — Pertes de charge hydrauliques

Calcul des pertes de charge d'un **chemin hydraulique en série** (circulateur
→ point le plus défavorable → retour) pour un réseau d'eau (chauffage, eau
glacée, ECS bouclée, PAC, géothermie). Sortie : HMT totale, répartition,
verdict global, détail par tronçon avec V, Re, λ, ΔP linéique et singulière.

Inclut un mode **auto-dimensionnement DN** qui retient la plus petite
désignation commerciale d'un matériau respectant des critères locaux
(V max, ΔP/m max).

**Hors-scope V1** : réseaux maillés (Hardy-Cross), réseaux ramifiés
multi-branches, coup de bélier, cavitation, transitoires.

---

## Stack

| Choix | Justification |
|---|---|
| TypeScript strict | Module scientifique multi-tronçons avec unions discriminées (types d'accessoires, modes débit/diamètre). Erreurs à la compilation > erreurs au calcul. |
| Vitest | Aligné sur le reste du projet (`v3v`, `conv`), exécution rapide, snapshots si besoin. |
| Aucune dépendance runtime | Module 100 % calcul, pas d'I/O. Aucune dépendance réseau à l'exécution. |
| Float64 IEEE 754 | Suffisant pour les ordres de grandeur HVAC (toutes les unités < 10⁷). Aucun arrondi prématuré ; arrondis uniquement à l'affichage. |

---

## Architecture

```
pdc/
├── types.ts           types métier (Circuit, Troncon, Accessoire, Resultat...)
├── constants.ts       g, ζ par défaut, rugosités, présets, seuils, codes
├── conversions.ts     Pa ↔ kPa ↔ mCE ↔ bar, m³/h ↔ m³/s, Q depuis P+ΔT
├── data/
│   ├── fluides.ts     tables ρ/ν/cp eau (NIST), MEG (Clariant), MPG (DOW)
│   └── designations.ts cuivre/PER/multicouche/acier noir/inox/PVC/PEHD/fonte
├── fluide.ts          proprietesFluide() — interpolation linéaire 2D
├── designations.ts    resoudreDimensionsTube()
├── friction.ts        vitesse, reynolds, λ (laminaire/Serghides/Colebrook/Haaland)
├── pertes.ts          pdcLineique, pdcSinguliere, zetaFromKvs, dpEquipement, Borda
├── validators.ts      validateInputs() — accumulateur d'erreurs/warnings
├── calc.ts            calculerPertesDeCharge() — orchestrateur
├── autoDim.ts         autoDimensionnerDN()
├── calc.test.ts       80+ tests (couverture > 90 %)
└── README.md
```

---

## Formules et sources normatives

| Formule | Référence |
|---|---|
| Darcy-Weisbach : ΔP = λ·(L/D)·ρV²/2 | NF EN 805 |
| Colebrook-White (référence académique) | Colebrook 1939, *J. Inst. Civ. Eng.* |
| Serghides (explicite, défaut) | Serghides 1984, *Chem. Eng.* — précision < 0.0023 % vs Colebrook |
| Haaland (pédagogique) | Haaland 1983, *J. Fluids Eng.* — précision ≈ 1-2 % vs Colebrook |
| Hagen-Poiseuille (laminaire) | λ = 64 / Re |
| Pertes singulières ΔP = ζ·ρV²/2 | Idel'cik *Mémento*, Crane TP-410, Suez Water Handbook |
| Borda (élargissement brusque) ζ = (1 - S₁/S₂)² | Idel'cik § 4-1 |
| Vannes ΔP = (Q/Kvs)²·(ρ/ρ₀) | NF EN 60534-2-1 (ρ₀ = 1000) |
| Équipement parabolique ΔP = ΔPnom·(Q/Qnom)² | Pratique CVC (régime turbulent dominé par pertes singulières) |
| Tables eau pure | NIST IAPWS-IF97 |
| Tables MEG | Clariant Antifrogen N + MEGlobal Ethylene Glycol Product Guide |
| Tables MPG | DOW DOWFROST Engineering and Operating Guide (Form 180-01286-0904 AMS) |
| Rugosités absolues | Crane TP-410 Appendix A, F. White *Fluid Mechanics* table 6.1 |
| Vitesses recommandées | NF EN 12828+A1, Guide Bâtiment Durable Bruxelles, XPair |
| Cuivre EN 1057 / PER EN ISO 15875 / Acier EN 10255-M / Inox EN 10312 série 2 / PVC EN ISO 1452 | normes citées |

**g = 9.80665 m/s²** exact (CIPM 1901). Par construction, 1 mCE = 9806.65 Pa
exactement. Aucune constante physique en dur dans le calcul : tout passe par
`constants.ts`.

---

## Validation numérique

| Cas | Entrée | Attendu | Vérifié dans `calc.test.ts` |
|---|---|---|---|
| Reynolds | Q=1 m³/h, D=20 mm, eau 20 °C | Re ≈ 17 600 ± 1 % | test 1 |
| λ laminaire | Re=1000 | λ = 0.064 | test 2 |
| λ Serghides vs Colebrook | Grille Re × ε/D | écart < 0.05 % | test 3 |
| λ Haaland vs Colebrook | Grille Re × ε/D | écart < 2 % | test 4 |
| ΔP linéique | V=1 m/s, D=20 mm, λ=0.025, ρ=1000 | 625 Pa/m exact | test 5 |
| ΔP singulière | ζ=0.3, V=1, ρ=1000 | 150 Pa exact | test 6 |
| Kvs → ΔP | Kvs=6.3, Q=2 | ≈ 10 078 Pa | test 7 |
| Équipement parabolique | ΔPnom=10 kPa @ Qnom=2, Q=3 | 22.5 kPa | test 8 |
| Q depuis P | 100 kW, ΔT=20 K, eau 70 °C | Q ≈ 4.40 m³/h | test 11 |
| Circuit symétrique | toggle ON | HMT ≈ ×2 (équipements exclus) | test 15 |

80+ tests passent, couverture > 90 % sur les lignes du module.

---

## Hypothèses et limites

- Régime stationnaire, monophasique, fluide incompressible.
- Pas de cavitation, pas de transitoires, pas de coup de bélier.
- Pas de pertes thermiques sur le tronçon : ρ et ν constants à la température
  fluide globale.
- Pas de réseaux maillés ni ramifiés multi-branches.
- Zone transitoire 2300 ≤ Re < 4000 : interpolation linéaire entre les bornes
  laminaire et turbulent, avec warning systématique (zone d'incertitude
  physique).
- Loi parabolique équipement valide sur **Q ∈ [0.3·Qnom ; 2·Qnom]** (régime
  turbulent dominé par pertes singulières) ; warning hors plage.
- Aucune extrapolation hors table fluide : throw si T sort de la plage
  tabulée d'une concentration utile.
- Pas de fallback silencieux : Colebrook non-convergent → throw avec code
  `COLEBROOK_NO_CONVERGENCE`.

---

## API

### `calculerPertesDeCharge(circuit: Circuit): Resultat`

Calcul principal d'un circuit en série. Pure, déterministe, ne mute pas
l'entrée.

```ts
import { calculerPertesDeCharge } from '$lib/tools/pdc/calc';

const circuit = {
  preset: 'radiateurs' as const,
  fluide: { type: 'eau' as const, temperature: 70 },
  options: { methodeLambda: 'serghides' as const, circuitFermeSymetrique: true },
  troncons: [
    {
      id: 'T1',
      ordre: 1,
      libelle: 'Sortie chaudière → distributeur',
      type: 'chaufferie' as const,
      longueur: 12,
      diametre: { mode: 'designation' as const, materiau: 'acier_noir_neuf' as const, designation: 'DN40' },
      debit: { mode: 'puissance' as const, puissanceKw: 80, deltaTk: 20 },
      accessoires: [
        { type: 'coude_90_grand_rayon' as const, quantite: 4 },
        { type: 'vanne_kvs' as const, quantite: 1, kvs: 25, libelle: 'Vanne isolement' },
        { type: 'equipement_dp' as const, quantite: 1, dpNominaleKpa: 15, debitNominalM3h: 3.6, libelle: 'Échangeur PAC' }
      ]
    }
  ]
};

const r = calculerPertesDeCharge(circuit);
console.log(r.resume.hmtTotale.kPa);                  // HMT en kPa
console.log(r.resume.verdictGlobal);                  // 'ok' | 'limite' | 'rejete'
console.log(r.detail.troncons[0].vitesseMs);          // vitesse calculée
console.log(r.resume.repartitionPct);                 // %  linéaire / singulière / équipements
```

### `autoDimensionnerDN(input): AutoDimResultat`

Retient la plus petite désignation d'un matériau qui respecte des critères
locaux.

```ts
import { autoDimensionnerDN } from '$lib/tools/pdc/autoDim';

const r = autoDimensionnerDN({
  materiau: 'cuivre_neuf',
  debit: { mode: 'manuel', valeurM3h: 2 },
  fluide: { type: 'eau', temperature: 60 },
  criteres: { vitesseMaxMs: 1, dpLineiqueMaxPaParM: 300 }
});

if (r.succes) {
  console.log(r.retenue!.designation);                // ex : '35x1.5'
  console.log(r.retenue!.vitesseMs);                  // V réelle dans ce DN
} else {
  console.error(r.message);
}
```

### Fonctions intermédiaires exportées

Toutes testables individuellement :

- `proprietesFluide(type, glycolPct, T) → FluidProps`
- `debitDepuisPuissance(P_kW, ΔT_K, cpVol) → m³/h`
- `vitesse(Q_m3h, D_mm) → m/s`
- `reynolds(V, D_m, ν) → Re`
- `rugositeRelative(ε_mm, D_mm) → ε/D`
- `lambdaLaminaire(Re)`, `lambdaSerghides(Re, ε/D)`,
  `lambdaColebrook(Re, ε/D, tol, maxIter)`, `lambdaHaaland(Re, ε/D)`,
  `lambdaDispatch(Re, ε/D, methode, options)`
- `pdcLineiquePaParM(λ, D_m, V, ρ)`, `pdcSinguliere(ζ, V, ρ)`,
  `zetaFromKvs(Kvs, Q, ρ, V)`, `dpEquipement(ΔPnom, Qnom, Qreel)`,
  `zetaBorda(S₁/S₂)`
- `resoudreDimensionsTube(input) → TubeGeometry`
- `dpToMCE`, `dpToKPa`, `dpToBar`, `dpAllUnits`, `dpUnitsTrio`

---

## Codes d'erreurs et warnings

Exportés depuis `constants.ts` (`ERROR_CODES`, `WARNING_CODES`).

**Erreurs bloquantes** : `INVALID_DIAMETER`, `INVALID_LENGTH`, `INVALID_FLOW`,
`TEMPERATURE_OUT_OF_RANGE`, `INCONSISTENT_FLUID`, `UNKNOWN_MATERIAL`,
`UNKNOWN_DESIGNATION`, `MISSING_DESIGNATION`, `MISSING_ZETA`, `MISSING_KVS`,
`MISSING_DP_NOMINAL`, `UNKNOWN_LAMBDA_METHOD`, `COLEBROOK_NO_CONVERGENCE`,
`MISSING_GLYCOL_PCT`, `GLYCOL_OUT_OF_RANGE`.

**Warnings** : `VITESSE_TROP_ELEVEE`, `VITESSE_TROP_FAIBLE`,
`REGIME_TRANSITOIRE`, `DP_LINEIQUE_TROP_ELEVEE`, `DP_LINEIQUE_TROP_FAIBLE`,
`EXTRAPOLATION_EQUIPEMENT`, `RUGOSITE_INHABITUELLE`, `EXTRAPOLATION_FLUIDE`,
`VITESSE_CUIVRE_EROSION`.

Tous les messages sont en français, mentionnent la valeur reçue et la plage
attendue.

---

## Conventions internes

- **Aucun arrondi prématuré** : tout en `Float64`, arrondi uniquement à
  l'affichage côté UI.
- **Aucune mutation** des entrées : l'orchestrateur clone implicitement via
  destructuration et `.map(...)`.
- **Aucune fonction de calcul ne touche au DOM**.
- **Aucun `console.log`** en production.
- **Aucune dépendance réseau** à l'exécution.

---

## Changelog

### 1.0.0 — 2026-05-16

Première version :
- moteur complet (3 méthodes λ, 8 matériaux, MEG/MPG, équipements,
  symétrie),
- auto-dimensionnement DN,
- 80+ tests, couverture > 90 %,
- UI Svelte 5 dans `src/routes/outils/pdc/+page.svelte` avec import/export
  JSON, bouton "Copier la fiche", verdict block opengtb.
