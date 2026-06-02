# Revue de code — opengtb

> Revue **en lecture seule** menée le 2026-06-02 sur l'arbre de travail courant
> (branche `main`). Aucune ligne de code source n'a été modifiée. Les corrections
> ci-dessous sont **proposées**, pas appliquées.
>
> ⚠️ **Contexte important** : l'arbre n'était pas propre au moment de la revue.
> Un travail conséquent est en cours **non commité** — 4 nouveaux outils
> (`dju`, `air-hyg`, `modbus`, `pdc`), leurs pipelines de build (`scripts/dju`,
> `scripts/modbus`), leurs données (`static/data/`), plus des modifs du registry,
> de `ToolShell`, des composants home et du sitemap. Plusieurs constats portent
> donc sur du code **pré-commit** : ils sont à traiter **avant** de figer ce lot.

---

## 1. Synthèse exécutive

1. **L'architecture est saine.** Séparation nette logique métier (`src/lib/tools/<slug>/`)
   / UI (`src/routes/outils/<slug>/` + `components/tools/`) / données (`static/data/`)
   / pipelines (`scripts/`). Registry et types déclaratifs centralisés, enveloppe UI
   unique (`ToolShell`), symétrie build→`static/data`/runtime-`fetch` cohérente entre
   `dju` et `modbus`. Les écarts sont surtout de **cohérence transversale** et
   d'**hygiène de repo**, pas de défauts de conception.

2. **Les tests sont bien meilleurs que ne le laisse penser `git status`** : 19 fichiers,
   **640 cas, tous verts** (`vitest run` en 4,7 s), `svelte-check` à **0 erreur**. La
   logique physique des outils de dimensionnement (PAC, air-hygiène) est couverte avec
   des valeurs de référence et des tolérances. Très bon socle.

3. **Le maillon faible est l'absence de garde-fous automatiques** : pas de CI
   (`.github/workflows/` absent), pas de hook pre-commit, pas d'ESLint, pas de mesure
   de couverture. Rien ne force les 640 tests + le typecheck à tourner avant un merge —
   critique pour un outil de **calcul métier** où une régression est silencieuse.

4. **Un secret réel traîne en clair sur disque** (`.env`, non versionné) : credential
   OAuth Météo-France + `ADMIN_TOKEN`. Pas dans l'historique git ni dans l'image Docker,
   mais à considérer comme **compromis** et à régénérer (voir CRIT-1).

5. **Hygiène de repo à faire avant commit** : supprimer `dju_niagara_exemple_a_supprimer/`
   (code Niagara de référence, le nom le dit), reclasser `opengtb_logo.png` (racine,
   perms 600), et homogénéiser le découpage UI des 4 nouveaux outils (`air-hyg`/`pdc`
   sont monolithiques à ~1000 lignes là où `dju` est proprement décomposé).

---

## 2. Constats classés par sévérité

Légende emplacement : `chemin:ligne` relatif à la racine du repo.

### 🔴 Critique

#### CRIT-1 — Credential OAuth Météo-France + `ADMIN_TOKEN` réels en clair dans `.env`
- **Emplacement** : `.env:1-2`
- **Problème** : `MF_APPLICATION_ID` contient un Application ID base64 **réel et actif**
  (le base64 n'est pas du chiffrement : il révèle directement le couple
  `client_id:client_secret`). `ADMIN_TOKEN` est lui aussi une vraie valeur, pas un
  placeholder. Atténuations en place : `.env` est gitignoré (`.gitignore:17-19`) et
  dockerignoré, **jamais commité** (`git log --all -- .env` vide), donc absent de
  l'historique et de l'image runtime. Risque résiduel : le secret est en clair sur le
  poste ; tout backup non chiffré, partage de dossier ou `COPY . .` futur l'exposerait.
- **Recommandation** : considérer ce credential **compromis** (il a transité en session)
  et le **régénérer** côté portail Météo-France ; régénérer `ADMIN_TOKEN`
  (`openssl rand -hex 24`). Vérifier qu'aucune copie de `.env` n'est synchronisée
  (cloud/backup). _Action hors-doc — à faire par le mainteneur._

