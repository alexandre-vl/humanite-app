import { mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { hostname } from 'node:os';
import { join } from 'node:path';
import { errnoCode } from '@huma/kit/errors';
import type { GitRepository } from '@huma/kit/git';
import { commonDirectory, git, worktreeRoots } from '@huma/kit/git';
import { isJsonObject, parseJson } from '@huma/kit/json';
import type { RepoPath } from '@huma/kit/paths';
import { grammarOf } from '../analysis/grammar.ts';
import { readTitleArgument } from '../analysis/title.ts';
import { renderHeader } from '../model/header.ts';
import type { AdrNumber } from '../model/identifiers.ts';
import { adrNumber, adrPath } from '../model/identifiers.ts';
import { numberOfPath } from '../model/paths.ts';
import type { FormatSpec, SectionKey } from '../spec/formats/types.ts';
import { ADR_DIRECTORY } from '../spec/layout.ts';
import type { Significance } from '../spec/significance.ts';
import { INITIAL_STATUS } from '../spec/statuses.ts';

const note = (text: string): string => `<!-- ${text} -->`;

/**
 * A complete ADR skeleton in `spec`: every section, label and prefix is in place, every value an HTML comment that
 * `adr:check` rejects until it is replaced.
 */
export function skeleton(spec: FormatSpec, title: string, significance: readonly Significance[]): string {
  const grammar = grammarOf(spec);
  const option = (name: string): string => note(`option ${name}`);
  const section = (key: SectionKey): string => spec.sections.find((candidate) => candidate.key === key)?.title ?? key;
  const citing = (what: string): string => note(`${what} qui cite un critère ${grammar.citation([1])}`);
  return [
    renderHeader({ format: spec.version, status: INITIAL_STATUS, significance, supersedes: [] }),
    `# ${title}`,
    '',
    `## ${section('context')}`,
    '',
    `- ${note('fait vérifiable, avec sa source : lien, commande en code en ligne ou ADR-NNNN')}`,
    '',
    note(`le problème, en une seule question terminée par « ${spec.punctuation.questionMark} »`),
    '',
    `## ${section('criteria')}`,
    '',
    `- ${grammar.labelledLine(grammar.criterionLabel(1), note('critère le plus important ; l’ordre des critères est leur priorité'))}`,
    '',
    `## ${section('options')}`,
    '',
    `- ${option('A')}`,
    `- ${option('B')}`,
    '',
    `## ${section('decision')}`,
    '',
    grammar.chosenOptionLine(option('A'), grammar.because(citing('justification'))),
    '',
    `- ${grammar.labelledLine(grammar.ruleLabel(1), note(`règle avec un seul mot-clé en capitales : ${grammar.keywordList}`))}`,
    '',
    `### ${spec.consequences}`,
    '',
    `- ${grammar.argumentLine('good', grammar.because(note('effet positif')))}`,
    `- ${grammar.argumentLine('bad', grammar.because(note('coût de la décision')))}`,
    '',
    `## ${section('prosAndCons')}`,
    '',
    `### ${option('A')}`,
    '',
    `- ${grammar.argumentLine('good', grammar.because(citing('argument')))}`,
    '',
    `### ${option('B')}`,
    '',
    `- ${grammar.argumentLine('bad', grammar.because(citing('argument')))}`,
    '',
    `## ${section('moreInformation')}`,
    '',
    `- ${grammar.reevaluationLine(note('fait observable qui imposerait de revoir la décision'))}`,
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
    return errnoCode(error) === 'EPERM';
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
      if (errnoCode(error) !== 'EEXIST') {
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
  const paths: string[] = [];
  for (const root of new Set([repository.root, ...(await worktreeRoots(repository))])) {
    paths.push(...(await directoryNames(join(root, ADR_DIRECTORY))).map((name) => `${ADR_DIRECTORY}/${name}`));
  }
  const logged = await git(repository, ['log', '--all', '--format=', '--name-only', '-z', '--', ADR_DIRECTORY]);
  paths.push(...logged.split('\0').map((entry) => entry.trim()));
  const numbers = paths.flatMap((path) => {
    const number = numberOfPath(path);
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
  const title = readTitleArgument(request.title, request.spec);
  if (title.problems.length > 0) {
    throw new Error(`Titre refusé : ${title.problems.join(' ; ')}`);
  }
  return withLock(request.repository, async () => {
    const number = await nextNumber(request.repository);
    const path = adrPath(number, title.slug);
    const content = await request.format(path, skeleton(request.spec, request.title, request.significance));
    await mkdir(join(request.repository.root, ADR_DIRECTORY), { recursive: true });
    await writeFile(join(request.repository.root, path), content, { encoding: 'utf8', flag: 'wx' });
    return { path, number };
  });
}
