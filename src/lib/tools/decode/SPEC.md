# Outil `decode` — décodeur LoRaWAN

Spécification consolidée après itération sur le brief initial.
Source unique pour les décisions de périmètre. À mettre à jour si on rejoue un tour.

## Périmètre V1

Décodeur de payloads **LoRaWAN uplink uniquement**. Pas de downlink, pas
de BACnet/Modbus, pas de mapping vers d'autres protocoles, pas
d'historique, pas d'auth.

L'utilisateur :
1. choisit son device dans une liste alimentée par le repo TTN
   `lorawan-devices` (ou choisit le device générique « Cayenne LPP ») ;
2. colle son payload (hex *ou* base64, toggle explicite) + saisit le
   fPort ;
3. clique « Décoder » → voit le résultat sous forme tableau clé/valeur
   et JSON brut pliable.

URL cible : `/outils/decode`.

## Décisions actées

| Sujet | Décision | Raison |
|---|---|---|
| Encoder downlink | **Non** en V1 | Reporté V2, voir attendus V2 |
| Isolation d'exécution | `new Function()` direct, main thread, try/catch + `setTimeout` de garde (~2 s) | Codecs TTN sont publics et bien rodés ; Worker apportait pas de vraie sandbox |
| Source codecs | Repo TTN `TheThingsNetwork/lorawan-devices`, **clone + extraction lancés à la main**, output commité dans `static/data/lorawan-codecs/` | Évite un clone de plusieurs centaines de Mo à chaque build CI ; cohérent avec `svg` et `dju` |
| Cayenne LPP | Décodeur **hard-codé** dans `lib/tools/decode/cayenne-lpp.ts`, exposé comme device pseudo « generic-cayenne-lpp » dans le manifest | Standard LoRa Alliance largement utilisé sur passerelles génériques |
| Codec personnalisé collé par l'utilisateur | **Non** en V1 | Reporté V2, voir attendus V2 |
| Détection hex/base64 | **Toggle explicite** (pas d'auto-détection) | Conforme au pattern Auto/Manuel, sans ambiguïté sur les payloads short |
| Affichage résultat | Tableau clé/valeur en tête + JSON brut pliable en dessous, bouton copier sur les deux | Pattern « lisible chantier » + JSON exploitable |
| URL state | Query params `?device=...&port=...&payload=...&fmt=hex|b64` via `replaceState` | Conforme au pattern du projet ([[tool-implementation-pattern]]) |

## Inputs détaillés

- **Device** : sélecteur avec autocomplete plein-texte sur `vendor + name`.
  Manifest JSON chargé en lazy au focus du sélecteur (pas au load page).
  Recherche maison (split tokens → all match case-insensitive, rang par
  position du match), pas de dépendance externe type fuse.js.
  Liste plate, pas de virtualisation : la liste *filtrée* tient toujours
  en < 50 entrées.
- **Format payload** : toggle hex / base64. Validation explicite, erreur
  si payload incohérent avec le format choisi.
- **Payload** : `<textarea>`. Hex tolère espaces, virgules, préfixe `0x`.
  Base64 strict (avec `=` de padding).
- **fPort** : input numérique, plage 1–223 (0 = MAC, 224–255 réservé).
  Défaut 1. Si le YAML TTN du device liste explicitement ses fPorts,
  les afficher en hint mais ne **pas** filtrer (certains devices
  n'exposent rien dans le YAML, on laisse l'utilisateur tester).

## Output

- **Bandeau verdict** : OK / warning / erreur, style cohérent avec les
  autres outils (voir [[ui-design-preferences]]).
- **Tableau** : nom champ, valeur, unité (si le codec retourne une unit
  field ou si les warnings TTN la fournissent).
- **JSON brut pliable**, présenté comme `<pre>` avec coloration simple
  clé/valeur (pas de lib externe : surlignage CSS via `<span>`).
- **Bouton « Copier la fiche »** au format markdown texte aligné (cf.
  pattern `v3v`, [[ui-design-preferences]]). Contenu :
  ```
  Device     : MClimate — Vicki Thermostat
  Payload    : 0a1f7d (hex)
  fPort      : 15
  ─────
  Temperature : 22.5 °C
  Humidity    : 65 %
  ─────
  Source : TTN lorawan-devices @ <date snapshot>
  ```

## Architecture du code

```
src/lib/tools/decode/
├── SPEC.md                 # ce fichier
├── types.ts                # Device, DecodeResult, DecodeError, PayloadFormat
├── manifest.ts             # chargement lazy du manifest JSON
├── search.ts               # recherche maison sur vendor+name
├── formats.ts              # parsing hex/base64 + tolérance espacements
├── cayenne-lpp.ts          # décodeur Cayenne LPP hard-codé
├── decoder.ts              # orchestration : load codec → exec sandbox → normalise
├── decoder.test.ts
├── formats.test.ts
├── search.test.ts
└── cayenne-lpp.test.ts

src/lib/components/tools/decode/
├── DeviceSelector.svelte
├── PayloadInput.svelte     # textarea + toggle hex/base64
├── PortInput.svelte
├── ResultDisplay.svelte    # tableau + JSON pliable + copier
└── ErrorDisplay.svelte

src/routes/outils/decode/
├── +page.svelte
└── +page.ts                # parseQuery → initial state SSR-safe

scripts/decode/
└── fetch-lorawan-codecs.ts # lancé à la main, output commité

static/data/lorawan-codecs/
├── manifest.json           # { generatedAt, source: {url, commit}, devices: [...] }
└── codecs/
    └── {vendor}-{device}.js
```

## Script de fetch (`scripts/decode/fetch-lorawan-codecs.ts`)

- Lance manuellement : `npm run fetch-codecs` (à câbler dans `package.json`,
  **pas** en `prebuild`).
- Clone shallow `TheThingsNetwork/lorawan-devices` dans `.cache/lorawan-devices/`,
  pull si déjà présent.
- Parcourt `vendor/*/`, lit chaque `*.yaml` device.
- Pour chaque device qui référence un codec uplink :
  - Charge le JS du codec ;
  - Vérifie qu'il définit `decodeUplink` *ou* `Decoder` (legacy TTN v2) ;
  - Si autre format (Cayenne LPP brut, JS exotique) → **exclut** + warning console.
- Génère :
  - `manifest.json` (vendor, deviceId, name, slug, fPorts si listés, codecPath,
    codecFormat: `'ttn-v3' | 'ttn-v2'`) ;
  - Un fichier JS par device dans `codecs/`, normalisé pour exposer
    `decodeUplink({ bytes, fPort })` (adapter legacy → v3 au moment du build).
- Inclut dans le manifest une entrée `generic-cayenne-lpp` qui pointe vers
  notre décodeur interne (flag `internal: true`).
- Sortie console : nombre de devices retenus, exclus avec raison, taille
  manifest.
- Idempotent. Pas de cache 24 h en V1 (on lance à la main).

## Conventions UI

- `<ToolShell tool={getTool('decode')!} seoTitle="..." seoDescription="...">`
- Pré-calcul côté serveur (parse URL params) → pas de flash de saisie vide.
- Mobile-first : sélecteur device en haut, payload + fPort en dessous,
  résultat en bas. Desktop : 2 colonnes inputs / résultat.
- Pas de localStorage, pas de cookie.
- `data-field="device" data-value="..."` etc. sur les valeurs sortantes
  (pattern projet, scraping/intégration future).

## SEO

- Title : « Décodeur Payload LoRaWAN — OpenGTB »
- Description : « Décodez n'importe quel payload LoRaWAN dans le
  navigateur. Plus de 3000 devices supportés depuis le repo TTN
  lorawan-devices. Gratuit, sans inscription, exécution locale. »
- Long-tail : « décoder payload LoRaWAN », « MClimate Vicki codec »,
  « Milesight WT101 decode », « Cayenne LPP decoder », « TTN device
  payload decoder ».

## Crédit & licence

- Crédit visible dans la section pédagogique : codecs issus du repo
  `TheThingsNetwork/lorawan-devices` (Apache-2.0 globalement, à
  re-vérifier au build pour les exceptions).
- Mention de la date du snapshot dans le manifest et affichée dans le
  footer de l'outil.

## Hors-scope V1 — attendus V2

À traiter lorsque V1 est en prod et que la demande remonte.

1. **Encoder downlink** :
   - Toggle uplink/downlink dans l'UI.
   - Appel `encodeDownlink({ data, fPort })` (format objet → bytes).
   - Affichage payload encodé en hex et base64 + bouton copier.
   - Sera le pattern bidirectionnel similaire à `conv`.

2. **Codec personnalisé** :
   - Zone texte « Coller mon codec » avec syntaxe TTN v3.
   - Indication visuelle « codec custom » dans le résultat.
   - Avertissement sécurité (exécution code arbitraire dans le navigateur).

3. **Sandbox renforcée** :
   - Migration vers QuickJS-WASM ou iframe `sandbox=""`.
   - Devient indispensable si on accepte des codecs custom user.
   - Référence : ce que fait ChirpStack côté serveur.

4. **Décodage des MAC commands / PHYPayload** :
   - Couche réseau (Join Request, Link ADR Req, etc.) — utile pour
     debug terrain.

5. **Mapping BACnet / Modbus** :
   - Convertir le JSON décodé vers une trame BACnet object / Modbus
     register. Demande spécifique métier GTB, pas une priorité avant
     retour terrain.

6. **Snippets export Niagara / Node-RED** :
   - Générer un bloc de code prêt à coller dans un flow Node-RED ou
     dans une Niagara axDriver.

7. **Codecs OpenGTB unifiés** :
   - Codecs maison pour familles devices (MClimate v3, Milesight, etc.)
     normalisés sur un vocabulaire commun (température toujours en
     `temperature_c`, etc.). Pré-requis si on veut un mapping BACnet/
     Modbus propre.

8. **Historique des décodages** (V2 freemium) :
   - Liste locale, pas de backend, simple IndexedDB côté client.

9. **Mode live MQTT / WebSocket** (V3) :
   - Brancher un broker MQTT et décoder à la volée. Sort du périmètre
     local-first.

10. **Cache 24 h + flag `--force`** sur le script de fetch :
    - Pertinent uniquement si on bascule en prebuild auto.

11. **Pages SEO par device** (`/outils/decode/<slug>`) :
    - Génération au build d'**une page prerender par device** (~900 pages
      statiques). Chacune ciblée long-tail : « MClimate Vicki codec »,
      « Milesight AM102 decode », « Dragino LHT65 payload format »...
    - Contenu par page : H1 device-spécifique, meta tags vendor/device,
      exemple TTN pré-décodé en HTML indexable (donc visible pour
      Googlebot, pas seulement après hydratation), lien datasheet, regions
      et fPorts du device, schema.org `SoftwareApplication` ou `HowTo`.
    - L'outil de décodage reste accessible sur ces pages (preset device,
      éditable), pour conversion immédiate du trafic SEO en usage.
    - **Coûts à anticiper** :
      - ~45 Mo de HTML statique au build, sitemap à 900 entrées.
      - Exécution des codecs TTN côté Node au prerender (faisable mais
        rallonge le build, et expose un peu à du JS arbitraire au build).
      - Gestion des 410 si un device disparaît du repo TTN au resync.
      - Maintenance éditoriale : pour éviter la pénalité « doorway pages »,
        chaque page doit avoir un contenu propre — exemple décodé, hints
        spécifiques, pas juste le shell de l'outil dupliqué 900×.
    - **Décider en données** : laisser V1 en prod 4-6 semaines, regarder
      les requêtes vendor-spécifiques dans Search Console. N'engager
      cette V2 que si du trafic ciblé arrive déjà sur la page unique.
      Sinon, l'effort SEO est mal calibré.

