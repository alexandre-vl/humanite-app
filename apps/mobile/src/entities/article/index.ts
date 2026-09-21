export { feedQuery, isReaderKey, liveFeedQuery, searchQuery, sectionFeedQuery } from './api/queries';
// `stateOf` and `ReadFeed` are not offered here any more. They were what let a screen build a feed of its own out of
// a plain query — the sommaire of a numéro did, and it is the one screen that has gone. Every feed left asks the
// entity for one, so the shape of a feed stays the entity's.
export { useKeptFeed, usePagedFeed } from './model/paged-feed';
export { searchable } from './model/search';
export { ArticleFeed } from './ui/article-feed';
export { ArticleReader } from './ui/article-reader';
export { ArticleWire } from './ui/article-wire';
