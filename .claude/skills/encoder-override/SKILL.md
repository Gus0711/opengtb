---
name: encoder-override
description: Use this skill when the user provides a LoRaWAN downlink encoder JS source for opengtb (typically MClimate, Watteco, or any vendor whose encoder isn't in the TTN lorawan-devices repo). The skill saves it as a local override under scripts/decode/overrides/<vendor>/<device>-encoder.js, fixes known upstream bugs, generates YAML examples, regenerates the manifest, verifies the schema extraction, runs tests, and commits.
---

# encoder-override

Workflow déterministe pour intégrer un encoder downlink fourni par
l'utilisateur dans le pipeline opengtb. Le mécanisme de drop est
documenté dans `scripts/decode/overrides/README.md` — ce skill
applique ce workflow étape par étape.

## Quand déclencher

- L'utilisateur colle un bloc de code JS qui ressemble à un encoder
  TTN (`function encodeDownlink(input) { ... }` ou un `Encode(port, obj)`
  qui appelle `encodeDownlink`), OU il dit explicitement « voici
  l'encoder pour X », « ajoute ce device », « intègre ce codec ».
- Le device est typiquement dans `mclimate-*`, `watteco-*`, `ewattch-*`,
  ou un vendor pour lequel `hasEncoder` est `false` dans le manifest.
- Si l'utilisateur ne donne que le nom du device sans source, demande
  le source avant de continuer.

## Étape 1 — identifier le slug

Liste les devices candidats en filtrant par vendor :

```bash
node -e "const m=JSON.parse(require('fs').readFileSync('static/data/lorawan-codecs/manifest.json','utf8'));console.log(m.devices.filter(d=>d.vendorId==='<vendor>').map(d=>d.slug+' | '+d.name).join('\n'))"
```

Le `<vendor>` se déduit du contexte (MClimate → `mclimate`, Watteco →
`watteco`, etc.). Le slug exact se déduit du nom du device : le user
dit « Vicki » → `mclimate-vicki` ; « Fan Coil Thermostat » →
`mclimate-fan-coil-thermostat` ; « 16ADS » → `mclimate-16ads`.

Si ambigu (plusieurs matches), demande au user lequel cibler.

## Étape 2 — scanner les bugs upstream connus

Avant de sauver, parcours le code et relève chacun de ces motifs.
Corrige systématiquement, en notant la correction dans le header
généré (cf. étape 3) :

| Motif upstream                                  | Fix |
| ----------------------------------------------- | --- |
| `int(<expr>)` (slip Python)                     | `Math.floor(<expr>)` |
| `for (key in ...)` sans déclaration             | `for (var key in ...)` |
| `input.data.SetX` quand le case est `setX`      | aligne la casse sur le case label |
| Plusieurs `case "X":` identiques                | dédupliquer ou renommer la 2e variante (souvent un `get`) |
| Méthodes string sur var locale `var X = data.X` | OK, l'extracteur suit, pas besoin de toucher |
| Collisions de cmdId (deux cases → même 0xNN)    | **Garde verbatim** + TODO comment, on ne sait pas lequel est correct sans datasheet |

Ne corrige rien d'autre (pas de refactor cosmétique, pas de
modernisation `var` → `let`) — le but est de rester proche de la
source pour qu'on puisse re-differ plus tard.

## Étape 3 — sauver le fichier override

Chemin : `scripts/decode/overrides/<vendor-id>/<device-id>-encoder.js`.

Header obligatoire en tête du fichier :

```js
// <Vendor Name> <Device Name> — encoder downlink (override OpenGTB)
//
// Source : fournie par l'utilisateur, équivalente à la version publique
// <URL ou nom du repo amont> (Licence <ISC|MIT|Apache-2.0>).
//
// Bugs upstream corrigés (le cas échéant) :
//   - <bug 1> → <fix>
//   - <bug 2> → <fix>
//
// Si aucun bug : « Aucun bug upstream à corriger, sauvegarde verbatim. »
```

Indente avec des tabs (convention du projet). Préserve les cmdIds et
les byte layouts à l'identique — c'est ce que le user vérifiera.

## Étape 4 — générer le YAML d'exemples

Chemin : `scripts/decode/overrides/<vendor-id>/<device-id>-encoder.yaml`.

Priorités pour amorcer les examples :

1. **Bloc commentaire upstream** : si le user a inclus des `// example
   downlink commands` à la fin de son fichier (style MClimate), parse-les
   un par un pour bâtir les premiers entries.
2. **Commandes les plus typiques** : ajoute manuellement 6–10 examples
   qui couvrent les cas d'usage chantier (on/off, lecture état, set
   d'une consigne courante, pulse temporisé pour les relais, etc.).
