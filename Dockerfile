# Dockerfile pour le Backend BookRoom API
FROM node:20-bookworm-slim

# Installer OpenSSL et les dépendances nécessaires pour Prisma
RUN apt-get update && apt-get install -y openssl libssl-dev ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Installer les dépendances
COPY package*.json ./
RUN npm ci

# Copier le code source
COPY . .

# Générer le client Prisma
RUN npx prisma generate

# Exposer le port
EXPOSE 3001

# Commande par défaut (sera remplacée en dev par docker-compose)
CMD ["npm", "run", "dev"]
