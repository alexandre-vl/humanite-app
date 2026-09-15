import type { Bindings } from '@huma/adr/bindings';
import type { AdrDocument } from '@huma/adr/document';
import type { AdrId } from '@huma/adr/identifiers';
import type { DecidedStatus } from '@huma/adr/statuses';
import { effectiveStatuses, readCollection } from '@huma/adr/collection';
import { compileGlob } from '@huma/adr/globs';
import { formatAdrId, parseAdrId } from '@huma/adr/identifiers';
import { classifyAdrPath } from '@huma/adr/paths';
import { readSnapshot } from '@huma/adr/snapshot';
import type { ExpectedRefs } from '@huma/git-hooks/message';
import type { GitRepository } from '@huma/kit/git';
import { stagedPaths } from '@huma/kit/git';
import type { RepoPath } from '@huma/kit/paths';
import { compareText } from '@huma/kit/text';
import { BINDINGS } from './bindings.ts';

/** What the message of a decision says it did. */
const VERBS = { accepted: 'accepter', rejected: 'rejeter' } as const satisfies Readonly<Record<DecidedStatus, string>>;

/** The commit that records a decision: the human runs it, so it carries every trailer the commit-msg hook requires. */
export const decisionCommit = (id: AdrId, status: DecidedStatus, refs: readonly string[]): readonly string[] => [
  'git',
  'commit',
  '-m',
  `docs(adr): ${VERBS[status]} ${id}`,
  ...refs.flatMap((ref) => ['--trailer', `Refs: ${ref}`]),
];

/**
 * The ADRs a change of `paths` cites: every ADR the collection holds as accepted whose scope holds one of them, and
 * every ADR whose own file changes. It may also cite the ADRs a changed ADR supersedes.
 */
function refsForPaths(
  paths: readonly RepoPath[],
  documents: readonly AdrDocument[],
  bindings: Bindings = BINDINGS,
): ExpectedRefs {
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

/**
 * The ADRs a commit of the index on top of `base` cites, read from the index: what the commit-msg hook requires of the
 * message it is about to accept.
 */
export async function expectedRefs(
  repository: GitRepository,
  base: string,
  bindings: Bindings = BINDINGS,
): Promise<ExpectedRefs> {
  const { documents } = readCollection(await readSnapshot(repository, 'index'));
  return refsForPaths(await stagedPaths(repository, base), documents, bindings);
}

/**
 * The `Refs:` trailers a commit of `paths` must carry, sorted and without repetition, as the commit-msg hook reads
 * them. The collection comes from the working tree: a decision names the ADRs of the state it just wrote.
 */
export async function refsForWorktree(
  repository: GitRepository,
  paths: readonly RepoPath[],
  bindings: Bindings = BINDINGS,
): Promise<readonly string[]> {
  const { documents } = readCollection(await readSnapshot(repository, 'worktree'));
  return [...refsForPaths(paths, documents, bindings).required.keys()].toSorted(compareText);
}
