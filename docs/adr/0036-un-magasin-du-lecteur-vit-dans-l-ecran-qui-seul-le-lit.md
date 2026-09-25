---
format: 1
status: accepted
significance: [guarded-config, boundary]
supersedes: [ADR-0024]
---

# Un magasin du lecteur vit dans l’écran qui seul le lit

## Contexte et problème

- ADR-0024 R1 interdit Zustand hors de la couche des actions, et la table des places le fait respecter au lint (`cat packages/architecture/src/places.ts`, `MODULES.zustand`).
- ADR-0005 R1 veut qu’un slice serve à plusieurs autres, et sinon qu’il vive dans le seul qui l’emploie (`pnpm structure:check`, `structure/insignificant-slice`).
- Une référence depuis `_app` ne compte pas : Steiger ne lit pas `_app` comme une couche (`cat tools/structure/src/steiger.ts`, `fsd/typo-in-layer-name`).
- Le 25/09/2026, le magasin de la dernière visite d’En continu, que seul l’écran du fil lisait, a été refusé : « This slice has only one reference in slice "pages/live" » (`pnpm structure:check`).
- Le même jour, la pastille d’Accueil lui a donné un second lecteur réel (`cat apps/mobile/src/features/last-visit/ui/unseen-notice.tsx`) ; rien ne promet qu’un prochain magasin en ait un.
- La couche des pages a déjà cédé une fois devant la même règle : un écran seul à lire une requête la tient dans son propre segment `api` (`cat packages/architecture/src/app.ts`, `QUERY_FILES`).

Où vit un magasin du lecteur qu’un seul écran lit ?

## Critères de décision

- **C1** — l’état du lecteur garde ce qu’ADR-0024 lui assure : clé du registre, version, relecture
- **C2** — un code qu’un seul slice emploie vit dans ce slice
- **C3** — aucun écran ne change pour satisfaire une règle d’architecture
- **C4** — un outil tient les places où un magasin se déclare

## Options étudiées

- Un magasin dans la page qui seule le lit
- Une feature qui tient un magasin échappe à la règle du slice isolé
- Un second lecteur à trouver pour chaque magasin

## Décision

Option retenue : « Un magasin dans la page qui seule le lit », parce qu’elle garde à l’état du lecteur la clé, la version et la relecture d’ADR-0024 (C1), laisse la règle du slice isolé juger un magasin comme tout autre code (C2), n’ajoute rien à l’écran (C3) et tient encore Zustand par une table que le lint fait respecter (C4).

- **R1** — Zustand NE DOIT PAS être importée hors des couches des actions et des pages.
- **R2** — Une clé écrite sur le disque DOIT être déclarée au registre des clés.
- **R3** — Un format persisté DOIT porter une version.
- **R4** — Ce qui revient du disque DOIT être relu valeur par valeur avant d’être servi, par l’analyseur des contrats quand la valeur en est une, et sinon contre la liste close de ce qu’elle peut être.
- **R5** — Un magasin qu’un seul écran lit DOIT vivre dans la page de cet écran.

### Conséquences

- Bien, parce que les règles R2 à R4 d’ADR-0024 sont reprises mot pour mot : un magasin de page s’écrit et se relit comme celui d’une action (C1).
- Bien, parce qu’un magasin qu’un seul écran lit n’a plus à se chercher un second lecteur pour exister (C2, C3).
- Mauvais, parce que deux couches peuvent désormais déclarer un magasin, et la table des places en nomme deux (C4).
- Neutre, parce qu’un second écran ne peut pas lire le magasin d’une page, une page n’important aucune autre page (`cat packages/architecture/src/places.ts`, `IMPORTS`) : le déménagement vers une action est forcé, jamais oublié.

## Avantages et inconvénients des options

### Un magasin dans la page qui seule le lit

- Bien, parce que la règle du slice isolé juge un magasin comme tout autre code, sans exception à tenir (C2).
- Bien, parce que la couche des pages a déjà reçu, pour la même raison, les requêtes qu’un seul écran lit (C4).
- Mauvais, parce que la table des places nomme deux couches pour Zustand au lieu d’une (C4).

### Une feature qui tient un magasin échappe à la règle du slice isolé

- Bien, parce qu’ADR-0024 ne bouge pas (C1).
- Mauvais, parce que Steiger ne connaît pas d’exception par slice : la règle quitterait les preuves d’ADR-0005 pour tout le code, magasin ou non (C2).

### Un second lecteur à trouver pour chaque magasin

- Bien, parce qu’un second lecteur qui sert vraiment le lecteur, comme la pastille d’Accueil, tient les deux règles sans en toucher aucune (C3).
- Mauvais, parce qu’une règle d’architecture n’est pas une raison d’ajouter à un écran, et que le second lecteur le plus naturel, le badge d’un onglet, vivrait dans `_app`, que Steiger ne compte pas (C3).

## Informations complémentaires

- Le magasin de la dernière visite reste une action sous cette décision : deux écrans le lisent, le fil et Accueil (`cat apps/mobile/src/features/last-visit/index.ts`).
- Réévaluation : Steiger lit `_app` comme une couche, un format persisté doit être migré plutôt qu’écarté, ou un magasin demande autre chose qu’une clé, une version et une relecture.
