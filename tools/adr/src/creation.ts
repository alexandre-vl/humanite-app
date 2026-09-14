import { mkdir, open, readdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { format, resolveConfig } from 'prettier';
import { analyzeAdr } from './document.ts';
import { git, isRepository } from './git.ts';
import type { AdrNumber, RepoPath } from './model.ts';
import { adrNumber, adrPath } from './model.ts';
import { slugify } from './slug.ts';
import type { Significance } from './spec.ts';
import { ADR_DIRECTORY, ADR_FILE_NAME, CONSEQUENCES_TITLE, LABELS, SECTIONS, SIGNIFICANCES } from './spec.ts';

const note = (text: string): string => `<!-- ${text} -->`;

/**
 * A complete ADR skeleton: every section, label and prefix is in place, every value is an HTML comment that
 * `adr:check` rejects until it is replaced.
 */
export function skeleton(title: string, significance: readonly Significance[]): string {
  const ordered = SIGNIFICANCES.filter((key) => significance.includes(key));
  const option = (name: string): string => note(`option ${name}`);
  return [
    '---',
    'format: 1',
    'status: proposed',
    `significance: [${ordered.join(', ')}]`,
    '---',
    '',
    `# ${title}`,
    '',
    `## ${SECTIONS.context}`,
    '',
    `- ${note('fait vérifiable, avec sa source : lien, commande en code en ligne ou ADR-NNNN')}`,
    '',
    note('le problème, en une seule question terminée par un point d’interrogation'),
    '',
    `## ${SECTIONS.criteria}`,
    '',
    `- **C1**${LABELS.labelSeparator}${note('critère le plus important ; l’ordre des critères est leur priorité')}`,
    '',
    `## ${SECTIONS.options}`,
    '',
    `- ${option('A')}`,
    `- ${option('B')}`,
    '',
    `## ${SECTIONS.decision}`,
    '',
    `${LABELS.chosenOption} : « ${option('A')} », ${LABELS.because} ${note('justification qui cite un critère, par exemple (C1)')}`,
    '',
    `- **R1**${LABELS.labelSeparator}${note('règle avec un seul mot-clé en capitales : DOIT, NE DOIT PAS ou PEUT')}`,
    '',
    `### ${CONSEQUENCES_TITLE}`,
    '',
    `- Bien, ${LABELS.because} ${note('effet positif')}`,
    `- Mauvais, ${LABELS.because} ${note('coût de la décision')}`,
    '',
    `## ${SECTIONS.prosAndCons}`,
    '',
    `### ${option('A')}`,
    '',
    `- Bien, ${LABELS.because} ${note('argument qui cite un critère (C1)')}`,
    '',
    `### ${option('B')}`,
    '',
    `- Mauvais, ${LABELS.because} ${note('argument qui cite un critère (C1)')}`,
    '',
    `## ${SECTIONS.moreInformation}`,
    '',
    `- ${LABELS.reevaluation} : ${note('fait observable qui imposerait de revoir la décision')}`,
    '',
  ].join('\n');
}

const LOCK_ATTEMPTS = 50;
const LOCK_DELAY_MILLISECONDS = 100;

const sleep = async (milliseconds: number): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
};

/** Holds `adr-new.lock` in the git common directory, shared by every worktree, while `body` runs. */
async function withLock<Result>(root: string, body: () => Promise<Result>): Promise<Result> {
  if (!(await isRepository(root))) {
    return body();
  }
  const commonDirectory = (await git(root, ['rev-parse', '--path-format=absolute', '--git-common-dir'])).trim();
  const lock = join(commonDirectory, 'adr-new.lock');
  for (let attempt = 1; ; attempt += 1) {
    try {
      const handle = await open(lock, 'wx');
      await handle.close();
      break;
    } catch (error) {
      if (!Error.isError(error) || !('code' in error) || error.code !== 'EEXIST' || attempt === LOCK_ATTEMPTS) {
        throw new Error(
          `Verrou ${lock} indisponible : une autre création d’ADR est en cours, ou ce fichier est resté après un arrêt brutal`,
          {
            cause: error,
          },
        );
      }
      await sleep(LOCK_DELAY_MILLISECONDS);
    }
  }
  try {
    return await body();
  } finally {
    await unlink(lock);
  }
}

const numbersIn = (names: readonly string[]): number[] =>
  names.flatMap((name) => {
    const digits = ADR_FILE_NAME.exec(name.split('/').at(-1) ?? '')?.[1];
    return digits === undefined ? [] : [Number(digits)];
  });

async function directoryNames(directory: string): Promise<string[]> {
  try {
    return await readdir(directory);
  } catch {
    return [];
  }
}

/**
 * Next free number: one more than every number found in this working tree, in any other worktree, and in any
 * commit of any ref, so that a number is never given twice, even to an ADR deleted or waiting on another branch.
 */
export async function nextNumber(root: string): Promise<AdrNumber> {
  const numbers = numbersIn(await directoryNames(join(root, ADR_DIRECTORY)));
  if (await isRepository(root)) {
    numbers.push(
      ...numbersIn((await git(root, ['log', '--all', '--format=', '--name-only', '--', ADR_DIRECTORY])).split('\n')),
    );
    const worktrees = (await git(root, ['worktree', 'list', '--porcelain']))
      .split('\n')
      .flatMap((line) => (line.startsWith('worktree ') ? [line.slice('worktree '.length)] : []));
    for (const worktree of worktrees) {
      numbers.push(...numbersIn(await directoryNames(join(worktree, ADR_DIRECTORY))));
    }
  }
  return adrNumber(numbers.length === 0 ? 0 : Math.max(...numbers) + 1);
}

export type Creation = Readonly<{ path: RepoPath; number: AdrNumber }>;

/** Checks the title against the title rules, allocates a number and writes a formatted skeleton. */
export async function createAdr(root: string, title: string, significance: readonly Significance[]): Promise<Creation> {
  const slug = slugify(title);
  const draft = skeleton(title, significance);
  const titleProblems = analyzeAdr({
    path: adrPath(adrNumber(0), slug === '' ? 'titre' : slug),
    number: adrNumber(0),
    slug,
    bytes: new TextEncoder().encode(draft),
  }).diagnostics.filter((diagnostic) => diagnostic.code === 'adr/title' || diagnostic.code === 'adr/encoding');
  if (titleProblems.length > 0) {
    throw new Error(`Titre refusé : ${titleProblems.map((diagnostic) => diagnostic.message).join(' ; ')}`);
  }
  return withLock(root, async () => {
    const number = await nextNumber(root);
    const path = adrPath(number, slug);
    const absolute = join(root, path);
    const content = await format(draft, { ...(await resolveConfig(absolute)), filepath: absolute });
    await mkdir(join(root, ADR_DIRECTORY), { recursive: true });
    await writeFile(absolute, content, { encoding: 'utf8', flag: 'wx' });
    return { path, number };
  });
}
