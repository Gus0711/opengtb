# Encoder overrides — drop & deploy

Mécanisme local qui injecte ou remplace un encoder downlink TTN au build,
pour les vendors qui ne livrent pas d'encoder côté `lorawan-devices`
(MClimate, Watteco, ewattch…) ou pour corriger un encoder upstream cassé.

## TL;DR — comment je drop un nouvel override

1. Pose le `.js` (et idéalement le `.yaml` compagnon) dans :
   ```
   scripts/decode/overrides/<vendor-id>/<device-id>-encoder.js
   scripts/decode/overrides/<vendor-id>/<device-id>-encoder.yaml
   ```
2. Ping-moi (« drop l'override pour `mclimate-vicki` ») ou lance toi-même :
   ```
   npm run fetch-codecs -- --all
   ```
3. Reload la page → le device a `hasEncoder: true`, son formulaire est
   généré tout seul à partir du source.

Aucune modif du manifest, du code SvelteKit ni du runtime à faire à la
main : tout se déclenche depuis le `fetch-codecs.ts`.

## Trouver le bon slug

Le couple `<vendor-id>/<device-id>` doit matcher exactement ce qui est
dans le manifest. Pour lister les slugs d'un vendor donné :

```bash
node -e "const m=JSON.parse(require('fs').readFileSync('static/data/lorawan-codecs/manifest.json','utf8'));console.log(m.devices.filter(d=>d.vendorId==='mclimate').map(d=>d.slug).join('\n'))"
```

Le slug entier est `<vendor-id>-<device-id>`. Si je vois `mclimate-vicki`,
le fichier va dans `scripts/decode/overrides/mclimate/vicki-encoder.js`.

## Format du `.js` — trois idiomes auto-extraits

Le fichier doit définir `function encodeDownlink(input)` qui retourne
`{ bytes, fPort, warnings, errors }` (signature TTN v3). En plus du
runtime, opengtb essaie d'extraire un **schéma de champs** pour générer
un formulaire au lieu de l'éditeur JSON brut. Trois patterns sont
reconnus, dans cet ordre :

### Pattern A — Milesight `if ("X" in payload)`

```js
function encodeDownlink(input) {
  var bytes = [];
  if ("collection_interval" in input.data) {
    bytes = bytes.concat(setCollectionInterval(input.data.collection_interval));
  }
  if ("rejoin" in input.data) {
    bytes = bytes.concat(rejoin(input.data.rejoin));
  }
  return { bytes: bytes, fPort: 1, warnings: [], errors: [] };
}
function setCollectionInterval(v) {
  if (typeof v !== "number") throw new Error("collection_interval must be a number");
  if (v < 0) throw new Error("collection_interval must be greater than 0");
  return [0xff, 0x02, v & 0xff];
}
function rejoin(v) {
  var yes_no_map = { 0: "no", 1: "yes" };   // ← enum extrait depuis ce map
  // ...
}
```

L'extracteur tire le **type**, le **min/max**, les **enums** depuis
les `_map`, et les sous-champs pour les objets.

### Pattern B — switch-on-cmd (Aquascope-style)

```js
function encodeDownlink(input) {
  switch (String(input.data.cmd)) {
    case "reset":         return { fPort: 1, bytes: [0x01, 0x01] };
    case "set valve on":  return { fPort: 1, bytes: [0x07, 0xff] };
    case "set valve off": return { fPort: 1, bytes: [0x07, 0x00] };
  }
}
```

Un seul champ `cmd` est exposé, avec toutes les cases comme valeurs
d'enum. Les autres champs accédés via `input.data.<X>` dans le switch
deviennent des paramètres optionnels.

### Pattern C — for-key-switch (MClimate-style)

```js
function encodeDownlink(input) {
  var bytes = [];
  for (var key in input.data) {           // ← `for of Object.keys()` marche aussi
    switch (key) {
      case "recalibrateMotor":            // ← noParam, juste case d'activation
        bytes.push(0x03);
        break;
      case "setTargetTemperature":        // ← number (push direct)
        bytes.push(0x0e);
        bytes.push(input.data.setTargetTemperature);
        break;
      case "setChildLock":                // ← boolean (Number() coerce)
        bytes.push(0x07);
        bytes.push(Number(input.data.setChildLock));
        break;
      case "setOpenWindow": {             // ← object avec sous-champs
        var enabled = input.data.setOpenWindow.enabled;
        var delta   = input.data.setOpenWindow.delta;
        // ...
        break;
      }
    }
  }
  return { bytes: bytes, fPort: 1, warnings: [], errors: [] };
}
```

L'extracteur regarde le corps de chaque `case` pour décider :

| Signal dans le case body                                | Type inféré        |
| ------------------------------------------------------- | ------------------ |
| Pas de lecture de `input.data.<name>`                   | `noParam` (toggle) |
| `Number(input.data.<name>)` ou `... ? 1 : 0`            | `boolean`          |
| `input.data.<name>.substr()` / `.length`                | `string`           |
| `input.data.<name>.<sub>` (un ou plusieurs accès)       | `object` + subs    |
| Sinon (push direct, op arithmétique)                    | `number`           |

Pas reconnu → le device fonctionne quand même mais l'utilisateur tombe
sur l'éditeur JSON brut.

## Format du `.yaml` (optionnel mais recommandé)

Chaque entrée devient un **chip preset** cliquable au-dessus du
formulaire. Le clic remplit le form/JSON avec `input.data` et applique
`input.fPort`. Si `output.bytes` est fourni, un badge « ✓ Conforme à
l'exemple TTN » s'affiche après encodage si les bytes matchent.

```yaml
examples:
  - description: Libellé court pour le chip
    input:
      data:
        nomDeLaCommande: 21          # ou valeur structurée
      fPort: 1                        # optionnel, override le fPort par défaut
    output:                           # optionnel, sert au badge de validation
      bytes: [14, 21]
      fPort: 1
  - description: Autre preset
    input:
      data:
        autreCommande: true
    output:
      bytes: [3]
      fPort: 1
```

Les `data` keys doivent être **strictement identiques** aux `case`
labels (camelCase ou CamelCase, selon ce que l'encoder accepte).

## Bugs upstream à surveiller

Sur la base des 3 overrides MClimate déjà intégrés, voici ce qu'on a
vu pop et qu'il vaut mieux fixer avant ou pendant l'intégration :

| Symptôme upstream                                  | Correction                                |
| -------------------------------------------------- | ----------------------------------------- |
| `int(...)`                                         | `Math.floor(...)` (slip Python en JS)     |
| `for (key in ...)` sans `var`                      | `for (var key in ...)` (leak global)      |
| `input.data.SetX` vs `case "setX"` (casse divergente) | aligner la casse                       |
| Cases dupliquées                                   | dédupliquer ou renommer la 2e            |
| Méthodes string sur `var X = input.data.X` (var locale) | OK, l'extracteur suit la destructure |

Quand je ré-écris un override pour toi, je signale chaque correction
dans le header du fichier généré, pour qu'on garde une traçabilité.

## Workflow recommandé entre nous

1. Tu colles le source upstream (lib MClimate, datasheet vendor, etc.).
2. Je te dis si l'encoder est clean ou si je dois patcher des bugs.
3. Je sauvegarde le `.js` + `.yaml` aux bons chemins, avec un header
   créditant la source et listant les éventuels fixes.
4. Je régénère le manifest, vérifie le schéma extrait et les examples,
   ajoute un test golden dans `codec-build.test.ts`, puis commit
   conventionnel (`feat(decode): <vendor>-<device> encoder override`).
5. Tu reload la page, le device a le formulaire complet.

## Arborescence cible

```
scripts/decode/overrides/
├── README.md                            ← ce fichier
└── <vendor-id>/
    ├── <device-1>-encoder.js
    ├── <device-1>-encoder.yaml          ← optionnel
    ├── <device-2>-encoder.js
    └── <device-2>-encoder.yaml
```

Exemple en place :

```
scripts/decode/overrides/mclimate/
├── vicki-encoder.{js,yaml}              ← 51 champs (for-key-switch)
├── fan-coil-thermostat-encoder.{js,yaml}← 72 champs (for-key-switch)
└── 16ads-encoder.{js,yaml}              ← 27 champs (for-key-switch)
```

## Licence & attribution

Les overrides redistribuent du code vendor — assure-toi que la licence
amont est compatible (ISC, MIT, Apache 2.0 le sont). Le header de
chaque fichier override mentionne :

- la source originale (URL repo, npm package…),
- la licence amont,
- les éventuels fixes appliqués par OpenGTB.

Cf. les 3 fichiers MClimate pour le pattern.
