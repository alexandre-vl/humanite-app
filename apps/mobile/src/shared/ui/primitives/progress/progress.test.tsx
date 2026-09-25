import { describe, expect, it } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { DECORATIVE } from '../../../lib/announce';
import { layersOf, styleOf } from '../../../lib/testing';
import type { Rendered } from '../../../lib/testing';
import { Progress } from './progress';

/** The width the rule is laid out at, which a headless renderer never measures and so never reports on its own. */
const LAYOUT = { nativeEvent: { layout: { x: 0, y: 0, width: 400, height: 2 } } };

/** The rule: the one view the primitive draws, and the one its width is reported to. */
const ruleOf = (): Rendered => {
  const rule = screen.root;
  if (rule === null) {
    throw new Error('rien n’est dessiné : le test ne vérifierait rien');
  }
  return rule;
};

/** How far along the rule the segment crossing it stands, in points. */
const alongOf = (): number => {
  const [segment] = ruleOf().children;
  if (segment === undefined || typeof segment === 'string') {
    throw new Error('aucun segment ne traverse le trait : le test ne vérifierait rien');
  }
  const [shift] = layersOf(styleOf(segment)['transform']);
  const along = shift?.['translateX'];
  if (typeof along !== 'number') {
    throw new Error('le segment ne dit pas où il se tient : le test ne vérifierait rien');
  }
  return along;
};

describe('Progress', () => {
  /**
   * A sweep goes back and forth between where it sets off and the end of the rule. Left running once its wait was
   * over, it set the next wait off from wherever it had got to, further along every time: on the iPhone simulator on
   * 25/09/2026 a search set off from 98 % of the way, a segment standing still at the end of its rule. Here the bench
   * runs every sweep to its end at once, which is as far along as a wait left running can leave the next one.
   */
  it('fait partir chaque attente du début du trait, où que la précédente se soit arrêtée', async () => {
    const view = await render(<Progress busy announces={DECORATIVE} />);
    await fireEvent(ruleOf(), 'layout', LAYOUT);
    await view.rerender(<Progress busy={false} announces={DECORATIVE} />);
    await view.rerender(<Progress busy announces={DECORATIVE} />);
    expect(alongOf()).toBe(0);
  });
});
