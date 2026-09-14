---
format: 1
status: proposed
significance: [dependency, guarded-config, boundary, data-format, reversal-cost]
---

# Décisions structurantes en ADR MADR vérifiés et figés

## Contexte et problème

- Nygard numérote les décisions sans jamais réutiliser un numéro et conserve une décision remplacée ([Documenting Architecture Decisions](https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions)).
- MADR 4.0.0 sépare contexte, critères, options, décision, conséquences, confirmation et arguments ([modèle MADR 4.0.0](https://github.com/adr/madr/blob/4.0.0/template/adr-template.md)).
- La documentation du tag 4.0.0 de MADR écrit encore « There is currently no tooling supporting MADR 3.0.0 » ([docs/index.md](https://github.com/adr/madr/blob/4.0.0/docs/index.md)).
- Un hook `PreToolUse` de Claude Code peut refuser un appel d’outil, y compris dans un sous-agent ([hooks](https://code.claude.com/docs/en/hooks)).
- Claude Code donne la valeur `1` à `CLAUDECODE` dans l’environnement des commandes qu’il lance ([variables d’environnement](https://code.claude.com/docs/en/env-vars)).
- Ses règles de permission `deny` ne sont pas une frontière de sécurité ([permissions](https://code.claude.com/docs/en/permissions)).

Comment consigner chaque décision structurante pour qu’elle reste vérifiable, sans double source, et décidée par un humain ?

## Critères de décision

- **C1** — Chaque règle est vérifiée par une commande locale.
- **C2** — Chaque information a une seule source.
- **C3** — Seul le décideur humain accepte ou rejette une décision.
- **C4** — Un ADR se lit sans outil.
- **C5** — Écrire un ADR reste rapide.

## Options étudiées

- MADR 4 traduit et vérifié par l’outillage du dépôt
- MADR 4 sans outillage
- adrs
- Log4brains

## Décision

Option retenue : « MADR 4 traduit et vérifié par l’outillage du dépôt », parce que c’est la seule option qui vérifie chaque règle en local (C1), garde une source par information (C2) et laisse la décision à l’humain (C3).

- **R1** — Un ADR DOIT suivre le format de la version écrite dans son en-tête, tel que le vérifie `pnpm adr:check`.
- **R2** — Un ADR décidé DOIT rester conforme au format de son en-tête : une grammaire qui le refuserait devient une nouvelle version, que suit tout ADR proposé.
- **R3** — Un ADR DOIT argumenter sa décision : faits sourcés, critères numérotés, deux options au moins, option retenue parmi elles, arguments qui citent un critère, coût nommé et déclencheur de réévaluation.
- **R4** — Une règle DOIT porter un identifiant et un seul mot-clé en capitales, au singulier ou au pluriel ; ailleurs, ces mots s’écrivent en minuscules ou en code, et les autres modaux en capitales sont refusés.
- **R5** — Un ADR commité NE DOIT PAS être supprimé ni céder son numéro à un autre ADR.
- **R6** — Un ADR DOIT être commité en `proposed`, puis accepté ou rejeté sans autre changement que son statut.
- **R7** — Un ADR accepté ou rejeté NE DOIT PAS changer, ni de contenu ni de nom.
- **R8** — Un agent NE DOIT PAS décider d’un ADR : ni statut décidé écrit ou commité, ni ADR décidé modifié, ni commande de décision lancée.
- **R9** — Chaque règle contraignante d’un ADR accepté DOIT être liée à des preuves ou à une convention justifiée, avec au moins une règle prouvée, un périmètre et des preuves qui passent à l’acceptation.
- **R10** — L’index des ADR DOIT être généré par l’outillage, jamais écrit à la main.
- **R11** — Un ADR DOIT déclarer dès sa proposition, dans `supersedes`, les ADR acceptés plus anciens qu’il remplace ; le remplacement prend effet à son acceptation, sans modifier les fichiers remplacés.
- **R12** — Un écart d’historique PEUT être reconnu pour un ADR et un commit, un contenu ou un nom précis, avec sa raison, plutôt que corrigé en réécrivant git.
- **R13** — Un ADR proposé PEUT être modifié, renommé ou rejeté.

### Conséquences

- Bien, parce qu’une règle contraignante sans preuve ni convention bloque l’acceptation.
- Bien, parce que preuves et périmètres vivent dans du TypeScript typé, pas dans un document figé.
- Mauvais, parce que chaque contrôle, ses fixtures et chaque format suivi par un ADR décidé restent à maintenir dans l’outillage.
- Mauvais, parce que la confirmation MADR sort du fichier : l’index dit comment chaque règle est prouvée.
- Mauvais, parce qu’un script peut encore contourner les hooks : la relecture des commits reste nécessaire pour R8.

## Avantages et inconvénients des options

### MADR 4 traduit et vérifié par l’outillage du dépôt

- Bien, parce que format, historique et preuves se vérifient en local (C1).
- Bien, parce que la spécification typée, l’historique git et le fichier des liaisons sont les seules sources (C2).
- Bien, parce que les hooks et `adr:decide` refusent une décision prise par un agent, sauf contournement par script (C3).
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

- Écarts avec MADR 4.0.0 : sections toutes obligatoires ; champs `date`, `decision-makers`, `consulted` et `informed` retirés ; champs `format`, `significance` et `supersedes` ajoutés ; statuts fermés et `superseded` calculé ; confirmation tenue par le fichier des liaisons.
- Référentiel en vigueur : [index des ADR](README.md), qui nomme le fichier des liaisons et décrit chaque format publié.
- Mots-clés : sens de BCP 14, en capitales seulement ([RFC 2119](https://www.rfc-editor.org/rfc/rfc2119), [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174)).
- Amorçage : le socle pnpm, TypeScript, ESLint, Prettier et Vitest précède cet ADR.
- Réévaluation : une version de MADR ou un validateur maintenu vérifie à la fois l’historique git et les preuves.
