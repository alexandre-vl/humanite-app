import { parseArgs } from 'node:util';
import { decide } from '@huma/adr/decide';
import { formatAdrId, parseAdrId } from '@huma/adr/identifiers';
import { INDEX_FILE } from '@huma/adr/layout';
import { findWorkspaceRoot, print, printError, runCommand, UsageError } from '@huma/kit/cli';
import { formatDiagnostic } from '@huma/kit/diagnostics';
import { ownRepository } from '@huma/kit/git';
import { writeArtifacts } from '../artifacts.ts';
import { runProof } from '../proofs.ts';
import { checkWorkspaceAdrs, workspaceBindings } from '../workspace.ts';

const USAGE = 'Usage : pnpm adr:decide ADR-NNNN accepted|rejected   (décideur humain, dans son propre terminal)';

await runCommand(async () => {
  const { positionals } = parseArgs({ allowPositionals: true, strict: true, options: {} });
  const [id = '', status, ...rest] = positionals;
  const number = parseAdrId(id);
  if (number === null || (status !== 'accepted' && status !== 'rejected') || rest.length > 0) {
    throw new UsageError(USAGE);
  }
  const root = await findWorkspaceRoot();
  const outcome = await decide({
    repository: ownRepository(root),
    number,
    status,
    bindings: await workspaceBindings(root),
    runProof,
    environment: process.env,
    check: async () => checkWorkspaceAdrs(root, 'worktree'),
    regenerate: async () => {
      await writeArtifacts(root);
    },
  });
  if (outcome.kind === 'refused') {
    outcome.reasons.forEach(printError);
    return 1;
  }
  outcome.diagnostics.map(formatDiagnostic).forEach(printError);
  const verb = status === 'accepted' ? 'accepter' : 'rejeter';
  print(`✓ ${formatAdrId(number)} ${status}. Relire le diff, puis commiter la décision :`);
  print(`git add ${outcome.path} ${INDEX_FILE}`);
  print(`git commit -m "docs(adr): ${verb} ${formatAdrId(number)}"`);
  return outcome.diagnostics.length === 0 ? 0 : 1;
});
