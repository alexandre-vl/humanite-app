import { posix } from 'node:path';
import type { Root } from 'mdast';
import type { AdrMention, LinkReference, LinkTarget } from '../../model/document.ts';
import { adrNumber } from '../../model/identifiers.ts';
import type { FormatSpec } from '../../spec/formats/types.ts';
import { NUMBER_DIGITS } from '../../spec/layout.ts';
import type { Grammar } from '../grammar.ts';
import type { SourceIndex } from '../markdown.ts';
import { plainText, positionOf, textSpan, walk } from '../markdown.ts';
import type { FileReport } from '../report.ts';

const SCHEME = /^[a-z][a-z0-9+.-]*:/iu;

/** Why a link leads nowhere: no address, a scheme outside the format, or an encoding that cannot be read. */
export type LinkProblem = 'empty' | 'scheme' | 'encoding';

export type LinkReading = Readonly<{ target: LinkTarget; problem: LinkProblem | null }>;

const INVALID: LinkTarget = { kind: 'invalid' };

/**
 * Where `url` points from an ADR stored in `directory`. An absolute address needs a scheme of the format and a host; a
 * path starting with `/` is relative to the repository root, any other path to the directory of the ADR.
 */
export function readLink(url: string, directory: string, spec: FormatSpec): LinkReading {
  if (url === '') {
    return { target: INVALID, problem: 'empty' };
  }
  if (url.startsWith('//')) {
    return { target: INVALID, problem: 'scheme' };
  }
  const scheme = SCHEME.exec(url)?.[0].toLowerCase();
  if (scheme !== undefined) {
    const address = URL.parse(url);
    return spec.links.schemes.includes(scheme) && address !== null && address.host !== ''
      ? { target: { kind: 'external', url }, problem: null }
      : { target: INVALID, problem: 'scheme' };
  }
  const [path = ''] = url.split(/[#?]/u);
  if (path === '') {
    return { target: { kind: 'fragment' }, problem: null };
  }
  let decoded: string;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    return { target: INVALID, problem: 'encoding' };
  }
  const joined = decoded.startsWith('/') ? decoded.slice(1) : posix.join(directory, decoded);
  return { target: { kind: 'repository', path: posix.normalize(joined).replace(/\/$/u, '') }, problem: null };
}

/**
 * A link names a source when it has an address other than an anchor of the ADR; a problem with that address is
 * reported on its own and does not also make the fact unsourced.
 */
export const namesSource = (reading: LinkReading): boolean =>
  reading.problem !== 'empty' && reading.target.kind !== 'fragment';

/**
 * Links and ADR mentions of a document. A link that leads nowhere is reported here; whether a repository path exists is
 * checked with the whole repository.
 */
export function collectReferences(
  tree: Root,
  context: Readonly<{ directory: string; spec: FormatSpec; grammar: Grammar; source: SourceIndex; report: FileReport }>,
): Readonly<{ links: readonly LinkReference[]; mentions: readonly AdrMention[] }> {
  const { directory, spec, grammar, source, report } = context;
  const links: LinkReference[] = [];
  const mentions: AdrMention[] = [];
  for (const node of walk(tree)) {
    if (node.type === 'link') {
      const reading = readLink(node.url, directory, spec);
      switch (reading.problem) {
        case 'empty':
          report('adr/link-empty', node, { text: plainText(node, 'keep') });
          break;
        case 'scheme':
          report('adr/link-scheme', node, { url: node.url, schemes: spec.links.schemes });
          break;
        case 'encoding':
          report('adr/link-malformed', node, { url: node.url });
          break;
        case null:
          break;
      }
      links.push({ url: node.url, target: reading.target, position: positionOf(node) });
    } else if (node.type === 'paragraph' || node.type === 'heading' || node.type === 'tableCell') {
      const span = textSpan(node, 'keep', source);
      const scan = grammar.scanMentions(span.text);
      for (const match of scan.valid) {
        mentions.push({ number: adrNumber(Number(match.value)), position: span.locate(match.index) });
      }
      for (const match of scan.malformed) {
        report('adr/mention-malformed', span.locate(match.index), { text: match.text, digits: NUMBER_DIGITS });
      }
    }
  }
  return { links, mentions };
}
