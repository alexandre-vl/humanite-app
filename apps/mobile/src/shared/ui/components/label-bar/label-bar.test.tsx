import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { asDisplayText } from '../../../lib/display-text';
import { LabelBar } from './label-bar';

const ITEMS = [
  { id: 'front', label: asDisplayText('À la une') },
  { id: 'kept', label: asDisplayText('Favoris') },
] as const;

describe('LabelBar', () => {
  /**
   * The rule under the chosen label is a colour and nothing else. The reference logs exactly that as a fault of the
   * screen this copies — a state told by colour alone is no state at all to a reader who cannot see it — and the band
   * carried the same fault until it said which choice was in force.
   */
  it('dit laquelle des bandes est en vigueur, et pas seulement en couleur', async () => {
    await render(<LabelBar items={ITEMS} active="kept" onSelect={jest.fn()} />);
    expect(screen.getByRole('radio', { name: 'Favoris', selected: true })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'À la une', selected: false })).toBeTruthy();
  });

  /** A band nothing is chosen in claims no choice: announced as a row of radios, it would say that all are off. */
  it('ne se donne pas pour un choix quand aucune n’est en vigueur', async () => {
    await render(<LabelBar items={ITEMS} onSelect={jest.fn()} />);
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    expect(screen.getByLabelText('Favoris')).toBeTruthy();
  });

  it('rapporte le choix qu’on touche, par son identifiant', async () => {
    const chosen = jest.fn();
    await render(<LabelBar items={ITEMS} active="front" onSelect={chosen} />);
    await fireEvent.press(screen.getByLabelText('Favoris'));
    expect(chosen).toHaveBeenCalledWith('kept');
  });
});
