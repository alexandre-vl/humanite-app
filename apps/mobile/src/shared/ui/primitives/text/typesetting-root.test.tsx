import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { act, render, screen } from '@testing-library/react-native';
import { Dimensions, Platform } from 'react-native';
import { asDisplayText } from '../../../lib/display-text';
import { styleOf } from '../../../lib/testing';
import { Text } from './text';
import { TypesettingRoot } from './typesetting-root';

const WORDS = 'le journal';
const TITLE = 'La une';

/** What the bench's window says, to be put back after a test that moved the phone's text size. */
const WINDOW = Dimensions.get('window');
const SCREEN = Dimensions.get('screen');

/** Sets the phone's text size to the multiple React Native reports for it, as a reader changing it would. */
const setPhone = async (fontScale: number): Promise<void> => {
  await act(() => {
    Dimensions.set({ window: { ...WINDOW, fontScale }, screen: SCREEN });
  });
};

const print = async (): Promise<void> => {
  await render(
    <TypesettingRoot scale="normal" faces="paper">
      <Text variant="body">{asDisplayText(WORDS)}</Text>
      <Text variant="headline">{asDisplayText(TITLE)}</Text>
    </TypesettingRoot>,
  );
};

/** The size a run of text was set at. */
const size = (words: string): unknown => styleOf(screen.getByText(words))['fontSize'];

afterEach(async () => {
  jest.restoreAllMocks();
  await act(() => {
    Dimensions.set({ window: WINDOW, screen: SCREEN });
  });
});

describe('TypesettingRoot', () => {
  /**
   * iOS grows each size by a table of its own, and reports one multiple for all of them: 3,571 at the largest. Read
   * back as the size it stands for, it sets body text where iOS sets its own — 51 points — and a headline at 58, where
   * one multiple for both had set it at a hundred.
   */
  it('imprime à la taille de texte de l’iPhone comme l’iPhone imprime la sienne', async () => {
    await setPhone(3.571);
    await print();
    expect(size(WORDS)).toBe(51);
    expect(size(TITLE)).toBe(58);
  });

  /**
   * A text size changed on the phone while the paper is open reaches every text at once. Left to the platform, it
   * was drawn in boxes laid out for the old size until the app was started again: on the iPhone simulator on
   * 25/09/2026, a heading of two lines at the largest size kept its 140 points of height back at the default one.
   * Carried by the typesetting, a new size is a new style, and React lays every text out again.
   */
  it('suit la taille du téléphone quand elle change pendant la lecture', async () => {
    await setPhone(1);
    await print();
    expect(size(WORDS)).toBe(16);
    await setPhone(1.353);
    expect(size(WORDS)).toBe(22);
  });

  /** Android 14 bends its multiple as iOS does with its table: at twice the size, sixteen points print at 28. */
  it('imprime à la taille de texte d’Android comme Android 14 imprime la sienne, et multiplie avant', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const version = jest.spyOn(Platform, 'Version', 'get').mockReturnValue(34);
    await setPhone(2);
    await print();
    expect(size(WORDS)).toBe(28);
    version.mockReturnValue(33);
    await setPhone(1.5);
    await setPhone(2);
    expect(size(WORDS)).toBe(32);
  });
});
