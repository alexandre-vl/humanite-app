import type { Diagnostic } from '@huma/kit/diagnostics';
import type { Trailer } from '@huma/kit/git';
import type { RepoPath } from '@huma/kit/paths';
import type { GitHookCode } from './checks.ts';
import { gitHookFinding } from './checks.ts';

/** What a commit message of the repository may say. */
export type CommitPolicy = Readonly<{
  types: readonly string[];
  /** Scopes a header may name; a header may also have none. */
  scopes: ReadonlySet<string>;
  maxHeaderLength: number;
  /** Key of the trailers that cite an ADR. */
  refsKey: string;
  /** Other trailer keys a message may end with. */
  otherTrailers: readonly string[];
}>;

export type MessageInput = Readonly<{
  /** The message as the hook reads it, or as the commit stores it. */
  message: string;
  /** Its trailers, as git parses them. */
  trailers: readonly Trailer[];
  /** An editor opened: git will strip the comment lines, which then may appear. */
  editor: boolean;
  /** The branch receives commits that stay: `fixup!` and `squash!` messages are refused there. */
  onDefaultBranch: boolean;
  path: RepoPath;
  commit: string | null;
}>;

/** A message as `git stripspace` leaves it: no trailing blanks, no leading, trailing or repeated blank lines. */
export function stripspace(text: string, stripComments = false): string {
  const kept: string[] = [];
  let blank = false;
  for (const raw of text.split('\n')) {
    const line = raw.replace(/[ \t\r]+$/u, '');
    if (stripComments && line.startsWith('#')) {
      continue;
    }
    if (line === '') {
      blank = kept.length > 0;
      continue;
    }
    if (blank) {
      kept.push('');
      blank = false;
    }
    kept.push(line);
  }
  return kept.length === 0 ? '' : `${kept.join('\n')}\n`;
}

const HEADER = /^(?<type>[a-z]+)(?:\((?<scope>[a-z0-9]+(?:-[a-z0-9]+)*)\))?!?: \S/u;

