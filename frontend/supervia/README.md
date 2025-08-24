# SupervIA Frontend — Next.js 15

## Vue d'ensemble

Le frontend SupervIA est une application Next.js 15 moderne utilisant React 19, TypeScript et Tailwind CSS. Elle offre une interface utilisateur intuitive pour la supervision d'infrastructure avec des dashboards personnalisables, des graphiques en temps réel, et l'intégration d'intelligence artificielle.

## Architecture

### Framework et Stack Technologique

- **Next.js 15** avec App Router et Turbopack
- **React 19** avec TypeScript strict
- **Redux Toolkit (RTK)** pour la gestion d'état globale
- **Tailwind CSS** v4 avec mode sombre
- **Recharts** pour les visualisations de données
- **@dnd-kit** pour le drag & drop des widgets
- **React Hook Form + Zod** pour la validation des formulaires
- **Axios** pour les appels API
- **React Hot Toast** pour les notifications
- **Lucide React** pour les icônes

### Structure du Projet

```
src/
├── app/                          # Next.js App Router
│   ├── api/bff/                 # Backend For Frontend (proxy API)
│   │   └── db/dashboards/       # Routes proxy vers db-service
│   ├── auth/                    # Pages d'authentification
│   ├── dashboard*/              # Pages de dashboards
│   ├── hosts/                   # Pages de gestion des hôtes
│   └── layout.tsx               # Layout racine avec providers
├── components/                   # Composants réutilisables
│   ├── dashboard/               # Composants spécifiques aux dashboards
│   ├── layout/                  # Composants de mise en page
│   └── ui/                      # Composants UI de base (Design System)
├── lib/                         # Logique métier et utilitaires
│   ├── features/               # Redux slices par domaine
│   ├── store/                  # Configuration Redux
│   └── utils/                  # Fonctions utilitaires
└── types/                      # Définitions TypeScript
```

## Fonctionnalités Principales

### 1. Authentification

**Local et OAuth2**
- Connexion locale avec email/mot de passe (JWT)
- OAuth2 avec Google et GitHub
- Gestion automatique des tokens et du refresh
- Protection des routes avec middleware Redux

**Redux Slice**: `authSlice.ts`
- Actions: `login`, `register`, `logout`, `refreshAuth`
- État persisté dans localStorage
- Décodage automatique des JWT avec `jwt-decode`

### 2. Dashboard Editor

**Interface Drag & Drop**
- Éditeur visuel avec grille configurable (16 colonnes par défaut)
- Drag & drop avec `@dnd-kit` pour placer/redimensionner les widgets
- Mode prévisualisation temps réel
- Sauvegarde automatique et manuelle

**Types de Widgets Disponibles**:
- **Problems**: Affichage des problèmes Zabbix avec filtrage par sévérité
- **MultiChart**: Graphiques multi-métriques (Area, Line, Bar)
- **Gauge**: Jauges avec seuils configurables
- **Availability**: Statut UP/DOWN des hôtes
- **MetricValue**: Affichage de valeurs uniques

**Configuration Avancée**:
```typescript
interface WidgetConfig {
  chartType?: 'area' | 'line' | 'bar';
  series?: string[];               // IDs des métriques
  seriesColors?: Record<string, string>;
  timeRangeSec?: number;          // Plage temporelle
  refreshSec?: number;            // Auto-refresh
  alerts?: AlertRule[];           // Règles d'alertes
  forecastPoints?: Array<{ts: number; value: number}>; // Prédictions IA
}
```

### 3. Système d'Alertes Intelligent ⭐ **AMÉLIORÉ v1.2.0**

**Système de Batch d'Alertes**
- **🎯 Anti-spam** : Regroupement automatique des alertes sur 30 secondes
- **📊 Classification** : Tri par sévérité (critique > élevé > moyen > attention)
- **📧 Email professionnel** : Template HTML récapitulatif avec statistiques
- **⚡ Notifications temps-réel** : WebSocket immédiat + email groupé
- **🔄 Fallback robuste** : Système de secours en cas d'erreur

**Alertes Enrichies**
- Détection automatique de seuils avec contexte
- Tendances calculées (hausse/baisse/stable)
- Durée et fréquence des alertes
- Provenance détaillée (widget, hôte, métrique)

**Utilitaire `alertUtils.ts`**:
```typescript
// Envoi d'alerte via le système de batch (RECOMMANDÉ)
await sendEnrichedAlert({
  widget,
  hostName: 'prod-server-01',
  metricName: 'CPU Usage',
  currentValue: 95,
  threshold: 80,
  trend: 'increasing',
  duration: 15, // minutes
  additionalContext: {
    frequency: '3ème alerte en 10 minutes'
  }
});

// Le système utilise automatiquement sendBatchAlert() avec fallback
// vers sendAlert() en cas d'erreur
```

**Service Frontend `notificationService.ts`**:
```typescript
// Nouvelle méthode recommandée (v1.2.0)
const batchInfo = await notificationService.sendBatchAlert({
  alertType: 'metricValue',
  severity: 'warning',
  widgetTitle: 'CPU Monitor',
  hostName: 'Database Server',
  metricName: 'CPU utilization',
  currentValue: 85.5,
  threshold: 80,
  units: '%'
});

// Administration : forcer l'envoi du batch
await notificationService.flushAlertBatch();
```

