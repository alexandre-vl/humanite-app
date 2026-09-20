import { describe, expect, it, jest } from '@jest/globals';
import { openURL } from 'expo-linking';
import { openExternal } from './routing';

// The double is built inside the factory: jest hoists the call above everything else in the file, so anything it read
// from outside would still be undefined when the module under test first asks for it.
jest.mock('expo-linking', () => ({ __esModule: true, openURL: jest.fn() }));

describe('openExternal', () => {
  it('confie l’adresse au téléphone', () => {
    openExternal('https://example.org/soutien');
    expect(jest.mocked(openURL)).toHaveBeenCalledWith('https://example.org/soutien');
  });
});