/** Messages git writes itself, and the kind each one is. */
const GIT_MESSAGES: readonly Readonly<{ pattern: RegExp; kind: string; rewritable: boolean }>[] = [
  {
    pattern: /^Merge (?:branch|branches|remote-tracking branch|tag|commit|pull request) /u,
    kind: 'fusion',
    rewritable: false,
  },
  { pattern: /^Revert "/u, kind: 'annulation', rewritable: false },
  { pattern: /^Squashed commit of the following:/u, kind: 'fusion écrasée', rewritable: false },
  { pattern: /^(?:fixup|squash|amend)! /u, kind: 'correction à fusionner', rewritable: true },
];

const REF_VALUE = /^ADR-\d{4}$/u;

/** The first control character of a text other than a line feed or a tab, `null` when there is none. */
function controlCharacter(text: string): number | null {
  for (const character of text) {
    const code = character.codePointAt(0) ?? 0;
    if ((code < 0x20 && code !== 0x0a && code !== 0x09) || code === 0x7f) {
      return code;
    }
  }
  return null;
}

/** Header, body layout, trailers and ADR citation format of one commit message. */
export function checkMessage(input: MessageInput, policy: CommitPolicy): readonly Diagnostic<GitHookCode>[] {
  const findings: Diagnostic<GitHookCode>[] = [];
  const finding = gitHookFinding;
  const at = (line: number): Readonly<{ line: number; column: number }> => ({ line, column: 1 });
  const lines = input.message.split('\n');
  if (!input.editor) {
    lines.forEach((line, index) => {
      if (line.startsWith('#')) {
        findings.push(finding('git/comment-line', input.path, {}, at(index + 1), input.commit));
      }
    });
  }
  const effective = input.editor ? stripspace(input.message, true) : input.message;
  const control = controlCharacter(effective);
  if (control !== null) {
    const code = control.toString(16).toUpperCase().padStart(4, '0');
    findings.push(finding('git/control-character', input.path, { code }, at(1), input.commit));
  }
  if (effective !== stripspace(effective)) {
    findings.push(finding('git/not-canonical', input.path, {}, at(1), input.commit));
  }
  const [header = '', second] = effective.split('\n');
  const generated = GIT_MESSAGES.find(({ pattern }) => pattern.test(header));
  if (generated !== undefined && !(generated.rewritable && !input.onDefaultBranch)) {
    findings.push(finding('git/generated-message', input.path, { kind: generated.kind }, at(1), input.commit));
  } else if (generated === undefined) {
    findings.push(...checkHeader(header, input, policy));
  }
  if (second !== undefined && second !== '') {
    findings.push(finding('git/body-separator', input.path, {}, at(2), input.commit));
  }
  findings.push(...checkTrailers(effective, input, policy));
  return findings;
}

function checkHeader(header: string, input: MessageInput, policy: CommitPolicy): readonly Diagnostic<GitHookCode>[] {
  const match = HEADER.exec(header);
  const type = match?.groups?.['type'];
  const scope = match?.groups?.['scope'];
  if (type === undefined) {
    return [gitHookFinding('git/header', input.path, { header }, undefined, input.commit)];
  }
  return [
    ...(policy.types.includes(type)
      ? []
      : [gitHookFinding('git/type', input.path, { type, types: policy.types.join(', ') }, undefined, input.commit)]),
    ...(scope === undefined || policy.scopes.has(scope)
      ? []
      : [
          gitHookFinding(
            'git/scope',
            input.path,
            { scope, scopes: [...policy.scopes].toSorted().join(', ') },
            undefined,
            input.commit,
          ),
        ]),
    ...(Array.from(header).length <= policy.maxHeaderLength
      ? []
      : [
          gitHookFinding(
            'git/header-length',
            input.path,
            { length: String(Array.from(header).length), max: String(policy.maxHeaderLength) },
            undefined,
            input.commit,
          ),
        ]),
  ];
}

function checkTrailers(message: string, input: MessageInput, policy: CommitPolicy): readonly Diagnostic<GitHookCode>[] {
  const findings: Diagnostic<GitHookCode>[] = [];
  const keys = [policy.refsKey, ...policy.otherTrailers];
  for (const trailer of input.trailers) {
    if (!keys.some((key) => key.toLowerCase() === trailer.key.toLowerCase())) {
      findings.push(
        gitHookFinding(
          'git/trailer-unknown',
          input.path,
          { key: trailer.key, keys: keys.join(', ') },
          undefined,
          input.commit,
        ),
      );
    }
  }
  const refs = citedAdrs(input.trailers, policy);
  for (const value of refs.filter((ref) => !REF_VALUE.test(ref))) {
    findings.push(gitHookFinding('git/refs-format', input.path, { value }, undefined, input.commit));
  }
  const expected = [...new Set(refs)].toSorted();
  if (refs.join('\n') !== expected.join('\n')) {
    findings.push(
      gitHookFinding('git/refs-order', input.path, { expected: expected.join(', ') }, undefined, input.commit),
    );
  }
  const paragraphs = message.trimEnd().split('\n\n');
  if (/^BREAKING CHANGE:/mu.test(paragraphs.at(-1) ?? '') && paragraphs.length > 1) {
    findings.push(gitHookFinding('git/breaking-change-space', input.path, {}, undefined, input.commit));
  }
  return findings;
}

/** Values of the ADR citation trailers, in order. */
export const citedAdrs = (trailers: readonly Trailer[], policy: CommitPolicy): readonly string[] =>
  trailers
    .filter((trailer) => trailer.key.toLowerCase() === policy.refsKey.toLowerCase())
    .map((trailer) => trailer.value);

/** The ADRs a commit must cite, each with why, and those it may also cite. */
export type ExpectedRefs = Readonly<{ required: ReadonlyMap<string, string>; allowed: ReadonlySet<string> }>;

/** Every required ADR cited, and nothing cited beyond the allowed ones. */
export function checkRefs(
  input: Pick<MessageInput, 'trailers' | 'path' | 'commit'>,
  expected: ExpectedRefs,
  policy: CommitPolicy,
): readonly Diagnostic<GitHookCode>[] {
  const cited = new Set(citedAdrs(input.trailers, policy));
  return [
    ...[...expected.required]
      .filter(([id]) => !cited.has(id))
      .map(([id, reason]) => gitHookFinding('git/refs-missing', input.path, { id, reason }, undefined, input.commit)),
    ...[...cited]
      .filter((id) => REF_VALUE.test(id) && !expected.required.has(id) && !expected.allowed.has(id))
      .map((id) => gitHookFinding('git/refs-extra', input.path, { id }, undefined, input.commit)),
  ];
}
