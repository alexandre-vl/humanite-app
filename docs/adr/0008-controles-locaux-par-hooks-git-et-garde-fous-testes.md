---
format: 1
status: accepted
significance: [guarded-config]
---

# Contrôles locaux par hooks git et garde-fous testés

## Contexte et problème

- Les hooks git du dépôt sont des programmes TypeScript de `tools/git-hooks`, sans lefthook ni commitlint (`cat tools/git-hooks/package.json`).
- `pnpm hooks:check` vérifie les hooks git et Claude Code installés ainsi que l’historique des messages (`pnpm hooks:check`).
- Le pre-commit fait passer `pnpm verify` sur l’arbre indexé, l’index devant égaler l’arbre de travail (`cat tools/git-hooks/src/flows.ts`).
- Le commit-msg exige Conventional Commits et un trailer Refs par ADR accepté dont le périmètre couvre un chemin du commit (`cat tools/git-hooks/src/message.ts`).
- Chaque garde-fou casse une chose et produit exactement ses codes, sous des tests de couverture et de mutation (`pnpm test`).

Comment rendre les contrôles infranchissables en local, sans CI distante ?

## Critères de décision

- **C1** — Aucun contrôle ne peut être sauté à l’écriture de l’historique.
- **C2** — Le message de commit suit un format vérifié.
- **C3** — Chaque décision structurante est citée par le commit qui la touche.
- **C4** — Chaque règle est prouvée par une fixture qui la déclenche.

## Options étudiées

- Des hooks git maison typés et des garde-fous testés
- lefthook et commitlint
- Une CI distante
- Des contrôles conseillés, non bloquants

## Décision

Option retenue : « Des hooks git maison typés et des garde-fous testés », parce que c’est la seule option qui empêche de sauter un contrôle (C1), impose le format du message (C2), cite l’ADR touché (C3) et prouve chaque règle par une fixture (C4).

- **R1** — Le message d’un commit DOIT suivre Conventional Commits, avec un type et une portée connus.
- **R2** — Un commit DOIT citer par un trailer Refs chaque ADR accepté dont le périmètre couvre un de ses chemins.
- **R3** — Les hooks git du dépôt DOIVENT être installés et exécutés à chaque écriture de l’historique.
- **R4** — Le pre-commit DOIT faire passer sur l’arbre indexé chaque étape de `pnpm verify` que les chemins du commit concernent, l’index égalant l’arbre de travail.
- **R5** — Chaque garde-fou DOIT être prouvé par une fixture qui casse une chose et produit exactement ses codes.
- **R6** — L’historique git NE DOIT PAS être réécrit pour effacer un commit passé sous contrôle.

### Conséquences

- Bien, parce qu’aucun commit n’échappe aux contrôles.
- Bien, parce qu’une règle non prouvée ne compte pas.
- Mauvais, parce que les contrôles tournent à chaque commit, sans parallélisme distant.

## Avantages et inconvénients des options

### Des hooks git maison typés et des garde-fous testés

- Bien, parce que le pre-commit refuse un arbre non vérifié (C1).
- Bien, parce que le commit-msg impose le format (C2).
- Bien, parce que le trailer Refs cite l’ADR touché (C3).
- Bien, parce que chaque garde-fou a une fixture qui le déclenche (C4).

### lefthook et commitlint

- Mauvais, parce qu’une variable d’environnement suffit à les sauter (C1).

### Une CI distante

- Mauvais, parce que le contrôle sort de la machine locale (C1).

### Des contrôles conseillés, non bloquants

- Mauvais, parce qu’un commit non conforme passe (C2).

## Informations complémentaires

- Les permissions qui empêchent un agent de contourner ces hooks relèvent d’un ADR propre.
- Une étape ne concerne pas un commit quand elle ne peut pas lire ce qu’il change, ce que chaque étape déclare par les chemins auxquels elle est aveugle — et non par ceux qu’elle juge, une liste de lectures devant être exhaustive pour être sûre alors qu’une liste d’angles morts laisse tourner tout ce à quoi personne n’a pensé (`tools/governance/src/commands.ts`). `pnpm verify` lancé à la main ne reçoit aucune liste et lance donc la totalité.
- Réévaluation : le dépôt adopte une CI distante, ou les hooks maison deviennent trop lents à chaque commit.
