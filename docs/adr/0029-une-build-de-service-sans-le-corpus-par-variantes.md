---
format: 1
status: accepted
significance: [guarded-config, boundary]
---

# Une build de service sans le corpus, par variantes

## Contexte et problème

- La porte du contenu importait le corpus en tête de module et choisissait sa source par une condition à l’exécution (`git show 2469e03:apps/mobile/src/shared/api/content.ts`).
- La build de service du 23/09/2026 embarquait ainsi 2 246 modules, les 189 images du corpus et 5 314 507 octets de bytecode Hermes (`EXPO_PUBLIC_CONTENT_SOURCE=service pnpm exec expo export --platform android`).
- Le corpus s’analyse quand il se charge, et l’API simulée trie, range et indexe ses articles au sien (`packages/mock-content/src/index.ts`, `packages/mock-api/src/api.ts`).
- Metro ne replie les branches constantes qu’en production, avant de relever les imports (`metro-transform-worker/src/index.js`), et Babel n’y écrit la valeur d’une variable `EXPO_PUBLIC_*` qu’en production (`babel-preset-expo/build/plugins/inline-env-vars.js`).
- Metro résout déjà une variante par plateforme, `surface.ios.tsx` à la place de `surface.tsx`, qu’ADR-0006 cantonne aux primitives.
- La configuration refuse toute assertion de type et tout `any` affecté (`packages/eslint-config/src/index.ts`).

Comment une build qui lit le service du journal laisse-t-elle hors du bundle un corpus qu’elle ne lira jamais ?

## Critères de décision

- **C1** — la build de service n’embarque ni le corpus, ni ses images, ni l’API qui les sert
- **C2** — le choix de la source reste typé, sans `require` ni assertion
- **C3** — TypeScript, les tests et une build qui ne nomme aucune source lisent le corpus (ADR-0028)
- **C4** — un outil dit quel import rouvrirait le corpus à la build de service

## Options étudiées

- Une variante de service résolue par Metro
- Une condition d’import dans le manifeste de l’app
- Un `require` dans une branche que la build replie

## Décision

Option retenue : « Une variante de service résolue par Metro », parce qu’elle seule sort le corpus de toute build de service, de développement comme de production (C1), avec deux modules typés d’un même type (C2), et qu’un parcours des imports de cette build la vérifie (C4).

- **R1** — Une variante de service NE DOIT PAS vivre hors de la place `api`.
- **R2** — Une build de service NE DOIT PAS importer un paquet du corpus.

### Conséquences

- Bien, parce que la build de service perd 395 185 octets de bytecode, 195 modules et 189 images, 492 728 octets, et ne charge plus le corpus au démarrage (C1).
- Bien, parce que la build du corpus n’embarque plus le client du service, que seule la variante importe (C1).
- Bien, parce que `pnpm structure:check` nomme l’import qui rouvrirait le corpus, au fichier qui l’écrit (C4).
- Mauvais, parce que Metro et l’app lisent chacun la variable : la porte refuse une build où les deux diffèrent, mais seulement au lancement (C3).
- Mauvais, parce que TypeScript juge la variante contre le type qu’elle partage, jamais à la place du module qu’elle double (C2).
- Neutre, parce que changer de source demande de relancer Metro, qui lit la variable à son démarrage.

## Avantages et inconvénients des options

### Une variante de service résolue par Metro

- Bien, parce que Metro la résout comme une variante de plateforme, sans rien exécuter (C1).
- Bien, parce que chaque source est un module typé que la porte importe comme un autre (C2).
- Bien, parce que TypeScript, Jest et une build sans source ne connaissent que le module du corpus (C3).
- Mauvais, parce que le suffixe change ce qu’une build embarque partout où il est écrit, d’où R1 (C4).

### Une condition d’import dans le manifeste de l’app

- Bien, parce que le choix se lirait dans `package.json`, à côté des autres alias (C4).
- Mauvais, parce qu’une condition ajoutée à Metro vaut pour tous les paquets du graphe, par une option marquée instable (C1).
- Mauvais, parce qu’un alias de plus demanderait sa place dans l’architecture (C2).

### Un `require` dans une branche que la build replie

- Bien, parce qu’un seul module garderait les deux sources (C4).
- Mauvais, parce que `require` rend `any`, qu’aucune assertion ne peut typer ici (C2).
- Mauvais, parce que le corpus resterait dans toute build de développement, où rien n’est replié (C1).

## Informations complémentaires

- Mesures : la même commande d’export, sur l’arbre `2469e03` puis avec les variantes ; la build du corpus garde ses 239 fichiers.
- Réévaluation : Metro retire un import qu’aucune branche n’atteint, ou Expo résout des variantes de build sans configuration.
