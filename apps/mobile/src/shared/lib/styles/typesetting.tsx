import type { FaceSet, TextScale } from '@huma/design-tokens';
import { createContext, use } from 'react';
import type { ReactNode } from 'react';

/** How the type is set for a reader: at which step, and in which set of faces. */
export type Typesetting = Readonly<{ scale: TextScale; faces: FaceSet }>;

/**
 * The paper's own: the step it is written at and the faces it is printed in. It is what a reader who has set nothing
 * reads, what the switch between the two sets of faces turns back to, and what a tree without a provider is set in.
 */
export const PAPER_TYPESETTING: Typesetting = { scale: 'normal', faces: 'paper' };

const TypesettingContext = createContext<Typesetting>(PAPER_TYPESETTING);

/** Reads how the type is set here: every text style the app builds resolves its face and its size through it. */
export function useTypesetting(): Typesetting {
  return use(TypesettingContext);
}

/**
 * Sets the type for a subtree.
 *
 * It is a context of its own rather than a field of the theme because the two answer different questions and change
 * for different reasons: a theme is a table of colours the phone may flip under the reader's feet, a typesetting is
 * what the reader alone asked for. A screen that shows what a setting looks like puts one here around its sample, the
 * way it puts a theme around it.
 */
export function TypesettingProvider({
  typesetting,
  children,
}: Readonly<{ typesetting: Typesetting; children: ReactNode }>): ReactNode {
  return <TypesettingContext value={typesetting}>{children}</TypesettingContext>;
}
