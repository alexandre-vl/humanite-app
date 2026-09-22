import { judgeIntake, readSummaries } from '@huma/contracts';
import type { IntakeCode, Take } from '@huma/contracts';
import { fixtureFactory } from '@huma/fixtures';

const define = fixtureFactory<IntakeCode>();

/**
 * Readings of a list of the service, each with one thing done wrong, judged by the journal's own judging.
 *
 * The judging is real and the readings are not, for the reason given everywhere on this bench. Each broken reading is
 * one a hurried change could plausibly write, and each is still the real reading with one step changed: it falls back
 * to a format it knows rather than refusing one it does not; it refuses more than it must, and says so; it drops what
 * it cannot read without a word — the one-line filter that loses items in silence; it sorts the list by date, which
 * prints another paper than the one the desk laid out.
 */
const judged = (take: Take) => async (): Promise<readonly IntakeCode[]> =>
  Promise.resolve(judgeIntake(take).map((finding) => finding.code));

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const INTAKE_FIXTURES = [
  define(
    'intake/reader',
    'la lecture du journal, telle qu’elle admet une liste du service',
    [],
    judged((posts) => readSummaries(posts)),
  ),
  define(
    'intake/unreadable-kept',
    'une lecture qui prend un format qu’elle ne connaît pas pour le plus courant, au lieu de le refuser',
    ['intake/unreadable-kept'],
    judged((posts) =>
      readSummaries(posts.map((post) => (isRecord(post) ? { ...post, article_format: 'classic' } : post))),
    ),
  ),
  define(
    'intake/readable-dropped',
    'une lecture qui met de côté, en le disant, un item que les schémas lisent',
    ['intake/readable-dropped'],
    judged((posts) => {
      const intake = readSummaries(posts);
      return {
        kept: [],
        setAside: [...intake.setAside, ...intake.kept.map((summary, at) => ({ at, says: 'sans image' }))],
      };
    }),
  ),
  define(
    'intake/loss-unnamed',
    'une lecture qui laisse tomber sans un mot ce qu’elle ne sait pas lire',
    ['intake/loss-unnamed'],
    judged((posts) => ({ kept: readSummaries(posts).kept, setAside: [] })),
  ),
  define(
    'intake/order-lost',
    'une lecture qui trie la une par date, et imprime un autre journal que celui de la rédaction',
    ['intake/order-lost'],
    judged((posts) => {
      const intake = readSummaries(posts);
      return {
        ...intake,
        kept: [...intake.kept].sort((left, right) => right.publishedAt.localeCompare(left.publishedAt)),
      };
    }),
  ),
] as const;
