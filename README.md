# SupervIA 🚀

*Supervision intelligente • Dashboards • Multi-plateformes*

## 🌟 Vue d'ensemble

SupervIA est une plateforme de supervision d'infrastructure de nouvelle génération qui combine la puissance de **Zabbix** avec l'**intelligence artificielle** pour offrir une expérience de monitoring révolutionnaire. Conçue avec une architecture microservices moderne, elle transforme la complexité des données de supervision en insights actionables.

### ✨ Caractéristiques principales

- 🧠 **IA intégrée** : Détection d'anomalies, prédictions et suggestions intelligentes
- 🎨 **Dashboards visuels** : Interface drag & drop avec widgets personnalisables
- 🔔 **Alertes contextualisées** : Notifications enrichies avec tendances et analyses
- 🌐 **Multi-plateformes** : Compatible Zabbix et extensible à d'autres solutions
- 🔒 **Sécurité renforcée** : OAuth2, JWT, chiffrement et conformité OWASP
- 🚀 **Déploiement instantané** : Docker Compose, prêt en 2 minutes

## 🏗️ Architecture

SupervIA suit une architecture microservices distribuée avec séparation claire des responsabilités :

### 🎯 Services principaux

| Service | Port | Responsabilité | Technologies |
|---------|------|----------------|--------------|
| **Frontend** | 3000 | Interface utilisateur, BFF | Next.js 15, React 19, Redux Toolkit |
| **Auth Service** | 3001 | Authentification, OAuth2 | Express, Passport.js, JWT |
| **DB Service** | 3002 | Base de données, ORM | Prisma, PostgreSQL |
| **Metrics Service** | 3003 | Intégration Zabbix | Express, Zabbix API |
| **Notification Service** | 3004 | Emails, WebSocket | Nodemailer, Socket.io |
| **AI Service** | 3005 | Intelligence artificielle | Express, OpenAI GPT-4 |

## 🚀 Démarrage rapide

### Prérequis

- 🐳 **Docker & Docker Compose** (v20.10+)
- 🔧 **Node.js 20+** (pour développement)
- 🗄️ **PostgreSQL 17** (inclus dans Docker)

### Installation en 2 minutes

1. **Cloner le repository**
```bash
git clone https://github.com/your-username/SupervIA.git
cd SupervIA
```

2. **Configuration environnement**
```bash
cp .env.example .env
# Éditer .env avec vos paramètres
```

3. **Démarrage complet**
```bash
docker compose up -d
```

4. **Vérification des services**
```bash
# Interface web
open http://localhost:3000

# API Health checks
curl http://localhost:3001/health  # Auth
curl http://localhost:3002/health  # DB
curl http://localhost:3003/health  # Metrics
curl http://localhost:3004/health  # Notifications  
curl http://localhost:3005/health  # AI
```

🎉 **C'est prêt !** SupervIA est accessible sur http://localhost:3000

## 🔧 Configuration

### Variables d'environnement essentielles

