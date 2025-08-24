# Manuel d'Installation et Déploiement SupervIA

## 🎯 Prérequis techniques

### **Système d'exploitation**
- Windows 10/11, macOS 10.15+, ou Linux (Ubuntu 20.04+ recommandé)
- 8 GB RAM minimum, 16 GB recommandé
- 20 GB d'espace disque libre

### **Logiciels requis**

| Logiciel | Version minimum | Installation |
|----------|-----------------|--------------|
| **Docker Desktop** | v4.0+ avec BuildKit | [docker.com/products/docker-desktop](https://docker.com/products/docker-desktop) |
| **Docker Compose** | v2.0+ | Inclus avec Docker Desktop |
| **Git** | v2.30+ | [git-scm.com](https://git-scm.com) |
| **Node.js** | v20.0+ | [nodejs.org](https://nodejs.org) *(optionnel, pour dev)* |

### **Comptes/Services externes**

| Service | Requis | Utilisation |
|---------|--------|-------------|
| **OpenAI API** | Oui | Intelligence artificielle (GPT-4o-mini) |
| **SMTP** | Oui | Envoi d'emails (Mailtrap pour dev) |
| **Google OAuth** | Optionnel | Authentification Google |
| **GitHub OAuth** | Optionnel | Authentification GitHub |
| **Zabbix** | Oui | Source de données de monitoring |

### **Architecture des services déployés**

```
SupervIA Stack Complète
├── Frontend (Next.js 15)          :3000
├── Auth Service                   :3001  
├── DB Service (Prisma)            :3002
├── Metrics Service                :3003
├── Notification Service           :3004
├── AI Service                     :3005
├── PostgreSQL App                 :5432
├── PostgreSQL Zabbix              :5433
├── PgAdmin                        :5050
├── Zabbix Web Interface           :8080
├── Zabbix Server                  :10051
└── Zabbix Agents (5+ instances)
```

## 🚀 Installation pas-à-pas

### **Étape 1 : Cloner le repository**

```bash
# Cloner le projet
git clone https://github.com/your-username/SupervIA.git
cd SupervIA

# Vérifier la version
git log --oneline -n 5
```

### **Étape 2 : Configuration environnement**

1. **Copier le fichier d'exemple**
```bash
cp .env.example .env
```

2. **Éditer le fichier `.env`** avec vos paramètres :

```env
# 🗄️ Base de données (modifier le mot de passe)
POSTGRES_USER=postgres
POSTGRES_PASSWORD=YOUR_SECURE_PASSWORD_HERE
POSTGRES_DB=supervia

# 🔐 Sécurité (générer des clés uniques)
JWT_SECRET=your-jwt-secret-256-bits-minimum
INTERNAL_API_KEY=your-internal-api-key-change-in-production

# 📡 Zabbix (configurer selon votre instance)
ZABBIX_URL=http://your-zabbix-server.com/api_jsonrpc.php
ZABBIX_USER=Admin
ZABBIX_PASSWORD=your_zabbix_password

# 🤖 OpenAI (obligatoire)
OPENAI_API_KEY=sk-your-openai-api-key

# 📧 SMTP pour notifications
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_USER=your_mailtrap_user
SMTP_PASS=your_mailtrap_password
```

### **Étape 3 : Obtenir les clés API**

#### **OpenAI API Key** (obligatoire)
1. Aller sur [platform.openai.com](https://platform.openai.com)
2. Créer un compte ou se connecter
3. Aller dans "API Keys" → "Create new secret key"
4. Copier la clé (format `sk-...`)
5. Ajouter au fichier `.env` : `OPENAI_API_KEY=sk-...`

#### **SMTP (Mailtrap pour développement)**
1. Créer un compte sur [mailtrap.io](https://mailtrap.io)
2. Créer une "Inbox" de test
3. Copier les credentials SMTP
4. Ajouter au `.env` :
```env
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your_username
SMTP_PASS=your_password
```

#### **OAuth (optionnel)**

**Google OAuth :**
1. [Console Google Cloud](https://console.cloud.google.com)
2. Créer un projet → APIs & Services → Credentials
3. OAuth 2.0 Client ID → Web application
4. Authorized redirect URI : `http://localhost:3001/auth/google/callback`

**GitHub OAuth :**
1. GitHub → Settings → Developer settings → OAuth Apps
2. New OAuth App
3. Authorization callback URL : `http://localhost:3001/auth/github/callback`

### **Étape 4 : Démarrage optimisé avec BuildKit**

#### **Activation BuildKit (recommandée)**

**Vérifier BuildKit** :
```bash
# Vérifier si BuildKit est activé
docker buildx ls
# Doit afficher "docker-container" ou "default*"
```

**Activer BuildKit dans Docker Desktop** :
1. Docker Desktop → Settings (⚙️) → Docker Engine
2. Ajouter dans la configuration JSON :
```json
{
  "features": {
    "buildkit": true
  }
}
```
3. Apply & Restart

**Alternative en ligne de commande** :
```bash
# Activer BuildKit pour cette session
export DOCKER_BUILDKIT=1
export BUILDKIT_PROGRESS=plain
```

#### **Démarrage complet (première fois)**
```bash
# Sans BuildKit (build standard ~3 min)
docker compose up -d --build

# Avec BuildKit activé (build optimisé ~90-120s avec cache)
DOCKER_BUILDKIT=1 docker compose up -d --build

# Vérification du statut des services
docker compose ps

# Ordre de démarrage recommandé (si problèmes)
docker compose up -d postgres zabbix-db
sleep 10
docker compose up -d zabbix-server db-service
sleep 5
docker compose up -d zabbix-web auth-service metrics-service notification-service ai-service
sleep 5
docker compose up -d frontend pgadmin
```

#### **Démarrages suivants (plus rapides)**
```bash
# Simple démarrage (cache BuildKit utilisé)
docker compose up -d

# Suivi des logs par service
docker compose logs -f frontend
docker compose logs -f metrics-service
docker compose logs -f zabbix-server
```

#### **Optimisations de build**
- **Cache npm** : Persistant entre builds (`--mount=type=cache,target=/root/.npm`)
- **Cache Next.js** : Build incrémental (`--mount=type=cache,target=/app/.next/cache`)
- **Multi-stage** : Images finales légères (Alpine Linux)
- **Utilisateurs non-root** : Sécurité renforcée

### **Étape 5 : Vérification de l'installation**

1. **Interface web** : [http://localhost:3000](http://localhost:3000)

2. **Health checks des services** :
```bash
curl http://localhost:3001/health  # Auth Service
curl http://localhost:3002/health  # DB Service  
curl http://localhost:3003/health  # Metrics Service
curl http://localhost:3004/health  # Notification Service
curl http://localhost:3005/health  # AI Service
```

3. **Base de données** :
```bash
# Vérifier que Postgres est démarré
docker compose exec postgres pg_isready -U postgres
```

## 🔧 Configuration Zabbix intégrée

### **Stack Zabbix incluse**

SupervIA déploie automatiquement une **stack Zabbix complète** :
- **Zabbix Server** (port 10051) : Moteur de collecte
- **Zabbix Web** (port 8080) : Interface d'administration  
- **PostgreSQL Zabbix** (port 5433) : Base dédiée
- **Agents Zabbix** : Un par service SupervIA + agent Docker host

### **Configuration post-installation (obligatoire)**

#### **1. Accès interface Zabbix**
- URL : [http://localhost:8080](http://localhost:8080)
- **Username** : `Admin`
- **Password** : `zabbix` (par défaut)

#### **2. Configuration auto-registration des agents**

**Navigation** : Alerts → Actions → Autoregistration actions → Create action

**Onglet "Action"** :
- **Name** : `Enregistrement automatique des agents Docker`

**Onglet "Operations"** (ajouter 3 opérations) :
1. **Operation type** : `Add host`
2. **Operation type** : `Add to host group` → Sélectionner `Linux servers`
3. **Operation type** : `Link to template` → Sélectionner :
   - `Linux by Zabbix agent`
   - `Zabbix server health`

#### **3. Vérification des agents**

Après 1-2 minutes :
- **Monitoring** → **Hosts**
- Vous devriez voir 6 nouveaux hôtes :
  - `Docker Host` (agent système)
  - `DB Service`, `Auth Service`, `Metrics Service`, `Notification Service`, `AI Service`
- **Colonne Availability** : Icônes ZBX vertes = agents connectés

### **Connexion à votre Zabbix existant (optionnel)**

Si vous avez déjà un Zabbix, modifiez `.env` :
```env
# Pointer vers votre instance externe
ZABBIX_URL=http://your-zabbix-server.com/api_jsonrpc.php
ZABBIX_USER=Admin
ZABBIX_PASSWORD=your_zabbix_password
```

**Test de connexion** :
```bash
curl -X POST http://localhost:3003/api/zabbix/hosts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🛠️ Développement local

### **Mode développement**

```bash
# Frontend avec hot reload
cd frontend/supervia
npm install
npm run dev  # Port 3000

# Backend services (en parallèle)
cd backend/db-service && npm install && npm run dev      # Port 3002
cd backend/auth-service && npm install && npm run dev    # Port 3001
# etc.
```

### **Tests**

```bash
# Tests unitaires backend
cd backend/db-service && npm test
cd backend/auth-service && npm test
# etc.

# Lint frontend
cd frontend/supervia && npm run lint
```

## 🚨 Dépannage et optimisations

### **Problèmes courants**

#### **Port déjà utilisé**
```bash
# Tuer les processus sur les ports
sudo lsof -ti:3000 | xargs kill -9  # macOS/Linux
netstat -ano | findstr :3000        # Windows
```

#### **Docker out of space**
```bash
# Nettoyer le cache Docker (attention aux volumes)
docker system prune -a
# Nettoyer tout y compris volumes (⚠️ perte données)
docker system prune -a --volumes
```

#### **Build lent / Frontend compile lentement**
```bash
# Vérifier cache BuildKit actif
docker buildx ls
# Forcer rebuild avec cache
DOCKER_BUILDKIT=1 docker compose build --no-cache frontend
# Variables d'optimisation Next.js
export NEXT_TELEMETRY_DISABLED=1
```

#### **Base de données corrompue**
```bash
# Reset complet de la DB
docker compose down -v
docker compose up -d postgres
docker compose up -d db-service
sleep 10
docker compose exec db-service npx prisma migrate reset --force
sleep 5
docker compose up -d postgres zabbix-db
sleep 10
docker compose up -d db-service zabbix-server
```

#### **Erreurs ESLint bloquantes en build**
Les builds production ignorent ESLint (`ignoreDuringBuilds: true` activé).
Si problème :
```bash
cd frontend/supervia && npm run lint
```

#### **Erreurs Prisma client**
```bash
# Regénérer le client Prisma
docker compose build --no-cache db-service
docker compose up -d db-service
```

### **Logs de débogage avancés**

```bash
# Logs par service avec timestamps
docker compose logs -f --tail=50 frontend
docker compose logs -f metrics-service
docker compose logs -f zabbix-server

# Logs internes services (Pino format)
docker compose exec db-service cat /tmp/app.log 2>/dev/null || echo "Pas de logs fichier"

# Debug réseau inter-services
docker compose exec frontend ping db-service
docker compose exec metrics-service ping zabbix-web

# Test APIs externes
docker compose exec ai-service curl -I https://api.openai.com
docker compose exec notification-service curl -I https://smtp.mailtrap.io
```

### **Dépannage Zabbix agents**

Si agents n'apparaissent pas dans l'interface :

#### **1. Vérifier logs server/agents**
```bash
docker compose logs zabbix-server | grep -i "agent\|auto"
docker compose logs db-service-zabbix-agent
```

#### **2. Messages fréquents dans les logs**
- `cannot send list of active checks ... host [X] not found` → Action auto-registration manquante ou désactivée
- `connection refused` → Problème réseau entre agent et server

#### **3. Reset des agents**
```bash
# Supprimer hôtes existants dans UI Zabbix (Monitoring → Hosts)
# Redémarrer agents pour re-registration
docker compose restart zabbix-agent db-service-zabbix-agent auth-service-zabbix-agent metrics-service-zabbix-agent notification-service-zabbix-agent ai-service-zabbix-agent
```

### **Optimisations performances**

#### **Images Docker optimisées**
- **Backend services** : ~80-120MB chacun (Alpine + multi-stage)
- **Frontend** : ~150-200MB avec assets Next.js standalone
- **Temps build** : 2-5 min à froid, <1 min avec cache BuildKit

#### **Cache BuildKit persistant**
```bash
# Réutilisation cache entre sessions (si BuildKit activé)
export DOCKER_BUILDKIT=1
export BUILDKIT_PROGRESS=plain
docker compose build  # Cache réutilisé automatiquement

# Test cache : rebuild frontend seul avec cache
docker compose build frontend  # Très rapide si cache actif
```

#### **Benchmarking rapide des performances**

**Frontend (outils rapides)** :
1. **Chrome DevTools** (F12) :
   - Network → Hard refresh → Observer "Load" (~100-300ms attendu)
   - Lighthouse → Performance (score attendu 90+)

2. **PowerShell simple** :
```powershell
Measure-Command { Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing } | Select-Object TotalMilliseconds
```

**Zabbix monitoring intégré** :
```bash
# Une fois Zabbix configuré, métriques en temps réel sur
# http://localhost:8080 → Monitoring → Latest data
# CPU, RAM, réseau de tous les services automatiquement
```

**Recommandé pour test complet (5 min)** :
- **curl** pour APIs (rapide, précis)
- **Chrome DevTools** pour frontend (Network + Performance tab)
- **Zabbix** pour monitoring continu (une fois configuré)

#### **Mode développement hors Docker**
Pour itérations rapides frontend :
```bash
cd frontend/supervia
npm run dev  # Hot reload très rapide
# Backends restent en Docker pour simplicité
```

## ✅ Validation finale

### **Checklist post-installation**

#### **Services SupervIA**
- [ ] Interface accessible sur http://localhost:3000
- [ ] Tous les health checks retournent `{"status": "ok"}` :
  ```bash
  curl http://localhost:3001/health  # Auth
  curl http://localhost:3002/health  # DB  
  curl http://localhost:3003/health  # Metrics
  curl http://localhost:3004/health  # Notification
  curl http://localhost:3005/health  # AI
  ```
- [ ] Authentification locale fonctionnelle (création compte)
- [ ] Email de test reçu (via Mailtrap configuré)

#### **Stack Zabbix intégrée**
- [ ] Interface Zabbix accessible : http://localhost:8080 (Admin/zabbix)
- [ ] Action auto-registration créée et activée
- [ ] 6 agents connectés (icônes ZBX vertes) : Docker Host + 5 services
- [ ] Templates appliqués : "Linux by Zabbix agent" + "Zabbix server health"

#### **Fonctionnalités avancées**
- [ ] Intégration Zabbix → SupervIA fonctionnelle (hosts visibles)
- [ ] Création dashboard de test réussie (widget basique)
- [ ] Suggestions IA opérationnelles (OpenAI API connectée)
- [ ] Notifications temps réel (WebSocket + emails)

#### **PgAdmin (optionnel)**
- [ ] Accès PgAdmin : http://localhost:5050 (admin@supervia.com/admin)
- [ ] Connexions aux 2 bases PostgreSQL configurées

### **Performances mesurées (environnement réel)**

| Métrique | Docker sans BuildKit | Avec BuildKit | Production |
|----------|---------------------|---------------|------------|
| **Build images** | ~3 minutes | ~90-120s (cache) | Variable |
| **Démarrage stack** | ~30s | ~30s | ~30s |
| **Interface web** | **Quasi-instantané** | **Quasi-instantané** | **Quasi-instantané** |
| **APIs backend** | **5-300ms** (testé) | **5-300ms** | **< 100ms** |
| **Agents Zabbix** | 2-3 min (auto-reg) | 2-3 min | 2-3 min |

### **Ressources système en production**

**Consommation attendue** :
- **RAM total** : ~2 GB (stack complète)
- **CPU** : ~20% (16 cores, charge normale)
- **Stockage** : ~6 GB (images + volumes + logs)

**Détail par composant** :
- **Services backend** : ~100 MB RAM chacun
- **Frontend Next.js** : ~150 MB RAM  
- **PostgreSQL** : ~200-300 MB RAM
- **Stack Zabbix** : ~400-500 MB RAM
- **Volumes données** : ~500 MB-1 GB

**Images Docker optimisées** :
- Services SupervIA : ~300-350 MB chacun
- DB service : ~600 MB (inclut Prisma)
- Zabbix web : ~350 MB
- PostgreSQL : ~400 MB
- PgAdmin : ~800 MB

**Total estimé production** :
- **Images** : ~4.5 GB
- **Volumes persistants** : ~1 GB
- **RAM runtime** : ~2 GB (charge normale)

## 📞 Support

En cas de problème :

1. **Logs détaillés** : `docker compose logs --tail=100`
2. **Issues GitHub** : [github.com/your-username/SupervIA/issues](https://github.com/your-username/SupervIA/issues)
3. **Documentation** : README de chaque service dans `backend/*/README.md`

---

**Installation réussie !** 🎉 SupervIA est maintenant opérationnel sur votre environnement.
