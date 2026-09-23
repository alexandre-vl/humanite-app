import { ContentApiError } from '@huma/contracts';
import { afterEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, screen } from '@testing-library/react-native';
import { content } from '#api';
import { NEWSROOM } from '#config';
import { openExternal } from '#lib/routing';
import { renderWithCache, settle } from '#lib/testing';
import { NewsstandPage } from './newsstand-page';

// The app's own door out, doubled rather than the phone's: the screen hands a page over and is told nothing back, so
// what a test can read is which page it handed over — and that is what this module is for.
jest.mock('#lib/routing', () => ({ __esModule: true, openExternal: jest.fn() }));

/** The shelf the source stands, which the mock has: a test of the newsstand reads nothing without one. */
const theShelf = async () => {
  if (content.getIssues === undefined) {
    throw new Error('la source ne tient aucun kiosque : le test ne vérifierait rien');
  }
  return content.getIssues();
};

const renderPage = async (): Promise<void> => {
  await renderWithCache(<NewsstandPage />);
  await settle();
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe('NewsstandPage', () => {
  /** An empty shelf is a thing the paper says; before its answer, or when there was none, the shelf says so instead. */
  it('ne dit pas le kiosque vide tant qu’il n’a pas répondu, ni quand il n’a pas pu répondre', async () => {
    jest.spyOn(content, 'getIssues').mockRejectedValue(new ContentApiError('offline', 'hors ligne'));
    await renderPage();
    expect(await screen.findByText('Pas de connexion')).toBeTruthy();
    expect(screen.queryByText('Le kiosque est vide')).toBeNull();
  });

  it('range tous les numéros du journal, chacun avec ce qu’il contient', async () => {
    const shelf = await theShelf();
    expect(shelf.length).toBeGreaterThan(1);
    await renderPage();
    for (const issue of shelf) {
      expect(await screen.findByText(issue.opener.title)).toBeTruthy();
    }
    expect(screen.getAllByText(`${String(shelf[0]?.count ?? 0)} articles`)).toHaveLength(1);
  });

  /**
   * A cover is drawn as a front page, so left to compose itself it reads the paper's name before every numéro — four
   * times on a shelf of four — and then a date, a headline and a count as four stops. Named, it is one: which numéro
   * this is, what it opens on, and how much is in it, which is what a reader takes a paper off a shelf for.
   */
  it('dit chaque numéro en une phrase, et non le nom du journal quatre fois', async () => {
    const shelf = await theShelf();
    const first = shelf[0];
    if (first === undefined) {
      throw new Error('l’étagère est vide : le test ne vérifierait rien');
    }
    await renderPage();
    const covers = await screen.findAllByRole('link', { name: /^Numéro du/u });
    expect(covers).toHaveLength(shelf.length);
    expect(covers[0]?.props['accessibilityLabel']).toBe(
      `Numéro du 13 septembre\u00A0: ${first.opener.title}. ${String(first.count)} articles.`,
    );
    // The paper's name is painted on every cover and read out on none: the shelf is one paper, said once at the top.
    expect(screen.queryAllByLabelText('Humanité')).toHaveLength(0);
  });

  /**
   * Every cover is a front page, so every cover carries the picture its numéro opened on. Without this the shelf could
   * stand four titles on four empty grounds and say nothing about it — the mock's own picture is a plain view here, so
   * it is the count of them that tells.
   */
  it('donne à chaque couverture la photo d’ouverture de son numéro', async () => {
    const shelf = await theShelf();
    await renderPage();
    await screen.findByText(shelf[0]?.opener.title ?? '');
    // Hidden ones count: a cover's picture is passed over by a screen reader, the title over it having already said
    // what the numéro opens on.
    expect(screen.getAllByTestId('picture', { includeHiddenElements: true })).toHaveLength(shelf.length);
  });

  /**
   * A numéro is read on the paper's own site, so taking one off the shelf leaves the app. The app used to push a
   * sommaire of its own instead — the day's articles laid out as a third feed of the same cards — and what makes
   * that a change rather than a removal is here: the cover still answers a press, and answers it with the paper.
   */
  it('ouvre le journal sur le web quand on prend un numéro sur l’étagère', async () => {
    const shelf = await theShelf();
    const first = shelf[0];
    if (first === undefined) {
      throw new Error('le kiosque ne range aucun numéro : le test ne vérifierait rien');
    }
    await renderPage();
    await fireEvent.press(await screen.findByText(first.opener.title));
    expect(jest.mocked(openExternal)).toHaveBeenCalledWith(NEWSROOM.site);
  });

  /** A reader thrown into a browser without warning was given none; the shelf says where its covers lead. */
  it('dit où mènent les couvertures avant qu’on en touche une', async () => {
    await renderPage();
    expect(await screen.findByText('Chaque numéro s’ouvre sur humanite.fr.')).toBeTruthy();
  });
});
