/** The `code` of a Node system error (`ENOENT`, `EEXIST`…), `null` for anything else. */
export function errnoCode(error: unknown): string | null {
  if (!Error.isError(error) || !('code' in error)) {
    return null;
  }
  return typeof error.code === 'string' ? error.code : null;
}

/** A thrown value as text for a report: the stack of an `Error`, the type of anything else. */
export function describeError(error: unknown): string {
  if (Error.isError(error)) {
    return error.stack ?? error.message;
  }
  return `valeur non Error levée (${typeof error})`;
}
