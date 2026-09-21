---
format: 1
status: accepted
significance: [guarded-config]
---

# Glossaire et orthographe des identifiants

## Contexte et problème

- Le vocabulaire du domaine vit dans `packages/architecture/src/glossary.ts` (`cat packages/architecture/src/glossary.ts`).
- cspell refuse un identifiant qui n’est pas un mot anglais connu, les commentaires et les chaînes restant libres (`cat packages/eslint-config/src/spelling.ts`).
- Le glossaire signale un identifiant qui emploie un terme français au lieu du mot anglais retenu (`cat packages/eslint-config/src/spelling.ts`).
- check-file impose le kebab-case des fichiers et des dossiers, ou les conventions d’Expo Router pour une route (`cat packages/eslint-config/src/index.ts`).
- Le spike 0a a vérifié cspell et check-file sous ESLint 10 ([journal 0a](../spikes/phase-0a.md)).

Comment garder un vocabulaire anglais unique dans les identifiants et une casse de fichiers cohérente ?

## Critères de décision

- **C1** — Les identifiants s’écrivent en mots anglais.
- **C2** — Un terme du domaine a un seul mot retenu.
- **C3** — Les noms de fichiers suivent une casse unique.
- **C4** — Un écart est refusé par un contrôle local.

## Options étudiées

- Un glossaire et cspell qui imposent l’anglais et la casse
- Des identifiants libres
- Un dictionnaire sans glossaire de synonymes
- Une convention de nommage non outillée

## Décision

Option retenue : « Un glossaire et cspell qui imposent l’anglais et la casse », parce que c’est la seule option qui tient les identifiants en anglais (C1), retient un mot par terme (C2), impose une casse de fichiers (C3) et refuse un écart en local (C4).

- **R1** — Un identifiant DOIT s’écrire en mots anglais connus du vérificateur d’orthographe.
- **R2** — Un identifiant DOIT employer le mot anglais que le glossaire retient pour un terme du domaine.
- **R3** — Un nom de fichier ou de dossier DOIT s’écrire en kebab-case, ou selon les conventions d’Expo Router pour une route.

### Conséquences

- Bien, parce que le vocabulaire reste anglais et unique.
- Bien, parce qu’un nom de fichier hors casse est refusé.
- Mauvais, parce qu’un mot nouveau doit être ajouté au vocabulaire avant son usage.

## Avantages et inconvénients des options

### Un glossaire et cspell qui imposent l’anglais et la casse

- Bien, parce que cspell refuse un identifiant non anglais (C1).
- Bien, parce que le glossaire impose un mot par terme (C2).
- Bien, parce que check-file impose la casse des fichiers (C3).
- Bien, parce que ces contrôles tournent en local (C4).

### Des identifiants libres

- Mauvais, parce que le vocabulaire diverge sans contrôle (C1).

### Un dictionnaire sans glossaire de synonymes

- Mauvais, parce que deux mots désignent le même terme (C2).

### Une convention de nommage non outillée

- Mauvais, parce qu’une casse non vérifiée dérive (C3).

## Informations complémentaires

- Les textes affichés par l’app restent en français, dans leur dictionnaire propre ; seuls les identifiants sont tenus à l’anglais.
- Réévaluation : cspell ou check-file cesse d’être maintenu pour ESLint 10.
