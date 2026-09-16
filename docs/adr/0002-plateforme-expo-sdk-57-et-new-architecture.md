---
format: 1
status: proposed
significance: [dependency, guarded-config, reversal-cost]
---

# Plateforme Expo SDK 57 et New Architecture

## Contexte et problème

- Le catalog épingle expo 57.0.22, react 19.2.3 et react-native 0.86.3 (`cat pnpm-workspace.yaml`).
- `app.config.ts` active les routes typées et le React Compiler (`cat apps/mobile/app.config.ts`).
- `pnpm expo:types` génère `.expo/types/router.d.ts` depuis le dossier des routes à chaque contrôle, sans réécrire de fichier suivi (`pnpm expo:types`).
- La Nouvelle Architecture est obligatoire et Hermes est le moteur par défaut du SDK 57 ([notes du SDK 57](https://expo.dev/changelog/sdk-57)).
- Le spike 0a a vérifié le SDK 57 sur Redroid : démarrage, imports `.ts` via Metro, MMKV sur Nitro et les APIs absentes de Hermes ([journal 0a](../spikes/phase-0a.md)).

Sur quelle plateforme bâtir l’app mobile, et comment tenir ses versions natives et ses réglages structurants ?

## Critères de décision

- **C1** — Les versions natives sont testées ensemble par l’éditeur du SDK.
- **C2** — L’arborescence de fichiers est la source unique des routes.
- **C3** — Les réglages structurants de la plateforme sont vérifiés en local.
- **C4** — La mémoïsation et le moteur JavaScript sont fixés, pas laissés au hasard.

## Options étudiées

- Expo SDK 57 avec New Architecture et Hermes
- React Native sans Expo
- Expo SDK 58 en préversion
- Une webview dans un cadre hybride

## Décision

Option retenue : « Expo SDK 57 avec New Architecture et Hermes », parce que c’est la seule option qui livre des versions natives testées ensemble (C1), fait de l’arborescence la source des routes (C2), vérifie ses réglages en local (C3) et fixe la mémoïsation et le moteur (C4).

- **R1** — Les versions d’Expo, de React et de React Native DOIVENT rester celles que le SDK 57 teste ensemble.
- **R2** — Les types de routes DOIVENT être générés depuis le dossier des routes, sans qu’Expo réécrive un fichier suivi.
- **R3** — La configuration de l’app DOIT garder les invariants dont dépendent le build et le dev client : un scheme, un identifiant d’application unique, le retour prédictif désactivé, les routes typées et le React Compiler activés, les mises à jour OTA coupées.

### Conséquences

- Bien, parce que les versions natives arrivent testées ensemble par Expo.
- Bien, parce que les routes typées suivent l’arborescence sans intervention.
- Mauvais, parce que le SDK impose son rythme de montées de version.

## Avantages et inconvénients des options

### Expo SDK 57 avec New Architecture et Hermes

- Bien, parce que le SDK teste ses modules natifs ensemble (C1).
- Bien, parce qu’Expo Router fait de l’arborescence la source des routes (C2).
- Bien, parce qu’`expo:types` et le test d’`app.config` vérifient les réglages en local (C3).
- Bien, parce que le React Compiler et Hermes sont fixés par le SDK et la configuration (C4).

### React Native sans Expo

- Mauvais, parce que l’alignement des versions natives retombe sur nous (C1).

### Expo SDK 58 en préversion

- Mauvais, parce qu’une préversion ne tient pas ses versions ensemble (C1).

### Une webview dans un cadre hybride

- Mauvais, parce que l’app perd les contrôles natifs et le routage par fichiers (C2).

## Informations complémentaires

- La Nouvelle Architecture et Hermes sont les défauts du SDK 57 ; l’app ne les redéclare pas et n’ouvre aucune voie de repli vers l’ancienne architecture.
- Réévaluation : Expo publie un SDK stable qui remplace le 57 ou change l’obligation de la Nouvelle Architecture.
