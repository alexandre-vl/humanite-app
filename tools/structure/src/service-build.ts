import { glob } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import {
  CORPUS_PACKAGES,
  PLACE_NAMES,
  PLACES,
  RESOLUTION,
  SERVICE_VARIANT,
  withServiceVariants,
} from '@huma/architecture';
import type { Diagnostic } from '@huma/kit/diagnostics';
import { repoPath } from '@huma/kit/paths';
import { compareText } from '@huma/kit/text';
import { cruise } from 'dependency-cruiser';
import type { StructureCode } from './checks.ts';
import { structureFinding } from './checks.ts';

/** The directories, relative to the app, of the places whose files may have a service variant. */
const VARIANT_DIRECTORIES: readonly string[] = PLACE_NAMES.filter((place) => PLACES[place].sourceVariants).map(
  (place) => `${PLACES[place].directory}/`,
);

/** A path relative to the workspace root, whatever it was relative to, with the separators of a repository path. */
const fromRoot = (root: string, path: string): string => relative(root, path).split(sep).join('/');

/**
 * Service variants that no place allows. The middle extension changes what a service build bundles wherever it is
 * written, so a file named `notice.service.ts` for a reason of its own would silently stand in for `notice.ts` in that
 * build; it is kept to the one place the variants are meant for.
 */
async function misplacedVariants(
  root: string,
  appRoot: string,
  directories: readonly string[],
): Promise<readonly Diagnostic<StructureCode>[]> {
  const base = join(root, appRoot);
  const patterns = directories.map((directory) => `${directory}/**/*.${SERVICE_VARIANT}.*`);
  const found: string[] = [];
  for await (const path of glob(patterns, { cwd: base })) {
    found.push(path.split(sep).join('/'));
  }
  return found
    .filter((path) => !VARIANT_DIRECTORIES.some((directory) => path.startsWith(directory)))
    .toSorted(compareText)
    .map((path) => structureFinding('structure/source-variant', repoPath(`${appRoot}/${path}`), {}));
}

/** Whether an import names a package of the corpus, or one of its subpaths. */
const namesCorpus = (specifier: string): boolean =>
  CORPUS_PACKAGES.some((name) => specifier === name || specifier.startsWith(`${name}/`));

/**
 * The imports a service build bundles that lead into the corpus, one finding per import that crosses into it.
 *
 * The imports are followed as Metro follows them in that build — each module's service variant first — from every
 * route, which is where Expo Router starts the bundle, and without the imports of a type, which leave nothing in it.
 * The corpus is not followed further than the import that names it: what matters is the step that reaches it.
 */
async function corpusImports(
  root: string,
  appRoot: string,
  directories: readonly string[],
): Promise<readonly Diagnostic<StructureCode>[]> {
  const base = join(root, appRoot);
  const result = await cruise([...directories], {
    baseDir: base,
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: false,
    tsConfig: { fileName: join(base, 'tsconfig.json') },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: [...RESOLUTION.conditionNames],
      extensions: withServiceVariants(RESOLUTION.extensions),
    },
  });
  const output = result.output;
  if (typeof output === 'string') {
    throw new Error('dependency-cruiser a rendu un rapport au lieu d’un résultat');
  }
  const modules = new Map(output.modules.map((module) => [module.source, module]));
  const routes = `${PLACES.route.directory}/`;
  const queue = output.modules.map((module) => module.source).filter((source) => source.startsWith(routes));
  const reached = new Set(queue);
  const crossings = new Map<string, Readonly<{ importer: string; module: string }>>();
  for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
    for (const dependency of modules.get(next)?.dependencies ?? []) {
      if (dependency.couldNotResolve || dependency.coreModule) {
        continue;
      }
      if (namesCorpus(dependency.module)) {
        crossings.set(`${next} ${dependency.module}`, { importer: next, module: dependency.module });
        continue;
      }
      if (!reached.has(dependency.resolved)) {
        reached.add(dependency.resolved);
        queue.push(dependency.resolved);
      }
    }
  }
  return [...crossings.entries()]
    .toSorted(([left], [right]) => compareText(left, right))
    .map(([, { importer, module }]) =>
      structureFinding('structure/service-corpus', repoPath(fromRoot(root, join(base, importer))), { module }),
    );
}

/** What a build reading the journal's service would bundle against what it may: its variants, and nothing of the corpus. */
export async function serviceBuildFindings(
  root: string,
  appRoot: string,
  directories: readonly string[],
): Promise<readonly Diagnostic<StructureCode>[]> {
  return [
    ...(await misplacedVariants(root, appRoot, directories)),
    ...(await corpusImports(root, appRoot, directories)),
  ];
}
