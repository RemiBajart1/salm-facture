# Specs techniques — LocaGest

## Stack technique

| Composant | Choix | Justification |
|---|---|---|
| Runtime | **Java 25 LTS + Lambda SnapStart** | Démarrage à froid < 1s, coût à l'usage |
| Framework | **Micronaut 4.6.2** | AOT natif, injection sans réflexion, idéal SnapStart |
| Base de données | **Aurora PostgreSQL 16 Serverless v2** | SQL classique, ACID, calculs d'agrégats, scale-to-zero |
| Connexions | **RDS Proxy** | Pool mutualisé pour les Lambdas éphémères |
| Migrations | **Flyway** | Versioning schema, déclenchée au déploiement |
| PDF | **Apache PDFBox 3** | Génération PDF côté Lambda, charte UCJG Salm |
| Stockage fichiers | **S3** (`locagest-docs`) | PDFs factures + photos chèques, URLs présignées 15 min |
| Email | **AWS SES** | Envoi facture PDF + copie resp. location |
| Auth | **Cognito + JWT** | JWKS validé par API Gateway |
| Build | **Gradle 9.4.0 + Shadow JAR** | Fat JAR pour déploiement Lambda |

---

## Modèle de données (Aurora PostgreSQL)

### Tables principales

```
config_site          Clé-valeur : tarifs énergie, taxe, IBAN, délais, email resp.
tarif_personne       Catégories de prix/personne/nuit (gérés par le Trésorier)
config_item          Items facturables du catalogue (casse, locations, services)
locataire            Profil locataire (upsert par email)
sejour               Séjour — entité centrale
sejour_categorie     Catégories de personnes appliquées à un séjour (avec snapshot des prix)
ligne_sejour         Lignes de facture (HEBERGEMENT, ENERGIE, TAXE, SUPPLEMENT, LIBRE)
facture              Facture générée (1 par séjour)
paiement             Paiements encaissés (N par séjour)
facture_sequence     Numérotation FAC-YYYY-NNN atomique par année
```

### Règle d'or — snapshots

Lors de la création d'un séjour, les champs `nom_snapshot` et `prix_nuit_snapshot` sont **copiés** depuis `tarif_personne` dans `sejour_categorie`. Si le Trésorier modifie un tarif ultérieurement, les factures existantes ne sont **jamais affectées**.

> ⚠️ **Ne jamais rejoindre `tarif_personne` pour calculer une facture — toujours lire les snapshots.**

### Migrations Flyway

```
V1__initial_schema.sql          Schéma complet + données initiales
V2__locataire_email_unique.sql  Contrainte UNIQUE email + index GIN recherche
```

---

## Structure du projet backend

```
locagest-backend/
├── build.gradle
├── src/
│   ├── main/
│   │   ├── java/org/ucjgsalm/locagest/
│   │   │   ├── controller/
│   │   │   │   ├── SejourController.java      Routes séjours, lignes, factures, paiements
│   │   │   │   └── AdminController.java       Routes admin : tarifs, items, config, promotion LIBRE
│   │   │   ├── domain/
│   │   │   │   ├── Sejour.java
│   │   │   │   ├── SejourCategorie.java       Tarif appliqué à un séjour (avec snapshots)
│   │   │   │   ├── LigneSejour.java
│   │   │   │   ├── Facture.java
│   │   │   │   ├── Paiement.java
│   │   │   │   ├── TarifPersonne.java
│   │   │   │   ├── ConfigItem.java
│   │   │   │   ├── Locataire.java
│   │   │   │   └── enums/                     StatutSejour, TypeLigne, StatutLigne, ...
│   │   │   ├── dto/
│   │   │   │   └── Dtos.java                  Tous les records request/response
│   │   │   ├── repository/
│   │   │   │   ├── SejourRepository.java
│   │   │   │   ├── SejourCategorieRepository.java
│   │   │   │   ├── LigneSejourRepository.java  Inclut promouvoir() et deleteByType()
│   │   │   │   ├── FactureRepository.java       Inclut nextNumero() atomique
│   │   │   │   ├── LocataireRepository.java     Inclut upsertByEmail()
│   │   │   │   └── ConfigRepositories.java      ConfigSiteRepo + TarifPersonneRepo + ConfigItemRepo
│   │   │   ├── service/
│   │   │   │   ├── FactureCalculService.java   ⭐ Toute la logique de calcul
│   │   │   │   ├── FactureService.java         Orchestration génération + PDF + S3 + SES
│   │   │   │   ├── SejourService.java          Création séjour + snapshot catégories
│   │   │   │   ├── ConfigItemService.java      CRUD catalogue + promotion LIBRE→catalogue
│   │   │   │   ├── PaiementService.java        Encaissement + photo S3 + marquage PAYEE
│   │   │   │   ├── PdfService.java             Génération PDF avec PDFBox (charte UCJG)
│   │   │   │   ├── S3Service.java              Upload PDF/photos + URLs présignées
│   │   │   │   └── EmailService.java           Envoi SES multipart avec PDF en PJ
│   │   │   └── util/
│   │   │       ├── AwsClientFactory.java       Beans S3Client, S3Presigner, SesClient
│   │   │       └── GlobalExceptionHandler.java Mapping exceptions → JSON propre
│   │   └── resources/
│   │       ├── application.yml
│   │       └── db/migration/
│   │           ├── V1__initial_schema.sql
│   │           └── V2__locataire_email_unique.sql
│   └── test/
│       └── java/org/ucjgsalm/locagest/service/
│           └── FactureCalculServiceTest.java   15 tests unitaires (JUnit 5 + AssertJ)
```

