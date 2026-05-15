// scripts/fetch-lorawan-codecs.ts
//
// PLACEHOLDER — implémentation réelle dans une session ultérieure.
//
// Objectif : récupérer le catalogue de codecs LoRaWAN depuis le dépôt
// public TheThingsNetwork/lorawan-devices (manufacturers/<vendor>/...
// avec leurs profils YAML + payloadcoder JavaScript), filtrer ce qui
// concerne le périmètre des outils OpenGTB (compteurs énergie, capteurs
// CVC, etc.), normaliser le format et écrire le résultat dans
// `src/content/data/lorawan-codecs/<vendor>/<device>.json` pour
// consommation par l'outil /outils/decode au build.
//
// À implémenter :
//   - clone ou téléchargement sparse du repo lorawan-devices
//   - parse YAML des manifests, lecture des codecs JS associés
//   - filtrage par catégorie / fabricant (whitelist configurable)
//   - normalisation : { vendor, model, fport, version, decode_fn,
//     fields: [{ name, type, unit }] }
//   - écriture atomique en JSON dans src/content/data/lorawan-codecs/
//   - rapport de différentiel si le fichier existe déjà
//
// Exécution prévue : `npm run fetch-codecs` (cf. package.json).

throw new Error('fetch-lorawan-codecs.ts: not implemented yet');
