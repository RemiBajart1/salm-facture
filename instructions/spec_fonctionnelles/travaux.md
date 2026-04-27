# Module — Travaux *(TODO)*

A faire après compte-rendus de séjour, pour pouvoir associer les travaux à des comptes-rendus.

| Rôle        | Accès                                                                                                  |
|-------------|--------------------------------------------------------------------------------------------------------|
| **Gardien** | ✏️ Nouveau Signalement. Modifier signalement tant qu'il n'a pas changé de statut et n'a pas de réponse |
|**Gardien**| 👁 Voir les signalements existants                                                  |
| **Gardien** | ✏️ changer statut/répondre à un signalement existant                                            |

## Description

Vue centralisant tous les travaux/problèmes à suivre dans la maison.
Elle affiche la liste des problèmes à résoudre, avec leur statut de résolution (en cours, résolu, à suivre), filtrable
par statut, urgence, lieu, etc.

## Champs d'un travail

| Champ                   | Notes                                                         |
|-------------------------|---------------------------------------------------------------|
| Date/heure de saisie    | Automatique  / Non modifiable                                 |
| Auteur                  | Automatique /                Non modifiable                   |
| Titre                   |                                                               |
| Lieu                    |                                                               |
| Description du problème |                                                               |
| Urgent                  | Case à cocher (ex : fuite d'eau, panne de chauffage en hiver) |
| Photos                  | Optionnelles                                                  |
| Séjour lié              | Optionnel, lien avec les comptes-rendus de séjour             |

## Suivi / réponse
On peut ajouter/plusieurs une réponse à un problème

La réponse est modifiable par tous les gardiens :

| Champ                        | Notes                            |
|------------------------------|----------------------------------|
| Statut de résolution         | `EN_COURS`, `RESOLU`, `A_SUIVRE` |
| Commentaire de résolution    |                                  |
| Date et auteur de la réponse | Automatique, non modifiable      |

## Exemples /données par défaut

- Panne lave-vaisselle
- Lit chambre 16 cassé à l'arrivée du groupe, remplacé par un matelas au sol
- Fuite sur robinet cuisine 2e étage
- Déclenchement alarme incendie chambre 12, cause inconnue

## Lien avec les comptes-rendus

Un travail peut être créé directement depuis un compte-rendu de séjour.
Voir [Compte-rendu de séjour](compte_rendu_sejour.md).

