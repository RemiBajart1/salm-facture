
## 1 Règles critiques à ne jamais violer

### 1.1 Snapshots — règle d'or

**Ne jamais rejoindre `tarif_personne` pour calculer une facture.**
Toujours lire `prix_nuit_snapshot` et `nom_snapshot` depuis `sejour_categorie`.
Idem pour tous les items de la facture : énergies, taxe de séjour, suppléments, etc. → tous doivent être basés sur des snapshots dans `sejour_categorie` ou `config_item` au moment de la génération de la facture.


> ⚠️ Règle critique : ne jamais relire `config_item` pour calculer ou afficher une facture.

Au moment de la génération de la facture, le nom et le prix de chaque item (séjour, supplément, libellés, coordonnées...) sont **copiés en snapshot** dans la ligne de facture.
Idem pour les lignes de configuration (IBAN, adresse...)
Pour toutes les données apparaissant sur la facture, les données sont copiées en snapshot dans la facture au moment de sa génération, et ne sont jamais relues depuis la configuration par la suite.
Cela garantit qu'une facture émise reste un document légal immuable, même si un élément de configuration en est modifié (tarifs, adresse, libellés...)
**Rappel : cette règle est indispensable et ne doit jamais être violée**
En résumé, une facture `EMISE` ou `PAYEE` est un document légal figé, reflétant les conditions au moment de la génération. Seule une facture `BROUILLON` peut être regénérée et mise à jour.
Elle peut éventuellement être regénérée : dans ce cas son contenu doit être strictement identique à l'original (à la mise en forme près)


### 1.2 Immuabilité des factures

Une facture `EMISE` ou `PAYEE` ne peut pas être recalculée → `409 CONFLICT`.
Seule une facture `BROUILLON` peut être regénérée.

### 1.3 HEBERGEMENT — forfait minimum par nuit (défaut 40 personnes au tarif plein)
HEBERGEMENT`. Les catégories de tarifs s'appliquent normalement ; le forfait est un **plancher par nuit**.
- Le `min_personnes_total` est configurable par séjour (défaut : 40). Ex : 30 pour un groupe membres.
- Voir §4.1 pour les exemples complets.
 ---

## Règles de gestion de la facturation
## 4 Détails du calcul de la facture

### 4.1 Hébergement — forfait minimum 40 personnes par nuit
Nombre de personnes présentes par nuit, selon les catégories de tarifs configurées pour le séjour (ex : 20 adultes, 5 membres, etc.). Le prix unitaire est celui du `prix_nuit_snapshot` de chaque catégorie.
Nombre d'adultes (>18 ans) présents au total (pour taxe de séjour)


Les catégories de tarifs (`sejour_categorie`) s'appliquent normalement. Le **forfait** est un plancher configurable par séjour : on ne facture jamais moins de `min_forfait` personnes par nuit.

- **Valeur par défaut** : 40 personnes au tarif standard (18€/nuit)
- **Configurable par le responsable location** au moment de la création du séjour (ex : 30 pour un groupe membres de l'union)
- Stocké dans `sejour.min_personnes_total` (DTO : `minPersonnesTotal`, `null` = utilise `config_site.min_personnes_defaut`)

**Catégorie de référence pour le forfait :**
Le responsable location choisit, à la création du séjour, une catégorie parmi celles sélectionnées.
Le `prix_nuit_snapshot` de cette catégorie est utilisé comme prix unitaire du forfait.
Stocké dans `sejour.tarif_forfait_categorie_id` (DTO : `tarifForfaitCategorieId`).

**Calcul par nuit :**
```
montant_reel_nuit    = Σ (nb_reelles_cat × prix_nuit_snapshot_cat)
total_reel_nuit      = Σ nb_reelles_cat
prix_reference       = prixNuitSnapshot de la catégorie référencée par tarifForfaitCategorieId

Si total_reel_nuit >= sejour.min_personnes_total :
  montant_nuit = montant_reel_nuit

Si total_reel_nuit < sejour.min_personnes_total :
  montant_nuit = sejour.min_personnes_total × prix_reference
```

**Total facture :**
```
montant_total = Σ montant_nuit  (sur toutes les nuits)
```

**Libellé :**
- Si le forfait s'applique (totalReel < min_personnes_total) → `"Forfait hébergement – N personnes · M nuits"` (N = min_personnes_total)
- Si facturation réelle (totalReel >= min_personnes_total) → `"Hébergement – X nuitées"` (X = totalReel × nbNuits)

**Exemples :**

| Situation                     | Catégories                                    | Total réel/nuit | Facturé           | Montant |
|-------------------------------|-----------------------------------------------|---|-------------------|------|
|  1 nuit, tarif standard        | 27 présents (18€ )                        | 27 < 40 → forfait | 40 × 18€          | 720 € |
| 2 nuits                       | 48 puis 55 présents                           | >40 chaque nuit | (48+55) × 18€     | 1 854 € |
| 3 nuits                       | 35 / 42 / 38 présents                         | nuit 2 > 40, autres forfait | (40+42+40) × prix |
| 1 nuit, tarif négocié membres | 15 non-adhérents (18€) + 8 membres (15€) = 23 | 23 < 40 → forfait | 40 × 15€ (réf = membres) | 600 €  |



     

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

Les suppléments (`SUPPLEMENT` du catalogue et saisies `LIBRE`) apparaissent sur la facture en **snapshot** (nom et prix figés au moment de la génération).
Voir [Suppléments catalogue](supplements_catalogue.md) pour le détail complet.

### 4.5 Immuabilité des factures

Une facture `EMISE` ou `PAYEE` ne peut plus être recalculée (erreur `409 CONFLICT`). Seule une facture `BROUILLON` peut être regénérée.


## FAQ

### Pourquoi les snapshots dans `sejour_categorie` ?

Un séjour d'août 2024 facturé en septembre 2024 ne doit pas être affecté si le Trésorier augmente les tarifs en octobre 2024 pour 2025. Les snapshots garantissent que la facture est un document légal immuable reflétant les conditions au moment du séjour.

