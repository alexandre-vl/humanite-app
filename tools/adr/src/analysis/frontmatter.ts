import type { Position } from '@huma/kit/diagnostics';
import type { Yaml } from 'mdast';
import type { Document, YAMLError } from 'yaml';
import { isMap, isScalar, LineCounter, parseDocument } from 'yaml';
import { z } from 'zod';
import type { AdrNumber } from '../model/identifiers.ts';
import { formatAdrId, parseAdrId } from '../model/identifiers.ts';
import type { FormatSpec } from '../spec/formats/types.ts';
import type { FormatRegistry } from '../spec/formats/registry.ts';
import { formatSpec } from '../spec/formats/registry.ts';
import type { Significance } from '../spec/significance.ts';
import { SIGNIFICANCES } from '../spec/significance.ts';
import type { Status } from '../spec/statuses.ts';
import { STATUSES } from '../spec/statuses.ts';
import type { FileReport } from './report.ts';
import { positionOf } from './markdown.ts';

export type FrontMatter = Readonly<{
  format: number;
  status: Status;
  /** In canonical order, without duplicates. */
  significance: readonly Significance[];
  /** Older ADRs this one replaces once accepted, ascending; empty when the field is absent. */
  supersedes: readonly AdrNumber[];
}>;

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

export const frontMatterBlock = (frontMatter: FrontMatter): string =>
  `---\n${serializeFrontMatter(frontMatter)}\n---\n`;

export type FrontMatterReading =
  /** No usable header: the body is still checked against the latest format. */
  | Readonly<{ kind: 'unreadable'; spec: FormatSpec }>
  | Readonly<{ kind: 'readable'; spec: FormatSpec; frontMatter: FrontMatter }>;

const french = z.locales.fr().localeError;

/** The header as the schema reads it, before `supersedes` identifiers become numbers. */
type ParsedFrontMatter = Readonly<Omit<FrontMatter, 'supersedes'> & { supersedes: readonly string[] }>;

const schemaCache = new WeakMap<FormatSpec, z.ZodType<ParsedFrontMatter>>();

function schemaOf(spec: FormatSpec): z.ZodType<ParsedFrontMatter> {
  const cached = schemaCache.get(spec);
  if (cached !== undefined) {
    return cached;
  }
  const schema = z
    .strictObject({
      format: z.literal(spec.version),
      status: z.enum(STATUSES),
      significance: z.array(z.enum(SIGNIFICANCES)).min(1),
      supersedes: z
        .array(
          z.string().refine((id) => parseAdrId(id) !== null, { error: 'identifiant attendu sous la forme ADR-NNNN' }),
        )
        .min(1)
        .max(spec.limits.maxSupersedes)
        .optional(),
    })
    .transform(({ supersedes = [], ...rest }) => ({ ...rest, supersedes }));
  schemaCache.set(spec, schema);
  return schema;
}

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

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Reads the header of an ADR: YAML, then format version, then the schema of that version, then canonical form. */
export function readFrontMatter(node: Yaml, registry: FormatRegistry, report: FileReport): FrontMatterReading {
  const latest = registry.latest;
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
  for (const problem of problems) {
    report('adr/frontmatter-yaml', locate(node, lineCounter, problem.pos[0]), { problem: firstLine(problem) });
  }
  if (problems.length > 0) {
    return { kind: 'unreadable', spec: latest };
  }
  let value: unknown;
  try {
    value = document.toJS({ maxAliasCount: 0 });
  } catch {
    report('adr/frontmatter-yaml', positionOf(node), { problem: 'alias interdits' });
    return { kind: 'unreadable', spec: latest };
  }
  const version = isRecord(value) ? value['format'] : undefined;
  const spec = typeof version === 'number' ? formatSpec(registry, version) : null;
  if (spec === null) {
    const offset = keyOffset(document, 'format');
    report('adr/frontmatter-format-unknown', offset === null ? positionOf(node) : locate(node, lineCounter, offset), {
      found: version === undefined ? 'absent' : JSON.stringify(version),
      known: registry.formats.map((format) => format.version),
    });
    return { kind: 'unreadable', spec: latest };
  }
  const parsed = schemaOf(spec).safeParse(value, { error: french });
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const offset = keyOffset(document, issue.path[0]);
      report('adr/frontmatter-schema', offset === null ? positionOf(node) : locate(node, lineCounter, offset), {
        field: issue.path.length === 0 ? 'en-tête' : describePath(issue.path),
        problem: issue.message,
      });
    }
    return { kind: 'unreadable', spec };
  }
  const frontMatter: FrontMatter = {
    ...parsed.data,
    supersedes: parsed.data.supersedes.flatMap((id) => {
      const number = parseAdrId(id);
      return number === null ? [] : [number];
    }),
  };
  const canonical = serializeFrontMatter(frontMatter);
  if (canonical !== node.value) {
    report('adr/frontmatter-not-canonical', positionOf(node), { expected: canonical.replaceAll('\n', ' ⏎ ') });
  }
  if (frontMatter.status === 'proposed' && spec.version !== latest.version) {
    report('adr/frontmatter-format-outdated', positionOf(node), { found: spec.version, latest: latest.version });
  }
  return { kind: 'readable', spec, frontMatter };
}
