import type { CheckCodeOf } from '@huma/kit/checks';
import { defineChecks } from '@huma/kit/checks';

/** Findings of the git hooks, of their installation and of the commit history they leave. */
const TABLE = {
  'git/unstaged': {
    summary: 'l’index commité contient tout l’arbre de travail',
    message: 'modification hors de l’index : l’ajouter (git add) ou l’annuler avant de commiter',
  },
  'git/untracked': {
    summary: 'aucun fichier non suivi au moment du commit',
    message: 'fichier non suivi : l’ajouter, le supprimer ou l’ignorer dans .gitignore',
  },
  'git/unmerged': {
    summary: 'aucun conflit non résolu au moment du commit',
    message: 'conflit non résolu',
  },
  'git/index-flagged': {
    summary: 'aucun fichier caché à git status',
    message: 'fichier marqué {tag} dans l’index : git update-index --no-assume-unchanged --no-skip-worktree',
  },
  'git/verify-failed': {
    summary: 'pnpm verify passe sur ce qui est commité',
    message: 'pnpm verify échoue à l’étape {step} ({ending})',
  },
  'git/tree-changed': {
    summary: 'les contrôles ne changent pas ce qui est commité',
    message: 'l’index ou l’arbre de travail a changé pendant les contrôles : relancer le commit',
  },
  'git/verify-skipped': {
    summary: 'chaque commit passe par pre-commit',
    message: 'commit sans pre-commit, ou index modifié depuis : relancer git commit sans --no-verify',
  },
  'git/patch-refused': {
    summary: 'aucun commit par git am, qui saute pre-commit',
    message: 'git am ne passe pas par pre-commit : appliquer le patch avec git apply, puis commiter',
  },
  'git/header': {
    summary: 'l’en-tête suit Conventional Commits',
    message: 'en-tête « {header} » : type(portée)!: description attendu',
  },
  'git/type': {
    summary: 'le type fait partie de la liste',
    message: 'type {type} : {types} attendu',
  },
  'git/scope': {
    summary: 'la portée nomme un paquet ou une portée connue',
    message: 'portée {scope} : {scopes} attendu',
  },
  'git/header-length': {
    summary: 'l’en-tête reste court',
    message: 'en-tête de {length} caractères : {max} au plus',
  },
  'git/body-separator': {
    summary: 'une ligne vide sépare l’en-tête du corps',
    message: 'ligne 2 non vide : l’en-tête tient sur une ligne suivie d’une ligne vide',
  },
  'git/not-canonical': {
    summary: 'le message est déjà nettoyé',
    message: 'espaces en fin de ligne, lignes vides en trop ou fin de message non canonique',
  },
  'git/comment-line': {
    summary: 'aucune ligne de commentaire commitée',
    message: 'ligne commençant par # : elle serait commitée telle quelle',
  },
  'git/control-character': {
    summary: 'aucun caractère de contrôle',
    message: 'caractère de contrôle U+{code} dans le message',
  },
  'git/generated-message': {
    summary: 'aucun message écrit par git',
    message: 'message de {kind} écrit par git : donner un message Conventional Commits avec -m',
  },
  'git/trailer-unknown': {
    summary: 'seuls les trailers connus terminent le message',
    message: 'trailer {key} : {keys} attendu',
  },
  'git/breaking-change-space': {
    summary: 'BREAKING-CHANGE s’écrit avec un tiret',
    message: 'BREAKING CHANGE: n’est pas lu comme un trailer : écrire BREAKING-CHANGE:',
  },
  'git/refs-format': {
    summary: 'chaque trailer Refs nomme un seul ADR',
    message: 'Refs: {value} : un trailer par ADR, sous la forme ADR-NNNN',
  },
  'git/refs-order': {
    summary: 'les trailers Refs sont triés et uniques',
    message: 'trailers Refs dans le désordre ou répétés : {expected} attendu',
  },
  'git/refs-missing': {
    summary: 'le commit cite chaque ADR dont il touche le périmètre',
    message: 'Refs: {id} manquant : {reason}',
  },
  'git/refs-extra': {
    summary: 'le commit ne cite que les ADR qu’il touche',
    message: 'Refs: {id} en trop : le commit ne touche ni son fichier ni son périmètre',
  },
  'git/hook-missing': {
    summary: 'chaque hook git du dépôt est installé',
    message: 'hook {hook} absent : lancer pnpm hooks:install',
  },
  'git/hook-modified': {
    summary: 'chaque hook installé est celui que le dépôt génère',
    message: 'hook {hook} modifié : lancer pnpm hooks:install',
  },
  'git/hook-not-executable': {
    summary: 'chaque hook installé est exécutable',
    message: 'hook {hook} non exécutable : git l’ignore ; lancer pnpm hooks:install',
  },
  'git/hook-unexpected': {
    summary: 'aucun autre hook exécutable',
    message: 'hook {name} inconnu du dépôt : le retirer',
  },
  'git/hooks-directory-link': {
    summary: 'le dossier des hooks est un vrai dossier',
    message: 'le dossier des hooks est un lien symbolique : le remplacer par un dossier, puis pnpm hooks:install',
  },
  'git/hooks-path': {
    summary: 'aucun core.hooksPath ne détourne les hooks',
    message: 'core.hooksPath = {value} ({scope}, {origin}) : les hooks du dépôt ne s’exécutent pas',
  },
  'git/config-include': {
    summary: 'aucune inclusion de configuration locale',
    message: '{key} ({scope}, {origin}) : une configuration incluse peut désactiver les hooks',
  },
  'git/history-shallow': {
    summary: 'l’historique est complet',
    message: 'clone superficiel : l’historique des messages ne peut pas être vérifié',
  },
  'git/anchor-unknown': {
    summary: 'le commit d’ancrage de l’historique existe',
    message: 'commit d’ancrage {anchor} introuvable',
  },
  'git/anchor-not-ancestor': {
    summary: 'la branche descend du commit d’ancrage',
    message: 'HEAD ne descend pas du commit d’ancrage {anchor} : historique réécrit ?',
  },
  'git/ci-missing': {
    summary: 'les workflows qui rejouent les contrôles et publient les versions sont écrits',
    message: 'workflow {path} absent : la CI et la release en dépendent',
  },
  'git/ci-unreadable': {
    summary: 'chaque workflow se lit',
    message: 'workflow {path} illisible : {reason}',
  },
  'git/ci-trigger': {
    summary: 'la CI tourne à chaque push sur main et à chaque pull request, la release sur un tag seulement',
    message: 'workflow {path} : {expected} attendu',
  },
  'git/ci-verify': {
    summary: 'un job de la CI installe les hooks puis lance pnpm verify',
    message: 'aucun job de {path} ne lance pnpm hooks:install puis pnpm verify',
  },
  'git/ci-shallow': {
    summary: 'la CI vérifie et cherche les secrets sur un clone complet',
    message: 'le job {job} clone sans fetch-depth: 0 : l’historique qu’il relit y manque',
  },
  'git/ci-merge-ref': {
    summary: 'une pull request se vérifie sur sa tête',
    message:
      'le job {job} vérifie le commit de fusion d’une pull request, au message « Merge … » refusé : ref sur github.event.pull_request.head.sha attendue',
  },
  'git/ci-secrets': {
    summary: 'la CI cherche un secret dans tout l’historique',
    message: 'aucun job de {path} ne lance gitleaks git',
  },
  'git/ci-unpinned': {
    summary: 'chaque action d’un workflow est épinglée par un SHA complet',
    message: 'action {action} de {path} : l’épingler par un SHA de 40 caractères',
  },
  'git/ci-permissions': {
    summary: 'le jeton d’un workflow ne fait que lire, et la CI n’en demande pas davantage',
    message: 'permissions {scope} de {path} : read ou none seulement',
  },
  'git/ci-identity': {
    summary: 'un workflow ne lit que la clé de release, jamais l’identité prêtée aux tests',
    message: '{path} nomme {name} : un binaire construit ici ne porte ni la clé prêtée ni un autre secret',
  },
  'git/ci-variant': {
    summary: 'chaque binaire construit par un workflow est la variante de service',
    message:
      'le job {job} de {path} construit sans EXPO_PUBLIC_CONTENT_SOURCE: service : il montrerait le corpus fictif',
  },
  'git/release-identity': {
    summary: 'la release construit l’identité des releases, alexandrevl.humanite.app',
    message: 'le job {job} de {path} construit sans APP_VARIANT: release : il publierait l’identité .dev',
  },
  'git/ci-release-identity': {
    summary: 'la CI construit l’identité .dev, celle de la clé de debug',
    message:
      '{path} nomme APP_VARIANT : une build de la CI, signée par la clé de debug, ne demande jamais l’identité des releases',
  },
} as const;

const GIT_HOOK_CHECKS = defineChecks(TABLE);

export type GitHookCode = CheckCodeOf<typeof TABLE>;

export const gitHookFinding = GIT_HOOK_CHECKS.finding;
