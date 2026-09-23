import { ContentApiError, FILED_ID, readArticle, readList, readMenu, SERVICE_PAGES } from '@huma/contracts';
import type {
  Article,
  ArticleId,
  ArticleSummary,
  ContentApi,
  FeedQuery,
  ListedSection,
  Listing,
  Page,
  SearchQuery,
  Section,
  SetAside,
} from '@huma/contracts';
import { ROUTES } from './routes.ts';
import type { Request, RouteName } from './routes.ts';
import { ask } from './transport.ts';
import type { Ports } from './transport.ts';

/**
 * What the client is handed: the platform's ports, and where what a reading set aside is told.
 *
 * A reading names every item it could not read, and the client serves the rest — it never waits on a name to serve a
 * list — so the names go to whoever the door says: the one place in the app that can show them, where a console is
 * refused everywhere.
 */
export type Client<Signal> = Ports<Signal> &
  Readonly<{ setAside: (route: RouteName, setAside: readonly SetAside[]) => void }>;

/** The page a cursor opens. No cursor is the first; a cursor is the number of the page it opens, minted below. */
const pageOf = (cursor: string | undefined): number => {
  if (cursor === undefined) {
    return 1;
  }
  if (!/^[1-9]\d*$/u.test(cursor)) {
    throw new ContentApiError('not-found', `curseur inconnu du service : ${cursor}`);
  }
  return Number(cursor);
};

/**
 * The cursor of the page after `page`: there is one when the service filled `page`, and none after a short page. It is
 * the count the service sent that says so, whatever the reading kept of it — a full page with an odd item set aside is
 * still a page with another after it.
 */
const nextOf = (page: number, listing: Listing, size: number): string | null =>
  listing.sent >= size ? String(page + 1) : null;

/**
 * The content the journal's service serves, read through the contracts, as the app's door reads it.
 *
 * It holds no source of its own: a section's list is asked under the number the service's menu files it under, which
 * the domain never carries, so the menu is read once and kept — and dropped when it failed, for the next question to
 * ask again. It shelves no numéros: the journal's are the PDF files of a publisher's own reader, which no route of the
 * service lists, and a method answering none would be a newsstand saying it is empty.
 */
export const createRemoteApi = <Signal>(client: Client<Signal>): ContentApi => {
  /** A list of the service, read, and what the reading set aside told; an answer that holds no list is refused. */
  const listed = async (route: RouteName, request: Request): Promise<Listing> => {
    const read = readList(await ask(client, request));
    if ('refused' in read) {
      throw new ContentApiError('malformed', `${request.path} : ${read.refused}`);
    }
    if (read.item.intake.setAside.length > 0) {
      client.setAside(route, read.item.intake.setAside);
    }
    return read.item;
  };

  /**
   * The menu, read once for as long as the app runs: a section's list is found through it, by the number it files the
   * list under, and a page of a section would otherwise cost two requests. The app's own copy of the sections is read
   * again once stale and is handed this one, so the bar and the lists it opens agree on what the menu holds.
   */
  let menu: Promise<readonly ListedSection[]> | undefined;

  const readSections = async (): Promise<readonly ListedSection[]> => {
    const request = ROUTES.menu.request();
    const read = readMenu(await ask(client, request));
    if ('refused' in read) {
      throw new ContentApiError('malformed', `${request.path} : ${read.refused}`);
    }
    if (read.item.setAside.length > 0) {
      client.setAside('menu', read.item.setAside);
    }
    return read.item.kept;
  };

  const sections = async (): Promise<readonly ListedSection[]> => {
    const asked = menu ?? readSections();
    menu = asked;
    try {
      return await asked;
    } catch (error) {
      menu = undefined;
      throw error;
    }
  };

  const page = (items: readonly ArticleSummary[], nextCursor: string | null): Page<ArticleSummary> => ({
    items,
    nextCursor,
  });

  return {
    getSections: async (): Promise<readonly Section[]> => (await sections()).map((each) => each.section),

    getFeed: async ({ section, cursor }: FeedQuery): Promise<Page<ArticleSummary>> => {
      if (section === undefined) {
        return page((await listed('front', ROUTES.front.request())).intake.kept, null);
      }
      const filed = (await sections()).find((each) => each.section.id === section);
      if (filed === undefined) {
        throw new ContentApiError('not-found', `rubrique inconnue du service : ${section}`);
      }
      const number = pageOf(cursor);
      const listing = await listed('section', ROUTES.section.request(filed.serviceId, number));
      return page(listing.intake.kept, nextOf(number, listing, SERVICE_PAGES.section));
    },

    getLiveFeed: async (): Promise<Page<ArticleSummary>> =>
      page((await listed('wire', ROUTES.wire.request())).intake.kept, null),

    getArticle: async (id: ArticleId): Promise<Article> => {
      const filed = FILED_ID.safeParse(id);
      if (!filed.success) {
        throw new ContentApiError('not-found', `article inconnu du service : ${id}`);
      }
      const request = ROUTES.article.request(filed.data);
      const read = readArticle(await ask(client, request));
      if ('refused' in read) {
        throw new ContentApiError('malformed', `${request.path} : ${read.refused}`);
      }
      return read.item;
    },

    search: async ({ text, cursor }: SearchQuery): Promise<Page<ArticleSummary>> => {
      const number = pageOf(cursor);
      const listing = await listed('search', ROUTES.search.request(text, number));
      return page(listing.intake.kept, nextOf(number, listing, SERVICE_PAGES.search));
    },
  };
};
