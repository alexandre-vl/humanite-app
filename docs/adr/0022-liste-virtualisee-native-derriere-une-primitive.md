---
format: 1
status: proposed
significance: [dependency, guarded-config, boundary]
---

# Liste virtualisée native derrière une primitive

## Contexte et problème

- Les écrans de lecture affichent des fils que l’écran ne borne pas : le contenu se lit par pages, curseur après curseur (`cat packages/contracts/src/page.ts`).
- Une carte d’article prend plusieurs formes selon l’élément qu’elle montre (`cat docs/app-actuelle/README.md`).
- Seules les primitives L0 importent les vues natives (ADR-0006).
- Une primitive ne peut importer que les places `lib` et `config`, donc jamais une autre primitive (`cat packages/architecture/src/places.ts`).
- Le SDK 57 teste `@shopify/flash-list` à la version 2.0.2 (`cat apps/mobile/node_modules/expo/bundledNativeModules.json`).
- React Native avertit qu’une liste virtualisée ne doit jamais en contenir une autre sur le même axe, celle du dedans mesurant alors une fenêtre sans fin ([listes virtualisées](https://reactnative.dev/docs/virtualizedlist)).

Comment rendre un fil paginé sans que la liste native fuie hors des primitives, ni que deux régions défilantes se disputent un même écran ?

## Critères de décision

- **C1** — Une liste native n’est importée que par une primitive L0.
- **C2** — Un écran ne tient qu’une seule région défilante, bandes qui réagissent au défilement comprises.
- **C3** — Le fil ne monte que ce qui est visible, recycle par type d’élément et demande la page suivante quand la fin approche.
- **C4** — Le module arrive à la version que le SDK teste avec ses autres modules.

## Options étudiées

- liste virtualisée du SDK, confinée à une primitive qui porte aussi les bandes
- vue défilante simple qui monte tous les éléments
- liste virtualisée de React Native sous une primitive d’en-tête distincte

## Décision

Option retenue : « liste virtualisée du SDK, confinée à une primitive qui porte aussi les bandes », parce qu’elle seule garde la liste native dans une primitive (C1), réunit le défilement et ce qui y réagit dans un seul composant (C2), recycle par type et annonce la fin du fil (C3), à la version que le SDK épingle (C4).

- **R1** — `@shopify/flash-list` NE DOIT PAS être importée hors des primitives.
- **R2** — Un écran DOIT confier son défilement à une seule liste, les bandes qui le suivent comprises.

### Conséquences

- Bien, parce qu’un fil ne monte que ses éléments visibles, quelle que soit la longueur du corpus.
- Bien, parce que l’en-tête qui se replie lit le défilement que la liste possède déjà.
- Mauvais, parce que le décalage du défilement arrive sur le fil JavaScript, la liste gardant son propre gestionnaire.
- Mauvais, parce qu’une dépendance native de plus impose de reconstruire le client de développement.

## Avantages et inconvénients des options

### liste virtualisée du SDK, confinée à une primitive qui porte aussi les bandes

- Bien, parce que la liste native ne s’importe que depuis une primitive (C1).
- Bien, parce que la primitive qui défile porte aussi les bandes, sans seconde région (C2).
- Bien, parce qu’elle recycle par type d’élément et prévient quand la fin approche (C3).
- Bien, parce que le SDK l’épingle à une version exacte qu’il teste (C4).

### vue défilante simple qui monte tous les éléments

- Bien, parce qu’elle n’ajoute aucune dépendance native (C4).
- Bien, parce que la vue défilante et ses bandes tiennent déjà dans une primitive (C2).
- Mauvais, parce qu’elle monte tout le fil, visible ou non, et ne recycle rien (C3).

### liste virtualisée de React Native sous une primitive d’en-tête distincte

- Bien, parce qu’elle n’ajoute aucune dépendance native (C4).
- Mauvais, parce qu’elle recycle par hauteur et non par type d’élément (C3).
- Mauvais, parce que l’en-tête et la liste seraient deux primitives dont aucune ne peut importer l’autre (C2).
- Mauvais, parce que les vues de React Native restent réservées aux primitives sans que la liste y gagne (C1).

## Informations complémentaires

- Le décalage du défilement arrive sur le fil JavaScript : la liste remplace l’`onScroll` de la vue qu’elle rend par le sien, puis rappelle le nôtre en écoutant (`cat apps/mobile/node_modules/@shopify/flash-list/dist/recyclerview/RecyclerView.js`). Un gestionnaire worklet n’a donc aucun point d’accroche.
- `@babel/runtime` entre au catalog parce que la liste le déclare en pair non optionnel (`cat apps/mobile/node_modules/@shopify/flash-list/package.json`).
- Le pager horizontal entre rubriques et les budgets qui mesureraient ce choix restent à décider dans des ADR distincts.
- Réévaluation : Expo change la liste qu’il teste avec son SDK, ou un budget de performance mesuré sur appareil réel échoue sur un fil.
