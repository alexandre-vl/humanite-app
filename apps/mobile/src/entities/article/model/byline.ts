import type { ArticleSummary, DisplayText } from '@huma/contracts';
import { formatByline } from '#lib/format';

/**
 * How a piece is signed, or nothing when nobody signed it.
 *
 * This was a lookup: an item carried identifiers into a roster of the newsroom, the app fetched that roster once and
 * turned the identifiers into names, and until it had arrived a piece was shown unsigned rather than signed with
 * identifiers. The journal's service sends the name itself and keeps no roster — one name, never two, and often the
 * newsroom as a whole — so there is nothing left to look up and nothing left to wait for.
 *
 * A summary is taken rather than an article, because a column announces its writer from the feed, long before the
 * article itself has been asked for.
 */
export const signatureOf = (summary: ArticleSummary): DisplayText | null =>
  summary.byline === undefined ? null : formatByline(summary.byline);
