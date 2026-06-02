# OpenGTB

La boîte à outils des intégrateurs GTB & IoT — des outils gratuits exécutés en local
dans le navigateur, sans installer, sans s'inscrire. Site SvelteKit prerendu en statique
(`adapter-static`), servi par Caddy en conteneur derrière Cloudflare Tunnel.

Le catalogue est piloté par un **registry unique** (`src/lib/tools/registry.ts`) : 13
entrées réparties en 5 secteurs — 12 outils + 1 lien externe (`bacs` → ConformBACS).
Au moment de la rédaction, 10 entrées sont en statut `done`
(`decode`, `modbus`, `conv`, `dju`, `v3v`, `loi-eau`, `air-hyg`, `pdc`, `svg`, `bacs`)
et 3 en `todo` (`pcap`, `compteur-th`, `trends`), rendues via une page « à venir »
générique. Voir [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) pour le détail du modèle.

## Prérequis

- **Node 20+** (testé sur v24.15.0) — requis : `node --env-file` (≥ 20) pour les scripts DJU
- **npm** (livré avec Node)
- **Docker** + **Docker Compose v2** (pour le packaging prod)

## Développement local

```sh
npm install
npm run dev
```

Site disponible sur **http://localhost:5173/**

## Variables d'environnement

Les variables ne sont nécessaires que pour l'**admin SVG en dev** et les **scripts de
build de données** (DJU). Le site lui-même (build statique, exécution navigateur) n'a
besoin d'aucun secret : tout est pré-généré. Copier le modèle :

```sh
cp .env.example .env
```

| Variable | Requise pour | Notes |
| --- | --- | --- |
| `ADMIN_TOKEN` | Admin SVG en dev (`/__svg-admin/*`) | `openssl rand -hex 24`. Plugin Vite désactivé en build → **aucun** endpoint admin en prod. |
| `MF_APPLICATION_ID` | Scripts `dju:*` (API Météo-France DPClim) | Application ID base64 `client_id:client_secret`, obtenu sur https://portail-api.meteofrance.fr/. **Build/serveur uniquement**, n'entre jamais dans le bundle client. |

> ⚠️ `.env` est gitignoré et dockerignoré. Ne jamais committer de secret réel ; en cas de
> fuite, régénérer le credential côté portail Météo-France et l'`ADMIN_TOKEN`.

## Build statique

```sh
npm run build       # prerender → ./build/
npm run preview     # serveur Vite local sur ./build/ pour tester
```

## Conteneurisation

Image finale = `caddy:2-alpine` + le build statique. Multi-stage : pas de Node ni de
devDependencies dans le runtime.

### Prod (Caddy servant le statique)

```sh
docker compose build prod         # build de l'image opengtb:latest
docker compose up                 # run sur http://localhost:7880/
docker compose down               # stop + cleanup
```

Healthcheck via `wget --spider` toutes les 30s, restart `unless-stopped`.

### Dev (HMR via volume mount, optionnel)

```sh
docker compose --profile dev up dev    # http://localhost:5173/
```

Cas d'usage rare : la plupart du temps `npm run dev` direct sur l'host est plus simple.

## URLs locales par défaut

| Service               | URL                       |
| --------------------- | ------------------------- |
| Vite dev server       | http://localhost:5173/    |
| Caddy prod (Docker)   | http://localhost:7880/    |
| Sitemap               | `/sitemap.xml`            |

## Scripts npm

```sh
# Développement & build
npm run dev            # serveur de dev Vite
npm run build          # prerender statique → ./build/
npm run preview        # prévisualisation du build

# Qualité
npm run check          # svelte-check (types + a11y)
npm run check:watch
npm test               # vitest run (suite unitaire complète)
npm run test:watch     # vitest en mode watch

# Génération de données / catalogues (voir docs/ARCHITECTURE.md)
npm run fetch-codecs   # pull du catalogue de codecs LoRaWAN (outil decode)
npm run build-modbus   # construit le catalogue Modbus → static/data/modbus/ + manifest
npm run dju:stations   # télécharge la liste des stations Météo-France (requiert .env)
npm run dju:data       # télécharge les températures & calcule les DJU (requiert .env)
npm run dju:fetch      # dju:stations + dju:data enchaînés
```

## Pipeline de données (build → static)

Plusieurs outils s'appuient sur des données pré-générées hors-ligne par des scripts Node,
puis servies statiquement. Le secret Météo-France ne vit **que** dans ces scripts ; le
runtime navigateur ne fait que `fetch()` des JSON déjà calculés.

