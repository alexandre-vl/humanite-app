import type { Yaml } from 'mdast';
import type { Document, YAMLError } from 'yaml';
import { isMap, isScalar, LineCounter, parseDocument } from 'yaml';
import { z } from 'zod';
import type { Diagnostic, Position } from './diagnostics.ts';
import { diagnostic } from './diagnostics.ts';
import { positionOf } from './markdown.ts';
import type { AdrNumber, FrontMatter, RepoPath } from './model.ts';
import { formatAdrId, parseAdrId } from './model.ts';
import { FORMAT, SIGNIFICANCES, STATUSES } from './spec.ts';

z.config(z.locales.fr());

const schema = z.strictObject({
  format: z.literal(FORMAT),
  status: z.enum(STATUSES),
  significance: z.array(z.enum(SIGNIFICANCES)).min(1),
  supersedes: z
    .array(z.string().regex(/^ADR-\d{4}$/u, { error: 'identifiant attendu sous la forme ADR-NNNN' }))
    .min(1)
    .optional(),
});

/** The only accepted spelling of a front matter: fixed key order, flow sequences in canonical order, no comment. */
export function serializeFrontMatter(frontMatter: FrontMatter): string {
  const significance = SIGNIFICANCES.filter((key) => frontMatter.significance.includes(key));
  const supersedes = [...new Set(frontMatter.supersedes)].toSorted((left, right) => left - right).map(formatAdrId);
  return [
    `format: ${String(frontMatter.format)}`,
    `status: ${frontMatter.status}`,
    `significance: [${significance.join(', ')}]`,
    ...(supersedes.length === 0 ? [] : [`supersedes: [${supersedes.join(', ')}]`]),
  ].join('\n');
}

type Analysis = Readonly<{ frontMatter: FrontMatter | null; diagnostics: readonly Diagnostic[] }>;

/** Line and column in the ADR file of an offset inside the YAML block, which starts on the line after `---`. */
function locate(node: Yaml, lineCounter: LineCounter, offset: number): Position {
  const { line, col } = lineCounter.linePos(offset);
  return { line: positionOf(node).line + line, column: col };
}

const firstLine = (error: YAMLError): string => error.message.split('\n', 1)[0] ?? error.code;

function keyOffset(document: Document, key: PropertyKey | undefined): number | null {
  if (typeof key !== 'string' || !isMap(document.contents)) {
    return null;
  }
  const pair = document.contents.items.find((item) => isScalar(item.key) && item.key.value === key);
  return pair !== undefined && isScalar(pair.key) ? (pair.key.range?.[0] ?? null) : null;
}

const describePath = (path: readonly PropertyKey[]): string =>
  path.map((key) => (typeof key === 'number' ? `[${String(key)}]` : String(key))).join('.');

export function analyzeFrontMatter(node: Yaml, path: RepoPath): Analysis {
  const lineCounter = new LineCounter();
  const document = parseDocument(node.value, {
    lineCounter,
    prettyErrors: false,
    schema: 'core',
    strict: true,
    stringKeys: true,
    uniqueKeys: true,
  });
  const problems = [...document.errors, ...document.warnings];
  if (problems.length > 0) {
    return {
      frontMatter: null,
      diagnostics: problems.map((problem) =>
        diagnostic(
          'adr/frontmatter-yaml',
          path,
          locate(node, lineCounter, problem.pos[0]),
          `YAML : ${firstLine(problem)}`,
        ),
      ),
    };
  }
  let value: unknown;
  try {
    value = document.toJS({ maxAliasCount: 0 });
  } catch {
    return {
      frontMatter: null,
      diagnostics: [diagnostic('adr/frontmatter-yaml', path, positionOf(node), 'YAML : alias interdits')],
    };
  }
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    return {
      frontMatter: null,
      diagnostics: parsed.error.issues.map((issue) => {
        const offset = keyOffset(document, issue.path[0]);
        const position = offset === null ? positionOf(node) : locate(node, lineCounter, offset);
        const where = issue.path.length === 0 ? '' : `${describePath(issue.path)} : `;
        return diagnostic('adr/frontmatter-schema', path, position, `${where}${issue.message}`);
      }),
    };
  }
  const { status, significance, supersedes = [] } = parsed.data;
  const frontMatter: FrontMatter = {
    format: FORMAT,
    status,
    significance,
    supersedes: supersedes.flatMap((id): AdrNumber[] => {
      const number = parseAdrId(id);
      return number === null ? [] : [number];
    }),
  };
  const canonical = serializeFrontMatter(frontMatter);
  return {
    frontMatter,
    diagnostics:
      canonical === node.value
        ? []
        : [
            diagnostic(
              'adr/frontmatter-canonical',
              path,
              positionOf(node),
              `en-tête attendu, à l’identique : ${canonical.replaceAll('\n', ' ⏎ ')}`,
            ),
          ],
  };
}
