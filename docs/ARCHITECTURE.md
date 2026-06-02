# Architecture — opengtb

Ce document décrit le modèle interne du site : comment un outil est déclaré et rendu,
et comment les données pré-générées arrivent jusqu'au navigateur. Il complète le
[README](../README.md) (installation, scripts) et la
[revue de code](CODE_REVIEW.md).

## Principes directeurs

- **Local-first, sans backend en V1.** Tous les calculs tournent dans le navigateur.
  Aucun endpoint serveur en production : le site est prerendu en statique
  (`@sveltejs/adapter-static`) et servi par Caddy. Le seul `+server.ts`
  (`sitemap.xml`) est `prerender = true`, donc résolu au build.
- **Le registry est la source unique de vérité.** `src/lib/tools/registry.ts` énumère
  les secteurs et les outils ; tout le reste (home, index `/outils`, SEO, breadcrumb)
  en dérive.
- **Séparation stricte logique / UI / données.** La logique métier est en TypeScript
  pur (testable sans DOM), l'UI en Svelte, les données volumineuses en JSON statique.

## Le registry

`src/lib/tools/registry.ts` exporte deux tableaux déclaratifs et des helpers :

- `SECTORS[]` — 5 secteurs (`briques-techniques`, `reglementaire`, `dimensionnement`,
  `referentiels`, `commissioning`).
- `TOOLS[]` — 13 entrées (12 outils + le lien externe `bacs`). Chaque `Tool` porte
  notamment `slug`, `name`, `sector`, `status` (`'done' | 'todo'`), et de quoi générer
  la fiche (titre, description, SEO).
- Helpers : `getTool(slug)`, `toolsBySector(...)`, `internalTools`, `builtTools`.

Les types (`Tool`, `Sector`, `SectorSlug`, `ToolStatus`) vivent dans
`src/lib/tools/types.ts`. `SectorSlug` est une union stricte ; `Tool.slug` est
actuellement un `string` libre (cf. CODE_REVIEW MIN-2).

## Anatomie d'un outil

Un outil implémenté se décline en trois couches co-localisées par convention :

```
src/lib/tools/<slug>/            # 1. Logique métier pure (TypeScript, testée)
    calc.ts / calcul.ts          #    fonctions de calcul pures
    types.ts                     #    types du domaine
    constants.ts                 #    constantes / tables (ou data/ pour gros volumes)
    validators.ts                #    garde-fous sur les entrées
    *.test.ts                    #    tests vitest co-localisés

src/lib/components/tools/<slug>/ # 2. Composants UI propres à l'outil (optionnel)
    *.svelte                     #    panneaux, tables, graphes

src/routes/outils/<slug>/        # 3. Route / point d'entrée
    +page.svelte                 #    compose la logique + les composants dans <ToolShell>
```

### `ToolShell` : l'enveloppe commune

Tous les outils s'enveloppent dans `src/lib/components/tools/ToolShell.svelte`, qui
centralise breadcrumb, en-tête `$ gtb <name>`, métadonnées SEO et pied de page
« calculs locaux ». Une page typique fait :

```svelte
<script lang="ts">
  import { getTool } from '$lib/tools/registry';
  import ToolShell from '$lib/components/tools/ToolShell.svelte';
  const tool = getTool('<slug>')!;
</script>

<ToolShell {tool}>
  <!-- UI de l'outil -->
</ToolShell>
```

### Outils non implémentés

Les outils en `status: 'todo'` (`pcap`, `compteur-th`, `trends`) n'ont pas de route
dédiée : ils sont captés par le fallback générique `src/routes/outils/[slug]/+page.ts`
qui charge le `Tool` depuis le registry et affiche une page « à venir ».

### Référence du pattern

Au moment de la rédaction, `dju` est l'implémentation de référence : logique en
`src/lib/tools/dju/`, UI décomposée en plusieurs composants sous
`src/lib/components/tools/dju/`. À l'inverse, `air-hyg` et `pdc` concentrent encore
toute leur UI dans un `+page.svelte` monolithique (cf. CODE_REVIEW MAJ-3) — à aligner
sur `dju` lors d'un futur refactor.

## Pipeline de données (build hors-ligne → static → fetch runtime)

Certains outils ont besoin de jeux de données trop volumineux pour être embarqués dans
le bundle, ou issus d'API externes. Le schéma est toujours le même :

1. **Génération hors-ligne** — un script Node (`scripts/<domaine>/`) interroge la source
   (API, dépôts upstream) et écrit des fichiers JSON.
2. **Stockage statique** — les fichiers atterrissent dans `static/data/<domaine>/`
   (servis tels quels) et/ou dans `src/lib/tools/<slug>/data/` (importés au build pour
   le prerender).
3. **Consommation runtime** — le navigateur `fetch()` les JSON depuis `/data/...`. Aucun
   secret ni appel externe au runtime.

| Domaine | Script | Sortie | Commande |
| --- | --- | --- | --- |
| `decode` | `scripts/decode/fetch-codecs.ts` (+ `schema-extractor.ts`, `overrides/`) | `static/data/lorawan-codecs/` | `npm run fetch-codecs` |
| `modbus` | `scripts/modbus/build.ts` (+ `lib/`, `overrides/`) | `static/data/modbus/<vendor>/<model>.json` + `manifest.json`, dupliqué dans `src/lib/tools/modbus/manifest.generated.json` | `npm run build-modbus` |
| `dju` | `scripts/dju/fetch-stations.ts`, `fetch-data.ts` (+ `lib/mf-client.ts`) | `src/lib/tools/dju/data/{stations,index}.json` + `static/data/dju/<id>.json` | `npm run dju:fetch` |

Points d'attention (détaillés dans la revue de code) :

- Ces pipelines **ne sont pas branchés** sur `npm run build` ; les artefacts générés
  sont commités. Régénération manuelle → risque de dérive données/code (CODE_REVIEW MIN-4).
- Le credential Météo-France (`MF_APPLICATION_ID`) n'est utilisé que par
  `scripts/dju/lib/mf-client.ts` (OAuth2 : token Basic → Bearer, retry 429, polling).
  Il ne doit **jamais** être importé depuis `src/` (sinon fuite dans le bundle).
- Pour `dju`, la logique d'agrégation existe en double (build vs recalcul runtime) —
  candidate à factorisation (CODE_REVIEW MAJ-2).

## Sécurité (surface d'exposition)

- **Prod** : build statique pur, aucun endpoint dynamique. En-têtes de sécurité posés
  par le `Caddyfile` (CSP encore absente, cf. CODE_REVIEW MIN-8).
- **Dev uniquement** : `scripts/vite-svg-admin-plugin.ts` expose `/__svg-admin/*` avec
  `apply: 'serve'` (jamais dans le build), protégé par `ADMIN_TOKEN` et un garde
  path-traversal. La route `_admin/svg` est `prerender=false, ssr=false`.
- **Codecs LoRaWAN** : exécutés via `new Function()` côté client (`decode/decoder.ts`).
  Acceptable tant que les codecs restent des assets versionnés ; à sandboxer (Web Worker
  + timeout) si un jour l'utilisateur peut coller un codec arbitraire (CODE_REVIEW MIN-6).

## Tests

Suite `vitest` (`environment: 'node'`) ciblant la logique métier pure, co-localisée en
`*.test.ts`. La couverture est solide sur les calculs physiques (PAC, air-hygiène, DJU) ;
les conversions d'unités et les validateurs manquent de tests directs (CODE_REVIEW MAJ-7).
Pas encore de CI ni de hook pre-commit (CODE_REVIEW MAJ-1).
