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

## Ce que la garde des agents refuse

- Décider d’un ADR (accepted, rejected) revient au décideur humain : il lance la décision dans son propre terminal.
- Un ADR décidé est figé : pour changer la décision, proposer un nouvel ADR qui le remplace (supersedes).
- Les commandes root sont lancées par l’utilisateur lui-même, jamais par un agent.
- Le programme de cette commande ne se lit pas dans la ligne : écrire son nom en clair, pour que la garde sache ce qu’elle laisse passer.
- Les hooks git du dépôt ne se contournent pas : ni --no-verify, ni core.hooksPath ou alias, ni dépôt ou arbre désigné ailleurs, ni plomberie qui écrit sans hooks.
- Une session d’agent ne masque pas les variables qui la signalent aux outils du dépôt.
- adr:decide revient au décideur humain : il le lance dans son propre terminal.
- Le conteneur de l’émulateur ne se lance, ne s’ouvre et ne s’arrête que par pnpm emulator:up et pnpm emulator:down, qui attendent le garde root.
- `.git` : Le dossier .git ne s’écrit qu’à travers git.
- `.claude/settings.json` : Les réglages Claude Code du dépôt sont générés par pnpm gen depuis leur source typée.
- `.claude/settings.local.json` : Des réglages locaux pourraient désactiver les hooks du dépôt.
- `node_modules/.cache/huma/verify.json` : La trace de la dernière vérification verte est écrite par pnpm verify : l’écrire à la main ferait passer le hook Stop sur un arbre que rien n’a vérifié.

## Commits

- Un commit passe par les hooks git : l’index contient tout l’arbre de travail, `pnpm verify` passe sur lui, le message suit Conventional Commits.
- Types : `feat`, `fix`, `perf`, `refactor`, `docs`, `test`, `build`, `chore`, `revert`, `style`. Portées : le dossier d’un paquet sous `apps/`, `packages/`, `tools/` présent dans le commit ou son parent, ou `repo`, `spikes`. Les messages `fixup!`, `squash!` et `amend!` sont refusés.
- Un trailer `Refs: ADR-NNNN` par ligne cite chaque ADR accepté dont le périmètre contient un chemin du commit, et chaque ADR dont le fichier change.

## Où lire

- `docs/adr/README.md` : ADR en vigueur, formats, contrôles et preuves de chaque règle.
- `tools/governance/src/bindings.ts` : preuves et périmètre de chaque ADR.
- `tools/governance/src/commands.ts` : chaque commande et chaque étape de `pnpm verify`.
