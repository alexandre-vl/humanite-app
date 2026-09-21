import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import { DECORATIVE } from '../../../lib/announce';
import { asDisplayText } from '../../../lib/display-text';
import { Icon } from './icon';
import { ICONS } from './icon-registry';

/** The mark under test, named through the registry rather than spelt out, so the key stays the single source. */
const MARK = `symbol:${ICONS.play.android}`;

const WORD = asDisplayText('Vidéo');

describe('Icon', () => {
  /**
   * A symbol is drawn and not written, so it says nothing out loud unless it is given something to say. Most of the
   * app's marks sit inside a target that already names itself — a chevron in a row that opens a screen, a bookmark in
   * a button called "Ajouter aux favoris" — and a mark that spoke there would say the same thing twice.
   */
  it('est passée sans un mot quand la cible autour d’elle se nomme déjà', async () => {
    await render(<Icon name="play" announces={DECORATIVE} />);
    const mark = screen.getByTestId(MARK, { includeHiddenElements: true });
    expect(mark.props['accessible']).toBe(false);
    expect(mark.props['accessibilityElementsHidden']).toBe(true);
    expect(mark.props['importantForAccessibility']).toBe('no-hide-descendants');
    expect(screen.queryByTestId(MARK)).toBeNull();
  });

  it('porte un mot quand elle est la seule à dire ce qu’elle dit', async () => {
    await render(<Icon name="play" announces={WORD} />);
    const mark = screen.getByLabelText(WORD);
    expect(mark.props['accessible']).toBe(true);
    expect(mark.props['accessibilityRole']).toBe('image');
    expect(mark.props['importantForAccessibility']).toBe('yes');
  });
});
