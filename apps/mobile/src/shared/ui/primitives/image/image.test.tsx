import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import { asDisplayText } from '../../../lib/display-text';
import { DECORATIVE } from '../../../lib/announce';
import { Image } from './image';

/** A thumbhash the catalogue also uses: a source a headless runner can hold without a file behind it. */
const SOURCE = { thumbhash: '0lYGDIJ4mXZ/h3h2d4VXgIf7hw==' };

const CAPTION = asDisplayText('Une foule devant la mairie');

describe('Image', () => {
  /**
   * The whole point of asking: a picture that repeats the headline beside it is a second stop for the same fact, and
   * a reader listening to a feed of twenty articles would hear each of them twice. Announced as decorative, it is
   * walked past — which is what both of these props say, one to each platform.
   */
  it('est passée sans un mot quand elle ne dit rien que le texte ne dise déjà', async () => {
    await render(<Image source={SOURCE} recyclingKey="one" announces={DECORATIVE} />);
    const picture = screen.getByTestId('picture', { includeHiddenElements: true });
    expect(picture.props['accessible']).toBe(false);
    expect(picture.props['accessibilityElementsHidden']).toBe(true);
    expect(picture.props['importantForAccessibility']).toBe('no-hide-descendants');
    expect(screen.queryByTestId('picture')).toBeNull();
  });

  it('se nomme quand elle porte ce qu’aucun mot autour d’elle ne porte', async () => {
    await render(<Image source={SOURCE} recyclingKey="one" announces={CAPTION} />);
    const picture = screen.getByLabelText(CAPTION);
    expect(picture.props['accessible']).toBe(true);
    expect(picture.props['accessibilityRole']).toBe('image');
    expect(picture.props['accessibilityElementsHidden']).toBe(false);
    expect(picture.props['importantForAccessibility']).toBe('yes');
  });
});
