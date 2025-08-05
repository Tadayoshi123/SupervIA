# Dockerfile pour les services Node.js de SupervIA

# Étape 1: Build
FROM node:lts-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .

# Étape 2: Production
FROM node:lts-alpine
WORKDIR /usr/src/app
COPY --from=builder /usr/src/app .
EXPOSE 3000
CMD ["node", "src/index.js"]
