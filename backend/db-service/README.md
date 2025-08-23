# DB Service - SupervIA

**Service de base de données centralisée pour l'authentification et la gestion des dashboards**

## 📋 Vue d'ensemble

Le `db-service` est le service central de gestion des données de SupervIA. Il fournit une API sécurisée pour gérer les utilisateurs et les dashboards, avec une authentification stricte par clé API interne pour les communications inter-services.

## 🏗️ Architecture

### Technologies utilisées
- **Runtime** : Node.js avec Express.js
- **ORM** : Prisma avec PostgreSQL
- **Authentification** : Clé API interne (`X-Internal-Api-Key`)
- **Documentation** : Swagger/OpenAPI
- **Sécurité** : Helmet, CORS, Rate Limiting
- **Tests** : Jest + Supertest

### Structure des fichiers
```
src/
├── controllers/          # Logique métier
│   ├── userController.js      # Gestion des utilisateurs
│   ├── dashboardController.js # Gestion des dashboards
│   └── prisma.js             # Instance Prisma
├── routes/              # Définition des routes
│   ├── userRoutes.js         # Routes utilisateurs
│   └── dashboardRoutes.js    # Routes dashboards
├── middleware/          # Middlewares Express
│   ├── authenticateInternalRequest.js # Auth par clé interne
│   └── errorHandler.js              # Gestion d'erreurs centralisée
├── config/              # Configuration
│   ├── swagger.js            # Documentation API
│   └── logger.js            # Logging avec Pino
├── app.js              # Configuration Express
└── index.js            # Point d'entrée
```

## 🔑 Authentification et Sécurité

### Sécurité stricte par clé interne
Tous les endpoints `/api` sont protégés par le middleware `authenticateInternalRequest` :
```javascript
const authenticateInternalRequest = (req, res, next) => {
  const internalApiKey = req.headers['x-internal-api-key'];
  if (internalApiKey && internalApiKey === process.env.INTERNAL_API_KEY) {
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
};
```

### Configuration CORS
- **Origin** : `process.env.FRONTEND_URL`
- **Headers autorisés** : `Content-Type`, `Authorization`, `X-Internal-Api-Key`
- **Méthodes** : `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`

### Rate Limiting
- **120 requêtes/minute** sur `/api/*`
- Headers standards (draft-7)

## 👥 Gestion des Utilisateurs

