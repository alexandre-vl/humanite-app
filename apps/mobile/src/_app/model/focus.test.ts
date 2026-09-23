import { describe, expect, it, jest } from '@jest/globals';
import { focusManager } from '@tanstack/react-query';
import { AppState } from 'react-native';
import { followTheApp } from './focus';

describe('followTheApp', () => {
  /** The library cannot see a phone put the app away; told, it knows when the reader has come back to it. */
  it('dit à la bibliothèque des requêtes quand l’app passe derrière et quand elle revient', () => {
    const heard: Parameters<typeof AppState.addEventListener>[1][] = [];
    jest.spyOn(AppState, 'addEventListener').mockImplementation((...[, listener]) => {
      heard.push(listener);
      return { remove: () => undefined };
    });
    followTheApp();
    const [told] = heard;
    told?.('background');
    expect(focusManager.isFocused()).toBe(false);
    told?.('active');
    expect(focusManager.isFocused()).toBe(true);
  });
});
