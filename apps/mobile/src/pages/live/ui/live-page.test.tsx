import { ContentApiError } from '@huma/contracts';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { screen } from '@testing-library/react-native';
import { content } from '#api';
import { t } from '#i18n';
import { formatClockTime, formatDayLabel } from '#lib/format';
import { renderWithCache, settle } from '#lib/testing';
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
    expect(await screen.findAllByText(formatClockTime(item.publishedAt))).not.toHaveLength(0);
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

  it('nomme la rubrique de chaque ligne, huit rubriques tenant une seule colonne', async () => {
    const item = await newest();
    const ran = (await content.getSections()).find((section) => section.id === item.section);
    if (ran === undefined) {
      throw new Error('le contenu ne nomme pas la rubrique de cet item : le test ne vérifierait rien');
    }
    await renderPage();
    expect(await screen.findAllByText(ran.label)).not.toHaveLength(0);
  });

  /**
   * The newsroom's own mark was a font weight and nothing else — the reference document asks what a title set in bold
   * on this screen is supposed to mean, and leaves the question open. A word answers it.
   */
  it('dit en toutes lettres ce que la rédaction a marqué', async () => {
    const { items } = await content.getLiveFeed({});
    if (!items.some((item) => item.emphasis === true)) {
      throw new Error('la première page ne porte aucun item marqué : le test ne vérifierait rien');
    }
    await renderPage();
    expect(await screen.findAllByText(t('wire.marked'))).not.toHaveLength(0);
  });
});
