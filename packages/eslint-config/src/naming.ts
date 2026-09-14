import * as checkFileModule from 'eslint-plugin-check-file';
import type { PlaceSpec } from '@huma/architecture';
import { APP_DIRECTORY, PLACE_NAMES, PLACES, ROUTE_FILES } from '@huma/architecture';
import type { Linter } from 'eslint';
import { pluginOf } from './plugins.ts';
import type { PolicyId } from './policies.ts';

/** A kebab-case name, as check-file's micromatch reads a pattern: lowercase words joined by hyphens. */
const KEBAB = '+([a-z0-9])*(-+([a-z0-9]))';

/**
 * Route file names, extension and middle extensions aside: those Expo Router gives a meaning to, then kebab-case,
 * dynamic and catch-all segments. A `+` is escaped, micromatch would read `+not-found` as a pattern.
 */
const ROUTE_FILE = `@(_layout|index|\\+not-found|${KEBAB}|\\[${KEBAB}\\]|\\[...${KEBAB}\\])`;

/** Route folder names: kebab-case segments, groups and dynamic segments. */
const ROUTE_FOLDER = `@(${KEBAB}|\\(${KEBAB}\\)|\\[${KEBAB}\\])`;

/** The folders of the places whose files may have platform variants, as check-file globs. */
const VARIANT_FOLDERS: readonly string[] = PLACE_NAMES.flatMap((place) => {
  const { directory, layout, platformVariants }: PlaceSpec = PLACES[place];
  return platformVariants ? [`${APP_DIRECTORY}/${directory}/${layout === 'modules' ? '*/' : ''}`] : [];
});

const level = (enabled: ReadonlySet<PolicyId>, policy: PolicyId): Linter.RuleSeverity =>
  enabled.has(policy) ? 'error' : 'off';

/**
 * File and folder names: kebab-case everywhere, platform variants only where a place allows them, and the names Expo
 * Router reads in the routes directory. Middle extensions, as in `surface.ios.tsx` or `eslint.config.ts`, are not
 * part of the name.
 */
export function namingConfig(files: readonly string[], enabled: ReadonlySet<PolicyId>): readonly Linter.Config[] {
  const plugins = { 'check-file': pluginOf(checkFileModule, 'eslint-plugin-check-file') };
  return [
    {
      files: [...files],
      plugins,
      rules: {
        'check-file/filename-naming-convention': [
          level(enabled, 'naming/file'),
          { '**/*': 'KEBAB_CASE' },
          { ignoreMiddleExtensions: true },
        ],
        'check-file/folder-naming-convention': [
          level(enabled, 'naming/folder'),
          { '**/': 'KEBAB_CASE' },
          { ignoreWords: ['_app'] },
        ],
        'check-file/folder-match-with-fex': [
          level(enabled, 'place/platform-variant'),
          Object.fromEntries(VARIANT_FOLDERS.map((folder) => ['*.@(ios|android).@(ts|tsx)', folder])),
        ],
      },
    },
    {
      files: [...ROUTE_FILES],
      plugins,
      rules: {
        'check-file/filename-naming-convention': [
          level(enabled, 'naming/file'),
          { '**/*': ROUTE_FILE },
          { ignoreMiddleExtensions: true },
        ],
        'check-file/folder-naming-convention': [level(enabled, 'naming/folder'), { '**/': ROUTE_FOLDER }],
      },
    },
  ];
}
