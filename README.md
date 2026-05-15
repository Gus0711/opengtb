# OpenGTB

La boîte à outils des intégrateurs GTB & IoT — 12 outils gratuits exécutés en local dans le navigateur, sans installer, sans s'inscrire. Site SvelteKit prerendu en statique (`adapter-static`), servi par Caddy en conteneur derrière Cloudflare Tunnel.

## Prérequis

- **Node 20+** (testé sur v24.15.0)
- **npm** (livré avec Node)
- **Docker** + **Docker Compose v2** (pour le packaging prod)

## Développement local

```sh
npm install
npm run dev
```

Site disponible sur **http://localhost:5173/**

## Build statique

```sh
npm run build       # prerender → ./build/
npm run preview     # serveur Vite local sur ./build/ pour tester
```

## Conteneurisation

Image finale = `caddy:2-alpine` + le build statique (~90 Mo, 0.7 Mo de site). Multi-stage : pas de Node ni de devDependencies dans le runtime.

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

## Autres scripts npm

```sh
npm run check          # svelte-check (types + a11y)
npm run check:watch
npm run fetch-codecs   # placeholder — pull catalogue codecs LoRaWAN (à implémenter)
```

## Structure du projet

```
opengtb/
├── design-export/                  # Maquette HTML/CSS de référence (read-only)
├── scripts/
│   └── fetch-lorawan-codecs.ts     # Placeholder : pull TTN devices
├── src/
│   ├── app.html                    # lang="fr", class="dark" par défaut
│   ├── content/
│   │   ├── articles/*.md           # Articles éditoriaux (MDsveX + Shiki)
│   │   └── data/                   # JSON statiques importés par les outils
│   ├── lib/
│   │   ├── articles/               # loader.ts (import.meta.glob) + types
│   │   ├── auth/                   # Placeholder futur module auth
│   │   ├── components/
│   │   │   ├── home/               # Hero, FeaturedTools, ToolsBySector, ...
│   │   │   ├── layout/             # Header, Footer, ThemeToggle, BackLink
│   │   │   ├── articles/           # ArticleCard
│   │   │   ├── tools/              # (à venir)
│   │   │   └── ui/                 # shadcn-svelte + Tag.svelte
│   │   ├── exporters/              # Abstraction PDF/CSV (local V1 → API V2)
│   │   ├── format.ts               # formatters i18n fr-FR
│   │   ├── seo/                    # buildMeta() + SeoHead.svelte
│   │   ├── stores/theme.svelte.ts  # store dark/light (sans persistance V1)
│   │   ├── tools/
│   │   │   ├── registry.ts         # SOURCE UNIQUE : 13 entrées (12 outils + bacs)
│   │   │   └── types.ts
│   │   └── utils.ts                # cn() shadcn + types helpers
│   └── routes/
│       ├── +layout.svelte          # Header + main + Footer + theme effect
│       ├── +layout.ts              # prerender=true par défaut
│       ├── +page.svelte            # Home (composition des sections home/)
│       ├── articles/[slug]/        # Articles dynamiques (mdsvex)
│       ├── outils/[slug]/          # Outils dynamiques (depuis le registry)
│       ├── layout.css              # Tokens Tailwind + palette opengtb
│       └── sitemap.xml/+server.ts  # Sitemap auto-généré au build
├── static/
│   ├── articles/                   # Covers des articles (SVG/PNG)
│   ├── og/default.svg              # Image OpenGraph par défaut
│   ├── svg/                        # Bibliothèque SVG téléchargeable (à venir)
│   ├── docs/                       # PDFs, datasheets (à venir)
│   └── robots.txt
├── Caddyfile                       # Config runtime : cache, compression, sécurité
├── Dockerfile                      # Multi-stage : node:24-alpine → caddy:2-alpine
├── docker-compose.yml              # Services prod (default) + dev (--profile dev)
├── mdsvex.config.js                # Shiki (github-dark) + remark reading_time
└── svelte.config.js                # adapter-static strict + prerender
```

## Convention de commits

[Conventional commits](https://www.conventionalcommits.org/) : `feat:`, `chore:`, `fix:`, `docs:`, `refactor:`, `build:`.
