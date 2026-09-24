---
format: 1
status: accepted
significance: [boundary, reversal-cost]
---

# Le lecteur ne regarde jamais le journal se charger

## Contexte et problème

- Mesuré le 24/09/2026 contre le service : `/wordpress/home`, `/wordpress/homepage` et `/wordpress/menu` répondent en 115 à 332 ms à froid, 25 à 30 ms à chaud ; une rubrique en 144 à 234 ms ; `/wordpress/post/…` en 743 ms au plus froid.
- Mesuré le même jour sur huit questions jamais posées : `/article/search/…` répond en 1 552 à 1 923 ms et ne se sert jamais d’un cache — une question n’est jamais deux fois la même.
- Mesuré le même jour par `am start -W` : 1 203 à 1 765 ms de la pression de l’icône à la première image, pour un budget de 1 500 ms (`tools/perf/src/budgets.ts`).
- `ARTICLE` est `ARTICLE_SUMMARY` augmenté d’un corps (`packages/contracts/src/article.ts`) : la carte touchée porte tout l’article sauf ce qui met le plus longtemps à venir.
- Le cache des requêtes est écrit sur le disque et relu au démarrage (`apps/mobile/src/_app/model/persister.ts`) : les listes déjà lues sont là avant la première requête.
- Le splash déclaré à Expo ne peut ni se fondre sur Android — `fade` y est `@platform ios` — ni porter une lettre de la fonte que l’app charge.
- Mesuré à 30 images par seconde le même jour : le téléphone répond à `hideAsync()` 270 ms avant que son champ ne quitte l’écran, et rien en JS n’en voit la fin.

Que montre l’app pendant qu’elle attend le journal ?

## Critères de décision

- **C1** — le lecteur n’attend jamais devant un écran vide
- **C2** — ce qui est montré est vrai, et se donne pour ce qu’il est
- **C3** — rien de ce qui est montré ne se défait sous les yeux du lecteur
- **C4** — l’attente réelle ne s’allonge pas pour être mieux habillée

## Options étudiées

- Ce que l’app sait déjà, montré à sa place
- Des silhouettes grises à la forme de ce qui vient
- Un tourniquet au centre de l’écran

## Décision

Option retenue : « Ce que l’app sait déjà, montré à sa place », parce qu’une app qui a lu la une tient déjà le titre, le chapeau, la signature et l’heure de chaque article affiché, et qu’une question trouve chez elle de vraies pièces sur-le-champ là où le journal met une seconde et demie (C1, C2). Les silhouettes ne servent que là où l’app ne sait rien.

- **R1** — Un écran qui attend le service DOIT montrer ce que l’app sait déjà du sujet, si elle en sait quelque chose.
- **R2** — Ce qui est montré à la place de la réponse DOIT être nommé comme tel au lecteur.
- **R3** — Une réponse affichée NE DOIT PAS céder la place au vide pendant qu’on en demande une autre.
- **R4** — Une demande de lecture DOIT partir quand le doigt se pose, et non quand l’écran se monte.
- **R5** — L’ouverture de l’app DOIT se tenir immobile un quart de seconde au moins sur l’écran du lecteur avant de s’effacer.

### Conséquences

- Bien, parce que la recherche répond en 1,6 s au lieu de 4,6 s : mesuré sur « climat », trois secondes d’écran vide remplacées par deux articles déjà lus (C1, C2).
- Bien, parce qu’une tête d’article est lisible 200 ms après le doigt, mesuré le même jour, le corps arrivant ensuite sans que rien ne bouge autour (C1, C3).
- Bien, parce qu’une question retapée garde sa réponse précédente pendant que la suivante se prépare, au lieu de se vider (C3).
- Bien, parce que la demande partie au poser du doigt court pendant l’animation de l’écran : les deux durées se recouvrent au lieu de s’ajouter (C4).
- Bien, parce que l’ouverture est le champ que le téléphone peignait déjà, le nom du journal dessus : un seul écran, dont le nom s’efface (C3).
- Mauvais, parce que l’ouverture ajoute environ 350 ms à un démarrage mesuré à 1 203-1 765 ms — le reste des 600 ms qu’elle dure couvre un début qui avait lieu de toute façon (C4).
- Mauvais, parce que son plancher porte un délai mesuré : rien en JS ne dit « le lecteur voit ceci ».
- Neutre, parce que les silhouettes servent encore là où l’app ne sait rien : un article ouvert par un lien, une première liste.

## Avantages et inconvénients des options

### Ce que l’app sait déjà, montré à sa place

- Bien, parce que le lecteur lit de vrais titres pendant l’attente, et peut en ouvrir un sans attendre la suite (C1).
- Bien, parce que ce n’est pas une supposition : c’est une réponse plus petite à la même question, nommée comme telle (C2).
- Mauvais, parce qu’un téléphone neuf ne sait rien, et retombe sur l’option suivante (C1).

### Des silhouettes grises à la forme de ce qui vient

- Bien, parce que la page garde sa hauteur et son rythme, donc rien ne saute quand le texte arrive (C3).
- Mauvais, parce qu’elles n’apprennent rien au lecteur : c’est une attente mieux habillée, pas une attente plus courte (C1, C4).

### Un tourniquet au centre de l’écran

- Mauvais, parce qu’il ne dit rien de ce qui vient et laisse l’écran vide autour de lui (C1).
- Mauvais, parce qu’il fait un événement de chaque attente, là où la plupart durent moins de 300 ms (C2).

## Informations complémentaires

- Les 270 ms du dessaisissement ont été relevés sur le client de développement ; une build de production dira les siens.
- Réévaluation : une recherche du journal servie sous 300 ms rendrait la réponse locale inutile ailleurs que hors ligne.
