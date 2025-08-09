# Dockerfile pour le frontend Next.js (SupervIA)

# Étape 1: Dépendances
FROM node:lts-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install

# Étape 2: Build
FROM node:lts-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Étape 3: Production
FROM node:lts-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copie directe depuis le contexte (plus robuste en CI)
COPY ./public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["npm", "start"]
