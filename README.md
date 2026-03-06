# LocaGest — Système de facturation UCJG Salm

> Maison de vacances YMCA · 53 rue du Haut-Fourneau, 67130 La Broque

Application serverless de gestion des séjours et de facturation pour la maison de vacances UCJG Salm.

---

## Documentation

| Fichier | Contenu |
|---|---|
| [`instructions/specs-fonctionnelles.md`](instructions/specs-fonctionnelles.md) | Rôles métier, règles de gestion (hébergement, énergies, taxes, suppléments), design decisions |
| [`instructions/specs-techniques.md`](instructions/specs-techniques.md) | Stack technique, modèle de données Aurora, structure du projet backend |
| [`instructions/api.md`](instructions/api.md) | Routes API complètes, variables d'environnement Lambda |
| [`instructions/todo.md`](instructions/todo.md) | TODO : blockers avant déploiement, améliorations importantes, nice-to-have |

## Structure du projet

```
salm-facture/
├── backend/          Java 21 + Micronaut 4.4 + Gradle (Lambda)
│   ├── template.yaml SAM — Lambda + API Gateway + S3
│   └── samconfig.toml
├── frontend/         React + Amplify
├── instructions/     Specs et documentation technique
├── maquettes/        Maquettes HTML interactives
└── specs/            Spécifications additionnelles
```

## Développement local

Deux modes disponibles : **frontend seul (mocké)** ou **frontend + backend connecté**.

---

### Mode 1 — Frontend seul (sans backend)

Le frontend tourne entièrement sans backend grâce à **MSW** (Mock Service Worker) qui intercepte tous les appels API avec des données fictives réalistes. C'est le mode par défaut.

**Prérequis :** Node 20 (le projet utilise [fnm](https://github.com/Schniz/fnm))

```bash
# Installer fnm (si pas déjà fait)
curl -fsSL https://fnm.vercel.app/install | bash

# Installer Node 20 et l'activer
fnm install 20
fnm use 20                   # .node-version et .nvmrc sont déjà présents dans frontend/

# Lancer le frontend
cd frontend
cp .env.example .env.local
npm install
npm run dev                  # http://localhost:5173
```

**Comptes de test (mode dev) :**

| Email | Mot de passe | Interface |
|---|---|---|
| `gardien@test.fr` | `test` | Gardien (mobile G1→G6) |
| `resp@test.fr` | `test` | Responsable location (desktop) |
| `tresorier@test.fr` | `test` | Trésorier (desktop) |

**Tests :**

```bash
npm test                     # tests unitaires (watch mode)
npm test -- --run            # run unique (CI)
npm run coverage             # rapport de couverture (seuil : 90%)
```

---

### Mode 2 — Frontend + backend connecté

**Prérequis :** Node 20 (voir ci-dessus), Java 25, Docker

**1. Lancer le backend :**

```bash
cd backend
./gradlew run                # démarre Micronaut sur http://localhost:8080
```

Ou via SAM CLI (Lambda en local) :

```bash
cd backend
./gradlew shadowJar
sam local start-api --template template.yaml   # http://localhost:3000/api/v1/...
```

> SAM local requiert les variables d'environnement Aurora (voir [`instructions/api.md`](instructions/api.md)).

**2. Configurer le frontend pour désactiver MSW :**

Dans `frontend/.env.local` :

```dotenv
VITE_USE_MOCK=false
# Si le backend tourne sur un port différent de 8080 :
# BACKEND_URL=http://localhost:3000
```

**3. Lancer le frontend :**

```bash
cd frontend
npm run dev                  # les appels /api/v1/... sont proxifiés vers le backend
```

> Les comptes de test (`gardien@test.fr` etc.) restent disponibles même en mode connecté — l'auth mock est indépendante de MSW. Pour une auth Cognito réelle, renseigner `VITE_COGNITO_USER_POOL_ID` et `VITE_COGNITO_CLIENT_ID` dans `.env.local`.

---

### Backend seul (tests)

```bash
cd backend
./gradlew test               # tests unitaires + intégration (Testcontainers PostgreSQL)
./gradlew shadowJar          # build du fat-jar pour Lambda
```

---

## Déploiement

- **Backend** : AWS Lambda (Java 21 SnapStart) + API Gateway + Aurora PostgreSQL Serverless v2
- **Frontend** : AWS Amplify
- **CI/CD** : GitHub Actions (`.github/workflows/`)
- **Région** : `eu-west-3` (Paris)

Voir [`instructions/api.md`](instructions/api.md) pour les variables d'environnement requises.
