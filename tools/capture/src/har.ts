import { isRecord } from '@huma/unknown';

/**
 * Reading a recorded network session.
 *
 * A capture of the official app is the only place the shape of the journal's service is written down, and it is a
 * single JSON file of a hundred and forty megabytes. Parsing it whole would hold every response body in memory at
 * once, so this walks the top-level array with a scanner that knows only quotes and braces, and hands one exchange
 * to `JSON.parse` at a time. Peak memory is the file plus one exchange.
 *
 * Nothing below asserts a type onto what the parse returned. A capture is written by a proxy this repository does
 * not control, on a session it did not record, and a field that turned out to be missing or of another kind would
 * throw somewhere far from here. Every field is therefore read through a reader that answers for its own absence.
 */

/** One request and its answer, as a capture recorded them, with the two bodies already decoded. */
export type Exchange = Readonly<{
  at: string;
  method: string;
  url: string;
  host: string;
  path: string;
  query: string;
  status: number;
  mime: string;
  requestBody: string | null;
  responseBody: string | null;
}>;

/** One field of whatever a parse returned, without claiming to know what either of them is. */
const fieldOf = (value: unknown, key: string): unknown => (isRecord(value) ? value[key] : undefined);

const textOf = (value: unknown): string => (typeof value === 'string' ? value : '');

const numberOf = (value: unknown): number => (typeof value === 'number' ? value : 0);

/** The text of a body, whichever of the two ways a capture wrote it down. */
const decode = (content: unknown): string | null => {
  const raw = textOf(fieldOf(content, 'text'));
  if (raw === '') {
    return null;
  }
  return textOf(fieldOf(content, 'encoding')) === 'base64' ? Buffer.from(raw, 'base64').toString('utf8') : raw;
};

/**
 * Where each top-level object of the entries array begins and ends.
 *
 * Quotes are tracked because a brace inside a string is not a brace, and an escape is skipped because a quote behind
 * a backslash does not close a string. Nothing else about JSON needs to be known to find these boundaries.
 */
const boundsOf = (text: string): readonly (readonly [number, number])[] => {
  const key = text.indexOf('"entries"');
  if (key < 0) {
    throw new Error('capture sans tableau « entries » : ce fichier n’est pas un HAR');
  }
  const bounds: (readonly [number, number])[] = [];
  let at = text.indexOf('[', key) + 1;
  while (at < text.length) {
    while (at < text.length && /\s|,/u.test(text[at] ?? '')) {
      at += 1;
    }
    if (text[at] !== '{') {
      break;
    }
    const from = at;
    let depth = 0;
    let inString = false;
    for (; at < text.length; at += 1) {
      const sign = text[at];
      if (inString) {
        if (sign === '\\') {
          at += 1;
        } else if (sign === '"') {
          inString = false;
        }
        continue;
      }
      if (sign === '"') {
        inString = true;
      } else if (sign === '{') {
        depth += 1;
      } else if (sign === '}') {
        depth -= 1;
        if (depth === 0) {
          at += 1;
          break;
        }
      }
    }
    bounds.push([from, at]);
  }
  return bounds;
};

const exchangeOf = (entry: unknown): Exchange => {
  const request = fieldOf(entry, 'request');
  const response = fieldOf(entry, 'response');
  const url = textOf(fieldOf(request, 'url'));
  const address = URL.canParse(url) ? new URL(url) : null;
  return {
    at: textOf(fieldOf(entry, 'startedDateTime')),
    method: textOf(fieldOf(request, 'method')),
    url,
    host: address?.host ?? '',
    path: address?.pathname ?? url,
    query: address?.search ?? '',
    status: numberOf(fieldOf(response, 'status')),
    mime: (textOf(fieldOf(fieldOf(response, 'content'), 'mimeType')).split(';')[0] ?? '').trim(),
    requestBody: decode(fieldOf(request, 'postData')),
    responseBody: decode(fieldOf(response, 'content')),
  };
};

/** Every exchange a capture holds, in the order it recorded them. */
export const readHar = (text: string): readonly Exchange[] =>
  boundsOf(text).map(([from, to]): Exchange => {
    const entry: unknown = JSON.parse(text.slice(from, to));
    return exchangeOf(entry);
  });
