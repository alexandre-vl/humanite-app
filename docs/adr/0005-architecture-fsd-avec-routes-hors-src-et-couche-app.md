---
format: 1
status: accepted
significance: [guarded-config, boundary]
---

# Architecture FSD avec routes hors src et couche _app

## Contexte et problème

- Les routes vivent dans `apps/mobile/app` et les couches Feature-Sliced dans `apps/mobile/src` (`cat packages/architecture/src/app.ts`).
- La couche app est préfixée `_app`, que Steiger résout, pour ne pas créer de dossier `src/app` qui masquerait les routes d’Expo Router (`cat tools/structure/src/steiger.ts`).
- `pnpm structure:check` vérifie la structure Feature-Sliced avec Steiger et cherche les cycles d’imports (`pnpm structure:check`).
- boundaries refuse un fichier hors de toute place ainsi qu’un `export *` (`cat packages/eslint-config/src/index.ts`).
- Le spike 0a a fixé cette disposition des couches et le résolveur de boundaries ([journal 0a](../spikes/phase-0a.md)).

Comment imposer une architecture en couches vérifiée, sans que les routes et les couches se chevauchent ?

## Critères de décision

- **C1** — Les couches et leurs dépendances sont vérifiées par un outil.
- **C2** — Les routes ne se mélangent pas aux couches.
- **C3** — Chaque unité s’expose par une entrée publique unique.
- **C4** — Aucun cycle d’imports ne se cache.

## Options étudiées

- FSD avec les routes dans app et une couche _app
- FSD avec un dossier src/app
- Une structure libre par dossier de fonctionnalité
- Le routage par code sans arborescence de fichiers

## Décision

Option retenue : « FSD avec les routes dans app et une couche _app », parce que c’est la seule option que Steiger vérifie (C1), qui garde les routes hors des couches (C2), impose une entrée publique unique (C3) et interdit les cycles (C4).

- **R1** — Les couches Feature-Sliced DOIVENT respecter la structure que Steiger vérifie.
- **R2** — Un fichier suivi DOIT appartenir à une place de l’architecture.
- **R3** — Une unité DOIT s’exposer par sa seule entrée publique, sans `export *`.
- **R4** — Le graphe d’imports de l’app DOIT rester acyclique.
- **R5** — Une route DOIT réexporter sa page et exporter un ErrorBoundary, sans autre contenu.

### Conséquences

- Bien, parce que la structure est jugée par un outil, pas par une relecture.
- Bien, parce qu’un fichier égaré ou un cycle est refusé avant le commit.
- Mauvais, parce que la disposition des couches est imposée, sans liberté locale.

## Avantages et inconvénients des options

### FSD avec les routes dans app et une couche _app

- Bien, parce que Steiger vérifie chaque couche (C1).
- Bien, parce que les routes restent hors de `src` (C2).
- Bien, parce que chaque unité s’expose par son `index.ts` (C3).
- Bien, parce que dependency-cruiser refuse tout cycle (C4).

### FSD avec un dossier src/app

- Mauvais, parce que `src/app` masquerait les routes d’Expo Router (C2).

### Une structure libre par dossier de fonctionnalité

- Mauvais, parce qu’aucun outil ne juge la structure (C1).

### Le routage par code sans arborescence de fichiers

- Mauvais, parce que les routes et les couches se mélangent (C2).

## Informations complémentaires

- Les niveaux de composants et la direction des imports entre eux relèvent d’un ADR propre ; celui-ci ne fixe que les couches, leurs entrées et l’absence de cycles.
- Réévaluation : Expo Router change la façon dont il découvre les routes, ou Steiger cesse d’être maintenu.
