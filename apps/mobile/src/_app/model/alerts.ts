import { slugOfPage } from '@huma/contracts';
import type { ArticleId } from '@huma/contracts';
import type { QueryClient } from '@tanstack/react-query';
import { articleOfSlug } from '#entities/article';

/** Where a touched alert takes the reader: an article, read in the app's own reader, or a page, opened where it lives. */
export type Destination = Readonly<{ kind: 'article'; id: ArticleId }> | Readonly<{ kind: 'page'; address: string }>;

/**
 * Where the alert that points at `address` takes the reader.
 *
 * The journal's app opens that address in a web view, whatever it is (`HumaniteActivity.java`, `onClick`). This app
 * reads the journal's articles itself, so an address that names one — by the slug that ends an article's page — opens
 * it in its reader, found among what the app has read or among the newsroom's last few (ADR-0043). Anything else it
 * cannot read is opened where it lives: an address naming no article, one naming an article neither carries, and one
 * the journal could not be asked about. The reader always gets what the alert announced, one way or the other.
 */
export const destinationOf = async (cache: QueryClient, address: string): Promise<Destination> => {
  const slug = slugOfPage(address);
  if (slug === null) {
    return { kind: 'page', address };
  }
  try {
    const id = await articleOfSlug(cache, slug);
    return id === null ? { kind: 'page', address } : { kind: 'article', id };
  } catch {
    return { kind: 'page', address };
  }
};
