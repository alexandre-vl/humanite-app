import { readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import { hostname } from 'node:os';
import { join } from 'node:path';
import type { GitRepository } from '@huma/kit/git';
import { commonDirectory, git, worktreeRoots } from '@huma/kit/git';
import type { RepoPath } from '@huma/kit/paths';
import { parseJson, isJsonObject } from '@huma/kit/json';
import { mkdir } from 'node:fs/promises';
import { grammarOf } from '../analysis/grammar.ts';
import { titleProblems } from '../analysis/title.ts';
import { frontMatterBlock } from '../analysis/frontmatter.ts';
import { slugify } from '../analysis/slug.ts';
import type { AdrNumber } from '../model/identifiers.ts';
import { adrNumber, adrPath } from '../model/identifiers.ts';
import type { FormatSpec } from '../spec/formats/types.ts';
import { ADR_DIRECTORY, NUMBERED_NAME } from '../spec/layout.ts';
import type { Significance } from '../spec/significance.ts';
import { SIGNIFICANCES } from '../spec/significance.ts';

const note = (text: string): string => `<!-- ${text} -->`;

/**
 * A complete ADR skeleton in `spec`: every section, label and prefix is in place, every value an HTML comment that
 * `adr:check` rejects until it is replaced.
 */
export function skeleton(spec: FormatSpec, title: string, significance: readonly Significance[]): string {
  const { labels, valences } = spec;
  const option = (name: string): string => note(`option ${name}`);
  const section = (key: FormatSpec['sections'][number]['key']): string =>
    spec.sections.find((candidate) => candidate.key === key)?.title ?? key;
  const grammar = grammarOf(spec);
  return [
    frontMatterBlock({
      format: spec.version,
      status: 'proposed',
      significance: SIGNIFICANCES.filter((key) => significance.includes(key)),
      supersedes: [],
    }),
    `# ${title}`,
    '',
    `## ${section('context')}`,
    '',
    `- ${note('fait vérifiable, avec sa source : lien, commande en code en ligne ou ADR-NNNN')}`,
    '',
    note('le problème, en une seule question terminée par un point d’interrogation'),
    '',
    `## ${section('criteria')}`,
    '',
    `- **${labels.criterionPrefix}1**${labels.separator}${note('critère le plus important ; l’ordre des critères est leur priorité')}`,
    '',
    `## ${section('options')}`,
    '',
    `- ${option('A')}`,
    `- ${option('B')}`,
    '',
    `## ${section('decision')}`,
    '',
    `${labels.chosenOption} : « ${option('A')} », ${labels.because} ${note('justification qui cite un critère (C1)')}`,
    '',
    `- **${labels.rulePrefix}1**${labels.separator}${note(`règle avec un seul mot-clé en capitales : ${grammar.keywordList}`)}`,
    '',
    `### ${spec.consequences}`,
    '',
    `- ${valences.good}, ${labels.because} ${note('effet positif')}`,
    `- ${valences.bad}, ${labels.because} ${note('coût de la décision')}`,
    '',
    `## ${section('prosAndCons')}`,
    '',
    `### ${option('A')}`,
    '',
    `- ${valences.good}, ${labels.because} ${note('argument qui cite un critère (C1)')}`,
    '',
    `### ${option('B')}`,
    '',
    `- ${valences.bad}, ${labels.because} ${note('argument qui cite un critère (C1)')}`,
    '',
    `## ${section('moreInformation')}`,
    '',
    `- ${labels.reevaluation} : ${note('fait observable qui imposerait de revoir la décision')}`,
    '',
  ].join('\n');
}

const LOCK_FILE = 'adr-new.lock';
const LOCK_ATTEMPTS = 50;
const LOCK_DELAY_MS = 100;

const sleep = async (milliseconds: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
};

const isAlive = (pid: number): boolean => {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return Error.isError(error) && 'code' in error && error.code === 'EPERM';
  }
};

/** A lock left by a process of this machine that no longer runs. */
async function isStale(lock: string): Promise<boolean> {
  const content = parseJson(await readFile(lock, 'utf8').catch(() => ''));
  if (!isJsonObject(content)) {
    return false;
  }
  const { pid, host } = content;
  return typeof pid === 'number' && host === hostname() && !isAlive(pid);
}

/** Holds a lock in the git common directory, shared by every worktree, while `body` runs. */
async function withLock<Result>(repository: GitRepository, body: () => Promise<Result>): Promise<Result> {
  const lock = join(await commonDirectory(repository), LOCK_FILE);
  const owner = JSON.stringify({ pid: process.pid, host: hostname(), createdAt: new Date().toISOString() });
  for (let attempt = 1; ; attempt += 1) {
    try {
      await writeFile(lock, owner, { flag: 'wx' });
      break;
    } catch (error) {
      if (!(Error.isError(error) && 'code' in error && error.code === 'EEXIST')) {
        throw error;
      }
      if (await isStale(lock)) {
        await unlink(lock).catch(() => undefined);
        continue;
      }
      if (attempt === LOCK_ATTEMPTS) {
        throw new Error(`Verrou ${lock} tenu par une autre création d’ADR : réessayer quand elle sera finie`, {
          cause: error,
        });
      }
      await sleep(LOCK_DELAY_MS);
    }
  }
  try {
    return await body();
  } finally {
    await unlink(lock).catch(() => undefined);
  }
}

const numberOf = (name: string): number | null => {
  const digits = NUMBERED_NAME.exec(name.split('/').at(-1) ?? '')?.groups?.['number'];
  return digits === undefined ? null : Number(digits);
};

async function directoryNames(directory: string): Promise<readonly string[]> {
  try {
    return await readdir(directory);
  } catch {
    return [];
  }
}

/**
 * The next free number: one more than every number found in any worktree and in any commit of any ref, so that a
 * number is never given twice, even to an ADR deleted or waiting on another branch.
 */
export async function nextNumber(repository: GitRepository): Promise<AdrNumber> {
  const names: string[] = [];
  for (const root of new Set([repository.root, ...(await worktreeRoots(repository))])) {
    names.push(...(await directoryNames(join(root, ADR_DIRECTORY))));
  }
  const logged = await git(repository, ['log', '--all', '--format=', '--name-only', '-z', '--', ADR_DIRECTORY]);
  names.push(...logged.split('\0').map((entry) => entry.trim()));
  const numbers = names.flatMap((name) => {
    const number = numberOf(name);
    return number === null ? [] : [number];
  });
  return adrNumber(numbers.length === 0 ? 0 : Math.max(...numbers) + 1);
}

export type Creation = Readonly<{ path: RepoPath; number: AdrNumber }>;

export type CreationRequest = Readonly<{
  repository: GitRepository;
  spec: FormatSpec;
  title: string;
  significance: readonly Significance[];
  /** Formats the new file as the repository formatter would. */
  format: (path: RepoPath, text: string) => Promise<string>;
}>;

/** Checks the title, allocates a number under the lock and writes a formatted skeleton. */
export async function createAdr(request: CreationRequest): Promise<Creation> {
  const problems = titleProblems(request.title, request.spec);
  if (problems.length > 0) {
    throw new Error(`Titre refusé : ${problems.join(' ; ')}`);
  }
  return withLock(request.repository, async () => {
    const number = await nextNumber(request.repository);
    const path = adrPath(number, slugify(request.title));
    const content = await request.format(path, skeleton(request.spec, request.title, request.significance));
    await mkdir(join(request.repository.root, ADR_DIRECTORY), { recursive: true });
    await writeFile(join(request.repository.root, path), content, { encoding: 'utf8', flag: 'wx' });
    return { path, number };
  });
}