### Modèle de données
```prisma
model User {
  id            Int       @id @default(autoincrement())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  password      String?   // Pour l'authentification locale
  dashboards    Dashboard[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

### Endpoints disponibles

#### `GET /api/users`
Récupère tous les utilisateurs (sans mots de passe)
- **Sécurité** : Clé API interne requise
- **Réponse** : Tableau d'utilisateurs avec champs publics uniquement

#### `POST /api/users`
Crée un nouvel utilisateur
- **Payload** : `{ email, password?, name? }`
- **Logique** :
  - Email toujours requis
  - Mot de passe optionnel (OAuth vs. local)
  - Email automatiquement vérifié pour OAuth
- **Gestion d'erreur** : Détection des emails en doublon (P2002)

#### `GET /api/users/email/:email`
Récupère un utilisateur par email (endpoint public)
- **Sécurité** : Mot de passe exclu de la réponse
- **Usage** : Vérifications d'existence, profils publics

#### `GET /api/internal/users/email/:email` ⚠️
Récupère un utilisateur avec son hash de mot de passe
- **Usage exclusif** : Communication inter-services (auth-service)
- **Sécurité** : Double protection (clé interne + endpoint spécifique)
- **Risque** : Ne jamais exposer publiquement

## 📊 Gestion des Dashboards

### Modèle de données
```prisma
model Dashboard {
  id        Int       @id @default(autoincrement())
  name      String
  userId    Int
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  widgets   DashboardWidget[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model DashboardWidget {
  id          Int       @id @default(autoincrement())
  dashboardId Int
  dashboard   Dashboard @relation(fields: [dashboardId], references: [id], onDelete: Cascade)
  type        String    # 'gauge', 'multiChart', 'problems', etc.
  title       String
  x           Int       # Position X dans la grille
  y           Int       # Position Y dans la grille
  width       Int       # Largeur en unités de grille
  height      Int       # Hauteur en unités de grille
  hostId      String?   # ID hôte Zabbix (optionnel)
  itemId      String?   # ID item Zabbix (optionnel)
  config      Json?     # Configuration JSON du widget
}
```

### Endpoints disponibles

#### `POST /api/dashboards`
Crée un dashboard avec ses widgets
- **Payload** : `{ name, userId, widgets[] }`
- **Transaction** : Création atomique dashboard + widgets
- **Validation** : Types et positions des widgets

#### `GET /api/users/:userId/dashboards`
Liste les dashboards d'un utilisateur
- **Tri** : Par `updatedAt` décroissant
- **Inclusion** : Widgets complets

#### `GET /api/dashboards/:id`
Récupère un dashboard par ID
- **Inclusion** : Widgets complets
- **Erreur 404** : Dashboard introuvable

#### `PUT /api/dashboards/:id`
Met à jour un dashboard
- **Logique** : Remplacement complet des widgets
- **Transaction** : 
  1. Suppression des anciens widgets
  2. Création des nouveaux widgets
  3. Mise à jour du nom
- **Atomicité** : Rollback automatique en cas d'erreur

#### `DELETE /api/dashboards/:id`
Supprime un dashboard
- **Cascade** : Suppression automatique des widgets (Prisma)
- **Réponse** : 204 No Content

## 📊 Schéma de Base de Données

### Évolution récente
- **Suppression des modèles OAuth** : `Account`, `Session`, `VerificationToken`
- **Simplification** : Focus sur les fonctionnalités core
- **Relations** : Cascade DELETE pour maintenir l'intégrité

### Contraintes importantes
- **Email unique** : Prévention des doublons
- **Relations CASCADE** : Suppression propre
- **JSON flexible** : Configuration widget extensible

## 🧪 Tests

### Couverture de tests
- **Health endpoint** : Vérification du service
- **Authentification interne** : Validation de la clé API
- **CRUD Utilisateurs** : Création, lecture
- **CRUD Dashboards** : Création, lecture par utilisateur

### Mocks Prisma
```javascript
// Simulation complète des opérations Prisma
class PrismaMock {
  user = {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockImplementation(async (args) => ({
      id: 1,
      email: args?.where?.email || 'test@example.com',
      password: '$2a$10$examplehash...'
    })),
    create: jest.fn().mockResolvedValue({ id: 1, email: 'test@example.com' })
  };
  // ... dashboard mocks
}
```

### Commandes de test
```bash
# Tests unitaires
npm test

# Tests avec couverture
npm run test:coverage

# Tests en mode watch
npm run test:watch
```

## 🚀 Déploiement

### Variables d'environnement
```env
# Base de données
DATABASE_URL="postgresql://user:pass@localhost:5432/supervia"

# Sécurité
INTERNAL_API_KEY="your-super-secret-internal-key"
JWT_SECRET="your-jwt-secret"

# Configuration
PORT=3001
FRONTEND_URL="http://localhost:3000"
NODE_ENV="production"
```

### Docker
```dockerfile
# Multi-stage optimisé
FROM node:lts-alpine AS dependencies
# Cache npm avec BuildKit
RUN --mount=type=cache,target=/root/.npm npm ci

FROM node:lts-alpine AS builder
# Génération du client Prisma
RUN npx prisma generate

FROM node:lts-alpine
# User non-root pour la sécurité
USER nodeapp
CMD ["node", "src/index.js"]
```

## 📚 Documentation API

### Swagger UI
- **URL** : `http://localhost:3001/docs`
- **Authentification** : Schéma `internalApiKey` documenté
- **Schemas** : Modèles User et Dashboard complets

### Exemples d'utilisation

#### Création d'utilisateur
```bash
curl -X POST http://localhost:3001/api/users \
  -H "X-Internal-Api-Key: your-key" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","name":"John Doe","password":"hashed-password"}'
```

#### Création de dashboard
```bash
curl -X POST http://localhost:3001/api/dashboards \
  -H "X-Internal-Api-Key: your-key" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mon Dashboard",
    "userId": 1,
    "widgets": [
      {
        "type": "gauge",
        "title": "CPU Usage",
        "x": 0, "y": 0, "width": 3, "height": 3,
        "hostId": "10001",
        "itemId": "20001",
        "config": {"warningThreshold": 80, "criticalThreshold": 90}
      }
    ]
  }'
```

## ⚠️ Points d'attention

### Sécurité
- **Clé API interne** : Ne jamais exposer dans les logs ou le frontend
- **Endpoint interne** : `/api/internal/*` strictement réservé aux services
- **Validation des données** : Sanitisation des entrées utilisateur

### Performance
- **Rate limiting** : Éviter les abus
- **Indexes Prisma** : Email unique, relations optimisées
- **Transactions** : Opérations atomiques sur les dashboards

### Monitoring
- **Logs structurés** : Pino avec niveaux appropriés
- **Health check** : `/health` pour orchestrateurs
- **Métriques** : Prêt pour intégration APM

## 🔗 Intégrations

### Services dépendants
- **auth-service** : Appels vers `/api/internal/users/email/:email`
- **frontend** : Proxy BFF vers tous les endpoints dashboard
- **PostgreSQL** : Base de données principale

### Services clients
- Tous les autres services backend via clé API interne
- Frontend Next.js via routes BFF sécurisées
