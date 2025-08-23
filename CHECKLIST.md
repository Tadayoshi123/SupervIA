# SupervIA — Checklist RNCP Blocs 2 & 4

## Must-have (B2/B4)
- [ ] Architecture microservices claire, homogène (frontend/backend/infra)
- [ ] Un seul `db-service` gère Prisma, la base PostgreSQL et expose une API REST sécurisée.
- [ ] Tous les autres services consomment l’API du `db-service`.
- [ ] Migrations Prisma et accès à la base centralisés.
- [ ] Auth OAuth2/JWT (Google, GitHub, local)
- [ ] Dashboard drag & drop (dnd-kit), recherche FlexSearch
- [ ] Notifications (toast, mail, socket)
- [ ] Zabbix integration (metrics-service + UI)
- [ ] IA Copilote experte en supervision (suggestions, diagnostics, actions)
- [ ] Tests unitaires et d’intégration (Jest, Cypress)
- [ ] Tests automatisés (Jest backend, Cypress frontend)
- [ ] Swagger/OpenAPI docs, /health, /metrics partout
- [ ] Docker Compose all-in, healthchecks
- [ ] README, manuel utilisateur, changelog, process bugs/maintenance
- [ ] OWASP Top 10, sécurité des données, RGPD
- [ ] CI/CD (GitHub Actions, tests, builds, déploiement)
- [ ] Documentation technique (API, architecture, dev)
- [ ] Dépendances à jour, suivi vulnérabilités, process versioning
- [ ] Scénarios de recette/test
- [ ] Journal des corrections & bugs, doc améliorations continues
