import type { Author, AuthorId, DisplayText } from '@huma/contracts';
import { formatByline } from '#lib/format';

/**
 * Who signed a piece, by name. A piece names its authors by id alone, so the roster has to have arrived for a byline
 * to be written at all; until it has, it is shown unsigned rather than signed with identifiers.
 *
 * The ids are taken rather than the article, because a summary carries the same ids and a column announces its
 * writer from the feed, long before the article itself has been asked for.
 */
export const bylineOf = (authors: readonly AuthorId[], roster: readonly Author[]): DisplayText | null => {
  const names = authors.flatMap((id) => {
    const author = roster.find((candidate) => candidate.id === id);
    return author === undefined ? [] : [author.name];
  });
  return names.length === 0 ? null : formatByline(names);
};
