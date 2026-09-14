/**
 * Narrowing of untyped JSON without a schema library: the agent hooks read their input with these helpers because
 * importing a validator would add its load time to every tool call.
 */

export type JsonObject = Readonly<Record<string, unknown>>;

export const isJsonObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** `JSON.parse` that returns `undefined` instead of throwing on malformed text. */
export function parseJson(text: string): unknown {
  try {
    const value: unknown = JSON.parse(text);
    return value;
  } catch {
    return undefined;
  }
}

export function stringField(object: JsonObject, key: string): string | null {
  const value = object[key];
  return typeof value === 'string' ? value : null;
}

export function objectField(object: JsonObject, key: string): JsonObject | null {
  const value = object[key];
  return isJsonObject(value) ? value : null;
}

export function arrayField(object: JsonObject, key: string): readonly unknown[] | null {
  const value = object[key];
  return Array.isArray(value) ? value : null;
}
