import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { APP_DIRECTORY } from '@huma/architecture';
import type { FileTree, Fixture } from '@huma/fixtures';
import { fixtureFactory } from '@huma/fixtures';
import type { PolicyId } from '@huma/eslint-config/policies';
import { findWorkspaceRoot } from '@huma/kit/cli';
import { lintTree } from '../lint-tree.ts';
import { ALL_POLICIES, mutantsOf } from '../mutation.ts';

const define = fixtureFactory<PolicyId>();

/** A component that renders nothing. */
const emptyComponent = (name: string): string => `import type { ReactNode } from 'react';

export function ${name}(): ReactNode {
  return null;
}
`;

/** A module exporting one constant. */
const constant = (name: string, value: string): string => `export const ${name} = '${value}';\n`;

/** A component rendering one component, imported from `source`. */
const component = (name: string, source: string, rendered: string): string => `import type { ReactNode } from 'react';
import { ${rendered} } from '${source}';

export function ${name}(): ReactNode {
  return <${rendered} />;
}
`;

/** A route of the app: its error boundary, then its page. */
const route = (page: string, source: string): string =>
  `export { ErrorBoundary } from '#app';\nexport { ${page} as default } from '${source}';\n`;

/**
 * An app in which every place holds a module that respects its imports: a route, the root layout, two pages, a
 * feature, an entity, a component, a primitive and the four places of the shared kernel, each behind its entry. A
 * fixture that adds an import against the order also cuts the edge that would close a cycle: typescript-eslint 8.70's
 * no-deprecated loops forever on a circular re-export.
 */
const APP_FILES: FileTree = {
  'app/index.tsx': route('HomePage', '#pages/home'),
  'src/_app/index.ts':
    "export { ErrorBoundary } from './routes/error-boundary';\nexport { RootLayout } from './routes/root-layout';\n",
  'src/_app/routes/error-boundary.tsx': emptyComponent('ErrorBoundary'),
  'src/_app/routes/root-layout.tsx': component('RootLayout', '#primitives/surface', 'Surface'),
  'src/pages/home/index.ts': "export { HomePage } from './ui/home-page';\n",
  'src/pages/home/ui/home-page.tsx': component('HomePage', '#components/badge', 'Badge'),
  'src/pages/article/index.ts': "export { ArticlePage } from './ui/article-page';\n",
  'src/pages/article/ui/article-page.tsx': component('ArticlePage', '#primitives/surface', 'Surface'),
  'src/features/bookmark/index.ts': "export { bookmarkLabel } from './model/bookmark';\n",
  'src/features/bookmark/model/bookmark.ts': "export { articleTitle as bookmarkLabel } from '#entities/article';\n",
  'src/entities/article/index.ts': "export { articleTitle } from './model/article';\n",
  'src/entities/article/model/article.ts': "export { formatTitle as articleTitle } from '#lib/format';\n",
  'src/shared/ui/components/badge/index.ts': "export { Badge } from './badge';\n",
  'src/shared/ui/components/badge/badge.tsx': component('Badge', '#primitives/surface', 'Surface'),
  'src/shared/ui/primitives/surface/index.ts': "export { Surface } from './surface';\n",
  'src/shared/ui/primitives/surface/surface.tsx': component('Surface', 'react-native', 'View'),
  'src/shared/lib/format/index.ts': "export { formatTitle } from './format';\n",
  'src/shared/lib/format/format.ts': "export { APP_NAME as formatTitle } from '#config';\n",
  'src/shared/i18n/index.ts': "export { translate } from './translate';\n",
  'src/shared/i18n/translate.ts': "export { formatTitle as translate } from '#lib/format';\n",
  'src/shared/config/index.ts': "export { APP_NAME } from './app-name';\n",
  'src/shared/config/app-name.ts': constant('APP_NAME', 'Humanité'),
  'src/shared/api/index.ts': "export { API_NAME } from './api-name';\n",
  'src/shared/api/api-name.ts': "export { APP_NAME as API_NAME } from '#config';\n",
};

