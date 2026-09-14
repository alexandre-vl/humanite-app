import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { isJsonObject, parseJson } from '@huma/kit/json';
import { runText } from '@huma/kit/process';
import { compareText } from '@huma/kit/text';
import { BIN_DIRECTORY } from './commands.ts';

/** The projects the solution `tsconfig.json` at `root` references, as configuration files relative to the root. */
async function solutionProjects(root: string): Promise<readonly string[]> {
  const solution = parseJson(await readFile(join(root, 'tsconfig.json'), 'utf8'));
  const references = isJsonObject(solution) ? solution['references'] : undefined;
  if (!Array.isArray(references)) {
    throw new Error('tsconfig.json ne référence aucun projet');
  }
  return references.map((reference: unknown) => {
    const path = isJsonObject(reference) ? reference['path'] : undefined;
    if (typeof path !== 'string') {
      throw new Error('référence de projet illisible dans tsconfig.json');
    }
    const relative = path.replace(/^\.\//u, '');
    return relative.endsWith('.json') ? relative : `${relative}/tsconfig.json`;
  });
}

const sortedObject = (value: unknown): unknown =>
  isJsonObject(value)
    ? Object.fromEntries(Object.entries(value).toSorted(([left], [right]) => compareText(left, right)))
    : value;

/**
 * How TypeScript builds each project of the solution at `root`, as `tsc --showConfig` prints it: compiler options,
 * sorted, and include and exclude patterns, without file lists, which change with every source file. Paths under the
 * root are written `<racine>` and the directory of each project `<projet>`.
 */
export async function renderEffectiveTsconfigs(root: string): Promise<string> {
  const snapshot: Record<string, unknown> = {};
  for (const project of (await solutionProjects(root)).toSorted(compareText)) {
    const shown = parseJson(
      await runText(join(root, BIN_DIRECTORY, 'tsc'), ['--showConfig', '--project', project], { cwd: root }),
    );
    if (!isJsonObject(shown)) {
      throw new Error(`tsc --showConfig ${project} : sortie illisible`);
    }
    const directory = dirname(join(root, project));
    snapshot[project] = {
      compilerOptions: sortedObject(shown['compilerOptions']),
      include: shown['include'] ?? [],
      exclude: parseJson(JSON.stringify(shown['exclude'] ?? []).replaceAll(directory, '<projet>')),
    };
  }
  return `${JSON.stringify(snapshot, null, 2).replaceAll(root, '<racine>')}\n`;
}