```env
# 🗄️ Base de données
POSTGRES_USER=supervia
POSTGRES_PASSWORD=your-secure-password
POSTGRES_DB=supervia

# 🔐 Sécurité
JWT_SECRET=your-jwt-secret-key
INTERNAL_API_KEY=your-internal-api-key

# 📡 Zabbix
ZABBIX_URL=http://your-zabbix.com/api_jsonrpc.php
ZABBIX_USER=Admin
ZABBIX_PASSWORD=zabbix

# 🤖 Intelligence Artificielle
OPENAI_API_KEY=sk-your-openai-key
OPENAI_MODEL=gpt-4o-mini

# 📧 Notifications Email
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

## 🎨 Fonctionnalités

### 🖥️ Dashboard Editor

- **Interface drag & drop** avec grille configurable
- **5 types de widgets** : Problems, MultiChart, Gauge, Availability, MetricValue
- **Graphiques avancés** : Area, Line, Bar avec Recharts
- **Alertes configurables** par widget avec seuils
- **Prédictions IA** : Overlay de prévisions sur les graphiques

### 🧠 Intelligence Artificielle

| Fonctionnalité | Description | API Endpoint |
|---------------|-------------|--------------|
| **Suggestions** | Recommandations de widgets selon l'infra | `POST /api/ai/suggest` |
| **Anomalies** | Détection de patterns inhabituels | `POST /api/ai/anomaly` |
| **Prédictions** | Prévisions de tendances | `POST /api/ai/predict` |
| **Seuils auto** | Calcul de seuils optimaux | `POST /api/ai/thresholds` |
| **Résumés** | Génération de titres et descriptions | `POST /api/ai/summarize` |

### 🔔 Système d'alertes

- **Notifications enrichies** avec contexte (tendances, durées, fréquences)
- **Emails HTML** avec templates personnalisés
- **WebSocket temps réel** pour notifications instantanées
- **Gestion anti-spam** avec cooldowns configurables

### 📊 Intégration Zabbix

- **API complète** : Hosts, Items, Problems, History
- **Authentification** automatique avec tokens
- **Cache intelligent** pour optimiser les performances
- **Filtrage avancé** par sévérité, groups, patterns

## 🛠️ Développement

### Structure du projet

```
SupervIA/
├── backend/                    # Services backend
│   ├── auth-service/          # 🔐 Authentification 
│   ├── db-service/            # 💾 Base de données
│   ├── metrics-service/       # 📊 Métriques Zabbix
│   ├── notification-service/  # 🔔 Notifications
│   └── ai-service/            # 🧠 Intelligence artificielle
├── frontend/supervia/         # 🖥️ Interface Next.js
├── docker-compose.yml         # 🐳 Orchestration
└── docs/                      # 📚 Documentation
```

### Commandes de développement

```bash
# 🔄 Développement avec hot reload
docker compose -f docker-compose.dev.yml up

# 🧪 Tests unitaires (tous services)
cd backend/db-service && npm test
cd backend/auth-service && npm test
cd backend/metrics-service && npm test
cd backend/notification-service && npm test
cd backend/ai-service && npm test

# 🔍 Linting
cd frontend/supervia && npm run lint

