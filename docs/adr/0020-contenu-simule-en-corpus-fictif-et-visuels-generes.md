---
format: 1
status: proposed
significance: [dependency, data-format]
---

# Contenu simulé en corpus fictif et visuels générés

## Contexte et problème

- Les robots.txt de humanite.fr, d’Openverse, de Flickr et de l’API Wikimedia Commons refusent la collecte automatique, et aucune photographie n’a été déposée dans le dépôt (`docs/spikes/phase-0a.md`).
- Le corpus nomme soixante-trois illustrations, quarante-cinq de une et dix-huit de corps, qu’aucun fichier ne servait (`packages/mock-content/src/generated/corpus.ts`).
- Chaque illustration porte une clé bâtie sur l’identifiant de l’item qu’elle illustre (`packages/contracts/src/ids.ts`).
- Le dépôt ne suivait aucun binaire hors des captures de l’app actuelle (`git ls-files`).
- Les textes affichés viennent d’un dictionnaire ou d’un champ de prose validé (ADR-0013).

Comment illustrer un corpus fictif sans photographie ni collecte ?

## Critères de décision

- **C1** — le dépôt n’enfreint ni un robots.txt ni un droit d’auteur
- **C2** — l’app est complète hors ligne, sans réseau ni service
- **C3** — une regénération produit les mêmes octets
- **C4** — le coût en dépendances et en poids reste mesuré

## Options étudiées

- Visuels dessinés et générés
- Photographies collectées sous licence libre
- Aucune illustration

## Décision

Option retenue : « Visuels dessinés et générés », parce qu’elle illustre chaque item sans rien collecter et reste reproductible (C1, C2, C3).

- **R1** — les paquets du contenu simulé NE DOIVENT PAS embarquer un média récupéré sur un service tiers
- **R2** — chaque clé d’image DOIT nommer l’item qu’elle illustre et se résoudre à un fichier écrit
- **R3** — un visuel généré DOIT découler de sa seule clé et de la couleur de sa rubrique
- **R4** — une photographie déposée par la personne qui tient le dépôt PEUT remplacer un visuel généré, avec son crédit

### Conséquences

- Bien, parce que l’app montre une illustration dès sa première ouverture, sans réseau (C2).
- Bien, parce que les deux cent cinquante-deux fichiers pèsent moins que le corpus lui-même (C4).
- Mauvais, parce que le dépôt suit désormais des binaires générés, qu’une relecture ne lit pas (C4).
- Mauvais, parce qu’un dessin ne montre pas la scène que sa légende décrit (C2).

## Avantages et inconvénients des options

### Visuels dessinés et générés

- Bien, parce que rien n’est collecté ni redistribué (C1).
- Bien, parce que le même nom donne toujours le même dessin (C3).
- Mauvais, parce que deux outils de plus entrent dans le catalogue (C4).

### Photographies collectées sous licence libre

- Mauvais, parce que les robots.txt des banques d’images refusent la collecte (C1).
- Mauvais, parce qu’un média servi à distance rend l’app tributaire du réseau (C2).

### Aucune illustration

- Bien, parce qu’aucune dépendance n’est ajoutée (C4).
- Mauvais, parce que les écrans de lecture perdent la moitié de leur objet (C2).

## Informations complémentaires

- Les huit fonds de rubrique vivent dans les tokens, chacun assez sombre pour porter un titre blanc au ratio qu’une norme d’accessibilité demande d’un texte courant (`packages/design-tokens/src/sections.ts`).
- Le dessin est rasterisé et encodé par un seul outil, et la vignette floue du chargement est tirée du même dessin (`packages/mock-content/src/render.ts`).
- Réévaluation : des photographies sont déposées dans le dépôt, ou une banque d’images devient exploitable sans collecte automatique.
