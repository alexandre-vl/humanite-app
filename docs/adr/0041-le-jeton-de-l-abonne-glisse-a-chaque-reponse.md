---
format: 1
status: accepted
significance: [guarded-config, boundary]
---

# Le jeton de l’abonné glisse à chaque réponse

## Contexte et problème

- Le jeton d’usager vit deux heures : `exp − iat = 7200` dans chacun des jetons des quatre captures du client officiel (`~/Downloads/filtered_domains_09-2*.har`).
- Mesuré le 27/09/2026 contre le service : sous un jeton vivant, `wordpress/home`, `homepage`, `{id}/posts/`, `post/{id}` et `article/search` rendent dans l’en-tête `x-user-token` un jeton neuf, du même abonné et du même appareil, valable deux heures de plus ; `wordpress/menu` n’en rend aucun.
- Mesuré le même jour : un jeton remplacé répond jusqu’à son échéance ; un jeton échu rend `403`, code 1000 « Token expired ».
- Le client officiel reprend l’en-tête de chaque réponse qui réussit (`tokenFromHeader`, `dist.zip` 3.87.0).
- Le client du dépôt ne lit aucun en-tête de réponse : `apps/mobile/src/shared/api/source.service.ts` ne rend au client que le statut et le corps.
- ADR-0033 R9 oublie un jeton qu’un `403` dénonce, et ce qui suit le jeton vide le journal gardé (`apps/mobile/src/_app/model/paper.ts`).

Comment l’abonné qui lit cesse-t-il d’être déconnecté deux heures après sa connexion ?

## Critères de décision

- **C1** — l’abonné qui lit n’est pas déconnecté pendant sa lecture
- **C2** — aucune requête ne porte un jeton qu’aucune connexion de ce lecteur n’a gagné
- **C3** — le journal déjà lu survit à un renouvellement
- **C4** — un jeton repris survit à l’arrêt de l’app
- **C5** — chaque règle a son juge hors ligne

## Options étudiées

- Le jeton repris par le transport, jugé des deux côtés
- Le jeton repris par la porte du contenu de l’app
- Aucun jeton repris, l’abonné se reconnecte

## Décision

Option retenue : « Le jeton repris par le transport, jugé des deux côtés », parce que la place qui écrit l’en-tête d’une requête est seule à savoir ce qu’elle portait — sans quoi un jeton rendu à personne vaut un jeton gagné (C2) — et parce que le juge du paquet y rejoue chaque route (C5).

- **R1** — Le client DOIT reprendre le jeton que le service rend dans `x-user-token`, à une requête portée par le jeton de ce lecteur.
- **R2** — Le client NE DOIT PAS reprendre un jeton rendu à une requête qui n’en portait aucun.
- **R3** — Un jeton repris NE DOIT PAS se lire comme un changement de lecteur.
- **R4** — Un jeton repris DOIT être gardé là où l’est celui qu’une connexion gagne.
- **R5** — Un jeton repris NE DOIT PAS remplacer un autre jeton que celui à la place duquel le service l’a rendu.

### Conséquences

- Bien, parce qu’un abonné qui lit porte un jeton qui a toujours deux heures devant lui, là où il expirait jusqu’ici deux heures après la connexion (C1).
- Bien, parce que le transport voit ce que la requête portait : un jeton rendu à personne est refusé là même où il arrive (C2).
- Bien, parce qu’un renouvellement ne prévient aucun observateur : le journal lu reste en cache et sur le disque, là où un changement de lecteur les vide (C3).
- Bien, parce que le jeton repris s’écrit au trousseau comme celui d’une connexion : un téléphone qui redémarre reprend le dernier, et non celui du login (C4).
- Bien, parce que le juge rend un jeton neuf sur chaque route, et nomme qui l’ignore comme qui le prend sans l’avoir gagné (C5).
- Mauvais, parce qu’une écriture au trousseau, synchrone, a lieu à chaque glissement, là où il n’y en avait qu’à la connexion (C4).
- Mauvais, parce qu’une pause de plus de deux heures déconnecte toujours : le service n’ouvre alors que `POST /user/login`, et l’app ne garde pas de quoi l’appeler (C1).
- Neutre, parce qu’ADR-0033 R9 ne change pas : un jeton qu’un `403` dénonce est toujours oublié.

## Avantages et inconvénients des options

### Le jeton repris par le transport, jugé des deux côtés

- Bien, parce qu’une seule place lit l’en-tête, pour toutes les routes, celle qui a écrit le jeton de la requête (C2).
- Bien, parce que le juge du paquet tend un jeton neuf à chaque route, sous un lecteur puis sous personne (C5).
- Bien, parce que le lecteur de l’app décide seul si le jeton repris remplace le sien (C3, C4).
- Mauvais, parce que la réponse du transport porte un en-tête de plus, que chaque banc doit rendre (C5).

### Le jeton repris par la porte du contenu de l’app

- Bien, parce que le client du paquet ne changerait pas d’une ligne (C5).
- Mauvais, parce que la porte ne voit pas ce que la requête portait : elle reprendrait un jeton rendu à personne (C2).
- Mauvais, parce qu’aucun banc hors ligne ne la juge, le jeton étant le magasin de l’app (C5).

### Aucun jeton repris, l’abonné se reconnecte

- Bien, parce que rien ne change, et qu’aucun en-tête de réponse n’est lu (C2).
- Mauvais, parce que l’abonné est déconnecté deux heures après sa connexion, en pleine lecture (C1).
- Mauvais, parce que la déconnexion vide le journal qu’il venait de lire (C3).

## Informations complémentaires

- Preuves : R1 et R2 par `transport/renewal-dropped` et `transport/renewal-unearned` (`tools/guardrails/src/proofs/transport.ts`) ; R3 à R5 par `reader.test.ts`, `source.service.test.ts` et `paper.test.ts` — aucun banc hors ligne ne les juge, le magasin du jeton étant celui de l’app.
- Réévaluation : le service ouvre à l’application 300 une route qui rend un jeton sans mot de passe, rend un jeton de plus de deux heures, ou lie un jeton à l’appareil qui l’a obtenu.