## Points à confirmer plus tard

- Quels devices retenir comme **golden tests** d'intégration ? Candidats :
  MClimate Vicki, Milesight AM102, Enless TX Pulse 600, Dragino LHT65.
  À choisir au moment d'écrire `decoder.test.ts`.
- ~~Doit-on afficher en hint la fréquence régionale du device ?~~
  **Tranché** : non, le site est francophone, EU868 implicite.

## État au snapshot TTN du 21 avril 2026 (commit `26f5522`)

Sortie de `npm run fetch-codecs -- --all` :

- **913 devices retenus** sur 117 vendors (149 vendors listés, mais 32
  sans `endDevices` exploitables / en draft).
- Manifest : 1,6 Mo brut → **151 Ko gzippé**. Chargé lazy au focus du
  sélecteur.
- Codecs : 19 Mo total non gzippé, chargés à la demande device par device.
- Temps d'exécution : ~9 s.

**Exclusions notables** :
- 146 devices ne référencent aucun codec dans leur profil (souvent des
  devices certifiés LoRa Alliance qui utilisent Cayenne LPP générique
  ou un format proprio non publié).
- 37 devices Watteco : codec en module bundlé minifié (`exports.driver`),
  pas de `decodeUplink`/`Decoder` au sens TTN. À traiter en V2 via un
  wrapper dédié si la demande émerge. Note : **`nke-watteco`** (vendor
  différent, 24 devices) passe sans souci.
- 5 devices ewattch : référencent un `ewattchlorawandecoder.js` qui
  manque dans le repo upstream. À signaler à TTN si l'usage remonte.

## Plan de commits (resserré vs brief initial)

1. `feat(decode): add lorawan-devices fetch script and committed manifest`
2. `feat(decode): add types, hex/base64 parsing and cayenne-lpp decoder`
3. `feat(decode): add manifest loader, search and decoder orchestration`
4. `test(decode): add unit tests for parsing, search, cayenne-lpp and decoder`
5. `feat(decode): add device selector, payload and port inputs`
6. `feat(decode): wire up tool page with url state, result and error display`
7. `docs(decode): add pedagogical section and credits`

Conventional commits, messages en anglais. Co-author Claude comme
d'habitude.
