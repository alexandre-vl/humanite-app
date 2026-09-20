import type { TextScale } from '@huma/design-tokens';
import { createContext, use } from 'react';
import type { ReactNode } from 'react';

/** The step a subtree sets its text at; the paper's own by default, so a tree without a provider still renders. */
const TextScaleContext = createContext<TextScale>('normal');

/** Reads the step in force: every text style the app builds resolves its size through it. */
export function useTextScale(): TextScale {
  return use(TextScaleContext);
}

/**
 * Puts a step on the context for its subtree.
 *
 * It is a context of its own rather than a field of the theme because the two answer different questions and change
 * for different reasons: a theme is a table of colours the phone may flip under the reader's feet, a step is a number
 * only the reader sets. A screen that shows what a step looks like puts one here around its sample, the way it puts a
 * theme around it.
 */
export function TextScaleProvider({ scale, children }: Readonly<{ scale: TextScale; children: ReactNode }>): ReactNode {
  return <TextScaleContext value={scale}>{children}</TextScaleContext>;
}
