# Specs techniques — LocaGest (WordPress Plugin)

## Stack technique

| Composant | Choix | Justification |
|---|---|---|
| Plateforme | **WordPress 6.x** | Hébergement mutualisé simple, familier pour l'association, déploiement sans infrastructure AWS |
| Langage backend | **PHP 8.2+** | Exigé par WordPress, support natif types union, fibers, attributs |
| Base de données | **MySQL 8 / MariaDB 10.6+** | Fourni par WordPress, ACID sur InnoDB |
| Migrations | **dbDelta() WordPress** | Fonction native WP pour les CREATE/ALTER TABLE idempotents |
| PDF | **DOMPDF 2.x** | Génération PDF depuis HTML/CSS côté PHP, charte UCJG Salm |
| Stockage fichiers | **WordPress Uploads** (`wp-content/uploads/locagest/`) | PDFs factures + photos chèques, URLs signées via token temporaire |
| Email | **wp_mail() + PHPMailer** | Natif WordPress, SMTP configurable via plugin tiers |
| Auth | **WordPress Roles & Capabilities + JWT** | Rôles personnalisés, JWT via `firebase/php-jwt` pour l'API REST |
| API | **WordPress REST API** (`/wp-json/locagest/v1/`) | Standard WP, routing natif, middleware auth |
| Dépendances | **Composer** | Gestion des dépendances PHP (DOMPDF, JWT, PHPUnit…) |
| Tests | **PHPUnit 11 + WP_Mock** | Tests unitaires et intégration WordPress |

---

## Modèle de données (MySQL)

### Préfixe des tables

Toutes les tables utilisent le préfixe WordPress (`$wpdb->prefix`) suivi de `locagest_` :
`{$wpdb->prefix}locagest_config_site`, `{$wpdb->prefix}locagest_sejour`, etc.

### Tables principales

```
locagest_config_site          Clé-valeur : tarifs énergie, taxe, IBAN, délais, email resp.
locagest_tarif_personne       Catégories de prix/personne/nuit (gérés par le Trésorier)
locagest_config_item          Items facturables du catalogue (casse, locations, services)
locagest_locataire            Profil locataire (upsert par email)
locagest_sejour               Séjour — entité centrale
locagest_sejour_categorie     Catégories de personnes appliquées à un séjour (avec snapshot des prix)
locagest_ligne_sejour         Lignes de facture (HEBERGEMENT, ENERGIE, TAXE, SUPPLEMENT, LIBRE)
locagest_facture              Facture générée (1 par séjour)
locagest_paiement             Paiements encaissés (N par séjour)
locagest_facture_sequence     Numérotation FAC-YYYY-NNN atomique par année
```

### Règle d'or — snapshots

Lors de la création d'un séjour, les champs `nom_snapshot` et `prix_nuit_snapshot` sont **copiés** depuis `locagest_tarif_personne` dans `locagest_sejour_categorie`. Si le Trésorier modifie un tarif ultérieurement, les factures existantes ne sont **jamais affectées**.

> ⚠️ **Ne jamais rejoindre `locagest_tarif_personne` pour calculer une facture — toujours lire les snapshots.**

### Migrations avec dbDelta()

```php
// Déclenchées à l'activation du plugin via register_activation_hook()
// et lors des mises à jour via la variable d'option locagest_db_version

// fichiers dans includes/db/
// migration-1.0.0.php    Schéma complet + données initiales
// migration-1.1.0.php    Contrainte UNIQUE email + index FULLTEXT recherche
```

Les migrations sont idempotentes : `dbDelta()` crée ou met à jour les tables sans supprimer les données existantes. Jamais de modification manuelle en base de production — tout changement passe par un fichier de migration versionné.

---

## Authentification et rôles

### Rôles WordPress personnalisés

Créés à l'activation du plugin, supprimés à la désactivation :

| Rôle WordPress | Correspondance métier |
|---|---|
| `locagest_gardien` | Gardien |
| `locagest_resp_location` | Responsable location |
| `locagest_tresorier` | Trésorier |
| `locagest_administrateur` | Administrateur |

