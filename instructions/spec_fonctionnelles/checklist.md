# Module — Checklist *(TODO)*

| Rôle               | Accès                                                        |
|--------------------|--------------------------------------------------------------|
| **Gardien**        | ✏️ Saisie — cocher/remplir les items pour un séjour          |
  |**Gardien**| 👁 Voir les checklists associées aux séjours passés|
| **Administrateur** | ✏️ Gestion des listes (ajout/modification/ordre/suppression) |

## Description

Checklists d'ouverture et de fermeture de la maison, en lien avec un séjour.
Plusieurs checklists sont possibles (ex : ouverture de la maison, arrivée du groupe, départ du groupe, fermeture), chacune avec ses propres items.

## Gestion des listes (administrateur) 

L'administrateur peut :
- Créer/modifier/supprimer des checklists et leurs items
- Réordonner les groupes et items dans chaque groupe

> ⚠️ Pas de notion de snapshot les modifications affectent les séjours passés, en cours et à venir.
> Alerte si suppression d'un item contenant des données pour un ou plusieurs séjours. 
> Une nouvelle checklist n'est pas affectée aux séjours passés, mais est automatiquement associée aux séjours à venir et en cours.

## Saisie par le gardien

Le gardien coche/remplit les items pour le séjour en cours.

## Données par défaut 
Ces items sont à préconfigurer lors de la création de la feature (mock + db initiale) :

**Ouverture de la maison**
- Ouverture du portail avant
- Si bus ou demande particulière : ouverture portail arrière
- Vérification propreté cuisine, réfectoire, salle de réunion, sanitaires RDC/étage, chambres, couloirs/escaliers, extérieur
- Relevés de température des chauffe-eau
- Nombre de poubelles vidées par la collecte des déchets
- Les poubelles sont rentrées / 2 poubelles en place à côté de la cuisine

**Arrivée du groupe**
- Présenter l'histoire de la maison et de l'association
- Faire un état des lieux avec le responsable du groupe avant installation
- Présenter les consignes de sécurité (évacuation, issues de secours…)
- Rappeler de remplir la liste des personnes présentes par chambre
- Consigne de départ (chambres rangées, poubelles vidées…)

**Pendant le séjour**
- Si déclenchement de l'alarme, vérifier l'évacuation du bâtiment
- Si appel aux pompiers, ouvrir portail arrière 

**Au départ du groupe**
- Demander si tout s'est bien passé
- Vérification nettoyage cuisine, réfectoire, salle de réunion, sanitaires RDC/étage, chambres, couloirs/escaliers, extérieur
- Faire la facture et encaisser le paiement

**Fermeture de la maison**
- Fermeture de tous les volets
- Portes de toutes les chambres ouvertes
- Sortir les poubelles 
- Nombre de poubelles sorties
- Vérifier les lumières éteintes
- Vérifier portail arrière fermé
- Fermeture portail avant

