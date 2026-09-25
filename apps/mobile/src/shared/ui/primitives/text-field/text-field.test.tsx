import { describe, expect, it, jest } from '@jest/globals';
import { PALETTE, typographyAt } from '@huma/design-tokens';
import { isList, isRecord } from '@huma/unknown';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { createRef } from 'react';
import { Keyboard, TextInput } from 'react-native';
import { asDisplayText } from '../../../lib/display-text';
import type { FieldHandle } from './text-field';
import { dismissKeyboard, TextField } from './text-field';

const PLACEHOLDER = 'Saisissez ici le sujet';
const LABEL = 'Rechercher dans le journal';

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
    await render(
      <TextField value="" onChange={change} label={asDisplayText(LABEL)} placeholder={asDisplayText(PLACEHOLDER)} />,
    );
    await fireEvent.changeText(screen.getByPlaceholderText(PLACEHOLDER), 'climat');
    expect(change).toHaveBeenCalledWith('climat');
  });

  /** The placeholder goes at the first letter; the name a reader listening hears has to stay. */
  it('garde son nom pour qui écoute l’écran, une fois quelque chose tapé', async () => {
    await render(
      <TextField
        value="climat"
        onChange={() => undefined}
        label={asDisplayText(LABEL)}
        placeholder={asDisplayText(PLACEHOLDER)}
      />,
    );
    expect(screen.getByLabelText(LABEL).props['value']).toBe('climat');
  });

  it('prend la fonte, la taille et la couleur de son variant', async () => {
    await render(
      <TextField
        value=""
        onChange={() => undefined}
        label={asDisplayText(LABEL)}
        placeholder={asDisplayText(PLACEHOLDER)}
      />,
    );
    expect(letters()).toEqual({
      fontFamily: typographyAt('body', 'normal', 'paper').family,
      fontSize: typographyAt('body', 'normal', 'paper').size,
      color: PALETTE.aubergine,
    });
    // The phone's text size is in that size already: scaled again, typing would print larger than the page around it.
    expect(screen.getByLabelText(LABEL).props['allowFontScaling']).toBe(false);
  });

  /**
   * An input is one line, and Android lays a line height out from the top of the box rather than around the letters:
   * a field that carried one would type above the line its own placeholder sat on.
   */
  it('n’emporte pas l’interligne de son variant, qu’une ligne unique n’a pas à empiler', async () => {
    await render(
      <TextField
        value=""
        onChange={() => undefined}
        label={asDisplayText(LABEL)}
        placeholder={asDisplayText(PLACEHOLDER)}
      />,
    );
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
    await render(
      <TextField
        value=""
        onChange={() => undefined}
        label={asDisplayText(LABEL)}
        placeholder={asDisplayText(PLACEHOLDER)}
      />,
    );
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
        label={asDisplayText(LABEL)}
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
        label={asDisplayText(LABEL)}
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
      <TextField
        value=""
        onChange={() => undefined}
        label={asDisplayText(LABEL)}
        placeholder={asDisplayText(PLACEHOLDER)}
        onSubmit={submit}
      />,
    );
    const field = screen.getByPlaceholderText(PLACEHOLDER);
    expect(field.props['returnKeyType']).toBe('go');
    await fireEvent(field, 'submitEditing');
    expect(submit).toHaveBeenCalledTimes(1);
  });

  /**
   * Every field of a form but the last hands the reader on to the next, and the keyboard stays up for it: closed and
   * opened again between two fields, it would slide away and back under the reader's thumbs.
   */
  it('porte la touche qui mène au champ suivant, clavier levé', async () => {
    const next = jest.fn();
    await render(
      <TextField
        value=""
        onChange={() => undefined}
        label={asDisplayText(LABEL)}
        placeholder={asDisplayText(PLACEHOLDER)}
        onNext={next}
      />,
    );
    const field = screen.getByPlaceholderText(PLACEHOLDER);
    expect(field.props['returnKeyType']).toBe('next');
    expect(field.props['submitBehavior']).toBe('submit');
    await fireEvent(field, 'submitEditing');
    expect(next).toHaveBeenCalledTimes(1);
  });

  /** A field's name pressed, or a field found empty on sending, puts the caret in that field and in no other. */
  it('prend le curseur quand un écran le lui donne', async () => {
    const handle = createRef<FieldHandle>();
    const focus = jest.spyOn(TextInput.prototype, 'focus');
    await render(
      <TextField
        ref={handle}
        value=""
        onChange={() => undefined}
        label={asDisplayText(LABEL)}
        placeholder={asDisplayText(PLACEHOLDER)}
      />,
    );
    handle.current?.focus();
    expect(focus).toHaveBeenCalledTimes(1);
    const focused: unknown = focus.mock.contexts[0];
    expect(isRecord(focused) && isRecord(focused['props']) ? focused['props']['placeholder'] : null).toBe(PLACEHOLDER);
    focus.mockRestore();
  });

  /**
   * iOS empties a secure field at the first key after its letters are hidden again: « abcd », shown, hidden, then « e »,
   * left « e » on the iPhone simulator on 25/09/2026. Hiding reports the field emptied once; the key after it was meant
   * for the end of what was there, a letter added or one taken away.
   */
  it('garde un mot de passe qu’on cache à nouveau pendant qu’on le tape', async () => {
    const typed: string[] = [];
    const field = (secret: boolean): ReactElement => (
      <TextField
        value="abcd"
        onChange={(text) => {
          typed.push(text);
        }}
        label={asDisplayText(LABEL)}
        placeholder={asDisplayText(PLACEHOLDER)}
        secret={secret}
      />
    );
    const view = await render(field(false));
    await view.rerender(field(true));
    await fireEvent.changeText(screen.getByPlaceholderText(PLACEHOLDER), '');
    await fireEvent.changeText(screen.getByPlaceholderText(PLACEHOLDER), 'e');
    await view.rerender(field(false));
    await view.rerender(field(true));
    await fireEvent.changeText(screen.getByPlaceholderText(PLACEHOLDER), '');
    await fireEvent.changeText(screen.getByPlaceholderText(PLACEHOLDER), '');
    expect(typed).toEqual(['abcd', 'abcde', 'abcd', 'abc']);
  });

  /**
   * A password hidden, then refused and emptied by the screen, holds nothing of what was hidden: the key typed next is
   * the first letter of a new one, and mending it would bring the refused password back in front of it.
   */
  it('ne rend pas un mot de passe caché qu’un écran a effacé depuis', async () => {
    const typed: string[] = [];
    const field = (value: string, secret: boolean): ReactElement => (
      <TextField
        value={value}
        onChange={(text) => {
          typed.push(text);
        }}
        label={asDisplayText(LABEL)}
        placeholder={asDisplayText(PLACEHOLDER)}
        secret={secret}
      />
    );
    const view = await render(field('abcd', false));
    await view.rerender(field('abcd', true));
    await fireEvent.changeText(screen.getByPlaceholderText(PLACEHOLDER), '');
    await view.rerender(field('', true));
    await fireEvent.changeText(screen.getByPlaceholderText(PLACEHOLDER), 'x');
    expect(typed).toEqual(['abcd', 'x']);
  });
});