Un utilisateur WordPress peut avoir plusieurs rôles LocaGest (ex: trésorier + gardien).

### Auth de l'API REST

- **JWT stateless** via `firebase/php-jwt` : le frontend obtient un token via `POST /wp-json/locagest/v1/auth/token`
- Token signé avec la `AUTH_KEY` de `wp-config.php`, durée de vie configurable (défaut : 24h)
- Chaque requête REST porte le header `Authorization: Bearer <token>`
- Vérification du rôle dans chaque `permission_callback` des routes REST

---

## Structure du projet (plugin WordPress)

```
wp-content/plugins/locagest/
├── locagest.php                              Fichier principal (en-tête plugin, bootstrap)
├── composer.json                             Dépendances PHP (dompdf, jwt, phpunit...)
├── composer.lock
├── vendor/                                   Dépendances (gitignored sauf si build packagé)
├── includes/
│   ├── class-locagest-plugin.php             Bootstrap : hooks, init, activation/désactivation
│   ├── api/
│   │   ├── class-locagest-auth-controller.php     POST /auth/token
│   │   ├── class-locagest-sejour-controller.php   Routes séjours, lignes, factures, paiements
│   │   └── class-locagest-admin-controller.php    Routes admin : tarifs, items, config
│   ├── domain/
│   │   ├── class-locagest-sejour.php
│   │   ├── class-locagest-sejour-categorie.php    Tarif appliqué (avec snapshots)
│   │   ├── class-locagest-ligne-sejour.php
│   │   ├── class-locagest-facture.php
│   │   ├── class-locagest-paiement.php
│   │   ├── class-locagest-tarif-personne.php
│   │   ├── class-locagest-config-item.php
│   │   ├── class-locagest-locataire.php
│   │   └── enums/                                 StatutSejour, TypeLigne, StatutLigne, ...
│   ├── repository/
│   │   ├── class-locagest-sejour-repository.php
│   │   ├── class-locagest-sejour-categorie-repository.php
│   │   ├── class-locagest-ligne-sejour-repository.php   Inclut promouvoir() et delete_by_type()
│   │   ├── class-locagest-facture-repository.php        Inclut next_numero() atomique
│   │   ├── class-locagest-locataire-repository.php      Inclut upsert_by_email()
│   │   └── class-locagest-config-repositories.php       ConfigSiteRepo + TarifPersonneRepo + ConfigItemRepo
│   ├── service/
│   │   ├── class-locagest-facture-calcul-service.php    ⭐ Toute la logique de calcul
│   │   ├── class-locagest-facture-service.php           Orchestration génération + PDF + uploads + email
│   │   ├── class-locagest-sejour-service.php            Création séjour + snapshot catégories
│   │   ├── class-locagest-config-item-service.php       CRUD catalogue + promotion LIBRE→catalogue
│   │   ├── class-locagest-paiement-service.php          Encaissement + photo upload + marquage PAYEE
│   │   ├── class-locagest-pdf-service.php               Génération PDF avec DOMPDF (charte UCJG)
│   │   ├── class-locagest-file-service.php              Upload PDF/photos, URLs temporaires signées
│   │   └── class-locagest-email-service.php             Envoi wp_mail() avec PDF en PJ
│   ├── db/
│   │   ├── migration-1.0.0.php                          Schéma complet + données initiales
│   │   └── migration-1.1.0.php                          Contrainte UNIQUE email + index FULLTEXT
│   └── utils/
│       └── class-locagest-exception-handler.php         Mapping exceptions → WP_Error JSON
└── tests/
    └── unit/
        └── FactureCalculServiceTest.php                 PHPUnit — logique de calcul
```

---

## Standard de code DATABASE

