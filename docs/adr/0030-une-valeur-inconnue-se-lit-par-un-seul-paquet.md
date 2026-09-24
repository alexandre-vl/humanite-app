---
format: 1
status: proposed
significance: [dependency, guarded-config, boundary]
---

# Une valeur inconnue se lit par un seul paquet

## Contexte et problème

- Avant `51c0219`, l’espace de travail demandait à une valeur de forme inconnue si elle était un objet par neuf copies d’`isRecord` et à trente autres endroits écrits à la main (`git show -s 51c0219`).
- Ces définitions divergeaient : celle du stockage de l’app prenait une liste pour un objet, et deux lectures de plugins acceptaient `null` (`git show -s 51c0219`).
- `Array.isArray` resserre en liste de `any` (`node_modules/typescript/lib/lib.es5.d.ts:1518`) ; treize appels des outils retypaient chaque élément à la main (`git show -s 844f3b4`).
- L’app et les paquets ne dépendent que de paquets, les outils de paquets et d’outils (`tools/governance/src/workspace-manifest.ts:11`) : seul un paquet peut porter une lecture commune aux trois.
- `@huma/unknown` porte `isRecord` et `isList` depuis `51c0219`, mais rien n’y ramène un contrôle écrit ailleurs : `844f3b4` en laisse cinq, justifiés par son seul message, et un sixième n’y figure pas (`git show 8bd60b4:vitest.config.ts`).
- La configuration ESLint refuse déjà une syntaxe ou une propriété par politique, chacune prouvée par une fixture (`tools/guardrails/src/proofs/policies.test.ts`).

Comment l’app, les paquets et les outils demandent-ils à une valeur de forme inconnue si elle est un objet ou une liste, sans qu’une seconde définition puisse revenir ?

## Critères de décision

- **C1** — une seule définition d’un objet et d’une liste, pour l’app, les paquets et les outils
- **C2** — un outil refuse une seconde définition, au fichier et à la ligne qui l’écrivent
- **C3** — ce qu’une valeur resserrée contient reste inconnu, jamais `any`
- **C4** — aucune dépendance tierce de plus, dans l’app comme dans les outils

## Options étudiées

- Un paquet de l’espace de travail, et une interdiction lint hors de lui
- Un paquet de l’espace de travail, tenu par la relecture
- Un schéma zod à chaque lecture

## Décision

Option retenue : « Un paquet de l’espace de travail, et une interdiction lint hors de lui », parce qu’elle seule garde une définition (C1) et refuse la seconde au fichier qui l’écrit (C2).

- **R1** — Un fichier TypeScript NE DOIT PAS demander à `typeof` si une valeur est un objet, hors des modules de `@huma/unknown`.
- **R2** — Un fichier TypeScript NE DOIT PAS demander à `Array.isArray` ou à `instanceof Array` si une valeur est une liste, hors des modules de `@huma/unknown`.

### Conséquences

- Bien, parce que `pnpm lint` refuse une comparaison de `typeof` à `'object'`, un `switch` sur `typeof`, et `Array.isArray` appelé, déstructuré ou atteint par `globalThis`, dans l’app, les paquets embarqués et les outils (C2).
- Bien, parce que les six derniers contrôles écrits à la main passent par le paquet : `pnpm lint` passe sur chaque fichier TypeScript de l’espace de travail, dont seuls les modules du paquet sont exemptés (C1).
- Bien, parce qu’`isList` rend `readonly unknown[]` là où `Array.isArray` rendait `any[]` (C3).
- Mauvais, parce qu’une union déjà typée, où rien n’est inconnu, passe aussi par `isList` (`packages/eslint-config/src/react.ts`).
- Mauvais, parce que la règle lit la syntaxe : un `typeof` comparé à une variable qui vaut `'object'`, ou `Array` atteint par un détour comme `globalThis.Array['isArray']`, lui échappe (C2).
- Neutre, parce que les tests du paquet posent la question par lui, comme tout autre fichier.
- Neutre, parce que les deux configurations JavaScript de l’app ne reçoivent que les règles sans types, et restent hors de ces politiques comme des autres.
- Neutre, parce que seize espaces de travail dépendent du paquet, dont la racine et les contrats.

## Avantages et inconvénients des options

### Un paquet de l’espace de travail, et une interdiction lint hors de lui

- Bien, parce qu’une fonction lue partout est la seule définition (C1), sans rien ajouter aux dépendances tierces (C4).
- Bien, parce qu’ESLint nomme la politique enfreinte au fichier et à la ligne, et qu’une fixture par forme le prouve (C2).
- Mauvais, parce que chaque nouvelle façon d’écrire la question demande son sélecteur et sa fixture (C2).

### Un paquet de l’espace de travail, tenu par la relecture

- Bien, parce que rien ne change à la configuration (C4).
- Mauvais, parce que six contrôles ont survécu à la migration, gardés par un message et non par un outil (C2).
- Mauvais, parce qu’une copie écrite demain pourrait redire autre chose, comme celle du stockage (C1).

### Un schéma zod à chaque lecture

- Bien, parce qu’un schéma dit la forme entière et type chaque champ (C3).
- Mauvais, parce que zod n’est permis qu’aux contrats parmi les paquets (`tools/governance/src/workspace-manifest.ts:139`) : les autres devraient passer par eux ou l’ajouter (C4).
- Mauvais, parce que chaque lecture écrirait son schéma : autant de définitions que de lectures (C1).

## Informations complémentaires

- Preuves : une fixture par forme refusée, dans l’app, un paquet embarqué et un outil, et une qui montre le paquet exempté (`tools/guardrails/src/proofs/unknown.ts`).
- Réévaluation : TypeScript resserre `Array.isArray` en liste d’inconnus, ou typescript-eslint refuse un contrôle de forme écrit à la main.
