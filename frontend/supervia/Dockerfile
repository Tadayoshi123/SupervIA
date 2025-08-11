# syntax=docker/dockerfile:1.6
# Dockerfile pour le frontend Next.js (SupervIA)

# Étape 1: Dépendances
FROM node:lts-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Utilise le cache BuildKit pour accélérer l'installation
RUN --mount=type=cache,target=/root/.npm npm ci

# Étape 2: Build
FROM node:lts-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Variables de build pour contrôler le coût du build (peuvent être surchargées via --build-arg)
ARG NEXT_TELEMETRY_DISABLED=1
ENV NEXT_TELEMETRY_DISABLED=$NEXT_TELEMETRY_DISABLED

# Build optimisé (cache Next entre builds)
RUN --mount=type=cache,target=/app/.next/cache npm run build

# Étape 3: Production
FROM node:lts-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Éviter un user root en prod
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs

# Copie minimale grâce au mode standalone de Next
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
USER nextjs
CMD ["node", "server.js"]
