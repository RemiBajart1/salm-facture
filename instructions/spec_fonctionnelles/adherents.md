# Module — Adhérents *(TODO)*

| Rôle          | Accès                                                              |
|---------------|--------------------------------------------------------------------|
| **Trésorier** | ✏️ Ajouter un adhérent manuellement                                |
| **Trésorier** | ✏️ Définir & gérer les type d'adhésion                             |
| **Trésorier** | ✏️ Indiquer comme adhésion renonuvellée                            |
| **Trésorier** | ✏️ Changer le type d'adhésion pour un adhérent existant            |
| **Trésorier** | 👁️ Voir la liste des adhérents                                    |
| **Gardien**   | ✏️ Saisir un nouvel adhérent de type "membre locataire" uniquement |

## Description

Un adhérent est une personne physique qui a souscrit une adhésion à l'association.
L'adhésion peut être de différents types (Défaut : Membre locataire 15€, membre actif 25€, jeune 15€)

Les adhésions sont valables jusqu'au 31 décembre de l'année civile, indépendamment de la date de souscription. Par exemple, une adhésion souscrite le 15 mars 2024 est valable jusqu'au 31 décembre 2024.
Le trésorier peut indiquer manuellement qu'une adhésion a été renouvellée pour l'année à venir

Le suivi et la gestion des adhérents sont gérés par le trésorier 


## Définition d'un adhérent
Un adhérent est défini par les champs suivants : 
 - nom
 - prénom
 - -mail
 - n° téléphone
 - adresse 
 - Code postal
 - Ville
 - Type d'adhésion (ex : membre locataire, membre actif, jeune)
 - date de 1ere adhésion (peut être null dans le cas d'une saisie d'un groupe locataire à venir)
 - dates de renouvellement (peut être future dans le cas d'une adhésion renouvelée pour l'année suivante)

## Ajout automatique d'un adhérent
Lors de la création d'un séjour, par défaut il y a un supplément "carte de membre. Si le locataire est déjà membre, ce supplément ne doit pas être inclus (qty=0 automatiquement) — le resp. location peut décocher la case "Groupe déjà membre pour l'année civile" pour les groupes déjà membres.
Le gardien saisit les coordonnées de la personne concernée (bouton "identique au locataire" pour préremplir)
Si le gardien facture plusieurs cartes, chacune doit avoir les coordonnées de la personne concernée

## Modification pour un nouveau séjour     
Un séjour peut être associé à un adhérent déjà existant, dans le cas où un membre veut louer la maison.
La saisie manuelle des coordonnées du locataire prépare une ligne adhésion, avec date = null et pas de date de renouvellement

## Saisie par le trésorier
Le trésorier peut ajouter un adhérent manuellement.
Le trésorier indique la date de renouvellement de l'adhésion, qui peut être future (ex : adhésion renouvelée pour l'année suivante) ou passée (l'adhésion est faite par d'autres moyens à ce jour)

## Données par défaut
Ces items sont à préconfigurer lors de la création de la feature (mock + db initiale) :
Membre locataire 15€, membre actif 25€, jeune 15€

