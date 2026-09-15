import { AGENT_CHECKS } from '@huma/agents/checks';
import { ADR_DIRECTORY, INDEX_FILE } from '@huma/adr/layout';
import { BINDINGS_PATH } from './bindings.ts';
import { COMMIT_TYPES, EXTRA_SCOPES, REFS_TRAILER } from './commit-policy.ts';
import { WORKSPACE_ROOTS } from './workspace-manifest.ts';
import type { CommandName } from './commands.ts';
import { COMMAND_NAMES, COMMANDS, COMMANDS_PATH, isScriptCommand, VERIFY_PLAN } from './commands.ts';

const code = (text: string): string => `\`${text}\``;

const cell = (text: string): string => text.replaceAll('|', String.raw`\|`);

const scriptRow = (name: CommandName): string => {
  const spec = COMMANDS[name];
  const who = spec.audience === 'human' ? ' (décideur humain seulement, dans son propre terminal)' : '';
  return `| ${code(`pnpm ${name}`)} | ${cell(`${spec.summary}${who}`)} |`;
};

/**
 * `AGENTS.md`: what an agent working in the repository needs to know, taken from the sources the tools enforce. It
 * adds no rule of its own; every line points at a command, a check or an ADR.
 */
export function renderAgentsGuide(generator: string): string {
  const scripts = COMMAND_NAMES.filter((name) => isScriptCommand(COMMANDS[name]));
  return [
    `<!-- Généré par ${generator} : ne pas modifier à la main. -->`,
    '',
    '# Guide des agents',
    '',
    `Chaque règle structurante du dépôt vit dans un ADR (${code(ADR_DIRECTORY)}) et un outil la fait respecter. Ce guide dit où les trouver ; il n’en ajoute aucune.`,
    '',
    '## Avant de terminer',
    '',
    `- ${code('pnpm verify')} doit passer : ${VERIFY_PLAN.map((entry) => code(entry.step)).join(', ')}. Le hook Stop le relance quand l’arbre a changé depuis la dernière vérification verte.`,
    `- Les sessions de Claude Code démarrent à la racine du dépôt : les réglages et les hooks du projet ne sont lus que depuis le ${code('.claude/')} du dossier de démarrage.`,
    '',
    '## Commandes',
    '',
    '| Commande | Rôle |',
    '| --- | --- |',
    ...scripts.map(scriptRow),
    '',
    '## Ce que la garde des agents fait respecter',
    '',
    'Un appel refusé nomme chaque règle qu’il enfreint par son code, suivi de ce qu’il faut faire à la place.',
    '',
    '| Code | Règle |',
    '| --- | --- |',
    ...AGENT_CHECKS.codes.map((checkCode) => `| ${code(checkCode)} | ${cell(AGENT_CHECKS.table[checkCode].summary)} |`),
    '',
    '## Commits',
    '',
    `- Un commit passe par les hooks git : l’index contient tout l’arbre de travail, ${code('pnpm verify')} passe sur lui, le message suit Conventional Commits.`,
    `- Types : ${COMMIT_TYPES.map(code).join(', ')}. Portées : le dossier d’un paquet sous ${WORKSPACE_ROOTS.map((root) => code(`${root}/`)).join(', ')} présent dans le commit ou son parent, ou ${EXTRA_SCOPES.map(code).join(', ')}. Les messages ${code('fixup!')}, ${code('squash!')} et ${code('amend!')} sont refusés.`,
    `- Un trailer ${code(`${REFS_TRAILER}: ADR-NNNN`)} par ligne cite chaque ADR accepté dont le périmètre contient un chemin du commit, et chaque ADR dont le fichier change.`,
    '',
    '## Où lire',
    '',
    `- ${code(INDEX_FILE)} : ADR en vigueur, formats, contrôles et preuves de chaque règle.`,
    `- ${code(BINDINGS_PATH)} : preuves et périmètre de chaque ADR.`,
    `- ${code(COMMANDS_PATH)} : chaque commande et chaque étape de ${code('pnpm verify')}.`,
    '',
  ].join('\n');
}
