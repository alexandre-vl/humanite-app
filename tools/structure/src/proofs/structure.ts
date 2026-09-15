import { join } from 'node:path';
import type { FileTree } from '@huma/fixtures';
import { fixtureFactory, IN_PROCESS, workspaceCopy } from '@huma/fixtures';
import { findWorkspaceRoot } from '@huma/kit/cli';
import { readFile } from 'node:fs/promises';
import type { StructureCode } from '../checks.ts';
import { cycleFindings } from '../cycles.ts';
import { steigerFindings } from '../steiger.ts';

const define = fixtureFactory<StructureCode>(IN_PROCESS);

const APP = 'apps/mobile';

/** Several trees as one. */
const merged = (trees: readonly FileTree[]): FileTree =>
  Object.fromEntries(trees.flatMap((tree) => Object.entries(tree)));

/** A module exporting one constant. */
const constant = (name: string): string => `export const ${name} = '${name}';\n`;

/** A slice or module entry re-exporting its model. */
const entry = (name: string, file: string): string => `export { ${name} } from './${file}';\n`;

/** An entity slice: its entry and one model file. */
const entity = (slice: string, name: string): FileTree => ({
  [`src/entities/${slice}/index.ts`]: entry(name, `model/${slice}`),
  [`src/entities/${slice}/model/${slice}.ts`]: constant(name),
});

/** A page whose model imports each of `imports`, a list of `[name, specifier]`. */
const page = (slice: string, imports: readonly (readonly [string, string])[]): FileTree => ({
  [`src/pages/${slice}/index.ts`]: `export { ${slice}Uses } from './model/uses';\n`,
  [`src/pages/${slice}/model/uses.ts`]: `${imports.map(([name, specifier]) => `import { ${name} } from '${specifier}';`).join('\n')}\n\nexport const ${slice}Uses = [${imports.map(([name]) => name).join(', ')}];\n`,
});

/** The structure findings of an app laid out as `files`, with the manifest and tsconfig of the workspace's app. */
const checked = (files: FileTree) => async (): Promise<readonly StructureCode[]> => {
  const workspace = await findWorkspaceRoot(import.meta.dirname);
  const tree: FileTree = {
    [`${APP}/package.json`]: await readFile(join(workspace, APP, 'package.json'), 'utf8'),
    [`${APP}/tsconfig.json`]: await readFile(join(workspace, APP, 'tsconfig.json'), 'utf8'),
    ...Object.fromEntries(Object.entries(files).map(([path, content]) => [`${APP}/${path}`, content])),
  };
  await using copy = await workspaceCopy(workspace, tree);
  const findings = [...(await steigerFindings(copy.root, APP)), ...(await cycleFindings(copy.root, APP, ['src']))];
  return findings.map((finding) => finding.code);
};

/** Slices enough to pass the threshold Steiger sets for a layer, twenty, with names sharing no word and no plural. */
const MANY_ENTITIES = [
  'anchor',
  'bridge',
  'candle',
  'dune',
  'ember',
  'fjord',
  'glacier',
  'harbor',
  'island',
  'jungle',
  'kettle',
  'lagoon',
  'meadow',
  'nebula',
  'orchard',
  'prairie',
  'quarry',
  'reef',
  'summit',
  'tundra',
  'valley',
] as const;

/** Modules enough to pass the threshold Steiger sets for shared/lib, fifteen. */
const MANY_MODULES = Array.from({ length: 16 }, (unused: unknown, index) => `helper${String(index)}`);

const ARTICLE_PAGES = {
  ...page('home', [['article', '#entities/article']]),
  ...page('reader', [['article', '#entities/article']]),
};

export const STRUCTURE_FIXTURES = [
  define(
    'structure/clean',
    'une entité que deux pages importent',
    [],
    checked({ ...entity('article', 'article'), ...ARTICLE_PAGES }),
  ),
  define(
    'structure/insignificant-slice',
    'une entité qu’une seule page importe',
    ['structure/insignificant-slice'],
    checked({ ...entity('article', 'article'), ...page('home', [['article', '#entities/article']]) }),
  ),
  define(
    'structure/inconsistent-naming',
    'une entité au singulier et une au pluriel',
    ['structure/inconsistent-naming'],
    checked({
      ...entity('article', 'article'),
      ...entity('sections', 'sections'),
      ...page('home', [
        ['article', '#entities/article'],
        ['sections', '#entities/sections'],
      ]),
      ...page('reader', [
        ['article', '#entities/article'],
        ['sections', '#entities/sections'],
      ]),
    }),
  ),
  define(
    'structure/ambiguous-slice-names',
    'une entité qui porte le nom d’un segment de shared',
    ['structure/ambiguous-slice-names'],
    checked({
      ...entity('format', 'format'),
      'src/shared/format/index.ts': entry('formatTitle', 'format-title'),
      'src/shared/format/format-title.ts': constant('formatTitle'),
      ...page('home', [['format', '#entities/format']]),
      ...page('reader', [['format', '#entities/format']]),
    }),
  ),
  define(
    'structure/no-reserved-folder-names',
    'un dossier nommé comme un segment dans le segment d’une entité',
    ['structure/no-reserved-folder-names'],
    checked({
      ...entity('article', 'article'),
      'src/entities/article/model/lib/words.ts': constant('words'),
      ...ARTICLE_PAGES,
    }),
  ),
  define(
    'structure/repetitive-naming',
    'des pages dont chaque nom répète le mot page',
    ['structure/repetitive-naming'],
    checked({
      ...entity('article', 'article'),
      ...page('home-page', [['article', '#entities/article']]),
      ...page('reader-page', [['article', '#entities/article']]),
      ...page('search-page', []),
    }),
  ),
  define(
    'structure/import-locality',
    'une page qui s’importe elle-même par son alias',
    ['structure/import-locality'],
    checked({
      ...entity('article', 'article'),
      ...ARTICLE_PAGES,
      'src/pages/reader/model/title.ts':
        "import { readerUses } from '#pages/reader';\n\nexport const title = readerUses;\n",
    }),
  ),
  define(
    'structure/excessive-slicing',
    'vingt et une entités non groupées',
    ['structure/excessive-slicing'],
    checked({
      ...merged(MANY_ENTITIES.map((slice) => entity(slice, slice))),
      ...page(
        'home',
        MANY_ENTITIES.map((slice) => [slice, `#entities/${slice}`] as const),
      ),
      ...page(
        'reader',
        MANY_ENTITIES.map((slice) => [slice, `#entities/${slice}`] as const),
      ),
    }),
  ),
  define(
    'structure/shared-lib-grouping',
    'seize modules non groupés dans shared/lib',
    ['structure/shared-lib-grouping'],
    checked(
      merged(
        MANY_MODULES.map((module) => ({
          [`src/shared/lib/${module}/index.ts`]: entry(module, module),
          [`src/shared/lib/${module}/${module}.ts`]: constant(module),
        })),
      ),
    ),
  ),
  define(
    'structure/cycle',
    'deux modèles d’une entité qui s’importent l’un l’autre',
    ['structure/cycle'],
    checked({
      ...entity('article', 'article'),
      'src/entities/article/model/article.ts':
        "import { summary } from './summary';\n\nexport const article = summary;\n",
      'src/entities/article/model/summary.ts':
        "import { article } from './article';\n\nexport const summary = () => article;\n",
      ...ARTICLE_PAGES,
    }),
  ),
] as const;
