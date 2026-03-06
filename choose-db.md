# Analyse Base de Données : Aurora vs SQLite/S3 vs DynamoDB

## Question
Quels seraient les avantages/inconvénients de passer sur SQLite (sur S3) ou DynamoDB ?
Critères : coûts, administration, complexité, backups, architecture

## Synthèse Executive

Analyse nuancée au regard du profil exact de LocaGest : petite asso, volume très faible, Lambda, SQL complexe.

## Contexte LocaGest

LocaGest a des besoins particuliers qui pèsent lourd dans l'analyse :

- **Transactions ACID critiques** : numéro de facture séquentiel + lignes + facture en une seule transaction
- **SQL complexe** : JOINs, agrégats, GENERATED ALWAYS AS STORED, types ENUM PostgreSQL
- **Infrastructure** : Flyway pour les migrations
- **Concurrence Lambda** : plusieurs invocations simultanées
- **Volume très faible** : dizaines de séjours par an

## Comparatif Détaillé

### 1. Coûts

| Critère | Aurora Serverless v2 (actuel) | SQLite sur S3 | DynamoDB |
|---------|-------------------------------|---------------|----------|
| **Estimation mensuelle** | ~50-60 €/mois (0.5 ACU min × 0.12$/h + RDS Proxy) | ~0 € | ~0-1 € |
| **Scale-to-zero** | Partiel (Aurora v2 scale-to-zero récent, pas encore mûr) | Oui | Oui, natif |
| **Surprises coûts** | Peut monter si ACU scale up | Coût réseau S3 si gros fichier | Coût sur GSI + scans si mal modélisé |
| **Verdict** | ❌ Sur-dimensionné pour une asso | ✅ Gratuit | ✅ Quasi-gratuit |

**Constat critique** : Aurora Serverless v2 coûte ~600 €/an pour un usage de quelques dizaines de séjours. C'est le vrai point faible de l'architecture actuelle.

### 2. Administration

| Critère | Aurora v2 | SQLite/S3 | DynamoDB |
|---------|-----------|-----------|----------|
| **Mises à jour** | AWS gère tout | Aucune infra | AWS gère tout |
| **Connexions** | RDS Proxy obligatoire pour Lambda | Sans objet | HTTP natif, pas de pool |
| **Monitoring** | CloudWatch, Performance Insights | Rudimentaire | CloudWatch, métriques natives |
| **Migrations schema** | Flyway ✅ | Flyway ✅ | ❌ Pas de migration SQL — à gérer manuellement |
| **Verdict** | Lourd mais géré | Ultra-simple | Simple mais sans outillage SQL |

### 3. Complexité

| Critère | Aurora v2 | SQLite/S3 | DynamoDB |
|---------|-----------|-----------|----------|
| **Migration du code existant** | 0 (en place) | Faible (driver JDBC SQLite, schéma identique) | Très élevée — refonte complète du modèle de données |
| **Modèle de données** | SQL classique | SQL classique | NoSQL clé/valeur — plus de JOINs, plus de ENUMs |
| **Transactions ACID** | Natif PostgreSQL | Natif SQLite (1 writer) | Limité : TransactWriteItems max 100 items, cross-table complexe |
| **Numéro de facture séquentiel** | ON CONFLICT … counter+1 en SERIALIZABLE ✅ | BEGIN EXCLUSIVE ✅ | Atomic counter DynamoDB ✅ mais syntaxe différente |
| **Requêtes complexes** | SQL complet | SQL complet | Scan/GSI — les GROUP BY, JOIN n'existent pas |
| **Risque principal** | Aucun, ça marche | Race condition Lambda ⚠️ | Réécriture totale de tous les repositories |

**Le problème fondamental de SQLite/S3 avec Lambda** :

```
Lambda A démarre : télécharge sejour.db depuis S3
Lambda B démarre : télécharge sejour.db depuis S3
Lambda A écrit et re-upload → version 2
Lambda B écrit et re-upload → écrase la version 2 avec ses propres données
```