- **`decode`** : `scripts/decode/` → catalogue de codecs LoRaWAN dans `static/data/lorawan-codecs/`.
- **`modbus`** : `scripts/modbus/build.ts` agrège plusieurs sources amont → `static/data/modbus/<vendor>/<model>.json`
  + `manifest.json` (dupliqué dans `src/lib/tools/modbus/manifest.generated.json` pour le prerender).
- **`dju`** : `scripts/dju/` interroge l'API Météo-France DPClim → stations dans
  `src/lib/tools/dju/data/` et données mensuelles dans `static/data/dju/`.

Ces pipelines sont **manuels** (non branchés sur `npm run build`) : les artefacts sont
commités. Penser à les régénérer quand les sources amont évoluent.

## Structure du projet

```
opengtb/
├── design-export/                  # Maquette HTML/CSS de référence (read-only)
├── docs/
│   ├── ARCHITECTURE.md             # Modèle d'un outil + pipeline de données
│   └── CODE_REVIEW.md              # Rapport de revue de code
├── scripts/
│   ├── decode/                     # Catalogue codecs LoRaWAN (fetch + extraction schéma + overrides)
│   ├── dju/                        # Fetch Météo-France DPClim → stations + DJU (lib/, README)
│   ├── modbus/                     # Build catalogue Modbus multi-sources (lib/, overrides, README)
│   └── vite-svg-admin-plugin.ts    # Endpoint admin SVG, dev-only (apply: 'serve')
├── src/
│   ├── app.html                    # lang="fr", class="dark" par défaut
│   ├── content/
│   │   ├── articles/*.md           # Articles éditoriaux (MDsveX + Shiki)
│   │   └── data/                   # JSON statiques importés par les outils
│   ├── lib/
│   │   ├── articles/               # loader.ts (import.meta.glob) + types
│   │   ├── auth/                   # Placeholder futur module auth
│   │   ├── components/
│   │   │   ├── home/               # Hero, FeaturedTools, ToolsBySector, RecentArticles, ...
│   │   │   ├── layout/             # Header, Footer, ThemeToggle, BackLink
│   │   │   ├── articles/           # ArticleCard
│   │   │   ├── tools/              # ToolShell.svelte + composants par outil (decode/, dju/, loi-eau/)
│   │   │   └── ui/                 # shadcn-svelte + ChartZoomDialog, Tag.svelte
│   │   ├── exporters/              # Abstraction PDF/CSV (local V1 → API V2)
│   │   ├── format.ts               # formatters i18n fr-FR
│   │   ├── seo/                    # buildMeta() + SeoHead.svelte
│   │   ├── stores/theme.svelte.ts  # store dark/light (sans persistance V1)
│   │   ├── tools/
│   │   │   ├── registry.ts         # SOURCE UNIQUE : 13 entrées (5 secteurs)
│   │   │   ├── types.ts            # Tool, Sector, SectorSlug, ToolStatus
│   │   │   └── <slug>/             # Logique métier pure par outil + tests (*.test.ts)
│   │   │       │                   #   decode, modbus, conv, dju, v3v, loi-eau, air-hyg, pdc...
│   │   └── utils.ts                # cn() shadcn + types helpers
│   └── routes/
│       ├── +layout.svelte          # Header + main + Footer + theme effect
│       ├── +layout.ts              # prerender=true par défaut
│       ├── +page.svelte            # Home (composition des sections home/)
│       ├── _admin/svg/             # Admin SVG (prerender=false, ssr=false → hors build)
│       ├── articles/[slug]/        # Articles dynamiques (mdsvex)
│       ├── outils/
│       │   ├── +page.svelte        # Index des outils par secteur
│       │   ├── <slug>/+page.svelte # Une route par outil implémenté
│       │   └── [slug]/             # Fallback générique pour les outils status:'todo'
│       ├── layout.css              # Tokens Tailwind + palette opengtb
│       └── sitemap.xml/+server.ts  # Sitemap auto-généré au build (prerender)
├── static/
│   ├── data/                       # Données pré-générées : dju/, modbus/, lorawan-codecs/
│   ├── articles/                   # Covers des articles (SVG/PNG)
│   ├── og/default.svg              # Image OpenGraph par défaut
│   └── robots.txt
├── Caddyfile                       # Config runtime : cache, compression, sécurité
├── Dockerfile                      # Multi-stage : node:24-alpine → caddy:2-alpine
├── docker-compose.yml              # Services prod (default) + dev (--profile dev)
├── mdsvex.config.js                # Shiki (github-dark) + remark reading_time
└── svelte.config.js                # adapter-static strict + prerender
```

## Convention de commits

[Conventional commits](https://www.conventionalcommits.org/) : `feat:`, `chore:`, `fix:`, `docs:`, `refactor:`, `build:`.
