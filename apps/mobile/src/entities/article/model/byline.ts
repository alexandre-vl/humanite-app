import type { Article, Author, DisplayText } from '@huma/contracts';
import { formatByline } from '#lib/format';

/**
 * Who signed an article, by name. An article names its authors by id alone, so the roster has to have arrived for a
 * byline to be written at all; until it has, an article is shown unsigned rather than signed with identifiers.
 */
export const bylineOf = (article: Article, roster: readonly Author[]): DisplayText | null => {
  const names = article.authors.flatMap((id) => {
    const author = roster.find((candidate) => candidate.id === id);
    return author === undefined ? [] : [author.name];
  });
  return names.length === 0 ? null : formatByline(names);
};
