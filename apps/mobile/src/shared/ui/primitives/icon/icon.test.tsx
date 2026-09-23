import { SPACING } from '@huma/design-tokens';
import { isList, isRecord } from '@huma/unknown';
import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import { Dimensions } from 'react-native';
import { DECORATIVE } from '../../../lib/announce';
import { asDisplayText } from '../../../lib/display-text';
import { Icon } from './icon';
import { ICONS } from './icon-registry';
import { DRAWN_AS_TEXT, symbolSize } from './symbol-size';

/** The mark under test, named through the registry rather than spelt out, so the key stays the single source. */
const MARK = `symbol:${ICONS.play.android}`;

const WORD = asDisplayText('Vidéo');

/** The width a style entry carries, whatever else it holds: the stand-in lays one out per number it was handed. */
const sizeOf = (value: unknown): unknown => (isRecord(value) ? value['width'] : undefined);

describe('Icon', () => {
  /**
   * A symbol is drawn and not written, so it says nothing out loud unless it is given something to say. Most of the
   * app's marks sit inside a target that already names itself — a chevron in a row that opens a screen, a bookmark in
   * a button called "Ajouter à mes lectures" — and a mark that spoke there would say the same thing twice.
   */
  it('est passée sans un mot quand la cible autour d’elle se nomme déjà', async () => {
    await render(<Icon name="play" announces={DECORATIVE} />);
    // The mark is drawn, and a reader walking the screen never reaches it. What hides it can only be a view of the
    // app's own: the library's takes no word about it, which is how its glyph reached a card's name on the phone.
    expect(screen.getByTestId(MARK, { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByTestId(MARK)).toBeNull();
  });

  it('porte un mot quand elle est la seule à dire ce qu’elle dit', async () => {
    await render(<Icon name="play" announces={WORD} />);
    const mark = screen.getByLabelText(WORD);
    expect(mark.props['accessible']).toBe(true);
    expect(mark.props['accessibilityRole']).toBe('image');
    expect(mark.props['importantForAccessibility']).toBe('yes');
  });

  /**
   * On Android the mark is a letter in a font, drawn at the size it is handed and boxed at that same number. A letter
   * follows the reader's step and a box does not, so at the phone's largest step the mark was drawn at twice its box
   * and cut to an angle — measured on an A065, whole at 1,00 and at 1,30, an angle at 2,00. The step is undone on the
   * size and not on the box: the glyph comes back to what the paper asked for, and the space it occupies never moves.
   *
   * The bench already runs at a step of two, which is the one that broke the phone — and the first line refuses to let
   * this test pass on a bench that did not, where undoing a step of one would prove nothing at all.
   */
  it('rend sa marque à la taille du journal, quel que soit le cran du téléphone', async () => {
    const asked = SPACING.xl;
    const { fontScale } = Dimensions.get('window');
    expect(fontScale).toBeGreaterThan(1);
    await render(<Icon name="play" announces={DECORATIVE} size={asked} />);
    // The stand-in lays out a layer for the size it was handed, then the one it was given.
    const drawn: unknown = screen.getByTestId(MARK, { includeHiddenElements: true }).props['style'];
    if (!isList(drawn)) {
      throw new Error('la marque ne porte pas la paire de styles que la bibliothèque pose');
    }
    expect(sizeOf(drawn[0])).toBe(symbolSize(asked, fontScale, DRAWN_AS_TEXT));
    expect(sizeOf(drawn[1])).toBe(asked);
  });

  /**
   * The bench runs one platform — jest-expo answers `ios` — so the arithmetic is held apart from the view it feeds.
   * Where a mark is a letter the reader's step is undone on it; where the platform draws a real symbol from points,
   * nothing is undone and a step of two would otherwise have halved every mark on the screen.
   */
  it('défait le cran du lecteur là où la marque est une lettre, et nulle part ailleurs', () => {
    expect(symbolSize(24, 2, true)).toBe(12);
    expect(symbolSize(24, 2, false)).toBe(24);
    expect(symbolSize(24, 1, true)).toBe(24);
  });
});
