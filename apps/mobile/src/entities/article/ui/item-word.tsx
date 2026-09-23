import type { DisplayText } from '@huma/contracts';
import type { ReactNode } from 'react';
import { Text } from '#primitives/text';

export type ItemWordProps = Readonly<{ word: DisplayText | null }>;

/**
 * A word an item is marked with — what it is when it is not an article, or that anyone may read it — set the one way
 * a card, a row of the wire and the head of an article all set it, and nothing at all when there is no word to set.
 */
export function ItemWord({ word }: ItemWordProps): ReactNode {
  return word === null ? null : (
    <Text variant="kicker" tone="textPrimary">
      {word}
    </Text>
  );
}
