import type { DisplayText } from '@huma/contracts';
import type { ReactNode } from 'react';

/** The levels the catalogue groups by, mirroring the component levels the architecture assigns each place. */
export type CatalogLevel = 'L0' | 'L1' | 'L2' | 'L3' | 'L4';

/**
 * A component's catalogue entry: a label and a rendered example, authored in the `*.catalog.tsx` beside it. The label
 * names a component, dev text that belongs to no dictionary, so an entry sanctions it with `asDisplayText` — the way
 * the app's own French is sanctioned by `t()`.
 */
export type CatalogEntry = Readonly<{ name: DisplayText; render: () => ReactNode }>;

/** An entry tagged with the level of the place it lives in; the generated registry is a list of these. */
export type CatalogItem = Readonly<{ level: CatalogLevel; entry: CatalogEntry }>;
