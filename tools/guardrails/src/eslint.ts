import { join } from 'node:path';
import { defineWorkspaceConfig } from '@huma/eslint-config';
import type { PolicyId } from '@huma/eslint-config/policies';
import { policyOf } from '@huma/eslint-config/policies';
import { ESLint } from 'eslint';

/**
 * The policies the workspace configuration, restricted to `policies`, reports on `paths` of the workspace copy at
 * `root`. A message that carries no policy id is a defect of the fixture, not an observation: it throws, so a fixture
 * proves its policies and nothing else.
 */
export async function lintPolicies(
  root: string,
  paths: readonly string[],
  policies: ReadonlySet<PolicyId>,
): Promise<readonly PolicyId[]> {
  const eslint = new ESLint({
    cwd: root,
    overrideConfigFile: true,
    overrideConfig: defineWorkspaceConfig({ tsconfigRootDir: root, policies }),
    globInputPaths: false,
    cache: false,
  });
  const observed: PolicyId[] = [];
  for (const result of await eslint.lintFiles(paths.map((path) => join(root, path)))) {
    for (const message of result.messages) {
      const policy = policyOf(message.ruleId, message.message);
      if (policy === null) {
        const rule = message.ruleId ?? 'ESLint';
        throw new Error(
          `message hors politique, ${result.filePath}:${String(message.line)} : ${rule} — ${message.message}`,
        );
      }
      observed.push(policy);
    }
  }
  return observed;
}
