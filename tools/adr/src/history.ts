import type { Diagnostic } from './diagnostics.ts';
import { diagnostic, START } from './diagnostics.ts';
import type { AdrDocument } from './document.ts';
import { analyzeAdr } from './document.ts';
import { directoryHistory, headCommit, isRepository, isShallow, readObjects } from './git.ts';
import { structuralFingerprint } from './markdown.ts';
import type { AdrNumber, Bindings, RepoPath } from './model.ts';
import { adrNumber, formatAdrId, isConvention, repoPath } from './model.ts';
import type { Source } from './snapshot.ts';
import type { Status } from './spec.ts';
import { ADR_DIRECTORY, ADR_FILE_NAME, isDecided } from './spec.ts';

export type Observation = Readonly<{
  commit: string;
  /** ISO 8601 author date of the commit. */
  authorDate: string;
  path: RepoPath;
  number: AdrNumber;
  /** `null` when the file is deleted in this commit. */
  status: Status | null;
  fingerprint: string | null;
}>;

export type HistoryInput = Readonly<{
  root: string;
  source: Source;
  documents: readonly AdrDocument[];
  bindings: Bindings;
  /** Runs one proof and tells whether it passed; used when the index turns an ADR into `accepted`. */
  runProof: (proof: string) => Promise<boolean>;
}>;

const DIRECTORY = repoPath(ADR_DIRECTORY);

/** Every committed version of every ADR, oldest first, with its parsed status; a deletion has a `null` status. */
export async function observe(root: string): Promise<readonly Observation[]> {
  const changes = await directoryHistory(root, ADR_DIRECTORY);
  const versions = changes.flatMap(({ commit, authorDate, paths }) =>
    paths.flatMap((path) => {
      const match = ADR_FILE_NAME.exec(path.slice(ADR_DIRECTORY.length + 1));
      return path.startsWith(`${ADR_DIRECTORY}/`) && match?.[1] !== undefined && match[2] !== undefined
        ? [{ commit, authorDate, path: repoPath(path), number: adrNumber(Number(match[1])), slug: match[2] }]
        : [];
    }),
  );
  const objects = await readObjects(
    root,
    versions.map(({ commit, path }) => `${commit}:${path}`),
  );
  return versions.map(({ commit, authorDate, path, number, slug }) => {
    const bytes = objects.get(`${commit}:${path}`) ?? null;
    if (bytes === null) {
      return { commit, authorDate, path, number, status: null, fingerprint: null };
    }
    const { document } = analyzeAdr({ path, number, slug, bytes });
    return {
      commit,
      authorDate,
      path,
      number,
      status: document?.frontMatter?.status ?? null,
      fingerprint: document === null ? null : structuralFingerprint(document.tree),
    };
  });
}

function checkNumber(
  number: AdrNumber,
  observations: readonly Observation[],
  current: AdrDocument | undefined,
): readonly Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const id = formatAdrId(number);
  const last = observations.at(-1);
  const at = current?.path ?? last?.path ?? DIRECTORY;
  const committed = observations.filter((observation) => observation.status !== null);
  const decided = committed.find((observation) => observation.status !== null && isDecided(observation.status));
  const currentStatus = current?.frontMatter?.status ?? null;

  const statuses = new Set(
    [...committed.map((observation) => observation.status), currentStatus].flatMap((status) =>
      status !== null && isDecided(status) ? [status] : [],
    ),
  );
  if (statuses.size > 1) {
    diagnostics.push(diagnostic('adr/transitions', at, START, `${id} a été à la fois accepté et rejeté`));
  }
  if (decided !== undefined && currentStatus === 'proposed') {
    diagnostics.push(
      diagnostic(
        'adr/transitions',
        at,
        START,
        `${id} est redevenu proposed après ${String(decided.status)}`,
        decided.commit,
      ),
    );
  }
  const firstStatus = committed[0];
  if (firstStatus !== undefined && firstStatus.status !== 'proposed') {
    diagnostics.push(
      diagnostic(
        'adr/transitions',
        at,
        START,
        `${id} a été commité d’emblée en ${String(firstStatus.status)} : proposed d’abord`,
        firstStatus.commit,
      ),
    );
  } else if (firstStatus === undefined && currentStatus !== null && isDecided(currentStatus)) {
    diagnostics.push(
      diagnostic('adr/transitions', at, START, `${id} doit être commité en proposed avant d’être décidé`),
    );
  }

  if (current === undefined) {
    if (last !== undefined) {
      diagnostics.push(
        diagnostic(
          'adr/no-deletion',
          last.path,
          START,
          `${id} a été commité puis supprimé : un ADR reste, rejeté si besoin`,
          last.commit,
        ),
      );
    }
  } else if (decided !== undefined) {
    if (current.path !== decided.path) {
      diagnostics.push(
        diagnostic(
          'adr/frozen',
          current.path,
          START,
          `${id} renommé après décision, depuis ${decided.path}`,
          decided.commit,
        ),
      );
    } else if (structuralFingerprint(current.tree) !== decided.fingerprint) {
      diagnostics.push(diagnostic('adr/frozen', current.path, START, `${id} modifié après décision`, decided.commit));
    }
  }
  return diagnostics;
}

async function checkAcceptProofs(
  input: HistoryInput,
  observations: readonly Observation[],
): Promise<readonly Diagnostic[]> {
  const diagnostics: Diagnostic[] = [];
  for (const document of input.documents) {
    if (document.frontMatter?.status !== 'accepted') {
      continue;
    }
    const committed = observations.filter((observation) => observation.number === document.number).at(-1);
    if (committed?.status === 'accepted') {
      continue;
    }
    const id = formatAdrId(document.number);
    const proofs = Object.values(input.bindings[id]?.rules ?? {}).flatMap((binding) =>
      binding === undefined || isConvention(binding) ? [] : binding,
    );
    for (const proof of new Set(proofs)) {
      if (!(await input.runProof(proof))) {
        diagnostics.push(
          diagnostic(
            'adr/accept-proofs',
            document.path,
            START,
            `${id} passe à accepted mais sa preuve ${proof} échoue`,
          ),
        );
      }
    }
  }
  return diagnostics;
}

export async function checkHistory(input: HistoryInput): Promise<readonly Diagnostic[]> {
  if (!(await isRepository(input.root))) {
    return [diagnostic('adr/history', DIRECTORY, START, 'pas un dépôt git : transitions et immuabilité invérifiables')];
  }
  if (await isShallow(input.root)) {
    return [diagnostic('adr/history', DIRECTORY, START, 'historique superficiel : lancer git fetch --unshallow')];
  }
  const observations = (await headCommit(input.root)) === null ? [] : await observe(input.root);
  const numbers = new Set([
    ...observations.map((observation) => observation.number),
    ...input.documents.map((document) => document.number),
  ]);
  const diagnostics = [...numbers].flatMap((number) =>
    checkNumber(
      number,
      observations.filter((observation) => observation.number === number),
      input.documents.find((document) => document.number === number),
    ),
  );
  return input.source === 'index' ? [...diagnostics, ...(await checkAcceptProofs(input, observations))] : diagnostics;
}
