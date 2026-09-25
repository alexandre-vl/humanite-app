import { SPACING } from '@huma/design-tokens';
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { View } from 'react-native';
import { DECORATIVE } from '../../../lib/announce';
import { asDisplayText } from '../../../lib/display-text';
import { nearestAbove } from '../../../lib/testing';
import { Pressable } from './pressable';

/** The layout a view reports, which a headless renderer never measures and so never sends on its own. */
const LAYOUT = { nativeEvent: { layout: { x: 128, y: 0, width: 64, height: 40 } } };

describe('Pressable', () => {
  /**
   * The outer target is the one thing a reader listening lands on: the bookmark on a card of the feed was read out
   * as part of the card's name, and nothing let them press it.
   */
  it('prête son action à la cible sous laquelle il est dessiné, et ne s’annonce plus lui-même', async () => {
    const keep = jest.fn();
    await render(
      <Pressable role="link" label={asDisplayText('Un article')} onPress={jest.fn()}>
        <Pressable role="button" label={asDisplayText('Ajouter à mes lectures')} onPress={keep} />
      </Pressable>,
    );
    const card = screen.getByLabelText('Un article');
    expect(card.props['accessibilityActions']).toEqual([{ name: '0', label: 'Ajouter à mes lectures' }]);
    expect(screen.queryByLabelText('Ajouter à mes lectures')).toBeNull();
    await fireEvent(card, 'accessibilityAction', { nativeEvent: { actionName: '0' } });
    expect(keep).toHaveBeenCalledTimes(1);
  });

  it('garde son nom et son action quand rien ne l’entoure', async () => {
    await render(<Pressable role="button" label={asDisplayText('Ajouter à mes lectures')} onPress={jest.fn()} />);
    const target = screen.getByLabelText('Ajouter à mes lectures');
    expect(target.props['accessibilityActions']).toBeUndefined();
  });

  it('annonce ce qu’il fait, et qu’il est le choix en vigueur', async () => {
    await render(
      <Pressable label={asDisplayText('Monde')} role="radio" selected onPress={jest.fn()}>
        <View testID="dedans" />
      </Pressable>,
    );
    const target = screen.getByLabelText('Monde');
    expect(target.props['accessibilityRole']).toBe('radio');
    expect(target.props['accessibilityState']).toEqual({ selected: true });
  });

  /** A mark says nothing out loud: what the target is to the reader just now is said after its name, as iOS says it. */
  it('dit après son nom ce qu’il est au lecteur, et rien quand il n’a rien à en dire', async () => {
    await render(
      <Pressable role="link" status={asDisplayText('Nouveau')} onPress={jest.fn()}>
        <View testID="neuf" />
      </Pressable>,
    );
    expect(screen.getByRole('link', { value: { text: 'Nouveau' } })).toBeTruthy();
    await render(
      <Pressable role="link" onPress={jest.fn()}>
        <View testID="lu" />
      </Pressable>,
    );
    expect(screen.getByRole('link')).toBeTruthy();
    expect(screen.queryByRole('link', { value: { text: 'Nouveau' } })).toBeNull();
  });

  /**
   * Where a target came to rest is the only way a band wider than the screen can bring the chosen label into view:
   * what a label measures depends on its word, its face and the step the reader set, so nothing knows it in advance.
   * A target nobody asked to measure reports nothing, and lays out no listener at all.
   */
  it('rapporte où il s’est posé, à qui le demande', async () => {
    const measured = jest.fn();
    await render(
      <Pressable label={asDisplayText('Monde')} onMeasure={measured}>
        <View testID="dedans" />
      </Pressable>,
    );
    await fireEvent(screen.getByLabelText('Monde'), 'layout', LAYOUT);
    expect(measured).toHaveBeenCalledWith({ x: 128, width: 64 });
  });

  it('ne pose aucun guetteur de mesure quand personne ne la demande', async () => {
    await render(
      <Pressable label={asDisplayText('Monde')}>
        <View testID="dedans" />
      </Pressable>,
    );
    expect(screen.getByLabelText('Monde').props['onLayout']).toBeUndefined();
  });

  /**
   * A finger needs more room than a mark, and the room is spent on the touch rather than on the layout. Drawn at the
   * size of a finger, a bookmark hung at the end of a line of small capitals made that whole line as tall as a
   * finger — and on a screen where the line carries nothing else, a card opened on a band of empty page with one
   * mark floating in it. A target asked for none reaches exactly as far as it is drawn.
   */
  it('répond au doigt plus loin que ses bords, à qui le demande', async () => {
    const view = await render(
      <Pressable label={asDisplayText('Monde')} hitSlop={SPACING.md}>
        <View testID="dedans" />
      </Pressable>,
    );
    expect(screen.getByLabelText('Monde').props['hitSlop']).toBe(SPACING.md);
    await view.rerender(
      <Pressable label={asDisplayText('Monde')}>
        <View testID="dedans" />
      </Pressable>,
    );
    expect(screen.getByLabelText('Monde').props['hitSlop']).toBeUndefined();
  });

  /**
   * A field's name, pressed, puts the caret in the field. A reader listening reaches the field itself, and hears it
   * named there; a second stop on its name, saying the same thing, would be the name heard twice.
   */
  it('répond au doigt sans arrêter qui écoute l’écran, quand ce qu’il touche s’annonce déjà', async () => {
    const press = jest.fn();
    await render(
      <Pressable announces={DECORATIVE} onPress={press}>
        <View testID="dedans" />
      </Pressable>,
    );
    const target = nearestAbove(
      screen.getByTestId('dedans', { includeHiddenElements: true }),
      (node) => (node.props['onStartShouldSetResponder'] === undefined ? undefined : node),
      'rien autour ne répond au doigt',
    );
    expect(target.props['accessible']).toBe(false);
    expect(target.props['importantForAccessibility']).toBe('no-hide-descendants');
    await fireEvent.press(target);
    expect(press).toHaveBeenCalledTimes(1);
  });
});
