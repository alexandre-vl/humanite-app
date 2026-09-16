---
format: 1
status: proposed
significance: [dependency, guarded-config, reversal-cost]
---

# Émulateur Android Redroid sur le serveur

## Contexte et problème

- L’émulateur est Redroid 15, Android dans un conteneur Docker privilégié sur le noyau de l’hôte (`cat tools/emulator/src/config.ts`).
- L’image est épinglée par digest et adb n’écoute que sur la boucle locale 127.0.0.1 (`cat tools/emulator/src/config.ts`).
- `pnpm emulator:up` photographie les sysctls, attend `sys.boot_completed`, restaure l’hôte et échoue si un écart persiste (`cat AGENTS.md`).
- Un garde root en sh POSIX restaure l’hôte et efface les écritures d’Android, relues sur un montage `/proc` neuf (`cat tools/emulator/src/android-writes.ts`).
- Le spike 0a a démarré Redroid 15 sur ce serveur sans virtualisation imbriquée et mesuré son empreinte ([journal 0a](../spikes/phase-0a.md)).

Comment émuler un téléphone Android sur ce serveur sans VM, sans laisser de trace sur l’hôte partagé ?

## Critères de décision

- **C1** — L’émulateur tourne sans virtualisation imbriquée.
- **C2** — L’hôte partagé est rendu identique après usage.
- **C3** — Le garde root est vérifié avant d’agir.
- **C4** — L’image et les devices sont épinglés et vérifiés.

## Options étudiées

- Redroid en conteneur avec un garde root vérifié
- Un émulateur Google accéléré
- Waydroid
- Un service d’émulation distant payant

## Décision

Option retenue : « Redroid en conteneur avec un garde root vérifié », parce que c’est la seule option qui tourne sans virtualisation imbriquée (C1), rend l’hôte identique (C2), vérifie le garde root avant d’agir (C3) et épingle image et devices (C4).

- **R1** — L’émulateur DOIT tourner dans un conteneur Redroid dont l’image est épinglée par digest.
- **R2** — Les devices binder DOIVENT être chargés et ouverts avant le démarrage.
- **R3** — Le garde root DOIT être installé depuis le dernier commit et armé sur ce démarrage de l’hôte.
- **R4** — Après `pnpm emulator:down`, l’hôte DOIT être identique et sans écriture d’Android.
- **R5** — Le garde root DOIT restaurer chaque sysctl et chaque point de `/proc` que l’init d’Android réécrit.

### Conséquences

- Bien, parce que l’hôte partagé retrouve son état après chaque session.
- Bien, parce que le garde root est prouvé avant de toucher l’hôte.
- Mauvais, parce que le conteneur privilégié donne un accès proche de l’hôte, d’où l’écoute sur la seule boucle locale.

## Avantages et inconvénients des options

### Redroid en conteneur avec un garde root vérifié

- Bien, parce qu’il tourne sans virtualisation imbriquée (C1).
- Bien, parce que l’hôte est restauré et vérifié (C2).
- Bien, parce que le garde est prouvé avant d’agir (C3).
- Bien, parce que l’image et les devices sont épinglés (C4).

### Un émulateur Google accéléré

- Mauvais, parce qu’il exige KVM, absent de ce serveur (C1).

### Waydroid

- Mauvais, parce qu’il entre en conflit réseau avec Docker et laisse des traces (C2).

### Un service d’émulation distant payant

- Mauvais, parce que l’appareil sort de la machine et coûte à la minute (C1).

## Informations complémentaires

- Le conteneur ne sert qu’aux tests fonctionnels et aux captures : le rendu logiciel exclut toute mesure de performance, faite sur un téléphone réel.
- Réévaluation : Redroid cesse d’être maintenu, ou un téléphone réel via le tailnet suffit aux tests.
