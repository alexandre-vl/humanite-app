import { join } from 'node:path';
import type { FileTree } from '@huma/fixtures';
import { createRepository, fixtureFactory } from '@huma/fixtures';
import { temporaryDirectory } from '@huma/kit/fs';
import { listFiles } from '@huma/kit/git';
import { repoPath } from '@huma/kit/paths';
import type { LintCode } from '../checks.ts';
import { lintPaths, SUPPRESSIONS_FILE } from '../eslint.ts';
import { checkFormatting, PRETTIER_IGNORE_FILE } from '../prettier.ts';

const define = fixtureFactory<LintCode>();

const CONFIG_FILE = repoPath('eslint.config.mjs');

/** A configuration as strict as the repository's on inline comments, with the rules given, formatted by Prettier. */
const configWith = (rules: string): string => `export default [
  {
    linterOptions: {
      noInlineConfig: true,
      reportUnusedDisableDirectives: 'error',
      reportUnusedInlineConfigs: 'error',
    },
  },
  {
    files: ['**/*.mjs'],
    rules: ${rules},
  },
];
`;

const CONFIG = configWith("{ 'no-console': 'error' }");

/** A repository whose files all pass: the configuration, a Prettier configuration and one module. */
const CLEAN: FileTree = {
  [CONFIG_FILE]: CONFIG,
  '.prettierrc.json': '{ "singleQuote": true }\n',
  'src/answer.mjs': 'export const answer = 42;\n',
};

/** The codes `pnpm lint` and `pnpm format:check` report on the files git lists in a repository holding `worktree`. */
const checked =
  (worktree: FileTree) =>
  async ({ signal }: Readonly<{ signal: AbortSignal }>): Promise<readonly LintCode[]> => {
    await using directory = await temporaryDirectory('lint-fixture');
    const root = join(directory.path, 'repository');
    const repository = await createRepository(root, { commits: [{ files: CLEAN }], worktree }, { signal });
    const paths = [...(await listFiles(repository, 'worktree'))];
    const lint = await lintPaths({ root, configFile: CONFIG_FILE, paths });
    const format = await checkFormatting(root, paths);
    return [...lint.diagnostics, ...format.diagnostics].map((finding) => finding.code);
  };

export const LINT_FIXTURES = [
  define('lint/clean', 'un dépôt dont chaque fichier passe ESLint et Prettier', [], checked(CLEAN)),
  define(
    'lint/rule',
    'une règle active enfreinte',
    ['lint/rule'],
    checked({ ...CLEAN, 'src/log.mjs': "console.log('bonjour');\n" }),
  ),
  define(
    'lint/parse-error',
    'un module qu’ESLint ne peut pas lire',
    ['lint/parse-error', 'lint/format-error'],
    checked({ ...CLEAN, 'src/broken.mjs': 'export const = ;\n' }),
  ),
  define(
    'lint/inline-config',
    'un commentaire qui désactive une règle, que la configuration refuse d’appliquer',
    ['lint/inline-config', 'lint/rule'],
    checked({ ...CLEAN, 'src/log.mjs': "/* eslint-disable no-console */\nconsole.log('bonjour');\n" }),
  ),
  define(
    'lint/suppressions-file',
    'un fichier de suppressions qui tairait la règle avec la CLI : l’API la signale quand même',
    ['lint/suppressions-file', 'lint/rule'],
    checked({
      ...CLEAN,
      'src/log.mjs': "console.log('bonjour');\n",
      [SUPPRESSIONS_FILE]: '{ "src/log.mjs": { "no-console": { "count": 1 } } }\n',
    }),
  ),
  define(
    'lint/suppressed',
    'une configuration qui accepte les commentaires en ligne et tait une règle',
    ['lint/suppressed'],
    checked({
      ...CLEAN,
      [CONFIG_FILE]: CONFIG.replace('noInlineConfig: true', 'noInlineConfig: false').replace(
        "reportUnusedDisableDirectives: 'error'",
        "reportUnusedDisableDirectives: 'off'",
      ),
      'src/log.mjs': "// eslint-disable-next-line no-console -- démonstration\nconsole.log('bonjour');\n",
    }),
  ),
  define(
    'lint/unconfigured',
    'un script que seuls les réglages par défaut d’ESLint couvrent, sans aucune règle',
    ['lint/unconfigured'],
    checked({ ...CLEAN, 'scripts/release.cjs': "module.exports = 'release';\n" }),
  ),
  define(
    'lint/deprecated-rule',
    'une règle dépréciée activée',
    ['lint/deprecated-rule'],
    checked({ ...CLEAN, [CONFIG_FILE]: configWith("{ 'no-console': 'error', 'eol-last': 'error' }") }),
  ),
  define(
    'lint/unformatted',
    'un fichier que Prettier formaterait autrement',
    ['lint/unformatted'],
    checked({ ...CLEAN, 'src/answer.mjs': 'export const answer = 42\n' }),
  ),
  define(
    'lint/format-error',
    'un fichier JSON illisible',
    ['lint/format-error'],
    checked({ ...CLEAN, 'data.json': '{ "answer": }\n' }),
  ),
  define(
    'lint/git-ignored',
    'des fichiers générés et ignorés par git, en infraction : ni ESLint ni Prettier ne les lisent',
    [],
    checked({
      ...CLEAN,
      '.gitignore': 'generated/\n',
      'generated/log.mjs': "console.log( 'bonjour' )\n",
    }),
  ),
  define(
    'lint/prettier-ignored',
    'un fichier suivi que .prettierignore exclut',
    [],
    checked({
      ...CLEAN,
      [PRETTIER_IGNORE_FILE]: '# Copied verbatim.\nvendor/\n',
      'vendor/data.json': '{"answer":42}\n',
    }),
  ),
] as const;
