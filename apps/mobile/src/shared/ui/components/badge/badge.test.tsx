import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { asDisplayText } from '../../../lib/display-text';
import { Text } from '../../primitives/text';
import type { ThemeName } from '../../primitives/theme';
import { ThemeScope } from '../../primitives/theme';
import { Badge } from './badge';

const WORD = 'Abonnés';

/** What a rendered word paints with, flattened: React Native accepts an array of styles, and a word gets one object. */
const styleOf = (text: string): Readonly<Record<string, unknown>> => {
  const style: unknown = screen.getByText(text).props['style'];
  return typeof style === 'object' && style !== null ? { ...style } : {};
};

/** The ink a word is written in when the page around it is in a named theme. */
const inkUnder = async (name: ThemeName, subject: ReactNode): Promise<unknown> => {
  const view = await render(<ThemeScope name={name}>{subject}</ThemeScope>);
  const ink = styleOf(WORD)['color'];
  await view.unmount();
  return ink;
};

describe('Badge', () => {
  /**
   * The yellow is one value in both themes, so the text on it cannot follow the reader's. Read in the reader's theme
   * the mark took the dark theme's own pale text — 1.30 to 1 against the yellow, measured on a phone, on the one
   * card that tells a reader they must pay to read further.
   */
  it('écrit son mot de la même encre, que la page soit claire ou sombre', async () => {
    const mark = <Badge label={asDisplayText(WORD)} />;
    const ink = await inkUnder('dark', mark);
    expect(ink).toBe(await inkUnder('light', mark));
    expect(ink).toBeDefined();
  });

  /** And the rule above says something only because an ordinary word does follow the page it is written on. */
  it('là où un mot ordinaire suit la page', async () => {
    const word = <Text variant="label">{asDisplayText(WORD)}</Text>;
    expect(await inkUnder('dark', word)).not.toBe(await inkUnder('light', word));
  });

  it('dit le mot qu’on lui donne', async () => {
    await render(<Badge label={asDisplayText(WORD)} />);
    expect(screen.getByText(WORD)).toBeTruthy();
  });
});