Chaque invocation Lambda concurrente télécharge le fichier, travaille localement, re-uploade. Sans verrou distribué (lui-même complexe à implémenter, typiquement via DynamoDB Conditional Writes), c'est de la corruption de données garantie en cas de concurrence.

**Contournements possibles** : Lambda réservée (1 invocation max, jamais de parallélisme) + mode lecture seule entre invocations. Fonctionnel pour LocaGest si le déploiement est soigné, mais fragile.

### 4. Backups

| Critère | Aurora v2 | SQLite/S3 | DynamoDB |
|---------|-----------|-----------|----------|
| **Point-in-time recovery** | ✅ 35 jours natif | Via S3 Versioning (manuel) | ✅ PITR natif (35 jours) |
| **Snapshot automatique** | ✅ Quotidien | ❌ À configurer (S3 lifecycle) | ✅ On-demand |
| **Restauration** | Interface AWS, rapide | Script de restauration manuel | Interface AWS |
| **Verdict** | Excellent | Basique mais suffisant pour ce volume | Excellent |

### 5. Architecture

| Aspect | Aurora v2 | SQLite/S3 | DynamoDB |
|--------|-----------|-----------|----------|
| **VPC requis** | ✅ Oui (Lambda dans le VPC) | ❌ Non (Lambda publique) | ❌ Non (API AWS directe) |
| **Cold start Lambda** | +100-500ms (connexion TCP) | +200-500ms (download S3) | +50ms (HTTP SDK) |
| **Idéal avec Lambda** | Oui mais VPC = cold start | Oui si concurrence = 1 | ✅ Architecturalement idéal |
| **Évolutivité** | Excellente | Nulle (SQLite = 1 writer) | Excellente |
| **SQL existant réutilisable** | 100% | ~95% (quelques ajustements) | 0% |

## Synthèse Comparative

| | SQLite/S3 | DynamoDB | Aurora v2 (actuel) |
|---|----------|----------|-------------------|
| **Coût** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐ |
| **Administration** | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **Complexité migra.** | ⭐⭐⭐ | ⭐ | ⭐⭐⭐ (déjà fait) |
| **Backups** | ⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ |
| **Architecture** | ⭐⭐ (*) | ⭐⭐⭐ | ⭐⭐ |
| **SQL / modèle** | ⭐⭐⭐ | ⭐ | ⭐⭐⭐ |

(*) si Lambda concurrency = 1

## Recommandation Concrète

Le vrai problème n'est pas le moteur de base de données, c'est le coût d'Aurora pour ce volume.

Deux alternatives pragmatiques à creuser :

1. **Rester PostgreSQL, réduire le coût** : basculer vers une instance RDS t4g.micro Single-AZ (~13 €/mois) avec arrêt programmé la nuit, ou explorer Neon (PostgreSQL serverless, free tier généreux). Aucune réécriture, Flyway reste, tout le SQL existant tourne.

2. **SQLite/S3 si concurrence garantie = 1** : pour une asso avec 3 utilisateurs occasionnels, une Lambda réservée (concurrency = 1) suffit. Coût nul, SQL identique, migration en 2h. Risque résiduel sur les uploads concurrents, mais gérable avec des précautions opérationnelles.

**DynamoDB n'est pas adapté** : le modèle de données relationnel de LocaGest (transactions ACID, JOINs, numérotation séquentielle) est exactement ce pour quoi SQL a été inventé. Passer à DynamoDB imposerait une réécriture totale pour un gain nul côté fonctionnel, avec des contraintes en plus.

---

## Analyse Approfondie : SQLite sur S3 — Risques et Mitigations

### Modèle de Base

À chaque invocation Lambda, le cycle est :

```
Lambda démarre
→ télécharge sejour.db depuis S3 (/tmp, max 10 GB)
→ ouvre la connexion SQLite locale
→ traite la requête (lectures + écritures locales)
→ re-uploade sejour.db vers S3
→ répond au client
```

