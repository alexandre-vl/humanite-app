import type { Position } from '@huma/kit/diagnostics';
import { isRecord } from '@huma/kit/records';
import type { Yaml } from 'mdast';
import type { Document, ErrorCode, YAMLError } from 'yaml';
import { isMap, isScalar, LineCounter, parseDocument } from 'yaml';
import { z } from 'zod';
import { canonicalHeader, headerLines, readCanonicalHeader } from '../model/header.ts';
import type { Header } from '../model/header.ts';
import { parseAdrId } from '../model/identifiers.ts';
import type { FormatRegistry } from '../spec/formats/registry.ts';
import { formatSpec } from '../spec/formats/registry.ts';
import type { FormatSpec } from '../spec/formats/types.ts';
import { SIGNIFICANCES } from '../spec/significance.ts';
import { INITIAL_STATUS, STATUSES } from '../spec/statuses.ts';
import { positionOf } from './markdown.ts';
import type { FileReport } from './report.ts';

export type HeaderReading =
  /** No usable header: the body is still checked against the latest format. */
  Readonly<{ kind: 'unreadable'; spec: FormatSpec }> | Readonly<{ kind: 'readable'; spec: FormatSpec; header: Header }>;

/** What each problem the YAML reader reports means, in the words of the messages. */
const YAML_PROBLEMS = {
  ALIAS_PROPS: 'propriétés sur un alias',
  BAD_ALIAS: 'alias invalide',
  BAD_COLLECTION_TYPE: 'type de collection invalide',
  BAD_DIRECTIVE: 'directive invalide',
  BAD_DQ_ESCAPE: 'échappement invalide entre guillemets doubles',
  BAD_INDENT: 'indentation incohérente',
  BAD_PROP_ORDER: 'ancre et étiquette dans le mauvais ordre',
  BAD_SCALAR_START: 'valeur qui commence par un caractère réservé',
  BLOCK_AS_IMPLICIT_KEY: 'bloc utilisé comme clé implicite',
  BLOCK_IN_FLOW: 'bloc dans une collection en ligne',
  DUPLICATE_KEY: 'clé en double',
  IMPOSSIBLE: 'lecture impossible',
  KEY_OVER_1024_CHARS: 'clé de plus de 1024 caractères',
  MISSING_CHAR: 'caractère manquant',
  MULTILINE_IMPLICIT_KEY: 'clé implicite sur plusieurs lignes',
  MULTIPLE_ANCHORS: 'plusieurs ancres sur un nœud',
  MULTIPLE_DOCS: 'plusieurs documents',
  MULTIPLE_TAGS: 'plusieurs étiquettes sur un nœud',
  NON_STRING_KEY: 'clé qui n’est pas une chaîne',
  RESOURCE_EXHAUSTION: 'document trop coûteux à lire',
  TAB_AS_INDENT: 'tabulation en guise d’indentation',
  TAG_RESOLVE_FAILED: 'étiquette inconnue',
  UNEXPECTED_TOKEN: 'élément inattendu',
} as const satisfies Readonly<Record<ErrorCode, string>>;

const ALIAS_PROBLEM = 'alias interdit';

const french = z.locales.fr().localeError;

/** The header as the schema reads it, before `supersedes` identifiers become numbers. */
type ParsedHeader = Readonly<Omit<Header, 'supersedes'> & { supersedes: readonly string[] }>;

const schemaCache = new WeakMap<FormatSpec, z.ZodType<ParsedHeader>>();

function schemaOf(spec: FormatSpec): z.ZodType<ParsedHeader> {
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

function keyOffset(document: Document, key: PropertyKey | undefined): number | null {
  if (typeof key !== 'string' || !isMap(document.contents)) {
    return null;
  }
  const pair = document.contents.items.find((item) => isScalar(item.key) && item.key.value === key);
  return pair !== undefined && isScalar(pair.key) ? (pair.key.range?.[0] ?? null) : null;
}

const describePath = (path: readonly PropertyKey[]): string =>
  path
    .map((key, index) => (typeof key === 'number' ? `[${String(key)}]` : `${index === 0 ? '' : '.'}${String(key)}`))
    .join('');

const problemOf = (error: YAMLError): string => YAML_PROBLEMS[error.code];

/**
 * Reads the header of an ADR: YAML, then format version, then the schema of that version, then canonical form. The
 * canonical form is the one `readCanonicalHeader` reads in `text`, the whole file, so a header this check accepts is one
 * the agent hook and `adr:decide` can read; a byte order mark and CRLF line breaks are the encoding checks' findings.
 */
export function readHeader(node: Yaml, text: string, registry: FormatRegistry, report: FileReport): HeaderReading {
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
    report('adr/frontmatter-yaml', locate(node, lineCounter, problem.pos[0]), { problem: problemOf(problem) });
  }
  if (problems.length > 0) {
    return { kind: 'unreadable', spec: latest };
  }
  let value: unknown;
  try {
    value = document.toJS({ maxAliasCount: 0 });
  } catch {
    report('adr/frontmatter-yaml', positionOf(node), { problem: ALIAS_PROBLEM });
    return { kind: 'unreadable', spec: latest };
  }
  const version = isRecord(value) ? value['format'] : undefined;
  const spec = typeof version === 'number' ? formatSpec(registry, version) : null;
  if (spec === null) {
    const offset = keyOffset(document, 'format');
    report('adr/frontmatter-format-unknown', offset === null ? positionOf(node) : locate(node, lineCounter, offset), {
      found: version === undefined ? 'absent' : `« ${JSON.stringify(version)} »`,
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
  const header = canonicalHeader({
    ...parsed.data,
    supersedes: parsed.data.supersedes.flatMap((id) => {
      const number = parseAdrId(id);
      return number === null ? [] : [number];
    }),
  });
  if (readCanonicalHeader(text.replace(/^\u{FEFF}/u, '').replaceAll('\r\n', '\n')) === null) {
    report('adr/frontmatter-not-canonical', positionOf(node), { expected: headerLines(header).join(' ⏎ ') });
  }
  if (header.status === INITIAL_STATUS && spec.version !== latest.version) {
    report('adr/frontmatter-format-outdated', positionOf(node), { found: spec.version, latest: latest.version });
  }
  return { kind: 'readable', spec, header };
}
