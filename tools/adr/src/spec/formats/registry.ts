import { createHash } from 'node:crypto';
import type { FormatSpec } from './types.ts';
import { FORMAT_1 } from './v1.ts';

/** The published formats and the one a proposed ADR must follow. */
export type FormatRegistry = Readonly<{ formats: readonly FormatSpec[]; latest: FormatSpec }>;

/** Every published format. A new format is added here; a published one is never edited. */
export const FORMAT_REGISTRY: FormatRegistry = { formats: [FORMAT_1], latest: FORMAT_1 };

/**
 * SHA-256 of each published format, recorded when it was published: editing a published format changes its digest,
 * and the fixture that compares them fails, so the change has to be a new version instead.
 */
export const PUBLISHED_DIGESTS: Readonly<Record<number, string>> = {
  1: '1305b82cb352ee3e8ebe5e32d77fa11b4b06136b96402a8bf63920eca68eba95',
};

export const formatDigest = (spec: FormatSpec): string =>
  createHash('sha256').update(JSON.stringify(spec)).digest('hex');

export const formatSpec = (registry: FormatRegistry, version: number): FormatSpec | null =>
  registry.formats.find((format) => format.version === version) ?? null;
