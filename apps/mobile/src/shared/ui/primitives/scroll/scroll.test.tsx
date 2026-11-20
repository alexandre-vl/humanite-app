import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import { View } from 'react-native';
import { scrollViewAbove } from '../../../lib/testing';
import { Scroll } from './scroll';

/** The native scroll view the region renders, found from what it holds. */
const region = async (): Promise<ReturnType<typeof scrollViewAbove>> => {
  await render(
    <Scroll axis="vertical">
      <View testID="dedans" />
    </Scroll>,
  );
  return scrollViewAbove(screen.getByTestId('dedans'), 'la région ne rend aucune vue défilante');
};

describe('Scroll', () => {
  /**
   * The sign-in button, pressed with an identifier typed and the keyboard up, closed the keyboard and did nothing
   * else, and answered the second press (iPhone simulator, 25/09/2026). A press on a control answers the first time.
   */
  it('laisse un appui atteindre ce qu’il touche, clavier levé', async () => {
    expect((await region()).props['keyboardShouldPersistTaps']).toBe('handled');
  });

  /**
   * At a large text size, the password field stayed under the keyboard while it was typed in, at 578 points with the
   * keyboard's first row at 597 (iPhone simulator, 25/09/2026). The region makes room for the keyboard, and the field
   * rises above it.
   */
  it('fait place au clavier, et remonte le champ où l’on tape', async () => {
    expect((await region()).props['automaticallyAdjustKeyboardInsets']).toBe(true);
  });

  /**
   * A press that reaches what it touches no longer puts the keyboard away on the way. A drag does: the moment a reader
   * stops typing to read what is under the field.
   */
  it('range le clavier quand on fait défiler', async () => {
    expect((await region()).props['keyboardDismissMode']).toBe('on-drag');
  });

  /**
   * With an article in the player, the account screen ended its last paragraph under the player the tab bar carries,
   * and would not scroll it out (iPhone simulator, iOS 27.0, 20/11/2026). Down a screen, the region lets iOS lend it
   * the room its bars take.
   */
  it('laisse iOS lui prêter la place des barres posées sur l’écran', async () => {
    expect((await region()).props['contentInsetAdjustmentBehavior']).toBe('automatic');
  });

  it('laisse une bande qui défile en travers sans rien lui prêter', async () => {
    await render(
      <Scroll axis="horizontal">
        <View testID="en-travers" />
      </Scroll>,
    );
    const band = scrollViewAbove(screen.getByTestId('en-travers'), 'la bande ne rend aucune vue défilante');
    expect(band.props['contentInsetAdjustmentBehavior']).toBe('never');
  });
});
