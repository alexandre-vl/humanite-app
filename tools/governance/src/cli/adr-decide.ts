import { parseArgs } from 'node:util';
import { withoutEntries } from '@huma/adr/bindings';
import { decide } from '@huma/adr/decide';
import { parseAdrId } from '@huma/adr/identifiers';
import { findWorkspaceRoot, print, printError, runCommand, shellLine, UsageError } from '@huma/kit/cli';
import { ownRepository } from '@huma/kit/git';
import { checkArtifacts, writeArtifacts } from '../artifacts.ts';
import { removeBindingEntries } from '../bindings-file.ts';
import { runProof } from '../proofs.ts';
import { checkWorkspaceAdrs, workspaceBindings } from '../workspace.ts';

const USAGE = 'Usage : pnpm adr:decide ADR-NNNN accepted|rejected   (décideur humain, dans son propre terminal)';

const VERBS = { accepted: 'accepter', rejected: 'rejeter' } as const;

await runCommand(async () => {
  const { positionals } = parseArgs({ allowPositionals: true, strict: true, options: {} });
  const [id = '', status, ...rest] = positionals;
  const number = parseAdrId(id);
  if (number === null || (status !== 'accepted' && status !== 'rejected') || rest.length > 0) {
    throw new UsageError(USAGE);
  }
  const root = await findWorkspaceRoot();
  const bindings = await workspaceBindings(root);
  const outcome = await decide({
    repository: ownRepository(root),
    number,
    status,
    bindings,
    runProof,
    environment: process.env,
    check: async (source) => checkWorkspaceAdrs(root, 'worktree', source),
    staleArtifacts: async () => (await checkArtifacts(root)).map((diagnostic) => diagnostic.path),
    withoutBindings: (ids) => withoutEntries(bindings, ids),
    removeBindings: async (ids) => removeBindingEntries(root, ids),
    regenerate: async () => writeArtifacts(root),
  });
  if (outcome.kind === 'refused') {
    printError(`✗ ${outcome.message}`);
    outcome.details.forEach(printError);
    return 1;
  }
  print(`✓ ${outcome.id} ${status}. Relire le diff, puis commiter la décision depuis ce terminal :`);
  print(shellLine(['git', 'add', '--', ...outcome.written]));
  print(
    shellLine([
      'git',
      'commit',
      '-m',
      `docs(adr): ${VERBS[status]} ${outcome.id}`,
      ...[outcome.id, ...outcome.supersedes].flatMap((ref) => ['--trailer', `Refs: ${ref}`]),
    ]),
  );
  return 0;
});
