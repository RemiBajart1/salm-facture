# Specs fonctionnelles — LocaGest

## Contexte métier

UCJG Salm loue une maison de vacances à la semaine.
> 53 rue du Haut-Fourneau, 67130 La Broque

### Rôles

| Rôle | Responsabilités |
|---|---|
| **Trésorier** | Configure les tarifs par personne, les items facturables, la config globale du site |
| **Responsable location** | Crée les séjours, sélectionne les catégories de tarifs et effectifs prévus, valide/promeut les saisies libres du gardien |
| **Gardien** | Saisit les horaires réels, les effectifs réels par catégorie, les suppléments, encaisse le paiement |

Les rôles sont gérés par **AWS Cognito** (groupes : `tresorier`, `resp_location`, `gardien`).

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

## Règles de gestion

### 4.1 Hébergement — forfait minimum 40 personnes par nuit

Le calcul produit **une seule ligne** `TypeLigne.HEBERGEMENT` sur la facture.

Les catégories de tarifs (`sejour_categorie`) s'appliquent normalement. Le **forfait** est un plancher configurable par séjour : on ne facture jamais moins de `min_forfait` personnes par nuit.

- **Valeur par défaut** : 40 personnes
- **Configurable par le responsable location** au moment de la création du séjour (ex : 30 pour un groupe membres de l'union)
- Stocké dans `sejour.min_personnes_total` (DTO : `minPersonnesTotal`, `null` = utilise `config_site.min_personnes_defaut`)

**Calcul par nuit :**
```
montant_reel_nuit    = Σ (nb_reelles_cat × prix_nuit_snapshot_cat)
total_reel_nuit      = Σ nb_reelles_cat

Si total_reel_nuit >= sejour.min_personnes_total :
  montant_nuit = montant_reel_nuit

Si total_reel_nuit < sejour.min_personnes_total :
  prix_moyen = montant_reel_nuit / total_reel_nuit   (ou moyenne simple si 0 présents)
  montant_nuit = sejour.min_personnes_total × prix_moyen
```

**Total facture :**
```
montant_total = Σ montant_nuit  (sur toutes les nuits)
```

**Libellé :**
- Si le forfait s'applique (totalReel < min_personnes_total) → `"Forfait hébergement – N personnes · M nuits"` (N = min_personnes_total)
- Si facturation réelle (totalReel >= min_personnes_total) → `"Hébergement – X nuitées"` (X = totalReel × nbNuits)

**Exemples :**

| Situation | Catégories | Total réel/nuit | Facturé | Montant |
|---|---|---|---|---|
| 1 nuit | 15 non-adhérents (20€) + 8 membres (15€) = 23 | 23 < 40 → forfait | 40 × 18,26€* | ~730 € |
| 1 nuit | 27 présents (18€ moy.) | 27 < 40 → forfait | 40 × 18€ | 720 € |
| 2 nuits | 48 puis 55 présents | >40 chaque nuit | (48+55) × 18€ | 1 854 € |
| 3 nuits | 35 / 42 / 38 présents | nuit 2 > 40, autres forfait | (40+42+40) × prix | — |

\* prix moyen pondéré : (15×20 + 8×15) / 23 ≈ 18,26 €

### 4.2 Énergies

```
min(nb_nuits, energie_nb_nuits) × energie_prix_nuit
```
Par défaut : `min(nb_nuits, 2) × 80 €`. Les nuits suivantes sont incluses.

### 4.3 Taxe de séjour

```
nb_adultes × nb_nuits × taxe_adulte_nuit
```
Par défaut : `nb_adultes × nb_nuits × 0,88 €`

### 4.4 Suppléments

- Items du catalogue (`TypeLigne.SUPPLEMENT`) : saisis par le gardien, directement confirmés
- Saisies libres (`TypeLigne.LIBRE`) : saisis par le gardien, visibles chez le resp./trésorier
Exemple de suppléments : 
- Location de draps (ex : 1 kit à 5€)
- Casse (ex : 1 assiette à 3€, 2 verres à 2€ chacun)
- Location de barbecue (ex : 1 semaine à 20€)

### 4.5 Promotion d'une saisie libre → catalogue

Pas de workflow validate/reject. Un appel unique :
```
POST /admin/lignes-libres/{ligneId}/promouvoir
{ "categorieItem": "CASSE", "unite": "UNITE", "nomCatalogue": "Drap taché" }
```
Effet atomique :
1. Crée un `ConfigItem` dans le catalogue (actif immédiatement)
2. Met à jour la ligne : `type_ligne = SUPPLEMENT`, `config_item_id = nouveau`, `statut = CONFIRME`
3. Le montant de la ligne ne change pas → la facture reste intacte

### 4.6 Immuabilité des factures

Une facture `EMISE` ou `PAYEE` ne peut plus être recalculée (erreur `409 CONFLICT`). Seule une facture `BROUILLON` peut être regénérée.

---

## Design decisions

### Pourquoi Aurora PostgreSQL plutôt que DynamoDB ?

Le modèle multi-tarifs rend DynamoDB inconfortable : calculer un prix moyen pondéré sur N catégories, gérer le minimum global, produire des agrégats annuels — tout ça se fait naturellement en SQL. Aurora Serverless v2 scale-to-zero entre les séjours (usage ~1/semaine), le coût est comparable.

### Pourquoi "promouvoir" plutôt que "valider/rejeter" ?

Valider/rejeter implique un workflow à deux états avec notifications. La réalité métier est plus simple : si la saisie du gardien est correcte, on l'ajoute au catalogue pour ne plus avoir à la ressaisir. Si elle est incorrectement valorisée, le resp. peut modifier le montant/libellé avant de le promouvoir. Il n'y a pas de "rejet" — une ligne LIBRE reste visible jusqu'à ce qu'on décide quoi en faire.

### Pourquoi les snapshots dans `sejour_categorie` ?

Un séjour d'août 2024 facturé en septembre 2024 ne doit pas être affecté si le Trésorier augmente les tarifs en octobre 2024 pour 2025. Les snapshots garantissent que la facture est un document légal immuable reflétant les conditions au moment du séjour.
