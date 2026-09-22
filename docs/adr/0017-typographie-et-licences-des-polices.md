---
format: 1
status: accepted
significance: [dependency, guarded-config, boundary]
---

# Typographie et licences des polices

## Contexte et problème

- Le texte de l’app s’affiche dans la police Overpass, une famille par graisse, et le lecteur peut lui préférer un second jeu de faces (`cat packages/design-tokens/src/tokens.ts`).
- Les polices se chargent au démarrage par expo-font, confiné à la couche app (`cat packages/architecture/src/places.ts`).
- Le splash reste affiché jusqu’au chargement des polices, à la restauration du cache et au premier onLayout (`cat apps/mobile/src/_app/routes/startup-gate.tsx`).
- Overpass, Anton et Atkinson Hyperlegible sont des polices Google sous licence libre, embarquées par @expo-google-fonts (`cat apps/mobile/package.json`).
- Une famille est un token de @huma/design-tokens, jamais une chaîne brute (`cat apps/mobile/src/shared/lib/styles/create-styles.ts`).

Comment donner à l’app ses polices sans laisser une chaîne libre ni une licence non respectée entrer dans le rendu ?

## Critères de décision

- **C1** — Le texte s’affiche dans les polices choisies, une par graisse.
- **C2** — Le chargement natif des polices reste hors des composants.
- **C3** — Une famille de police est un token, pas une chaîne libre.
- **C4** — Une police non redistribuable n’entre pas dans le dépôt.

## Options étudiées

- Polices Google embarquées par @expo-google-fonts, familles en tokens, chargées dans la couche app
- Polices système seulement, sans embarquement
- Toutes les polices versionnées dans le dépôt, licences comprises

## Décision

Option retenue : « Polices Google embarquées par @expo-google-fonts, familles en tokens, chargées dans la couche app », parce que c’est la seule option où le texte porte les polices choisies (C1), où le chargement natif reste hors des composants (C2), et où chaque famille est un token (C3).

- **R1** — expo-font et expo-splash-screen NE DOIVENT PAS être importées hors de la couche app.
- **R2** — Une famille de police DOIT être un token de @huma/design-tokens.

### Conséquences

- Bien, parce que le texte porte enfin les polices de la maquette.
- Bien, parce que le splash attend des polices réellement chargées.
- Mauvais, parce que chaque famille embarquée alourdit le paquet natif.
- Mauvais, parce que le rendu réel des polices attend l’émulateur.

## Avantages et inconvénients des options

### Polices Google embarquées par @expo-google-fonts, familles en tokens, chargées dans la couche app

- Bien, parce qu’Overpass et Anton donnent une graisse par famille (C1).
- Bien, parce qu’expo-font reste confiné à la couche app (C2).
- Bien, parce que chaque famille est un token brandé (C3).
- Bien, parce qu’aucune police non redistribuable n’entre dans le dépôt (C4).

### Polices système seulement, sans embarquement

- Mauvais, parce que le texte perd les polices de la maquette (C1).
- Bien, parce qu’aucune licence n’est à respecter (C4).

### Toutes les polices versionnées dans le dépôt, licences comprises

- Mauvais, parce qu’une police non redistribuable viole sa licence une fois versionnée (C4).
- Bien, parce que chaque famille reste un token (C3).

## Informations complémentaires

- Le rendu réel des polices se vérifie sur l’émulateur, hors de la vérification locale sans appareil.
- Une police display sous licence restrictive se détecte au moment de la configuration et se charge si présente, sans jamais entrer dans le dépôt ; la police d’accessibilité est en place, offerte au lecteur par les préférences d’affichage ; une police d’article s’ajouterait avec l’écran qui la porterait.
- Réévaluation : @expo-google-fonts cesse de suivre les versions d’Expo, ou une police devient indispensable qu’aucune licence libre ne couvre.
