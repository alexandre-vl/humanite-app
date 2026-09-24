---
format: 1
status: proposed
significance: [guarded-config, boundary, data-format]
supersedes: [ADR-0028]
---

# Un client borné, honnête, et porteur du jeton de l’abonné

## Contexte et problème

- ADR-0028 a nommé sa réévaluation : « quand la connexion d’un lecteur ajoute un jeton aux requêtes » (`docs/adr/0028-un-client-du-service-du-journal-borne-et-honnete.md`).
- ADR-0032 ouvre cette connexion : `POST /user/login` rend un jeton d’usager (`docs/adr/0032-la-connexion-de-l-abonne-sous-une-cle-pretee.md`).
- Mesuré le 24/09/2026 : `GET /wordpress/post/3868546` rend `right: true` sous `x-user-token`, `right: false` sans lui (`~/Downloads/filtered_domains_09-24-2026-13-20-13.har`).
- Le client officiel envoie `ano` exactement quand il n’envoie aucun jeton, 74 requêtes sur 74 (`packages/remote-api/src/routes.ts`).
- R4 d’ADR-0028 interdit à une requête de porter les identifiants d’un lecteur, et le juge range `x-user-token` parmi eux (`packages/remote-api/src/judge.ts`).
- Mesuré le 24/09/2026 : sous un jeton d’usager qu’il ne reconnaît plus, le service rend `403` sur les cinq routes que l’app lit, et non `right: false`.

Comment le client porte-t-il le jeton que la connexion de cet abonné a gagné, sans jamais porter celui de personne d’autre ?

## Critères de décision

- **C1** — l’abonné lit ce que son abonnement paie
- **C2** — aucune requête ne parle pour quelqu’un que ce lecteur n’est pas
- **C3** — chaque règle a son juge, hors ligne
- **C4** — le client garde ce qu’ADR-0028 lui a donné : délai, cause, nom propre, adresses connues
- **C5** — un abonné dont la connexion meurt le sait et peut la rouvrir

## Options étudiées

- Le jeton porté par le transport, jugé des deux côtés
- Un second client bâti pour les requêtes d’un abonné
- Aucun jeton, l’abonné renvoyé vers une vue web

## Décision

Option retenue : « Le jeton porté par le transport, jugé des deux côtés », parce qu’une seule place décide ce qu’une requête porte, et que le juge y tient les deux moitiés de la règle (C2, C3).

- **R1** — Le client du service DOIT être importé par la seule place `api`.
- **R2** — Une requête au service DOIT rendre la main passé un délai fixe, en lâchant sa connexion.
- **R3** — Un échec DOIT porter le code de sa cause : réseau, délai, statut ou réponse illisible.
- **R4** — Une requête NE DOIT PAS porter le nom du client officiel, ni un jeton qu’aucune connexion de ce lecteur n’a gagné.
- **R5** — Une adresse demandée au service DOIT avoir la forme d’une adresse que le client officiel a demandée.
- **R6** — Une build qui ne nomme aucune source DOIT lire le corpus simulé.
- **R7** — Une requête d’un lecteur connecté DOIT porter son jeton d’usager et laisser tomber le drapeau `ano`.
- **R8** — Un refus reçu sous le jeton d’un lecteur DOIT porter une cause distincte d’un refus fait à personne.
- **R9** — L’app DOIT oublier un jeton que le service ne reconnaît plus.

### Conséquences

- Bien, parce que l’abonné lit l’article que le service lui accorde, et non le mur qu’il voyait en payant (C1).
- Bien, parce que le jeton est demandé à chaque requête, le client étant bâti bien avant la connexion (C1).
- Bien, parce que le juge rejoue chaque route deux fois, et nomme qui invente un jeton comme qui oublie le sien (C2, C3).
- Bien, parce que les règles d’ADR-0028 sont reprises mot pour mot, sauf R4 que ce jeton rouvre (C4).
- Bien, parce qu’un jeton mort se lit comme tel : l’abonné est renvoyé vers sa connexion au lieu de se voir vendre ce qu’il paie déjà (C5).
- Mauvais, parce qu’un jeton part à chaque requête, là où ADR-0028 n’en envoyait aucun (C2).
- Mauvais, parce qu’un refus fait pour une autre raison, sous un jeton vivant, déconnecterait le lecteur (C5).
- Neutre, parce que le service décide seul : le jeton dit qui demande, `right` ce qui s’ouvre.

## Avantages et inconvénients des options

### Le jeton porté par le transport, jugé des deux côtés

- Bien, parce qu’une seule place lit le jeton et écrit l’en-tête, pour toutes les routes (C1, C4).
- Bien, parce qu’elle voit ce que la requête portait, seule façon de nommer un jeton mort (C5).
- Bien, parce que `ano` tombe du même geste, au lieu de dire au service qu’il n’y a personne (C1).
- Bien, parce que le juge tend un jeton au client et cherche celui-là seul (C2, C3).
- Mauvais, parce que le transport lit un port de plus, que chaque banc doit tendre (C4).

### Un second client bâti pour les requêtes d’un abonné

- Bien, parce que le client d’ADR-0028 ne changerait pas d’une ligne (C4).
- Mauvais, parce que délai, causes et adresses seraient à tenir deux fois (C4).
- Mauvais, parce que la porte devrait échanger de client en pleine lecture, le jeton arrivant après (C1).
- Mauvais, parce qu’un jeton mort resterait à deviner d’un statut, deux fois (C5).

### Aucun jeton, l’abonné renvoyé vers une vue web

- Bien, parce qu’aucune requête de l’app ne porterait jamais de jeton (C2).
- Mauvais, parce que l’abonné quitterait l’app pour lire ce qu’il paie (C1).
- Mauvais, parce qu’une vue web porterait un témoin de session, que nul juge ne lit (C3).

## Informations complémentaires

- Preuves : R1 à R6 gardent les juges d’ADR-0028, R4 y ajoutant le client qui invente un jeton ; R7 et R8 ont les leurs (`tools/guardrails/src/proofs/transport.ts`).
- R9 n’a pas de juge hors ligne, le magasin du jeton étant celui de l’app : la porte du contenu l’oublie sur la cause que R8 sépare, et les tests de l’app le relisent.
- La clé prêtée qui ouvre la connexion reste hors du client livré, qu’ADR-0032 garde.
- Réévaluation : le service lie un jeton à l’appareil qui l’a obtenu, ou une capture montre une route inconnue.
