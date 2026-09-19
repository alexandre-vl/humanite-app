---
format: 1
status: proposed
significance: [dependency, guarded-config, boundary, data-format]
---

# État du lecteur en magasin Zustand et format versionné

## Contexte et problème

- Le cache des lectures est persisté en entier sous une clé unique, invalidé par l’empreinte des contrats, et ce qui en revient mal formé est refusé plutôt que migré (ADR-0015).
- La bibliothèque de stockage synchrone n’est importable que depuis les bibliothèques partagées, le grain du confinement étant la place entière (ADR-0015).
- Hors ce cache, l’app n’écrit rien sur le disque : le registre des clés n’en déclare qu’une (`cat apps/mobile/src/shared/lib/storage/keys.ts`).
- Ce que le lecteur garde n’est pas une lecture du journal : la surface du contenu ne s’écrit pas, et rien n’y remet ce qu’il a fait (`cat packages/contracts/src/api.ts`).
- Le corpus est embarqué avec l’app et change avec elle, quand le disque du téléphone survit à la mise à jour (`cat packages/mock-content/src/generated/corpus.ts`).
- Une lecture par lot sert les articles encore imprimés et laisse les autres, plutôt que d’échouer sur le premier absent (`cat packages/mock-api/src/api.ts`).

Où vit ce que le lecteur a fait du journal, et que devient-il quand l’app a changé sous lui ?

## Critères de décision

- **C1** — Ce que le lecteur a fait survit au redémarrage et à une mise à jour de l’app.
- **C2** — Un format persisté qu’on ne sait plus lire est écarté, jamais servi sur parole.
- **C3** — Un outil tient la place où cet état se déclare.
- **C4** — Les clés écrites sur le disque se lisent toutes au même endroit.

## Options étudiées

- un magasin Zustand persisté par le registre des clés, dans la couche des actions
- le cache des requêtes, où l’on écrirait aussi ce que le lecteur a fait
- un état React tenu à la racine de l’app et écrit à la main sur le disque

## Décision

Option retenue : « un magasin Zustand persisté par le registre des clés, dans la couche des actions », parce qu’elle écrit sous sa propre clé, versionnée, ce qu’un redémarrage doit retrouver (C1), relit ce qui revient du disque par l’analyseur des contrats avant de le servir (C2), se tient par le confinement du paquet à une seule place (C3), et passe par la façade du stockage, qui n’accepte que les clés déclarées (C4).

- **R1** — Zustand NE DOIT PAS être importée hors de la couche des actions.
- **R2** — Une clé écrite sur le disque DOIT être déclarée au registre des clés.
- **R3** — Un format persisté DOIT porter une version.
- **R4** — Ce qui revient du disque DOIT être relu par un analyseur des contrats avant d’être servi.

### Conséquences

- Bien, parce que ce que le lecteur a gardé ne dépend ni du réseau ni du cache des lectures, et se retrouve hors ligne.
- Bien, parce qu’un identifiant que le journal n’imprime plus disparaît de l’écran sans emporter le reste de la liste.
- Neutre, parce que la version d’un format n’a pas encore de migration à décrire : elle nomme le premier état d’une suite.
- Mauvais, parce que le confinement se règle par place : tout module de la couche des actions peut déclarer un magasin, non le seul qui en a besoin.
- Mauvais, parce qu’un identifiant devenu introuvable reste sur le disque, invisible, tant que le lecteur ne le repose pas.

## Avantages et inconvénients des options

### un magasin Zustand persisté par le registre des clés, dans la couche des actions

- Bien, parce que le paquet écrit lui-même sa version et relit ce qu’il trouve (C1, C2).
- Bien, parce qu’une table nomme la place d’où il s’importe, et le lint la fait respecter (C3).
- Bien, parce que la façade du stockage refuse une clé que le registre ne déclare pas (C4).
- Mauvais, parce qu’il ajoute une dépendance dont seules la version écrite et la relecture justifient la venue (C1, C2).

### le cache des requêtes, où l’on écrirait aussi ce que le lecteur a fait

- Bien, parce qu’il n’ajoute ni paquet ni clé (C4).
- Mauvais, parce que l’empreinte des contrats efface tout le cache à chaque changement du contenu : ce que le lecteur a gardé partirait avec (C1).
- Mauvais, parce qu’un cache se vide aussi par péremption, et qu’un choix du lecteur ne périme pas (C1).
- Mauvais, parce que rien n’y distingue ce qui vient du journal de ce qui vient du lecteur (C2).

### un état React tenu à la racine de l’app et écrit à la main sur le disque

- Bien, parce qu’il reste sous la seule clé qu’on lui donne (C4).
- Mauvais, parce que la version, la relecture et l’écriture différée seraient à écrire, et à refaire au magasin suivant (C1, C2).
- Mauvais, parce que rien n’empêcherait un composant quelconque d’en tenir un second (C3).

## Informations complémentaires

- Le paquet ne déclare que des pairs facultatifs, dont React, déjà là : rien ne s’ajoute à l’installation (`pnpm deps:check`).
- La façade du stockage rend une absence là où le paquet attend une valeur nulle : l’adaptateur vit auprès d’elle, seule place qui touche le disque (`cat apps/mobile/src/shared/lib/storage/storage.ts`).
- Réévaluation : un second magasin apparaît, ou un format persisté doit être migré plutôt qu’écarté.
