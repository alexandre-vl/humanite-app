---
format: 1
status: proposed
significance: [dependency, guarded-config, boundary, reversal-cost]
---

# Décisions structurantes en ADR MADR vérifiés et figés

## Contexte et problème

- Nygard numérote les décisions sans jamais réutiliser un numéro et conserve une décision remplacée ([Documenting Architecture Decisions](https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions)).
- MADR 4.0.0 sépare contexte, critères, options, décision, conséquences, confirmation et arguments ([modèle MADR 4.0.0](https://github.com/adr/madr/blob/4.0.0/template/adr-template.md)).
- Sa documentation écrit « There is currently no tooling supporting MADR 3.0.0 » ([docs/index.md](https://github.com/adr/madr/blob/4.0.0/docs/index.md)).
- `git log -G` cherche une expression dans les lignes ajoutées ou retirées d’un diff, pas dans l’en-tête d’un fichier ([git log](https://git-scm.com/docs/git-log)).
- Un hook `PreToolUse` de Claude Code refuse un appel d’outil, sous-agents compris ([hooks](https://code.claude.com/docs/en/hooks)).
- Les commandes lancées par un agent Claude Code reçoivent `CLAUDECODE=1` dans leur environnement.

Comment consigner chaque décision structurante pour qu’elle reste vérifiable, sans double source, et décidée par un humain ?

## Critères de décision

- **C1** — Chaque règle est vérifiée par une commande locale.
- **C2** — Chaque information a une seule source.
- **C3** — Seul le décideur humain accepte ou rejette une décision.
- **C4** — Un ADR se lit sans outil.
- **C5** — Écrire un ADR reste rapide.

## Options étudiées

- MADR 4 traduit et vérifié par tools/adr
- MADR 4 sans outillage
- adrs
- Log4brains

## Décision

Option retenue : « MADR 4 traduit et vérifié par tools/adr », parce que c’est la seule option qui vérifie chaque règle en local (C1), garde une source par information (C2) et laisse la décision à l’humain (C3).

- **R1** — Un ADR DOIT suivre le format que vérifie `pnpm adr:check` : fichier `docs/adr/NNNN-slug.md`, en-tête canonique, sections de MADR 4.0.0 traduites, titre de 60 caractères et 900 mots au plus.
- **R2** — Un ADR DOIT argumenter sa décision : faits sourcés, critères numérotés, deux options au moins, option retenue parmi elles, arguments qui citent un critère, coût nommé et déclencheur de réévaluation.
- **R3** — Une règle DOIT porter un identifiant et un seul mot-clé en capitales parmi `DOIT`, `NE DOIT PAS` et `PEUT` ; hors des règles, ces mots s’écrivent en minuscules.
- **R4** — Un numéro NE DOIT PAS servir à deux ADR ni disparaître de l’historique git.
- **R5** — Un ADR DOIT être commité en `proposed` avant d’être accepté ou rejeté.
- **R6** — Un ADR accepté ou rejeté NE DOIT PAS changer, ni de contenu ni de nom.
- **R7** — Un agent NE DOIT PAS décider d’un ADR : ni statut décidé écrit, ni ADR décidé modifié, ni `adr:decide` lancé.
- **R8** — Chaque règle `DOIT` ou `NE DOIT PAS` d’un ADR accepté DOIT être liée, dans `tools/adr/src/bindings.ts`, à des preuves qui passent ou à une convention justifiée, avec un périmètre qui couvre des fichiers.
- **R9** — L’index `docs/adr/README.md` DOIT être généré par `pnpm adr:index`.
- **R10** — Un remplacement DOIT viser un ADR accepté plus ancien, depuis le `supersedes` d’un ADR accepté, sans modifier le fichier remplacé.
- **R11** — Un ADR proposé PEUT être modifié, renommé ou rejeté.

### Conséquences

- Bien, parce qu’un ADR dont une règle n’a ni preuve ni convention ne peut pas être accepté.
- Bien, parce que chemins et commandes vivent dans du TypeScript typé, pas dans un document figé.
- Mauvais, parce que `tools/adr` compte 29 contrôles et leurs fixtures à maintenir.
- Mauvais, parce que la confirmation MADR sort du fichier : l’index dit comment chaque règle est prouvée.
- Mauvais, parce qu’un script peut encore contourner le hook : la relecture des commits reste nécessaire pour R7.

## Avantages et inconvénients des options

### MADR 4 traduit et vérifié par tools/adr

- Bien, parce que format, historique et preuves se vérifient en local (C1).
- Bien, parce que `spec.ts`, l’historique git et `bindings.ts` sont les seules sources (C2).
- Bien, parce que le hook et `adr:decide` réservent la décision à l’humain (C3).
- Neutre, parce que le Markdown reste lisible sans outil (C4).
- Mauvais, parce que la grammaire stricte ralentit la rédaction (C5).

### MADR 4 sans outillage

- Bien, parce que rédiger ne demande que le modèle (C5).
- Mauvais, parce que rien ne vérifie le format, l’immuabilité ni les preuves (C1).
- Mauvais, parce qu’un agent peut changer un statut sans trace (C3).

### adrs

- Bien, parce que `adrs doctor` vérifie numérotation, liens et remplacements (C1).
- Neutre, parce que ses fichiers restent du Markdown lisible (C4).
- Mauvais, parce qu’il ignore l’historique git, les preuves et les agents (C3).

### Log4brains

- Bien, parce que son site statique présente les décisions (C4).
- Mauvais, parce qu’un statut inconnu y devient `draft` sans message (C1).

## Informations complémentaires

- Écarts avec MADR 4.0.0 : sections toutes obligatoires, champs `consulted` et `informed` retirés, statuts fermés, `superseded` calculé, confirmation tenue par `tools/adr/src/bindings.ts`.
- Référentiel en vigueur : [index des ADR](README.md), généré depuis `tools/adr/src/spec.ts`.
- Mots-clés : sens de BCP 14, en capitales seulement ([RFC 2119](https://www.rfc-editor.org/rfc/rfc2119), [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)).
- Amorçage : le socle posé avant cet ADR (pnpm, TypeScript, ESLint, Prettier, Vitest) sera consigné par ses propres ADR.
- Réévaluation : une version de MADR ou un validateur maintenu vérifie à la fois l’historique git et les preuves.
