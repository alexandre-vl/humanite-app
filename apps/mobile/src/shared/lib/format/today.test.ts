import { describe, expect, it, jest } from '@jest/globals';
import { act, renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { useToday } from './index';

describe('useToday', () => {
  /**
   * A paper put away at night and brought back in the morning has drawn nothing in between: the day it prints its
   * dates against is read again when the app comes back in front, and not only when a list happens to redraw.
   */
  it('lit le jour de Paris, et le relit quand l’app revient devant le lecteur', async () => {
    const heard: Parameters<typeof AppState.addEventListener>[1][] = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((...[, listener]) => {
      heard.push(listener);
      return { remove: () => undefined };
    });
    const clock = jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-09-23T21:30:00.000Z'));
    const { result } = await renderHook(() => useToday());
    expect(result.current).toBe('2026-09-23');
    clock.mockReturnValue(Date.parse('2026-09-23T22:30:00.000Z'));
    await act(() => {
      for (const told of heard) {
        told('active');
      }
    });
    expect(result.current).toBe('2026-09-24');
  });
});
