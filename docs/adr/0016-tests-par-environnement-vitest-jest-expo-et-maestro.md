---
format: 1
status: proposed
significance: [dependency, guarded-config]
---

# Tests par environnement Vitest jest-expo et Maestro

## Contexte et problème

- Les paquets et les outils sont testés par Vitest, qui ne rend pas les composants natifs (`cat vitest.config.ts`).
- Les composants et la logique de l’app sont testés par jest-expo et RNTL (`cat apps/mobile/jest.config.cjs`).
- Les tests de l’app s’exécutent comme une étape de la vérification (`cat tools/governance/src/commands.ts`).
- Un test focalisé est refusé par le lint (`cat packages/eslint-config/src/index.ts`).
- react-native-mmkv atteint son module natif à l’import, hors de portée d’un exécuteur sans appareil (`cat apps/mobile/jest.setup.ts`).

Comment donner à l’app des tests exécutables sans imposer un seul exécuteur à tous les environnements ?

## Critères de décision

- **C1** — Les composants natifs de l’app se rendent sous test.
- **C2** — Les tests s’exécutent à chaque vérification, sans étape manuelle.
- **C3** — Chaque environnement garde l’outil qui le sait.
- **C4** — Un test focalisé ne masque pas le reste de la suite.

## Options étudiées

- Vitest pour les paquets et les outils, jest-expo et RNTL pour l’app, Maestro pour les parcours
- Un seul exécuteur Vitest pour tout le dépôt
- Un seul exécuteur jest-expo pour tout le dépôt

## Décision

Option retenue : « Vitest pour les paquets et les outils, jest-expo et RNTL pour l’app, Maestro pour les parcours », parce que c’est la seule option où l’app rend ses composants natifs sous test (C1), où les tests tournent à chaque vérification (C2), et où chaque environnement garde l’outil qui le sait (C3).

- **R1** — Un test focalisé NE DOIT PAS être commité.
- **R2** — Les composants et la logique de l’app DOIVENT être testés par jest-expo et RNTL.
- **R3** — Les tests de l’app DOIVENT s’exécuter dans la vérification.

### Conséquences

- Bien, parce que la pile de données et les composants ont enfin une couverture exécutable.
- Bien, parce que chaque test tourne à chaque commit, le pre-commit rejouant la vérification.
- Mauvais, parce que la vérification s’allonge du temps de transformation React Native de jest-expo.
- Mauvais, parce que le rendu réel sur appareil reste hors de ces tests et attend l’émulateur.

## Avantages et inconvénients des options

### Vitest pour les paquets et les outils, jest-expo et RNTL pour l’app, Maestro pour les parcours

- Bien, parce que jest-expo rend les composants natifs de l’app avec les mocks d’Expo (C1).
- Bien, parce que les tests tournent dans la vérification, donc à chaque commit (C2).
- Bien, parce que chaque environnement garde l’outil qui le sait (C3).
- Bien, parce que le lint refuse déjà un test focalisé (C4).

### Un seul exécuteur Vitest pour tout le dépôt

- Mauvais, parce que Vitest ne rend pas les composants natifs de l’app avec les mocks d’Expo (C1).
- Mauvais, parce que les composants perdraient l’outil qui les sait rendre (C3).

### Un seul exécuteur jest-expo pour tout le dépôt

- Bien, parce que jest-expo rendrait aussi les composants natifs de l’app (C1).
- Mauvais, parce que l’environnement React Native de jest-expo ne convient pas aux paquets et outils Node (C3).

## Informations complémentaires

- Le rendu natif réel et le parcours Maestro « lancement » se vérifient sur l’émulateur, hors de la vérification locale, qui reste sans appareil.
- react-native-mmkv atteint son module natif à l’import ; un mock en mémoire le remplace sous jest, la pile de données gardant son aller-retour réel pour l’émulateur.
- Les tests de l’app vivent à côté du code qu’ils couvrent, sous les mêmes règles de couches que lui.
- Réévaluation : jest-expo cesse de suivre les versions d’Expo, ou un exécuteur unique sait à la fois rendre les composants natifs et tester les paquets Node.
