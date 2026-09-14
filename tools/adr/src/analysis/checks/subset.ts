import type { Root } from 'mdast';
import type { FormatSpec } from '../../spec/formats/types.ts';
import { walk } from '../markdown.ts';
import type { FileReport } from '../report.ts';

/** Markdown elements, heading depths, fences and code languages allowed by the format. */
export function checkMarkdownSubset(tree: Root, source: string, spec: FormatSpec, report: FileReport): void {
  const allowed = new Set<string>(spec.markdown.nodes);
  const [fence = ''] = spec.markdown.fences;
  for (const node of walk(tree)) {
    if (!allowed.has(node.type)) {
      report('adr/markdown-node', node, { node: node.type });
    } else if (node.type === 'heading' && node.depth > spec.limits.headingDepth) {
      report('adr/markdown-heading-depth', node, { depth: node.depth, max: spec.limits.headingDepth });
    } else if (node.type === 'listItem' && typeof node.checked === 'boolean') {
      report('adr/markdown-task-list', node, {});
    } else if (node.type === 'link' && typeof node.title === 'string') {
      report('adr/markdown-link-title', node, {});
    } else if (node.type === 'code') {
      const offset = node.position?.start.offset ?? 0;
      if (!spec.markdown.fences.some((candidate) => source.startsWith(candidate, offset))) {
        report('adr/markdown-indented-code', node, { fence });
      } else if (typeof node.lang !== 'string' || node.lang === '') {
        report('adr/markdown-code-language', node, {});
      }
    }
  }
}
