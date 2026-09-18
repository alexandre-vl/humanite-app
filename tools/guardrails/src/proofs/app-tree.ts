import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { APP_DIRECTORY } from '@huma/architecture';
import { withoutReferences } from '@huma/fixtures';
import type { FileTree } from '@huma/fixtures';
import { findWorkspaceRoot } from '@huma/kit/cli';

/** A component that renders nothing. */
export const emptyComponent = (name: string): string => `import type { ReactNode } from 'react';

export function ${name}(): ReactNode {
  return null;
}
`;

/** A module exporting one constant. */
export const constant = (name: string, value: string): string => `export const ${name} = '${value}';\n`;

/** A component rendering one component, imported from `source`. */
export const component = (
  name: string,
  source: string,
  rendered: string,
): string => `import type { ReactNode } from 'react';
import { ${rendered} } from '${source}';

export function ${name}(): ReactNode {
  return <${rendered} />;
}
`;

/** A module declaring the options of one query. */
export const queryModule = (name: string): string => `import { queryOptions } from '@tanstack/react-query';

export const ${name} = queryOptions({ queryKey: ['article'], queryFn: () => 'titre' });
`;

/** A route of the app: its error boundary, then its page. */
export const route = (page: string, source: string): string =>
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
export async function appTree(files: FileTree): Promise<FileTree> {
  const app = join(await findWorkspaceRoot(import.meta.dirname), APP_DIRECTORY);
  const tree = { ...APP_FILES, ...files };
  return {
    [`${APP_DIRECTORY}/package.json`]: await readFile(join(app, 'package.json'), 'utf8'),
    [`${APP_DIRECTORY}/tsconfig.json`]: withoutReferences(await readFile(join(app, 'tsconfig.json'), 'utf8')),
    ...Object.fromEntries(Object.entries(tree).map(([path, content]) => [`${APP_DIRECTORY}/${path}`, content])),
  };
}
