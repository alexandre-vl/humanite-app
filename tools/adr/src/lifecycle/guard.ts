import { ADR_DIRECTORY, NUMBERED_NAME } from '../spec/layout.ts';
import { SIGNIFICANCES } from '../spec/significance.ts';
import { DECIDED_STATUSES, INITIAL_STATUS } from '../spec/statuses.ts';

/**
 * What an agent may write in an ADR file, judged from the text alone so that the hook stays fast: it imports no
 * parser. An agent writes only proposed ADRs with a canonical header and never touches a decided one.
 */

export type GuardVerdict = Readonly<{ kind: 'allow' }> | Readonly<{ kind: 'deny'; reason: string }>;

export const ALLOW: GuardVerdict = { kind: 'allow' };

export const HUMAN_ONLY_DECISION =
  'Décider d’un ADR (accepted, rejected) revient au décideur humain : il lance la décision dans son propre terminal.';

/** Any Markdown file directly in the ADR directory whose name starts with a number, even malformed. */
export function isAdrFilePath(repositoryPath: string): boolean {
  const prefix = `${ADR_DIRECTORY}/`;
  if (!repositoryPath.startsWith(prefix)) {
    return false;
  }
  const name = repositoryPath.slice(prefix.length);
  return !name.includes('/') && name.endsWith('.md') && NUMBERED_NAME.test(name);
}

const escape = (text: string): string => RegExp.escape(text);

const SIGNIFICANCE_VALUE = SIGNIFICANCES.map(escape).join('|');

/** The only header an agent may write: canonical, and proposed. */
const PROPOSED_HEADER = new RegExp(
  String.raw`^---\nformat: [1-9]\d*\nstatus: ${escape(INITIAL_STATUS)}\nsignificance: \[(?:${SIGNIFICANCE_VALUE})(?:, (?:${SIGNIFICANCE_VALUE}))*\]\n(?:supersedes: \[ADR-\d+(?:, ADR-\d+)*\]\n)?---(?:\n|$)`,
  'u',
);

const HEADER_BLOCK = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u;

const DECIDED_WORD = new RegExp(String.raw`\b(?:${DECIDED_STATUSES.map(escape).join('|')})\b`, 'iu');

/** Whether a text looks decided, whatever the YAML spelling: its header block names a decided status anywhere. */
export function looksDecided(text: string): boolean {
  const block = HEADER_BLOCK.exec(text)?.[1];
  return block !== undefined && DECIDED_WORD.test(block);
}

export function judgeAdrWrite(before: string | null, after: string): GuardVerdict {
  if (before !== null && !PROPOSED_HEADER.test(before) && looksDecided(before)) {
    return {
      kind: 'deny',
      reason:
        'Cet ADR est décidé, donc figé : pour changer la décision, proposer un nouvel ADR qui le remplace (supersedes).',
    };
  }
  if (!PROPOSED_HEADER.test(after)) {
    return {
      kind: 'deny',
      reason: `Un agent écrit un ADR avec l’en-tête canonique d’un ADR proposé (status: ${INITIAL_STATUS}). ${HUMAN_ONLY_DECISION}`,
    };
  }
  return ALLOW;
}

/** Content of a file after an `Edit`, or `null` when `oldString` is absent, in which case the edit fails on its own. */
export function applyEdit(before: string, oldString: string, newString: string, replaceAll: boolean): string | null {
  if (!before.includes(oldString)) {
    return null;
  }
  return replaceAll ? before.split(oldString).join(newString) : before.replace(oldString, () => newString);
}
