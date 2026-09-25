import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { asDisplayText } from '../../../lib/display-text';
import { PAPER_TYPESETTING, TypesettingProvider } from '../../../lib/styles';
import { nearestAbove, styleOf } from '../../../lib/testing';
import type { SegmentedItem } from './segmented-control';
import { SegmentedControl } from './segmented-control';

const ITEMS: readonly SegmentedItem<'small' | 'normal' | 'large'>[] = [
  { id: 'small', label: asDisplayText('Petit') },
  { id: 'normal', label: asDisplayText('Normal') },
  { id: 'large', label: asDisplayText('Grand') },
];

describe('SegmentedControl', () => {
  it('annonce chaque choix comme une option parmi d’autres, et laquelle est en vigueur', async () => {
    await render(<SegmentedControl items={ITEMS} active="normal" onSelect={() => undefined} />);
    expect(screen.getByRole('radio', { name: 'Normal', selected: true })).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Grand', selected: false })).toBeTruthy();
  });

  it('rapporte le choix touché, sans changer lui-même celui qui est en vigueur', async () => {
    const onSelect = jest.fn<(id: 'small' | 'normal' | 'large') => void>();
    await render(<SegmentedControl items={ITEMS} active="normal" onSelect={onSelect} />);
    await fireEvent.press(screen.getByRole('radio', { name: 'Grand' }));
    expect(onSelect).toHaveBeenCalledWith('large');
    expect(screen.getByRole('radio', { name: 'Normal', selected: true })).toBeTruthy();
  });

  /**
   * A name may wrap between its words and still be read; a word cut to fit its cell may not. At the phone's largest
   * text size the themes read « Syst » over « ème » on the iPhone simulator, and one cut is enough to stand every
   * choice one under the other. A change of the text size tries the row again.
   */
  it('met ses choix l’un sous l’autre dès qu’un nom serait coupé, et les remet en rang quand la taille change', async () => {
    const direction = (): unknown =>
      nearestAbove(
        screen.getByRole('radio', { name: 'Grand' }),
        (node) => styleOf(node)['flexDirection'],
        'les choix ne sont posés dans aucune rangée',
      );
    const view = await render(
      <TypesettingProvider typesetting={{ ...PAPER_TYPESETTING, phone: { system: 'ios', category: 'ax5' } }}>
        <SegmentedControl items={ITEMS} active="normal" onSelect={() => undefined} />
      </TypesettingProvider>,
    );
    expect(direction()).toBe('row');
    await fireEvent(screen.getByText('Normal'), 'textLayout', {
      nativeEvent: { lines: [{ text: 'Norm' }, { text: 'al' }] },
    });
    expect(direction()).toBe('column');
    await view.rerender(
      <TypesettingProvider typesetting={PAPER_TYPESETTING}>
        <SegmentedControl items={ITEMS} active="normal" onSelect={() => undefined} />
      </TypesettingProvider>,
    );
    expect(direction()).toBe('row');
  });

  it('reste en rang quand ses noms passent à la ligne entre deux mots', async () => {
    await render(<SegmentedControl items={ITEMS} active="normal" onSelect={() => undefined} />);
    await fireEvent(screen.getByText('Grand'), 'textLayout', {
      nativeEvent: { lines: [{ text: 'Très ' }, { text: 'grand' }] },
    });
    expect(
      nearestAbove(
        screen.getByRole('radio', { name: 'Grand' }),
        (node) => styleOf(node)['flexDirection'],
        'les choix ne sont posés dans aucune rangée',
      ),
    ).toBe('row');
  });
});
