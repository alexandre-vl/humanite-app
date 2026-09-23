/**
 * Reading untyped JSON without a schema library: the agent hooks read their input with these helpers because
 * importing a validator would add its load time to every tool call. Whether a value is a record or a list is asked
 * of `@huma/unknown`, like everywhere else in the workspace.
 */
import type { UnknownRecord } from '@huma/unknown';
import { isList, isRecord } from '@huma/unknown';

/** `JSON.parse` that returns `undefined` instead of throwing on malformed text. */
export function parseJson(text: string): unknown {
  try {
    const value: unknown = JSON.parse(text);
    return value;
  } catch {
    return undefined;
  }
}

export function stringField(object: UnknownRecord, key: string): string | null {
  const value = object[key];
  return typeof value === 'string' ? value : null;
}

export function objectField(object: UnknownRecord, key: string): UnknownRecord | null {
  const value = object[key];
  return isRecord(value) ? value : null;
}

export function arrayField(object: UnknownRecord, key: string): readonly unknown[] | null {
  const value = object[key];
  return isList(value) ? value : null;
}
