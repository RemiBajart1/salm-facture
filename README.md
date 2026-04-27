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

## Installation

### Prérequis
- WordPress 6.x avec PHP 8.2+
- MySQL 8 ou MariaDB 10.6+
- Composer (pour les dépendances PHP)
- Node 20+ (pour le développement frontend uniquement)

### Déploiement du plugin
```bash
# 1. Copier le répertoire plugin/ dans wp-content/plugins/locagest/
cp -r plugin/ /path/to/wordpress/wp-content/plugins/locagest/

# 2. Installer les dépendances PHP
cd /path/to/wordpress/wp-content/plugins/locagest/
composer install --no-dev

# 3. Activer le plugin dans WordPress Admin → Extensions
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