C'est là que tout se complique.

### Risques en Détail

#### Risque 1 — Race condition sur les écritures (critique)

C'est le plus dangereux. Illustration concrète avec LocaGest :

```timeline
t=0ms   Lambda A reçoit POST /sejours/{id}/facture
t=1ms   Lambda B reçoit PATCH /sejours/{id}/personnes

        Lambda A télécharge sejour.db v1 depuis S3
        Lambda B télécharge sejour.db v1 depuis S3  ← même version !

t=200ms Lambda A génère FAC-2025-001, écrit dans sa copie locale
t=201ms Lambda B met à jour nb_reelles=42, écrit dans sa copie locale

t=500ms Lambda A re-uploade son sejour.db v2 → S3 contient FAC-2025-001
t=501ms Lambda B re-uploade son sejour.db v2 → S3 contient nb_reelles=42
        ↑ MAIS cette version ne contient PAS FAC-2025-001 !
```

**Résultat** : la facture générée par Lambda A a disparu. La sequence counter reste à 0.

**Impact** : le nextNumero() avec transaction SERIALIZABLE qui protège la séquence de factures ne protège plus rien — la garantie d'unicité est détruite dès qu'il y a deux invocations simultanées.

#### Risque 2 — Lectures périmées (stale reads)

Les Lambdas "chauds" (warm instances) gardent le fichier SQLite ouvert en mémoire entre les requêtes. Si Lambda A écrit et re-uploade, Lambda B continue à lire son ancienne version jusqu'à ce qu'elle re-télécharge.

```
Lambda A : crée un séjour → upload v2 → répond "séjour créé"
Lambda B : GET /sejours → lit sa copie locale v1 → répond "aucun séjour"

Client :
→ "Créer le séjour" → OK
→ "Voir les séjours" → liste vide 😕
```

**Contournement** : forcer un re-téléchargement à chaque requête élimine le problème mais ajoute 150–500ms de latence systématique.

#### Risque 3 — Corruption par crash entre écriture locale et upload S3

Lambda dispose de 15 minutes max d'exécution. Si elle crash, est throttlée, ou timeout après l'écriture SQLite locale mais avant le re-upload :

```
Lambda génère une facture, écrit dans /tmp/sejour.db
Lambda crashe (OOM, timeout, exception non catchée)
S3 contient toujours l'ancienne version sans la facture
→ Facture "créée" côté client mais n'existe pas en base
```

#### Risque 4 — Les fichiers WAL de SQLite

SQLite en mode WAL (Write-Ahead Log, recommandé pour les perfs) crée trois fichiers :

```
sejour.db        ← base principale
sejour.db-wal    ← journal des transactions en cours
sejour.db-shm    ← mémoire partagée du WAL
```

Ces trois fichiers doivent être uploadés/téléchargés de façon atomique. Si vous uploadez sejour.db mais pas sejour.db-wal, la base téléchargée par la prochaine Lambda sera corrompue.

**Solution** : checkpoint le WAL avant upload (`PRAGMA wal_checkpoint(TRUNCATE)`) pour tout intégrer dans le fichier principal. Ça marche, mais c'est une contrainte opérationnelle invisible qui peut être oubliée.

#### Risque 5 — Grossissement du fichier et latence croissante

**Aujourd'hui** : quelques dizaines de séjours → sejour.db ≃ 1-2 Mo → download en ~50ms.

**Dans 5 ans**, avec photos, PDF archivés, historique : 50-100 Mo → download en 1-2s à chaque requête (si on force le re-téléchargement pour éviter les stale reads). Le cold start Lambda passe de 1s à 3s.

### Parades et Mitigations

#### Parade 1 — Reserved Concurrency = 1 (la plus simple)

```yaml
# template.yaml (SAM)
LocaGestFunction:
  Type: AWS::Serverless::Function
  Properties:
    ReservedConcurrentExecutions: 1  # UNE seule invocation à la fois
```

**Ce que ça garantit** : jamais deux Lambdas simultanées → pas de race condition.

