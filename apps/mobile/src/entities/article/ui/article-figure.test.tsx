import { describe, expect, it } from '@jest/globals';
import { fireEvent, screen, within } from '@testing-library/react-native';
import { t } from '#i18n';
import { renderWithCache } from '#lib/testing';
import { ArticleFigure } from './article-figure';

describe('la photographie d’un article', () => {
  it('s’ouvre entière, se ferme et laisse la photo de l’article en place', async () => {
    await renderWithCache(<ArticleFigure visual={{ source: 1 }} frame="photo" recyclingKey="photo" />);
    expect(screen.queryByRole('button', { name: t('picture.close') })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: t('picture.open') }));
    const image = screen.getByRole('image', { name: t('picture.label') });
    expect(within(image).getByTestId('picture').props['contentFit']).toBe('contain');
    expect(screen.queryByRole('button', { name: t('picture.enlarge') })).toBeNull();
    expect(screen.queryByRole('button', { name: t('picture.reduce') })).toBeNull();
    expect(image.props['accessibilityActions']).toEqual(
      expect.arrayContaining([
        { name: 'enlarge', label: t('picture.enlarge') },
        { name: 'reduce', label: t('picture.reduce') },
      ]),
    );
    expect(screen.queryByText(t('picture.hint'))).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: t('picture.close') }));
    expect(screen.queryByRole('image', { name: t('picture.label') })).toBeNull();
    expect(screen.getByRole('button', { name: t('picture.open') })).toBeTruthy();
  });
});
