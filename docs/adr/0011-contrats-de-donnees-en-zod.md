---
format: 1
status: proposed
significance: [dependency, guarded-config, data-format]
---

# Contrats de données en Zod

## Contexte et problème

- Le paquet des contrats réunit les schémas de données, les erreurs d’API et les identifiants brandés (`cat packages/contracts/src/index.ts`).
- Zod valide une donnée inconnue et en infère le type ; il est épinglé au catalog en 4.5.4 (`grep zod pnpm-workspace.yaml`).
- Le contrôle des dépendances réserve une dépendance tierce aux paquets qu’une politique autorise (`pnpm deps:check`).
- Le code embarqué dans l’app tient sur les seules API de Hermes V1 (ADR-0002).

Comment définir les données de l’app, les valider à l’exécution et empêcher que chaque paquet réinvente ses types ?

## Critères de décision

- **C1** — Une donnée inconnue est validée avant d’être employée.
- **C2** — Les types, les erreurs et les identifiants de données ont une source unique.
- **C3** — Un identifiant de données ne se confond pas avec une chaîne quelconque.
- **C4** — Le moteur de validation reste confiné à un seul paquet.

## Options étudiées

- Zod dans un paquet de contrats dédié
- Des types TypeScript sans validation à l’exécution
- Un validateur maison
- Zod importé librement par chaque paquet

## Décision

Option retenue : « Zod dans un paquet de contrats dédié », parce que c’est la seule option qui valide chaque donnée inconnue (C1), donne une source unique aux types (C2), brande les identifiants (C3) et confine le moteur de validation (C4).

- **R1** — Les types de données, leurs erreurs et leurs identifiants DOIVENT être définis par des schémas Zod dans le paquet des contrats.
- **R2** — Un paquet autre que celui des contrats NE DOIT PAS dépendre de zod.
- **R3** — Un identifiant de données DOIT être un type brandé qu’un schéma produit.

### Conséquences

- Bien, parce que toute donnée qui entre dans l’app passe par un schéma qui la valide.
- Bien, parce qu’un seul paquet porte les types, que les autres réemploient.
- Mauvais, parce que chaque nouveau format de données demande d’écrire son schéma avant son usage.

## Avantages et inconvénients des options

### Zod dans un paquet de contrats dédié

- Bien, parce qu’un schéma valide la donnée et en infère le type d’un seul coup (C1, C2).
- Bien, parce que le confinement de zod garde une source unique de vérité (C2, C4).
- Bien, parce que le brandage distingue un identifiant d’une chaîne (C3).
- Mauvais, parce qu’il faut écrire et tenir à jour un schéma pour chaque format de données (C2).

### Des types TypeScript sans validation à l’exécution

- Mauvais, parce qu’une donnée mal formée n’est jamais rejetée à l’exécution (C1).

### Un validateur maison

- Mauvais, parce qu’il faudrait tester un moteur de validation que Zod fournit déjà (C1).
- Neutre, parce qu’il resterait lui aussi confiné à un paquet (C4).

### Zod importé librement par chaque paquet

- Mauvais, parce que plusieurs paquets redéfiniraient les mêmes types (C2, C4).

## Informations complémentaires

- Le confinement de zod est prouvé par une fixture du contrôle des dépendances ; les règles R1 et R3 sont des conventions que le système de types tient.
- Réévaluation : Zod cesse d’être maintenu, ou un moteur de validation typé plus léger le remplace dans l’écosystème React Native.
