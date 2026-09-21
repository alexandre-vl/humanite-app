---
format: 1
status: accepted
significance: [dependency, guarded-config]
---

# Monorepo pnpm à catalog strict et versions Expo contrôlées

## Contexte et problème

- Le dépôt réunit `apps/*`, `packages/*` et `tools/*` dans un seul workspace pnpm (`cat pnpm-workspace.yaml`).
- Le workspace épingle chaque dépendance tierce en version exacte dans un catalog, en `catalogMode: strict` (`cat pnpm-workspace.yaml`).
- `package.json` fixe `packageManager` à pnpm 11.26.0 et `devEngines.runtime` à Node 24.17.0 en `onFail: download` (`cat package.json`).
- `pnpm deps:check` compare manifestes, catalog, références TypeScript et lockfile, et tient `apps/mobile` aux plages de `bundledNativeModules.json` d’Expo (`pnpm deps:check`).
- Le spike 0a a confirmé que `catalog:` et `expo prebuild` fonctionnent ensemble, `allowBuilds` maîtrisant les scripts d’installation ([journal 0a](../spikes/phase-0a.md)).

Comment garantir une seule version contrôlée par dépendance sur tout le monorepo, sans dépendre de l’environnement ?

## Critères de décision

- **C1** — Une seule version vaut pour une dépendance dans tout le dépôt.
- **C2** — Les modules natifs restent alignés sur ce qu’Expo teste ensemble.
- **C3** — Les versions de l’outillage tiennent dans le dépôt, pas dans l’environnement.
- **C4** — Une commande locale vérifie l’ensemble.

## Options étudiées

- Monorepo pnpm à catalog strict
- Workspaces npm ou yarn sans catalog
- Versions déclarées paquet par paquet
- Un gestionnaire d’outils externe pour Node et pnpm

## Décision

Option retenue : « Monorepo pnpm à catalog strict », parce que c’est la seule option qui donne une version par dépendance (C1), garde les modules Expo dans leurs plages (C2), fixe l’outillage dans le dépôt (C3) et se vérifie en local (C4).

- **R1** — Le catalog pnpm DOIT porter la version exacte de chaque dépendance tierce, en `catalogMode: strict`.
- **R2** — Un manifeste NE DOIT PAS déclarer, pour une dépendance, une version absente du catalog ou différente de celle d’un autre paquet.
- **R3** — Chaque module natif d’Expo DOIT rester dans la plage que `bundledNativeModules.json` fixe pour la version d’Expo du catalog.
- **R4** — Une dépendance interne DOIT être référencée par `workspace:*` et une dépendance tierce par `catalog:`.
- **R5** — Chaque paquet DOIT vivre sous un dossier de la politique de dépendances et limiter ses dépendances aux dossiers qu’elle ouvre au sien.
- **R6** — Un paquet DOIT déclarer les pairs obligatoires de ses dépendances directes.
- **R7** — La politique de dépendances DOIT limiter ses entrées aux paquets installés.

### Conséquences

- Bien, parce qu’une seule version par dépendance supprime les conflits de résolution.
- Bien, parce que `pnpm deps:check` échoue en local avant qu’un écart soit commité.
- Mauvais, parce que chaque changement de version passe par le catalog et son contrôle.

## Avantages et inconvénients des options

### Monorepo pnpm à catalog strict

- Bien, parce que le catalog est la source unique des versions (C1).
- Bien, parce que `deps:check` relie chaque module Expo à sa plage testée (C2).
- Bien, parce que `packageManager` et `devEngines` fixent Node et pnpm dans le dépôt (C3).
- Bien, parce que `pnpm deps:check` juge l’ensemble en local (C4).

### Workspaces npm ou yarn sans catalog

- Mauvais, parce que rien n’impose une version unique par dépendance (C1).

### Versions déclarées paquet par paquet

- Mauvais, parce que deux paquets divergent sans que rien le voie (C1).

### Un gestionnaire d’outils externe pour Node et pnpm

- Mauvais, parce que les versions de l’outillage vivent hors du dépôt (C3).

## Informations complémentaires

- Node et pnpm sont fixés par `packageManager` et `devEngines`, jamais par l’environnement ; un paquet publié depuis moins que `minimumReleaseAge` n’est pas installé, et `allowBuilds` autorise nommément les rares scripts d’installation (`cat pnpm-workspace.yaml`).
- Réévaluation : pnpm publie une version stable qui change le comportement du catalog strict ou de `minimumReleaseAge`.
