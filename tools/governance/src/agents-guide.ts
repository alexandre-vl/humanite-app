import type { AgentPolicy } from '@huma/agents/policy';
import { DECIDED_FROZEN, HUMAN_ONLY_DECISION } from '@huma/adr/guard';
import { ADR_DIRECTORY, INDEX_FILE } from '@huma/adr/layout';
import { compareText } from '@huma/kit/text';
import { BINDINGS_PATH } from './bindings.ts';
import { COMMIT_TYPES, EXTRA_SCOPES, REFS_TRAILER, WORKSPACE_ROOTS } from './commit-policy.ts';
import type { CommandName } from './commands.ts';
import { COMMAND_NAMES, COMMANDS, COMMANDS_PATH, SCRIPT_AUDIENCES, VERIFY_STEPS } from './commands.ts';

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
export function renderAgentsGuide(policy: AgentPolicy, generator: string): string {
  const scripts = COMMAND_NAMES.filter((name) => SCRIPT_AUDIENCES.includes(COMMANDS[name].audience)).toSorted(
    compareText,
  );
  const refused = [
    HUMAN_ONLY_DECISION,
    DECIDED_FROZEN,
    ...policy.commands.map((rule) => rule.reason),
    ...policy.paths.map((rule) => `${code(rule.path)} : ${rule.reason}`),
  ];
  return [
    `<!-- Généré par ${generator} : ne pas modifier à la main. -->`,
    '',
    '# Guide des agents',
    '',
    `Chaque règle structurante du dépôt vit dans un ADR (${code(ADR_DIRECTORY)}) et un outil la fait respecter. Ce guide dit où les trouver ; il n’en ajoute aucune.`,
    '',
    '## Avant de terminer',
    '',
    `- ${code('pnpm verify')} doit passer : ${VERIFY_STEPS.map(code).join(', ')}. Le hook Stop le relance quand l’arbre a changé depuis la dernière vérification verte.`,
    `- Les sessions de Claude Code démarrent à la racine du dépôt : les réglages et les hooks du projet ne sont lus que depuis le ${code('.claude/')} du dossier de démarrage.`,
    '',
    '## Commandes',
    '',
    '| Commande | Rôle |',
    '| --- | --- |',
    ...scripts.map(scriptRow),
    '',
    '## Ce que la garde des agents refuse',
    '',
    ...refused.map((reason) => `- ${reason}`),
    '',
    '## Commits',
    '',
    `- Un commit passe par les hooks git : l’index contient tout l’arbre de travail, ${code('pnpm verify')} passe sur lui, le message suit Conventional Commits.`,
    `- Types : ${COMMIT_TYPES.map(code).join(', ')}. Portées : le nom d’un paquet sous ${WORKSPACE_ROOTS.map((root) => code(`${root}/`)).join(', ')}, ou ${EXTRA_SCOPES.map(code).join(', ')}.`,
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
