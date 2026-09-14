import type { FormatSpec } from './types.ts';
import { FORMAT_1 } from './v1.ts';

/** The formats an ADR header may name, and the one a proposed ADR must follow. */
export type FormatRegistry = Readonly<{ formats: readonly FormatSpec[]; latest: FormatSpec }>;

/**
 * Every format ever used, oldest first. A format stays as long as an ADR is decided in it; a grammar that would refuse
 * one of those ADRs is added as the next version, and the latest is the one new ADRs follow.
 */
export const FORMAT_REGISTRY: FormatRegistry = { formats: [FORMAT_1], latest: FORMAT_1 };

export const formatSpec = (registry: FormatRegistry, version: number): FormatSpec | null =>
  registry.formats.find((format) => format.version === version) ?? null;
