---
format: 1
status: proposed
significance: [guarded-config, boundary, data-format]
supersedes: [ADR-0028]
---

# Un client borné, honnête, et porteur du jeton de l’abonné

## Contexte et problème

- ADR-0028 a posé un client borné et honnête, et a nommé sa réévaluation : « quand la connexion d’un lecteur ajoute un jeton aux requêtes » (`docs/adr/0028-un-client-du-service-du-journal-borne-et-honnete.md`).
- ADR-0032 ouvre cette connexion : l’abonné donne ses identifiants, et `POST /user/login` rend un jeton d’usager (`docs/adr/0032-la-connexion-de-l-abonne-sous-une-cle-pretee.md`).
- Mesuré le 24/09/2026 depuis le téléphone : `GET /wordpress/post/3868546` rend `right: true` et le corps entier sous `x-user-token`, et `right: false` sans lui (`~/Downloads/filtered_domains_09-24-2026-13-20-13.har`).
- Le client officiel envoie le drapeau `ano` exactement quand il n’envoie aucun jeton, 74 requêtes sur 74 de la capture du 21/09/2026 (`packages/remote-api/src/routes.ts`).
- Le juge du client range `x-user-token` parmi les en-têtes qui parlent pour un autre, et R4 d’ADR-0028 interdit à une requête de porter les identifiants d’un lecteur (`packages/remote-api/src/judge.ts`).

Comment le client porte-t-il le jeton que la connexion de cet abonné a gagné, sans jamais porter celui de personne d’autre ?

## Critères de décision

- **C1** — l’abonné lit ce que son abonnement paie
- **C2** — aucune requête ne parle pour quelqu’un que ce lecteur n’est pas
- **C3** — chaque règle a son juge, hors ligne
- **C4** — le client garde ce qu’ADR-0028 lui a donné : délai, cause, nom propre, adresses connues

## Options étudiées

- Le jeton porté par le transport, jugé des deux côtés
- Un second client bâti pour les requêtes d’un abonné
- Aucun jeton, l’abonné renvoyé vers une vue web

## Décision

Option retenue : « Le jeton porté par le transport, jugé des deux côtés », parce qu’une seule place décide ce qu’une requête porte, et que le juge y tient les deux moitiés de la règle : un jeton qu’aucune connexion n’a gagné, et un abonné connecté qui ne le dit pas (C2, C3).

- **R1** — Le client du service DOIT être importé par la seule place `api`.
- **R2** — Une requête au service DOIT rendre la main passé un délai fixe, en lâchant sa connexion.
- **R3** — Un échec DOIT porter le code de sa cause : réseau, délai, statut ou réponse illisible.
- **R4** — Une requête NE DOIT PAS porter le nom du client officiel, ni un jeton qu’aucune connexion de ce lecteur n’a gagné.
- **R5** — Une adresse demandée au service DOIT avoir la forme d’une adresse que le client officiel a demandée.
- **R6** — Une build qui ne nomme aucune source DOIT lire le corpus simulé.
- **R7** — Une requête d’un lecteur connecté DOIT porter son jeton d’usager et laisser tomber le drapeau `ano`.

### Conséquences

- Bien, parce que l’abonné lit sous son propre jeton l’article que le service lui accorde, et non le mur qu’il voyait en payant (C1).
- Bien, parce que le jeton est demandé à chaque requête et jamais gardé : le client est bâti au premier écran, et le lecteur se connecte longtemps après (C1).
- Bien, parce que le juge rejoue chaque route deux fois, personne connecté puis un abonné qui l’est, et nomme le client qui invente un jeton comme celui qui oublie le sien (C2, C3).
- Bien, parce que les six règles d’ADR-0028 sont reprises mot pour mot, sauf R4 que ce jeton rouvre (C4).
- Mauvais, parce qu’un jeton d’usager part vers le service à chaque requête, là où ADR-0028 n’en envoyait aucun (C2).
- Neutre, parce que le service décide seul du droit : le jeton dit qui demande, et `right` seul dit ce qui s’ouvre.

## Avantages et inconvénients des options

### Le jeton porté par le transport, jugé des deux côtés

- Bien, parce qu’une seule place lit le jeton et écrit l’en-tête, pour toutes les routes à la fois (C1, C4).
- Bien, parce que le drapeau `ano` tombe avec le même geste, au lieu de dire au service qu’il n’y a personne (C1).
- Bien, parce que le juge hors ligne tend un jeton au client et cherche celui-là seul (C2, C3).
- Mauvais, parce que le transport lit désormais un port de plus, que chaque banc doit tendre (C4).

### Un second client bâti pour les requêtes d’un abonné

- Bien, parce que le client d’ADR-0028 ne changerait pas d’une ligne (C4).
- Mauvais, parce que le délai, les causes et les adresses seraient à tenir deux fois, et qu’une seule des deux les oublierait (C4).
- Mauvais, parce que le jeton arrivant après la construction, la porte devrait échanger de client en pleine lecture (C1).

### Aucun jeton, l’abonné renvoyé vers une vue web

- Bien, parce qu’aucune requête de l’app ne porterait jamais de jeton (C2).
- Mauvais, parce que l’abonné quitterait l’app pour lire ce qu’il paie, et y perdrait le corps mis en page ici (C1).
- Mauvais, parce qu’une vue web porterait le témoin de session, que nul juge de ce dépôt ne lit (C3).

## Informations complémentaires

- Preuves : R1 à R6 gardent les juges d’ADR-0028, R4 y ajoutant le client qui invente un jeton ; R7 a les siens, un client qui laisse le jeton au vestiaire et un qui garde `ano` (`tools/guardrails/src/proofs/transport.ts`).
- Le jeton est celui de l’abonné, gagné par sa propre connexion ; la clé prêtée qui ouvre cette connexion reste hors du client livré, qu’ADR-0032 garde.
- Réévaluation : le service lie un jeton d’usager à l’appareil qui l’a obtenu, ou une capture montre une route que le client ne sait pas demander.