## Standard de code DATABASE          
- SQL clair et formaté, avec des commentaires pour les requêtes complexes
- Utilisation de transactions pour les opérations critiques (ex: création séjour + snapshot, génération facture + numéro + PDF + S3 + SES)
- Indexation appropriée (ex: index GIN sur `locataire.email` pour recherche rapide, index sur `sejour.id` dans `ligne_sejour` pour calculs)
- Contraintes d'intégrité (ex: `UNIQUE(email)` sur `locataire`, `CHECK` sur `ligne_sejour.prix_total >= 0`, `FOREIGN KEY` pour liaisons entre tables)
  - Séparation claire entre les données de configuration (tarifs, items) et les données de transaction (séjours, factures, paiements)   
Utilisation de Flyway pour versionner les migrations, avec des scripts idempotents et testés en local avant déploiement. 
  - Jamais de modifications manuelles en production — tout changement doit passer par une migration versionnée.

## Standard de code BACKEND

### Architecture
Architecture classique en couches, séparation claire des responsabilités :
- **Controllers** : validation des requêtes, orchestration des services, gestion des statuts HTTP
- **Services** : logique métier, calculs, intégrations (PDF, S3, SES)
- **Repositories** : accès aux données, méthodes spécifiques (ex: `findByEmail()`, `deleteByType()`, `nextNumero()`)
- **DTOs** : tous les échanges API utilisent des DTOs (records), jamais des entités JPA
- **Utils** : clients AWS, gestion globale des exceptions

### Logging
Toutes les actions doivent être loggées avec un niveau approprié (INFO, DEBUG, ERROR) et des messages clairs.
On utilise le logger de Micronaut via une annotation lombok (`@Slf4j`), jamais `System.out.println()`.

### API
API RESTful, routes versionnées (`/api/v1/...`), 
verbes HTTP appropriés (GET, POST, PUT, DELETE), 
statuts HTTP corrects (200, 201, 204, 400, 404, 409, 500...),
- 202 si traitement asynchrone (ex: génération facture + PDF +S3 + SES)
- Propose tout autre code d'état pertinent selon les cas (ex: 403 Forbidden pour accès non autorisé, 401 Unauthorized pour utilisateur non authentifié)
validation des requêtes (Bean Validation + contrôles métier dans les services).
Les retours des controllers sont des DTOs, jamais des entités JPA.
L'API renvoie typiquement du JSON


