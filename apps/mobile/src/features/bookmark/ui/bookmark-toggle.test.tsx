import type { ArticleId } from '@huma/contracts';
import { beforeEach, describe, expect, it } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { content } from '#api';
import { t } from '#i18n';
import { ICONS } from '#primitives/icon';
import { useBookmarks } from '../model/store';
import { BookmarkToggle } from './bookmark-toggle';

const anArticle = async (): Promise<ArticleId> => {
  const [first] = (await content.getFeed({})).items;
  if (first === undefined) {
    throw new Error('le journal ne sert aucun article : le test ne vérifierait rien');
  }
  return first.id;
};

/** What a node was given to paint its own box with, read one flattened style at a time. */
const groundOf = (node: unknown): unknown => {
  const style: unknown = typeof node === 'object' && node !== null ? Reflect.get(node, 'props') : null;
  const flat: unknown = typeof style === 'object' && style !== null ? Reflect.get(style, 'style') : null;
  return typeof flat === 'object' && flat !== null ? Reflect.get(flat, 'backgroundColor') : undefined;
};

beforeEach(async () => {
  await act(() => {
    useBookmarks.setState({ ids: [] });
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
    const id = await anArticle();
    await render(<BookmarkToggle id={id} />);
    const free = screen.getByLabelText(t('bookmark.add'));
    expect(groundOf(free)).toBeUndefined();
    await fireEvent.press(free);
    const kept = screen.getByLabelText(t('bookmark.remove'));
    expect(groundOf(kept)).toBeDefined();
  });

  /**
   * The mark still turns over, and on iOS that is a real fill. The symbol is named by its key here and looked up by
   * the platform name the registry gives that key: which mark a state draws is the registry's to answer, and a test
   * that spelt the platform name itself would be a second answer to it.
   */
  it('change de marque avec l’état, ce qu’iOS dessine en plein', async () => {
    const id = await anArticle();
    await render(<BookmarkToggle id={id} />);
    const seen = { includeHiddenElements: true };
    expect(screen.getByTestId(`symbol:${ICONS.bookmark.android}`, seen)).toBeTruthy();
    await fireEvent.press(screen.getByLabelText(t('bookmark.add')));
    expect(screen.getByTestId(`symbol:${ICONS.bookmarkKept.android}`, seen)).toBeTruthy();
  });

  it('rend l’article au journal quand on le touche une seconde fois', async () => {
    const id = await anArticle();
    await render(<BookmarkToggle id={id} />);
    await fireEvent.press(screen.getByLabelText(t('bookmark.add')));
    await fireEvent.press(screen.getByLabelText(t('bookmark.remove')));
    expect(screen.getByLabelText(t('bookmark.add'))).toBeTruthy();
    expect(useBookmarks.getState().ids).toEqual([]);
  });
});
