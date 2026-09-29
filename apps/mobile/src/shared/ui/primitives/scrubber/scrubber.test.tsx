import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { asDisplayText } from '../../../lib/display-text';
import { Scrubber } from './scrubber';

describe('audio progress accessibility', () => {
  it('moves a full passage even when an article has fewer than twenty passages', async () => {
    const change = jest.fn<(fraction: number) => void>();
    await render(<Scrubber value={1 / 3} step={1 / 3} label={asDisplayText('Passages')} onChange={change} />);
    const progress = screen.getByRole('adjustable');
    await fireEvent(progress, 'accessibilityAction', { nativeEvent: { actionName: 'increment' } });
    expect(change).toHaveBeenLastCalledWith(2 / 3);
    await fireEvent(progress, 'accessibilityAction', { nativeEvent: { actionName: 'decrement' } });
    expect(change).toHaveBeenLastCalledWith(0);
  });
});