**Ce que ça coûte** :
- Si la génération de facture (calcul + PDF + S3 + SES) prend 3 secondes, toutes les autres requêtes attendent ces 3 secondes dans la queue Lambda
- Une requête GET /sejours/current du gardien est bloquée pendant qu'un trésorier génère une facture
- Pas de parallélisme, même sur des opérations indépendantes
- SnapStart ne compense qu'une partie du cold start

**Verdict** : pour LocaGest avec 3 utilisateurs occasionnels, acceptable en pratique, mais fragile par nature.

#### Parade 2 — Conditional Write S3 (ETag optimiste)

AWS a ajouté le conditional write sur S3 en novembre 2024 (If-Match header sur PutObject). On peut l'exploiter :

```java
// Téléchargement avec ETag
var response = s3.getObject(GetObjectRequest.builder()
    .bucket(bucket).key("sejour.db").build());
String etagInitiale = response.response().eTag();
byte[] contenu = response.readAllBytes();

// ... ouvrir SQLite, modifier, sauvegarder le fichier ...

// Upload conditionnel : échoue si quelqu'un a modifié entre-temps
try {
    s3.putObject(PutObjectRequest.builder()
        .bucket(bucket)
        .key("sejour.db")
        .ifMatch(etagInitiale)  // ← nouveau en 2024
        .build(),
        RequestBody.fromBytes(nouveauContenu));
} catch (S3Exception e) {
    if (e.statusCode() == 412) {
        // Conflict : quelqu'un a écrit entre-temps → retry
        throw new ConcurrentModificationException("Re-essayez");
    }
}
```

**Ce que ça garantit** : détection de la collision, jamais de donnée silencieusement écrasée.

**Ce que ça ne garantit pas** : en cas de collision fréquente, les retries s'accumulent. Acceptable à 3 utilisateurs, problématique à 30.

#### Parade 3 — Verrou distribué via DynamoDB

```java
// Avant chaque opération d'écriture
dynamoDB.putItem(PutItemRequest.builder()
    .tableName("locagest-locks")
    .item(Map.of(
        "resource", AttributeValue.fromS("sejour.db"),
        "owner",    AttributeValue.fromS(lambdaRequestId),
        "ttl",      AttributeValue.fromN(String.valueOf(Instant.now().plusSeconds(30).getEpochSecond()))
    ))
    .conditionExpression("attribute_not_exists(resource)")  // CAS atomique
    .build());

// ... download, modify, upload ...

// Libérer le verrou
dynamoDB.deleteItem(...);
```

**Ce que ça garantit** : exclusion mutuelle vraie, même entre Lambdas différentes.

**Ce que ça coûte** :
- Une dépendance DynamoDB qui n'existait pas (ironie de la situation)
- 2 appels DynamoDB supplémentaires par requête d'écriture
- Si Lambda crashe avec le verrou, le TTL le libère automatiquement après 30s → 30 secondes d'indisponibilité totale en écriture

#### Parade 4 — Turso (libSQL) : SQLite sans les risques S3

https://turso.tech est un service managé SQLite-compatible avec une API HTTP. Compatible avec le driver SQLite standard, pas de S3, concurrence gérée côté serveur.

- **Free tier** : 500 DB, 9 GB stockage, 1 milliard de lectures/mois
- **Syntax** : 100% SQLite (donc ~95% compatible avec le schéma actuel)
- **Pas de VPC** : HTTP depuis Lambda
- **Mais** : hébergeur tiers hors AWS, confidentialité des données

## Impact des Features Prévues

### Upload photo chèque (POST /sejours/{id}/paiements/{pid}/photo)

La photo va sur S3, seule la clé cheque_s3_key est écrite en base. C'est une petite écriture, mais :

**Scénario** :
- Le gardien uploade une photo de chèque
- Le trésorier génère une facture (simultanément)

