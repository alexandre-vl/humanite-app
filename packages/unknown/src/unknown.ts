/**
 * What a value of unknown shape is found to be — a parse, a file, an answer, what a disk hands back, what a test reads
 * off a view — without asserting it: the one place the workspace narrows an `unknown` before reading into it. The app,
 * the packages and the tools all read these, so none writes its own and no two can disagree on what a record is.
 */

/** A record of named values, each one still unknown: what `isRecord` narrows to. */
export type UnknownRecord = Readonly<Record<string, unknown>>;

/** Whether `value` is an object whose fields can be read by name, and not a list. */
export const isRecord = (value: unknown): value is UnknownRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Whether `value` is a list, each item of it still unknown. `Array.isArray` alone narrows to a list of `any`, which reads
 * as whatever a caller wants; this narrows to what was checked, and nothing more.
 */
export const isList = (value: unknown): value is readonly unknown[] => Array.isArray(value);
