# LocaGest — Système de facturation UCJG Salm

> Maison de vacances YMCA · 53 rue du Haut-Fourneau, 67130 La Broque

Plugin WordPress de gestion des séjours et de facturation pour la maison de vacances UCJG Salm.

---

## Documentation

| Fichier | Contenu |
|---|---|
| [`instructions/specs-fonctionnelles.md`](instructions/specs-fonctionnelles.md) | Rôles métier, règles de gestion (hébergement, énergies, taxes, suppléments) |
| [`instructions/specs-techniques-wordpress.md`](instructions/specs-techniques-wordpress.md) | Stack technique, modèle de données MySQL, structure du plugin |
| [`instructions/api.md`](instructions/api.md) | Routes REST API complètes (`/wp-json/locagest/v1/`) |
| [`instructions/todo.md`](instructions/todo.md) | TODO : blockers, améliorations importantes, nice-to-have |

---

## Stack technique

| Composant | Technologie |
|---|---|
| Plateforme | **WordPress 6.x** (hébergement mutualisé) |
| Backend | **PHP 8.2** — plugin `plugin/` |
| Base de données | **MySQL 8 / MariaDB** (tables préfixées `{wp_}locagest_*`) |
| PDF | **DOMPDF 2.x** |
| Auth | Rôles WordPress + **JWT** (`firebase/php-jwt`) |
| API | **WordPress REST API** — `/wp-json/locagest/v1/` |
| Frontend | **React 18 + TypeScript + Vite 5** — sources dans `plugin/frontend/` |
| Tests frontend | **Vitest + React Testing Library** |

---

## Structure du projet

```
salm-facture/
├── plugin/                     Plugin WordPress (à déposer dans wp-content/plugins/)
│   ├── locagest.php             Point d'entrée — register_activation_hook, run()
│   ├── includes/
│   │   ├── Plugin.php           Câblage DI, migrations, routes
│   │   ├── Api/                 Controllers REST (SejourController, AdminController…)
│   │   ├── Service/             Logique métier (FactureService, SejourService…)
│   │   ├── Repository/          Accès MySQL via $wpdb
│   │   ├── Db/                  Migrations idempotentes (Migration100, 201…)
│   │   └── Utils/               Exceptions, helpers
│   ├── frontend/
│   │   ├── src/                 Sources React/TypeScript
│   │   ├── build/               Artefacts Vite compilés (servis par WordPress)
│   │   ├── package.json
│   │   └── vite.config.ts       outDir → ./build
│   └── vendor/                  Dépendances Composer (DOMPDF, JWT…)
├── instructions/                Specs fonctionnelles + techniques + API + TODO
├── maquettes/                   Maquettes HTML interactives
├── e2e-tests/                   Tests Playwright (auth + workflows)
└── dev-frontend.sh              Raccourci : lance le frontend en mode mocké
```

---

## Environnement local (Docker)

