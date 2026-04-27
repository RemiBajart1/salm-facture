# Module — Configuration

| Rôle               | Accès |
|--------------------|---|
| **Gardien**        | ❌ Pas d'accès |
| **Resp. location** | ❌ Pas d'accès |
| **Trésorier**      | ✏️ Écriture complète |  
| **Administrateur** | ❌ Pas d'accès |

## Catégories de personnes et tarifs hébergement

Le trésorier peut ajouter/modifier/changer l'ordre/supprimer les catégories de personnes et leurs tarifs associés.

Catégories par défaut (à la création de la feature) :

| Catégorie | Prix/nuit |
|---|---|
| Extérieur | 18 € |
| Membres de l'union | 15 € |
| Jeunes (groupe de jeunes) | 12 € |
| Présence journée sans nuitée (par jour) | 8 € |

## Configuration globale

- Forfait minimum par défaut (`config_site.min_personnes_defaut`) — défaut : 40 personnes
- Tarif énergie (`energie_nb_nuits`, `energie_prix_nuit`) — défaut : `min(nb_nuits, 2) × 80 €`
- Taxe de séjour (`taxe_adulte_nuit`) — défaut : 0,88 €/adulte/nuit
- Coordonnées sur la facture (IBAN, adresse postale, etc.)
- 

