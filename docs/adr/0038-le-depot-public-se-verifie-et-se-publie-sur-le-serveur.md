---
format: 1
status: proposed
significance: [guarded-config, boundary]
---

# Le dépôt public se vérifie et se publie sur le serveur

## Contexte et problème

- Le dépôt est public depuis le 26/09/2026 (`gh api repos/alexandre-vl/humanite-app --jq .visibility`) : un contributeur propose du code depuis une copie où les hooks ne tournent qu’après `pnpm hooks:install`, et que `git commit --no-verify` saute.
- ADR-0008 a écarté une CI distante, qui sortait le contrôle de la machine, et en fait une réévaluation.
- `hooks:check` refuse un clone superficiel et un commit « Merge … » (`tools/git-hooks/src/history.ts`, `tools/git-hooks/src/message.ts`) : une CI qui vérifierait le commit de fusion synthétisé d’une pull request échouerait toujours.
- Un clone neuf, sans variable, passe `pnpm verify` en 139 s sur macOS, en 230 s sur ubuntu-24.04 avec 30 tests de plus (run 36235550080).
- gitleaks 8.30.1 relit tout l’historique : 14 alertes, toutes fausses — un JWT inventé des preuves de la capture, des clés de visuels du corpus fictif (`.gitleaks.toml`).
- Les builds natives ne se faisaient que chez le mainteneur (ADR-0010).
- Le template Expo signe l’APK de release par sa clé de debug, publique : n’importe qui signerait une mise à jour (`tools/emulator/src/variant.ts`).
- CodeQL, réglé par défaut, relit chaque push et pull request : 25 alertes au premier passage, corrigées ou closes comme fausses (`gh api repos/alexandre-vl/humanite-app/code-scanning/alerts`).

Comment le dépôt, devenu public, garde-t-il ses contrôles face au code d’autrui, et que publie-t-il de l’app ?

## Critères de décision

- **C1** — rien n’entre dans `main` sans que chaque contrôle ait passé sur lui
- **C2** — un binaire publié ne porte ni la clé prêtée aux tests ni le corpus fictif, et prouve son origine
- **C3** — l’historique de `main` ne se réécrit pas, même sur le serveur
- **C4** — le mainteneur garde son flux : commit sous hooks, push direct

## Options étudiées

- Une CI qui rejoue les contrôles, des règles sur le serveur, et des releases construites depuis un tag
- Les hooks seuls
- Une CI seule, sans hooks locaux

## Décision

Option retenue : « Une CI qui rejoue les contrôles, des règles sur le serveur, et des releases construites depuis un tag », parce qu’elle seule juge un commit fait hors des hooks (C1), publie des binaires signés et attestés sans la clé prêtée (C2), et verrouille `main` sans changer le flux du mainteneur (C3, C4).

- **R1** — Un commit poussé sur `main` ou proposé en pull request DOIT repasser `pnpm verify` sur un clone complet, à sa tête.
- **R2** — La CI DOIT chercher un secret dans tout l’historique à chaque push et à chaque pull request.
- **R3** — Une action de workflow DOIT être épinglée par un SHA complet.
- **R4** — Le jeton de la CI NE DOIT PAS pouvoir écrire.
- **R5** — Un binaire qu’un workflow construit NE DOIT PAS porter l’identité prêtée aux tests ni le corpus fictif.
- **R6** — Une release DOIT partir d’un tag `vX.Y.Z` posé sur un commit de `main` à la CI verte, et qui nomme la version de l’app.
- **R7** — L’APK d’une release DOIT être signé par la clé de release, que seul l’environnement `release` lit.
- **R8** — L’historique de `main` NE DOIT PAS pouvoir être réécrit ni supprimé sur le serveur.
- **R9** — Une pull request DOIT entrer dans `main` par rebase, sa CI verte.
- **R10** — Le mainteneur PEUT pousser directement sur `main`, ses hooks ayant passé.
- **R11** — Une pull request NE DOIT PAS entrer dans `main` avec une alerte CodeQL nouvelle.

### Conséquences

- Bien, parce qu’un commit fait hors des hooks échoue sur le serveur, messages compris, avant `main` (C1).
- Bien, parce qu’une release se prouve : APK signé par une clé privée, sommes SHA-256, attestation de provenance (C2).
- Bien, parce que `main` refuse le force-push et la suppression, même au mainteneur, ce que tient déjà ADR-0008 R6 en local (C3).
- Bien, parce que le mainteneur commite et pousse comme avant (C4).
- Mauvais, parce qu’un contributeur attend 25 minutes de CI avant sa fusion (C1).
- Mauvais, parce que les règles du serveur vivent hors du dépôt : aucun outil d’ici ne prouve R8 à R11 (C3).
- Mauvais, parce que les SHA d’action se montent à la main : la règle des messages refuse le `Signed-off-by` de Dependabot (C1).

## Avantages et inconvénients des options

### Une CI qui rejoue les contrôles, des règles sur le serveur, et des releases construites depuis un tag

- Bien, parce que la CI juge chaque commit, d’où qu’il vienne (C1).
- Bien, parce que le serveur refuse la réécriture de `main` (C3).
- Bien, parce qu’une release ne sort que de la CI, signée et attestée (C2).
- Mauvais, parce que les règles de pull request ne tiennent que les autres, pas le mainteneur (C1).

### Les hooks seuls

- Bien, parce que rien ne change (C4).
- Mauvais, parce qu’une pull request passée sans hooks entrerait sans contrôle (C1).
- Mauvais, parce qu’un APK ne se construirait que chez le mainteneur, signé par la clé publique du template (C2).

### Une CI seule, sans hooks locaux

- Bien, parce que chaque contrôle tourne au même endroit (C1).
- Mauvais, parce que le mainteneur ne saurait qu’après son push qu’un commit échoue (C4).

## Informations complémentaires

- Preuves : les fixtures `git/ci-*` et `git/valid-workflows` relisent les deux workflows pour R1 à R5 et le déclencheur de R6 (`tools/git-hooks/src/proofs/workflow.ts`) ; le workflow de release tient le reste de R6 et R7, les règles du dépôt R8 à R11 (`gh api repos/alexandre-vl/humanite-app/rulesets`).
- Réévaluation : GitHub change ce que ses règles de branche tiennent, ou la CI dépasse l’heure.
