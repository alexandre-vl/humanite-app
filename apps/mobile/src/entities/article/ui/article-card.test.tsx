import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import { content } from '#api';
import { asDisplayText } from '#lib/display-text';
import { Text } from '#primitives/text';
import { pictureOf } from '../model/picture';
import { ArticleCard, shapeOf } from './article-card';

/** The whole corpus, which is what a recycling contract has to hold over. */
const everything = async (): Promise<Awaited<ReturnType<typeof content.getFeed>>['items']> =>
  (await content.getFeed({ limit: 100 })).items;

describe('ArticleCard', () => {
  it('ne marque que les articles réservés aux abonnés', async () => {
    const items = await everything();
    const reserved = items.find((summary) => summary.access === 'premium');
    const open = items.find((summary) => summary.access === 'free');
    if (reserved === undefined || open === undefined) {
      throw new Error('le contenu ne sert pas les deux accès : le test ne vérifierait rien');
    }
    const view = await render(<ArticleCard summary={reserved} />);
    expect(screen.getByText('Abonnés')).toBeTruthy();
    await view.rerender(<ArticleCard summary={open} />);
    expect(screen.queryByText('Abonnés')).toBeNull();
  });

  /**
   * The shape names the tree a card mounts, and a list hands a cell to another item only when both answer the same.
   * Nothing at runtime would notice a shape that stopped telling them apart — the cells would simply be handed round
   * between trees that do not match, and the recycling would be wrong rather than absent.
   */
  it('nomme l’arbre qu’une carte monte, image et marque comprises', async () => {
    const items = await everything();
    expect(items.length).toBeGreaterThan(10);
    for (const summary of items) {
      const shape = shapeOf(summary);
      expect(shape.startsWith('picture')).toBe(pictureOf(summary, 'card') !== null);
      expect(shape.endsWith('Marked')).toBe(summary.access === 'premium');
    }
    expect(new Set(items.map(shapeOf)).size).toBeGreaterThan(1);
  });

  it('donne sa dernière ligne à la date et à ce que l’écran permet d’en faire', async () => {
    const [first] = await everything();
    if (first === undefined) {
      throw new Error('le journal ne sert aucun article : le test ne vérifierait rien');
    }
    await render(<ArticleCard summary={first} action={<Text variant="label">{asDisplayText('garder')}</Text>} />);
    expect(screen.getByText('garder')).toBeTruthy();
  });
});
