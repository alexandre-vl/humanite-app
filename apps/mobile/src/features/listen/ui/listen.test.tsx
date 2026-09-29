import { ARTICLE_ID } from '@huma/contracts';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, screen } from '@testing-library/react-native';
import { content } from '#api';
import { t } from '#i18n';
import { firstArticle, renderWithCache } from '#lib/testing';
import { listening } from '../model/store';
import { ListenArticle, ListeningPlayer } from './listen';

jest.mock('#lib/speech', () => ({
  clearSpeech: () => undefined,
}));

afterEach(async () => {
  await act(() => {
    listening.stop();
  });
});

describe('article audio interface', () => {
  it('opens an explicit explanation of server audio and keeps the article in the mini-player when collapsed', async () => {
    const article = await firstArticle(
      content,
      'un article à écouter',
      (each) => each.body.kind === 'open' && each.body.blocks.length > 0,
    );
    await renderWithCache(
      <>
        <ListenArticle article={{ ...article, id: ARTICLE_ID.parse('3878193') }} />
        <ListeningPlayer />
      </>,
    );
    await fireEvent.press(screen.getByRole('button', { name: t('listen.action') }));
    expect(screen.getByText(t('listen.intro.title'))).toBeTruthy();
    expect(screen.getByRole('button', { name: t('listen.intro.action') })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: t('listen.collapse') }));
    expect(screen.queryByText(t('listen.intro.title'))).toBeNull();
    expect(screen.getByRole('button', { name: t('listen.open') })).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: t('listen.close') }));
    expect(screen.queryByRole('button', { name: t('listen.open') })).toBeNull();
  });
  it('offers no audio action for subscriber text the current reader has not received', async () => {
    const article = await firstArticle(content, 'un corps retenu', (each) => each.body.kind === 'withheld');
    await renderWithCache(<ListenArticle article={{ ...article, id: ARTICLE_ID.parse('3878193') }} />);
    expect(screen.queryByRole('button', { name: t('listen.action') })).toBeNull();
  });
});
