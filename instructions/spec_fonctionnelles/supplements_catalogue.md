# Module — Suppléments catalogue

| Rôle                              | Accès                          |
|-----------------------------------|--------------------------------|
|**Gardien**| 👁 Voir les items au catalogue |
| **Gardien**                       | ✏️ Saisir les items pour un séjour donné |
| **Trésorier**, **Administrateur** | ✏️ Gestion du catalogue + promotion des saisies libres |

## Description

Les suppléments sont des items facturables saisis par le gardien lors d'un séjour.
Ils apparaissent sur la facture sous forme de **snapshot** : le nom, unité, quantité et le prix sont figés au moment de la saisie, indépendamment de toute modification ultérieure du catalogue.
Le montant total du supplément est calculé comme suit :  quantité * prix unitaire. Il ne peut pas être saisi librement.

Le prix peut être de 0, sans être négatif

Un supplément est composé de : 
- libellé (ex : "Location de draps"),
- Catégorie (Location, Casse/dégradation, intervention)
- d'une quantité (ex : 1 kit), 
- d'un prix unitaire (ex : 5 €), 
- de l'unité (unité / Séjour complet).

Un supplément "séjour" a donc forcément une unité de 1 (indiqué comme "séjour" sur la facture)

Deux types de lignes coexistent :

| Type | Origine | Confirmation |
|---|---|---|
| `SUPPLEMENT` | Item du catalogue, choisi par le gardien | Automatiquement confirmé |
| `LIBRE` | Saisie libre du gardien (nom + montant libres) | Visible resp./trésorier, à promouvoir si récurrent |

---

## Suppléments obligatoires

Un `ConfigItem` peut être marqué `obligatoire: true` par le trésorier. Un item obligatoire :

- est **automatiquement ajouté** à chaque séjour à sa création, avec la quantité par défaut de l'item (généralement 1)
- **ne peut pas être supprimé** par le gardien — seulement sa quantité peut être modifiée
- le responsable location peut **prédéfinir la quantité à 0** s'il sait que la condition est déjà remplie (ex. : groupe déjà membre de l'union pour l'année civile)

### Comportement sur la facture (quantité = 0)

Quand la quantité d'un item obligatoire est 0, la ligne apparaît quand même sur la facture avec le libellé :
```
"<nom de l'item> — Déjà membre pour l'année civile"
```
Montant : 0 €. Cela permet de tracer explicitement la décision sur le document légal.

### Item obligatoire par défaut : Carte de membre

| Libellé | Catégorie | Prix unitaire | Unité | Obligatoire | Qté par défaut |
|---|---|---|---|---|---|
| Carte de membre | Adhésion | 15 € | Unité | ✅ oui | 1 |

Le prix est configurable par le trésorier via le catalogue comme pour tout autre item.

Exemples :
- Location de draps (ex : 1 kit à 5 €)
- Casse (ex : 1 assiette à 3 €, 2 verres à 2 € chacun)
- Location de barbecue (ex : séjour complet, 20 €)



---

## Règle snapshot — obligatoire pour toutes les lignes de la facture
Conformément à la règle d'immutabilité des factures, les lignes de facture sont calculées et affichées à partir de données figées au moment de la génération de la facture, et non à partir de données dynamiques susceptibles d'avoir été modifiées depuis (ex : prix d'un item du catalogue).

> ⚠️ Règle critique : ne jamais relire `config_item` pour calculer ou afficher une facture.

Au moment de la génération de la facture, le nom et le prix de chaque item sont **copiés en snapshot** dans la ligne de facture.


---

## Promotion d'une saisie libre → catalogue

Pas de workflow validate/reject. Un appel unique :

```
POST /admin/lignes-libres/{ligneId}/promouvoir
{ "categorieItem": "CASSE", "unite": "UNITE", "nomCatalogue": "Drap taché" }
```

Effet atomique :
1. Crée un `ConfigItem` dans le catalogue (actif immédiatement)
2. Met à jour la ligne : `type_ligne = SUPPLEMENT`, `config_item_id = nouveau`, `statut = CONFIRME`
3. Le montant de la ligne **ne change pas** → la facture reste intacte

## Données par défaut
Les données par défaut (initialisation de la base, mockups) sont les suivantes :

| Libellé                                           | Catégorie | Prix unitaire | Unité | Obligatoire |
|---------------------------------------------------|---|---------------|---|---|
| **Carte de membre**                               | Adhésion | 15 €          | Unité | ✅ oui |
| Location/changement de draps                      | Location | 5 €           | Unité | — |
| Location verre à vin                              | Location | 0,50 €        | Unité | — |
| Location de barbecue                              | Location | 20 €          | Séjour | — |
| Assiette cassée                                   | Casse/dégradation | 2 €           | Unité | — |
| Verre cassé                                       | Casse/dégradation | 1 €           | Unité | — |
| Verre à vin/bière cassé                           | Casse/dégradation | 1,50 €        | Unité | — |
| Plat cassé                                        | Casse/dégradation | 5 €           | Unité | — |
| Nettoyage supplémentaire                          | Intervention | 100 €         | Unité | — |
| Forfait nettoyage complet                         | Intervention | 500 €         | Séjour | — |
| Déclenchement alarme incendie manuel non justifié | Intervention | 150 €         | Unité | — |

---

## Lien avec la facturation

Les lignes suppléments apparaissent dans la facture du séjour,
qu'elles soient issues du catalogue ou de saisies libres. 
Elles sont calculées et affichées à partir de données figées au moment de la génération de la facture, et non à partir de données dynamiques susceptibles d'avoir été modifiées depuis (ex : prix d'un item du catalogue).
Voir [Facturation §4.4](facturation.md#44-suppléments) pour le détail du calcul.



