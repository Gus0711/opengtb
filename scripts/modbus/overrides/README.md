# Modbus device overrides

Mécanisme local pour **corriger, enrichir, ou ajouter** un device par-dessus
ce que l'on récupère des sources upstream (jibrilsharafi/modbus-database +
timlaing/modbus_local_gateway).

## TL;DR — comment je drop un override

1. Pose le fichier dans :
   ```
   scripts/modbus/overrides/<vendor-slug>/<model-slug>.json
   ```
   Le couple `<vendor-slug>/<model-slug>` doit matcher le `slug` du device tel
   qu'il apparaît dans `static/data/modbus/manifest.json` (kebab, ASCII).
2. Lance :
   ```
   npm run build-modbus
   ```
3. Le device est rebuild avec tes patches.

## Schéma de l'override

```json
{
  "slug": "eastron-sdm630",
  "name": "Eastron SDM630 (triphasé)",
  "equipmentType": "compteur-elec",
  "transport": ["rtu"],
  "defaults": {
    "rtu": { "baudrate": 9600, "parity": "none", "stopBits": 1, "slaveIdDefault": 1 }
  },
  "doc": "## Mise en service\n\nVérifier le DIP switch X avant de câbler...",
  "datasheets": [
    { "label": "Datasheet officielle", "url": "https://www.eastron.co.uk/.../sdm630.pdf" }
  ],
  "tags": ["triphasé", "rs485"],
  "needsReview": false,
  "registers": {
    "holding:0": { "label": "Tension L1-N" },
    "holding:200": {
      "name": "mode",
      "dataType": "uint16",
      "size": 1,
      "access": "rw",
      "enum": { "0": "off", "1": "on", "2": "auto" }
    }
  },
  "removeRegisters": ["holding:9999"]
}
```

**Champs reconnus** :

| Champ | Effet |
|---|---|
| `slug` (requis) | doit matcher le device cible |
| `vendor`, `model`, `name` | remplace les libellés |
| `equipmentType` | force la catégorie (cf. `EQUIPMENT_TYPES` dans `types.ts`) |
| `transport` | remplace la liste (`['rtu']`, `['tcp']`, ou les deux) |
| `defaults.rtu`, `defaults.tcp` | merge superficiel sur la config par défaut |
| `doc` | markdown affiché sur la fiche |
| `datasheets` | liste de `{ label, url }` |
| `tags` | facettes additionnelles |
| `needsReview` | force `true`/`false` (sinon hérité de l'upstream) |
| `registers` | patches par clé `<function>:<address>` (ex. `holding:0`). Si la clé existe, on merge ; sinon on ajoute. |
| `removeRegisters` | liste de clés `<function>:<address>` à supprimer |

## Cas typiques

- **Traduire les labels en FR** : `registers: { "holding:0": { "label": "Tension L1-N" } }`
- **Marquer un device vérifié** : `"needsReview": false`
- **Ajouter un registre absent en amont** : entrée nouvelle dans `registers` avec tous les champs requis (`dataType`, `size`, `access`, `name`).
- **Préciser le word order** : `registers: { "holding:6": { "wordOrder": "CD-AB" } }` sur les registres 32 bits dont l'ordre est non standard.

## Ajout ex-nihilo d'un device

Pour les devices **absents de toutes les sources upstream** (chaudières
Viessmann/Vaillant/Buderus/De Dietrich, compteurs thermiques Kamstrup/Sontex/Diehl,
régulateurs CVC, variateurs, etc.), utilise `_create: true` et fournis tous les
champs requis. Le device est créé de zéro lors du build.

**Exemple — Kamstrup MULTICAL 403** (à compléter depuis le PDF officiel constructeur) :

```json
{
  "slug": "kamstrup-multical-403",
  "_create": true,
  "vendor": "Kamstrup",
  "model": "MULTICAL 403",
  "equipmentType": "compteur-th",
  "transport": ["rtu"],
  "defaults": {
    "rtu": { "baudrate": 1200, "parity": "none", "stopBits": 2, "slaveIdDefault": 1 }
  },
  "datasheets": [
    {
      "label": "MULTICAL 403 — Technical description",
      "url": "https://documentation.kamstrup.com/.../mc403.pdf"
    }
  ],
  "doc": "Compteur calorimétrique. Module Modbus optionnel.\n\nMise en service : ...",
  "tags": ["calorimétrique", "chauffage", "rtu"],
  "needsReview": false,
  "source": {
    "datasheetUrl": "https://documentation.kamstrup.com/.../mc403.pdf",
    "notes": "Table extraite manuellement du PDF officiel rev. 2024-03."
  },
  "registers": {
    "holding:0x0001": {
      "address": 1,
      "function": "holding",
      "name": "energy",
      "label": "Énergie thermique cumulée",
      "dataType": "uint32",
      "size": 2,
      "unit": "kWh",
      "scale": 0.001,
      "access": "r"
    },
    "holding:0x0003": {
      "address": 3,
      "function": "holding",
      "name": "volume",
      "label": "Volume cumulé",
      "dataType": "uint32",
      "size": 2,
      "unit": "m³",
      "scale": 0.01,
      "access": "r"
    }
  }
}
```

**Champs requis pour `_create: true`** : `vendor`, `model`, `equipmentType`,
`transport`, `registers` (au moins une entrée).

**Types d'équipement** disponibles (cf. `EQUIPMENT_TYPES` dans `types.ts`) :
`compteur-elec`, `compteur-th`, `chaudiere`, `pac`, `onduleur-pv`, `vmc`,
`gateway`, `es`, `regulateur`, `variateur`, `autre`.

Le device apparaîtra à `/outils/modbus/<vendor-slug>/<model-slug>` avec
`upstream.source = "opengtb"` pour la traçabilité.
