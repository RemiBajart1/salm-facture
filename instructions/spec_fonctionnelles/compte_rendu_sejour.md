# Module — Compte-rendu de séjour *(TODO)*

| Rôle                    | Accès                                                  |
|-------------------------|--------------------------------------------------------|
| **Gardien**             | ✏️ Saisie du compte-rendu du séjour en cours           |
|**Gardien**| 👁 Voir les comptes-rendu associées aux séjours passés |



## Description

Le gardien saisit un compte-rendu à chaque séjour.
Un compte-rendu est associé à un séjour, et doit être saisi pendant ou à la fin du séjour 
Les compte-rendus sont visibles (lecture seule) par les autres gardiens pour les séjours passés, et le resp. location, pour assurer un suivi de l'état de la maison.

> ⚠️ Le gardien ne doit pas saisir de DACP (données à caractère personnel) dans les comptes-rendus — uniquement des faits matériels ou actions de travaux nécessaires dans la maison. Un message d'avertissement doit être affiché lors de la saisie.

## Contenu d'un compte-rendu

- Commentaire libre sur le séjour
- Photos éventuelles
- Statut des items des checklists associées

## Lien avec les checklist (TODO)
Une checklist est associée à chaque séjour, avec des items à cocher par le gardien pendant ou à la fin du séjour (ex : "Vérifier l'état de la vaisselle", "Vérifier les matelas", "Vérifier les équipements de sécurité", etc.). Voir [Checklist](checklist.md).

## Lien avec les travaux (TODO)

Depuis un compte-rendu, le gardien peut signaler un travail à prévoir (case à cocher "Ajouter un travail à prévoir") : le titre et la description sont pré-remplis depuis les informations saisies dans le compte-rendu. Voir [Travaux](travaux.md).

