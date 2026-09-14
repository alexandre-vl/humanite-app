import { join } from 'node:path';
import { RESOLUTION } from '@huma/architecture';
import type { Diagnostic } from '@huma/kit/diagnostics';
import { repoPath } from '@huma/kit/paths';
import { cruise } from 'dependency-cruiser';
import type { StructureCode } from './checks.ts';
import { structureFinding } from './checks.ts';

/**
 * The import cycles of the app at `appRoot`, relative to `root`, found by dependency-cruiser through its API and with
 * the resolution Metro and TypeScript use. A cycle hides an order the places forbid, and one of them was enough to make
 * typescript-eslint loop forever.
 */
export async function cycleFindings(
  root: string,
  appRoot: string,
  directories: readonly string[],
): Promise<readonly Diagnostic<StructureCode>[]> {
  const base = join(root, appRoot);
  const result = await cruise([...directories], {
    baseDir: base,
    validate: true,
    ruleSet: { forbidden: [{ name: 'no-circular', severity: 'error', from: {}, to: { circular: true } }] },
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: join(base, 'tsconfig.json') },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: [...RESOLUTION.conditionNames],
      extensions: [...RESOLUTION.extensions],
    },
  });
  const output = result.output;
  if (typeof output === 'string') {
    throw new Error('dependency-cruiser a rendu un rapport au lieu d’un résultat');
  }
  const seen = new Set<string>();
  return output.summary.violations.flatMap((violation) => {
    const cycle = [violation.from, ...(violation.cycle ?? []).map((step) => step.name)];
    const key = cycle.toSorted().join('\n');
    if (violation.rule.name !== 'no-circular' || seen.has(key)) {
      return [];
    }
    seen.add(key);
    return [
      structureFinding('structure/cycle', repoPath(`${appRoot}/${violation.from}`), { cycle: cycle.join(' → ') }),
    ];
  });
}
