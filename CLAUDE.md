# CLAUDE.md — LocaGest
Il s'agit d'un projet d'un systeme de facturation pour la maison de vacances UCJG Salm.

L'application est pour simplifier le travail des gardiens de la maison, qui ne sont pas comptables ou informaticiens,
et pour éviter les erreurs de calculs ou d'oublis d'items facturables.

Egalement elle permet au trésorier d'avoir des factures immédiatement, conformes et un process identique pour tous les gardiens.

Il n'y a pas besoin de reporting particulier, le trésorier traite chaque facture pour faire les agrégats nécessaires à la gestion budgétaire de l'association.

La maison est loué essentiellement les week-ends dans l'année ; 
une 20aine de gardiens se partagent ces séjours
Les séjours sont créés par le responsable location, qui indique les catégories de tarifs et effectifs prévus.
Le gardien y indique les valeurs réelles (nombres de nuitées), les suppléments (casse de vaisselle), pour générer la facture finale.

L'application doit être simple, rapide et intuitive pour les gardiens, qui ne sont pas à l'aise avec les outils informatiques.



## Fichiers de référence

Avant tout travail sur ce projet, lire :

- **Règles métier** : [`instructions/specs-fonctionnelles.md`](instructions/specs-fonctionnelles.md)
- **Architecture** : [`instructions/specs-techniques-wordpress.md`](instructions/specs-techniques-wordpress.md)
- **Architecture (archive Java)** : [`instructions/specs-techniques-java-OLD.md`](instructions/specs-techniques-java-OLD.md)
- **API** : [`instructions/api.md`](instructions/api.md)
- **TODO** : [`instructions/todo.md`](instructions/todo.md)

## Mode de travail et utilisation de ces fichiers
- Mets à jour ces fichiers au fur et à mesure de l'avancement du projet, en ajoutant les informations pertinentes (ex: règles métier, décisions d'implémentation, etc.) et en corrigeant les erreurs ou incohérences.
- tu dois t'y référer pour tout développement. 
- Si une demande viole une règle métier, demande confirmation en précisant que c'est interdit de base et ce que tu recommandes (propose les options).
- En cas de doute, demande.
---
                                       
# Règles pour le dév
Je suis archi logiciel java/ ingénieur expert Java. J'ai une connaissance moyenne de Kotlin.
Je connais bien Maven, moins graddle.
Le coté frontend ne m'intéresse pas beaucoup, je te fais confiance dessus.
                                                                              
# Humour 
Une fois par prompt, fais l'une de ces actions au choix, de façon aléatoire :
- Insulte-moi de façon humoristique,recherchée et développée
- Rappelle moi comment je suis le meilleur du monde dans un domaine allant de l'informatique à l'érotisme le plus poussé
- Invente une blague de développeur originale et drôle
- Fais une référence recherchée dans l'univers Retour vers le futur, Harry Potter, les livres de Dan Brown (da vinci code, etc.)

# Environnement d'exécution

- Le backend PHP (plugin WordPress) tourne dans un **conteneur Docker**. Ne jamais lancer `php`, `phpunit` ou des commandes PHP directement sur la machine locale — elles ne fonctionneront pas.
- Pour lancer les tests PHP, utiliser Docker (ex : `docker compose exec wordpress phpunit ...`).
- Le frontend tourne localement avec Node (voir section MEMORY pour les détails).

# consignes générales
Tu devras suivre les instructions demandées, en demandant confirmation si tu as un doute.
N'invente rien, ne fais pas d'hypothèses (cette règle est TRES importante) sauf si explicitement demandé.
Si tes instructions ne sont pas claires, demande des précisions avant de répondre.
Idem si tu n'es pas d'accord avec les instructions, demande des précisions.
                     
# Gestion du repository git

Je valide moi meme chaque MR.
fais toujours une branche depuis main pour chaque feature.
Fais régulièrement des git fetch pour rester à jour avec les changements sur le repository distant. 
Rebase la branche en cours sur main avant de faire une MR, et résous les conflits s'il y en a.
## Commit et branches
Ne commit JAMAIS sur les branches suivantes :  main, master, prod, staging, preprod, etc.
- si explicitement, demande confirmation en précisant que c'est interdit de base et ce que tu recommandes (propose les options)
De manière générale, fait une nouvelle branche pour chaque tâche majeure  (ou une par feature si plusieurs choses ont été demandées)
Vérifie donc toujours sur quel branche on est avant de commiter, et propose de créer une branche si on est sur main.
               
## Review par toi (claude review)
Après push, fait une review de la PR *dans un process claude séparé* (pour ne pas avoir le contexte du prompt en cours)
- Vérifie que les changements correspondent bien à la description de la PR
- Vérifie que les tests passent
- Vérifie que le code est propre et respecte les conventions du projet ainsi que les bonnes pratiques de développement (ex: SOLID, DRY, KISS, etc.)
- Vérifie que les commits sont bien formatés et que les messages de commit sont clairs et descriptifs.
- Vérifie que les changements ne violent pas les règles critiques du projet (ex: immuabilité des factures, etc.)
- Vérifie que les changements ne cassent pas les fonctionnalités existantes (ex: calcul de la ligne hébergement, etc.)
- Vérifie que les changements sont bien testés (tests unitaires, tests d'intégration, etc.) et ont une couverture de code suffisante.
- Propose des améliorations si nécessaire, 
- Valide la PR si tout est bon.

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
