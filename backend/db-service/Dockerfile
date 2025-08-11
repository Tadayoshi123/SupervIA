# Dockerfile pour le db-service, optimisé pour Prisma

# Étape 1: Installation des dépendances
# syntax=docker/dockerfile:1.6

FROM node:lts-alpine AS dependencies
WORKDIR /usr/src/app
COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm npm ci || npm install

# Étape 2: Build & Génération Prisma
FROM node:lts-alpine AS builder
WORKDIR /usr/src/app
COPY --from=dependencies /usr/src/app/node_modules ./node_modules
COPY . .
RUN npx prisma generate

# Étape 3: Production
FROM node:lts-alpine
WORKDIR /usr/src/app
ENV NODE_ENV=production

# Copier uniquement les dépendances de production depuis l'étape 'dependencies'
COPY --from=dependencies /usr/src/app/node_modules ./node_modules
# Copier le client Prisma généré et le schéma depuis l'étape 'builder'
COPY --from=builder /usr/src/app/node_modules/.prisma/client ./node_modules/.prisma/client
COPY --from=builder /usr/src/app/prisma ./prisma
# Copier le code source de l'application
COPY src ./src
COPY package*.json ./
RUN addgroup -S nodeapp && adduser -S nodeapp -G nodeapp

EXPOSE 3000
USER nodeapp
CMD ["node", "src/index.js"]
