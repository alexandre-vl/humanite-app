import type { ArticleSummary } from '@huma/contracts';
import { beforeEach, describe, expect, it } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { content } from '#api';
import { t } from '#i18n';
import { styleOf } from '#lib/testing';
import { ICONS } from '#primitives/icon';
import { useBookmarks } from '../model/store';
import { BookmarkToggle } from './bookmark-toggle';

const anArticle = async (): Promise<ArticleSummary> => {
  const [first] = (await content.getFeed({})).items;
  if (first === undefined) {
    throw new Error('le journal ne sert aucun article : le test ne vérifierait rien');
  }
  return first;
};

beforeEach(async () => {
  await act(() => {
    useBookmarks.setState({ kept: [] });
  });
});

describe('BookmarkToggle', () => {
  /**
   * On Android both states draw the same outline: the symbol font the library ships is a FILL 0 instance in which
   * `bookmark` and `bookmark_border` are one glyph under two names. So the mark alone said which state it was in by
   * hue, and by nothing else — 0.148 of relative luminance against 0.224, which is 1.38 to one in lightness. The disc
   * is the second difference, and the one a reader who does not separate the two hues has.
   */
  it('dit l’article gardé par un fond, et pas seulement par une encre', async () => {
    const summary = await anArticle();
    await render(<BookmarkToggle summary={summary} />);
    const free = screen.getByLabelText(t('bookmark.add'));
    expect(styleOf(free)['backgroundColor']).toBeUndefined();
    await fireEvent.press(free);
    const kept = screen.getByLabelText(t('bookmark.remove'));
    expect(styleOf(kept)['backgroundColor']).toBeDefined();
  });

  /**
   * The mark still turns over, and on iOS that is a real fill. The symbol is named by its key here and looked up by
   * the platform name the registry gives that key: which mark a state draws is the registry's to answer, and a test
   * that spelt the platform name itself would be a second answer to it.
   */
  it('change de marque avec l’état, ce qu’iOS dessine en plein', async () => {
    const summary = await anArticle();
    await render(<BookmarkToggle summary={summary} />);
    const seen = { includeHiddenElements: true };
    expect(screen.getByTestId(`symbol:${ICONS.bookmark.android}`, seen)).toBeTruthy();
    await fireEvent.press(screen.getByLabelText(t('bookmark.add')));
    expect(screen.getByTestId(`symbol:${ICONS.bookmarkKept.android}`, seen)).toBeTruthy();
  });

  it('rend l’article au journal quand on le touche une seconde fois', async () => {
    const summary = await anArticle();
    await render(<BookmarkToggle summary={summary} />);
    await fireEvent.press(screen.getByLabelText(t('bookmark.add')));
    await fireEvent.press(screen.getByLabelText(t('bookmark.remove')));
    expect(screen.getByLabelText(t('bookmark.add'))).toBeTruthy();
    expect(useBookmarks.getState().kept).toEqual([]);
  });
});
