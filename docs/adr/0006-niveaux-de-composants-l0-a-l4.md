---
format: 1
status: proposed
significance: [guarded-config, boundary]
---

# Niveaux de composants L0 à L4

## Contexte et problème

- Chaque place porte un niveau de L0 à L4 et la liste de ce qu’elle importe (`cat packages/architecture/src/places.ts`).
- boundaries fait respecter ces imports, par niveau et par place (`cat packages/eslint-config/src/index.ts`).
- Les vues de React Native et les bibliothèques natives ne s’importent que depuis les primitives L0, `Platform` excepté (`cat packages/architecture/src/places.ts`).
- Les variantes `.ios` et `.android` ne sont permises que dans les primitives, ce que check-file vérifie (`cat packages/eslint-config/src/index.ts`).
- Le spike 0a a fixé ces niveaux et le résolveur de boundaries ([journal 0a](../spikes/phase-0a.md)).

Comment ranger les composants par niveaux et forcer les imports à n’aller que vers le bas ?

## Critères de décision

- **C1** — Les imports vont uniquement vers un niveau inférieur.
- **C2** — Une unité n’est atteinte que par son entrée publique.
- **C3** — Un seul niveau touche les vues natives.
- **C4** — Les variantes de plateforme restent confinées.

## Options étudiées

- Des niveaux L0 à L4 avec imports descendants vérifiés par boundaries
- Des composants sans niveaux
- Des niveaux tenus par convention, non vérifiés
- Les vues natives autorisées à tout niveau

## Décision

Option retenue : « Des niveaux L0 à L4 avec imports descendants vérifiés par boundaries », parce que c’est la seule option où l’import ne va que vers le bas (C1), où l’entrée publique est la seule voie (C2), où un seul niveau touche le natif (C3) et où les variantes restent confinées (C4).

- **R1** — Un import DOIT aller vers un niveau inférieur ou un segment partagé.
- **R2** — Un import NE DOIT PAS contourner l’entrée publique d’une unité.
- **R3** — Seules les primitives L0 DOIVENT importer les vues de React Native et les bibliothèques natives.
- **R4** — Seule une primitive L0 DOIT porter une variante de plateforme `.ios` ou `.android`.

### Conséquences

- Bien, parce que la dépendance entre niveaux est jugée par un outil.
- Bien, parce qu’un accès natif hors L0 est refusé.
- Mauvais, parce qu’un composant mal placé doit être déplacé, pas contourné.

## Avantages et inconvénients des options

### Des niveaux L0 à L4 avec imports descendants vérifiés par boundaries

- Bien, parce que boundaries refuse un import montant (C1).
- Bien, parce que l’entrée publique d’une unité est la seule voie (C2).
- Bien, parce que seules les primitives touchent React Native (C3).
- Bien, parce que les variantes de plateforme restent en L0 (C4).

### Des composants sans niveaux

- Mauvais, parce que rien n’empêche un import montant (C1).

### Des niveaux tenus par convention, non vérifiés

- Mauvais, parce qu’une convention non outillée dérive (C1).

### Les vues natives autorisées à tout niveau

- Mauvais, parce que l’accès natif se disperse hors de L0 (C3).

## Informations complémentaires

- Les segments partagés `api`, `config`, `i18n` et `lib` n’ont pas de niveau et s’importent selon la table des places.
- Réévaluation : un besoin d’interface impose un niveau de plus ou un accès natif hors des primitives.