### 4. Intégration IA

**Services IA** (`aiService.ts`):
- **Suggestions de widgets**: Recommandations basées sur l'infrastructure
- **Détection d'anomalies**: Analyse des patterns inhabituels
- **Prédictions**: Prévisions de tendances (affichage overlay sur graphiques)
- **Génération de seuils**: Calcul automatique des seuils optimaux
- **Résumés intelligents**: Génération de titres et descriptions

**Exemple d'utilisation**:
```typescript
// Suggestion de widgets pour un hôte
const suggestions = await aiService.suggestWidgets(hostId);

// Détection d'anomalies sur des données historiques
const anomalies = await aiService.detectAnomalies(hostId, itemId, history);
```

### 5. Gestion d'État Redux

**Store Configuration** (`store.ts`):
```typescript
export const makeStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
      metrics: metricsReducer,
    },
  });
};
```

**Metrics Slice** - Gestion centralisée des données Zabbix:
- Hosts, items, problèmes cachés par host ID
- Refetch automatique avec timestamps
- Gestion des erreurs et états de chargement

### 6. Backend For Frontend (BFF)

**Proxy API** (`app/api/bff/`):
- Injection automatique de `X-Internal-Api-Key` pour les services backend
- Routes Next.js 15 compatibles (async `context.params`)
- Gestion transparente des headers CORS
- Abstraction des URLs des microservices

**Exemple Route Handler**:
```typescript
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  
  const response = await fetch(`${DB_SERVICE_URL}/api/dashboards/${id}`, {
    headers: {
      'X-Internal-Api-Key': INTERNAL_API_KEY,
      'Authorization': request.headers.get('authorization') || '',
    },
  });
  
  return Response.json(await response.json());
}
```

### 7. Design System et UI

**Composants UI** (`components/ui/`):
- Base Tailwind + Radix UI (labels, select, slot)
- Composants accessibles (a11y) avec ARIA
- Mode sombre via `next-themes`

**Layout Adaptatif**:
- Sidebar responsive (collapse/expand)
- Navigation breadcrumb automatique
- Header unifié avec notifications
- Thème persisté en localStorage

### 8. Optimisations et Performance

**Build et Développement**:
- Turbopack pour le dev mode (20x plus rapide)
- Build optimisé avec tree-shaking
- Images optimisées avec `next/image`
- Code splitting automatique

**Caching et State**:
- Cache Redux avec RTK Query patterns
- LocalStorage pour persistance auth
- Memoization des composants lourds (`useMemo`, `React.memo`)

## Configuration et Variables d'Environnement

### Variables Requises

```env
# URLs des services backend
NEXT_PUBLIC_AUTH_SERVICE_URL=http://localhost:3001
NEXT_PUBLIC_METRICS_SERVICE_URL=http://localhost:3003
NEXT_PUBLIC_AI_SERVICE_URL=http://localhost:3005
NEXT_PUBLIC_NOTIFICATION_SERVICE_URL=http://localhost:3006

# Clés API internes (pour BFF)
INTERNAL_API_KEY=your-internal-api-key
DB_SERVICE_URL=http://db-service:3002
```

### Scripts de Développement

```bash
# Développement avec Turbopack
npm run dev

# Build de production
npm run build

# Démarrage production
npm start

# Linting
npm run lint
```

## Tests et Qualité

### Linting ESLint

Configuration ESLint v9 avec flat config:
- Rules Next.js + TypeScript strictes
- Vérification accessibilité
- Détection code mort et variables inutilisées

### Type Safety

- TypeScript strict mode activé
- Types centralisés dans `types/dashboard.ts`
- Typage fort pour Redux avec `RootState` et `AppDispatch`
- Validation runtime avec Zod

## Intégrations Externes

### WebSocket (Socket.io)

Connexion temps réel pour notifications:
```typescript
// Auto-connexion avec token JWT
const socket = io(NOTIFICATION_SERVICE_URL, {
  auth: { token: authToken }
});

socket.on('alert', (data) => {
  // Mise à jour UI en temps réel
});
```

### Zabbix API

Intégration via `metrics-service`:
- Récupération hosts/items/problèmes
- Données historiques pour graphiques
- Statuts de disponibilité temps réel

## Déploiement et Production

### Build Docker

L'application est containerisée avec un Dockerfile multi-stage:
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runner
COPY --from=builder /app/node_modules ./node_modules
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Optimisations Production

- Build statique avec `next build`
- Compression automatique des assets
- Service Worker pour caching (si configuré)
- CSP headers pour sécurité

## Tests

- Lint: `npm run lint`
- E2E Cypress: à mettre en place (les mentions roadmap sont supprimées tant que non implémenté)

## Roadmap et Évolutions

### Fonctionnalités Planifiées

1. **Dashboard Templates**: Modèles prédéfinis par type d'infrastructure
### Améliorations IA

- **Chatbot intégré**: Assistant IA pour navigation et configuration
- **Auto-tuning**: Ajustement automatique des seuils basé sur l'historique
- **Corrélation d'événements**: Détection de patterns entre métriques

---

Le frontend SupervIA représente une interface moderne et performante pour la supervision d'infrastructure, combinant les meilleures pratiques React/Next.js avec des fonctionnalités avancées d'IA et de visualisation de données.