---
format: 1
status: proposed
significance: [guarded-config, boundary, data-format]
---

# Textes UI en dictionnaire français typé

## Contexte et problème

- Le texte de l’interface est en français et tient dans un dictionnaire unique (`cat apps/mobile/src/shared/i18n/fr.ts`).
- `DisplayText` est une marque des contrats, comme les identifiants le sont (`cat packages/contracts/src/display-text.ts`, ADR-0011).
- Une primitive est le seul code qui rend une vue de texte de react-native (ADR-0006).
- cspell ne vérifie pas les chaînes : un texte écrit en clair passe le lint (`cat packages/eslint-config/src/spelling.ts`).

Comment garantir qu’un texte affiché vienne du dictionnaire, d’un formateur ou d’un contrat, jamais d’une chaîne écrite en clair dans le JSX ?

## Critères de décision

- **C1** — Un texte affiché vient d’une source sanctionnée — dictionnaire, formateur, contrat —, jamais d’une chaîne brute.
- **C2** — Le texte de l’interface a une source unique, en français.
- **C3** — Une primitive de texte n’accepte pas une chaîne quelconque.

## Options étudiées

- DisplayText brandé et dictionnaire t()
- Des chaînes libres dans le JSX
- Une bibliothèque i18n de l’écosystème
- Le texte en clair, relu par cspell

## Décision

Option retenue : « DisplayText brandé et dictionnaire t() », parce que c’est la seule option qui n’admet qu’une source sanctionnée (C1), donne au texte une source unique en français (C2) et ferme la prop `children` d’une primitive de texte à toute autre chaîne (C3).

- **R1** — Un texte affiché DOIT être un `DisplayText`, que produisent `t()`, les formateurs et les champs de prose des contrats.
- **R2** — Le texte qu’une primitive de texte reçoit DOIT être le type `DisplayText`, qu’elle le prenne en `children` ou en fragments d’une phrase.
- **R3** — Un texte brut, hors espaces, NE DOIT PAS paraître dans le JSX.

### Conséquences

- Bien, parce qu’un texte hors du dictionnaire, d’un formateur ou d’un contrat ne compile pas.
- Bien, parce qu’un seul fichier français porte le texte de l’interface.
- Mauvais, parce qu’un texte ponctuel demande une clé du dictionnaire plutôt qu’une chaîne en ligne.

## Avantages et inconvénients des options

### DisplayText brandé et dictionnaire t()

- Bien, parce que `DisplayText` n’a que trois producteurs et qu’une chaîne brute n’en est pas un (C1).
- Bien, parce que `fr.ts` est la source unique du texte de l’interface (C2).
- Bien, parce que `DisplayText` est opaque : une primitive refuse une chaîne quelconque (C3).
- Mauvais, parce qu’il faut déclarer chaque texte dans le dictionnaire avant de l’employer (C2).

### Des chaînes libres dans le JSX

- Mauvais, parce qu’une chaîne en ligne échappe au dictionnaire comme à toute source (C1, C2).

### Une bibliothèque i18n de l’écosystème

- Mauvais, parce que ses clés ne sont pas vérifiées par le compilateur et qu’elle ajoute un runtime (C1, C3).

### Le texte en clair, relu par cspell

- Mauvais, parce que cspell ne vérifie pas les chaînes : rien ne retient un texte brut (C1).

## Informations complémentaires

- L’interdiction d’un texte brut dans le JSX est prouvée par une fixture des garde-fous ; R1 et R2 sont des conventions que le système de types tient.
- Un texte du dictionnaire peut laisser des blancs, et les noms de ces blancs sont lus dans le français lui-même : un blanc non rempli, une valeur sans blanc pour la prendre et un nom mal écrit sont refusés à la compilation. C’est ce qui permet d’écrire une phrase autour d’un nombre ou d’un mot du lecteur sans la composer hors du dictionnaire. L’accord au nombre est écrit une fois, à côté : le singulier français court jusqu’à un inclus, et Hermes n’a pas de quoi le demander.
- Réévaluation : Expo fournit une API i18n typée équivalente, ou le dictionnaire grossit au point d’être découpé par domaine.