- SQL préparé via `$wpdb->prepare()` : **jamais d'interpolation directe** dans les requêtes (prévention injection SQL)
- Transactions MySQL (`$wpdb->query('START TRANSACTION')`) pour les opérations critiques : création séjour + snapshot, génération facture + numéro + PDF + email
- Indexation appropriée : `FULLTEXT` sur `locataire.email` et `nom` pour la recherche rapide ; index sur `sejour_id` dans `ligne_sejour` pour les calculs
- Contraintes d'intégrité : `UNIQUE(email)` sur `locataire`, `CHECK (prix_total >= 0)` sur `ligne_sejour`, `FOREIGN KEY` pour les liaisons
- Séparation claire entre données de configuration (tarifs, items) et données transactionnelles (séjours, factures, paiements)
- Toujours utiliser `dbDelta()` pour les migrations, jamais de DDL manuel sur la production

---

## Standard de code BACKEND

### Architecture

Architecture en couches, séparation claire des responsabilités :

- **Controllers** (`api/`) : enregistrement des routes REST (`register_rest_route()`), validation des requêtes, orchestration des services, `permission_callback` par rôle
- **Services** (`service/`) : logique métier, calculs, intégrations (PDF, uploads, email)
- **Repositories** (`repository/`) : accès aux données via `$wpdb`, méthodes spécifiques (`find_by_email()`, `delete_by_type()`, `next_numero()`)
- **Domain** (`domain/`) : objets métier (classes PHP typées), jamais de SQL direct
- **Utils** (`utils/`) : gestion globale des exceptions → `WP_Error`

### Logging

- Utiliser `error_log()` avec préfixe `[LocaGest]` en développement
- En production, logguer via un hook WordPress ou un service dédié (ex: WC_Logger style)
- Jamais de `var_dump()` ou `print_r()` laissés dans le code livré
- Niveau de log explicite dans le message : `[INFO]`, `[ERROR]`, `[DEBUG]`

### API REST WordPress

- Routes versionnées : namespace `locagest/v1` (`/wp-json/locagest/v1/...`)
- Correspondance avec l'API Java existante (mêmes routes, même contrat JSON) — voir `api.md`
- Méthodes HTTP appropriées (GET, POST, PUT, PATCH, DELETE)
- Statuts HTTP corrects : 200, 201, 204, 400, 401, 403, 404, 409, 500
  - 409 CONFLICT pour recalcul d'une facture `EMISE` ou `PAYEE`
  - 403 Forbidden pour accès rôle insuffisant
  - 401 Unauthorized pour token absent ou expiré
- `permission_callback` obligatoire sur **toutes** les routes (jamais `'__return_true'` sur des routes sensibles)
- Les réponses sont toujours `WP_REST_Response` avec corps JSON ; les erreurs utilisent `WP_Error`
- Validation des paramètres dans le `args` de `register_rest_route()` (type, required, sanitize_callback, validate_callback)

### Nommage PHP (PSR-12 + conventions WordPress)

