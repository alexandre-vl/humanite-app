import { SPACING } from '@huma/design-tokens';
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { asDisplayText } from '../../../lib/display-text';
import { Button } from './button';

const LABEL = 'Réinitialiser';

describe('Button', () => {
  it('répond à la pression sous son libellé, et se dit bouton', async () => {
    const press = jest.fn();
    await render(<Button label={asDisplayText(LABEL)} onPress={press} />);
    await fireEvent.press(screen.getByRole('button', { name: LABEL }));
    expect(press).toHaveBeenCalledTimes(1);
  });

  /**
   * The pill is 35,7 points tall at the paper's step, short of the forty-four a finger is owed (iPhone simulator,
   * 25/09/2026). It answers eight points past its edges instead of being drawn larger.
   */
  it('répond au doigt au-delà de la pastille, jusqu’au pas de grille', async () => {
    await render(<Button label={asDisplayText(LABEL)} onPress={() => undefined} />);
    expect(screen.getByRole('button', { name: LABEL }).props['hitSlop']).toBe(SPACING.sm);
  });
});
