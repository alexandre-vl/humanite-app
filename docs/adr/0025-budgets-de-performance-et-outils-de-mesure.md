---
format: 1
status: proposed
significance: [guarded-config, reversal-cost]
---

# Budgets de performance et outils de mesure

## Contexte et problème

- L’émulateur du serveur rend en logiciel, ce qui exclut d’y mesurer quoi que ce soit (ADR-0010).
- Un budget dépassé sur un fil est déjà ce qui rouvrirait le choix de la liste virtualisée (ADR-0022), sans qu’aucun outil ne sache le constater.
- React Native pose `performance` au démarrage et Android compte lui-même les images hors échéance depuis sa version 12 : `adb shell dumpsys gfxinfo` et `adb shell am start -W` répondent sans qu’on ajoute rien à l’app.
- Aucune de ces réponses n’est lisible depuis cette machine : le téléphone est joint par un tunnel, et `adb devices` n’y répond pas toujours.

Comment tenir un budget de performance quand la mesure elle-même ne peut être ni automatisée ni refaite à volonté ?

## Critères de décision

- **C1** — Une mesure fausse ne doit jamais pouvoir passer pour une mesure bonne.
- **C2** — Ce qui décide doit être vérifiable sans appareil, comme toute règle du dépôt.
- **C3** — La mesure doit être refaisable par quelqu’un d’autre, sur une autre machine.

## Options étudiées

- Un seuil écrit dans le document, relu à la main
- Un module de mesure embarqué dans l’app, qui rapporte sa propre vitesse
- Une table de seuils et un juge, nourris d’une session relevée à la main

## Décision

Option retenue : « Une table de seuils et un juge, nourris d’une session relevée à la main », parce qu’elle seule refuse une réponse qu’elle n’a pas comprise plutôt que d’en tirer un zéro (C1), met le seuil et la lecture sous fixtures qui tournent sans téléphone (C2), et dicte les commandes de la session au lieu de les garder pour elle (C3).

- **R1** — Un relevé dont l’outil ne reconnaît pas la réponse NE DOIT PAS être compté comme une mesure.
- **R2** — Un relevé au-delà de son seuil DOIT être rapporté en échec.
- **R3** — Un budget NE DOIT PAS être mesuré sur un appareil émulé.
- **R4** — Un budget NE DOIT PAS être mesuré sur un paquet debuggable.
- **R5** — Les nombres relevés DOIVENT vivre dans le journal de la session qui les a pris, jamais dans cet ADR.

### Conséquences

- Bien, parce qu’un `dumpsys` que l’appareil n’a pas rempli échoue au lieu de rendre un budget tenu par zéro image.
- Bien, parce que le seuil, la lecture et le verdict se prouvent par des fixtures, sur une machine sans téléphone.
- Bien, parce que les commandes d’une session sont écrites par l’outil, donc refaisables ailleurs.
- Mauvais, parce que la session reste prise à la main : rien n’oblige à la reprendre, et un budget non mesuré ne se distingue pas d’un budget tenu.
- Mauvais, parce que la première image que compte Android est celle de l’écran de démarrage, pas du premier article.

## Avantages et inconvénients des options

### Un seuil écrit dans le document, relu à la main

- Mauvais, parce qu’un nombre que rien ne compare à rien ne refuse aucune mesure fausse (C1, C2).

### Un module de mesure embarqué dans l’app, qui rapporte sa propre vitesse

- Mauvais, parce qu’il faudrait embarquer la mesure dans le programme livré, ce qui change ce qu’on mesure (C1).

### Une table de seuils et un juge, nourris d’une session relevée à la main

- Bien, parce que l’outil refuse un appareil émulé, un paquet debuggable et une réponse illisible (C1).
- Bien, parce que ses fixtures tournent dans la vérification locale, sans appareil (C2).
- Bien, parce qu’il écrit les commandes de la session, que n’importe qui rejoue (C3).

## Informations complémentaires

- L’instrument du lancement voit la première image de la fenêtre, que l’écran de démarrage occupe : Android ne compte le contenu qu’une fois `reportFullyDrawn` appelé, que React Native n’appelle pas. Le budget porte donc sur ce que l’instrument voit, et la jauge du démarrage — polices réglées, cache restauré, première mise en page — répond du reste.
- Les formes des réponses lues sont celles qu’Android documente ; aucune n’a encore été relevée sur l’appareil depuis ce dépôt. Une forme qui changerait fait échouer la lecture, jamais passer le budget.
- Réévaluation : une version d’Android change la forme d’une de ces réponses, ou une session relevée sur appareil montre qu’un budget ne dit rien de ce qu’un lecteur ressent.
