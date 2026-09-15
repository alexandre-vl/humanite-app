import type { CheckCodeOf } from '@huma/kit/checks';
import { defineChecks } from '@huma/kit/checks';

/**
 * Every refusal of the agent guard: what it keeps true, then what the agent reads when a call breaks it. A call can be
 * refused for several reasons at once, and each one is a code that a fixture proves.
 */
const TABLE = {
  'agent/privilege-escalation': {
    summary: 'aucune commande root, sous une autre identité ou dans les namespaces d’un autre processus',
    message:
      'Les commandes root, et celles qui prennent une autre identité ou les namespaces d’un autre processus, sont lancées par l’utilisateur lui-même, jamais par un agent.',
  },
  'agent/opaque-program': {
    summary: 'le programme de chaque commande se lit en clair dans la ligne',
    message:
      'Le programme de cette commande ne se lit pas dans la ligne : écrire son nom en clair, pour que la garde sache ce qu’elle laisse passer.',
  },
  'agent/git-hooks-bypass': {
    summary: 'les hooks git du dépôt s’exécutent à chaque écriture de l’historique',
    message:
      'Les hooks git du dépôt ne se contournent pas : ni --no-verify, ni core.hooksPath ou alias, ni dépôt ou arbre désigné ailleurs, ni plomberie qui écrit sans hooks.',
  },
  'agent/session-masking': {
    summary: 'une session d’agent reste visible aux outils du dépôt',
    message: 'Une session d’agent ne masque pas les variables qui la signalent aux outils du dépôt.',
  },
  'agent/human-only-command': {
    summary: 'les commandes du décideur humain ne sont lancées que par lui',
    message: '{scripts} revient au décideur humain : il le lance dans son propre terminal.',
  },
  'agent/emulator-direct': {
    summary: 'le conteneur de l’émulateur, son réseau, son volume et son image ne changent que par pnpm emulator:*',
    message:
      'Le conteneur de l’émulateur ne se lance, ne s’ouvre et ne s’arrête que par pnpm emulator:up et pnpm emulator:down, qui attendent le garde root.',
  },
  'agent/git-directory': {
    summary: 'le dossier .git ne s’écrit qu’à travers git',
    message: 'Le dossier .git ne s’écrit qu’à travers git.',
  },
  'agent/claude-settings': {
    summary: 'les réglages Claude Code du dépôt ne s’écrivent que par pnpm gen',
    message: 'Les réglages Claude Code du dépôt sont générés par pnpm gen depuis leur source typée.',
  },
  'agent/claude-local-settings': {
    summary: 'aucun réglage local de Claude Code',
    message: 'Des réglages locaux pourraient désactiver les hooks du dépôt.',
  },
  'agent/verify-stamp': {
    summary: 'la trace de la dernière vérification verte ne s’écrit que par pnpm verify',
    message:
      'La trace de la dernière vérification verte est écrite par pnpm verify : l’écrire à la main ferait passer le hook Stop sur un arbre que rien n’a vérifié.',
  },
  'agent/adr-decided': {
    summary: 'un ADR décidé ne change plus',
    message: 'Un ADR décidé est figé : pour changer la décision, proposer un nouvel ADR qui le remplace (supersedes).',
  },
  'agent/adr-not-proposed': {
    summary: 'un agent n’écrit que des ADR proposés, à l’en-tête canonique',
    message:
      'Un agent écrit un ADR avec l’en-tête canonique d’un ADR proposé (status: {status}). Décider d’un ADR ({decided}) revient au décideur humain : il lance la décision dans son propre terminal.',
  },
  'agent/adr-unknown-result': {
    summary: 'la garde calcule ce que la modification d’un ADR y laisse',
    message:
      'Contenu de l’ADR après cette modification incalculable (texte à remplacer absent tel quel) : reprendre le texte exact, ou modifier l’en-tête dans un appel séparé.',
  },
  'agent/adr-shell-unknown': {
    summary: 'la garde calcule ce qu’une commande écrit dans un ADR',
    message:
      'Contenu de l’ADR après cette commande incalculable : écrire un ADR proposé avec les outils Write ou Edit, que la garde sait juger.',
  },
  'agent/adr-tree': {
    summary: 'rien n’écrit ni ne supprime en bloc dans le dossier des ADR',
    message:
      'Cette commande écrit ou supprime en bloc dans le dossier des ADR : un ADR décidé ne change plus et un ADR commité ne se supprime pas.',
  },
  'agent/adr-alias': {
    summary: 'aucun lien vers un ADR',
    message:
      'Un lien vers un ADR permettrait de l’écrire sans que la garde le voie : modifier l’ADR lui-même avec Write ou Edit.',
  },
  'agent/unreadable-call': {
    summary: 'l’entrée du hook est un objet JSON',
    message: 'Entrée du hook illisible : refusée par prudence.',
  },
  'agent/call-without-tool': {
    summary: 'l’entrée du hook nomme un outil et ses paramètres',
    message: 'Entrée du hook sans outil ou sans paramètres : refusée par prudence.',
  },
  'agent/call-without-command': {
    summary: 'un appel d’outil shell porte une commande lisible',
    message: 'Appel {tool} sans commande lisible : refusé par prudence.',
  },
  'agent/call-without-path': {
    summary: 'un appel d’outil de fichier porte un chemin lisible',
    message: 'Appel {tool} sans chemin de fichier lisible : refusé par prudence.',
  },
  'agent/code-unjudgeable': {
    summary: 'le code qu’un outil exécute ne mentionne aucune zone protégée',
    message: 'Code {tool} qui mentionne « {token} » : la garde ne sait pas le juger, refusé par prudence.',
  },
} as const;

export const AGENT_CHECKS = defineChecks(TABLE);

export type AgentCode = CheckCodeOf<typeof TABLE>;

export const agentRefusal = AGENT_CHECKS.refusal;
