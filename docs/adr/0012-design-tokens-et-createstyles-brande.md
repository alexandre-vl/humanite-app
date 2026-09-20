---
format: 1
status: proposed
significance: [guarded-config, boundary]
---

# Design tokens et createStyles brandé

## Contexte et problème

- Les tokens — espacements, couleurs, rayons, tailles et graisses — sont des valeurs brandées qu’un nombre ou une chaîne bruts ne peuvent pas contrefaire (`cat packages/design-tokens/src/brand.ts`).
- Une primitive est le seul code qui importe les vues de react-native et leur prop `style` (ADR-0006).
- `createStyles` vit dans la bibliothèque partagée, que les primitives comme les composants peuvent importer (`cat apps/mobile/src/shared/lib/styles/index.ts`).
- React Native accepte un objet de style libre, où une marge ou une couleur s’écrivent en clair (`pnpm lint`).
- L’app peint en thème clair ou sombre, selon ce que le lecteur a réglé et sinon le schéma du système, donc un style suit le thème en vigueur au lieu de figer une couleur (`cat packages/design-tokens/src/theme.ts`).

Comment garantir qu’un style n’emploie que des valeurs de tokens et suive le thème en vigueur, par une seule fabrique, sans qu’une primitive écrive une couleur ou une marge brutes ?

## Critères de décision

- **C1** — Une valeur de style provient d’un token, jamais d’un nombre ou d’une couleur bruts.
- **C2** — Les styles ont une seule fabrique, que primitives et composants réemploient.
- **C3** — Une primitive n’accepte pas un objet de style quelconque.
- **C4** — Un style suit le thème en vigueur, clair ou sombre, sans qu’un composant fige une couleur.

## Options étudiées

- createStyles brandé sur les tokens
- StyleSheet.create dans chaque composant
- Des objets de style en ligne dans le JSX
- Une bibliothèque de styles en chaînes de classes

## Décision

Option retenue : « createStyles brandé sur les tokens », parce que c’est la seule option qui n’admet que des valeurs de tokens (C1), donne aux styles une fabrique unique (C2), ferme la prop `style` d’une primitive à tout autre objet (C3) et porte le thème en vigueur jusqu’à chaque style (C4).

- **R1** — Une valeur de style DOIT être un token brandé, le type `Style` refusant un nombre ou une couleur bruts.
- **R2** — La prop `style` d’une primitive DOIT être le type `StyleRef` que `createStyles` produit.
- **R3** — Un objet de style en ligne NE DOIT PAS paraître dans le JSX.
- **R4** — Hors du noyau du thème (son contexte, sa racine et la portée qui en nomme un pour un sous-arbre), un style NE DOIT PAS importer un thème figé ; il reçoit le thème en vigueur du paramètre de `createStyles`.
- **R5** — La fenêtre du système NE DOIT PAS être peinte hors de la racine du thème.

### Conséquences

- Bien, parce qu’une marge ou une couleur hors des tokens ne compile pas.
- Bien, parce qu’un seul point de passage construit tous les styles.
- Bien, parce qu’un basculement clair-sombre du système repeint chaque style, sans qu’un composant fige une couleur.
- Mauvais, parce qu’un style ponctuel demande une entrée de `createStyles` plutôt qu’un objet en ligne.

## Avantages et inconvénients des options

### createStyles brandé sur les tokens

- Bien, parce que le type `Style` n’accepte que des tokens brandés (C1).
- Bien, parce qu’une seule fabrique sert les primitives et les composants (C2).
- Bien, parce que `StyleRef` est opaque : une primitive refuse un objet quelconque (C3).
- Bien, parce que la fabrique lit le thème en vigueur, donc chaque style suit le schéma clair ou sombre (C4).
- Mauvais, parce qu’il faut déclarer chaque style avant de l’employer (C2).

### StyleSheet.create dans chaque composant

- Mauvais, parce que `StyleSheet.create` accepte des nombres et des couleurs bruts (C1).
- Mauvais, parce que chaque composant redéfinit sa propre fabrique (C2).
- Mauvais, parce qu’un StyleSheet figé à la définition ne suit pas un changement de thème (C4).

### Des objets de style en ligne dans le JSX

- Mauvais, parce qu’un objet en ligne échappe aux tokens comme à toute fabrique (C1, C2).

### Une bibliothèque de styles en chaînes de classes

- Mauvais, parce qu’une classe en chaîne n’est pas un token typé que le compilateur vérifie (C1).

## Informations complémentaires

- L’interdiction d’un style en ligne et celle d’un thème figé hors de son contexte sont prouvées par des fixtures des garde-fous ; R1 et R2 sont des conventions que le système de types tient.
- La typographie est absente du type `Style`. Deux constructeurs, et eux seuls, changent un nom de variant en une fonte, une taille et une couleur : l’un y ajoute l’interligne qu’il en dérive, pour un texte qui coule sur plusieurs lignes ; l’autre l’omet, pour la ligne unique qu’on tape, qu’Android décalerait de sa propre ligne de base. La taille qu’ils lisent est celle du cran réglé par le lecteur, calculée dans le paquet des tokens, seul à frapper une taille ; l’interligne, multiple d’une taille, suit sans rien coûter. Un troisième ne rend qu’une couleur, pour un texte que la plateforme pose elle-même et à qui aucune table ne se tend. La primitive de texte, celle de saisie et la mise en page des onglets sont seules à les appeler, et aucune prop ne transporte ce qu’ils rendent.
- Le type `Style` ne porte qu’une transformation, une rotation par un angle nommé : celle à laquelle le journal pose son papier. Les valeurs d’une animation Reanimated — une opacité ou un `translateY` interpolés image par image — ne sont pas des tokens, la sortie de `useAnimatedStyle` étant calculée à l’exécution. Une primitive L0 l’applique à sa vue `Animated.View` interne, hors de la prop `style` brandée ; les bornes de l’interpolation restent des tokens.
- Réévaluation : React Native fige une API de style strict qui rend le brandage redondant, ou `createStyles` devient un goulet mesuré au profilage.