# 📦 Build de production
docker compose build --no-cache
```

## 🏗️ Services détaillés

### 🔐 Auth Service ([Documentation complète](backend/auth-service/README.md))
- **JWT + OAuth2** (Google, GitHub, local)
- **Passport.js** avec stratégies multiples
- **Rate limiting** et protection CSRF
- **Tests** : 3 suites (auth flows, OAuth, health)

### 💾 DB Service ([Documentation complète](backend/db-service/README.md))
- **Prisma ORM** avec PostgreSQL 17
- **API interne sécurisée** (clé API)
- **Migrations** automatiques et schema management
- **Tests** : 4 suites (users, dashboards, auth, health)

### 📊 Metrics Service ([Documentation complète](backend/metrics-service/README.md))
- **Zabbix API** complète (hosts, items, problems, history)
- **Cache intelligent** avec timestamps
- **Authentification dual** (JWT + API Key)
- **Tests** : 2 suites (Zabbix integration, health)

### 🔔 Notification Service ([Documentation complète](backend/notification-service/README.md))
- **SMTP** avec templates HTML riches
- **WebSocket** (Socket.io) pour temps réel
- **Alertes contextualisées** avec métadonnées avancées
- **Tests** : 3 suites (emails, WebSocket, health)

### 🧠 AI Service ([Documentation complète](backend/ai-service/README.md))
- **OpenAI GPT-4** intégration avec timeouts
- **5 fonctionnalités IA** : suggestions, anomalies, prédictions, seuils, résumés
- **Fallbacks** et gestion d'erreurs robustes
- **Tests** : 3 suites (IA endpoints, auth, health)

### 🖥️ Frontend Next.js ([Documentation complète](frontend/supervia/README.md))
- **Next.js 15** + React 19 + TypeScript strict
- **Redux Toolkit** pour état global
- **BFF Proxy** pour sécurisation API Keys
- **Design System** Tailwind + Shadcn/ui

## 🐳 Déploiement

### Docker Infrastructure ([Documentation complète](DOCKER_INFRASTRUCTURE.md))

**🏗️ Multi-stage builds** avec optimisations :
- Images Alpine Linux légères
- Cache BuildKit pour builds rapides
- Utilisateurs non-root pour sécurité
- Health checks sur tous services

**🌐 Services additionnels** :
- **Zabbix Stack** : Server, Web, Agent avec PostgreSQL
- **Monitoring** : Logs centralisés, métriques

### GitHub Actions CI/CD ([Workflow](.github/workflows/ci.yml))

**🔄 Pipeline automatisé** :
- ✅ Tests unitaires parallèles (5 services)
- 🏗️ Builds Docker avec cache
- 🔍 Security scans (npm audit, Trivy)
- 📏 Linting et quality checks
- 🚀 Smoke tests sur stack complète

## 📊 Monitoring et observabilité

### Health checks
```bash
# Tous services exposent /health
curl http://localhost:3001/health
# Réponse : {"status": "ok", "timestamp": "..."}
```

### Swagger/OpenAPI
- **Documentation API** automatique : `/api-docs`
- **Schemas** typés pour validation
- **Tests interactifs** Swagger UI

## 🔒 Sécurité

### Standards appliqués
- ✅ **OWASP Top 10** : Injection, XSS, CSRF protection
- ✅ **HTTPS/TLS** : Chiffrement en transit
- ✅ **JWT sécurisé** : RS256, expiration, refresh tokens
- ✅ **CORS configuré** : Origines strictes
- ✅ **Rate limiting** : Protection DDoS
- ✅ **Input validation** : Zod schemas, sanitization

### Conformité
- **RGPD/GDPR** : Minimisation données, opt-out
- **Audit logs** : Traçabilité actions utilisateurs

## 🤝 Contribution

### Workflow Git
```bash
# 1. Fork + clone
git clone https://github.com/your-username/SupervIA.git

# 2. Branche feature
git checkout -b feature/nouvelle-fonctionnalite

# 3. Commits conventionnels
git commit -m "feat: ajout dashboard templates"
git commit -m "fix: correction alertes email"

# 4. Tests + lint
npm test && npm run lint

# 5. Pull Request
git push origin feature/nouvelle-fonctionnalite
```

## 🗺️ Roadmap

### 🎯 Version 2.0 (Q2 2024)
- [ ] **Dashboard Templates** : Modèles prédéfinis par infrastructure
- [ ] **Collaboration** : Partage dashboards, commentaires
- [ ] **Mobile App** : Version React Native
- [ ] **Plugin System** : Connecteurs tiers (Grafana, Prometheus)

### 🚀 Version 3.0 (Q4 2024)
- [ ] **IA Conversationnelle** : Chatbot assistant supervision
- [ ] **Multi-tenant** : Isolation organisations
- [ ] **Edge Computing** : Agents légers pour sites distants

## 📄 License

Ce projet est sous licence **MIT**. Voir [LICENSE](LICENSE) pour plus de détails.

---

## 🙏 Remerciements

SupervIA utilise et s'appuie sur ces excellentes technologies :

- 🌐 [Next.js](https://nextjs.org) & [React](https://react.dev)
- 🔧 [Node.js](https://nodejs.org) & [Express](https://expressjs.com)
- 🗄️ [PostgreSQL](https://postgresql.org) & [Prisma](https://prisma.io)
- 📊 [Zabbix](https://zabbix.com) - Solution de monitoring open-source
- 🧠 [OpenAI](https://openai.com) - Intelligence artificielle
- 🐳 [Docker](https://docker.com) - Containerisation

---

<div align="center">

**⭐ Si SupervIA vous aide, n'hésitez pas à donner une étoile !**

[🐛 Signaler un bug](https://github.com/your-username/SupervIA/issues) • [💡 Demander une feature](https://github.com/your-username/SupervIA/discussions) • [📧 Contact](mailto:contact@supervia.dev)

</div>