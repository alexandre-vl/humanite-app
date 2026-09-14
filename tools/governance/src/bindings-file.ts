import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { WrittenFile } from '@huma/adr/decide';
import { formatForPath } from '@huma/kit/format';
import ts from 'typescript';
import { BINDINGS_PATH } from './bindings.ts';

const BINDINGS_NAME = 'BINDINGS';

/** The object literal a variable declaration holds, through `as const` and `satisfies`. */
function objectLiteralOf(expression: ts.Expression): ts.ObjectLiteralExpression | null {
  if (ts.isObjectLiteralExpression(expression)) {
    return expression;
  }
  if (
    ts.isSatisfiesExpression(expression) ||
    ts.isAsExpression(expression) ||
    ts.isParenthesizedExpression(expression)
  ) {
    return objectLiteralOf(expression.expression);
  }
  return null;
}

/**
 * The text of the bindings file without the entries of `ids`: each entry of the `BINDINGS` object is cut whole, its
 * comments and trailing comma included. An id without entry is an error, never ignored.
 */
export function withoutBindingEntries(text: string, ids: readonly string[]): string {
  const file = ts.createSourceFile(BINDINGS_PATH, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const object = file.statements
    .filter(ts.isVariableStatement)
    .flatMap((statement) => statement.declarationList.declarations)
    .flatMap((declaration) =>
      ts.isIdentifier(declaration.name) &&
      declaration.name.text === BINDINGS_NAME &&
      declaration.initializer !== undefined
        ? [objectLiteralOf(declaration.initializer)]
        : [],
    )[0];
  if (object === null || object === undefined) {
    throw new Error(`${BINDINGS_PATH} : objet ${BINDINGS_NAME} introuvable`);
  }
  const cuts = object.properties.flatMap((property) => {
    const name = property.name;
    if (name === undefined || !(ts.isStringLiteral(name) || ts.isIdentifier(name)) || !ids.includes(name.text)) {
      return [];
    }
    const end = text[property.getEnd()] === ',' ? property.getEnd() + 1 : property.getEnd();
    return [{ id: name.text, start: property.getFullStart(), end }];
  });
  const missing = ids.filter((id) => !cuts.some((cut) => cut.id === id));
  if (missing.length > 0) {
    throw new Error(`${BINDINGS_PATH} : aucune entrée pour ${missing.join(', ')}`);
  }
  return cuts
    .toSorted((left, right) => right.start - left.start)
    .reduce((result, cut) => `${result.slice(0, cut.start)}${result.slice(cut.end)}`, text);
}

/** Removes the entries of `ids` from the bindings file of the workspace at `root`, formatted as the repository wants. */
export async function removeBindingEntries(root: string, ids: readonly string[]): Promise<readonly WrittenFile[]> {
  const path = join(root, BINDINGS_PATH);
  const previous = await readFile(path, 'utf8');
  await writeFile(path, await formatForPath(root, BINDINGS_PATH, withoutBindingEntries(previous, ids)), 'utf8');
  return [{ path: BINDINGS_PATH, previous }];
}
