---
format: 1
status: proposed
significance: [boundary, reversal-cost]
---

# Visionneuse de photographies native sur Android

## Contexte et problème

- [Apple Zoom](https://docs.expo.dev/router/advanced/zoom-transition/) ne fournit la transition depuis la photographie que sur iOS 18 et suivants. Android utilise la navigation ordinaire.
- Les [modules Expo locaux](https://docs.expo.dev/modules/get-started/) permettent de monter une vue Kotlin depuis React Native, sans maintenir le dossier Android généré.
- La photographie et sa légende sont réunies dans `apps/mobile/src/entities/article/ui/article-figure.tsx`.

Comment conserver sur Android la continuité entre une photographie dans l’article et son agrandissement manipulable au doigt ?

## Critères de décision

- **C1** — l’ouverture et la fermeture conservent la position et le cadrage de la photographie
- **C2** — les gestes et les animations fonctionnent sur le fil natif, avec le retour système
- **C3** — la vue libère ses ressources lorsque l’article disparaît ou que sa cellule est réutilisée
- **C4** — l’intégration respecte la frontière des primitives et les autres plateformes

## Options étudiées

- Vue Android dans un module Expo local
- Transition partagée expérimentale de Reanimated
- Navigation ordinaire vers une modal React Native

## Décision

Option retenue : « Vue Android dans un module Expo local », parce que les matrices et le découpage de la photographie peuvent être animés depuis sa vue source (C1), avec les détecteurs de gestes Android (C2).

- **R1** — L’accès JavaScript au module DOIT rester dans la primitive image.
- **R2** — La vue native DOIT retirer sa surcouche et restaurer les barres système et l’accessibilité lors de sa destruction.
- **R3** — La source DOIT rester montée pendant l’ouverture de la visionneuse.
- **R4** — Le décodage de la photographie agrandie DOIT borner ses dimensions.

### Conséquences

- Bien, parce que le pincement, le double tap et le déplacement utilisent les détecteurs et l’inertie Android (C2).
- Bien, parce que la cellule source possède la durée de vie de la visionneuse (C3).
- Mauvais, parce qu’une modification Kotlin exige de reconstruire le dev client et de qualifier les gestes sur appareil (C4).
- Mauvais, parce que les interfaces natives de zoom restent à entretenir sur deux plateformes (C4).

## Avantages et inconvénients des options

### Vue Android dans un module Expo local

- Bien, parce qu’une activité native permet au retour prédictif de suivre le doigt sans changer la navigation React Native (C1, C2).
- Bien, parce que la cellule source peut fermer l’activité et libérer sa requête dès son démontage (C3).
- Mauvais, parce que le module ajoute du code Kotlin et un contrat de propriétés avec TypeScript (C4).

### Transition partagée expérimentale de Reanimated

- Bien, parce que la transition se décrit dans la couche React Native (C4).
- Mauvais, parce que sa documentation la déconseille encore en production, ce qui fragilise le retour vers la source (C1).

### Navigation ordinaire vers une modal React Native

- Bien, parce que la visionneuse gestuelle existe déjà (C4).
- Mauvais, parce que la navigation Android ne conserve pas la continuité avec la photographie source (C1).

## Informations complémentaires

- Module : `apps/mobile/modules/picture-viewer` ; adaptateur : `apps/mobile/src/shared/ui/primitives/image/native-picture.android.tsx`.
- Glide utilise la même version que `expo-image` ; cette concordance est à vérifier lors des montées de version Expo.
- Réévaluation : disponibilité d’une transition Android stable dans Expo Router qui conserve les gestes, l’accessibilité et le retour interactif.
