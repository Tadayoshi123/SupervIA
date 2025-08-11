# Dockerfile pour les services Node.js de SupervIA

# syntax=docker/dockerfile:1.6

# Étape 1: Dépendances (avec cache npm)
FROM node:lts-alpine AS deps
WORKDIR /usr/src/app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

# Étape 2: Build minimal (code seulement)
FROM node:lts-alpine AS builder
WORKDIR /usr/src/app
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .

# Étape 2: Production
FROM node:lts-alpine
WORKDIR /usr/src/app
ENV NODE_ENV=production
RUN addgroup -S nodeapp && adduser -S nodeapp -G nodeapp
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/src ./src
EXPOSE 3000
USER nodeapp
CMD ["node", "src/index.js"]