**Impact** :
- Race condition identique, même si les données semblent indépendantes
- La mise à jour cheque_s3_key dans sejour.db peut être écrasée par le re-upload de la Lambda facture
- L'endpoint multipart est aussi plus lent (réception + upload S3) → fenêtre d'exposition plus large

### Dashboard trésorier (GET /admin/stats?annee=2025)

C'est une lecture pure, pas d'écriture. Risques spécifiques :

**Stale data** : si le gardien vient de saisir les nb_reelles et que la Lambda du dashboard a encore l'ancienne version en cache, le trésorier voit des totaux faux. Pour des décisions financières (relances paiements, statistiques annuelles), c'est problématique.

**Requêtes lourdes** : les agrégats GROUP BY sur ligne_sejour JOIN facture JOIN sejour se font en RAM sur le fichier SQLite local. Si le fichier est gros et qu'il faut le re-télécharger avant chaque stat, la latence sera perceptible.

**En pratique** : si on force un re-téléchargement systématique (seul moyen d'avoir des données fraîches), le dashboard sera cohérent mais plus lent.

### Frontend React (multi-utilisateurs simultanés)

C'est là que l'architecture SQLite/S3 montre ses vraies limites. Aujourd'hui, le projet est utilisé par 3 personnes en mode "l'une ou l'autre". Avec un vrai frontend React :

**Scénario réaliste** (samedi, changement de séjour) :
- Le gardien saisit les arrivées sur son téléphone (PATCH /horaires)
- Le resp. location crée le séjour suivant (POST /sejours)
- Le trésorier génère la facture du séjour qui se termine (POST /facture)

**Impact** :
- Trois écritures simultanées
- Avec concurrency=1 : deux reçoivent un 429/timeout
- Sans concurrency=1 : race condition → données corrompues

**Critique** : c'est le samedi de transition (départ + arrivée) où la charge est maximale et la tolérance aux erreurs minimale.

### Infrastructure as Code (SAM template)

Le SAM template devra encoder la contrainte `ReservedConcurrentExecutions: 1`. C'est une contrainte invisible et fragile :

**Risques** :
- Un futur développeur ne comprend pas pourquoi
- Il la retire pour "améliorer les performances"
- Les données se corrompent de façon intermittente
- Des semaines pour diagnostiquer

**Note** : Avec Aurora ou DynamoDB, cette contrainte n'existe pas.

## Synthèse des Risques par Feature

| Feature | SQLite/S3 concurrency=1 | SQLite/S3 + ETag | Aurora (actuel) |
|---------|-------------------------|------------------|-----------------|
| Génération facture (séquentielle) | ✅ Sûr | ✅ Sûr (retry) | ✅ Natif |
| Saisie simultanée gardien + resp | ⚠️ Files d'attente | ⚠️ Retries | ✅ Transparent |
| Upload photo chèque | ✅ Sûr | ✅ Sûr | ✅ Transparent |
| Dashboard stats (stale reads) | ⚠️ +latence download | ⚠️ +latence download | ✅ Toujours frais |
| Frontend React multi-users | ❌ UX dégradée | ⚠️ Acceptable | ✅ Transparent |
| Lambda scheduled (relances) | ❌ Coordination impossible | ⚠️ Complexe | ✅ Transparent |

## Verdict Final

### Viabilité : OUI, sous conditions

**SQLite/S3 est viable aujourd'hui pour LocaGest** à une condition cruciale : `ReservedConcurrentExecutions: 1`, avec documentation explicite dans le SAM template et le CLAUDE.md.

C'est une **dette technique intentionnelle** :
- **Gain** : économiser ~600 €/an
- **Coût** : accepter une limitation architecturale documentée
- **Plan de migration** : vers Aurora ou Turso si concurrence nécessaire

### Point Critique

La **ligne rouge** est le **frontend React multi-users simultanés** — c'est le moment où la contrainte devient un vrai problème UX, pas seulement théorique.

**⚠️ Si cette feature est dans la roadmap à 6 mois, ne pas migrer vers SQLite/S3 maintenant.**
