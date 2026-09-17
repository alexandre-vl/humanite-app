import type { FileTree, Fixture } from '@huma/fixtures';
import { fixtureFactory, IN_PROCESS } from '@huma/fixtures';
import type { PolicyId } from '@huma/eslint-config/policies';
import { lintTree } from '../lint-tree.ts';
import { ALL_POLICIES, mutantsOf } from '../mutation.ts';
import { appTree, component, constant, emptyComponent, route } from './app-tree.ts';

const define = fixtureFactory<PolicyId>(IN_PROCESS);

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
      'guardrail/module-react-native-safe-area-context',
      'une page qui lit les marges de sûreté',
      ['module/react-native-safe-area-context'],
      linted({
        'src/pages/home/model/insets.ts': "export { SafeAreaProvider } from 'react-native-safe-area-context';\n",
      }),
    ),
    define(
      'guardrail/module-react-native-screens',
      'une page qui touche un écran natif',
      ['module/react-native-screens'],
      linted({ 'src/pages/home/model/screens.ts': "export { ScreenStack } from 'react-native-screens';\n" }),
    ),
    define(
      'guardrail/nav-js-tabs',
      'une page qui compose la barre par les onglets JS',
      ['nav/js-tabs'],
      linted({ 'src/pages/home/ui/home-page.tsx': component('HomePage', 'expo-router/js-tabs', 'Tabs') }),
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
    define(
      'guardrail/naming-file',
      'un fichier nommé en camelCase',
      ['naming/file'],
      linted({
        'src/shared/lib/format/index.ts': "export { formatTitle } from './formatTitle';\n",
        'src/shared/lib/format/formatTitle.ts': "export { APP_NAME as formatTitle } from '#config';\n",
      }),
    ),
    define(
      'guardrail/naming-folder',
      'un module rangé dans un dossier en camelCase',
      ['naming/folder'],
      linted({
        'src/shared/lib/dateFormat/index.ts': "export { dateFormat } from './date-format';\n",
        'src/shared/lib/dateFormat/date-format.ts': constant('dateFormat', 'jour'),
      }),
    ),
    define(
      'guardrail/naming-route-file',
      'une route nommée en PascalCase',
      ['naming/file'],
      linted({ 'app/Article.tsx': route('ArticlePage', '#pages/article') }),
    ),
    define(
      'guardrail/naming-route-folder',
      'un dossier de routes nommé en PascalCase',
      ['naming/folder'],
      linted({ 'app/Articles/index.tsx': route('ArticlePage', '#pages/article') }),
    ),
    define(
      'guardrail/naming-route-conventions',
      'les noms qu’Expo Router lit : mise en page, page introuvable, groupe, segments dynamique et attrape-tout',
      [],
      linted({
        'app/_layout.tsx': "export { ErrorBoundary, RootLayout as default } from '#app';\n",
        'app/+not-found.tsx': route('HomePage', '#pages/home'),
        'app/(tabs)/news.tsx': route('HomePage', '#pages/home'),
        'app/articles/[id].tsx': route('ArticlePage', '#pages/article'),
        'app/archives/[...path].tsx': route('ArticlePage', '#pages/article'),
      }),
    ),
    define(
      'guardrail/platform-variant',
      'une variante iOS dans une page',
      ['place/platform-variant'],
      linted({ 'src/pages/home/ui/home-page.ios.tsx': component('HomePage', '#components/badge', 'Badge') }),
    ),
    define(
      'guardrail/platform-variant-primitive',
      'une variante iOS dans une primitive, la place qui les permet',
      [],
      linted({ 'src/shared/ui/primitives/surface/surface.ios.tsx': component('Surface', 'react-native', 'View') }),
    ),
    define(
      'guardrail/glossary-term',
      'un identifiant qui emploie le terme français au lieu du mot du glossaire',
      ['glossary/term'],
      linted({
        'src/shared/lib/format/format.ts':
          "export { APP_NAME as formatTitle } from '#config';\n\nexport const rubriqueLabel = 'Rubrique';\n",
      }),
    ),
    define(
      'guardrail/glossary-synonym',
      'un identifiant qui emploie un synonyme anglais écarté par le glossaire',
      ['glossary/term'],
      linted({
        'src/shared/lib/format/format.ts':
          "export { APP_NAME as formatTitle } from '#config';\n\nexport const favoriteCount = 1;\n",
      }),
    ),
    define(
      'guardrail/style-inline',
      'une primitive qui écrit un style en ligne au lieu de passer par createStyles',
      ['style/inline'],
      linted({
        'src/shared/ui/primitives/surface/surface.tsx': `import type { ReactNode } from 'react';
import { View } from 'react-native';

export function Surface(): ReactNode {
  return <View style={{ flex: 1 }} />;
}
`,
      }),
    ),
    define(
      'guardrail/style-inline-array',
      'une primitive qui glisse un style en ligne dans un tableau de styles',
      ['style/inline'],
      linted({
        'src/shared/ui/primitives/surface/surface.tsx': `import type { ReactNode } from 'react';
import { View } from 'react-native';

export function Surface(): ReactNode {
  return <View style={[{ flex: 1 }]} />;
}
`,
      }),
    ),
    define(
      'guardrail/text-jsx',
      'une primitive qui écrit un texte brut dans le JSX au lieu de passer par Text',
      ['text/jsx'],
      linted({
        'src/shared/ui/primitives/surface/surface.tsx': `import type { ReactNode } from 'react';
import { View } from 'react-native';

export function Surface(): ReactNode {
  return <View>Bonjour</View>;
}
`,
      }),
    ),
  ] as const;
};

export const APP_FIXTURES = appFixtures(ALL_POLICIES);

export const appMutants = (policy: PolicyId): readonly Fixture<string, PolicyId>[] => mutantsOf(appFixtures, policy);
