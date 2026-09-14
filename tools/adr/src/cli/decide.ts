import { parseArgs } from 'node:util';
import { formatDiagnostic } from '../diagnostics.ts';
import { decide } from '../decision.ts';
import { formatAdrId, parseAdrId } from '../model.ts';
import { INDEX_FILE } from '../spec.ts';
import { findRoot, UsageError } from './root.ts';
import { bindingsSource, print, printError, runCommand, runProof } from './shared.ts';

const USAGE = 'Usage : pnpm adr:decide ADR-NNNN accepted|rejected   (décideur humain, dans son propre terminal)';

await runCommand(async () => {
  const { positionals } = parseArgs({ allowPositionals: true, strict: true, options: {} });
  const [id = '', status, ...rest] = positionals;
  const number = parseAdrId(id);
  if (number === null || (status !== 'accepted' && status !== 'rejected') || rest.length > 0) {
    throw new UsageError(USAGE);
  }
  const root = await findRoot();
  const outcome = await decide({
    root,
    number,
    status,
    bindings: await bindingsSource(root),
    runProof,
    environment: process.env,
  });
  if (outcome.kind === 'refused') {
    outcome.reasons.forEach(printError);
    return 1;
  }
  outcome.diagnostics.map(formatDiagnostic).forEach(printError);
  const verb = status === 'accepted' ? 'accepter' : 'rejeter';
  print(`✓ ${formatAdrId(number)} ${status}. Commit de la décision :`);
  print(
    `git add ${outcome.path} ${INDEX_FILE} && git commit -m "docs(adr): ${verb} ${formatAdrId(number)} ${outcome.title}"`,
  );
  return outcome.diagnostics.length === 0 ? 0 : 1;
});
