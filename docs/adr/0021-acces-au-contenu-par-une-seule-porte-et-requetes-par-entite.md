---
format: 1
status: accepted
significance: [dependency, guarded-config, boundary]
---

# Accès au contenu par une seule porte et requêtes par entité

## Contexte et problème

- L’écran « À la une » affichait huit rectangles identiques tirés d’un tableau de lettres écrit dans sa propre page (`apps/mobile/src/pages/home/ui/home-page.tsx`).
- Le corpus fictif et l’api qui le sert existent depuis la phase 1, mais aucun manifeste de l’app ne les déclarait (`apps/mobile/package.json`).
- Le contrat de lecture compte dix méthodes, dont trois rendent une page ouverte par un curseur opaque (`packages/contracts/src/api.ts`).
- Le cache persisté et son client sont décidés et montés, sans qu’une seule requête existe (ADR-0015).
- Une place `api` est déclarée et aliasée depuis la phase 2, et reste vide (`packages/architecture/src/places.ts`).

Par où le contenu entre-t-il dans l’app, et où se déclare une requête ?

## Critères de décision

- **C1** — remplacer le contenu simulé par un service ne touche qu’un module
- **C2** — la clé d’une requête et la lecture qu’elle fait tiennent au même endroit
- **C3** — un outil refuse l’écart, au lieu d’une consigne écrite
- **C4** — le coût en dépendances reste mesuré

## Options étudiées

- Une porte unique et des requêtes par entité
- Un appel direct au contenu depuis chaque écran
- Un client de données écrit sur place

## Décision

Option retenue : « Une porte unique et des requêtes par entité », parce qu’elle laisse un seul module connaître la source du contenu et réunit la clé d’une entité et sa lecture (C1, C2, C3).

- **R1** — le contenu simulé NE DOIT PAS être importé hors de la place `api`
- **R2** — une requête DOIT être déclarée dans le segment `api` de la tranche qu’elle sert

### Conséquences

- Bien, parce qu’un écran lit enfin les articles que le corpus contient, hors ligne et sans service (C1).
- Bien, parce que deux garde-fous testés refusent l’écart, chacun avec sa preuve (C3).
- Mauvais, parce que le contenu simulé et le validateur qu’il embarque entrent dans le paquet de l’app (C4).
- Mauvais, parce qu’un plugin de lint de plus entre dans le catalogue (C4).

## Avantages et inconvénients des options

### Une porte unique et des requêtes par entité

- Bien, parce qu’un service prendrait la place du contenu simulé dans un seul module (C1).
- Bien, parce que la clé et la lecture d’une entité tiennent dans un fichier que le lint réserve (C2).
- Mauvais, parce qu’une couche d’entités de plus est à tenir (C4).

### Un appel direct au contenu depuis chaque écran

- Mauvais, parce que chaque écran changerait le jour où le contenu change de source (C1).
- Mauvais, parce qu’une clé de cache serait réécrite à chaque appel, sans personne pour les accorder (C2).

### Un client de données écrit sur place

- Bien, parce qu’aucune dépendance ne serait ajoutée (C4).
- Mauvais, parce que le cache persisté déjà décidé attend précisément ce client (C3).

## Informations complémentaires

- Le plugin de lint du client de requêtes est classé règle par règle ; une règle de plus dans une version suivante fait échouer la configuration au lieu d’entrer sans être lue (`packages/eslint-config/src/query.ts`).
- Le segment est ce que R2 vise, et pas la couche. Deux règles de cette architecture se sont rencontrées au-dessus du kiosque sans pouvoir tenir ensemble — une requête vit dans un segment `api`, et une tranche qu’un seul écran référence vit dans cet écran — alors la couche a cédé : un écran déclare ses requêtes comme une entité, et un `model` qui écrirait les siennes reste refusé des deux côtés (`packages/architecture/src/app.ts`).
- Les curseurs restent opaques : une requête n’en fabrique aucun, elle rend celui que la page précédente a donné (`packages/contracts/src/page.ts`).
- Les visuels passent par la même porte : le corpus expose un registre d’imports statiques que l’empaqueteur résout, et la place `api` seule le lit pour rendre, d’une clé d’image, le module et son thumbhash (`packages/mock-content/src/assets.ts`).
- Réévaluation : un service distant remplace le contenu simulé, ou la pagination cesse de reposer sur un curseur.
