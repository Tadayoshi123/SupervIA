# Étape 1: Build
FROM node:lts-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .

# Étape 2: Production
FROM node:lts-alpine
WORKDIR /usr/src/app
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/src ./src
COPY package*.json ./
EXPOSE 3000
CMD ["node", "src/index.js"]