- `snake_case` pour fonctions, variables, méthodes, noms de fichiers
- `PascalCase` pour les noms de classes
- `UPPER_SNAKE_CASE` pour les constantes
- Préfixe `locagest_` sur toutes les fonctions globales, hooks, options, transients (évite les collisions avec d'autres plugins)
- Noms explicites : `calculate_total_with_tax()`, `find_by_email()`, `$sejour_repository`, `FactureCalculService`
- Enums PHP 8.1+ (`enum StatutSejour : string { case ACTIF = 'ACTIF'; ... }`)

### Commentaires

- PHPDoc pour toutes les méthodes publiques (controllers + services) : `@param`, `@return`, `@throws`
- Commentaires inline uniquement pour la logique métier complexe (le POURQUOI, pas le QUOI)
- Pas de commentaires évidents ni de séparateurs cosmétiques (`// ---`)
- Les regex doivent être commentées : but, cas couverts, exemples input/output

### Gestion des exceptions et erreurs

- Classes d'exception personnalisées dans `includes/utils/exceptions/` :
  `SejourNotFoundException`, `InvalidInputException`, `UnauthorizedAccessException`, `FactureGenerationException`, `ImmuabiliteFactureException`
- `class-locagest-exception-handler.php` mappe les exceptions en `WP_Error` avec code HTTP approprié et message compréhensible
- Messages d'erreur utilisateur précis : "Le séjour #123 n'existe pas", "La date de fin doit être après la date de début"
- Erreurs inattendues : message générique vers l'utilisateur + log détaillé côté serveur
- Règle d'or d'immuabilité : toute tentative de modification d'une facture `EMISE` ou `PAYEE` lève `ImmuabiliteFactureException` → 409

### Tests

#### Unitaires (PHPUnit 11)

- `WP_Mock` pour mocker les fonctions WordPress sans charger le core complet
- Tests ciblés sur la logique métier pure (ex: `FactureCalculServiceTest`)
- Couverture minimale : **80% en TU**
- Cas nominaux + cas d'erreur + règles d'immuabilité

#### Intégration (WP_UnitTestCase)

- Tests avec une base WordPress de test (`WP_UnitTestCase` + fixtures SQL)
- Tests des routes REST avec `WP_REST_Request` / `WP_REST_Server`
- Couverture minimale : **70% en TI**
  - Tous les cas d'usage "heureux" (création séjour → génération facture → encaissement)
  - Erreurs courantes (saisie incorrecte, rôle insuffisant)

---

## Standard de code FRONTEND

> **Choix retenu : React SPA** — le frontend React existant consomme l'API REST WordPress (`/wp-json/locagest/v1/`). Seul l'auth change : JWT WordPress (`firebase/php-jwt`) au lieu d'AWS Cognito. Les changements frontend sont limités à la couche d'authentification et aux URLs d'API.

Les règles suivantes s'appliquent :

- React fonctionnel avec hooks, pas de classes
- Structure de projet claire (`components/`, `services/`, `utils/`, ...)
- Design "mobile-first", responsive, avec les maquettes HTML comme référence
- Gestion des erreurs utilisateur avec messages clairs et feedbacks visuels
- Formulaire : indiquer les champs obligatoires (astérisque ou message d'erreur + cadre rouge si invalide)
- Tests unitaires avec Vitest + React Testing Library pour les composants critiques
- Tests end-to-end avec Playwright dans `/e2e-tests/`
- Accessibilité : labels sur les champs, contrastes, navigation clavier
- Vérifier systématiquement la cohérence des noms et formats entre frontend et API REST

#### Couverture des tests frontend
- Au moins **90% en TU**
- Les tests E2E couvrent au minimum les cas d'usage "heureux"

---

## Configuration et variables d'environnement

Contrairement à la version Lambda, la config est stockée dans `wp-config.php` ou via des constantes définies dans le fichier principal du plugin :

```php
// wp-config.php (ou .env via un plugin comme WP Dotenv)
define('LOCAGEST_JWT_SECRET', 'clé secrète distincte de AUTH_KEY');
define('LOCAGEST_SES_FROM', 'noreply@ucjgsalm.org');  // ou via wp_mail settings
define('LOCAGEST_PDF_DIR', WP_CONTENT_DIR . '/uploads/locagest/factures/');
define('LOCAGEST_CHEQUE_DIR', WP_CONTENT_DIR . '/uploads/locagest/cheques/');
```

La table `locagest_config_site` (clé-valeur en base) stocke les paramètres métier modifiables par le trésorier (tarifs énergie, IBAN, délais, email resp.).

---

## Décisions d'architecture

### Pourquoi WordPress ?

Hébergement mutualisé simple et économique, familier pour l'association. Pas besoin d'AWS Lambda + Aurora Serverless : un hébergeur standard avec PHP 8.2 et MySQL suffit. Le plugin expose une API REST standard, compatible avec le frontend React existant.

### Pourquoi MySQL plutôt que PostgreSQL ?

WordPress impose MySQL/MariaDB. Les agrégats multi-tarifs (prix moyen pondéré, minimum global) restent faisables en MySQL avec des GROUP BY et des sous-requêtes. L'absence de `RETURNING` en MySQL est compensée par `$wpdb->insert_id`.

### Pourquoi DOMPDF pour les PDFs ?

Bibliothèque PHP pure, sans dépendance système, installable via Composer. Génération depuis un template HTML/CSS, ce qui simplifie la mise en page avec la charte UCJG Salm.
