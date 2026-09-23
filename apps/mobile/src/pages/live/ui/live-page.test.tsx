import { ContentApiError } from '@huma/contracts';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { screen } from '@testing-library/react-native';
import { content } from '#api';
import { t } from '#i18n';
import { formatDayLabel, formatHour } from '#lib/format';
import { everyArticle, renderWithCache, settle } from '#lib/testing';
import { LivePage } from './live-page';

const renderPage = async (): Promise<void> => {
  await renderWithCache(<LivePage />);
  await settle();
};

/** The newest item of the wire, which every case below reads something of. */
const newest = async () => {
  const [item] = (await content.getLiveFeed({})).items;
  if (item === undefined) {
    throw new Error('le contenu ne sert aucun item : le test ne vérifierait rien');
  }
  return item;
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe('LivePage', () => {
  /** What the reader is told of a wire that did not come is its cause, read off the failure the door raised. */
  it('dit pourquoi le fil n’est pas venu, et offre un nouvel essai qui peut aboutir', async () => {
    jest.spyOn(content, 'getLiveFeed').mockRejectedValue(new ContentApiError('offline', 'hors ligne'));
    await renderPage();
    expect(await screen.findByText('Pas de connexion')).toBeTruthy();
    expect(screen.getByText(t('action.retry'))).toBeTruthy();
  });

  // Twice over: the list mounts the head of a run where the run begins, and again pinned at the top of its frame.
  it('coiffe le fil de la journée que ses items portent, et l’y retient', async () => {
    const item = await newest();
    await renderPage();
    expect(await screen.findAllByText(formatDayLabel(item.publishedAt))).toHaveLength(2);
  });

  // The wire opened on the newest illustrated item, laid across the screen with its title over the picture, and left
  // it out of the list below. A wire has no front page: the item at the top is at the top because it is the newest.
  it('donne à chaque item son heure et son titre, le plus récent compris', async () => {
    const item = await newest();
    await renderPage();
    expect(await screen.findByText(item.title)).toBeTruthy();
    expect(await screen.findAllByText(formatHour(item.publishedAt))).not.toHaveLength(0);
  });

  /**
   * The day was printed twice: once on the band pinned over the run, and again on each of the dozen rows under it, as
   * `12/09, 19:52`. Nothing else this screen prints writes a day and a month as two numbers, so that is what the
   * second printing can be caught by.
   */
  it('n’écrit la date nulle part sous la journée qui la porte déjà', async () => {
    const item = await newest();
    await renderPage();
    await screen.findByText(item.title);
    expect(screen.queryByText(/\d{2}\/\d{2}/)).toBeNull();
  });

  /** Every section runs down this one column: what sets a row apart is what the item is, when it is not an article. */
  it('dit sur la ligne d’une vidéo qu’elle en est une', async () => {
    const video = (await everyArticle(content)).find((summary) => summary.format === 'video');
    if (video === undefined) {
      throw new Error('le contenu ne sert aucune vidéo : le test ne vérifierait rien');
    }
    jest.spyOn(content, 'getLiveFeed').mockResolvedValue({ items: [video], nextCursor: null });
    await renderPage();
    expect(await screen.findByText(video.title)).toBeTruthy();
    expect(screen.getByText(t('format.video'))).toBeTruthy();
  });
});
