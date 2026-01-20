# 🏢 BookRoom API

> Backend API REST pour le système de réservation de salles de réunion BookRoom.

---

## 📋 Table des matières

- [Technologies](#-technologies)
- [Prérequis](#-prérequis)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Démarrage](#-démarrage)
- [Structure du projet](#-structure-du-projet)
- [API Endpoints](#-api-endpoints)
- [Modèle de données](#-modèle-de-données)
- [Authentification](#-authentification)
- [Commandes Docker](#-commandes-docker)
- [Scripts npm](#-scripts-npm)
- [Tests](#-tests)
- [Dépannage](#-dépannage)

---

## 🛠️ Technologies

| Catégorie        | Technologie             | Version |
| ---------------- | ----------------------- | ------- |
| Runtime          | Node.js                 | 20+     |
| Framework        | Express                 | 5.x     |
| Langage          | TypeScript              | 5.x     |
| Base de données  | PostgreSQL              | 15      |
| ORM              | Prisma                  | 5.x     |
| Authentification | Clerk                   | -       |
| Conteneurisation | Docker & Docker Compose | -       |

---

## 📌 Prérequis

- **Docker Desktop** (recommandé) ou Docker Engine + Docker Compose
- **Node.js 20+** (uniquement pour le développement local sans Docker)
- **Compte Clerk** pour l'authentification ([dashboard.clerk.com](https://dashboard.clerk.com))

---

## 📦 Installation

### Option 1 : Avec Docker (Recommandé)

```bash
# Cloner le projet
cd "BookRoom API"

# Copier le fichier d'environnement
cp .env.example .env

# Éditer .env avec vos clés Clerk
# CLERK_PUBLISHABLE_KEY=pk_test_...
# CLERK_SECRET_KEY=sk_test_...

# Démarrer les services
docker compose up -d

# Appliquer le schéma de base de données
docker compose exec api npx prisma db push

# Insérer les données de test
docker compose exec api npx prisma db seed
```

### Option 2 : En local (Développement)

```bash
# Installer les dépendances
npm install

# Copier et configurer l'environnement
cp .env.example .env

# Générer le client Prisma
npx prisma generate

# Démarrer PostgreSQL via Docker
docker compose up postgres -d

# Appliquer le schéma
npx prisma db push

# Insérer les données de test
npx prisma db seed

# Démarrer le serveur
npm run dev
```

---

## 🔧 Configuration

### Variables d'environnement

Créez un fichier `.env` à partir de `.env.example` :

```env
# # Variables d'environnement Backend BookRoom API
# Copiez ce fichier en .env et remplissez les valeurs

# Base de données PostgreSQL
# En local: postgresql://bookroom:bookroom123@localhost:5433/bookroom
# En Docker: postgresql://bookroom:bookroom123@postgres:5432/bookroom
DATABASE_URL=postgresql://bookroom:bookroom123@localhost:5433/bookroom

# Clerk Authentication (https://dashboard.clerk.com)
# Récupérez vos clés dans Settings > API Keys
CLERK_PUBLISHABLE_KEY=pk_test_VOTRE_CLE_PUBLIQUE
CLERK_SECRET_KEY=sk_test_VOTRE_CLE_SECRETE

# Serveur
PORT=3001
NODE_ENV=development

# CORS - URL du frontend autorisé
FRONTEND_URL=http://localhost:5173
```

### Configuration Clerk

1. Créez un compte sur [clerk.com](https://clerk.com)
2. Créez une nouvelle application
3. Dans **Settings > API Keys**, copiez :
   - `Publishable key` → `CLERK_PUBLISHABLE_KEY`
   - `Secret key` → `CLERK_SECRET_KEY`
4. Dans **Settings > Email, Phone, Username**, activez **Email address** avec **Email verification link**

---

## 🚀 Démarrage

### Avec Docker

```bash
# Démarrer tous les services (PostgreSQL + API)
docker compose up -d

# Vérifier que tout fonctionne
docker compose ps

# Voir les logs en temps réel
docker compose logs -f api
```

### En local

```bash
# Démarrer le serveur avec hot-reload
npm run dev
```

### Vérification

```bash
# Test de santé
curl http://localhost:3001/health

# Réponse attendue :
# {"status":"ok","timestamp":"...","environment":"development"}

# Liste des salles
curl http://localhost:3001/api/rooms
```

---

## 📁 Structure du projet

```
BookRoom API/
├── 📄 docker-compose.yml     # Orchestration des services
├── 📄 Dockerfile             # Image Docker de l'API
├── 📄 .env                   # Variables d'environnement (ignoré par git)
├── 📄 .env.example           # Template des variables
├── 📄 package.json           # Dépendances npm
├── 📄 tsconfig.json          # Configuration TypeScript
│
├── 📁 prisma/
│   ├── 📄 schema.prisma      # Schéma de la base de données
│   └── 📄 seed.ts            # Script de données initiales
│
└── 📁 src/
    ├── 📄 server.ts          # Point d'entrée de l'application
    │
    ├── 📁 config/
    │   └── 📄 database.ts    # Client Prisma singleton
    │
    ├── 📁 controllers/
    │   ├── 📄 room.controller.ts      # Logique métier des salles
    │   ├── 📄 booking.controller.ts   # Logique métier des réservations
    │   └── 📄 admin.controller.ts     # Logique métier admin
    │
    ├── 📁 middlewares/
    │   ├── 📄 auth.middleware.ts      # Authentification Clerk (requireAuth + requireAdmin)
    │   └── 📄 errorHandler.ts         # Gestion globale des erreurs
    │
    └── 📁 routes/
        ├── 📄 room.routes.ts          # Routes /api/rooms
        ├── 📄 booking.routes.ts       # Routes /api/bookings
        └── 📄 admin.routes.ts         # Routes /api/admin
```

---

## 📡 API Endpoints

### Base URL

```
http://localhost:3001
```

### Santé du serveur

| Méthode | Endpoint  | Auth | Description     |
| ------- | --------- | ---- | --------------- |
| `GET`   | `/health` | ❌   | État du serveur |

**Exemple de réponse :**

```json
{
  "status": "ok",
  "timestamp": "2026-01-20T15:30:00.000Z",
  "environment": "development"
}
```

---

### 🏠 Salles (Rooms)

| Méthode | Endpoint         | Auth | Description                                  |
| ------- | ---------------- | ---- | -------------------------------------------- |
| `GET`   | `/api/rooms`     | ❌   | Liste de toutes les salles                   |
| `GET`   | `/api/rooms/:id` | ❌   | Détail d'une salle avec créneaux disponibles |

#### GET /api/rooms

**Réponse :**

```json
{
  "success": true,
  "data": [
    {
      "id": "room-001",
      "name": "Salle Innovation",
      "capacity": 10,
      "pricePerHour": 50,
      "equipments": ["wifi", "projector", "whiteboard"],
      "imageUrl": "https://..."
    }
  ]
}
```

#### GET /api/rooms/:id

**Paramètres query :**

- `date` (optionnel) : Date pour les créneaux disponibles (YYYY-MM-DD)

**Réponse :**

```json
{
  "success": true,
  "data": {
    "id": "room-001",
    "name": "Salle Innovation",
    "description": "Salle moderne avec vue panoramique...",
    "capacity": 10,
    "pricePerHour": 50,
    "equipments": ["wifi", "projector", "whiteboard"],
    "imageUrl": "https://...",
    "images": ["https://..."],
    "availableSlots": [
      {
        "date": "2026-01-21",
        "slots": ["09:00", "10:00", "11:00", "14:00", "15:00"]
      }
    ]
  }
}
```

---

### 📅 Réservations (Bookings)

| Méthode | Endpoint                    | Auth | Description              |
| ------- | --------------------------- | ---- | ------------------------ |
| `POST`  | `/api/bookings`             | ✅   | Créer une réservation    |
| `GET`   | `/api/bookings/my-bookings` | ✅   | Mes réservations         |
| `GET`   | `/api/bookings/:id`         | ✅   | Détail d'une réservation |
| `PATCH` | `/api/bookings/:id`         | ✅   | Modifier une réservation |
| `PATCH` | `/api/bookings/:id/cancel`  | ✅   | Annuler une réservation  |

---

### 🔐 Admin

| Méthode  | Endpoint                | Auth     | Description                       |
| -------- | ----------------------- | -------- | --------------------------------- |
| `POST`   | `/api/admin/rooms`      | 👑 Admin | Créer une salle                   |
| `PUT`    | `/api/admin/rooms/:id`  | 👑 Admin | Modifier une salle                |
| `DELETE` | `/api/admin/rooms/:id`  | 👑 Admin | Supprimer/désactiver une salle    |
| `GET`    | `/api/admin/bookings`   | 👑 Admin | Toutes les réservations (filtres) |
| `GET`    | `/api/admin/statistics` | 👑 Admin | Statistiques globales             |

#### POST /api/admin/rooms

**Headers requis :**

```
Authorization: Bearer <clerk_token>
Content-Type: application/json
```

**Body :**

```json
{
  "name": "Salle Créativité",
  "description": "Espace collaboratif...",
  "capacity": 8,
  "pricePerHour": 45,
  "equipments": ["wifi", "whiteboard"],
  "imageUrl": "https://...",
  "images": []
}
```

#### GET /api/admin/bookings

**Paramètres query (filtres optionnels) :**

- `status` : `CONFIRMED` | `CANCELLED` | `MODIFIED` | `COMPLETED`
- `roomId` : ID de la salle
- `startDate` : Date de début (YYYY-MM-DD)
- `endDate` : Date de fin (YYYY-MM-DD)

**Exemple :**

```
GET /api/admin/bookings?status=CONFIRMED&startDate=2026-01-20&endDate=2026-01-31
```

#### GET /api/admin/statistics

**Réponse :**

```json
{
  "success": true,
  "data": {
    "totalRooms": 6,
    "totalBookings": 42,
    "confirmedBookings": 38,
    "futureBookings": 15,
    "totalRevenue": 4250,
    "mostBookedRoom": {
      "id": "room-001",
      "name": "Salle Innovation",
      "bookingCount": 12
    }
  }
}
```

---

#### POST /api/bookings

**Headers requis :**

```
Authorization: Bearer <clerk_token>
Content-Type: application/json
```

**Body :**

```json
{
  "roomId": "room-001",
  "date": "2026-01-25",
  "startTime": "10:00",
  "endTime": "12:00",
  "customerName": "Jean Dupont",
  "customerEmail": "jean@example.com",
  "customerPhone": "+33612345678",
  "numberOfPeople": 5
}
```

**Réponse (201 Created) :**

```json
{
  "success": true,
  "data": {
    "bookingId": "uuid-...",
    "roomName": "Salle Innovation",
    "date": "2026-01-25",
    "startTime": "10:00",
    "endTime": "12:00",
    "totalPrice": 100,
    "status": "confirmed"
  },
  "message": "Réservation créée avec succès"
}
```

#### GET /api/bookings/my-bookings

**Réponse :**

```json
{
  "success": true,
  "data": [
    {
      "bookingId": "uuid-...",
      "roomName": "Salle Innovation",
      "date": "2026-01-25",
      "startTime": "10:00",
      "endTime": "12:00",
      "totalPrice": 100,
      "status": "confirmed"
    }
  ]
}
```

#### PATCH /api/bookings/:id/cancel

**Réponse :**

```json
{
  "success": true,
  "data": {
    "bookingId": "uuid-...",
    "status": "cancelled"
  },
  "message": "Réservation annulée avec succès"
}
```

---

### ❌ Codes d'erreur

| Code HTTP | Code erreur         | Description                |
| --------- | ------------------- | -------------------------- |
| 400       | `VALIDATION_ERROR`  | Données invalides          |
| 401       | `UNAUTHORIZED`      | Token manquant ou invalide |
| 403       | `FORBIDDEN`         | Accès non autorisé         |
| 404       | `ROOM_NOT_FOUND`    | Salle non trouvée          |
| 404       | `BOOKING_NOT_FOUND` | Réservation non trouvée    |
| 409       | `TIME_CONFLICT`     | Créneau déjà réservé       |
| 500       | `SERVER_ERROR`      | Erreur serveur             |

**Format des erreurs :**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Champs requis manquants",
    "details": {
      "required": "roomId, date, startTime, endTime"
    }
  }
}
```

---

## 📊 Modèle de données

### Room (Salle)

```typescript
interface Room {
  id: string; // Identifiant unique
  name: string; // Nom de la salle
  description: string; // Description détaillée
  capacity: number; // Capacité max de personnes
  pricePerHour: number; // Prix horaire en euros
  equipments: string[]; // Liste des équipements
  imageUrl: string; // Image principale
  images: string[]; // Galerie d'images
  isActive: boolean; // Salle disponible à la réservation
  createdAt: DateTime;
  updatedAt: DateTime;
}
```

### Booking (Réservation)

```typescript
interface Booking {
  id: string; // UUID
  roomId: string; // Référence à la salle
  userId: string; // ID utilisateur Clerk
  date: string; // Date (YYYY-MM-DD)
  startTime: string; // Heure début (HH:MM)
  endTime: string; // Heure fin (HH:MM)
  customerName: string; // Nom du client
  customerEmail: string; // Email du client
  customerPhone?: string; // Téléphone (optionnel)
  numberOfPeople: number; // Nombre de participants
  totalPrice: number; // Prix calculé
  status: BookingStatus; // État de la réservation
  createdAt: DateTime;
  updatedAt: DateTime;
}

enum BookingStatus {
  CONFIRMED = "CONFIRMED",
  MODIFIED = "MODIFIED",
  CANCELLED = "CANCELLED",
  COMPLETED = "COMPLETED",
}
```

### Schéma Prisma

```prisma
model Room {
  id           String    @id
  name         String
  description  String
  capacity     Int
  pricePerHour Float
  equipments   String[]
  imageUrl     String
  images       String[]
  isActive     Boolean   @default(true)
  bookings     Booking[]
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}

model Booking {
  id             String        @id @default(uuid())
  roomId         String
  userId         String
  date           String
  startTime      String
  endTime        String
  customerName   String
  customerEmail  String
  customerPhone  String?
  numberOfPeople Int           @default(1)
  totalPrice     Float
  status         BookingStatus @default(CONFIRMED)
  room           Room          @relation(fields: [roomId], references: [id])
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt
}
```

---

## 🔐 Authentification

L'API utilise **Clerk** pour l'authentification via JWT.

### Flux d'authentification

1. L'utilisateur se connecte sur le frontend via Clerk
2. Clerk génère un JWT (token)
3. Le frontend envoie le token dans le header `Authorization`
4. Le backend vérifie le token avec `@clerk/express`

### Header requis

```
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Middleware d'authentification

```typescript
// Routes protégées (utilisateur connecté)
router.post("/bookings", requireAuth, createBooking);
router.get("/bookings/my-bookings", requireAuth, getMyBookings);

// Routes admin (nécessite role: "admin" dans Clerk publicMetadata)
router.post("/admin/rooms", requireAdmin, createRoom);
router.get("/admin/statistics", requireAdmin, getStatistics);
```

### Configuration d'un admin

Pour donner le rôle admin à un utilisateur :

1. **Dashboard Clerk** : [dashboard.clerk.com](https://dashboard.clerk.com)
2. **Users** → Sélectionner l'utilisateur
3. **Metadata** → **Public metadata**
4. Ajouter : `{"role": "admin"}`
5. Sauvegarder

Le backend vérifie automatiquement le rôle via `requireAdmin` middleware.

---

## 🐳 Commandes Docker

### Gestion des services

```bash
# Démarrer tous les services en arrière-plan
docker compose up -d

# Démarrer uniquement PostgreSQL
docker compose up postgres -d

# Arrêter tous les services
docker compose down

# Arrêter et supprimer les volumes (reset DB)
docker compose down -v

# Reconstruire après modification du code
docker compose up -d --build

# Forcer la reconstruction complète
docker compose build --no-cache
docker compose up -d
```

### Logs et debugging

```bash
# Voir les logs de tous les services
docker compose logs

# Logs en temps réel
docker compose logs -f

# Logs d'un service spécifique
docker compose logs -f api
docker compose logs -f postgres

# État des services
docker compose ps
```

### Base de données

```bash
# Appliquer le schéma Prisma
docker compose exec api npx prisma db push

# Insérer les données de test
docker compose exec api npx prisma db seed

# Ouvrir Prisma Studio (interface graphique)
docker compose exec api npx prisma studio

# Accéder à PostgreSQL directement
docker compose exec postgres psql -U bookroom -d bookroom
```

---

## 📝 Scripts npm

| Commande        | Description                                   |
| --------------- | --------------------------------------------- |
| `npm run dev`   | Démarrage avec hot-reload (nodemon + ts-node) |
| `npm run build` | Compilation TypeScript vers JavaScript        |
| `npm run start` | Démarrage en production                       |

---

## 🧪 Tests

### Test manuel avec curl

```bash
# Santé du serveur
curl http://localhost:3001/health

# Liste des salles
curl http://localhost:3001/api/rooms

# Détail d'une salle
curl http://localhost:3001/api/rooms/room-001

# Détail avec créneaux disponibles
curl "http://localhost:3001/api/rooms/room-001?date=2026-01-25"
```

### Test des routes protégées

Pour tester les routes protégées, vous devez d'abord obtenir un token Clerk depuis le frontend, puis :

```bash
curl -X POST http://localhost:3001/api/bookings \
  -H "Authorization: Bearer VOTRE_TOKEN_CLERK" \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": "room-001",
    "date": "2026-01-25",
    "startTime": "10:00",
    "endTime": "12:00",
    "customerName": "Jean Dupont",
    "customerEmail": "jean@example.com",
    "numberOfPeople": 5
  }'
```

---

## 🔧 Dépannage

### Le serveur ne démarre pas

**Erreur : Port 3001 déjà utilisé**

```bash
# Trouver le processus
netstat -ano | findstr :3001

# Ou stopper tous les conteneurs
docker compose down
```

**Erreur : Connexion à la base de données refusée**

```bash
# Vérifier que PostgreSQL est démarré
docker compose ps

# Vérifier les logs PostgreSQL
docker compose logs postgres
```

### Erreur Prisma

**Erreur : Client Prisma non généré**

```bash
# Régénérer le client
npx prisma generate

# Ou dans Docker
docker compose exec api npx prisma generate
```

**Erreur : Schéma non synchronisé**

```bash
# Appliquer le schéma
docker compose exec api npx prisma db push
```

### Erreur Clerk

**Erreur : "Publishable key not valid"**

- Vérifiez que `.env` contient les bonnes clés Clerk
- Redémarrez le serveur après modification du `.env`
- En Docker : `docker compose up -d --build`

### Reset complet

```bash
# Supprimer tout et recommencer
docker compose down -v
docker compose up -d --build
docker compose exec api npx prisma db push
docker compose exec api npx prisma db seed
```

---

## 📞 Support

Pour toute question ou problème, consultez :

- La documentation Clerk : [clerk.com/docs](https://clerk.com/docs)
- La documentation Prisma : [prisma.io/docs](https://prisma.io/docs)
- La documentation Express : [expressjs.com](https://expressjs.com)

---

> 📅 Dernière mise à jour : Janvier 2026
