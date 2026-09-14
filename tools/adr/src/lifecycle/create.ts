import { mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { errnoCode } from '@huma/kit/errors';
import type { GitRepository } from '@huma/kit/git';
import { createRef, git, refNames, worktreeRoots } from '@huma/kit/git';
import type { RepoPath } from '@huma/kit/paths';
import { grammarOf } from '../analysis/grammar.ts';
import { readTitleArgument } from '../analysis/title.ts';
import { renderHeader } from '../model/header.ts';
import type { AdrNumber } from '../model/identifiers.ts';
import { adrNumber, adrPath, formatAdrId, parseAdrId } from '../model/identifiers.ts';
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

/** Refs that reserve ADR numbers: one per number ever given, shared by every worktree, never deleted. */
export const RESERVATIONS = 'refs/adr/numbers';

const RESERVATION_ATTEMPTS = 20;

const reservationRef = (number: AdrNumber): string => `${RESERVATIONS}/${formatAdrId(number)}`;

async function directoryNames(directory: string): Promise<readonly string[]> {
  try {
    return await readdir(directory);
  } catch (error) {
    if (errnoCode(error) === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

/**
 * The next free number: one more than every number reserved, found in any worktree or in any commit of any ref, so that
 * a number is never given twice, even to an ADR deleted, stashed or waiting on another branch.
 */
export async function nextNumber(repository: GitRepository): Promise<AdrNumber> {
  const paths: string[] = [];
  for (const root of new Set([repository.root, ...(await worktreeRoots(repository))])) {
    paths.push(...(await directoryNames(join(root, ADR_DIRECTORY))).map((name) => `${ADR_DIRECTORY}/${name}`));
  }
  const logged = await git(repository, ['log', '--all', '--format=', '--name-only', '-z', '--', ADR_DIRECTORY]);
  paths.push(...logged.split('\0').filter((entry) => entry !== ''));
  const reserved = (await refNames(repository, RESERVATIONS)).flatMap((ref) => {
    const number = parseAdrId(ref.slice(RESERVATIONS.length + 1));
    return number === null ? [] : [number];
  });
  const numbers = [
    ...reserved,
    ...paths.flatMap((path) => {
      const number = numberOfPath(path);
      return number === null ? [] : [number];
    }),
  ];
  return adrNumber(numbers.length === 0 ? 0 : Math.max(...numbers) + 1);
}

/** Reserves the next free number with a ref only one creation can make: parallel creations never share a number. */
async function reserveNumber(repository: GitRepository, title: string): Promise<AdrNumber> {
  for (let attempt = 1; attempt <= RESERVATION_ATTEMPTS; attempt += 1) {
    const number = await nextNumber(repository);
    const reservation = (
      await git(repository, ['hash-object', '-w', '--stdin'], { input: `${formatAdrId(number)} ${title}\n` })
    ).trim();
    if (await createRef(repository, reservationRef(number), reservation)) {
      return number;
    }
  }
  throw new Error(`Aucun numéro d’ADR réservé après ${String(RESERVATION_ATTEMPTS)} tentatives concurrentes`);
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

/** Checks the title, reserves a number and writes a formatted skeleton. */
export async function createAdr(request: CreationRequest): Promise<Creation> {
  const title = readTitleArgument(request.title, request.spec);
  if (title.problems.length > 0) {
    throw new Error(`Titre refusé : ${title.problems.join(' ; ')}`);
  }
  const number = await reserveNumber(request.repository, request.title);
  const path = adrPath(number, title.slug);
  const content = await request.format(path, skeleton(request.spec, request.title, request.significance));
  await mkdir(join(request.repository.root, ADR_DIRECTORY), { recursive: true });
  await writeFile(join(request.repository.root, path), content, { encoding: 'utf8', flag: 'wx' });
  return { path, number };
}
