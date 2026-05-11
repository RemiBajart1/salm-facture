# Module — Séjours

## Liste des séjours


| Rôle | Accès                                                                                                        |
|---|--------------------------------------------------------------------------------------------------------------|
| **Gardien** | Lecture seule — liste tous les séjours (passés, en cours, à venir). Focus sur le séjour en cours / prochain. |
| **Resp. location** | Lecture + création/modification des séjours à venir — vue globale, focus sur les séjours à venir.            |
| **Trésorier** | Dashboard                                                                                                    |

### Comportement selon l'état du séjour (pour le gardien)

- **Séjour à venir** : consultation des données prévisionnelles saisies par le resp. location, sans modification possible.
- **Séjour en cours** : saisie des données réelles (voir ci-dessous).
- **Séjour passé** : consultation uniquement, sauf si le séjour est encore à l'état `BROUILLON` (modification possible).

---

## Nouveau séjour

| Rôle | Accès |
|---|---|
| **Gardien** | ❌ Pas d'accès |
| **Resp. location** | ✏️ Création |
| **Trésorier** | ❌ Pas d'accès |

Le resp. location crée le séjour avec :
- Les dates (arrivée / départ prévus)
- Les catégories de tarifs applicables et effectifs prévisionnels par catégorie
- Le forfait minimum de personnes (`minPersonnesTotal`, défaut = valeur de `config_site.min_personnes_defaut`)
- La catégorie de référence pour le forfait (`tarifForfaitCategorieId`)
- **Case "Groupe déjà membre pour l'année civile"** : si cochée, la quantité de la carte de membre (item obligatoire) est pré-initialisée à 0 pour ce séjour. Voir [Suppléments obligatoires](supplements_catalogue.md#suppléments-obligatoires).
- Peut préselectionner les suppléments
                              
Le resp. location a également possibilité de modifier toutes ces données via l'édition d'un séjour
---

## Facturation — séjour en cours

| Rôle | Accès |
|---|---|
| **Gardien** | ✏️ Saisie complète |
| **Resp. location** | 👁️ Lecture seule |
| **Trésorier** | 👁️ Lecture seule |

Le gardien saisit, pendant ou à la fin du séjour :
- Horaires d'arrivée et de départ réels
- Effectifs réels par catégorie de tarif (selon les catégories configurées par le resp. location pour ce séjour)
- Suppléments (items du catalogue ou saisies libres)
- Encaissement du paiement (montant, mode de paiement, photo du chèque)

Pour les règles de calcul de la facture, voir [Facturation](facturation.md).
                                                                         

Règle Importante : une fois la facture éditée, le gardien ne peut plus saisir le nombre de personnes, les options, etc.
Ces données doivent être verrouillées visuellement et techniquement

En cas d'erreur, le gardien peut déclarer la facture invalide (séjour en cours uniquement) ce qui permet de débloquer la saisie pour corriger les données. 
Le trésorier peut aussi forcer une facture à l'état "invalide" pour permettre une correction en cas d'erreur détectée a posteriori. 
Une nouvelle facture (nouveau numéro) sera éditée dans ce cas.