### Lombok
- lombok dès que possible pour éviter boilerplate getters/setters/constructeurs
- @Data, @Builder/SuperBuilder, @RequiredArgsConstructor, @AllArgsConstructor selon les besoins
- Ne pas utiliser @UtilityClass (problèmes avec l'injection de dépendances dans les services utilitaires) : mettre un constructeur privé et des méthodes statiques à la place


### Nommage
Utilise des records dès que possible pour les Dtos et modèles.
- `camelCase` pour variables, méthodes, packages
- `PascalCase` pour classes, interfaces, enums
- Noms explicites : `calculateTotalWithTax()`, `findByEmail()`, `sejourRepository`, `ConfigItemService`
- Pas de préfixes/suffixes redondants : pas de `get`/`set` pour les services, pas de `is` pour les boolean (ex: `isPayee` → `payee`)
- Enums : `StatutSejour.ACTIF`, `TypeLigne.ENERGIE`

- 
### Commentaires
- Javadoc pour toutes les méthodes publiques (controllers + services)
- Commentaires inline pour toute logique métier complexe
- Pas de commentaires évidents (ex: `// Incrémente le compteur de 1`)
- Pas de "mise en forme" de code avec des commentaires (ex: `// ---` pour séparer les sections) 
- Les regex éventuelles doivent être commentées pour expliquer leur but et les cas couverts, avec exemples d'inputs/outputs
      
### Gestion des exceptions et erreurs
- Utilisation de classes d'exception personnalisées (ex: `SejourNotFoundException`, `InvalidInputException`, `UnauthorizedAccessException`)
- GlobalExceptionHandler pour mapper les exceptions à des réponses JSON claires avec des messages d'erreur compréhensibles pour l'utilisateur (ex: "Le séjour avec l'ID 123 n'existe pas", "Le nombre de personnes doit être supérieur à 0", "Vous n'avez pas les droits pour accéder à cette ressource")
- Validation des entrées utilisateur avec des messages d'erreur précis (ex: "Le champ 'email' doit être une adresse email valide", "Le champ 'dateFin' doit être après 'dateDebut'")
- Gestion des erreurs inattendues avec un message générique ("Une erreur est survenue, veuillez réessayer plus tard") et un log détaillé côté serveur pour le débogage
- Gestion des erreurs de droits d'accès avec des statuts HTTP appropriés (403 Forbidden pour les utilisateurs authentifiés mais non autorisés, 401 Unauthorized pour les utilisateurs non authentifiés)
- Dès que possible utilise des exceptions spécifiques plutôt que des `RuntimeException` génériques, pour faciliter le debugging et la compréhension du code (ex: `FactureGenerationException` au lieu de `RuntimeException` dans `FactureService`)

### Tests
#### Unitaires
- JUnit 5 + AssertJ
- Tests ciblés sur la logique métier pure (ex: `FactureCalculServiceTest`)
- La couverture de code doit être au moins de 80%  en TU
- 
#### Intégration
- Tests d'intégration avec une base de données en mémoire (ex: H2) pour valider les interactions entre services et repositories
- Tests d'API avec un client HTTP (ex: RestAssured) pour valider les routes, la validation, les statuts HTTP
- La couverture de code doit être au moins de 70% en TI : 
  - TOUS les cas d'usage "heureux" (ex: création séjour → génération facture → encaissement paiement)
  - Les erreurs les plus courantes (saisie incorrecte)
  - Les erreurs de droits (ex: utilisateur non admin essayant d'accéder à une route admin)

## Standard de code FRONTEND
- React fonctionnel avec hooks, pas de classes
- Structure de projet claire (components/, services/, utils/, ...)
- Utilisation d'Amplify pour l'authentification et les appels API
- Design "mobile-first", responsive, avec les maquettes HTML comme référence
- Gestion des erreurs utilisateur avec des messages clairs et des feedbacks visuels
- Tests unitaires avec Jest + React Testing Library pour les composants critiques (ex: formulaire de création de séjour, affichage de facture)
- Tests end-to-end avec Cypress pour les scénarios principaux (ex: création séjour → génération facture → encaissement paiement)

Les erreurs doivent apparaitre clairement si l'utilisateur peut y faire queqleuchose. Si c'est une erreur technique (ex: échec de l'appel API), un message générique doit être affiché ("Une erreur est survenue, veuillez réessayer plus tard") et le détail de l'erreur doit être loggé côté client pour le debugging (ex: `console.error(error)`).

### Couverture des tests : 
- Au moins 90% de couverture en TU
- Les tests E2E doivent couvrir au minimum les cas d'usage "heureux" (ex: création séjour → génération facture → encaissement paiement)
- Si possible, couvrir aussi les cas d'erreur côté client (ex: saisie incorrecte, échec de l'appel API) avec des tests unitaires et/ou E2E
                                                                                                                                                 

# Design decisions
### Pourquoi SQL plutôt que nosql/DynamoDB ?

Le modèle multi-tarifs rend DynamoDB inconfortable : calculer un prix moyen pondéré sur N catégories, gérer le minimum global, produire des agrégats annuels — tout ça se fait naturellement en SQL. Aurora Serverless v2 scale-to-zero entre les séjours (usage ~1/semaine), le coût est comparable.

