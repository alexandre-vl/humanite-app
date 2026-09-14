import { posix } from 'node:path';
import type { Root } from 'mdast';
import type { AdrMention, LinkReference } from '../../model/document.ts';
import { adrNumber } from '../../model/identifiers.ts';
import { NUMBER_DIGITS } from '../../spec/layout.ts';
import type { Grammar } from '../grammar.ts';
import { positionOf, textSpan, walk } from '../markdown.ts';
import type { FileReport } from '../report.ts';

const SCHEME = /^[a-z][a-z0-9+.-]*:/iu;

const EXTERNAL_SCHEME = 'https:';

function decodeTarget(url: string): string | null {
  const [path = ''] = url.split(/[#?]/u);
  if (path === '') {
    return '';
  }
  try {
    return decodeURIComponent(path);
  } catch {
    return null;
  }
}

/**
 * Links and ADR mentions of a document. External links must use https; a relative link is resolved against the
 * directory of the ADR, and its existence is checked with the whole repository.
 */
export function collectReferences(
  tree: Root,
  directory: string,
  grammar: Grammar,
  report: FileReport,
): Readonly<{ links: readonly LinkReference[]; mentions: readonly AdrMention[] }> {
  const links: LinkReference[] = [];
  const mentions: AdrMention[] = [];
  for (const node of walk(tree)) {
    if (node.type === 'link') {
      const position = positionOf(node);
      if (SCHEME.test(node.url)) {
        if (!node.url.toLowerCase().startsWith(EXTERNAL_SCHEME)) {
          report('adr/link-scheme', node, { url: node.url });
        }
        links.push({ url: node.url, target: null, position });
        continue;
      }
      const decoded = decodeTarget(node.url);
      if (decoded === null) {
        report('adr/link-malformed', node, { url: node.url });
        links.push({ url: node.url, target: null, position });
        continue;
      }
      links.push({
        url: node.url,
        target: decoded === '' ? null : posix.normalize(posix.join(directory, decoded)),
        position,
      });
    } else if (node.type === 'paragraph' || node.type === 'heading' || node.type === 'tableCell') {
      const span = textSpan(node, 'keep');
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
