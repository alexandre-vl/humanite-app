import type { DisplayText } from '@huma/contracts';
import type { ReactNode } from 'react';

/** The levels the catalogue groups by, mirroring the component levels the architecture assigns each place. */
export type CatalogLevel = 'L0' | 'L1' | 'L2' | 'L3' | 'L4';

/** A component's catalogue entry: a label and a rendered example, authored in the `*.catalog.tsx` beside it. */
export type CatalogEntry = Readonly<{ name: DisplayText; render: () => ReactNode }>;

/** An entry tagged with the level of the place it lives in; the generated registry is a list of these. */
export type CatalogItem = Readonly<{ level: CatalogLevel; entry: CatalogEntry }>;

/**
 * Brands a catalogue label as DisplayText: the catalogue's own text formatter. Its labels name components and levels,
 * dev text that belongs to no dictionary, so a formatter sanctions them the way `t()` sanctions the app's French text.
 */
export const catalogLabel = (label: string): DisplayText => {
  const branded = (value: unknown): value is DisplayText => typeof value === 'string';
  if (branded(label)) {
    return label;
  }
  throw new Error('libellé de catalogue invalide');
};
