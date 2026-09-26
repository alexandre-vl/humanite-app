---
format: 1
status: accepted
significance: [boundary, reversal-cost]
supersedes: [ADR-0035]
---

# Le lecteur n’attend devant rien de vide ni de faux

## Contexte et problème

- Selon ADR-0035 R1, la recherche montrait pendant l’attente les articles déjà lus dont le titre ou le chapeau portent la question (`git show 1032dba:apps/mobile/src/pages/search/ui/search-page.tsx`).
- Mesuré le 26/09/2026 sur le simulateur iPhone en tapant « climat » : 27 à 48 articles déjà lus affichés 1,0 à 2,3 s, puis remplacés par les dix premiers de la réponse du journal, sans un seul en commun pour quatre questions sur cinq (`console.log` sur `searchQuery` et la page).
- La réponse du journal arrive par pages de dix, les suivantes demandées avant la fin de la liste : dix, vingt, puis trente sur « climat » (même `console.log`).
- La recherche du journal répond en 1 552 à 1 923 ms et ne se sert jamais d’un cache ; une tête d’article, tirée du résumé que portait sa carte, est lisible 200 ms après le doigt (ADR-0035).
- `FeedStandIn` dessine déjà des silhouettes à la forme de la réponse, un échec par sa cause avec Réessayer, et une réponse vide dans les mots de l’écran (`cat apps/mobile/src/entities/article/ui/feed-stand-in.tsx`).
- Les conventions d’ADR-0035 R2 et R3 décrivent un code qui n’existe plus : les clés `search.read` et `search.for`, le drapeau `keepsPrevious` (`grep -rnE "keepsPrevious|search\.(read|for)\b" apps/mobile/src`).

Que montre l’app pendant qu’elle attend le journal, et que montre une recherche avant sa réponse ?

## Critères de décision

- **C1** — ce qui est montré est vrai, et se donne pour ce qu’il est
- **C2** — rien de ce qui est montré ne se défait sous les yeux du lecteur
- **C3** — le lecteur n’attend jamais devant un écran vide
- **C4** — l’attente réelle ne s’allonge pas pour être mieux habillée

## Options étudiées

- Ce que l’app sait de l’article, la forme de la réponse pour une recherche
- Ce que l’app sait déjà, montré à sa place partout
- La réponse précédente gardée pendant que la suivante se prépare

## Décision

Option retenue : « Ce que l’app sait de l’article, la forme de la réponse pour une recherche », parce qu’une tête tirée de sa carte est l’article même, quand des articles déjà lus ne sont pas la réponse du journal (C1), que des silhouettes cèdent la place sans qu’une liste lisible se défasse (C2), et que l’écran n’est ni vide ni plus long à attendre (C3, C4).

- **R1** — Un écran qui attend un article DOIT montrer ce que l’app en sait déjà, si elle en sait quelque chose.
- **R2** — Une recherche NE DOIT PAS montrer d’autre article que ceux de la réponse du journal à sa question.
- **R3** — Ce qui tient la place d’une réponse DOIT être nommé comme tel au lecteur.
- **R4** — Une liste relue NE DOIT PAS céder la place au vide pendant qu’on la relit.
- **R5** — Une demande de lecture DOIT partir quand le doigt se pose, et non quand l’écran se monte.
- **R6** — L’ouverture de l’app DOIT se tenir immobile un quart de seconde au moins sur l’écran du lecteur avant de s’effacer.

### Conséquences

- Bien, parce qu’une recherche ne montre plus que la réponse du journal : sur « climat », plus aucun des 38 articles qui cédaient la place à dix autres (C1, C2).
- Bien, parce que l’attente d’une recherche garde la forme de sa réponse, et que le trait sous le champ dit, à VoiceOver aussi, que le journal cherche (C1, C3).
- Bien, parce qu’une tête d’article reste lisible 200 ms après le doigt, le corps arrivant ensuite sans que rien ne bouge autour (C1, C2).
- Bien, parce que la demande partie au poser du doigt court pendant l’animation de l’écran au lieu de s’y ajouter (C4).
- Mauvais, parce qu’une recherche fait de nouveau regarder des silhouettes une seconde et demie à deux secondes (C3).
- Mauvais, parce qu’une recherche hors ligne ne trouve plus rien, pas même parmi les articles que l’app tient déjà (C3).
- Mauvais, parce que l’ouverture ajoute environ 350 ms à un démarrage mesuré à 1 203-1 765 ms (C4).

## Avantages et inconvénients des options

### Ce que l’app sait de l’article, la forme de la réponse pour une recherche

- Bien, parce que tout ce qui est montré est ce qui a été demandé : l’article même, ou la réponse du journal (C1).
- Bien, parce que des silhouettes cèdent la place à une réponse sans que rien de lisible ne se défasse (C2).
- Bien, parce que les silhouettes tombent dès la première page du journal, sans rien retarder (C4).
- Mauvais, parce que des silhouettes n’apprennent rien au lecteur pendant l’attente d’une recherche (C3).

### Ce que l’app sait déjà, montré à sa place partout

- Bien, parce que le lecteur lit de vrais titres pendant l’attente d’une recherche (C3).
- Mauvais, parce que ces titres ne sont pas la réponse et se lisent comme elle : le décideur les a pris pour de faux résultats (C1).
- Mauvais, parce qu’une liste de 38 articles cède la place sous les yeux du lecteur à dix autres (C2).

### La réponse précédente gardée pendant que la suivante se prépare

- Bien, parce que la page ne se vide pas entre deux questions (C3).
- Mauvais, parce que les articles d’une question restent sous une autre le temps que le journal réponde (C1).

## Informations complémentaires

- Les 270 ms du dessaisissement ont été relevés sur le client de développement ; une build de production dira les siens.
- Réévaluation : des lecteurs qui chercheraient hors ligne rouvriraient R2.
