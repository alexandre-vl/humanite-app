import { readCanonicalHeader } from '../model/header.ts';
import { classifyAdrPath } from '../model/paths.ts';
import { DECIDED_STATUSES, INITIAL_STATUS, isDecided } from '../spec/statuses.ts';

/**
 * What an agent may write in an ADR file, judged from the text alone so that the hook stays fast: it imports no
 * parser. An agent writes only proposed ADRs with a canonical header and never touches a decided one.
 */

export type GuardVerdict = Readonly<{ kind: 'allow' }> | Readonly<{ kind: 'deny'; reason: string }>;

export const ALLOW: GuardVerdict = { kind: 'allow' };

export const HUMAN_ONLY_DECISION =
  'Décider d’un ADR (accepted, rejected) revient au décideur humain : il lance la décision dans son propre terminal.';

/** Any file directly in the ADR directory whose name starts with a number, even malformed: it holds an ADR. */
export function isAdrFilePath(repositoryPath: string): boolean {
  const { kind } = classifyAdrPath(repositoryPath);
  return kind === 'adr' || kind === 'numbered';
}

const HEADER_BLOCK = /^[\u{FEFF}\s]*---[^\n]*\r?\n([\s\S]*?)\r?\n---/u;

const DECIDED_WORD = new RegExp(
  String.raw`(?:${DECIDED_STATUSES.map((status) => RegExp.escape(status)).join('|')})`,
  'iu',
);

/**
 * Whether a text may hold a decided ADR, whatever the spelling of its header: canonical with a decided status, or any
 * other header block that mentions a decided status, escaped or not.
 */
export function looksDecided(text: string): boolean {
  const canonical = readCanonicalHeader(text);
  if (canonical !== null) {
    return isDecided(canonical.header.status);
  }
  const block = HEADER_BLOCK.exec(text)?.[1];
  return block !== undefined && (DECIDED_WORD.test(block) || /\\[ux]|&#|!!/u.test(block));
}

export const DECIDED_FROZEN =
  'Cet ADR est décidé, donc figé : pour changer la décision, proposer un nouvel ADR qui le remplace (supersedes).';

export const UNKNOWN_RESULT =
  'Contenu de l’ADR après cette modification incalculable (texte à remplacer absent tel quel) : reprendre le texte exact, ou modifier l’en-tête dans un appel séparé.';

/** Verdict on a write that turns `before` (`null` for a new file) into `after` (`null` when it cannot be computed). */
export function judgeAdrWrite(before: string | null, after: string | null): GuardVerdict {
  if (before !== null && looksDecided(before)) {
    return { kind: 'deny', reason: DECIDED_FROZEN };
  }
  if (after === null) {
    return before === null ? ALLOW : { kind: 'deny', reason: UNKNOWN_RESULT };
  }
  const header = readCanonicalHeader(after)?.header;
  if (header?.status !== INITIAL_STATUS) {
    return {
      kind: 'deny',
      reason: `Un agent écrit un ADR avec l’en-tête canonique d’un ADR proposé (status: ${INITIAL_STATUS}). ${HUMAN_ONLY_DECISION}`,
    };
  }
  return ALLOW;
}

/** Content of a file after an `Edit`, or `null` when `oldString` is absent as written. */
export function applyEdit(before: string, oldString: string, newString: string, replaceAll: boolean): string | null {
  if (oldString === '' || !before.includes(oldString)) {
    return null;
  }
  return replaceAll ? before.split(oldString).join(newString) : before.replace(oldString, () => newString);
}
