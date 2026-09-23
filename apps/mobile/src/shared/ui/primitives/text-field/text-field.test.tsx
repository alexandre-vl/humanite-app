import { describe, expect, it, jest } from '@jest/globals';
import { PALETTE, typographyAt } from '@huma/design-tokens';
import { isList } from '@huma/unknown';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Keyboard } from 'react-native';
import { asDisplayText } from '../../../lib/display-text';
import { dismissKeyboard, TextField } from './text-field';

const PLACEHOLDER = 'Saisissez ici le sujet';

/**
 * The letters the field is set in, read back from the pair React Native takes: the box first, the type second. The
 * palette is read rather than the theme, which no file outside the theme's own core may import.
 */
const letters = (): Readonly<Record<string, unknown>> => {
  const style: unknown = screen.getByPlaceholderText(PLACEHOLDER).props['style'];
  const [, typed] = isList(style) ? style : [];
  if (typeof typed !== 'object' || typed === null) {
    throw new Error('le champ ne porte pas de type lisible');
  }
  return { ...typed };
};

describe('TextField', () => {
  it('montre le texte de substitution, et rapporte ce qu’on y tape', async () => {
    const change = jest.fn();
    await render(<TextField value="" onChange={change} placeholder={asDisplayText(PLACEHOLDER)} />);
    await fireEvent.changeText(screen.getByPlaceholderText(PLACEHOLDER), 'climat');
    expect(change).toHaveBeenCalledWith('climat');
  });

  it('prend la fonte, la taille et la couleur de son variant', async () => {
    await render(<TextField value="" onChange={() => undefined} placeholder={asDisplayText(PLACEHOLDER)} />);
    expect(letters()).toEqual({
      fontFamily: typographyAt('body', 'normal', 'paper').family,
      fontSize: typographyAt('body', 'normal', 'paper').size,
      color: PALETTE.aubergine,
    });
  });

  /**
   * An input is one line, and Android lays a line height out from the top of the box rather than around the letters:
   * a field that carried one would type above the line its own placeholder sat on.
   */
  it('n’emporte pas l’interligne de son variant, qu’une ligne unique n’a pas à empiler', async () => {
    await render(<TextField value="" onChange={() => undefined} placeholder={asDisplayText(PLACEHOLDER)} />);
    expect(Object.keys(letters())).not.toContain('lineHeight');
  });

  it('range le clavier quand un écran ouvre quelque chose depuis le champ', () => {
    const dismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => undefined);
    dismissKeyboard();
    expect(dismiss).toHaveBeenCalledTimes(1);
    dismiss.mockRestore();
  });
});
