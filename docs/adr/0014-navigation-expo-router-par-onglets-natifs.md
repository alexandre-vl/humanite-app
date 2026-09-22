---
format: 1
status: accepted
significance: [guarded-config, reversal-cost]
---

# Navigation Expo Router par onglets natifs

## Contexte et problème

- Les routes vivent dans `apps/mobile/app`, où Expo Router traite chaque fichier comme une route (`cat packages/architecture/src/places.ts`).
- La barre d’onglets se compose avec `NativeTabs`, exporté par `expo-router/unstable-native-tabs` (`cat apps/mobile/src/_app/routes/tabs-layout.tsx`).
- Une mise en page déclare ses écrans par leur nom de route et n’importe aucune page (`cat packages/architecture/src/places.ts`).
- Une règle de lint refuse les onglets JavaScript d’Expo Router (`cat packages/eslint-config/src/policies.ts`).
- Le spike 0a a lancé Expo Router et sa pile native sur l’émulateur ([journal 0a](../spikes/phase-0a.md)).

Comment imposer une barre d’onglets native sans quitter le routage par fichiers d’Expo Router ?

## Critères de décision

- **C1** — Les onglets sont rendus par les composants natifs de chaque plateforme.
- **C2** — Un outil refuse de composer les onglets en JavaScript.
- **C3** — L’arborescence de fichiers reste la source des écrans.
- **C4** — La barre suit les conventions de chaque plateforme.

## Options étudiées

- Les onglets natifs d’Expo Router
- Les onglets JavaScript d’Expo Router
- Une barre d’onglets maison en primitives

## Décision

Option retenue : « Les onglets natifs d’Expo Router », parce que c’est la seule option où les onglets sont natifs (C1), qu’un outil y refuse les onglets JavaScript (C2), où l’arborescence reste la source des écrans (C3) et où la barre suit les conventions de chaque plateforme (C4).

- **R1** — Le code NE DOIT PAS importer les onglets JavaScript d’Expo Router.
- **R2** — La barre d’onglets DOIT être composée avec NativeTabs d’Expo Router.

### Conséquences

- Bien, parce que les onglets suivent le système de chaque plateforme.
- Bien, parce qu’un outil refuse une barre d’onglets JavaScript.
- Mauvais, parce que NativeTabs est une API alpha d’Expo Router, sujette à changer.

## Avantages et inconvénients des options

### Les onglets natifs d’Expo Router

- Bien, parce que NativeTabs rend les onglets par UITabBar et la barre Material (C1).
- Bien, parce que l’arborescence de fichiers reste la source des écrans (C3).
- Bien, parce que la barre suit les conventions de chaque plateforme (C4).

### Les onglets JavaScript d’Expo Router

- Mauvais, parce que les onglets sont dessinés en JavaScript, non natifs (C1).
- Mauvais, parce qu’un outil refuse leur import (C2).

### Une barre d’onglets maison en primitives

- Mauvais, parce que rien ne garantit un rendu natif (C1).
- Mauvais, parce que la barre s’écarte des conventions de chaque plateforme (C4).

## Informations complémentaires

- Les piles restent composées avec `Stack`, la pile native stable d’Expo Router, décidée au socle.
- Réévaluation : NativeTabs quitte le statut alpha avec des ruptures, ou Expo Router change la composition des onglets.
