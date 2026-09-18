---
format: 1
status: proposed
significance: [dependency, guarded-config]
---

# TypeScript 6 ultra-strict en version unique

## Contexte et problème

- Le catalog épingle typescript 6.0.3 et typescript-eslint 8.70.0, et `catalogMode: strict` en fait une version unique dans le graphe (`cat pnpm-workspace.yaml`).
- typescript-eslint borne la version de TypeScript qu’il accepte ([versions supportées](https://typescript-eslint.io/users/dependency-versions)).
- `packages/tsconfig/strict.json` porte les options strictes, et chaque projet l’étend (`cat packages/tsconfig/strict.json`).
- `tools/governance/src/tsconfig-snapshot.test.ts` compare les options effectives de chaque projet au préréglage (`pnpm test`).
- Node 24 exécute les sources TypeScript en effaçant les types, les imports portant l’extension `.ts` ([journal 0a](../spikes/phase-0a.md)).

Comment garder un typage maximal, identique partout, sans qu’un projet ou une version l’assouplisse ?

## Critères de décision

- **C1** — Une seule version de TypeScript vaut pour tout le dépôt.
- **C2** — Chaque projet hérite des mêmes options strictes.
- **C3** — Node exécute les sources sans étape de compilation.
- **C4** — Un assouplissement est refusé par un contrôle local.

## Options étudiées

- TypeScript 6 unique avec un préréglage strict partagé
- Une version de TypeScript par paquet
- Des options strictes recopiées dans chaque projet
- TypeScript 7, le portage natif

## Décision

Option retenue : « TypeScript 6 unique avec un préréglage strict partagé », parce que c’est la seule option qui tient une version unique (C1), donne à chaque projet les mêmes options (C2), s’exécute sous Node sans compilation (C3) et refuse tout assouplissement en local (C4).

- **R1** — Le graphe de dépendances DOIT résoudre TypeScript en une seule version.
- **R2** — Chaque projet DOIT garder les options strictes du préréglage partagé, `erasableSyntaxOnly` compris.
- **R3** — Un module DOIT être importé avec son extension `.ts`, non par un chemin `.js` recompilé.
- **R4** — Le code NE DOIT PAS employer un décorateur ni un accesseur `accessor`, que Node n’efface pas.
- **R5** — Chaque projet DOIT déclarer en référence les paquets qu’il importe, pour `tsc --build`.
- **R6** — Le code NE DOIT PAS appeler `process.exit`, qui coupe les sorties en attente.

### Conséquences

- Bien, parce qu’une seule version supprime les écarts de vérification entre paquets.
- Bien, parce qu’un projet ne peut pas assouplir une option en silence.
- Mauvais, parce que la version de TypeScript reste bornée par typescript-eslint.

## Avantages et inconvénients des options

### TypeScript 6 unique avec un préréglage strict partagé

- Bien, parce qu’une version unique vaut partout (C1).
- Bien, parce que chaque projet étend le même préréglage (C2).
- Bien, parce que Node exécute les `.ts` sans compilation (C3).
- Bien, parce que le test des options refuse tout assouplissement (C4).

### Une version de TypeScript par paquet

- Mauvais, parce que deux paquets vérifient leur code différemment (C1).

### Des options strictes recopiées dans chaque projet

- Mauvais, parce qu’une copie diverge sans que rien le voie (C2).

### TypeScript 7, le portage natif

- Mauvais, parce que typescript-eslint ne le supporte pas encore et le lint ne tournerait plus (C4).

## Informations complémentaires

- Node efface les types sans les transformer : enum, namespace, décorateur et accesseur `accessor` échoueraient à l’exécution, aussi `erasableSyntaxOnly` les refuse dès la compilation.
- Réévaluation : typescript-eslint publie une version qui supporte TypeScript 7.
