# SupervIA — Déploiement & Optimisations Build

Ce mémo résume comment construire, lancer et optimiser les images Docker (frontend + backends), localement et en CI/CD.

## 1) Local: construire et lancer

- Prérequis: Docker Desktop (Compose v2), Node 20+ si vous lancez hors Docker.
- Fichier `.env` à la racine (utilisez `.env.example` comme base).

Commandes principales:

```bash
# Build + run (avec BuildKit, plus rapide)
DOCKER_BUILDKIT=1 docker compose up -d --build

# Voir les logs d’un service
docker compose logs -f frontend

# Arrêt + nettoyage réseaux/volumes (attention: perte des données)
docker compose down -v
```

## 2) Frontend: image optimisée

- Next.js en mode `standalone` pour une image de run minimale.
- Multi‑stage avec caches:
  - `npm ci` avec cache BuildKit (`--mount=type=cache,target=/root/.npm`).
  - Cache Next (`--mount=type=cache,target=/app/.next/cache`).
- Lint ignoré en build prod (`eslint.ignoreDuringBuilds: true`) pour éviter les échecs non bloquants.
- User non‑root pour l’exécution.

Extraits clés:

```dockerfile
# syntax=docker/dockerfile:1.6
FROM node:lts-alpine AS deps
RUN --mount=type=cache,target=/root/.npm npm ci
...
FROM node:lts-alpine AS builder
RUN --mount=type=cache,target=/app/.next/cache npm run build
...
FROM node:lts-alpine AS runner
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
CMD ["node", "server.js"]
```

## 3) Backends: images allégées et rapides

- Tous les services Node (auth, db, metrics, notification, ai) utilisent:
  - Multi‑stage (deps → builder → runner)
  - `npm ci` + cache BuildKit
  - Copie minimale en prod: `package*.json`, `node_modules`, `src/` (et Prisma pour `db-service`).
  - User non‑root à l’exécution.

Extrait générique:

```dockerfile
# syntax=docker/dockerfile:1.6
FROM node:lts-alpine AS deps
RUN --mount=type=cache,target=/root/.npm npm ci
FROM node:lts-alpine AS builder
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .
FROM node:lts-alpine
ENV NODE_ENV=production
RUN addgroup -S nodeapp && adduser -S nodeapp -G nodeapp
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/src ./src
USER nodeapp
CMD ["node", "src/index.js"]
```

`db-service` ajoute:

```dockerfile
RUN npx prisma generate
COPY --from=builder /usr/src/app/node_modules/.prisma/client ./node_modules/.prisma/client
COPY --from=builder /usr/src/app/prisma ./prisma
```

## 4) Compose: variables de build & ordre de démarrage

- Le `docker-compose.yml` transmet `NEXT_TELEMETRY_DISABLED=1` au frontend.
- Démarrage séquencé: Postgres → db‑service → autres services → frontend.

## 5) CI/CD GitHub Actions

- Buildx + cache de couches GHA pour accélérer fortement les builds.
- Bake des images à partir de `docker-compose.yml` avec `cache-from/to` partagé.
- Smoke checks: démarrage des services et `curl` sur `/health`.

Extrait clé:

```yaml
- uses: docker/setup-buildx-action@v3
- uses: actions/cache@v4
  with:
    path: /tmp/.buildx-cache
    key: ${{ runner.os }}-buildx-${{ github.sha }}
    restore-keys: |
      ${{ runner.os }}-buildx-
- uses: docker/bake-action@v5
  with:
    files: docker-compose.yml
    pull: true
    load: true
    set: |
      *.cache-from=type=gha
      *.cache-to=type=gha,mode=max
```

## 6) Bonnes pratiques de perfs

- Ordonner les Dockerfiles: copier `package*.json` avant le code pour maximiser le cache.
- `.dockerignore` complets pour réduire le contexte de build.
- Préférer `npm ci` à `npm install` en build.
- Utiliser Alpine quand possible; attention toutefois aux libs natives.
- En dev, vous pouvez builder le frontend hors Docker (`next build`) puis `COPY` les artefacts en image pour des itérations ultra‑courtes.

## 7) Dépannage rapide

- Frontend compile lentement: vérifier cache npm et cache Next actifs, `NEXT_TELEMETRY_DISABLED`, mode `standalone`.
- Erreurs ESLint bloquantes: en prod, `ignoreDuringBuilds: true` est déjà activé.
- Prisma: si erreurs client, refaire `docker compose build db-service` puis `docker compose up -d db-service`.

---
Ce document peut être partagé tel quel pour expliquer le flux de déploiement et les optimisations employées.


