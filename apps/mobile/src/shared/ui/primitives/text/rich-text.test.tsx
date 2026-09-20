import { describe, expect, it, jest } from '@jest/globals';
import { FONT_FAMILIES, typographyAt } from '@huma/design-tokens';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { asDisplayText } from '../../../lib/display-text';
import type { TextRun } from './rich-text';
import { RichText } from './rich-text';

const plain = (text: string): TextRun => ({ text: asDisplayText(text) });

/** A role as the paper sets it, at the step nobody has moved. */
const prose = typographyAt('prose', 'normal', 'paper');

/** What a rendered run paints with, flattened: React Native accepts an array of styles, and a run gets one object. */
const styleOf = (text: string): Readonly<Record<string, unknown>> => {
  const style: unknown = screen.getByText(text).props['style'];
  return typeof style === 'object' && style !== null ? { ...style } : {};
};

describe('RichText', () => {
  it('rend chaque fragment de la phrase, dans l’ordre', async () => {
    await render(<RichText runs={[plain('Le vote a eu lieu '), { text: asDisplayText('hier'), face: 'italic' }]} />);
    expect(screen.getByText('Le vote a eu lieu ')).toBeTruthy();
    expect(screen.getByText('hier')).toBeTruthy();
  });

  it('ne donne au fragment penché que sa fonte, pour qu’il hérite du reste de la phrase', async () => {
    await render(<RichText runs={[plain('avant '), { text: asDisplayText('penché'), face: 'italic' }]} />);
    expect(styleOf('penché')).toEqual({ fontFamily: FONT_FAMILIES.paper.lightItalic });
  });

  it('donne à la phrase la taille et l’interligne de son variant', async () => {
    await render(<RichText runs={[plain('une phrase')]} variant="prose" />);
    const sentence: unknown = screen.getByText('une phrase').parent?.props['style'];
    expect(sentence).toMatchObject({
      fontFamily: prose.family,
      fontSize: prose.size,
      lineHeight: prose.size * prose.leading,
    });
  });

  it('répond à la pression sur le fragment qui en porte une, et sur lui seul', async () => {
    const press = jest.fn();
    await render(<RichText runs={[plain('lire '), { text: asDisplayText('le rapport'), onPress: press }]} />);
    await fireEvent.press(screen.getByText('lire '));
    expect(press).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByText('le rapport'));
    expect(press).toHaveBeenCalledTimes(1);
  });
});
