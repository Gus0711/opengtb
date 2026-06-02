# Pipeline DJU — Météo-France DPClim

Récupère les températures journalières/mensuelles depuis l'API publique
Météo-France et calcule les Degrés-Jours Unifiés (DJU) par station, sur la
période 2010 → mois en cours.

Sortie : `src/lib/tools/dju/data/stations.json` (référentiel stations) et
`src/lib/tools/dju/data/dju.json` (DJU mensuels et annuels par station).

## Pré-requis

1. Récupérer une `Application_ID` Météo-France (cf. `.env.example`).
2. La coller dans `.env` à la racine du repo (gitignoré).
3. Node 22+ (TypeScript strip natif, `--env-file` natif, `fetch` natif).

## Lancer

```bash
npm run dju:stations   # liste 1 station principale par département → stations.json
npm run dju:data       # mensuelles 2010→now par station → dju.json
npm run dju:fetch      # les deux en séquence
```

Les scripts sont **idempotents** : on peut relancer pour rafraîchir.
Compter ~30 min pour un refetch complet (commande asynchrone côté MF, polling).

## Mise à jour mensuelle

V1 : relance manuelle de `npm run dju:data` une fois par mois.
V2 (plus tard) : GitHub Action cron qui commit le JSON automatiquement.

## Architecture API DPClim

- Base URL : `https://public-api.meteofrance.fr/public/DPClim/v1`
- Auth : OAuth2 `client_credentials`, token via `https://portail-api.meteofrance.fr/token`
  avec `Authorization: Basic <MF_APPLICATION_ID>` (déjà base64).
- Pattern de récupération asynchrone :
  1. `POST /commande-station/{quotidienne|mensuelle}` → `id-cmde`
  2. `GET /commande/fichier?id-cmde=...` en polling :
     - 204 → en cours, attendre
     - 201 → prêt, CSV dans le body
     - 410 → expiré, refaire la commande
- Réponses CSV : séparateur `;`, en-têtes en ligne 1, valeurs manquantes = `mq`.

Voir `lib/mf-client.ts` pour le détail.
