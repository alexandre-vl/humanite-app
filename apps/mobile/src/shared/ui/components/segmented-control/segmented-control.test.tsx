import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { asDisplayText } from '../../../lib/display-text';
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
});
