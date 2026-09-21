---
format: 1
status: proposed
significance: [guarded-config, boundary]
---

# Accessibilité annoncée et contraste déduit de la taille

## Contexte et problème

- Les props d’une primitive sont fermées : rien n’est répandu, et le cast est interdit, donc une vue native ne porte que ce que son type déclare (ADR-0003, ADR-0006).
- Avant cette décision, l’app portait quatre attributs d’accessibilité dans deux primitives, et ni `Image`, ni `Icon`, ni `Text` ne pouvait en recevoir (`git show 1e6e0d2~1 -- apps/mobile/src/shared/ui/primitives`).
- Les seuils de contraste étaient choisis à la main : l’un tenait une légende de quatorze points à la barre du grand texte (`git show 1e6e0d2~1 -- packages/design-tokens/src/theme.test.ts`).
- Le document de référence ne mesure ni contraste ni comportement de lecteur d’écran : il n’y a pas d’état de l’art à copier (`grep -c contraste docs/app-actuelle/README.md`).
- La taille d’une variante et le pas du lecteur vivent déjà dans une table unique, que l’app ne peut pas contourner (ADR-0012).

Comment garantir qu’une vue dise ce qu’elle montre et qu’un texte se lise sur son fond, sans que l’un ni l’autre ne dépende d’une relecture ?

## Critères de décision

- **C1** — Une vue ajoutée sans réponse d’accessibilité ne compile pas.
- **C2** — Le contraste exigé se déduit de ce que le journal compose, jamais d’un nombre choisi.
- **C3** — Un écart assumé porte sa mesure, et cesse d’être écrit dès qu’il cesse d’en être un.

## Options étudiées

- des annonces requises par les types, et un contraste déduit de la table de typographie
- un greffon de lint d’accessibilité
- une relecture d’accessibilité écran par écran

## Décision

Option retenue : « des annonces requises par les types, et un contraste déduit de la table de typographie », parce qu’elle seule refuse à la compilation une image dont personne n’a dit ce qu’elle annonce (C1), tire le seuil de la plus petite composition où une couleur est posée plutôt que d’un nombre écrit à côté (C2), et tient un écart des deux côtés à la fois (C3).

- **R1** — Une image ou un symbole DOIT déclarer ce qu’il annonce à un lecteur d’écran.
- **R2** — Un texte qui ouvre ce qui le suit DOIT se déclarer comme tel.
- **R3** — Le contraste exigé d’une couleur de texte DOIT être déduit de la plus petite composition où le journal la pose.
- **R4** — Un écart au contraste exigé DOIT porter la mesure qui le constate.
- **R5** — Un écart qui a cessé d’en être un NE DOIT PAS rester écrit.
- **R6** — Chaque part d’un contrôle qui dit où il est ou comment il est réglé DOIT se distinguer de ce qu’elle touche.

### Conséquences

- Bien, parce que la question a été posée quinze fois d’un coup : quatorze de ces vues répètent les mots posés à côté d’elles, une seule en porte un, et aucune n’était décidée avant.
- Bien, parce que la règle déduite a trouvé quatre paires sous la barre que la chaîne verte tenait pour bonnes, dont la date sous chaque carte du journal.
- Bien, parce qu’un écart ne peut plus dormir : celui du blanc sur le rouge porte sa mesure, et le jour où le rouge descendra, la ligne qui l’explique tombera avec.
- Bien, parce que la règle a livré un second défaut sur l’unique contrôle dessiné : son curseur avait la couleur de la page, que la plateforme peint plus large que la piste — trois états sur quatre étaient un trou et un croissant.
- Mauvais, parce que les fonds qu’une couleur rencontre sont déclarés et non déduits : un texte posé sur un fond que personne n’a nommé ne serait tenu par rien.
- Mauvais, parce que le rôle d’une cible tactile reste facultatif, faute d’un type qui sache ce qu’une pression fait.

## Avantages et inconvénients des options

### des annonces requises par les types, et un contraste déduit de la table de typographie

- Bien, parce qu’une image sans réponse ne compile pas, comme une image sans clé de recyclage (C1).
- Bien, parce que le seuil suit la table qui fixe les tailles : un corps réduit relève la barre tout seul (C2).
- Bien, parce que l’écart est tenu par un plancher et par un plafond, et qu’un écart obsolète fait échouer son propre test (C3).

### un greffon de lint d’accessibilité

- Bien, parce qu’il couvrirait des règles écrites et éprouvées ailleurs (C1).
- Mauvais, parce qu’une règle de lint voit un élément JSX et non ce qu’un écran veut dire : elle ne sait pas si une image répète le titre posé à côté d’elle (C1).
- Mauvais, parce qu’aucune règle de lint ne connaît la taille à laquelle une variante est composée, ni le pas que le lecteur a posé (C2).

### une relecture d’accessibilité écran par écran

- Bien, parce qu’elle juge le sens, qu’aucun outil ne juge, et voit donc ce qu’une image dit de plus que les mots d’à côté (C1).
- Mauvais, parce qu’une vue ajoutée plus tard ne rencontre aucune contrainte (C1).
- Mauvais, parce que rien n’échoue : un écart y reste une note, et une note ne se périme pas (C3).

## Informations complémentaires

- WCAG 1.4.3 demande quatre et demi pour un, et trois au-delà de vingt-quatre pixels ; des douze variantes, deux — le titre et le fronton, à vingt-huit points — dépassent ce seuil.
- Les deux plateformes retirent une vue du parcours différemment, par `accessibilityElementsHidden` et par `importantForAccessibility` : n’en poser qu’un annonce la vue sur un téléphone et pas sur l’autre.
- Réévaluation : un greffon de lint d’accessibilité déclare la version d’ESLint du dépôt, ou une plateforme cesse de lire l’un des deux attributs de retrait.
