import type { Config } from 'prettier';

export default {
  printWidth: 120,
  singleQuote: true,
  overrides: [
    {
      // A decided ADR is frozen: formatting keeps its code blocks and its lines as written, so its fingerprint holds.
      files: 'docs/adr/[0-9]*.md',
      options: { embeddedLanguageFormatting: 'off', proseWrap: 'preserve' },
    },
  ],
} satisfies Config;
