# syntax=docker/dockerfile:1.7

# === Stage 1 — build SvelteKit (sortie statique dans /app/build) ===
FROM node:24-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci
COPY . .
RUN npm run build

# === Stage 2 — runtime Caddy sur le build statique ===
FROM caddy:2-alpine
COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=builder /app/build /srv
EXPOSE 7880
