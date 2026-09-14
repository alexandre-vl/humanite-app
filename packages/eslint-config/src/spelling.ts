import { fileURLToPath } from 'node:url';
import { GLOSSARY } from '@huma/architecture';
import type { Linter } from 'eslint';
import { commonJsPlugin } from './plugins.ts';
import type { PolicyId } from './policies.ts';

/** The configuration cspell reads instead of searching the tree, where any file could silence a word. */
const CSPELL_CONFIG = fileURLToPath(new URL('../cspell.json', import.meta.url));

/** Words of the workspace's own vocabulary that the English dictionaries lack: git, shell and tool terms. */
const WORDS = [
  'adrs',
  'alnum',
  'backquoted',
  'chattr',
  'chgrp',
  'chrt',
  'claudecode',
  'cntrl',
  'dirents',
  'doas',
  'ionice',
  'nohup',
  'nosystem',
  'pathspec',
  'punct',
  'redirections',
  'setsid',
  'steiger',
  'stripspace',
  'taskset',
  'worktree',
  'worktrees',
  'xdigit',
] as const;

/**
 * Identifiers are English words: cspell refuses an unknown word, and a term of the glossary with the word to use
 * instead. Comments and strings stay free, the app's texts are French. Without the spelling policy only the glossary
 * is reported; without the glossary policy its terms are accepted words.
 */
export function spellingConfig(files: readonly string[], enabled: ReadonlySet<PolicyId>): Linter.Config {
  const glossary = enabled.has('glossary/term');
  const spelling = enabled.has('spelling/unknown');
  return {
    files: [...files],
    plugins: { '@cspell': commonJsPlugin('@cspell/eslint-plugin') },
    rules: {
      '@cspell/spellchecker': [
        glossary || spelling ? 'error' : 'off',
        {
          checkIdentifiers: true,
          checkComments: false,
          checkStrings: false,
          checkStringTemplates: false,
          checkJSXText: false,
          report: spelling ? 'all' : 'flagged',
          configFile: CSPELL_CONFIG,
          cspell: {
            language: 'en',
            words: [...WORDS, ...(glossary ? [] : GLOSSARY.map(([term]) => term))],
            flagWords: glossary ? GLOSSARY.map(([term, english]) => `${term}->${english}`) : [],
          },
        },
      ],
    },
  };
}
