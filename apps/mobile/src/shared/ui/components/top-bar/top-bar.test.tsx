import { SIZES } from '@huma/design-tokens';
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '../../../i18n';
import { asDisplayText } from '../../../lib/display-text';
import { TopBar } from './top-bar';

const NAME = 'Rubrique';

type Margins = Readonly<{ left: number; right: number }>;

const isCentred = (value: unknown): value is Margins =>
  typeof value === 'object' &&
  value !== null &&
  typeof Reflect.get(value, 'left') === 'number' &&
  typeof Reflect.get(value, 'right') === 'number';

/** Where the bar laid the name, read back from the layer that carries it. */
const margins = (): Margins => {
  let node = screen.getByText(NAME).parent;
  while (node !== null && !isCentred(node.props['style'])) {
    node = node.parent;
  }
  const style: unknown = node?.props['style'];
  if (!isCentred(style)) {
    throw new Error('le nom n’est posé sur rien qui dise où il est : le test ne vérifierait pas qu’il est centré');
  }
  return style;
};

describe('TopBar', () => {
  it('names the screen, and says it is a name and not a sentence', async () => {
    await render(<TopBar title={asDisplayText(NAME)} />);
    expect(screen.getByText(NAME).props['accessibilityRole']).toBe('header');
  });

  it('lays the name over the row, the same margin at each end', async () => {
    await render(<TopBar title={asDisplayText(NAME)} />);
    const { left, right } = margins();
    expect(left).toBe(SIZES.barSide);
    // Equal margins are the whole claim: a name placed between the controls would be centred on what they left over.
    expect(right).toBe(left);
  });

  it('reports the press that leaves, under a word rather than a symbol', async () => {
    const leave = jest.fn();
    await render(<TopBar title={asDisplayText(NAME)} onBack={leave} />);
    await fireEvent.press(screen.getByLabelText(t('action.back')));
    expect(leave).toHaveBeenCalledTimes(1);
  });

  it('draws no way back where nothing pushed the screen', async () => {
    await render(<TopBar title={asDisplayText(NAME)} />);
    expect(screen.queryByLabelText(t('action.back'))).toBeNull();
  });

  /**
   * A screen whose name is not known yet — a section waiting on the list that names it — carries none, and carries
   * nothing in its place either. What the platform's own bar did instead was print the route's segment, so a reader
   * arriving at a section read its address for a moment before reading its name.
   */
  it('carries no name where the screen has none to give', async () => {
    await render(<TopBar onBack={jest.fn()} />);
    expect(screen.queryByRole('header')).toBeNull();
  });
});