#### CRIT-2 (hygiène) — `dju_niagara_exemple_a_supprimer/` à supprimer
- **Emplacement** : `dju_niagara_exemple_a_supprimer/` (racine, 3 fichiers `.js`, ~34 Ko)
- **Problème** : il s'agit en réalité de code **Java Niagara** (`public void onStart() throws Exception`)
  servant de référence, non référencé par l'app (`grep` négatif), hors arborescence
  `src`/`scripts`. Le nom même demande la suppression. Ne contient **pas** de secret en
  dur (l'Application ID est lu depuis un point Niagara), mais risque d'être `git add`-é
  par erreur ou copié dans un contexte de build moins protégé.
- **Recommandation** : supprimer le dossier (le code utile est porté dans `scripts/dju/`).
  À défaut immédiat, l'ajouter à `.gitignore` **et** `.dockerignore`.

### 🟠 Majeur

#### MAJ-1 — Absence totale de CI / hooks
- **Emplacement** : pas de `.github/workflows/`, pas de husky/lint-staged, `.git/hooks/`
  ne contient que les samples.
- **Problème** : rien ne garantit que `npm test` (640 cas) et `npm run check` tournent
  avant un merge. Pour des outils de calcul où une régression est silencieuse, c'est le
  manque le plus structurant.
- **Recommandation** : workflow GitHub Actions minimal (`npm ci && npm run check && npm test`)
  sur push/PR (~15 lignes verrouillent tout l'existant). Optionnel : hook pre-commit
  léger (`vitest related` / `svelte-check`).

#### MAJ-2 — Logique d'agrégation DJU dupliquée build ⇄ runtime
- **Emplacement** : `scripts/dju/fetch-data.ts:137-201` ⇄ `src/lib/tools/dju/calc.ts:16-106`
- **Problème** : `aggregateYearly`/`aggregateAverages` (build) et `recomputeWithBases`
  (runtime) implémentent **la même** logique (regroupement année/mois, `tMean` pondéré
  par `nbDays`, moyennes sur années complètes, `round1`). Le commentaire `calc.ts:14` le
  reconnaît. Risque : divergence silencieuse des bases DJU entre données pré-générées et
  recalcul utilisateur, + double maintenance.
- **Recommandation** : extraire un module pur partagé `src/lib/tools/dju/aggregate.ts`,
  importé des deux côtés (le script Node importe déjà `src/lib` pour modbus).

#### MAJ-3 — `air-hyg`/`pdc` : pages monolithiques (~1000 lignes)
- **Emplacement** : `src/routes/outils/air-hyg/+page.svelte` (~950 l.),
  `src/routes/outils/pdc/+page.svelte` (~1096 l.)
- **Problème** : tout l'état, le calcul d'affichage et le balisage dans un seul fichier,
  sans aucun composant extrait (`components/tools/air-hyg/` et `.../pdc/` inexistants),
  là où `dju` est exemplaire (5 composants extraits). Incohérent avec le pattern projet.
- **Recommandation** : extraire les sections répétées (cartes de résultats, tables,
  formulaires de tronçons/locaux) vers `src/lib/components/tools/{air-hyg,pdc}/`, en
  alignant sur le découpage `dju`.

#### MAJ-4 — Options air-hyg déclarées mais jamais lues (bug latent ou code mort)
- **Emplacement** : `src/lib/tools/air-hyg/calcul.ts` (moteur) vs `.../air-hyg/+page.svelte:32-33`
- **Problème** : `projet.options.methodeCalcul` et `projet.options.categorieQaiCible`
  sont dans le type et fixés par l'UI mais **jamais lus** par `calculerDebitsHygieniques`
  (seuls `categorieBatiment` et `co2Exterieur_ppm` le sont). Soit ces options doivent
  influencer le résultat (**bug fonctionnel latent**), soit ce sont des champs morts.
- **Recommandation** : trancher l'intention métier — câbler les options dans le moteur,
  ou les retirer du type et de l'UI.

#### MAJ-5 — Filtrage de warnings PDC obscur et O(n²)
- **Emplacement** : `src/lib/tools/pdc/calc.ts:499-505`
- **Problème** : `warnings.push(...out.warnings.filter((w) => !troncons.find((tr) => tr.id === w.troncon)))`
  avec un commentaire (ligne 502) qui décrit un comportement que le code ne réalise pas ;
  les warnings sont par ailleurs déjà re-filtrés dans `ResultatTroncon.warnings` (ligne 399).
  Risque de doublons/omissions selon l'ordre, complexité quadratique.
- **Recommandation** : clarifier et documenter la propriété de chaque liste de warnings
  (globale vs par tronçon), ou dédupliquer par `code+troncon`.

#### MAJ-6 — `calculerLocal` (air-hyg) : fonction de ~190 lignes
- **Emplacement** : `src/lib/tools/air-hyg/calcul.ts:255-447`
- **Problème** : 8 étapes numérotées dans une seule fonction. Lisible mais difficile à
  tester par étape et à faire évoluer.
- **Recommandation** : découper en sous-fonctions (`calculerDebitsLocal`,
  `construireWarningsCO2`, `verifierInstallation`).

#### MAJ-7 — Couverture de tests manquante sur les conversions et validateurs
- **Emplacement** : `src/lib/tools/pdc/conversions.ts`, `pdc/validators.ts`,
  `air-hyg/validators.ts`, `v3v/validators.ts`, `pdc/autoDim.ts`, `dju/data.ts`
- **Problème** : ces fonctions ne sont **pas testées directement**. Une erreur de facteur
  d'unité (Pa↔kPa↔mCE, cp volumique) dans `conversions.ts` est exactement le type d'erreur
  silencieuse qui fausse un dimensionnement HMT sans planter. Les validateurs sont les
  garde-fous anti-saisie aberrante : un validateur trop laxiste produit un résultat faux
  mais crédible.
- **Recommandation** : tests unitaires directs prioritaires sur `conversions.ts` et les
  trois `validators.ts` (valeurs de référence + cas-limites d'égalité aux bornes).

#### MAJ-8 — `build.ts` : l'échec d'un seul clone avorte tout le manifest
- **Emplacement** : `scripts/modbus/build.ts:91,96` (`execSync('git clone …')`)
- **Problème** : 7 sources clonées ; l'échec d'**une** (réseau, repo renommé) remonte au
  `main().catch` global et bloque la régénération **complète** du manifest, alors que la
  collecte par-device est déjà tolérante aux erreurs.
- **Recommandation** : envelopper chaque source dans un try/catch au niveau `main` pour
  dégrader gracieusement (manifest partiel + warning).

### 🟡 Mineur

| # | Emplacement | Problème | Recommandation |
|---|---|---|---|
| MIN-1 | `src/routes/outils/{air-hyg,pdc,modbus}/+page.svelte` vs `[slug]/+page.ts:7` | Deux conventions d'accès au registry coexistent (`getTool('<slug>')!` côté composant vs `tool` passé par `load()`) | Uniformiser |
| MIN-2 | `src/lib/tools/types.ts:20` | `Tool.slug` typé `string`, non contraint → `getTool('xxx')!` sur slug erroné casse au runtime | Type union des slugs, ou test registry↔dossiers `routes/outils/` |
| MIN-3 | `src/lib/tools/registry.ts:87` | `name: 'dju ipmvp'` contient un espace, là où tous les autres `name` sont des tokens — rend `gtb dju ipmvp` dans `ToolShell` | Vérifier vs esthétique `$ gtb <cmd>` |
| MIN-4 | `package.json:8`, `manifest.generated.json`, `dju/data/*.json` | Artefacts générés commités dans `src/`, non gitignorés, régénération 100 % manuelle (non branchée sur `npm run build`) → dérive possible données/code | Documenter la séquence de régénération + check CI manifest committé == régénéré |
| MIN-5 | `src/routes/outils/modbus/[vendor]/` | Pas d'index `+page.svelte` au niveau vendor ni de `+error.svelte` sous `outils/` → `/outils/modbus/abb` renvoie un 404 brut | Ajouter un index vendor ou un `+error.svelte` |
| MIN-6 | `src/lib/tools/decode/decoder.ts:112` | Codecs vendeurs exécutés via `new Function()` sur le main thread (pas de sandbox réelle, le garde `setTimeout ~2s` annoncé dans `SPEC.md` n'est pas implémenté) | Acceptable tant que les codecs restent des assets versionnés ; si un jour codec collé par l'utilisateur → Web Worker + timeout. Tracer en V2 |
| MIN-7 | `vite.config.ts:9` | Dev server bindé sur `0.0.0.0` → `/__svg-admin` écoute sur toutes les interfaces en dev | S'assurer que `ADMIN_TOKEN` reste fort si `vite dev` tourne sur une machine accessible |
| MIN-8 | `Caddyfile` | CSP absente (TODO V2 assumé) ; pertinente vu le `new Function()` des codecs | Définir `Content-Security-Policy` en V2 (arbitrer `'unsafe-eval'`) |
| MIN-9 | `.dockerignore` | Ne liste pas `dju_niagara_exemple_a_supprimer/` (sans impact runtime car seul `build/` est copié, mais à nettoyer) | Ignorer le dossier, ou mieux : le supprimer (CRIT-2) |
| MIN-10 | `src/lib/tools/air-hyg/calcul.ts:245-247` | `verdictLocalDepuisCO2` : deux conditions (`<= CIBLE`, `<= ACCEPTABLE`) renvoient toutes deux `'conforme'` → la zone CIBLE→ACCEPTABLE devait probablement donner `'acceptable_avec_reserves'`. **Verdict CO₂ potentiellement faux** | Trancher l'intention métier |
| MIN-11 | `src/lib/tools/air-hyg/calcul.ts:72-75` | `tauxRenouvellement` retourne `Infinity` si `V_m3 <= 0` ; le moteur ne dépend pas de `validateProjet` (validation seulement côté page) → appel direct du moteur produit `Infinity` non borné | Documenter le contrat, ou borner dans le moteur |
| MIN-12 | `scripts/dju/fetch-data.ts:32-35` vs `src/lib/tools/dju/data.ts:24` | Année de départ 2010 codée en dur dans **deux** sources de vérité (le commentaire `// 2010→2025` est déjà figé) | Source unique pour l'année de départ / le nombre d'années |
| MIN-13 | `src/lib/tools/decode/decoder.ts:112` + `scripts/modbus/build.ts:94` | `throw new Error('unreachable')` logiquement inatteignable mais peu explicite | Message explicite |
| MIN-14 | code applicatif | Pattern `(err as { code?: string }).code = …` répété ~8× (friction.ts, fluide.ts, designations) | Centraliser via une classe `DomainError extends Error { code; value; min; max }` (déjà à moitié fait via `newOutOfRangeError`) |
| MIN-15 | `src/lib/tools/pdc/calc.ts:174,196,…` | Assertions non-null `!` fréquentes, sûres seulement **parce que** la validation précède (couplage implicite non garanti par les types) | Types discriminés (`{mode:'manuel', valeurM3h:number} \| {mode:'puissance',…}`) pour supprimer les `!` |
| MIN-16 | `opengtb_logo.png` (racine) | Fichier 1,4 Mo hors `static/`, perms `600` atypiques | Déplacer dans `static/` (si logo produit) ou avec `design-export/` (si source design) |
| MIN-17 | `CLAUDE.md` | Décrit le repo comme « pre-implementation, no source code » alors que 13 outils existent | Mettre à jour (voir Phase 2) |
| MIN-18 | `vite.config.ts:13-16` | `environment: 'node'` → aucun test de composant Svelte possible ; pas de `@vitest/coverage-v8` → couverture non mesurable | Ajouter la couverture ; jsdom si besoin de tester des composants |
| MIN-19 | absence | Pas d'ESLint ni de Prettier verrouillé (code formaté façon Prettier mais via l'éditeur) | Ajouter `prettier --check` + `npm run lint` (TS strict couvre déjà l'essentiel des types) |
| MIN-20 | `src/routes/_admin/svg/+page.svelte:286` | Warning a11y `svelte-check` : label sans contrôle associé | Corriger le label |

### 🟢 Suggestions

- **SUG-1** — Trois conventions de placement des données coexistent (`pdc/data/*.ts`,
  `dju/data/*.json`, `air-hyg/constants.ts`). Standardiser `<slug>/data/` pour tout jeu
  de tables volumineux. _(Note : `pdc/data/` + couche logique `pdc/*.ts` est un **bon**
  pattern, pas un doublon.)_
- **SUG-2** — `main()` des scripts de build (`build.ts:352-466`, ~115 l.) : 7 sources en
  copier-coller. Une table `{repo, cache, collect}` itérée réduirait le risque d'oubli.
- **SUG-3** — Typo de nommage `collectJibrisharafiDevices` (`build.ts:111`) : le repo est
  `jibrilsharafi` (avec « l »).
- **SUG-4** — Exports anticipés non consommés (`dpToHauteurFluide`, `m3hToM3s`, `dpToKPa`,
  `dpToBar`, `emissionCO2Totale_lh`…), avec `void dpAllUnits;` (`pdc/calc.ts:571`) pour
  taire le lint. Légitime si testés (cf. MAJ-7), sinon retirer.
- **SUG-5** — `scripts/dju/lib/mf-client.ts` : ajouter un en-tête `// SERVER/BUILD ONLY`
  (voire un test de garde) pour empêcher un import accidentel depuis `src/lib`/`src/routes`
  qui ferait fuiter le pattern d'auth dans le bundle client.
- **SUG-6** — `writeIndex` réécrit après chaque station (`fetch-data.ts:334`) : checkpoint
  volontaire (run long throttlé), juste à commenter comme tel.
- **SUG-7** — `bracketConcentration` pour `pct < 10 %` interpole depuis 10 % au lieu de
  l'eau pure (`fluide.ts:109-117`) : sous-estime légèrement à faible glycol, à signaler côté UI.

---

## 3. Points forts à préserver

- **Robustesse numérique exemplaire dans `pdc`** : `vitesse`, `reynolds`,
  `debitDepuisPuissance`, `zetaFromKvs`, `dpEquipement`, Colebrook (non-convergence
  `throw`) testent tous le dénominateur `> 0` et lèvent des erreurs explicites.
- **`scripts/dju/lib/mf-client.ts`** : retry 429 exponentiel + jitter, cache token avec
  marge, polling 201/204/410 distingués, `fetchMonthlyRange` qui respecte la limite 1 an
  de l'API. Qualité réseau élevée.
- **Sécurité côté client** : aucun secret n'atteint le bundle (le credential Météo-France
  ne vit que dans les scripts Node de build) ; build 100 % statique → zéro endpoint
  serveur en prod ; l'admin SVG est `apply: 'serve'` (dev-only) avec protection
  path-traversal correcte.
- **Parsing robuste** : `parseHex`/`parseBase64` (decode) rejettent les entrées
  malformées sans jamais produire de `NaN`, bornent taille (`MAX_PAYLOAD_BYTES = 256`)
  et `fPort` (1–223).
- **TS strict** (`tsconfig.json` `strict: true`, `checkJs: true`) + `svelte-check` à 0 erreur.

---

## 4. Dette technique priorisée

| Priorité | Action | Réf. | Effort |
|---|---|---|---|
| **P0** | Régénérer le credential Météo-France + `ADMIN_TOKEN` (compromis) | CRIT-1 | Faible |
| **P0** | Supprimer `dju_niagara_exemple_a_supprimer/` avant commit | CRIT-2 | Trivial |
| **P1** | Workflow CI `npm ci && npm run check && npm test` | MAJ-1 | Faible |
| **P1** | Tests directs `conversions.ts` + 3 `validators.ts` | MAJ-7 | Moyen |
| **P1** | Trancher MAJ-4 (options air-hyg) et MIN-10 (verdict CO₂) — **risques fonctionnels** | MAJ-4, MIN-10 | Faible |
| **P2** | Factoriser l'agrégation DJU build/runtime | MAJ-2 | Moyen |
| **P2** | Décomposer `air-hyg`/`pdc` en composants (+ `calculerLocal`) | MAJ-3, MAJ-6 | Moyen |
| **P2** | Dégrader gracieusement `build.ts` si une source échoue | MAJ-8 | Faible |
| **P2** | Clarifier le filtrage de warnings PDC | MAJ-5 | Faible |
| **P3** | Hygiène : `opengtb_logo.png`, CLAUDE.md, ESLint/Prettier, couverture, source unique année DJU | MIN-4/12/16/17/18/19 | Variable |

---

## 5. Méthodologie

Revue conduite par 4 sous-agents en lecture seule, un par axe (architecture, qualité,
sécurité, tests/CI). Vérifications exécutées **sans effet de bord** : `vitest run`
(640 tests verts) et `npm run check` (0 erreur svelte-check). Aucune dépendance installée,
aucun fichier source modifié, aucun appel à l'API Météo-France (les tests lisent du JSON
statique pré-généré).
