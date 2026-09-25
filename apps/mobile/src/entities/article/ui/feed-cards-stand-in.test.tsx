import { describe, expect, it } from '@jest/globals';
import { render, renderHook, screen } from '@testing-library/react-native';
import { styleOf } from '#lib/testing';
import { useTheme } from '#lib/styles';
import { FeedCardsStandIn } from './feed-cards-stand-in';

describe('FeedCardsStandIn', () => {
  /**
   * Drawn in the grey of a card, the ghost of a search stood 1.3 steps of lightness from the page at the faintest of
   * its breath, and a reader waiting on the journal saw a blank screen under the field (iPhone simulator, 25/09/2026).
   * Every shape it draws is in the grey the tokens hold to be seen.
   */
  it.each(['paper', 'list'] as const)(
    'dessine chaque forme du fil %s dans le gris de ce qui arrive',
    async (rhythm) => {
      const grey = (await renderHook(() => useTheme())).result.current.standIn;
      await render(<FeedCardsStandIn rhythm={rhythm} />);
      const painted = (screen.root?.queryAll(() => true) ?? [])
        .map((node) => styleOf(node)['backgroundColor'])
        .filter((ground) => ground !== undefined);
      expect(painted.length).toBeGreaterThan(5);
      expect(new Set(painted)).toEqual(new Set([grey]));
    },
  );
});