/** The app of the workspace, as git holds its manifest and tsconfig, with `files` laid over `APP_FILES`. */
async function appTree(files: FileTree): Promise<FileTree> {
  const app = join(await findWorkspaceRoot(import.meta.dirname), APP_DIRECTORY);
  const tree = { ...APP_FILES, ...files };
  return {
    [`${APP_DIRECTORY}/package.json`]: await readFile(join(app, 'package.json'), 'utf8'),
    [`${APP_DIRECTORY}/tsconfig.json`]: await readFile(join(app, 'tsconfig.json'), 'utf8'),
    ...Object.fromEntries(Object.entries(tree).map(([path, content]) => [`${APP_DIRECTORY}/${path}`, content])),
  };
}

/** A model file of the home page that reads the platform through `importLine`. */
const platformModel = (importLine: string, expression: string): FileTree => ({
  'src/pages/home/model/platform.ts': `${importLine}\n\nexport const platformName = ${expression};\n`,
});

/** The fixtures of the policies of the app's places, linted with the policies of `enabled` only. */
const appFixtures = (enabled: ReadonlySet<PolicyId>) => {
  const linted = (files: FileTree) => async (): Promise<readonly PolicyId[]> => lintTree(await appTree(files), enabled);
  return [
    define('guardrail/clean-app', 'une app dont chaque place importe ce qu’elle peut importer', [], linted({})),
    define(
      'guardrail/import-route',
      'une route qui réexporte une primitive',
      ['import/route'],
      linted({ 'app/index.tsx': route('Surface', '#primitives/surface') }),
    ),
    define(
      'guardrail/import-app',
      'la mise en page racine qui importe une page',
      ['import/app'],
      linted({ 'src/_app/routes/root-layout.tsx': component('RootLayout', '#pages/home', 'HomePage') }),
    ),
    define(
      'guardrail/import-page',
      'une page qui importe une page voisine',
      ['import/page'],
      linted({ 'src/pages/home/ui/home-page.tsx': component('HomePage', '#pages/article', 'ArticlePage') }),
    ),
    define(
      'guardrail/import-page-internals',
      'une page qui contourne l’entrée publique d’une entité',
      ['import/page'],
      linted({
        'src/pages/article/ui/article-page.tsx': `import { articleTitle } from '../../../entities/article/model/article';

export const pageTitle = articleTitle;
`,
      }),
    ),
    define(
      'guardrail/import-feature',
      'une feature qui importe une page',
      ['import/feature'],
      linted({
        'src/features/bookmark/model/bookmark.ts': "export { HomePage as bookmarkLabel } from '#pages/home';\n",
      }),
    ),
    define(
      'guardrail/import-entity',
      'une entité qui importe une feature',
      ['import/entity'],
      linted({
        'src/entities/article/model/article.ts':
          "export { bookmarkLabel as articleTitle } from '#features/bookmark';\n",
        'src/features/bookmark/model/bookmark.ts': constant('bookmarkLabel', 'favori'),
      }),
    ),
    define(
      'guardrail/import-component',
      'un composant qui importe une entité',
      ['import/component'],
      linted({
        'src/shared/ui/components/badge/badge.tsx': "export { articleTitle as Badge } from '#entities/article';\n",
      }),
    ),
    define(
      'guardrail/import-primitive',
      'une primitive qui importe un composant',
      ['import/primitive'],
      linted({
        'src/shared/ui/primitives/surface/surface.tsx': component('Surface', '#components/badge', 'Badge'),
        'src/shared/ui/components/badge/badge.tsx': emptyComponent('Badge'),
      }),
    ),
    define(
      'guardrail/import-lib',
      'une bibliothèque partagée qui importe les textes',
      ['import/lib'],
      linted({
        'src/shared/lib/format/format.ts': "export { translate as formatTitle } from '#i18n';\n",
        'src/shared/i18n/translate.ts': constant('translate', 'traduire'),
      }),
    ),
    define(
      'guardrail/import-i18n',
      'les textes qui importent la configuration',
      ['import/i18n'],
      linted({ 'src/shared/i18n/translate.ts': "export { APP_NAME as translate } from '#config';\n" }),
    ),
    define(
      'guardrail/import-config',
      'la configuration qui importe une bibliothèque',
      ['import/config'],
      linted({
        'src/shared/config/app-name.ts': "export { formatTitle as APP_NAME } from '#lib/format';\n",
        'src/shared/lib/format/format.ts': constant('formatTitle', 'titre'),
      }),
    ),
    define(
      'guardrail/import-api',
      'le client d’API qui importe les textes',
      ['import/api'],
      linted({ 'src/shared/api/api-name.ts': "export { translate as API_NAME } from '#i18n';\n" }),
    ),
    define(
      'guardrail/place-unknown-file',
      'un fichier rangé hors de toute place',
      ['place/unknown-file'],
      linted({ 'src/utils/helper.ts': constant('helper', 'aide') }),
    ),
    define(
      'guardrail/unknown-file-imports',
      'un fichier hors de toute place qui importe la configuration : seul le fichier est refusé',
      ['place/unknown-file'],
      linted({ 'src/utils/helper.ts': "export { APP_NAME as helper } from '#config';\n" }),
    ),
    define(
      'guardrail/module-react-native',
      'une page qui rend une vue native',
      ['module/react-native'],
      linted({ 'src/pages/home/ui/home-page.tsx': component('HomePage', 'react-native', 'View') }),
    ),
    define(
      'guardrail/module-react-native-entry',
      'l’entrée d’une page qui réexporte une vue native',
      ['module/react-native'],
      linted({
        'src/pages/home/index.ts': "export { HomePage } from './ui/home-page';\nexport { View } from 'react-native';\n",
      }),
    ),
    define(
      'guardrail/module-react-native-namespace',
      'une page qui importe tout react-native d’un coup',
      ['module/react-native'],
      linted(platformModel("import * as ReactNative from 'react-native';", 'ReactNative.Platform.OS')),
    ),
    define(
      'guardrail/module-react-native-platform',
      'une page qui ne lit que la plateforme, ouverte à toutes les places',
      [],
      linted(platformModel("import { Platform } from 'react-native';", 'Platform.OS')),
    ),
    define(
      'guardrail/module-react-native-gesture-handler',
      'une page qui déclare un geste',
      ['module/react-native-gesture-handler'],
      linted({
        'src/pages/home/model/tap.ts':
          "import { Gesture } from 'react-native-gesture-handler';\n\nexport const tap = Gesture.Tap();\n",
      }),
    ),
    define(
      'guardrail/module-react-native-reanimated',
      'un composant qui anime une valeur partagée',
      ['module/react-native-reanimated'],
      linted({
        'src/shared/ui/components/badge/use-opacity.ts': `import { useSharedValue } from 'react-native-reanimated';

export function useOpacity(): number {
  return useSharedValue(1).get();
}
`,
      }),
    ),
    define(
      'guardrail/route-re-export',
      'une route qui importe sa page puis l’exporte elle-même',
      ['route/re-export'],
      linted({
        'app/index.tsx':
          "import { HomePage } from '#pages/home';\n\nexport { ErrorBoundary } from '#app';\nexport default HomePage;\n",
      }),
    ),
    define(
      'guardrail/route-error-boundary',
      'une route sans ErrorBoundary',
      ['route/error-boundary'],
      linted({ 'app/index.tsx': "export { HomePage as default } from '#pages/home';\n" }),
    ),
    define(
      'guardrail/entry-re-export',
      'une entrée publique qui définit sa constante au lieu de la réexporter',
      ['entry/re-export'],
      linted({ 'src/shared/config/index.ts': constant('APP_NAME', 'Humanité') }),
    ),
  ] as const;
};

export const APP_FIXTURES = appFixtures(ALL_POLICIES);

export const appMutants = (policy: PolicyId): readonly Fixture<string, PolicyId>[] => mutantsOf(appFixtures, policy);
