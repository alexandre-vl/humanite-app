import { SPACING } from '@huma/design-tokens';
import { isList, isRecord } from '@huma/unknown';
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { t } from '../../../i18n';
import { asDisplayText } from '../../../lib/display-text';
import { nearestAbove, styleOf } from '../../../lib/testing';
import type { Rendered } from '../../../lib/testing';
import { Text } from '../../primitives/text';
import { TopBar } from './top-bar';

const NAME = 'Rubrique';

/** How the box the name is placed in holds itself: the one that takes whatever room the ends of the row leave. */
const placing = (): Readonly<Record<string, unknown>> =>
  nearestAbove(
    screen.getByText(NAME),
    (node) => {
      const style = styleOf(node);
      return style['flex'] === 1 ? style : undefined;
    },
    'le nom n’est posé dans rien qui prenne la place que les bouts laissent : le test ne vérifierait pas où il est',
  );

/** How many boxes of the rendered tree are held to the square an end of the bar keeps, whatever they carry. */
const squaresIn = (node: unknown): number => {
  if (isList(node)) {
    return node.reduce<number>((count, each) => count + squaresIn(each), 0);
  }
  if (!isRecord(node)) {
    return 0;
  }
  const props = node['props'];
  const style = isRecord(props) ? styleOf({ props }) : {};
  const own = style['width'] === SPACING.xxxl && style['height'] === SPACING.xxxl ? 1 : 0;
  return own + squaresIn(node['children']);
};

type Square = Readonly<{ width: number; height: number }>;

const isSquare = (value: unknown): value is Square =>
  isRecord(value) && typeof value['width'] === 'number' && value['width'] === value['height'];

/** The side of the square a control of the bar hangs in, read from the nearest box around it held at a fixed size. */
const squareAround = (control: Rendered): number =>
  nearestAbove(
    control,
    (node) => {
      const style = styleOf(node);
      return isSquare(style) ? style.width : undefined;
    },
    'rien autour du contrôle ne le tient à une taille : le test ne vérifierait pas où il pend',
  );

describe('TopBar', () => {
  it('nomme l’écran, et dit que c’est un nom et non une phrase', async () => {
    await render(<TopBar title={asDisplayText(NAME)} />);
    expect(screen.getByText(NAME).props['accessibilityRole']).toBe('header');
  });

  /**
   * The name is placed in the row, so the bar grows with it: laid over the row, as it was, it could not, and a name
   * taller than the bar was cut to it — the paper's own was, at the phone's largest text size (capture 22). Both ends
   * keep their square with nothing in them, which is what keeps the name in the middle of the screen: an empty end
   * that took no room would leave it centred on what the control at the other end left over.
   */
  it('pose le nom dans la rangée, entre deux bouts qui gardent leur carré même vides', async () => {
    await render(<TopBar title={asDisplayText(NAME)} onBack={jest.fn()} />);
    expect(placing()['position']).toBeUndefined();
    expect(squaresIn(screen.toJSON())).toBe(2);
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
