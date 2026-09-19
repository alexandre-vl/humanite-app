---
format: 1
status: proposed
significance: [guarded-config, boundary]
---

# Une porte unique valide les paramètres d'une route

## Contexte et problème

- Une route rend ses paramètres en chaînes, une par nom ou plusieurs, sans garantir ni leur présence ni leur forme ([paramètres d’URL](https://docs.expo.dev/router/reference/url-parameters/)).
- Une place n’interdit un paquet externe que si une table le nomme : tout autre est importable de partout (`cat packages/eslint-config/src/boundaries.ts`).
- Les identifiants du domaine sont des chaînes marquées qu’un seul analyseur produit (ADR-0011).
- Le paquet des contrats est seul à pouvoir déclarer zod, donc l’app n’écrit aucun schéma (`cat tools/governance/src/workspace-manifest.ts`).
- Une route ne porte qu’un réexport de sa page et un ErrorBoundary, sans autre contenu (ADR-0005).

Comment un écran reçoit-il les paramètres de sa route sans jamais en lire un que rien n’a validé ?

## Critères de décision

- **C1** — Un paramètre qu’aucun analyseur n’a lu n’atteint pas le rendu d’un écran.
- **C2** — La validation réemploie les analyseurs des contrats, sans second schéma dans l’app.
- **C3** — Un outil refuse l’écart au lieu de le décrire.

## Options étudiées

- un module de routage qui lit les paramètres, l’écran en tirant ce qu’il veut par un analyseur des contrats
- chaque écran lit les paramètres d’Expo Router lui-même
- un schéma de route déclaré dans l’app, à côté de chaque écran

## Décision

Option retenue : « un module de routage qui lit les paramètres, l’écran en tirant ce qu’il veut par un analyseur des contrats », parce qu’elle seule oblige l’écran à passer par un analyseur pour obtenir le type qu’il déclare (C1), réemploie les marques des contrats sans en écrire d’autres (C2), et se tient par le confinement du paquet et par la place du lecteur (C3).

- **R1** — Expo Router NE DOIT PAS être importée hors de la couche app, des écrans et du module de routage.
- **R2** — Le lecteur de paramètres d’Expo Router NE DOIT PAS être nommé hors du module de routage.
- **R3** — Un écran DOIT obtenir ses paramètres par un analyseur des contrats.

### Conséquences

- Bien, parce qu’un lien profond mal formé échoue chez l’analyseur et tombe sur l’ErrorBoundary de sa route, au lieu de traverser l’écran en chaîne vide.
- Bien, parce qu’un composant sous l’écran ne peut plus naviguer : il rend ce qu’on lui donne et rapporte le geste.
- Mauvais, parce que le confinement d’un paquet se règle par place : un écran et tout module de la place `lib` peuvent importer Expo Router, seul le lecteur de paramètres est tenu au fichier près.
- Mauvais, parce qu’un écran dont un paramètre n’est pas une chaîne marquée n’est tenu que par la relecture.

## Avantages et inconvénients des options

### un module de routage qui lit les paramètres, l’écran en tirant ce qu’il veut par un analyseur des contrats

- Bien, parce que le type marqué qu’un écran déclare ne s’obtient que d’un analyseur (C1).
- Bien, parce que les analyseurs sont ceux des contrats, que l’app ne redéclare pas (C2).
- Bien, parce que la place du paquet et le fichier du lecteur sont l’un et l’autre vérifiés (C3).

### chaque écran lit les paramètres d’Expo Router lui-même

- Bien, parce qu’elle n’ajoute aucun module (C2).
- Mauvais, parce qu’une chaîne brute suffit à rendre l’écran, sans qu’aucun analyseur intervienne (C1).
- Mauvais, parce qu’aucun outil ne distingue la lecture validée de l’autre (C3).

### un schéma de route déclaré dans l’app, à côté de chaque écran

- Bien, parce que le schéma se lit à côté de l’écran qu’il sert (C1).
- Mauvais, parce que l’app ne peut pas déclarer zod, le schéma y serait donc réécrit à la main (C2).
- Mauvais, parce que deux définitions d’un même identifiant dériveraient sans qu’un outil les compare (C2).

## Informations complémentaires

- Le confinement d’un paquet couvre ses sous-chemins : `expo-router/unstable-native-tabs` tombe sous la règle d’`expo-router` (`pnpm lint`).
- La porte prend une fonction de lecture et non un schéma, l’app ne pouvant pas nommer les types de zod (`cat tools/governance/src/workspace-manifest.ts`).
- Réévaluation : Expo Router change la forme de ses paramètres, ou un paramètre de route cesse d’être une chaîne marquée.
