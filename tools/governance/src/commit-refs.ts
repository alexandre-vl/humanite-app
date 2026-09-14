import type { Bindings } from '@huma/adr/bindings';
import { effectiveStatuses, readCollection } from '@huma/adr/collection';
import { compileGlob } from '@huma/adr/globs';
import { formatAdrId, parseAdrId } from '@huma/adr/identifiers';
import { classifyAdrPath } from '@huma/adr/paths';
import { readSnapshot } from '@huma/adr/snapshot';
import type { ExpectedRefs } from '@huma/git-hooks/message';
import type { GitRepository } from '@huma/kit/git';
import { stagedPaths } from '@huma/kit/git';
import { BINDINGS } from './bindings.ts';

/**
 * The ADRs a commit of the index on top of `base` cites: every ADR accepted in the index whose scope holds a changed
 * path, and every ADR whose file changes. It may also cite the ADRs a changed ADR supersedes.
 */
export async function expectedRefs(
  repository: GitRepository,
  base: string,
  bindings: Bindings = BINDINGS,
): Promise<ExpectedRefs> {
  const paths = await stagedPaths(repository, base);
  const { documents } = readCollection(await readSnapshot(repository, 'index'));
  const statuses = effectiveStatuses(documents);
  const required = new Map<string, string>();
  for (const [id, binding] of Object.entries(bindings)) {
    const number = parseAdrId(id);
    const globs = binding.scope.paths.flatMap((glob) => compileGlob(glob) ?? []);
    const touched = paths.find((path) => globs.some((glob) => glob.test(path)));
    if (number !== null && statuses.get(number)?.kind === 'accepted' && touched !== undefined) {
      required.set(id, `${touched} est dans son périmètre`);
    }
  }
  const allowed = new Set<string>();
  for (const path of paths) {
    const classified = classifyAdrPath(path);
    if (classified.kind !== 'adr' && classified.kind !== 'numbered') {
      continue;
    }
    const id = formatAdrId(classified.number);
    required.set(id, required.get(id) ?? `le commit change ${path}`);
    const document = documents.find((candidate) => candidate.path === path);
    for (const superseded of document?.kind === 'readable' ? document.header.supersedes : []) {
      allowed.add(formatAdrId(superseded));
    }
  }
  return { required, allowed };
}
