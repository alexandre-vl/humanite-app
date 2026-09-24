import { describe, expect, it, jest } from '@jest/globals';
import { PALETTE, typographyAt } from '@huma/design-tokens';
import { isList, isRecord } from '@huma/unknown';
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
  if (!isRecord(typed)) {
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

  /** A field that names nothing is offered nothing: the keychain has no business in a search box. */
  it('n’offre rien au trousseau du téléphone tant qu’un champ ne dit pas ce qu’il tient', async () => {
    await render(<TextField value="" onChange={() => undefined} placeholder={asDisplayText(PLACEHOLDER)} />);
    const field = screen.getByPlaceholderText(PLACEHOLDER);
    expect(field.props['autoComplete']).toBe('off');
    expect(field.props['secureTextEntry']).toBe(false);
    expect(field.props['returnKeyType']).toBeUndefined();
  });

  it('dit au trousseau qu’il tient un identifiant, et ouvre le clavier des adresses', async () => {
    await render(
      <TextField
        value=""
        onChange={() => undefined}
        placeholder={asDisplayText(PLACEHOLDER)}
        fills="login"
        keyboard="email"
      />,
    );
    const field = screen.getByPlaceholderText(PLACEHOLDER);
    expect(field.props['autoComplete']).toBe('username');
    expect(field.props['textContentType']).toBe('username');
    expect(field.props['keyboardType']).toBe('email-address');
  });

  /** A password is hidden and offered as the saved one, never as a new one the phone would propose inventing. */
  it('cache un mot de passe et demande au trousseau celui qui est enregistré', async () => {
    await render(
      <TextField
        value=""
        onChange={() => undefined}
        placeholder={asDisplayText(PLACEHOLDER)}
        fills="password"
        secret
      />,
    );
    const field = screen.getByPlaceholderText(PLACEHOLDER);
    expect(field.props['secureTextEntry']).toBe(true);
    expect(field.props['autoComplete']).toBe('current-password');
  });

  it('porte la touche qui valide quand l’écran a quelque chose à faire d’elle', async () => {
    const submit = jest.fn();
    await render(
      <TextField value="" onChange={() => undefined} placeholder={asDisplayText(PLACEHOLDER)} onSubmit={submit} />,
    );
    const field = screen.getByPlaceholderText(PLACEHOLDER);
    expect(field.props['returnKeyType']).toBe('go');
    await fireEvent(field, 'submitEditing');
    expect(submit).toHaveBeenCalledTimes(1);
  });
});
