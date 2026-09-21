import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { View } from 'react-native';
import { asDisplayText } from '../../../lib/display-text';
import { Pressable } from './pressable';

/** The layout a view reports, which a headless renderer never measures and so never sends on its own. */
const LAYOUT = { nativeEvent: { layout: { x: 128, y: 0, width: 64, height: 40 } } };

describe('Pressable', () => {
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
});
