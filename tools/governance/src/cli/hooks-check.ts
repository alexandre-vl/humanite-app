import { join } from 'node:path';
import { checkLocalSettings } from '@huma/agents/local-settings';
import { CLAUDE_LOCAL_SETTINGS_PATH } from '@huma/agents/policy';
import { checkCommitHistory } from '@huma/git-hooks/history';
import { checkInstallation } from '@huma/git-hooks/installation';
import { findWorkspaceRoot, print, readArguments, runCommand } from '@huma/kit/cli';
import { renderDiagnostics } from '@huma/kit/diagnostics';
import { readTextIfExists } from '@huma/kit/fs';
import { commitPolicy, DEFAULT_BRANCH } from '../commit-policy.ts';
import { HISTORY_ANCHOR, installationContext, SHIMS } from '../git-hooks.ts';

const USAGE = 'Usage : pnpm hooks:check [--staged]';

await runCommand(async () => {
  const { values } = readArguments(USAGE, { options: { staged: { type: 'boolean', default: false } } });
  const root = await findWorkspaceRoot();
  const context = installationContext(root);
  const { repository } = context;
  const findings = [
    ...(await checkInstallation(context, SHIMS)),
    ...checkLocalSettings(await readTextIfExists(join(root, CLAUDE_LOCAL_SETTINGS_PATH))),
    ...(values.staged
      ? []
      : await checkCommitHistory({
          repository,
          anchor: HISTORY_ANCHOR,
          defaultBranch: DEFAULT_BRANCH,
          policy: await commitPolicy(repository),
        })),
  ];
  if (findings.length > 0) {
    print(renderDiagnostics(findings, 'text'));
    print(`✗ ${String(findings.length)} problème(s) de hooks`);
    return 1;
  }
  print('✓ hooks git et Claude Code en place, historique des messages conforme');
  return 0;
});