### Prérequis
- [Docker Desktop](https://docs.docker.com/get-docker/) (inclut Docker Compose v2)
- Node 20+ via [fnm](https://github.com/Schniz/fnm) — pour le build et les tests frontend uniquement

### Démarrer la stack

```bash
# Cloner le dépôt puis :
docker compose up -d
```

Cela lance deux conteneurs :

| Conteneur | Image | Accès |
|---|---|---|
| `locagest-wp` | WordPress 6.7 + PHP 8.2 + Apache | [http://localhost:8080](http://localhost:8080) |
| `locagest-db` | MariaDB 10.11 | `localhost:3306` |

Au premier démarrage, WordPress s'installe automatiquement. Le plugin LocaGest est monté en direct depuis `./plugin/` — toute modification PHP est visible immédiatement sans redémarrage.

### Variables d'environnement

Copier `.env.example` en `.env` à la racine du projet et ajuster si besoin :

```bash
cp .env.example .env          # les valeurs par défaut conviennent pour le dev
```

Les variables disponibles :

| Variable | Défaut | Description |
|---|---|---|
| `MYSQL_ROOT_PASSWORD` | `root` | Mot de passe root MariaDB |
| `MYSQL_DATABASE` | `locagest_wp` | Nom de la base |
| `MYSQL_USER` | `locagest` | Utilisateur applicatif |
| `MYSQL_PASSWORD` | `locagest` | Mot de passe applicatif |
| `LOCAGEST_JWT_SECRET` | `dev-secret-key-changeme` | **Changer en production** |

### Build du frontend

Le frontend React est servi par WordPress via les artefacts compilés dans `plugin/frontend/build/`. Après chaque modification des sources :

```bash
cd plugin/frontend
fnm use 20
npm install          # première fois uniquement
npm run build        # → plugin/frontend/build/ (lu immédiatement par le conteneur)
```

Pas de redémarrage Docker nécessaire — le volume monte `./plugin/` en direct.

### Tests backend (PHP)

Les tests PHPUnit s'exécutent dans le conteneur WordPress :

```bash
# Tests unitaires
docker compose exec wordpress phpunit --testdox --testsuite=Unit

# Tests d'intégration
docker compose exec wordpress phpunit --testdox --testsuite=Integration
```

### Commandes Docker utiles

```bash
docker compose up -d          # démarrer la stack
docker compose down           # arrêter (données conservées dans les volumes)
docker compose down -v        # arrêter + supprimer les volumes (reset complet)
docker compose logs -f        # suivre les logs de tous les conteneurs
docker compose logs -f wordpress   # logs WordPress/Apache uniquement
docker compose exec wordpress bash # shell dans le conteneur WordPress
docker compose exec db mariadb -u locagest -plocagest locagest_wp  # console SQL
```

---

## Installation en production

### Prérequis
- WordPress 6.x avec PHP 8.2+
- MySQL 8 ou MariaDB 10.6+
- Composer (pour les dépendances PHP)
- Node 20+ (pour le build frontend — à faire en amont, pas sur le serveur)

### Déployer le plugin

```bash
# 1. Construire le frontend en local
cd plugin/frontend && npm run build

# 2. Copier le répertoire plugin/ dans wp-content/plugins/locagest/
cp -r plugin/ /path/to/wordpress/wp-content/plugins/locagest/

# 3. Installer les dépendances PHP (sans les dépendances de dev)
cd /path/to/wordpress/wp-content/plugins/locagest/
composer install --no-dev --optimize-autoloader

# 4. Activer le plugin dans WordPress Admin → Extensions
```

L'activation crée automatiquement :
- Les tables `{wp_}locagest_*` (migrations idempotentes via `dbDelta()`)
- Les 4 rôles WordPress : `locagest_gardien`, `locagest_resp_location`, `locagest_tresorier`, `locagest_administrateur`
- Les données de configuration par défaut (tarifs énergie, taxe de séjour, etc.)

Les migrations s'appliquent aussi automatiquement à chaque mise à jour du plugin (comparaison `locagest_db_version` en base).

---

## Développement frontend

Le frontend React tourne indépendamment grâce à **MSW** (Mock Service Worker) qui intercepte tous les appels API avec des données fictives.

**Prérequis :** Node 20 (le projet utilise [fnm](https://github.com/Schniz/fnm))

```bash
# Installer fnm (si pas déjà fait)
curl -fsSL https://fnm.vercel.app/install | bash
fnm install 20

# Raccourci — lance le frontend en mode mocké
./dev-frontend.sh           # http://localhost:5173

# Ou manuellement
cd plugin/frontend
fnm use 20
npm install
cp .env.example .env.local
npm run dev
```

**Comptes de test (mode dev) :**

| Email | Mot de passe | Interface |
|---|---|---|
| `gardien@test.fr` | `test` | Gardien (mobile G1→G6) |
| `resp@test.fr` | `test` | Responsable location (desktop) |
| `tresorier@test.fr` | `test` | Trésorier (desktop) |

**Tests :**
```bash
cd plugin/frontend
npm test              # watch mode
npm test -- --run     # run unique (CI)
npm run coverage      # rapport de couverture
```

---

## Règles qualité — Tests (obligatoires à chaque PR)

| Règle | Détail |
|---|---|
| **Happy path obligatoire** | Tout nouveau code (frontend, backend, intégration, unitaire) doit être couvert par au moins un test du cas nominal. C'est un critère de fusion — une PR sans test du happy path ne peut pas être mergée. |
| **Couverture minimale : 80 %** | Valable pour toutes les couches : TU backend (PHPUnit), TI backend (WP_UnitTestCase), TU frontend (Vitest/RTL), E2E (Playwright). |

> Ces règles sont détaillées dans [`instructions/specs-techniques-wordpress.md`](instructions/specs-techniques-wordpress.md) § Tests.

**Build de production :**
```bash
cd plugin/frontend
npm run build         # → plugin/frontend/build/ (lu par Plugin.php)
```

---

## Rôles et accès

| Rôle WordPress | Accès |
|---|---|
| `locagest_gardien` | Saisie séjour en cours (horaires, personnes, suppléments, encaissement) |
| `locagest_resp_location` | Création séjours, liste complète, renvoi factures |
| `locagest_tresorier` | Tout + administration (tarifs, catalogue, config) |
| `locagest_administrateur` | Tout |

---

## API REST

Base : `/wp-json/locagest/v1/`

Authentification : header `Authorization: Bearer <jwt>` (JWT généré à la connexion WordPress, injecté via `wp_localize_script`).

Voir [`instructions/api.md`](instructions/api.md) pour la liste complète des endpoints.
