import type { Article, ArticleSummary, ContentApi, DisplayText, Page, PageQuery } from '@huma/contracts';
import { isList, isRecord } from '@huma/unknown';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, renderHook } from '@testing-library/react-native';
import type { RenderHookResult, screen } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';

/**
 * A cache of its own for one rendering: nothing is kept once the test is done, and a failure shows at once rather than
 * after the retries a phone would make. Written once, so no screen's test drifts to retrying what another's shows.
 */
const freshCache = (): QueryClient => new QueryClient({ defaultOptions: { queries: { gcTime: 0, retry: false } } });

/** Renders `ui` over a cache of its own, as the app's own root would with nothing restored. */
export const renderWithCache = async (ui: ReactElement): Promise<void> => {
  await render(<QueryClientProvider client={freshCache()}>{ui}</QueryClientProvider>);
};

/**
 * Runs `hook` over a cache of its own, as `renderWithCache` renders a screen: what a model's reading is tested by.
 * `restored` is what that cache holds before the hook runs, entry by entry, as a phone restores what it wrote to disk.
 */
export const renderHookWithCache = async <Result,>(
  hook: () => Result,
  restored: readonly (readonly [key: readonly unknown[], data: unknown])[] = [],
): Promise<RenderHookResult<Result, unknown>> => {
  const client = freshCache();
  for (const [key, data] of restored) {
    client.setQueryData(key, data);
  }
  return renderHook(hook, {
    wrapper: ({ children }: Readonly<{ children: ReactNode }>) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
};

/**
 * One more turn of the timers, inside `act`. A virtualised list reports its first layout in an animation frame, which
 * jest runs as a timer, and an answer still on its way lands on the next turn: without it, the update arrives outside
 * `act` or after the test has read the screen.
 */
export const settle = async (): Promise<void> => {
  await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
};

/** Every page of a list, read from its first to its last, and flattened. */
const everyPage = async (
  read: (query: PageQuery) => Promise<Page<ArticleSummary>>,
  cursor?: string,
): Promise<readonly ArticleSummary[]> => {
  const page = await read(cursor === undefined ? {} : { cursor });
  return page.nextCursor === null ? page.items : [...page.items, ...(await everyPage(read, page.nextCursor))];
};

/**
 * Every article a content serves, section by section and each section to its last page: the whole paper, as a test
 * looking for an article of some shape needs it. The front and the wire are not the paper — each holds only the newest.
 */
export const everyArticle = async (content: ContentApi): Promise<readonly ArticleSummary[]> => {
  const sections = await content.getSections();
  const lists = await Promise.all(
    sections.map(async (section) => everyPage(async (query) => content.getFeed({ ...query, section: section.id }))),
  );
  return lists.flat();
};

/**
 * The standfirst of an item a test chose to have one. An item may carry none, and a test that reads one off an item it
 * never checked would be reading nothing and finding it; this says which item broke the choice instead.
 */
export const standfirstOf = (summary: ArticleSummary): DisplayText => {
  if (summary.standfirst === undefined) {
    throw new Error(`${summary.id} n’a pas de chapô`);
  }
  return summary.standfirst;
};

/**
 * The first article a content serves whose whole reading satisfies `holds`, so a test never asserts on a shape by luck.
 * `what` names the shape for the failure that says no article has it: a test that found none would verify nothing.
 */
export const firstArticle = async (
  content: ContentApi,
  what: string,
  holds: (article: Article) => boolean,
): Promise<Article> => {
  for (const summary of await everyArticle(content)) {
    const article = await content.getArticle(summary.id);
    if (holds(article)) {
      return article;
    }
  }
  throw new Error(`aucun article ne porte ${what} : le test ne vérifierait rien`);
};

/**
 * The layers of a style in the order React Native applies them, nested lists opened and empty slots left out: a
 * layer is a record of properties, as opposed to a list of layers or a layer left out.
 */
export const layersOf = (style: unknown): readonly Readonly<Record<string, unknown>>[] => {
  if (isList(style)) {
    return style.flatMap((layer) => layersOf(layer));
  }
  return isRecord(style) ? [style] : [];
};

/**
 * A style of a rendered node as the one object it paints with: React Native takes a list of layers, a later one over
 * an earlier, and so does this. `prop` names which style, the node's own by default. Written once for every test that
 * asks what a node was painted with, which each used to answer by hand.
 */
export const styleOf = (
  node: Readonly<{ props: Readonly<Record<string, unknown>> }>,
  prop = 'style',
): Readonly<Record<string, unknown>> =>
  layersOf(node.props[prop]).reduce<Readonly<Record<string, unknown>>>((flat, layer) => ({ ...flat, ...layer }), {});

/** A node of a rendered tree, named off the query that returns one rather than off a package nothing declares. */
export type Rendered = ReturnType<typeof screen.getByTestId>;

/** Everything a node is laid inside, innermost first. */
export const ancestorsOf = (node: Rendered): readonly Rendered[] => {
  const climbed: Rendered[] = [];
  for (let walked = node.parent; walked !== null; walked = walked.parent) {
    climbed.push(walked);
  }
  return climbed;
};

/**
 * What `read` finds on the nearest node above `node` it finds anything on. A test climbs to the view that paints or
 * scrolls what it asks about, and one that found none would verify nothing, so `missing` says why it stops there
 * instead of passing.
 */
export function nearestAbove<Found>(
  node: Rendered,
  read: (each: Rendered) => Found | undefined,
  missing: string,
): Found {
  for (const each of ancestorsOf(node)) {
    const found = read(each);
    if (found !== undefined) {
      return found;
    }
  }
  throw new Error(missing);
}

/** The native view `node` scrolls in. */
export const scrollViewAbove = (node: Rendered, missing: string): Rendered =>
  nearestAbove(node, (each) => (each.type === 'RCTScrollView' ? each : undefined), missing);

/** The name under which `target` offers a reader listening the action they hear as `label`, if it offers one. */
export const actionNamed = (target: Rendered, label: string): string | undefined => {
  const actions: unknown = target.props['accessibilityActions'];
  const found = isList(actions) ? actions.find((action) => isRecord(action) && action['label'] === label) : undefined;
  return isRecord(found) && typeof found['name'] === 'string' ? found['name'] : undefined;
};

/**
 * Performs on `target` the action a reader listening picks by the name `label`, the way the platform hands it over.
 * An action the target does not offer fails the test rather than performing nothing.
 */
export const perform = async (target: Rendered, label: string): Promise<void> => {
  const name = actionNamed(target, label);
  if (name === undefined) {
    throw new Error(`« ${label} » n’est pas une action offerte ici : le test ne vérifierait rien`);
  }
  await fireEvent(target, 'accessibilityAction', { nativeEvent: { actionName: name } });
};