3. **Les keys doivent matcher exactement** les case labels (camelCase
   ou CamelCase selon ce que l'encoder accepte).

Format strict :

```yaml
examples:
  - description: Libellé court qui apparaît sur le chip
    input:
      data:
        nomCommande: <valeur>
    output:
      bytes: [<int>, <int>, ...]
      fPort: 1
```

Inclus **toujours** `output.bytes` quand tu peux les calculer, pour
que le badge « Conforme à l'exemple TTN » fonctionne automatiquement.

## Étape 5 — régénérer le manifest et vérifier

```bash
npm run fetch-codecs -- --all
```

Puis check le device cible :

```bash
node -e "const m=JSON.parse(require('fs').readFileSync('static/data/lorawan-codecs/manifest.json','utf8'));const d=m.devices.find(x=>x.slug==='<slug>');console.log('hasEncoder:',d.hasEncoder,'| source:',d.downlinkSchema?.source,'| fields:',d.downlinkSchema?.fields.length,'| examples:',d.downlinkExamples?.length)"
```

Critères d'acceptation :

- `hasEncoder: true`
- `downlinkSchema.source` ∈ `{ "milesight-if-in-payload",
  "switch-on-cmd", "for-key-switch" }`
- `fields.length` > 5 (sinon l'extracteur a sous-performé — diagnostic
  requis, voir étape 6bis)
- `examples` ≥ 3

Si `downlinkSchema` est absent ou `source` est inattendu, l'extracteur
n'a pas matché. Ne commit pas. Lis le source pour identifier quel
idiome est en jeu et soit corrige le code source pour matcher un des
3 patterns (sans changer les bytes !), soit signale au user que ce
vendor utilise un idiome non couvert et qu'il faudra étendre
`schema-extractor.ts`.

## Étape 6 — ajouter un golden test

Dans `src/lib/tools/decode/codec-build.test.ts`, ajoute un bloc de tests
sur le modèle de l'override existant pour mclimate-vicki (à la fin du
fichier). Vérifie au minimum :

- `hasEncoder === true`
- Plusieurs commandes clés présentes dans les noms de champs
- Au moins une commande no-param (ou typage spécifique) est correctement
  flagged
- Tous les YAML examples encodent aux bytes attendus quand on exécute
  le `.js` généré

## Étape 7 — tests + typecheck

```bash
npm test
npm run check
```

Tous les tests doivent passer (≥ 583 actuellement). Si svelte-check
fait du bruit autre qu'un warning a11y dans `_admin/svg/`, c'est une
régression — résoudre avant commit.

## Étape 8 — commit

Format conventionnel :

```
feat(decode): <Vendor> <Device> encoder override

<2-3 phrases résumant : nombre de commandes extraites, pattern,
particularités notables>.

Upstream bugs corrected (with comments in the file noting each one):
  - <bug 1>
  - <bug 2>
(ou « Upstream encoder was clean, saved verbatim. »)

<N> example downlinks in the companion YAML (...).

Catalog: <N> devices total with schema (...).

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

Commande exacte :

```bash
git add scripts/decode/overrides/<vendor>/ \
        src/lib/tools/decode/codec-build.test.ts \
        static/data/lorawan-codecs/ \
&& git commit -m "$(cat <<'EOF'
<message ci-dessus>
EOF
)"
```

## Limites connues

- L'extracteur ne reconnaît que 3 idiomes (Milesight `if-in-payload`,
  switch-on-cmd, for-key-switch). Si un vendor utilise un autre style
  (Decentlab `DOWNLINK_COMMANDS` catalog, Netvox `getCmdId(0x01)`),
  le device fonctionnera mais l'utilisateur tombera sur l'éditeur
  JSON brut. Le skill ne tente pas d'étendre l'extracteur — c'est un
  changement de scope qu'il faut faire à part en ajoutant un pattern
  dans `scripts/decode/schema-extractor.ts`.
- Le `for-key-switch` détecte les types de sous-objets de façon
  heuristique : si un champ apparaît dans plusieurs cases avec des
  signatures différentes, c'est le premier qui gagne. À surveiller
  pour les codecs complexes.
- Les YAML examples sont vérifiés byte-par-byte au test — si tu
  inventes des bytes attendus à la main et qu'ils sont faux, le test
  sautera. Toujours dériver les bytes en exécutant mentalement (ou
  via le runtime) le code source contre l'input.

## Référence

- `scripts/decode/overrides/README.md` — explication humaine du
  mécanisme et des 3 patterns reconnus.
- `scripts/decode/schema-extractor.ts` — implémentation des extracteurs.
- `scripts/decode/fetch-codecs.ts` — orchestration (purge, regen, write).
- `scripts/decode/overrides/mclimate/{vicki,fan-coil-thermostat,16ads}-encoder.{js,yaml}` —
  3 exemples complets à imiter.
