import type { DisplayText } from '@huma/contracts';
import type { ReactNode } from 'react';

/**
 * A component's catalogue entry: a label and a rendered example, authored in the `*.catalog.tsx` beside it. The label
 * names a component, dev text that belongs to no dictionary, so an entry sanctions it with `asDisplayText` — the way
 * the app's own French is sanctioned by `t()`.
 */
export type CatalogEntry = Readonly<{ name: DisplayText; render: () => ReactNode }>;

/**
 * An entry tagged with the level of the place it lives in; the generated registry is a list of these. The level is
 * any string here and a literal in the registry, which the generator writes `as const` from the level the architecture
 * gives each place — so the levels exist once, there, and a reader of the registry gets them exactly.
 */
export type CatalogItem = Readonly<{ level: string; entry: CatalogEntry }>;
