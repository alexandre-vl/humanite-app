---
format: 1
status: proposed
significance: [guarded-config]
---

# Permissions des agents

## Contexte et problème

- Un hook PreToolUse de Claude Code juge chaque appel d’outil Edit, Write et Bash (`cat tools/agents/src/guard.ts`).
- Il refuse une commande privilégiée, un contournement des hooks git, une écriture directe dans `.git` ou sur les ressources de l’émulateur (`cat AGENTS.md`).
- Un appel refusé nomme chaque règle enfreinte par son code, suivi de ce qu’il faut faire à la place (`cat AGENTS.md`).
- Les règles de permission `deny` de Claude Code ne sont pas une frontière de sécurité ([permissions](https://code.claude.com/docs/en/permissions)).
- La garde qui empêche un agent de décider d’un ADR est déjà posée (ADR-0000).

Comment empêcher un agent de contourner les contrôles ou d’agir avec des privilèges, quand les permissions `deny` ne sont pas une frontière de sécurité ?

## Critères de décision

- **C1** — Un agent n’agit avec aucun privilège ni identité d’emprunt.
- **C2** — Un agent ne contourne aucun contrôle git, hook ou trace de vérification.
- **C3** — Les ressources de l’émulateur ne changent que par leur commande.
- **C4** — Un appel refusé nomme la règle enfreinte.

## Options étudiées

- Un hook PreToolUse qui refuse un appel et nomme la règle
- Les seules permissions `deny` de Claude Code
- La confiance dans les conventions
- Une revue humaine de chaque appel d’agent

## Décision

Option retenue : « Un hook PreToolUse qui refuse un appel et nomme la règle », parce que c’est la seule option qui bloque un privilège (C1), refuse un contournement de contrôle (C2), tient l’émulateur à sa commande (C3) et nomme la règle enfreinte (C4).

- **R1** — Un agent NE DOIT PAS lancer une commande privilégiée, sous une autre identité ou dans les namespaces d’un autre processus.
- **R2** — Un agent NE DOIT PAS contourner les hooks git ni détourner leur chemin.
- **R3** — Un agent DOIT passer par git pour écrire dans le dossier `.git`.
- **R4** — Les ressources de l’émulateur DOIVENT ne changer que par une commande `pnpm emulator`.
- **R5** — La trace de la dernière vérification verte NE DOIT PAS être forgée.

### Conséquences

- Bien, parce qu’un appel dangereux est refusé avant de s’exécuter.
- Bien, parce que le refus dit quelle règle il enfreint et quoi faire.
- Mauvais, parce qu’un script composé peut encore contourner un hook, d’où la relecture des commits.

## Avantages et inconvénients des options

### Un hook PreToolUse qui refuse un appel et nomme la règle

- Bien, parce qu’aucune commande privilégiée ne passe (C1).
- Bien, parce qu’un contournement de hook est refusé (C2).
- Bien, parce que l’émulateur ne change que par sa commande (C3).
- Bien, parce que le refus nomme la règle enfreinte (C4).

### Les seules permissions `deny` de Claude Code

- Mauvais, parce qu’elles ne sont pas une frontière de sécurité (C1).

### La confiance dans les conventions

- Mauvais, parce qu’une convention n’arrête pas un appel (C2).

### Une revue humaine de chaque appel d’agent

- Mauvais, parce qu’un refus manuel n’est ni immédiat ni nommé (C4).

## Informations complémentaires

- Les réglages Claude Code du dépôt et la garde contre la décision d’un ADR par un agent restent tenus par ADR-0000.
- Réévaluation : Claude Code change la forme de l’entrée du hook, ou ajoute une frontière de sécurité réelle.
