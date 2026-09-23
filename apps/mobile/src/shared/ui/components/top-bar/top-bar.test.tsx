import { SIZES, SPACING } from '@huma/design-tokens';
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '../../../i18n';
import { asDisplayText } from '../../../lib/display-text';
import { styleOf } from '../../../lib/testing';
import { Text } from '../../primitives/text';
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
  while (node !== null && !isCentred(styleOf(node))) {
    node = node.parent;
  }
  const style = node === null ? {} : styleOf(node);
  if (!isCentred(style)) {
    throw new Error('le nom n’est posé sur rien qui dise où il est : le test ne vérifierait pas qu’il est centré');
  }
  return style;
};

type Square = Readonly<{ width: number; height: number }>;

const isSquare = (value: unknown): value is Square =>
  typeof value === 'object' &&
  value !== null &&
  typeof Reflect.get(value, 'width') === 'number' &&
  Reflect.get(value, 'width') === Reflect.get(value, 'height');

/** The side of the square a control of the bar hangs in, read from the nearest box around it held at a fixed size. */
const squareAround = (control: ReturnType<typeof screen.getByText>): number => {
  let node = control.parent;
  while (node !== null && !isSquare(styleOf(node))) {
    node = node.parent;
  }
  const style = node === null ? {} : styleOf(node);
  if (!isSquare(style)) {
    throw new Error('rien autour du contrôle ne le tient à une taille : le test ne vérifierait pas où il pend');
  }
  return style.width;
};

describe('TopBar', () => {
  it('nomme l’écran, et dit que c’est un nom et non une phrase', async () => {
    await render(<TopBar title={asDisplayText(NAME)} />);
    expect(screen.getByText(NAME).props['accessibilityRole']).toBe('header');
  });

  it('pose le nom sur la rangée, avec la même marge à chaque bout', async () => {
    await render(<TopBar title={asDisplayText(NAME)} />);
    const { left, right } = margins();
    expect(left).toBe(SIZES.barSide);
    // Equal margins are the whole claim: a name placed between the controls would be centred on what they left over.
    expect(right).toBe(left);
  });

  it('signale l’appui qui fait sortir, sous un mot plutôt que sous un symbole', async () => {
    const leave = jest.fn();
    await render(<TopBar title={asDisplayText(NAME)} onBack={leave} />);
    await fireEvent.press(screen.getByLabelText(t('action.back')));
    expect(leave).toHaveBeenCalledTimes(1);
  });

  /**
   * What a screen offers hangs in a square the size of the way back's, whatever it draws. Laid straight in the bar it
   * took its own size: on an A065 the article's marque-page, once kept, drew its disc 22 pixels from the edge of the
   * screen, where the front page's control stood 58 from it.
   */
  it('pend ce que l’écran offre dans un carré de la taille du retour', async () => {
    await render(<TopBar onBack={jest.fn()} action={<Text>{asDisplayText('Garder')}</Text>} />);
    expect(squareAround(screen.getByLabelText(t('action.back')))).toBe(SPACING.xxxl);
    expect(squareAround(screen.getByText('Garder'))).toBe(SPACING.xxxl);
  });

  it('ne dessine aucun retour là où rien n’a poussé l’écran', async () => {
    await render(<TopBar title={asDisplayText(NAME)} />);
    expect(screen.queryByLabelText(t('action.back'))).toBeNull();
  });

  /**
   * A screen whose name is not known yet — a section waiting on the list that names it — carries none, and carries
   * nothing in its place either. What the platform's own bar did instead was print the route's segment, so a reader
   * arriving at a section read its address for a moment before reading its name.
   */
  it('ne porte aucun nom là où l’écran n’en a pas à donner', async () => {
    await render(<TopBar onBack={jest.fn()} />);
    expect(screen.queryByRole('header')).toBeNull();
  });
});
