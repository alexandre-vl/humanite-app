import type { FormatSpec } from './types.ts';
import { FORMAT_1 } from './v1.ts';

/** The published formats and the one a proposed ADR must follow. */
export type FormatRegistry = Readonly<{ formats: readonly FormatSpec[]; latest: FormatSpec }>;

/** Every published format. A new format is added here; a published one is never edited. */
export const FORMAT_REGISTRY: FormatRegistry = { formats: [FORMAT_1], latest: FORMAT_1 };

export const formatSpec = (registry: FormatRegistry, version: number): FormatSpec | null =>
  registry.formats.find((format) => format.version === version) ?? null;
