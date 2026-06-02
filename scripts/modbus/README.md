# Modbus device catalog — pipeline

Construit `/outils/modbus` en agrégeant deux sources upstream publiques + des
patches locaux.

## TL;DR

```bash
npm run build-modbus              # clone à la demande, normalise, écrit les sorties
npm run build-modbus -- --refresh # purge le cache et re-clone les sources
```

Sorties (commitées) :

- `src/lib/tools/modbus/manifest.generated.json` — manifest bundlable (importé par la page index et le sitemap).
- `static/data/modbus/manifest.json` — copie publique servable.
- `static/data/modbus/<vendor>/<model>.json` — fiche complète par device, fetchée par la page `[vendor]/[model]`.

## Sources upstream

| Source | URL | Licence | Format | Couverture |
|---|---|---|---|---|
| jibrilsharafi/modbus-database | <https://github.com/jibrilsharafi/modbus-database> | MIT | JSON normalisé (`metadata.json` + `registers.json`) | ~270 devices, ~80 marques. Compteurs élec et onduleurs PV. |
| timlaing/modbus_local_gateway | <https://github.com/timlaing/modbus_local_gateway> | MIT | YAML Home Assistant | ~20 devices PAC / VMC / gateways / inverters (Dimplex SI, Fröling BWP, Husdata H60, Pichler LG, Eastron SDM…). |
| volkszaehler/mbmd | <https://github.com/volkszaehler/mbmd> | BSD-3-Clause | Drivers Go (`Opcodes{...}`) | ~20 compteurs élec FR-courants : Schneider iEM3000, Siemens PAC2200, Janitza, ABB, Carlo Gavazzi EM24, Eastron SDM, Finder 7M, Inepro, Orno, Lovato DMG, SBC. |
| TCzerny/ha-modbus-manager | <https://github.com/TCzerny/ha-modbus-manager> | MIT | YAML enrichi (sensors/controls) | ~12 devices : **Solvis SC3** (chaudière), Heidelberg, Sungrow, BYD, Fronius, SMA, Compleo, Victron. |
| fucm/python-stiebel-eltron | <https://github.com/fucm/python-stiebel-eltron> | MIT | Python REGMAP plats | Passerelle Stiebel/Tecalor ISG (PAC WPM/LWZ). |
| evcc-io/evcc | <https://github.com/evcc-io/evcc> | MIT | YAML + Go templating | ~67 devices `type: custom` Modbus inline : compteurs (Eastron, Carlo Gavazzi, BG-Tech), onduleurs PV / batteries (Sungrow, GoodWe, SolaX, Sofar, Kostal, Fronius Gen24, SMA, Huawei…). Les templates `type: mbmd`/HTTP sont skippés (doublons ou non-Modbus). |
| ioBroker/modbus-templates | <https://github.com/ioBroker/modbus-templates> | MIT | TSV par device (header `_address name description unit type len factor offset …`) | ~31 devices : **VMC Aldes Inspir Air SC370 + Meltem (×4)** (catégorie sans équivalent dans les autres sources), **PAC Lambda-WP**, onduleurs PV (Alpha-ESS, Deye, KACO, Fronius, GoodWe, SMA, SolarEdge, Solax, Sungrow…), compteurs (Eastron SDM630, Finder 7M, Phoenix EEM), wallbox Cfos. |

Tous les repos sont clonés (shallow) dans `.cache/` (gitignored). Le SHA du
commit upstream est noté dans chaque fiche (`upstream.ref`) pour traçabilité.

### Sources non utilisables comme pipeline auto

- **GyroGearl00se/ha_froeling_lambdatronic_modbus** (Fröling biomasse, MIT)
  utilise des f-strings et des comprehensions Python → non parsable comme
  literal. Si besoin, à ajouter via override `_create: true` (cf. overrides/README.md).
- **yozik04/nibe** (PAC NIBE, **GPL-3.0**) : viral, on ne peut pas inclure le
  contenu directement. Voie : override `_create: true` saisi manuellement (les
  registres techniques eux-mêmes ne sont pas copyrightables).
- **Viessmann, Buderus, Vaillant, De Dietrich, Frisquet, ELM Leblanc** : protocoles
  propriétaires (KM200 HTTP, Optolink, OpenTherm, EMS-bus, Tydom). **Aucun Modbus
  exposé.** Trou structurel — pas une question de sources amont.
- **Kamstrup, Sontex, Diehl** (compteurs thermiques) : Modbus disponible mais
  uniquement documenté dans des PDF constructeurs. Voie : override `_create: true`
  saisi depuis le PDF.

## Normalisation

Toute la logique pure est dans `lib/normalize.ts` (testée par
`lib/normalize.test.ts`). Décisions structurantes :

- **Schéma cible** : `src/lib/tools/modbus/types.ts` — aligné sur jibrilsharafi
  (le plus normalisé), complété pour les besoins UI.
- **Précédence** : HA prend le pas sur jibri quand le slug coïncide (HA est
  souvent plus riche en métadonnées de section). Les overrides locaux écrasent
  les deux.
- **`needsReview`** : marqué `true` quand l'upstream est suspect (URL pointant
  vers un tuto tiers type `aggsoft.com`), quand la config RTU/TCP manque, ou
  quand des registres multi-mots sont présents sans `wordOrder` explicite
  (l'ordre AB-CD/CD-AB par défaut peut être faux selon le constructeur — à
  vérifier sur datasheet).
- **`equipmentType`** : inféré par heuristique sur vendor / model / nom des
  registres / `application` upstream. Ajustable via override.

## Ajouter / corriger un device

Voir [`overrides/README.md`](./overrides/README.md). Schéma d'override :

```json
{
  "slug": "eastron-sdm-630",
  "name": "Eastron SDM630 (triphasé)",
  "registers": {
    "holding:0": { "label": "Tension L1-N", "wordOrder": "CD-AB" }
  },
  "needsReview": false
}
```

Drop dans `scripts/modbus/overrides/<vendor>/<model>.json`, relance
`npm run build-modbus`, commit.

## Pourquoi ce pattern

- **Pas de saisie manuelle** : la base de jibrilsharafi (MIT, ~270 devices) +
  les templates HA couvrent l'essentiel des devices d'intégration courants.
- **Snapshots upstream non commités** : on clone à la demande dans `.cache/`,
  on commit seulement le résultat normalisé. Évite de balader 1 000+ fichiers
  upstream dans le repo opengtb.
- **Overrides locaux** : permettent de corriger les défauts upstream
  (traduction FR, ordre d'octets, doc terrain) sans forker les sources amont.
- **Hors-V1** : ajout de devices ex-nihilo via override (lié au `slug` d'un
  device existant uniquement). Pour les catégories non couvertes par les
  sources amont (Wago/Beckhoff E-S, régulateurs CVC Carel/Siemens, variateurs
  Schneider/ABB), prévoir soit une PR vers jibrilsharafi, soit l'ajout d'un
  troisième pipeline source (ex. SunSpec XML).
