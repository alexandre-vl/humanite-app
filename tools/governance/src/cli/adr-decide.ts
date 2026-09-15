import { parseAdrId } from '@huma/adr/identifiers';
import { findWorkspaceRoot, print, printError, readArguments, runCommand, shellLine, UsageError } from '@huma/kit/cli';
import { ownRepository } from '@huma/kit/git';
import { decisionCommit } from '../commit-refs.ts';
import { decideInWorkspace } from '../decision.ts';

const USAGE = 'Usage : pnpm adr:decide ADR-NNNN accepted|rejected   (décideur humain, dans son propre terminal)';

await runCommand(async () => {
  const { positionals } = readArguments(USAGE, { allowPositionals: true, options: {} });
  const [id = '', status, ...rest] = positionals;
  const number = parseAdrId(id);
  if (number === null || (status !== 'accepted' && status !== 'rejected') || rest.length > 0) {
    throw new UsageError(USAGE);
  }
  const { outcome, refs } = await decideInWorkspace({
    repository: ownRepository(await findWorkspaceRoot()),
    number,
    status,
    environment: process.env,
  });
  if (outcome.kind === 'refused') {
    printError(`✗ ${outcome.message}`);
    outcome.details.forEach(printError);
    return 1;
  }
  print(`✓ ${outcome.id} ${status}. Relire le diff, puis commiter la décision depuis ce terminal :`);
  print(shellLine(['git', 'add', '--all']));
  print(shellLine(decisionCommit(outcome.id, status, refs)));
  return 0;
});
