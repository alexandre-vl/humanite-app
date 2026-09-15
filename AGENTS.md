<!-- Généré par pnpm gen : ne pas modifier à la main. -->

# Guide des agents

Chaque règle structurante du dépôt vit dans un ADR (`docs/adr`) et un outil la fait respecter. Ce guide dit où les trouver ; il n’en ajoute aucune.

## Avant de terminer

- `pnpm verify` doit passer : `gen:check`, `hooks:check`, `deps:check`, `format:check`, `expo:types`, `structure:check`, `knip`, `lint`, `typecheck`, `test`, `adr:check`. Le hook Stop le relance quand l’arbre a changé depuis la dernière vérification verte.
- Les sessions de Claude Code démarrent à la racine du dépôt : les réglages et les hooks du projet ne sont lus que depuis le `.claude/` du dossier de démarrage.

## Commandes

| Commande                | Rôle                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------ |
| `pnpm adr:check`        | vérifie les ADR, leurs liens et leur historique                                                        |
| `pnpm adr:decide`       | accepte ou rejette un ADR proposé (décideur humain seulement, dans son propre terminal)                |
| `pnpm adr:new`          | crée un ADR proposé au dernier format                                                                  |
| `pnpm adr:status`       | liste les ADR, leur statut et leurs preuves                                                            |
| `pnpm deps:check`       | vérifie manifestes, catalog, références TypeScript et lockfile                                         |
| `pnpm emulator:build`   | génère android/ puis confie à un service utilisateur l’attente d’un hôte calme et le build natif       |
| `pnpm emulator:down`    | supprime le conteneur de l’émulateur et attend que le garde root ait restauré l’hôte                   |
| `pnpm emulator:e2e`     | lance les parcours Maestro de l’app sur l’émulateur                                                    |
| `pnpm emulator:gradle`  | attend un hôte calme, puis construit l’APK de l’émulateur avec Gradle dans une scope plafonnée         |
| `pnpm emulator:install` | installe le dev client construit sur l’émulateur                                                       |
| `pnpm emulator:metro`   | sert l’app au dev client avec Metro, sur la boucle locale                                              |
| `pnpm emulator:status`  | vérifie sans rien changer ce que l’émulateur Android exige, et affiche les commandes root qui manquent |
| `pnpm emulator:up`      | démarre l’émulateur Android et vérifie chaque étape, restauration de l’hôte comprise                   |
| `pnpm expo:types`       | génère les types de routes de chaque app Expo, sans qu’Expo réécrive un fichier suivi                  |
| `pnpm format`           | formate les fichiers du dépôt                                                                          |
| `pnpm format:check`     | vérifie le formatage des fichiers du dépôt                                                             |
| `pnpm gen`              | régénère les fichiers dérivés                                                                          |
| `pnpm gen:check`        | vérifie que les fichiers dérivés sont à jour                                                           |
| `pnpm hooks:check`      | vérifie les hooks git et Claude Code installés, et l’historique des messages                           |
| `pnpm hooks:install`    | installe les hooks git du dépôt                                                                        |
| `pnpm knip`             | cherche les fichiers, exports et dépendances que rien n’emploie                                        |
| `pnpm lint`             | ESLint sur les fichiers du dépôt, sans cache ni suppressions : aucun message toléré                    |
| `pnpm structure:check`  | vérifie la structure Feature-Sliced de chaque app avec Steiger et y cherche les cycles d’imports       |
| `pnpm test`             | tests et fixtures des outils                                                                           |
| `pnpm typecheck`        | vérification des types de chaque projet                                                                |
| `pnpm verify`           | tous les contrôles du dépôt, dans l’ordre                                                              |

## Ce que la garde des agents fait respecter

Un appel refusé nomme chaque règle qu’il enfreint par son code, suivi de ce qu’il faut faire à la place.

| Code                          | Règle                                                                                                |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| `agent/privilege-escalation`  | aucune commande root, sous une autre identité ou dans les namespaces d’un autre processus            |
| `agent/opaque-program`        | le programme de chaque commande se lit en clair dans la ligne                                        |
| `agent/git-hooks-bypass`      | les hooks git du dépôt s’exécutent à chaque écriture de l’historique                                 |
| `agent/session-masking`       | une session d’agent reste visible aux outils du dépôt                                                |
| `agent/human-only-command`    | les commandes du décideur humain ne sont lancées que par lui                                         |
| `agent/emulator-direct`       | le conteneur de l’émulateur, son réseau, son volume et son image ne changent que par pnpm emulator:* |
| `agent/git-directory`         | le dossier .git ne s’écrit qu’à travers git                                                          |
| `agent/claude-settings`       | les réglages Claude Code du dépôt ne s’écrivent que par pnpm gen                                     |
| `agent/claude-local-settings` | aucun réglage local de Claude Code                                                                   |
| `agent/verify-stamp`          | la trace de la dernière vérification verte ne s’écrit que par pnpm verify                            |
| `agent/adr-decided`           | un ADR décidé ne change plus                                                                         |
| `agent/adr-not-proposed`      | un agent n’écrit que des ADR proposés, à l’en-tête canonique                                         |
| `agent/adr-unknown-result`    | la garde calcule ce que la modification d’un ADR y laisse                                            |
| `agent/adr-shell-unknown`     | la garde calcule ce qu’une commande écrit dans un ADR                                                |
| `agent/adr-tree`              | rien n’écrit ni ne supprime en bloc dans le dossier des ADR                                          |
| `agent/adr-alias`             | aucun lien vers un ADR                                                                               |
| `agent/unreadable-call`       | l’entrée du hook est un objet JSON                                                                   |
| `agent/call-without-tool`     | l’entrée du hook nomme un outil et ses paramètres                                                    |
| `agent/call-without-command`  | un appel d’outil shell porte une commande lisible                                                    |
| `agent/call-without-path`     | un appel d’outil de fichier porte un chemin lisible                                                  |
| `agent/code-unjudgeable`      | le code qu’un outil exécute ne mentionne aucune zone protégée                                        |

## Commits

- Un commit passe par les hooks git : l’index contient tout l’arbre de travail, `pnpm verify` passe sur lui, le message suit Conventional Commits.
- Types : `feat`, `fix`, `perf`, `refactor`, `docs`, `test`, `build`, `chore`, `revert`, `style`. Portées : le dossier d’un paquet sous `apps/`, `packages/`, `tools/` présent dans le commit ou son parent, ou `repo`, `spikes`. Les messages `fixup!`, `squash!` et `amend!` sont refusés.
- Un trailer `Refs: ADR-NNNN` par ligne cite chaque ADR accepté dont le périmètre contient un chemin du commit, et chaque ADR dont le fichier change.

## Où lire

- `docs/adr/README.md` : ADR en vigueur, formats, contrôles et preuves de chaque règle.
- `tools/governance/src/bindings.ts` : preuves et périmètre de chaque ADR.
- `tools/governance/src/commands.ts` : chaque commande et chaque étape de `pnpm verify`.
