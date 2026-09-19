import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';
import { content } from '#api';
import { ArticleCard } from './article-card';

describe('ArticleCard', () => {
  it('ne marque que les articles réservés aux abonnés', async () => {
    const { items } = await content.getFeed({ limit: 30 });
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
});
