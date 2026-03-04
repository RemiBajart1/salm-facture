# CLAUDE.md — LocaGest
Il s'agit d'un projet d'un systeme de facturation pour la maison de vacances UCJG Salm.
L

Le backend est développé en Java 21 avec Micronaut, déployé sur AWS Lambda, et utilise Aurora PostgreSQL 
Serverless v2 pour la persistance. 
Le frontend est une application React hébergée sur AWS Amplify.

## Fichiers de référence

Avant tout travail sur ce projet, lire :

- **Règles métier** : [`instructions/specs-fonctionnelles.md`](instructions/specs-fonctionnelles.md)
- **Architecture** : [`instructions/specs-techniques.md`](instructions/specs-techniques.md)
- **API** : [`instructions/api.md`](instructions/api.md)
- **TODO** : [`instructions/todo.md`](instructions/todo.md)

---

## Règles critiques à ne jamais violer

### 1. Snapshots — règle d'or

**Ne jamais rejoindre `tarif_personne` pour calculer une facture.**
Toujours lire `prix_nuit_snapshot` et `nom_snapshot` depuis `sejour_categorie`.

### 2. Immuabilité des factures

Une facture `EMISE` ou `PAYEE` ne peut pas être recalculée → `409 CONFLICT`.
Seule une facture `BROUILLON` peut être regénérée.

### 3. Ligne HEBERGEMENT — forfait minimum par nuit (défaut 40 personnes)

Le calcul produit **une seule ligne** `HEBERGEMENT`. Les catégories de tarifs s'appliquent normalement ; le forfait est un **plancher par nuit**.

```
Pour chaque nuit :
  montant_reel = Σ (nb_reelles_cat × prix_snapshot_cat)
  total_reel   = Σ nb_reelles_cat

  si total_reel >= min_forfait  →  montant_nuit = montant_reel
  si total_reel < min_forfait   →  montant_nuit = min_forfait × prix_moyen_pondéré

montant_total = Σ montant_nuit
```

- Le `min_personnes_total` est configurable par séjour (défaut : 40). Ex : 30 pour un groupe membres.
- Voir `instructions/specs-fonctionnelles.md` §4.1 pour les exemples complets.

---

## Stack et conventions

- **Runtime** : Java 21, Micronaut 4.4, Gradle + Shadow JAR
- **Package racine** : `org.ucjgsalm.locagest`
- **Handler Lambda** : `org.ucjgsalm.locagest.LambdaHandler::handleRequest`
- **Base de données** : Aurora PostgreSQL 16 Serverless v2, migrations Flyway
- **Région AWS** : `eu-west-3` (Paris)
- **Auth** : Cognito JWT, groupes `tresorier` / `resp_location` / `gardien`
- **Routes API** : préfixe `/api/v1/` (ex: `/api/v1/sejours`, `/api/v1/admin`)
- **Logging** : `@Slf4j` (Lombok), jamais `System.out.println()`
- **Constructeurs** : `@RequiredArgsConstructor` pour les beans sans `@Value`

                                       
# Règles pour le dév
Je suis archi logiciel java/ ingénieur expert Java. J'ai une connaissance moyenne de Kotlin.
Je connais bien Maven,  moins graddle.
Le coté frontend ne m'intéresse pas beaucoup, je te fais confiance dessus.
                                                                              
## Humour 
Une fois par prompt, fais l'une de ces actions au choix, de façon aléatoire :
- Insulte-moi de façon humoristique,recherchée et développée
- Rappelle moi comment je suis le meilleur du monde dans un domaine allant de l'informatique à l'érotisme le plus poussé
- Invente une blague de développeur originale et drôle
- Fais une référence recherchée dans l'univers Retour vers le futur, Harry Potter, les livres de Dan Brown (da vinci code, etc.)

## consignes générales
Tu devras suivre les instructions demandées, en demandant confirmation si tu as un doute.
N'invente rien, ne fais pas d'hypothèses (cette règle est TRES importante) sauf si explicitement demandé.
Si tes instructions ne sont pas claires, demande des précisions avant de répondre.
Idem si tu n'es pas d'accord avec les instructions, demande des précisions.
                     
# Gestion du repository git

Je valide moi meme chaque MR.
## Commit et branches
Ne commit JAMAIS sur la branche main
- si explicitement, demande confirmation en précisant que c'est interdit de base et ce que tu recommandes (propose les options)
- Si ce n'est pas demandé et que la branche en cours est main, fait une nouvelle branche.  (ou une par feature si plusieurs choses ont été demandées)
Vérifie donc toujours sur quel branche on est avant de commiter, et propose de créer une branche si on est sur main.
### message de commit
- En français de préférence
- Doit être court et descriptif (ex: "Add PDF generation for invoices")
- Doit suivre le format : `<type>(<scope>): <description>` (ex: `feat(sejour): implement accommodation line calculation`)
  - `<type>` : 
    - `feat` pour une nouvelle fonctionnalité, 
    - `fix` pour une correction de bug, 
    - `refactor` pour une refactorisation, 
    - `docs` pour une modification de la documentation, 
    - `chore` pour les tâches non-fonctionnelles (ex: mise à jour des dépendances)
  - `<scope>` : partie du projet affectée (ex: `sejour`, `facture`, `admin`, `api`, etc.)               

### Nommage des branches
- `feature/xxx` pour une nouvelle fonctionnalité
- `bugfix/xxx` pour une correction de bug
- `refactor/xxx` pour une refactorisation
- `docs/xxx` pour une modification de la documentation
- xxx doit être un nom court et descriptif de la tâche (ex: `feature/facture-pdf`).

Respecte le .gitignore du projet, ne propose jamais de commit de fichiers qui y sont listés  
Si tu penses que c'est nécessaire, demande confirmation en précisant que c'est interdit de base.
